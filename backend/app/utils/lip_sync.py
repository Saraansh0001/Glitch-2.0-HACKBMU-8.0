import logging

try:
	import cv2
except ImportError:  # pragma: no cover
	cv2 = None

try:
	import numpy as np
except ImportError:  # pragma: no cover
	np = None


logger = logging.getLogger(__name__)


def _get_face_cascade():
	if cv2 is None:
		return None
	try:
		return cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
	except Exception:
		logger.exception("Failed to load Haar cascade")
		return None


def detect_lip_sync_inconsistency(frames: list) -> dict:
	fallback = {"lip_sync_score": 0.5, "inconsistent_timestamps": [], "details": "Fallback score used."}
	if cv2 is None or np is None:
		return fallback
	if not frames:
		return fallback

	face_cascade = _get_face_cascade()
	if face_cascade is None:
		return fallback

	motion_values = []
	timestamps = []
	previous_mouth = None

	for index, frame in enumerate(frames):
		try:
			frame_uint8 = np.clip(frame * 255.0, 0, 255).astype(np.uint8)
			gray = cv2.cvtColor(frame_uint8, cv2.COLOR_RGB2GRAY)
			faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
			if len(faces) == 0:
				continue

			x, y, w, h = faces[0]
			mouth_y_start = y + int(h * 0.60)
			mouth_y_end = y + h
			mouth_x_start = x + int(w * 0.20)
			mouth_x_end = x + int(w * 0.80)
			mouth_region = gray[mouth_y_start:mouth_y_end, mouth_x_start:mouth_x_end]
			if mouth_region.size == 0:
				continue

			mouth_region = cv2.resize(mouth_region, (64, 32))
			if previous_mouth is not None:
				diff = cv2.absdiff(mouth_region, previous_mouth)
				motion = float(np.mean(diff) / 255.0)
				motion_values.append(motion)
				timestamps.append(round(index * 0.1, 2))
			previous_mouth = mouth_region
		except Exception:
			logger.exception("Lip-sync frame processing failed at frame index %s", index)

	if len(motion_values) < 3:
		return fallback

	motion_array = np.asarray(motion_values, dtype=np.float32)
	variance = float(np.var(motion_array))
	inconsistency = float(max(0.0, min(1.0, variance * 30.0 + float(np.mean(motion_array)) * 0.5)))

	threshold = float(np.mean(motion_array) + np.std(motion_array))
	inconsistent_timestamps = [
		timestamps[idx]
		for idx, value in enumerate(motion_array)
		if float(value) > threshold
	]

	return {
		"lip_sync_score": inconsistency,
		"inconsistent_timestamps": inconsistent_timestamps,
		"details": "Computed from mouth-motion variance across detected face frames.",
	}

