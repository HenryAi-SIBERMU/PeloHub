"""
Generate EDA Samples JSON from Local Audio Files
Extracts audio specifications, waveform, and spectrogram data from samples directory
"""

import os
import json
import librosa
import numpy as np
import wave
from pathlib import Path

def get_audio_specs(filepath):
    """Extract technical audio specifications"""
    try:
        with wave.open(filepath, 'rb') as wav_file:
            channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            framerate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            
            duration = n_frames / float(framerate)
            bit_depth = sample_width * 8
            byte_rate = framerate * channels * sample_width
            
            return {
                "format": "WAV",
                "sampleRate": f"{framerate} Hz",
                "bitDepth": f"{bit_depth}-bit",
                "channels": "Mono" if channels == 1 else f"{channels} Channels",
                "byteRate": f"{byte_rate:,} bytes/sec",
                "duration": duration
            }
    except Exception as e:
        print(f"Error reading specs from {filepath}: {e}")
        return None

def generate_waveform(y, sr, num_bars=80):
    """Generate waveform data for visualization (80 bars)"""
    try:
        hop_len = max(1, len(y) // num_bars)
        waveform = [float(np.max(np.abs(y[i:i+hop_len]))) for i in range(0, len(y), hop_len)][:num_bars]
        
        # Normalize to 0-100 for CSS height
        if waveform:
            max_val = max(waveform)
            if max_val > 0:
                waveform = [int((v / max_val) * 100) for v in waveform]
        
        return waveform
    except Exception as e:
        print(f"Error generating waveform: {e}")
        return []

def generate_spectrogram(y, sr, n_mels=40, max_time_steps=60):
    """Generate mel spectrogram data for visualization"""
    try:
        hop_length = max(512, len(y) // max_time_steps)
        
        S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=n_mels, hop_length=hop_length)
        S_db = librosa.power_to_db(S, ref=np.max)
        
        # Normalize to 0-1
        min_db, max_db = S_db.min(), S_db.max()
        if max_db > min_db:
            S_norm = (S_db - min_db) / (max_db - min_db)
        else:
            S_norm = S_db
        
        # Ensure dimensions (cut if too long)
        if S_norm.shape[1] > max_time_steps:
            S_norm = S_norm[:, :max_time_steps]
        
        return S_norm.tolist()
    except Exception as e:
        print(f"Error generating spectrogram: {e}")
        return []

def process_audio_file(filepath, category):
    """Process a single audio file and extract all data"""
    try:
        # Load audio
        y, sr = librosa.load(filepath, sr=16000)
        duration = len(y) / sr
        
        # Get technical specs
        specs = get_audio_specs(filepath)
        if not specs:
            return None
        
        # Generate visualizations
        waveform = generate_waveform(y, sr)
        spectrogram = generate_spectrogram(y, sr)
        
        filename = os.path.basename(filepath)
        file_id = os.path.splitext(filename)[0]
        
        return {
            "id": file_id,
            "name": filename,
            "duration": f"{duration:.1f}s",
            "durationSec": duration,
            "type": category,
            "severity": "Unknown",
            "waveform": waveform,
            "spectrogram": spectrogram,
            "specs": specs,
            "url": f"/static/samples/{category}/{filename}"
        }
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return None

def main():
    # Paths
    samples_dir = Path("backend/outputs/samples")
    output_file = Path("backend/outputs/eda_samples.json")
    
    print("🎵 Generating EDA Samples from Local Audio Files...")
    print(f"📂 Scanning directory: {samples_dir}")
    
    # Check if directory exists
    if not samples_dir.exists():
        print(f"❌ Error: Directory {samples_dir} not found!")
        print("   Please create the directory and add sample audio files.")
        return
    
    # Initialize output structure
    eda_data = {
        "uaspeech": {"dysarthric": [], "control": []},
        "torgo": {"dysarthric": [], "control": []}
    }
    
    # Process dysarthric samples
    dysarthric_dir = samples_dir / "dysarthric"
    if dysarthric_dir.exists():
        print(f"\n📁 Processing dysarthric samples...")
        for audio_file in dysarthric_dir.glob("*.wav"):
            print(f"   Processing: {audio_file.name}")
            data = process_audio_file(str(audio_file), "dysarthric")
            if data:
                # Determine dataset based on filename
                if "uaspeech" in audio_file.name.lower():
                    eda_data["uaspeech"]["dysarthric"].append(data)
                elif "torgo" in audio_file.name.lower():
                    eda_data["torgo"]["dysarthric"].append(data)
                else:
                    # Default to uaspeech if no prefix
                    eda_data["uaspeech"]["dysarthric"].append(data)
    else:
        print(f"⚠️  Warning: {dysarthric_dir} not found")
    
    # Process control samples
    control_dir = samples_dir / "control"
    if control_dir.exists():
        print(f"\n📁 Processing control samples...")
        for audio_file in control_dir.glob("*.wav"):
            print(f"   Processing: {audio_file.name}")
            data = process_audio_file(str(audio_file), "control")
            if data:
                # Determine dataset based on filename
                if "uaspeech" in audio_file.name.lower():
                    eda_data["uaspeech"]["control"].append(data)
                elif "torgo" in audio_file.name.lower():
                    eda_data["torgo"]["control"].append(data)
                else:
                    # Default to uaspeech if no prefix
                    eda_data["uaspeech"]["control"].append(data)
    else:
        print(f"⚠️  Warning: {control_dir} not found")
    
    # Count totals
    total_samples = sum(
        len(eda_data[ds][cat]) 
        for ds in ["uaspeech", "torgo"] 
        for cat in ["dysarthric", "control"]
    )
    
    if total_samples == 0:
        print("\n❌ No audio files found!")
        print("   Please add .wav files to:")
        print(f"   - {dysarthric_dir}")
        print(f"   - {control_dir}")
        return
    
    # Save to JSON
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(eda_data, f, indent=2)
    
    print(f"\n✅ Successfully processed {total_samples} audio files")
    print(f"📄 Output saved to: {output_file}")
    print(f"\n📊 Summary:")
    print(f"   UASpeech Dysarthric: {len(eda_data['uaspeech']['dysarthric'])}")
    print(f"   UASpeech Control: {len(eda_data['uaspeech']['control'])}")
    print(f"   TORGO Dysarthric: {len(eda_data['torgo']['dysarthric'])}")
    print(f"   TORGO Control: {len(eda_data['torgo']['control'])}")

if __name__ == "__main__":
    main()
