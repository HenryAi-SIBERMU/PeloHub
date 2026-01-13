import os
import tensorflow as tf
import glob
import pandas as pd
from sklearn.model_selection import train_test_split
from . import config
from . import preprocessing

import re

def get_file_paths(dataset_root, dataset_name='UASpeech'):
    """
    Parses file paths and labels from dataset directories.
    Target: BINARY Classification (Control vs Dysarthric).
    Label Convention: 0 = Control, 1 = Dysarthric.
    """
    file_paths = []
    labels = []
    
    # Define paths for Control and Dysarthric folders
    # Structure: dataset_root/control/*.wav AND dataset_root/dysarthric/*.wav
    # This matches the structure seen in Paper 2 code.
    
    # Define paths for Control and Dysarthric folders
    
    # 0. Case-Insensitive Dataset Root Check
    if not os.path.exists(dataset_root):
        print(f"[{dataset_name}] Directory not found: {dataset_root}")
        parent = os.path.dirname(dataset_root)
        base = os.path.basename(dataset_root)
        found = False
        if os.path.exists(parent):
            print(f"[{dataset_name}] Scanning parent: {parent}")
            for d in os.listdir(parent):
                if d.lower() == base.lower():
                    dataset_root = os.path.join(parent, d)
                    print(f"[{dataset_name}] Found match: {dataset_root}")
                    found = True
                    break
                # Paper 2 Compatibility: Check for 'TORGO_smalldataset'
                if dataset_name == 'TORGO' and d == 'TORGO_smalldataset':
                    dataset_root = os.path.join(parent, d)
                    print(f"[{dataset_name}] Found match (Paper 2 style): {dataset_root}")
                    found = True
                    break
        if not found:
            print(f"[{dataset_name}] CRITICAL: Valid dataset directory not found!")
            return [], []

    # Check 1: Explicit 'control' and 'dysarthric' folders with flexible globbing (case insensitive ext)
    # Using recursive glob with case insensitive extension pattern is tricky in glob.
    # We will search for *.wav and *.WAV
    
    control_pattern_lower = os.path.join(dataset_root, 'control', '**', '*.wav')
    control_pattern_upper = os.path.join(dataset_root, 'control', '**', '*.WAV')
    dysarthric_pattern_lower = os.path.join(dataset_root, 'dysarthric', '**', '*.wav')
    dysarthric_pattern_upper = os.path.join(dataset_root, 'dysarthric', '**', '*.WAV')
    
    control_files = glob.glob(control_pattern_lower, recursive=True) + glob.glob(control_pattern_upper, recursive=True)
    dysarthric_files = glob.glob(dysarthric_pattern_lower, recursive=True) + glob.glob(dysarthric_pattern_upper, recursive=True)
    
    # Check 2: Raw TORGO Structure (Speaker IDs) if explicit folders are empty
    # TORGO Speakers:
    # Dysarthric: F01, F03, F04, M01, M02, M03, M04, M05
    # Control: FC01, FC02, FC03, MC01, MC02, MC03, MC04
    if dataset_name == 'TORGO' and len(control_files) == 0 and len(dysarthric_files) == 0:
        print(f"[{dataset_name}] Explicit split not found. Scanning for Speaker IDs in {dataset_root}...")
        
        all_wavs = glob.glob(os.path.join(dataset_root, '**', '*.wav'), recursive=True) + \
                   glob.glob(os.path.join(dataset_root, '**', '*.WAV'), recursive=True)
        
        # Debug: if still 0, print what directories exist
        if len(all_wavs) == 0:
            print(f"[{dataset_name}] No .wav files found! Checking subdirectories:")
            try:
                print(os.listdir(dataset_root))
                # Check one level deeper
                for item in os.listdir(dataset_root):
                    sub = os.path.join(dataset_root, item)
                    if os.path.isdir(sub):
                        print(f" - {item}/: {os.listdir(sub)[:5]}...")
            except Exception as e:
                print(f"Error listing dirs: {e}")
        
        for f in all_wavs:
            # Check identifying parts in the path
            path_parts = f.split(os.sep)
            filename = os.path.basename(f)
            
            # Heuristic: Check for Speaker ID in path parts
            # Control usually has 'C' in ID like FC01, MC01 or 'Control' in path
            # Dysarthric is F01, M01 etc (without C)
            
            is_control = False
            is_dysarthric = False
            
            # Simple check against known lists or patterns
            for part in path_parts:
                part = part.upper()
                if part in ['FC01', 'FC02', 'FC03', 'MC01', 'MC02', 'MC03', 'MC04', 'CONTROL']:
                    is_control = True
                    break
                elif part in ['F01', 'F03', 'F04', 'M01', 'M02', 'M03', 'M04', 'M05', 'DYSARTHRIC']:
                    is_dysarthric = True
                    break
            
            if is_control:
                control_files.append(f)
            elif is_dysarthric:
                dysarthric_files.append(f)
            # Else ignore (maybe random system files)

    print(f"[{dataset_name}] Found {len(control_files)} Control files.")
    print(f"[{dataset_name}] Found {len(dysarthric_files)} Dysarthric files.")
    
    # Extract Speaker IDs Helper
    def extract_speaker_id(filepath):
        # Naive Heuristic: Search for patterns like M01, F03, MC01, FC02
        # TORGO: F01, M02, FC01 (Control often has C)
        # S01.. etc.
        # Strategy: Look for the parent folder or filename parts
        parts = filepath.split(os.sep)
        filename = os.path.basename(filepath)
        
        # Regex for common Speaker ID patterns in these datasets
        # Matches: M01, F04, MC02, FC03, M1, F1 (case insensitive)
        # Note: UASpeech sometimes has M05 or M5.
        match = re.search(r'([MF]C?\d+)', filepath, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        
        # Fallback: Use parent folder name if it looks like an ID
        parent = parts[-2] if len(parts) > 1 else ""
        if re.match(r'^[MF]C?\d+$', parent, re.IGNORECASE):
            return parent.upper()
            
        return "UNKNOWN_SPEAKER"

    speaker_ids = []

    # Assign Labels
    # Control -> 0
    for f in control_files:
        file_paths.append(f)
        labels.append('control') # Mapped to 0 later
        speaker_ids.append(extract_speaker_id(f))
        
    # Dysarthric -> 1
    for f in dysarthric_files:
        file_paths.append(f)
        labels.append('dysarthric') # Mapped to 1 later
        speaker_ids.append(extract_speaker_id(f))
            
    return file_paths, labels, speaker_ids

def create_tf_dataset(file_paths, labels, class_mapping, batch_size=config.BATCH_SIZE, is_training=False, feature_type='stft'):
    """
    Creates a tf.data.Dataset from file paths and labels.
    """
    # Convert labels to integers
    label_indices = [class_mapping[l] for l in labels]
    
    # Create dataset of paths/labels
    dataset = tf.data.Dataset.from_tensor_slices((file_paths, label_indices))
    
    # Map preprocessing function
    def process_path(file_path, label):
        # Load and preprocess
        # Output shape from preprocessing: (Height, Width, 1) -> Already has Channel dim
        features = preprocessing.load_and_preprocess_wav(file_path, feature_type=feature_type)
        
        # Add channel dimension logic
        if feature_type == 'mfcc':
            # MFCC comes as (F, T, 1). We need (F, T, 3) for Transfer Learning.
            # Use CONCAT, not STACK. 
            # (F,T,1) + (F,T,1) + (F,T,1) -> (F,T,3) via concat axis -1.
            features = tf.concat([features, features, features], axis=-1)
        else:
            # CNN-STFT expects (F, T, 1). 
            # Preprocessing already returns (F, T, 1), so do NOTHING.
            pass
            
        return features, label
    
    dataset = dataset.map(process_path, num_parallel_calls=tf.data.AUTOTUNE)
    
    if is_training:
        dataset = dataset.shuffle(buffer_size=1000)
    
    dataset = dataset.batch(batch_size)
    dataset = dataset.prefetch(buffer_size=tf.data.AUTOTUNE)
    
    return dataset
