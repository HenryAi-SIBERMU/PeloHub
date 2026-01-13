# EDA Samples - Quick Setup Guide

## 📁 Directory Structure
```
backend/outputs/samples/
├── dysarthric/
│   ├── uaspeech_M01_B1_UW1_M1.wav
│   ├── torgo_FC01_0001.wav
│   └── ...
└── control/
    ├── control_speaker1_001.wav
    └── ...
```

## 🚀 Quick Start

### 1. Add Sample Audio Files
Copy 5-10 sample `.wav` files to each directory:
- **Dysarthric samples** → `backend/outputs/samples/dysarthric/`
- **Control samples** → `backend/outputs/samples/control/`

**File Naming Convention:**
- UASpeech dysarthric: `uaspeech_*.wav`
- TORGO dysarthric: `torgo_*.wav`
- Control: `control_*.wav` (or any name)

### 2. Generate EDA Data
```bash
python tools/generate_eda_samples.py
```

This will:
- ✅ Scan both directories
- ✅ Extract audio specifications (sample rate, bit depth, etc.)
- ✅ Generate waveform data (80 bars for visualization)
- ✅ Generate mel spectrogram (40x60 matrix)
- ✅ Create `backend/outputs/eda_samples.json`

### 3. Verify Output
Check that `backend/outputs/eda_samples.json` was created with structure:
```json
{
  "uaspeech": {
    "dysarthric": [...],
    "control": [...]
  },
  "torgo": {
    "dysarthric": [...],
    "control": [...]
  }
}
```

### 4. Test Frontend
1. Restart backend if needed: `uvicorn app_api:app --reload`
2. Open frontend: http://localhost:5173
3. Navigate to "Dataset & EDA" page
4. Check:
   - Audio player works
   - Waveform displays
   - Spectrogram displays
   - Audio specifications show correct data

## 📝 Notes
- Minimum 1 file per category (dysarthric/control)
- Recommended: 5-10 files per category for good demo
- Files must be `.wav` format
- Script automatically detects dataset (UASpeech/TORGO) from filename

## 🔄 Re-generate
If you add/remove files, just run the script again:
```bash
python tools/generate_eda_samples.py
```
