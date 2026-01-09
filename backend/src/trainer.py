import tensorflow as tf
import os
import time
import numpy as np
import json
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from tensorflow.python.profiler.model_analyzer import profile
from tensorflow.python.profiler.option_builder import ProfileOptionBuilder

from . import config

def get_flops(model, input_shape):
    """
    Calculates FLOPs of a Keras model using TensorFlow Profiler.
    """
    try:
        # Create a concrete function
        run_meta = tf.compat.v1.RunMetadata()
        
        # Need to build the model first if not built
        if not model.inputs:
             model.build(input_shape)

        @tf.function(input_signature=[tf.TensorSpec(shape=(1,) + input_shape[1:], dtype=tf.float32)])
        def forward_pass(inp):
            return model(inp)

        # Concrete function
        concrete_func = forward_pass.get_concrete_function()
        
        # Profiling
        graph_def = concrete_func.graph.as_graph_def()
        
        opts = ProfileOptionBuilder.float_operation()    
        flops = profile(graph_def, options=opts)
        
        return flops.total_float_ops
    except Exception as e:
        print(f"Could not calculate FLOPs: {e}")
        return 0

def train_model(model, train_ds, val_ds, model_name='custom_cnn'):
    """
    Orchestrates the training process.
    """
    # Compile
    # Compile
    # Use Optimzer from Config (default: Adamax per Paper 3)
    optimizer_config = config.OPTIMIZER if hasattr(config, 'OPTIMIZER') else 'adam'
    
    model.compile(
        optimizer=optimizer_config,
        loss='categorical_crossentropy',
        metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
    )
    
    # Callbacks
    # Ensure directories exist
    os.makedirs(config.MODELS_DIR, exist_ok=True)
    os.makedirs(config.OUTPUTS_DIR, exist_ok=True)

    checkpoint_path = os.path.join(config.MODELS_DIR, f"{model_name}_best.h5")
    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=config.PATIENCE, restore_best_weights=True),
        tf.keras.callbacks.ModelCheckpoint(checkpoint_path, save_best_only=True),
        tf.keras.callbacks.CSVLogger(os.path.join(config.OUTPUTS_DIR, f"{model_name}_history.csv")),
        tf.keras.callbacks.TensorBoard(log_dir=os.path.join(config.OUTPUTS_DIR, 'logs', model_name), histogram_freq=1)
    ]
    
    start_time = time.time()
    history = model.fit(
        train_ds,
        epochs=config.EPOCHS,
        validation_data=val_ds,
        callbacks=callbacks,
        verbose=1
    )
    training_time = time.time() - start_time
    
    return history, training_time

def evaluate_model(model, test_ds, class_names, model_name='custom_cnn'):
    """
    Comprehensive evaluation: Classification Report, Confusion Matrix, Efficiency.
    """
    print(f"Evaluating {model_name}...")
    
    # 1. Predictions
    y_pred_probs = model.predict(test_ds)
    y_pred = np.argmax(y_pred_probs, axis=1)
    
    # Extract true labels from dataset (iterate)
    y_true = []
    for _, labels in test_ds:
        y_true.extend(np.argmax(labels.numpy(), axis=1))
    y_true = np.array(y_true)
    
    # Ensure lengths match (drop leftovers if any, usually valid/test handled carefully)
    # tf.data.Dataset batching might result in remainder. predict handles it.
    
    # 2. Performance Metrics
    acc = accuracy_score(y_true, y_pred)
    report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
    conf_matrix = confusion_matrix(y_true, y_pred).tolist()
    
    # 3. Efficiency Metrics
    # FLOPs
    # Infer input shape from model
    input_shape = model.input_shape
    flops = get_flops(model, input_shape)
    
    # Params
    total_params = model.count_params()
    
    # Inference Time (Average over 100 runs)
    dummy_input = tf.random.normal((1,) + input_shape[1:])
    
    # Warmup
    for _ in range(10): model(dummy_input)
    
    t_start = time.time()
    for _ in range(100):
        model(dummy_input)
    t_avg_ms = ((time.time() - t_start) / 100) * 1000
    
    dataset_name = "Combined_UASpeech_TORGO" # Placeholder
    
    # 4. Save Artifacts
    results = {
        "model_name": model_name,
        "dataset": dataset_name,
        "accuracy": acc,
        "flops": flops,
        "params": total_params,
        "inference_time_ms": t_avg_ms,
        "classification_report": report,
        "confusion_matrix": conf_matrix
    }
    
    file_path = os.path.join(config.OUTPUTS_DIR, f"{model_name}_evaluation.json")
    with open(file_path, 'w') as f:
        json.dump(results, f, indent=4)
        
    print(f"Results saved to {file_path}")
    return results
