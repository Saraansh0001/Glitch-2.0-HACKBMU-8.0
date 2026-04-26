import gc
import json
import logging
import os
import time
import uuid

import numpy as np
from flask import Blueprint, current_app, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

from app.models import LSTMDeepfakeDetector, ResNetFeatureExtractor, YAMNetAudioAnalyzer
from app.utils.audio_extractor import extract_audio
from app.utils.helpers import (
	allowed_file,
	clamp_score,
	error_payload,
	extension_from_filename,
)
from app.utils.lip_sync import detect_lip_sync_inconsistency
from app.utils.video_processor import extract_frames, get_video_metadata, prepare_sequences


logger = logging.getLogger(__name__)
detection_bp = Blueprint("detection", __name__)

_RESNET = None
_LSTM = None
_AUDIO_ANALYZER = None
_MODELS_READY = False
_DECISION_THRESHOLD = 0.5


def _is_git_lfs_pointer(file_path: str) -> bool:
	try:
		with open(file_path, "rb") as model_file:
			header = model_file.read(128)
		return header.startswith(b"version https://git-lfs.github.com/spec/v1")
	except OSError:
		logger.exception("Failed to inspect model file: %s", file_path)
		return False


def _load_decision_threshold(model_folder: str) -> float:
	threshold_path = os.path.join(model_folder, "decision_threshold.json")
	if not os.path.exists(threshold_path):
		return 0.5

	try:
		with open(threshold_path, "r", encoding="utf-8") as threshold_file:
			data = json.load(threshold_file)
		return float(data.get("threshold", 0.5))
	except Exception:
		logger.exception("Failed to load decision threshold; falling back to 0.5")
		return 0.5


def initialize_detection_models(model_folder: str, sequence_length: int, feature_dim: int) -> bool:
	global _RESNET, _LSTM, _AUDIO_ANALYZER, _MODELS_READY, _DECISION_THRESHOLD

	_MODELS_READY = False
	_DECISION_THRESHOLD = 0.5
	_AUDIO_ANALYZER = YAMNetAudioAnalyzer()

	try:
		_RESNET = ResNetFeatureExtractor()
		_RESNET.load()
	except Exception:
		logger.exception("Failed to load ResNet50 extractor")
		return False

	lstm_path_keras = os.path.join(model_folder, "lstm_deepfake_detector.keras")
	lstm_path_h5 = os.path.join(model_folder, "lstm_deepfake_detector.h5")

	_LSTM = LSTMDeepfakeDetector(sequence_length=sequence_length, feature_dim=feature_dim)
	if os.path.exists(lstm_path_keras):
		if _is_git_lfs_pointer(lstm_path_keras):
			logger.error(
				"Model file %s is a Git LFS pointer, not the actual model. Run `git lfs pull`.",
				lstm_path_keras,
			)
			return False
		try:
			_LSTM.load(lstm_path_keras)
		except Exception:
			logger.exception("Failed to load LSTM model from %s", lstm_path_keras)
			return False
		_DECISION_THRESHOLD = _load_decision_threshold(model_folder)
		_MODELS_READY = True
		return True
	if os.path.exists(lstm_path_h5):
		if _is_git_lfs_pointer(lstm_path_h5):
			logger.error(
				"Model file %s is a Git LFS pointer, not the actual model. Run `git lfs pull`.",
				lstm_path_h5,
			)
			return False
		try:
			_LSTM.load(lstm_path_h5)
		except Exception:
			logger.exception("Failed to load LSTM model from %s", lstm_path_h5)
			return False
		_DECISION_THRESHOLD = _load_decision_threshold(model_folder)
		_MODELS_READY = True
		return True

	logger.warning("No pre-trained LSTM model found in %s", model_folder)
	return False


def model_status() -> bool:
	return _MODELS_READY


def _extract_features_in_batches(frames: list, batch_size: int) -> np.ndarray:
	if _RESNET is None:
		raise RuntimeError("Visual feature extractor is not initialized.")
	resnet = _RESNET

	features = []
	for start in range(0, len(frames), batch_size):
		batch = np.asarray(frames[start : start + batch_size], dtype=np.float32)
		batch_features = resnet.extract(batch, batch_size=batch_size)
		features.append(batch_features)
	return np.vstack(features) if features else np.empty((0, 2048), dtype=np.float32)


