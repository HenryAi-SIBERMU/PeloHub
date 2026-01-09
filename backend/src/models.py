import tensorflow as tf


# Robust Keras Import for Windows/TF Environment
try:
    from tensorflow import keras
except ImportError:
    import keras

layers = keras.layers
models = keras.models

def create_lightweight_cnn(input_shape, num_classes=2): 
    """
    Reconstructs the Custom CNN-STFT (PeloNet) architecture.
    """
    # Using Functional API for consistency
    inputs = layers.Input(shape=input_shape)
    
    # Conv Block 1
    x = layers.Conv2D(32, (3, 3), activation='relu', padding='same')(inputs)
    x = layers.MaxPooling2D((2, 2))(x)
    
    # Conv Block 2
    x = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(x)
    x = layers.MaxPooling2D((2, 2))(x)
    
    # Flatten & Dense
    # Using GlobalAveragePooling2D to prevent shape issues with small feature maps (like 1x1)
    # and to reduce parameters (Lightweight).
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(64, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    
    # Output
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = models.Model(inputs, outputs, name="Lightweight_CNN_STFT")
    return model

def create_transfer_learning_model(base_model_class, input_shape, num_classes=2, model_name='TL_Model'):
    """
    Generic wrapper for Transfer Learning models (MobileNet, EfficientNet, etc.).
    Input: MFCC Image (H, W, 1) -> Converted to 3 Channels inside.
    """
    # Input Layer
    inputs = layers.Input(shape=input_shape)
    
    # Convert 1-channel MFCC to 3-channel (Required by ImageNet weights)
    # Simply repeating the channel using Keras Layer (safer than tf.image op for Symbolic Tensors)
    x = layers.Concatenate(axis=-1)([inputs, inputs, inputs]) 
    
    # Base Model
    # MobileNetV3/EfficientNet expect 3 channels. 
    # Shapes will be inferred or resized by the model if strictly required, 
    # but (40, 174, 3) is generally accepted by these flexible architectures (except some specific ones).
    base_model = base_model_class(include_top=False, weights='imagenet', input_tensor=x)
    
    base_model.trainable = False # Freeze base
    
    # Feature extraction block
    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = models.Model(inputs=base_model.input, outputs=outputs, name=model_name)
    return model

def get_model(model_name, input_shape, num_classes=2):
    """
    Dispatcher to create the requested model.
    """
    if model_name == 'cnn_stft':
        return create_lightweight_cnn(input_shape, num_classes)
    elif model_name == 'mobilenetv3':
        return create_transfer_learning_model(keras.applications.MobileNetV3Small, input_shape, num_classes, 'MobileNetV3Small')
    elif model_name == 'efficientnetb0':
        return create_transfer_learning_model(keras.applications.EfficientNetB0, input_shape, num_classes, 'EfficientNetB0')
    elif model_name == 'nasnetmobile':
        return create_transfer_learning_model(keras.applications.NASNetMobile, input_shape, num_classes, 'NASNetMobile')
    else:
        raise ValueError(f"Unknown model: {model_name}")

