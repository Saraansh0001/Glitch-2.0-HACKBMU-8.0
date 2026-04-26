import os

from dotenv import load_dotenv

load_dotenv()


class Config:
	SECRET_KEY = os.getenv("SECRET_KEY", "satyanetra-secret-2024")
	MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB
	UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "temp_uploads"))
	MODEL_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "trained_models"))
	ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm"}
	GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
	GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
	FRAME_SAMPLE_RATE = 10
	SEQUENCE_LENGTH = 20
	IMG_SIZE = (224, 224)
	FEATURE_DIM = 2048
	FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