@detection_bp.route("/detect", methods=["POST"])
def detect_video():
	start_time = time.time()
	temp_video_path = None
	temp_audio_path = None
	frames = None
	features = None
	sequences = None

	try:
		file_obj = request.files.get("video")
		if file_obj is None:
			return jsonify(error_payload("No video file provided.")), 400

		filename = secure_filename(file_obj.filename or "")
		if not allowed_file(filename, current_app.config["ALLOWED_EXTENSIONS"]):
			return jsonify(error_payload("Unsupported file type. Allowed: mp4, avi, mov, mkv, webm.")), 400

		content_length = request.content_length or 0
		if content_length > current_app.config["MAX_CONTENT_LENGTH"]:
			return jsonify(error_payload("File exceeds 500MB limit.")), 413

		ext = extension_from_filename(filename)
		unique_name = f"{uuid.uuid4().hex}.{ext}"
		temp_video_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
		file_obj.save(temp_video_path)

		metadata = get_video_metadata(temp_video_path)
		if metadata.get("total_frames", 0) <= 0:
			return jsonify(error_payload("Invalid or unreadable video file.")), 400

		if not model_status():
			return jsonify(error_payload("Detection models are not loaded.")), 503
		if _LSTM is None or _AUDIO_ANALYZER is None:
			return jsonify(error_payload("Detection models are not initialized.")), 503
		lstm_model = _LSTM
		audio_analyzer = _AUDIO_ANALYZER

		frames = extract_frames(
			temp_video_path,
			current_app.config["FRAME_SAMPLE_RATE"],
			current_app.config["IMG_SIZE"],
		)
		if len(frames) == 0:
			return jsonify(error_payload("No readable frames found in this video.")), 400

		batch_size = int(current_app.config.get("INFERENCE_BATCH_SIZE", 4))
		features = _extract_features_in_batches(frames, batch_size)
		sequences = prepare_sequences(
			features,
			current_app.config["SEQUENCE_LENGTH"],
			current_app.config["FEATURE_DIM"],
		)
		if sequences.shape[0] == 0:
			return jsonify(error_payload("Insufficient sequence data for temporal analysis.")), 400

		scores = [lstm_model.predict(np.expand_dims(seq, axis=0)) for seq in sequences]
		visual_score = float(np.mean(scores))

		temp_audio_path = os.path.join(current_app.config["UPLOAD_FOLDER"], f"{uuid.uuid4().hex}.wav")
		audio_file_path = extract_audio(temp_video_path, temp_audio_path)
		audio_result = audio_analyzer.analyze(audio_file_path) if audio_file_path else {
			"anomaly_score": 0.5,
			"anomaly_detected": False,
			"timestamps": [],
		}
		audio_score = float(audio_result.get("anomaly_score", 0.5))

		lip_result = detect_lip_sync_inconsistency(frames)
		lip_sync_score = float(lip_result.get("lip_sync_score", 0.5))
		timestamps = lip_result.get("inconsistent_timestamps", [])

		final_score = clamp_score(0.6 * visual_score + 0.25 * audio_score + 0.15 * lip_sync_score)
		decision_threshold = float(np.clip(_DECISION_THRESHOLD, 0.0, 1.0))
		verdict = "DEEPFAKE" if final_score > decision_threshold else "REAL"

		payload = {
			"verdict": verdict,
			"confidence": round(final_score, 4),
			"visual_score": round(clamp_score(visual_score), 4),
			"audio_score": round(clamp_score(audio_score), 4),
			"lip_sync_score": round(clamp_score(lip_sync_score), 4),
			"decision_threshold": round(decision_threshold, 4),
			"inconsistent_timestamps": timestamps,
			"video_metadata": metadata,
			"analysis_time_seconds": round(time.time() - start_time, 3),
		}
		return jsonify(payload), 200
	except ValueError as exc:
		return jsonify(error_payload("Invalid input.", str(exc))), 400
	except RequestEntityTooLarge as exc:
		return jsonify(error_payload("File exceeds 500MB limit.", str(exc))), 413
	except Exception as exc:
		logger.exception("Unhandled error in /detect")
		return jsonify(error_payload("Detection failed.", str(exc))), 500
	finally:
		for temp_path in [temp_video_path, temp_audio_path]:
			if temp_path and os.path.exists(temp_path):
				try:
					os.remove(temp_path)
				except OSError:
					logger.exception("Failed to delete temp file %s", temp_path)

		del frames, features, sequences
		gc.collect()

