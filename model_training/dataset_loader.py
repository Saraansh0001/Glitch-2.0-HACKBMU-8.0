import os
from pathlib import Path
import logging

import cv2
import numpy as np
import tensorflow as tf

try:
	cv2.setNumThreads(1)
	cv2.ocl.setUseOpenCL(False)
except Exception:
	pass


VIDEO_PATTERNS = ("*.mp4", "*.avi", "*.mov", "*.mkv", "*.webm")

# Binary labels: all known manipulation families map to fake (1).
CLASS_LABEL_MAP = {
	"real": 0,
	"original": 0,
	"youtube": 0,
	"actors": 0,
	"fake": 1,
	"deepfakes": 1,
	"face2face": 1,
	"faceswap": 1,
	"neuraltextures": 1,
	"deepfakedetection": 1,
	"faceshifter": 1,
}


logger = logging.getLogger(__name__)


def _iter_videos_in_dir(base_dir: Path):
	for pattern in VIDEO_PATTERNS:
		yield from base_dir.rglob(pattern)


def _collect_samples_from_dir(directory: Path, label: int, seen: set[str], samples: list[tuple[str, int]]) -> None:
	if not directory.exists() or not directory.is_dir():
		return
	for path in _iter_videos_in_dir(directory):
		resolved = str(path.resolve())
		if resolved in seen:
			continue
		seen.add(resolved)
		samples.append((str(path), label))


def list_video_samples(dataset_root: str) -> list[tuple[str, int]]:
	root = Path(dataset_root)
	if not root.exists():
		return []

	samples: list[tuple[str, int]] = []
	seen_paths: set[str] = set()

	# 1) Existing simple layout support: datasets/FaceForensics++/{real,fake}
	for label_name, label_value in [("real", 0), ("fake", 1)]:
		_collect_samples_from_dir(root / label_name, label_value, seen_paths, samples)

	# 2) Balanced subset extraction layout: datasets/FaceForensics++/videos/<ClassName>
	videos_root = root / "videos"
	if videos_root.exists():
		for child in videos_root.iterdir():
			if not child.is_dir():
				continue
			label = CLASS_LABEL_MAP.get(child.name.lower())
			if label is None:
				continue
			_collect_samples_from_dir(child, label, seen_paths, samples)

	# 3) Direct class-at-root layout: datasets/FaceForensics++/<ClassName>
	for child in root.iterdir():
		if not child.is_dir():
			continue
		label = CLASS_LABEL_MAP.get(child.name.lower())
		if label is None:
			continue
		_collect_samples_from_dir(child, label, seen_paths, samples)

	# 4) Official FaceForensics++ nested layout support.
	for compression in ("c23", "c40", "raw", "c0"):
		_collect_samples_from_dir(root / "original_sequences" / "youtube" / compression / "videos", 0, seen_paths, samples)
		_collect_samples_from_dir(root / "original_sequences" / "actors" / compression / "videos", 0, seen_paths, samples)

		for method in ("Deepfakes", "Face2Face", "FaceSwap", "NeuralTextures", "DeepFakeDetection", "FaceShifter"):
			_collect_samples_from_dir(
				root / "manipulated_sequences" / method / compression / "videos",
				1,
				seen_paths,
				samples,
			)

	return samples


def extract_frame_sequence(
	video_path: str,
	sequence_length: int = 20,
	img_size: tuple[int, int] = (224, 224),
	sample_rate: int = 5,
) -> np.ndarray | None:
	capture = cv2.VideoCapture(video_path)
	if not capture.isOpened():
		return None

	frames = []
	frame_index = 0
	try:
		while True:
			success, frame = capture.read()
			if not success:
				break
			if frame_index % max(1, sample_rate) == 0:
				resized = cv2.resize(frame, img_size)
				rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
				frames.append(rgb.astype(np.float32) / 255.0)
				if len(frames) >= sequence_length:
					break
			frame_index += 1
	except Exception:
		logger.exception("Frame extraction failed for %s", video_path)
		return None
	finally:
		capture.release()

	if not frames:
		return None

	while len(frames) < sequence_length:
		frames.append(frames[-1].copy())

	return np.asarray(frames[:sequence_length], dtype=np.float32)


def augment_frames(frames: np.ndarray) -> np.ndarray:
	augmented = tf.convert_to_tensor(frames, dtype=tf.float32)
	augmented = tf.image.random_flip_left_right(augmented)
	augmented = tf.image.random_brightness(augmented, max_delta=0.15)
	augmented = tf.image.random_contrast(augmented, lower=0.85, upper=1.15)
	return tf.clip_by_value(augmented, 0.0, 1.0).numpy()


def create_feature_dataset(
	samples: list[tuple[str, int]],
	resnet_extractor,
	sequence_length: int,
	feature_dim: int,
	batch_size: int,
	augment: bool,
	extract_batch_size: int = 4,
):
	def generator():
		for video_path, label in samples:
			try:
				frames = extract_frame_sequence(video_path, sequence_length=sequence_length)
				if frames is None:
					continue
				if augment:
					frames = augment_frames(frames)
				features = resnet_extractor.extract(frames, batch_size=max(1, extract_batch_size))
				if features.shape != (sequence_length, feature_dim):
					continue
				yield features.astype(np.float32), np.float32(label)
			except Exception:
				logger.exception("Skipping sample due to pipeline error: %s", video_path)
				continue

	output_signature = (
		tf.TensorSpec(shape=(sequence_length, feature_dim), dtype=tf.float32),
		tf.TensorSpec(shape=(), dtype=tf.float32),
	)

	dataset = tf.data.Dataset.from_generator(generator, output_signature=output_signature)
	return dataset.batch(batch_size).prefetch(1)

