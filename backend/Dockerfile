# Menggunakan Image Python yang Ringan
FROM python:3.9-slim

# Set Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set Direktori Kerja
WORKDIR /app

# Install System Dependencies (Libsndfile diperlukan untuk pemrosesan audio jika library tertentu membutuhkannya)
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy Requirements dan Install Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Seluruh Source Code Backend
COPY . .

# Expose Port 8080 (Cloud Run Default)
EXPOSE 8080

# Command untuk menjalankan aplikasi
# Cloud Run akan menginject variable PORT, jadi kita bind ke 0.0.0.0:$PORT
CMD ["sh", "-c", "uvicorn app_api:app --host 0.0.0.0 --port ${PORT:-8080}"]
