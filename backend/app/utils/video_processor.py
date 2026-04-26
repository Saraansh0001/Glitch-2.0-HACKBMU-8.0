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


def extract_frames(video_path: str, sample_rate: int, img_size: tuple[int, int]) -> list:
	if cv2 is None or np is None:
		logger.error("OpenCV/Numpy imports unavailable.")
		return []

	capture = None
	frames = []
	try:
		capture = cv2.VideoCapture(video_path)
		if not capture.isOpened():
			logger.error("Unable to open video file: %s", video_path)
			return []

		frame_index = 0
		while True:
			success, frame = capture.read()
			if not success:
				break

			if frame_index % max(1, sample_rate) == 0:
				resized = cv2.resize(frame, img_size)
				rgb_frame = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
				normalized = rgb_frame.astype(np.float32) / 255.0
				frames.append(normalized)
			frame_index += 1
	except Exception:
		logger.exception("Failed to extract frames from %s", video_path)
		return []
	finally:
		if capture is not None:
			capture.release()

	return frames


def prepare_sequences(frame_features, sequence_length: int, feature_dim: int):
	if np is None:
		raise RuntimeError("Numpy is unavailable.")

	arr = np.asarray(frame_features, dtype=np.float32)
	if arr.ndim != 2:
		logger.error("Feature array shape mismatch. Expected 2D, got %s", arr.shape)
		return np.empty((0, sequence_length, feature_dim), dtype=np.float32)

	if arr.shape[1] != feature_dim:
		logger.error("Feature dim mismatch. Expected %s, got %s", feature_dim, arr.shape[1])
		return np.empty((0, sequence_length, feature_dim), dtype=np.float32)

	if arr.shape[0] == 0:
		return np.empty((0, sequence_length, feature_dim), dtype=np.float32)

	if arr.shape[0] < sequence_length:
		pad_count = sequence_length - arr.shape[0]
		pad_block = np.repeat(arr[-1:, :], repeats=pad_count, axis=0)
		padded = np.vstack([arr, pad_block])
		return np.expand_dims(padded, axis=0).astype(np.float32)

	sequences = []
	for index in range(arr.shape[0] - sequence_length + 1):
		sequences.append(arr[index : index + sequence_length])

	return np.asarray(sequences, dtype=np.float32)


def get_video_metadata(video_path: str) -> dict:
	if cv2 is None:
		return {"fps": 0.0, "duration": 0.0, "width": 0, "height": 0, "total_frames": 0}

	capture = None
	try:
		capture = cv2.VideoCapture(video_path)
		if not capture.isOpened():
			return {"fps": 0.0, "duration": 0.0, "width": 0, "height": 0, "total_frames": 0}

		fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
		total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
		width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
		height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
		duration = float(total_frames / fps) if fps > 0 else 0.0
		return {
			"fps": round(fps, 3),
			"duration": round(duration, 3),
			"width": width,
			"height": height,
			"total_frames": total_frames,
		}
	except Exception:
		logger.exception("Failed to read video metadata: %s", video_path)
		return {"fps": 0.0, "duration": 0.0, "width": 0, "height": 0, "total_frames": 0}
	finally:
		if capture is not None:
			capture.release()

