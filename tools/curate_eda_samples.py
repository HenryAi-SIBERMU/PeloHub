
import os
import glob
import shutil
import json
import numpy as np
import scipy.io.wavfile as wav
import scipy.signal
import random
import re

# -- CONFIGURATION --
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Root v2.0.1
DATA_DIR_V1 = r"c:\Users\yooma\OneDrive\Desktop\KULIAH S2\TESIS\4. Dev\Tesis\v1.0.0\data"
RAW_TORGO_DIR = r"c:\Users\yooma\OneDrive\Desktop\KULIAH S2\TESIS\4. Dev\Tesis\v0.1.0\speech_data"
OUTPUT_SAMPLES_DIR = os.path.join(BASE_DIR, "backend", "outputs", "samples")
OUTPUT_JSON_PATH = os.path.join(BASE_DIR, "backend", "outputs", "eda_samples.json")

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def generate_spectrogram(audio, sr, n_mels=128):
    """
    Generate a simple mel-spectrogram approximation using scipy.
    Returns a list of lists (2D array) for valid JSON.
    """
    # Simple STFT
    f, t, Zxx = scipy.signal.stft(audio, fs=sr, nperseg=512)
    # Magnitude
    mag = np.abs(Zxx)
    # Log scale
    log_spec = np.log(mag + 1e-9)
    # Resize/downsample simply by slicing to keep JSON size manageable for UI
    # We take 64 freq bins and time steps
    spec_data = log_spec[:64, ::4] # Slice frequency, downsample time
    
    # Normalize 0-1
    if spec_data.max() > spec_data.min():
        spec_data = (spec_data - spec_data.min()) / (spec_data.max() - spec_data.min())
    else:
        spec_data = spec_data - spec_data.min() # Zero if flat
        
    return spec_data.tolist()

