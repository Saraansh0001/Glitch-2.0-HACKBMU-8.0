# SatyaNetra - AI Deepfake Detection Web App

SatyaNetra is an AI-powered deepfake detection platform inspired by the Veriface SIH 2024 concept (Problem ID: SIH1683, Team ID: 25942). It combines visual, temporal, audio, and lip-sync signals to estimate whether an uploaded video is likely manipulated.

## Project Overview

- Multi-modal detection pipeline:
	- Visual feature extraction using ResNet50
	- Temporal classification using LSTM
	- Audio anomaly analysis using YAMNet
	- Lip-sync consistency heuristic using OpenCV
- Interactive web application:
	- React + Vite frontend with animated, glassmorphism-inspired UI
	- Flask backend with report generation and AI chatbot endpoint
- Production-oriented workflow:
	- Uses trained models for real inference only
	- Includes development and production startup scripts

## Prerequisites Checklist

- Windows 10/11, Linux, or macOS
- Python 3.10 or 3.11 (recommended for TensorFlow 2.15)
- Node.js >= 18
- npm >= 9
- Git LFS
- ffmpeg installed
- git installed
- At least 8GB RAM (16GB recommended)
- At least 10GB free disk

## Installation

### 1. Clone and enter project

```bash
git clone <your-repo-url>
cd satyanetra

# Required once per machine for model artifacts
git lfs install
git lfs pull
```

Notes:

- `backend/temp_uploads/` is runtime-only and is kept empty in git except for a `.gitkeep` placeholder.
- `backend/trained_models/lstm_deepfake_detector.keras` is included for inference.
- If detection reports model not loaded after clone, run `git lfs pull` again.

### 2. Backend setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

## Running (Development)

### Start backend

```bash
# Windows
start_backend.bat

# Windows (force GPU profile)
start_backend_gpu.bat

# macOS/Linux
./start_backend.sh
```

### Start frontend

```bash
# Windows
start_frontend.bat

# macOS/Linux
./start_frontend.sh
```

Then open:

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/api/health

## Running (Production-style)

Use a single script that builds the frontend and serves both UI + API from one host.

### Start full app (single localhost)

```bash
# Windows
start_backend_prod.bat

# Windows (from workspace root)
start_satyanetra_prod.bat

# macOS/Linux
./start_backend_prod.sh
```

Then open:

- Frontend + API host: http://localhost:5050
- Backend health: http://localhost:5050/api/health

## GPU Acceleration on Windows

This project now includes a Windows GPU runtime profile using TensorFlow DirectML.

- GPU profile requirements file: `backend/requirements-gpu-directml.txt`
- GPU environment: `backend/venv_dml`
- GPU startup script: `start_backend_gpu.bat`

What happens in GPU mode:

- TensorFlow uses DirectML and should expose GPU devices in backend logs.
- `/api/health` includes `gpu_available` and `inference_batch_size`.

If you want automatic GPU preference, use `start_backend.bat` after `venv_dml` exists; it now prefers GPU profile first.

## Running with Real Models

### 1. Download FaceForensics++

Official repository:

- https://github.com/ondyari/FaceForensics

Example command from the official workflow:

```bash
python download-FaceForensics.py --output_path ./datasets/FaceForensics++ --compression c23
```

Expected training structure:

```text
datasets/FaceForensics++/
	real/*.mp4
	fake/*.mp4
```

### 2. Train model

```bash
cd model_training
python train_resnet_lstm.py
```

Artifacts:

- `backend/trained_models/lstm_deepfake_detector.keras`
- `model_training/training_curves.png`

Restart backend/frontend after training to load the model artifact.

## API Documentation

### GET /api/health

Response:

```json
{
	"status": "ok",
	"model_loaded": true,
	"gpu_available": true,
	"inference_batch_size": 8,
	"frontend_origins": ["http://localhost:5050"]
}
```

### POST /api/detect

Request:

- Content-Type: multipart/form-data
- Field: `video` (mp4/avi/mov/mkv/webm)

Response:

```json
{
	"verdict": "DEEPFAKE",
	"confidence": 0.87,
	"visual_score": 0.9,
	"audio_score": 0.7,
	"lip_sync_score": 0.8,
	"inconsistent_timestamps": [1.2, 3.5],
	"video_metadata": {
		"fps": 30,
		"duration": 8.2,
		"width": 1280,
		"height": 720,
		"total_frames": 246
	},
	"analysis_time_seconds": 12.4
}
```

### POST /api/chat

Request:

```json
{
	"message": "What is a deepfake?",
	"history": []
}
```

Response:

```json
{
	"response": "A deepfake is ...",
	"sources": [],
	"mode": "offline"
}
```

### POST /api/report

Request:

- JSON body containing analysis result fields

Response:

- PDF attachment (`application/pdf`)

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React, Vite, Tailwind CSS, Framer Motion, Recharts |
| Backend | Flask, Flask-CORS, ReportLab |
| ML | TensorFlow, ResNet50, LSTM, YAMNet |
| Video/Audio | OpenCV, MoviePy, ffmpeg |

## Troubleshooting

1. TensorFlow install issues on Windows:
	 - Ensure Python 3.10 or 3.11 is used for backend venv.
2. `ffmpeg` not found:
	 - Install via winget/choco and reopen terminal.
3. `/api/detect` returns validation error:
	 - Check file extension and file signature.
4. Frontend cannot connect to backend:
	 - Confirm `VITE_API_URL` points to `http://localhost:5000/api`.
5. Chatbot always offline:
	 - Set valid `GEMINI_API_KEY` in `backend/.env`.

## Team Attribution

- Team: Veriface
- Event: Smart India Hackathon 2024
- Theme context: Responsible AI media verification

