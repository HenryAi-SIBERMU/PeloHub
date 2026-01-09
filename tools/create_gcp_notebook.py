import json
import os

# Define the target path
target_file = r'Tesis/v2.0.1/notebooks/Master_Training_GCP.ipynb'

# Define the local data root for Vertex AI (Standard path)
# Assuming the user works in /home/jupyter/Tesis/v2.0.1
# We will use relative paths where possible for flexibility

notebook_content = {
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {
    "id": "header_cell"
   },
   "source": [
    "# Notebook Pelatihan Utama - Pengenalan Ucapan Disartria (Tesis v2.0.1 - GCP)\n",
    "\n",
    "**Tujuan:** Analisis Perbandingan **Lightweight CNN-STFT** (Diusulkan) vs **Model Transfer Learning** (MobileNetV3, EfficientNetB0, NASNetMobile).\n",
    "**Tugas:** Klasifikasi Biner (Kontrol vs Disartria).\n",
    "**Lingkungan:** Google Cloud Platform (Vertex AI Workbench) - GPU T4 Direkomendasikan.\n",
    "\n",
    "**CATATAN PERFORMA:** Notebook ini dikonfigurasi untuk berjalan di VM Vertex AI local SSD. Pastikan kernel Python 3 (TensorFlow) dipilih."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {
    "id": "env_setup"
   },
   "outputs": [],
   "source": [
    "# 1. Konfigurasi Path Lingkungan GCP\n",
    "import os\n",
    "import sys\n",
    "\n",
    "# Mendapatkan direktori kerja saat ini (seharusnya Tesis/v2.0.1/notebooks atau root project)\n",
    "CURRENT_DIR = os.getcwd()\n",
    "print(f\"Direktori Kerja Saat Ini: {CURRENT_DIR}\")\n",
    "\n",
    "# Asumsi struktur: Tesis/v2.0.1/notebooks, maka Backend ada di ../backend\n",
    "# Kita set PROJECT_ROOT ke folder 'backend' agar modul src bisa diimport\n",
    "PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..', 'backend'))\n",
    "SRC_DIR = os.path.join(PROJECT_ROOT, 'src')\n",
    "\n",
    "# Menambahkan ke System Path agar Python bisa menemukan modul 'src'\n",
    "if PROJECT_ROOT not in sys.path:\n",
    "    sys.path.append(PROJECT_ROOT)\n",
    "\n",
    "print(f\"Root Project (Backend): {PROJECT_ROOT}\")\n",
    "print(f\"Direktori Source Code: {SRC_DIR}\")\n",
    "\n",
    "# Data Root (Menyimpan dataset di folder 'data' sejajar dengan notebooks atau di home)\n",
    "# Di Vertex AI, lebih aman menggunakan folder lokal yang persistent\n",
    "LOCAL_DATA_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..', 'data'))\n",
    "os.makedirs(LOCAL_DATA_ROOT, exist_ok=True)\n",
    "print(f\"Root Data Lokal: {LOCAL_DATA_ROOT}\")\n",
    "\n",
    "# 2. Instalasi Dependensi (Jika belum ada di Image Vertex AI)\n",
    "# tf-nightly kadang diperlukan jika tensorflow_io bermasalah versi, tapi kita coba standar dulu\n",
    "!pip install tensorflow_io keras-flops gdown -q\n",
    "\n",
    "# Load TensorBoard Extension\n",
    "%load_ext tensorboard"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {
    "id": "import_modules"
   },
   "outputs": [],
   "source": [
    "# 3. Import Modul Lokal (Dari folder backend/src)\n",
    "import importlib\n",
    "import tensorflow as tf\n",
    "\n",
    "# Coba import modul dari src\n",
    "try:\n",
    "    from src import config\n",
    "    from src import data_loader\n",
    "    from src import models\n",
    "    from src import trainer\n",
    "    from src import preprocessing\n",
    "    print(\"✅ Berhasil mengimport modul 'src'.\")\n",
    "except ImportError as e:\n",
    "    print(f\"❌ Gagal mengimport modul 'src': {e}\")\n",
    "    print(\"Pastikan Anda menjalankan notebook ini dari folder yang benar atau path sudah sesuai.\")\n",
    "\n",
    "# Overwrite Konfigurasi Path untuk Output (Simpan di backend/outputs)\n",
    "config.MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')\n",
    "config.OUTPUTS_DIR = os.path.join(PROJECT_ROOT, 'outputs')\n",
    "\n",
    "# Force Reload modul (berguna jika Anda mengedit kode src sambil debugging)\n",
    "importlib.reload(config)\n",
    "importlib.reload(preprocessing)\n",
    "importlib.reload(data_loader)\n",
    "importlib.reload(models)\n",
    "importlib.reload(trainer)\n",
    "\n",
    "print(\"Modul berhasil direload.\")\n",
    "print(f\"GPU Tersedia: {len(tf.config.list_physical_devices('GPU')) > 0}\")\n",
    "if len(tf.config.list_physical_devices('GPU')) > 0:\n",
    "    print(f\"Nama GPU: {tf.config.list_physical_devices('GPU')[0].name}\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {
    "id": "data_prep"
   },
   "outputs": [],
   "source": [
    "# 4. Persiapan Data (Download ke Disk Lokal VM)\n",
    "import subprocess\n",
    "import gdown\n",
    "\n",
    "# File IDs (Sama seperti referensi Paper 2)\n",
    "UASPEECH_ID = '1L17F0SAkRk3rEjHDUyToLUvNp99sNMvE'\n",
    "TORGO_ID = '1YU7aCqa4qyn75XRdFPAWEqVv_1Qpl9cG'\n",
    "\n",
    "def setup_dataset(name, file_id, extract_path):\n",
    "    print(f\"\\n--- Setup Dataset: {name} ---\")\n",
    "\n",
    "    # Cek folder spesifik hasil ekstrak\n",
    "    if name == 'UASpeech':\n",
    "        target_path = os.path.join(extract_path, 'UASpeech')\n",
    "    elif name == 'TORGO':\n",
    "        target_path = os.path.join(extract_path, 'TORGO_smalldataset') # Mengikuti nam folder Paper 2\n",
    "\n",
    "    if os.path.exists(target_path):\n",
    "        print(f\"✅ Dataset {name} sudah ada di {target_path}\")\n",
    "        return target_path\n",
    "\n",
    "    # Download jika belum ada\n",
    "    zip_path = os.path.join(extract_path, f\"{name}.zip\")\n",
    "    if not os.path.exists(zip_path):\n",
    "        print(f\"Sedang mendownload {name}...\")\n",
    "        url = f'https://drive.google.com/uc?id={file_id}'\n",
    "        gdown.download(url, zip_path, quiet=False)\n",
    "\n",
    "    # Unzip\n",
    "    print(f\"Mengekstrak {name}...\")\n",
    "    subprocess.check_call(['unzip', '-o', '-q', zip_path, '-d', extract_path])\n",
    "    print(f\"✅ {name} Siap digunakan.\")\n",
    "\n",
    "    # Verifikasi ulang path (khusus TORGO kadang nama foldernya beda)\n",
    "    if name == 'TORGO' and not os.path.exists(target_path):\n",
    "         alt = os.path.join(extract_path, 'TORGO')\n",
    "         if os.path.exists(alt): return alt\n",
    "\n",
    "    return target_path\n",
    "\n",
    "# Jalankan Setup\n",
    "uaspeech_path = setup_dataset('UASpeech', UASPEECH_ID, LOCAL_DATA_ROOT)\n",
    "torgo_path = setup_dataset('TORGO', TORGO_ID, LOCAL_DATA_ROOT)\n",
    "\n",
    "# ---------------------------------------------------------\n",
    "# LOADING DATA\n",
    "# ---------------------------------------------------------\n",
    "print(\"\\nMemuat Path File dari Disk Lokal...\")\n",
    "\n",
    "# Load Path File Audio\n",
    "uaspeech_files, uaspeech_labels = data_loader.get_file_paths(uaspeech_path, 'UASpeech')\n",
    "torgo_files, torgo_labels = data_loader.get_file_paths(torgo_path, 'TORGO')\n",
    "\n",
    "print(\"Path dataset berhasil dimuat. Siap untuk diproses secara terpisah.\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {
    "id": "training_loop"
   },
   "outputs": [],
   "source": [
    "# 5. Loop Pelatihan Multi-Model (Terpisah per Dataset)\n",
    "# Sesuai Metodologi Paper 2: Model dilatih spesifik untuk tiap dataset\n",
    "\n",
    "from sklearn.model_selection import train_test_split\n",
    "\n",
    "print(f\"Model yang akan dilatih: {list(config.MODELS.keys())}\")\n",
    "\n",
    "datasets = {\n",
    "    'UASpeech': (uaspeech_files, uaspeech_labels),\n",
    "    'TORGO': (torgo_files, torgo_labels)\n",
    "}\n",
    "\n",
    "for dataset_name, (data_files, data_labels) in datasets.items():\n",
    "    print(f\"\\n{'#'*60}\")\n",
    "    print(f\"MEMPROSES DATASET: {dataset_name}\")\n",
    "    print(f\"Total Sampel: {len(data_files)}\")\n",
    "    print(f\"{'#'*60}\\n\")\n",
    "    \n",
    "    if len(data_files) == 0:\n",
    "        print(f\"Melewati {dataset_name} (Data tidak ditemukan).\")\n",
    "        continue\n",
    "\n",
    "    # Mapping Kelas\n",
    "    unique_classes = sorted(list(set(data_labels)))\n",
    "    class_mapping = {label: idx for idx, label in enumerate(unique_classes)}\n",
    "    print(f\"Kelas Ditemukan: {unique_classes}\")\n",
    "\n",
    "    # Split Data\n",
    "    # Stratified Split: 80% Train, 10% Val, 10% Test\n",
    "    if len(data_files) > 10:\n",
    "        X_train, X_test, y_train, y_test = train_test_split(data_files, data_labels, test_size=0.2, random_state=42, stratify=data_labels)\n",
    "        X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.1, random_state=42, stratify=y_train)\n",
    "        print(f\"Pembagian Data -> Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}\")\n",
    "    else:\n",
    "        print(\"Data tidak cukup untuk melakukan split.\")\n",
    "        continue\n",
    "\n",
    "    for model_key, model_display_name in config.MODELS.items():\n",
    "        print(f\"\\n{'='*50}\")\n",
    "        print(f\"[{dataset_name}] Memulai Pipeline untuk: {model_display_name}\")\n",
    "        print(f\"{'='*50}\")\n",
    "\n",
    "        try:\n",
    "            # 1. Tentukan Tipe Fitur\n",
    "            # CNN-STFT menggunakan Spectrogram log-scaled\n",
    "            # Model Transfer Learning menggunakan MFCC\n",
    "            feature_type = 'stft' if model_key == 'cnn_stft' else 'mfcc'\n",
    "            print(f\"-> Menggunakan Tipe Fitur: {feature_type.upper()}\")\n",
    "\n",
    "            # 2. Buat tf.data.Dataset (Efisien Pipeline)\n",
    "            train_ds = data_loader.create_tf_dataset(X_train, y_train, class_mapping, is_training=True, feature_type=feature_type)\n",
    "            val_ds = data_loader.create_tf_dataset(X_val, y_val, class_mapping, is_training=False, feature_type=feature_type)\n",
    "            test_ds = data_loader.create_tf_dataset(X_test, y_test, class_mapping, is_training=False, feature_type=feature_type)\n",
    "\n",
    "            # 3. Deteksi Bentuk Input Otomatis\n",
    "            # Penting: Ini memverifikasi apakah durasi 3.5s (padding) sudah benar diterapkan\n",
    "            input_shape = None\n",
    "            for feature, label in train_ds.take(1):\n",
    "                input_shape = feature.shape[1:]\n",
    "                print(f\"-> Deteksi Input Shape: {input_shape}\")\n",
    "                break\n",
    "            \n",
    "            if input_shape is None:\n",
    "                print(\"Gagal mendeteksi input shape. Melewati model ini.\")\n",
    "                continue\n",
    "\n",
    "            # 4. Bangun Model\n",
    "            tf.keras.backend.clear_session()\n",
    "            model = models.get_model(model_key, input_shape, num_classes=len(unique_classes))\n",
    "\n",
    "            # 5. Training\n",
    "            # Nama spesifik untuk run ini (kombinasi model + dataset)\n",
    "            run_name = f\"{model_key}_{dataset_name}\"\n",
    "            \n",
    "            # Pastikan direktori output ada\n",
    "            os.makedirs(config.MODELS_DIR, exist_ok=True)\n",
    "            os.makedirs(config.OUTPUTS_DIR, exist_ok=True)\n",
    "\n",
    "            history, time_taken = trainer.train_model(model, train_ds, val_ds, model_name=run_name)\n",
    "            print(f\"-> Training Selesai dalam {time_taken:.2f} detik\")\n",
    "\n",
    "            # 6. Evaluasi & Simpan Hasil\n",
    "            results = trainer.evaluate_model(model, test_ds, unique_classes, model_name=run_name)\n",
    "\n",
    "            print(f\"✅ Selesai: {model_display_name} pada dataset {dataset_name}\")\n",
    "        except Exception as e:\n",
    "            print(f\"❌ Error saat melatih {model_display_name} pada {dataset_name}: {e}\")\n"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {
    "id": "tensorboard_viz"
   },
   "outputs": [],
   "source": [
    "# 6. Visualisasi TensorBoard\n",
    "logs_base_dir = os.path.join(config.OUTPUTS_DIR, 'logs')\n",
    "print(f\"Meluncurkan TensorBoard dari: {logs_base_dir}\")\n",
    "\n",
    "# Load TensorBoard di dalam Notebook\n",
    "%tensorboard --logdir \"{logs_base_dir}\""
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {
    "id": "final_check"
   },
   "outputs": [],
   "source": [
    "# 7. Cek Output Final\n",
    "!ls -lh \"{config.OUTPUTS_DIR}\"\n",
    "print(\"Semua model telah dilatih. Hasil (Model & Log) tersimpan di folder 'backend/outputs'.\")\n",
    "print(\"Silakan download folder 'outputs' ini jika Anda ingin menyimpannya ke komputer lokal.\")"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "codemirror_mode": {
    "name": "ipython",
    "version": 3
   },
   "file_extension": ".py",
   "mimetype": "text/x-python",
   "name": "python",
   "nbconvert_exporter": "python",
   "pygments_lexer": "ipython3",
   "version": "3.8.5"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 4
}

# Write to file
with open(target_file, 'w', encoding='utf-8') as f:
    json.dump(notebook_content, f, indent=1)

print(f"Notebook created at: {target_file}")
