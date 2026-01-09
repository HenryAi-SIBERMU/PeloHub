import os
import io
import tensorflow as tf
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from src import models, preprocessing, config

# Inisialisasi Aplikasi FastAPI
app = FastAPI(
    title="API Pengenalan Disartria (Tesis v2.0.1)",
    description="Backend API untuk memproses input audio dan mengembalikan prediksi Disartria vs Kontrol.",
    version="2.0.1"
)

# Konfigurasi CORS (Agar Frontend React bisa mengakses)
origins = [
    "http://localhost:3000", # Default React
    "http://localhost:5173", # Vite
    "*" # Izinkan semua untuk tahap development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Variables untuk menyimpan Model yang dimuat (Lazy Loading)
loaded_models = {}

def get_trained_model(model_name: str):
    """
    Memuat model .h5 dari folder 'models/' jika belum dimuat.
    Format path model: backend/models/{model_name}_best.h5 (sesuai output training)
    """
    if model_name in loaded_models:
        return loaded_models[model_name]
    
    # Path Relatif ke folder models
    # Asumsi: script ini dijalankan dari folder backend/
    model_path = os.path.join("models", f"{model_name}_best.h5")
    
    # Jika file .h5 belum ada (karena belum training di GCP), kita gunakan model dummy/state sementara
    # NANTI: Hapus block try-except ini jika model sudah benar-benar ada
    if not os.path.exists(model_path):
        print(f"⚠️ Peringatan: Model file {model_path} tidak ditemukan. Menggunakan Random Weights untuk Dev.")
        # Buat model kosong untuk testing API flow
        input_shape = (174, 27, 1) if model_name == 'cnn_stft' else (40, 174, 3) 
        dummy_model = models.get_model(model_name, input_shape)
        loaded_models[model_name] = dummy_model
        return dummy_model

    print(f"Memuat model {model_name} dari {model_path}...")
    try:
        model = tf.keras.models.load_model(model_path)
        loaded_models[model_name] = model
        return model
    except Exception as e:
        raise RuntimeError(f"Gagal memuat model {model_name}: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "aktif", "pesan": "Backend API Tesis v2.0.1 Siap!"}

@app.get("/status")
def health_check():
    """Endpoint untuk Health Check Cloud Run"""
    return {"status": "sehat", "gpu_tersedia": len(tf.config.list_physical_devices('GPU')) > 0}

@app.post("/predict/{model_name}")
async def predict_audio(model_name: str, file: UploadFile = File(...)):
    """
    Endpoint utama untuk prediksi audio.
    Args:
        model_name: Nama model arsitektur (cnn_stft, mobilenetv3, dll)
        file: File audio (.wav) yang diupload
    """
    
    # Validasi Nama Model
    if model_name not in config.MODELS:
        raise HTTPException(status_code=400, detail=f"Model tidak dikenal. Pilihan: {list(config.MODELS.keys())}")
    
    # Validasi File
    if not file.filename.endswith(('.wav', '.WAV')):
        raise HTTPException(status_code=400, detail="Hanya file .wav yang didukung.")

    try:
        # Membaca konten file
        file_content = await file.read()
        
        # Decode Audio menggunakan fungsi TensorFlow (sama seperti saat training)
        # Kita perlu simpan sementara atau parsing stream byte
        # tf.audio.decode_wav mengharapkan string byte
        audio_tensor, sample_rate = tf.audio.decode_wav(file_content, desired_channels=1)
        audio_tensor = tf.squeeze(audio_tensor, axis=-1)
        
        # Preprocessing (STFT atau MFCC)
        feature_type = 'stft' if model_name == 'cnn_stft' else 'mfcc'
        
        if feature_type == 'stft':
            features = preprocessing.get_spectrogram(audio_tensor)
        else:
            features = preprocessing.get_mfcc(audio_tensor)
            
        # Tambahkan batch dimension (Model expect inputs: [Batch, H, W, C])
        # Current logic di preprocessing bisa saja sudah add batch jika pakai logic lama,
        # Kita cek shape. preprocessing.get_spectrogram outputs (174, 27, 1)
        
        features = tf.expand_dims(features, axis=0) # Shape: (1, 174, 27, 1)
        
        # Load Model & Prediksi
        model = get_trained_model(model_name)
        
        # Lakukan Inferensi
        predictions = model.predict(features)
        
        # Proses Hasil (Binary Classification: [Prob_Control, Prob_Dysarthric])
        # Asumsi urutan class alphabet: Control (0), Dysarthric (1) -> Cek data_loader mapping
        # Tapi biasanya dataset medis: 0=Control, 1=Patient. Kita perlu pastikan mapping nanti.
        # Untuk sementara kita kembalikan raw probabilities.
        
        confidence_control = float(predictions[0][0])
        confidence_dysarthric = float(predictions[0][1])
        
        predicted_label = "Dysarthric" if confidence_dysarthric > confidence_control else "Control"
        confidence_score = max(confidence_control, confidence_dysarthric)
        
        return JSONResponse(content={
            "model": model_name,
            "prediksi": predicted_label,
            "confidence": f"{confidence_score:.2%}",
            "detail_probabilitas": {
                "Control": confidence_control,
                "Dysarthric": confidence_dysarthric
            },
            "durasi_audio_sample": len(audio_tensor)
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Menjalankan server lokal (Dev Mode)
    uvicorn.run(app, host="0.0.0.0", port=8000)
