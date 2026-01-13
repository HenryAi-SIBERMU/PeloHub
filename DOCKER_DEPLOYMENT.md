# Docker Deployment Guide

## 🐳 Local Development

### Prerequisites
- Docker Desktop installed
- Docker Compose installed

### Quick Start

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🚀 Production Deployment (Google Cloud Run)

### 1. Build Images

```bash
# Backend
cd backend
docker build -t gcr.io/YOUR_PROJECT_ID/dysarthria-backend:latest .

# Frontend
cd ../frontend
docker build -t gcr.io/YOUR_PROJECT_ID/dysarthria-frontend:latest .
```

### 2. Push to Google Container Registry

```bash
# Authenticate
gcloud auth configure-docker

# Push backend
docker push gcr.io/YOUR_PROJECT_ID/dysarthria-backend:latest

# Push frontend
docker push gcr.io/YOUR_PROJECT_ID/dysarthria-frontend:latest
```

### 3. Deploy to Cloud Run

```bash
# Deploy backend
gcloud run deploy dysarthria-backend \
  --image gcr.io/YOUR_PROJECT_ID/dysarthria-backend:latest \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10

# Deploy frontend
gcloud run deploy dysarthria-frontend \
  --image gcr.io/YOUR_PROJECT_ID/dysarthria-frontend:latest \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

### 4. Configure Environment Variables

```bash
# Set backend URL for frontend
gcloud run services update dysarthria-frontend \
  --set-env-vars VITE_API_URL=https://YOUR_BACKEND_URL
```

---

## 🔍 Verification

### Health Checks

```bash
# Backend health
curl http://localhost:8000/status

# Frontend health
curl http://localhost:3000/health
```

### Image Size Check

```bash
# List images
docker images | grep dysarthria

# Expected sizes:
# Backend: < 500MB
# Frontend: < 100MB
```

### Test API Integration

```bash
# From frontend container
docker exec dysarthria-frontend wget -O- http://backend:8000/status
```

---

## 🛠️ Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild without cache
docker-compose build --no-cache
```

### Port conflicts
```bash
# Change ports in docker-compose.yml
# Backend: "8001:8000"
# Frontend: "3001:80"
```

### Permission issues
```bash
# Fix volume permissions
sudo chown -R $USER:$USER ./backend/outputs
```

---

## 📝 Notes

- **Development**: Use `docker-compose` for local testing
- **Production**: Use individual `docker build` + Cloud Run
- **Models**: Ensure `.h5` files are in `backend/models/` before building
- **Outputs**: Mount volumes in development, use GCS in production
