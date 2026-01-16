import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')
# Point to backend outputs (where generated JSON files live)
OUTPUTS_DIR = os.path.join(PROJECT_ROOT, 'outputs')

# Audio Processing Parameters (Paper 2 Compliance: Native SR & Librosa Defaults)
SAMPLE_RATE = 16000 # Increased from 8000 to match typical native speech rate

# STFT (Librosa Defaults: n_fft=2048, hop_length=512)
STFT_WINDOW_SIZE = 2048 
STFT_STRIDE = 512 
N_FFT = 2048 

# MFCC (For Transfer Learning Models)
N_MFCC = 40
MFCC_MAX_LEN = 174 # Fixed Input Width
# Audio Length Calculation: (174 - 1) * 512 + 2048 = 90624 samples (~5.6s)
AUDIO_MAX_LENGTH = (MFCC_MAX_LEN - 1) * STFT_STRIDE + STFT_WINDOW_SIZE

# Model Parameters
BATCH_SIZE = 32
EPOCHS = 40
LEARNING_RATE = 0.0001 # Reduced from 0.001 to stabilize CNN-STFT (Fix Sawtooth)
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
