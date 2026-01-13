# EDA Samples Directory

This directory contains audio samples for the "Dataset & EDA" page visualization.

## Structure
```
samples/
├── dysarthric/          (Dysarthric samples from UASpeech & TORGO)
│   ├── uaspeech_*.wav
│   └── torgo_*.wav
└── control/             (Non-dysarthric/Control samples)
    └── control_*.wav
```

## Development Setup
For local development, manually place 5-10 sample `.wav` files here from your datasets.

## Production Deployment (GCP)
⚠️ **REMINDER FOR DEPLOYMENT PHASE:**
- Upload all samples to **Google Cloud Storage (GCS)** bucket
- Update `backend/app_api.py` to serve files from GCS URLs instead of local static files
- Update `frontend/pages/EDADashboard.tsx` to fetch from GCS URLs
- Configure CORS for GCS bucket to allow frontend access

## File Naming Convention
- `uaspeech_<speaker>_<utterance>.wav` - UASpeech dysarthric samples
- `torgo_<speaker>_<utterance>.wav` - TORGO dysarthric samples  
- `control_<speaker>_<utterance>.wav` - Control/healthy samples

## eda_samples.json
The `eda_samples.json` file should be manually created or generated locally with metadata for these samples.
