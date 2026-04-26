import logging
import os
from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from app.config import Config
from app.routes import chatbot_bp, detection_bp, report_bp
from app.routes.detection import initialize_detection_models, model_status
from app.utils.helpers import ensure_directories, error_payload


FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

_NON_ACTIONABLE_TF_WARNINGS = (
	"will not use cuDNN kernels since it doesn't meet the criteria",
	"will use a generic GPU kernel as fallback when running on GPU.",
)


class _TensorFlowWarningFilter(logging.Filter):
	def filter(self, record: logging.LogRecord) -> bool:
		message = record.getMessage()
		return not any(fragment in message for fragment in _NON_ACTIONABLE_TF_WARNINGS)


def _configure_runtime(app: Flask) -> None:
	try:
		import tensorflow as tf

		tf.get_logger().addFilter(_TensorFlowWarningFilter())

		gpu_devices = tf.config.list_physical_devices("GPU")
		app.config["GPU_AVAILABLE"] = bool(gpu_devices)
		if gpu_devices:
			for gpu in gpu_devices:
				try:
					tf.config.experimental.set_memory_growth(gpu, True)
				except Exception:
					app.logger.warning("Could not enable memory growth on %s", gpu)
			app.config["INFERENCE_BATCH_SIZE"] = 8
			app.logger.info("GPU devices detected: %s", gpu_devices)
		else:
			app.config["INFERENCE_BATCH_SIZE"] = 4
			app.logger.warning("No TensorFlow GPU detected. Running CPU-safe inference mode.")
	except ImportError:
		app.config["INFERENCE_BATCH_SIZE"] = 4
		app.config["GPU_AVAILABLE"] = False
		app.logger.warning("TensorFlow not importable; defaulting to CPU-safe inference mode.")


def create_app() -> Flask:
	app = Flask(__name__, static_folder=str(FRONTEND_DIST), static_url_path="")
	app.config.from_object(Config)

	logging.basicConfig(
		level=logging.INFO,
		format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
	)

	ensure_directories([app.config["UPLOAD_FOLDER"], app.config["MODEL_FOLDER"]])
	_configure_runtime(app)
	origins = [origin.strip() for origin in str(app.config["FRONTEND_ORIGIN"]).split(",") if origin.strip()]

	CORS(app, resources={r"/api/*": {"origins": origins or ["http://localhost:5173"]}})

	app.register_blueprint(detection_bp, url_prefix="/api")
	app.register_blueprint(report_bp, url_prefix="/api")
	app.register_blueprint(chatbot_bp, url_prefix="/api")

	loaded = initialize_detection_models(
		model_folder=app.config["MODEL_FOLDER"],
		sequence_length=app.config["SEQUENCE_LENGTH"],
		feature_dim=app.config["FEATURE_DIM"],
	)
	app.config["MODEL_LOADED"] = loaded

	if not loaded:
		app.logger.warning("Model preload incomplete. Detection endpoint will reject requests until model is available.")

	@app.get("/api/health")
	def health():
		return jsonify(
			{
				"status": "ok",
				"model_loaded": bool(model_status()),
				"gpu_available": bool(app.config.get("GPU_AVAILABLE", False)),
				"inference_batch_size": int(app.config.get("INFERENCE_BATCH_SIZE", 4)),
				"frontend_origins": origins,
			}
		)

	@app.get("/")
	def frontend_index():
		index_path = FRONTEND_DIST / "index.html"
		if not index_path.exists():
			return jsonify(error_payload("Frontend build not found. Run production build first.")), 503
		return app.send_static_file("index.html")

	@app.get("/<path:path>")
	def frontend_assets(path: str):
		if path.startswith("api/"):
			return jsonify(error_payload("Route not found.")), 404

		asset_path = FRONTEND_DIST / path
		if asset_path.exists() and asset_path.is_file():
			return send_from_directory(str(FRONTEND_DIST), path)

		index_path = FRONTEND_DIST / "index.html"
		if index_path.exists():
			return app.send_static_file("index.html")
		return jsonify(error_payload("Frontend build not found. Run production build first.")), 503

	@app.errorhandler(400)
	def bad_request(error):
		return jsonify(error_payload("Bad request.", str(error))), 400

	@app.errorhandler(413)
	def request_too_large(error):
		return jsonify(error_payload("Uploaded file is too large (max 500MB).", str(error))), 413

	@app.errorhandler(500)
	def internal_error(error):
		return jsonify(error_payload("Internal server error.", str(error))), 500

	return app


app = create_app()


if __name__ == "__main__":
	env = os.getenv("FLASK_ENV", "production").lower()
	debug_mode = env == "development"
	port = int(os.getenv("PORT", "5000"))
	app.run(host="0.0.0.0", port=port, debug=debug_mode)

