import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')
OUTPUTS_DIR = os.path.join(PROJECT_ROOT, 'outputs')

# Audio Processing Parameters (Matched to PeloNet V1 & Paper 2)
SAMPLE_RATE = 8000 

# STFT (For CNN-STFT)
STFT_WINDOW_SIZE = 320 # 40ms
STFT_STRIDE = 160 # 20ms
N_FFT = 320 

# MFCC (For Transfer Learning Models)
# MFCC (For Transfer Learning Models)
N_MFCC = 40
MFCC_MAX_LEN = 174 # From Paper 2
# Audio Length Calculation: (174 - 1) * 160 + 320 = 28000 (Approx 3.5s)
# We set a fixed length slightly larger to be safe or exact calculation
AUDIO_MAX_LENGTH = (MFCC_MAX_LEN - 1) * STFT_STRIDE + STFT_WINDOW_SIZE

# Model Parameters
BATCH_SIZE = 32
EPOCHS = 40
LEARNING_RATE = 0.001
PATIENCE = 40 # Set to EPOCHS to effectively disable Early Stopping (Paper 2 logic)
OPTIMIZER = 'adam' # Matched to Paper 2

# Dataset Config
# Command words to filter (Deprecated for Binary Class, kept empty)
COMMAND_WORDS = [] 

# Available Models
MODELS = {
    'cnn_stft': 'Lightweight CNN-STFT (Proposed)',
    'mobilenetv3': 'MobileNetV3Small (Benchmark)',
    'efficientnetb0': 'EfficientNetB0 (Benchmark)',
    'nasnetmobile': 'NASNetMobile (Benchmark)'
}