def generate_waveform(audio, points=100):
    """
    Downsample waveform for visualization (Returns 0-100 float values)
    """
    if len(audio) == 0:
        return [0] * points

    # Simply decimate first
    step = max(1, len(audio) // points)
    downsampled = audio[::step]
    
    # Convert to float and absolute magnitude
    if downsampled.dtype == np.int16:
        downsampled = downsampled.astype(np.float32) / 32768.0
    
    magnitude = np.abs(downsampled)

    # Normalize to 0-100 scale for CSS height
    if magnitude.max() > 0:
        normalized = (magnitude / magnitude.max()) * 100
    else:
        normalized = magnitude * 0 # Zeros

    return normalized.tolist()

def process_file(filepath, target_filename, original_filename):
    """
    Copy file and generate metadata
    """
    # Copy
    target_path = os.path.join(OUTPUT_SAMPLES_DIR, target_filename)
    shutil.copy2(filepath, target_path)

    # Read Audio
    try:
        sr, audio = wav.read(filepath)
    except ValueError:
        print(f"Error reading {filepath}, skipping waveform gen")
        return None

    if len(audio.shape) > 1:
        audio = audio[:, 0] # Take first channel if stereo

    # Duration
    duration = len(audio) / sr

    # Waveform & Spectrogram
    waveform = generate_waveform(audio, points=150)
    spectrogram = generate_spectrogram(audio, sr)

    return {
        "filename": target_filename,
        "name": original_filename, # Preserve original name for UI
        "duration": float(f"{duration:.2f}"),
        "sampleRate": sr,
        "waveform": waveform,
        "spectrogram": spectrogram
    }

def main():
    # Clean output dir first to avoid staleness
    if os.path.exists(OUTPUT_SAMPLES_DIR):
        try:
            shutil.rmtree(OUTPUT_SAMPLES_DIR)
        except Exception:
            pass # sometimes locked
    ensure_dir(OUTPUT_SAMPLES_DIR)
    
    samples_data = {
        "torgo": [],
        "uaspeech": []
    }

    # =========================================================================
    # TORGO PROCESSING (NEW SOURCE: v0.1.0/speech_data)
    # Goal: 5 matches for M, 5 matches for F 
    # Structure: Folders represent words (e.g. "Bue", "Cancella")
    # Files: (mc|fc|m|f)XX_YY_Word.wav
    # =========================================================================
    print(f"Processing TORGO from {RAW_TORGO_DIR}...")
    
    torgo_pairs = [] # List of tuples: (dys_path, con_path, word, dys_fname, con_fname)
    
    # We want 5 M and 5 F pairs. 
    # We iterate words (directories) and try to extract pairs.
    # To ensure variety, we shuffle the words first.
    
    if os.path.exists(RAW_TORGO_DIR):
        all_words = [d for d in os.listdir(RAW_TORGO_DIR) if os.path.isdir(os.path.join(RAW_TORGO_DIR, d))]
        # random.shuffle(all_words) # Shuffle to get random words
        # Actually, let's just sort them for reproducibility now, or shuffle? 
        # Let's simple iterate. "Bue", "Cancella", etc.
        all_words = sorted(all_words)

        f_pairs_count = 0
        m_pairs_count = 0
        target_per_gender = 5
        
        for word in all_words:
            if f_pairs_count >= target_per_gender and m_pairs_count >= target_per_gender:
                break
                
            word_path = os.path.join(RAW_TORGO_DIR, word)
            files = os.listdir(word_path)
            
            # Categorize files by type for THIS word
            # f_files, m_files, fc_files, mc_files
            f_candidates = []
            m_candidates = []
            fc_candidates = []
            mc_candidates = []
            
            # Filename parsing regex: (f|m|fc|mc)(\d+)_\d+_.+
            # Actually, sometimes filename is `f01_01_Bue.wav`
            
            for fname in files:
                if not fname.lower().endswith('.wav'): continue
                
                parts = fname.split('_')
                # Check prefix
                prefix_part = parts[0] # e.g. f01, fc01
                
                # Determine type
                if prefix_part.startswith('fc'):
                    fc_candidates.append(fname)
                elif prefix_part.startswith('mc'):
                    mc_candidates.append(fname)
                elif prefix_part.startswith('f'):
                    f_candidates.append(fname)
                elif prefix_part.startswith('m'):
                    m_candidates.append(fname)
            
            # Try to form pairs for this word
            
            # Female Pair
            if f_pairs_count < target_per_gender and f_candidates and fc_candidates:
                # Pick one pair
                # Simple strategy: take first available F and first available FC
                dys_f = f_candidates[0]
                con_f = fc_candidates[0]
                
                torgo_pairs.append({
                    'dys_path': os.path.join(word_path, dys_f),
                    'con_path': os.path.join(word_path, con_f),
                    'word': word,
                    'dys_name': dys_f,
                    'con_name': con_f,
                    'gender': 'F'
                })
                f_pairs_count += 1
                
            # Male Pair
            if m_pairs_count < target_per_gender and m_candidates and mc_candidates:
                 # Pick one pair
                dys_m = m_candidates[0]
                con_m = mc_candidates[0]
                
                torgo_pairs.append({
                    'dys_path': os.path.join(word_path, dys_m),
                    'con_path': os.path.join(word_path, con_m),
                    'word': word,
                    'dys_name': dys_m,
                    'con_name': con_m,
                    'gender': 'M'
                })
                m_pairs_count += 1

    # Process extracted TORGO pairs
    t_id = 0
    for p in torgo_pairs:
        d_target = f"torgo_{p['dys_name']}"
        c_target = f"torgo_{p['con_name']}"
        
        d_meta = process_file(p['dys_path'], d_target, p['dys_name'])
        c_meta = process_file(p['con_path'], c_target, p['con_name'])
        
        if d_meta and c_meta:
            d_meta["label"] = "Dysarthric"
            d_meta["text"] = p['word']
            c_meta["label"] = "Control"
            c_meta["text"] = p['word']
            
            samples_data["torgo"].append({
                "id": t_id,
                "control": c_meta,
                "dysarthric": d_meta,
                "word": p['word']
            })
            t_id += 1

    # =========================================================================
    # UASPEECH PROCESSING (UNCHANGED)
    # Goal: 5 matches for M, 5 matches for F
    # Pairing: Control filename is strictly "C" + Dysarthric filename
    # =========================================================================
    print("Processing UASpeech...")
    uas_control_path = os.path.join(DATA_DIR_V1, "UASpeech", "control")
    uas_dys_path = os.path.join(DATA_DIR_V1, "UASpeech", "dysarthric")
    
    if os.path.exists(uas_dys_path) and os.path.exists(uas_control_path):
        uas_candidates = {'F': [], 'M': []}
        
        # Gather all valid PAIRS first
        # Check every dys file
        all_dys = sorted(os.listdir(uas_dys_path))
        for f in all_dys:
            if not f.endswith('.wav'): continue
            
            # Check control existence
            con_name = "C" + f
            con_path = os.path.join(uas_control_path, con_name)
            
            if os.path.exists(con_path):
                # Valid pair
                if f.startswith('F'):
                    uas_candidates['F'].append(f)
                elif f.startswith('M'):
                    uas_candidates['M'].append(f)
                    
        # Select 5 pairs per gender (Round Robin speakers)
        def select_uas_pairs(gender_label, target_count=5):
            pairs = []
            cands = uas_candidates[gender_label]
            
            # Group by speaker
            speakers = {}
            for c in cands:
                spk = c.split('_')[0]
                if spk not in speakers: speakers[spk] = []
                speakers[spk].append(c)
            
            spk_list = sorted(list(speakers.keys()))
            if not spk_list: return []
            
            idx = 0
            while len(pairs) < target_count:
                spk = spk_list[idx % len(spk_list)]
                
                # Pick a file for this speaker
                # Prefer CW words and M2 mic if available, else first available
                chosen = None
                
                # Sort candidates to prefer M2/CW
                # We want distinct words if possible, but definitely unused files
                spk_cands = speakers[spk]
                
                # Priority: Unused M2 CW -> Unused M2 -> Unused Any
                best = None
                for cand in spk_cands:
                    if cand in pairs: continue
                    if '_M2.wav' in cand and '_CW' in cand:
                        best = cand
                        break
                
                if not best:
                    for cand in spk_cands:
                        if cand in pairs: continue
                        if '_M2.wav' in cand:
                            best = cand
                            break
                            
                if not best:
                    for cand in spk_cands:
                        if cand in pairs: continue
                        best = cand
                        break
                        
                if best:
                    pairs.append(best)
                else:
                    # No more files for this speaker
                    pass 
                
                idx += 1
                if idx > 1000: break # Safety
            
            return pairs

        u_f_pairs = select_uas_pairs('F')
        u_m_pairs = select_uas_pairs('M')
        
        current_id = 0
        for dys_filename in (u_f_pairs + u_m_pairs):
            con_filename = "C" + dys_filename
            dys_path = os.path.join(uas_dys_path, dys_filename)
            con_path = os.path.join(uas_control_path, con_filename)
            
            parts = dys_filename.split('_')
            word_code = parts[2] if len(parts) > 2 else "Unknown"
            
            d_target = f"uaspeech_{dys_filename}"
            c_target = f"uaspeech_{con_filename}"
            
            d_meta = process_file(dys_path, d_target, dys_filename)
            c_meta = process_file(con_path, c_target, con_filename)
            
            if d_meta and c_meta:
                d_meta["label"] = "Dysarthric"
                d_meta["text"] = word_code
                c_meta["label"] = "Control"
                c_meta["text"] = word_code
                
                samples_data["uaspeech"].append({
                    "id": current_id,
                    "control": c_meta,
                    "dysarthric": d_meta,
                    "word": word_code
                })
                current_id += 1

    # Save JSON
    with open(OUTPUT_JSON_PATH, 'w') as f:
        json.dump(samples_data, f, indent=4)
    
    t_count = len(samples_data['torgo'])
    u_count = len(samples_data['uaspeech'])
    print(f"Done! Saved {u_count} UASpeech pairs and {t_count} TORGO pairs to {OUTPUT_JSON_PATH}")

if __name__ == "__main__":
    main()
