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
    Original 'Micro' Architecture (~23k Params).
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
    
    model = models.Model(inputs, outputs, name="Lightweight_CNN_STFT_Micro")
    return model
