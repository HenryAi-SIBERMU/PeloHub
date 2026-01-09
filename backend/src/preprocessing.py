import tensorflow as tf
import numpy as np

from . import config

def get_spectrogram(audio):
    """
    Computes STFT Spectrogram.
    Output Shape: (Time, Freq, 1) -> e.g. (99, 161, 1)
    """
    # 1. Padding/Trimming (Now ~3.5s to match Paper 2 duration)
    target_len = config.AUDIO_MAX_LENGTH
    input_len = tf.shape(audio)[0]
    
    # Simple check for padding
    if input_len > target_len:
        audio = audio[:target_len]
    else:
        padding = target_len - input_len
        audio = tf.pad(audio, [[0, padding]])

    # 2. Normalization
    audio = tf.cast(audio, tf.float32)
    audio = audio - tf.math.reduce_mean(audio)
    audio = audio / (tf.math.reduce_max(tf.math.abs(audio)) + 1e-6)
    
    # 3. STFT
    spectrogram = tf.signal.stft(
        audio, 
        frame_length=config.STFT_WINDOW_SIZE, 
        frame_step=config.STFT_STRIDE,
        fft_length=config.N_FFT
    )
    
    # 4. Magnitude & Log
    spectrogram = tf.abs(spectrogram)
    spectrogram = tf.expand_dims(spectrogram, -1)
    spectrogram = tf.math.log(spectrogram + 1e-6)
    
    # 5. Pooling matches old PeloNet logic matches Tesis v0.1.
    # We need to temporarily add a Batch Dimension because tf.nn.pool requires Rank 4 (N, T, F, C).
    # Current Shape: (Time, Freq, 1) -> Rank 3.
    
    spectrogram = tf.expand_dims(spectrogram, 0) # Shape: (1, Time, Freq, 1)
    
    spectrogram = tf.nn.pool(
        input=spectrogram,
        window_shape=[1, 6],
        strides=[1, 6],
        pooling_type='AVG',
        padding='SAME'
    )
    
    spectrogram = tf.squeeze(spectrogram, axis=0) # Shape: (Time, Freq, 1)
    
    return spectrogram

def get_mfcc(audio):
    """
    Computes MFCCs using TensorFLow. Matches Paper 2 (40 MFCCs).
    Output Shape: (N_MFCC, Time, 1) -> (40, 174, 1)
    """
    # 1. Pad/Trim to approx 3.5s
    target_len = config.AUDIO_MAX_LENGTH
    
    # Get current length
    audio_len = tf.shape(audio)[0]
    
    if audio_len > target_len:
        audio = audio[:target_len]
    else:
        padding = target_len - audio_len
        audio = tf.pad(audio, [[0, padding]])
        
    audio = tf.cast(audio, tf.float32)
    
    # 2. STFT
    stft = tf.signal.stft(
        audio, 
        frame_length=config.STFT_WINDOW_SIZE, 
        frame_step=config.STFT_STRIDE,
        fft_length=config.N_FFT
    )
    spectrogram = tf.abs(stft)
    
    # 3. Mel
    num_spectrogram_bins = stft.shape[-1]
    linear_to_mel_weight_matrix = tf.signal.linear_to_mel_weight_matrix(
        num_mel_bins=config.N_MFCC,
        num_spectrogram_bins=num_spectrogram_bins,
        sample_rate=config.SAMPLE_RATE,
        lower_edge_hertz=20.0,
        upper_edge_hertz=4000.0
    )
    mel_spectrograms = tf.tensordot(spectrogram, linear_to_mel_weight_matrix, 1)
    mel_spectrograms.set_shape(spectrogram.shape[:-1].concatenate(linear_to_mel_weight_matrix.shape[-1:]))
    log_mel = tf.math.log(mel_spectrograms + 1e-6)
    
    # 4. MFCC
    # tf.signal.mfccs_from_log_mel_spectrograms returns (..., Time, MFCC)
    mfccs = tf.signal.mfccs_from_log_mel_spectrograms(log_mel)
    mfccs = mfccs[..., :config.N_MFCC]
    
    # 5. Transpose to (MFCC, Time) to match ImageNet style (Height, Width)
    # Current: (Time, MFCC)
    # Target: (MFCC, Time)
    mfccs = tf.transpose(mfccs, perm=[1, 0])
    
    # 6. Add Channel Dimension -> (MFCC, Time, 1)
    mfccs = tf.expand_dims(mfccs, -1)
    
    return mfccs

def load_and_preprocess_wav(file_path, feature_type='stft'):
    """
    Loads wav and extracts features (STFT or MFCC).
    """
    file_contents = tf.io.read_file(file_path)
    audio, sample_rate = tf.audio.decode_wav(file_contents, desired_channels=1)
    audio = tf.squeeze(audio, axis=-1)
    
    if feature_type == 'stft':
        return get_spectrogram(audio)
    elif feature_type == 'mfcc':
        return get_mfcc(audio)
    else:
        return get_spectrogram(audio)
