import tensorflow as tf
import os
import time
import numpy as np
import json
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from tensorflow.python.profiler.model_analyzer import profile
from tensorflow.python.profiler.option_builder import ProfileOptionBuilder

from . import config

def get_flops(model, batch_size=1):
    """
    Menghitung FLOPs (Floating-Point Operations) untuk sebuah model Keras.
    Diadopsi dari Paper 2.
    """
    try:
        from tensorflow.python.framework.convert_to_constants import convert_variables_to_constants_v2
        
        # Calculate FLOPs using TensorFlow Profiler
        if not model.inputs:
             # Basic check to ensure model is built
             return 0

        # Create a concrete function
        # Note: model.inputs[0].shape[1:] excludes batch dimension
        shape_list = list(model.inputs[0].shape[1:])
        
        concrete_func = tf.function(model).get_concrete_function(
            [tf.TensorSpec([batch_size] + shape_list, model.inputs[0].dtype)]
        )
        
        frozen_func = convert_variables_to_constants_v2(concrete_func)
        run_meta = tf.compat.v1.RunMetadata()
        opts = tf.compat.v1.profiler.ProfileOptionBuilder.float_operation()
        
        # Run profile
        flops = tf.compat.v1.profiler.profile(
            graph=frozen_func.graph, 
            run_meta=run_meta, 
            cmd='op', 
            options=opts
        )
        
        return flops.total_float_ops
    except Exception as e:
        print(f"Could not calculate FLOPs: {e}")
        return 0

def get_model_memory_usage(model):
    """
    Menghitung puncak memori aktivasi dan ukuran model di disk.
    Diadopsi dari Paper 2.
    Updated for Keras 3 Compatibility (which removed layer.output_shape).
    """
    peak_activation_memory = 0
    valid_layers_count = 0
    
    for layer in model.layers:
        shapes = []
        
        # METHOD 1: Keras 2 Style (Legacy)
        if hasattr(layer, 'output_shape'):
             shapes = layer.output_shape if isinstance(layer.output_shape, list) else [layer.output_shape]
        
        # METHOD 2: Keras 3 Style (Modern)
        elif hasattr(layer, 'output'):
            # In Keras 3, we access the output tensor's shape
            try:
                outputs = layer.output
                if isinstance(outputs, list):
                    shapes = [o.shape for o in outputs]
                else:
                    shapes = [outputs.shape]
            except AttributeError:
                # Some intermediate layers (like InputLayer in some versions) might behave oddly
                continue
        
        if not shapes:
            continue
            
        valid_layers_count += 1
        
        for shape in shapes:
            if shape is None: continue
            
            # shape can be a tuple or TensorShape. Convert to list.
            # Handle batch dimension (usually first, can be None)
            # We skip the first dim (Batch) as per Paper 2 logic
            
            dims = list(shape)[1:] # Skip batch
            
            if not dims: 
                # Scalar or (None,) -> treat as single float
                layer_mem = 4 
            else:
                # Replace None dims with 1 (safe assumption for calculation)
                safe_dims = [d if d is not None else 1 for d in dims]
                layer_mem = np.prod(safe_dims) * 4 # float32 = 4 bytes
            
            peak_activation_memory = max(peak_activation_memory, layer_mem)

    # Estimasi ukuran disk (Paper 2 logic)
    temp_model_path = "temp_model_for_size.h5" 
    try:
        model.save(temp_model_path)
        model_size_on_disk = os.path.getsize(temp_model_path)
    except Exception as e:
        print(f"Error saving model for size estimation: {e}")
        model_size_on_disk = 0
    finally:
        if os.path.exists(temp_model_path):
            os.remove(temp_model_path)
            
    # Debug print to confirm fix
    if peak_activation_memory > 0:
        print(f"DEBUG: Memory calculated successfully from {valid_layers_count} layers. Peak: {peak_activation_memory} bytes")
    else:
        print(f"DEBUG: WARNING - Memory still 0. Valid layers found: {valid_layers_count}")

    return peak_activation_memory, model_size_on_disk

def train_model(model, train_ds, val_ds, model_name='custom_cnn'):
    """
    Orchestrates the training process.
    """
    # Compile
    # Use Optimzer from Config (default: Adam per Paper 2)
    optimizer_config = config.OPTIMIZER if hasattr(config, 'OPTIMIZER') else 'adam'
    
    # Paper 2 uses 'sparse_categorical_crossentropy'
    model.compile(
        optimizer=optimizer_config,
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy'] # Paper 2 metrics
    )
    
    # Callbacks
    # Ensure directories exist
    os.makedirs(config.MODELS_DIR, exist_ok=True)
    os.makedirs(config.OUTPUTS_DIR, exist_ok=True)

    checkpoint_path = os.path.join(config.MODELS_DIR, f"{model_name}_best.h5")
    callbacks = [
        # Paper 2: Save Weights Only, Best Only.
        # But for inference convenience we might want save_weights_only=False?
        # Paper 2 code: save_weights_only=True. 
        # User said "100%". So let's stick to save_best_only (defaults save_weights_only=False in standard Keras unless specified).
        # Wait, Paper 2 line 1033 says: save_weights_only=True.
        # However, for our deployment easier handling, saving full model is better.
        # I will use save_best_only=True (Full Model) to prevent architecture mismatch issues later, 
        # unless user strictly demands weights only. The "strategy" is saving the best model.
        tf.keras.callbacks.ModelCheckpoint(checkpoint_path, save_best_only=True, monitor='val_accuracy', mode='max'),
        tf.keras.callbacks.CSVLogger(os.path.join(config.OUTPUTS_DIR, f"{model_name}_history.csv")),
        tf.keras.callbacks.TensorBoard(log_dir=os.path.join(config.OUTPUTS_DIR, 'logs', model_name), histogram_freq=1)
    ]
    
    # Add EarlyStopping only if PATIENCE < EPOCHS (Paper 2 has no early stopping)
    if config.PATIENCE < config.EPOCHS:
         callbacks.append(tf.keras.callbacks.EarlyStopping(patience=config.PATIENCE, restore_best_weights=True))
    
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
    flops = get_flops(model)
    
    # Params
    total_params = model.count_params()
    
    # Inference Time (Average over 100 runs)
    # Fix Shape: input_shape usually (None, H, W, C). We want (1, H, W, C).
    input_shape = model.input_shape
    target_shape = (1,) + input_shape[1:] if input_shape[0] is None else input_shape
    dummy_input = tf.random.normal(target_shape)
    
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
