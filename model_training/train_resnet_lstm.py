import os
import sys
import logging
import json
import gc
from collections import Counter
from pathlib import Path
import random
import re

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from tensorflow.keras import regularizers
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.layers import LSTM, BatchNormalization, Dense, Dropout
from tensorflow.keras.metrics import AUC, Precision, Recall
from tensorflow.keras.models import Sequential
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score, f1_score
from sklearn.model_selection import train_test_split

from dataset_loader import augment_frames, extract_frame_sequence, list_video_samples


_NON_ACTIONABLE_TF_WARNINGS = (
	"will not use cuDNN kernels since it doesn't meet the criteria",
	"will use a generic GPU kernel as fallback when running on GPU.",
)


class _TensorFlowWarningFilter(logging.Filter):
	def filter(self, record: logging.LogRecord) -> bool:
		message = record.getMessage()
		return not any(fragment in message for fragment in _NON_ACTIONABLE_TF_WARNINGS)


tf.get_logger().addFilter(_TensorFlowWarningFilter())


gpus = tf.config.list_physical_devices("GPU")
if gpus:
	try:
		tf.config.set_visible_devices(gpus[0], "GPU")
		gpus = [gpus[0]]
	except Exception:
		pass
	for gpu in gpus:
		tf.config.experimental.set_memory_growth(gpu, True)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
	sys.path.insert(0, str(BACKEND_ROOT))

MODEL_OUT = PROJECT_ROOT / "backend" / "trained_models" / "lstm_deepfake_detector.keras"
THRESHOLD_OUT = PROJECT_ROOT / "backend" / "trained_models" / "decision_threshold.json"
CURVE_OUT = PROJECT_ROOT / "model_training" / "training_curves.png"
DATASET_ROOT = Path(os.getenv("FACEFORENSICS_ROOT", PROJECT_ROOT / "datasets" / "FaceForensics++"))
SEQUENCE_LENGTH = 20
FEATURE_DIM = 2048
TRAIN_EPOCHS = int(os.getenv("TRAIN_EPOCHS", "20"))
FALLBACK_EPOCHS = int(os.getenv("FALLBACK_EPOCHS", "10"))
MAX_SAMPLES_PER_CLASS = int(os.getenv("MAX_SAMPLES_PER_CLASS", "0"))
SUBSET_SEED = int(os.getenv("SUBSET_SEED", "42"))
BALANCE_CLASSES = os.getenv("BALANCE_CLASSES", "true").lower() == "true"
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "4"))
FEATURE_EXTRACT_BATCH = int(os.getenv("FEATURE_EXTRACT_BATCH", "4"))
LEAKAGE_SAFE_SPLIT = os.getenv("LEAKAGE_SAFE_SPLIT", "true").lower() == "true"
TARGET_RECALL = float(os.getenv("TARGET_RECALL", "0.82"))
CALLBACK_MONITOR = os.getenv("CALLBACK_MONITOR", "val_pr_auc")
FRAME_SAMPLE_RATE = int(os.getenv("FRAME_SAMPLE_RATE", "3"))
EXTRACTOR_REFRESH_EVERY = int(os.getenv("EXTRACTOR_REFRESH_EVERY", "80"))


def _seed_everything(seed: int) -> None:
	random.seed(seed)
	np.random.seed(seed)
	tf.random.set_seed(seed)


def print_faceforensics_instructions() -> None:
	print("=" * 80)
	print("FaceForensics++ Dataset Instructions")
	print("Official repository: https://github.com/ondyari/FaceForensics")
	print("Example command:")
	print("python download-FaceForensics.py --output_path ./datasets/FaceForensics++ --compression c23")
	print("After download, organize videos under:")
	print("  datasets/FaceForensics++/real/*.mp4")
	print("  datasets/FaceForensics++/fake/*.mp4")
	print("=" * 80)


def build_lstm_model(sequence_length: int = 20, feature_dim: int = 2048):
	model = Sequential(
		[
			LSTM(
				224,
				return_sequences=True,
				recurrent_dropout=0.15,
				kernel_regularizer=regularizers.l2(1e-4),
				input_shape=(sequence_length, feature_dim),
			),
			Dropout(0.3),
			BatchNormalization(),
			LSTM(112, return_sequences=False, recurrent_dropout=0.15, kernel_regularizer=regularizers.l2(1e-4)),
			Dropout(0.3),
			Dense(128, activation="relu", kernel_regularizer=regularizers.l2(1e-4)),
			Dropout(0.25),
			Dense(1, activation="sigmoid"),
		]
	)
	model.compile(
		optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3, clipnorm=1.0),
		loss=tf.keras.losses.BinaryCrossentropy(label_smoothing=0.005),
		metrics=[
			"accuracy",
			AUC(name="auc"),
			AUC(name="pr_auc", curve="PR"),
			Precision(name="precision"),
			Recall(name="recall"),
		],
	)
	return model


def _plot_history(history, output_path: Path) -> None:
	output_path.parent.mkdir(parents=True, exist_ok=True)
	plt.figure(figsize=(10, 4))
	plt.subplot(1, 2, 1)
	plt.plot(history.history.get("loss", []), label="train_loss")
	plt.plot(history.history.get("val_loss", []), label="val_loss")
	plt.legend()
	plt.title("Loss")

	plt.subplot(1, 2, 2)
	plt.plot(history.history.get("accuracy", []), label="train_acc")
	plt.plot(history.history.get("val_accuracy", []), label="val_acc")
	plt.legend()
	plt.title("Accuracy")
	plt.tight_layout()
	plt.savefig(output_path)
	plt.close()


def _print_eval_metrics(y_true: np.ndarray, y_score: np.ndarray, threshold: float = 0.5) -> None:
	if y_true.size == 0:
		print("No evaluation samples available; metrics cannot be computed.")
		return

	y_pred = (y_score >= threshold).astype(int)
	acc = accuracy_score(y_true, y_pred)
	precision = precision_score(y_true, y_pred, zero_division=0)
	recall = recall_score(y_true, y_pred, zero_division=0)
	f1 = f1_score(y_true, y_pred, zero_division=0)
	print(f"Threshold: {threshold:.4f}")
	print(f"Accuracy: {acc:.4f}")
	if len(np.unique(y_true)) >= 2:
		auc = roc_auc_score(y_true, y_score)
		print(f"AUC: {auc:.4f}")
	else:
		print("AUC: n/a (single-class ground truth)")
	print(f"Precision: {precision:.4f}")
	print(f"Recall: {recall:.4f}")
	print(f"F1: {f1:.4f}")


def _select_best_threshold(y_true: np.ndarray, y_score: np.ndarray) -> float:
	if y_true.size == 0 or len(np.unique(y_true)) < 2:
		return 0.5

	target_recall = float(np.clip(TARGET_RECALL, 0.0, 1.0))
	best_threshold = None
	best_quality = -1.0
	best_f1_threshold = 0.5
	best_f1 = -1.0
	for threshold in np.linspace(0.15, 0.85, 141):
		y_pred = (y_score >= threshold).astype(int)
		precision = precision_score(y_true, y_pred, zero_division=0)
		recall = recall_score(y_true, y_pred, zero_division=0)
		f1 = f1_score(y_true, y_pred, zero_division=0)

		if recall >= target_recall:
			quality = 0.75 * precision + 0.25 * f1
			if quality > best_quality:
				best_quality = quality
				best_threshold = float(threshold)

		if f1 > best_f1:
			best_f1 = f1
			best_f1_threshold = float(threshold)

	if best_threshold is not None:
		return best_threshold

	return best_f1_threshold


def _scores_from_dataset(model: Sequential, dataset: tf.data.Dataset) -> tuple[np.ndarray, np.ndarray]:
	y_true: list[float] = []
	y_score: list[float] = []
	for batch_x, batch_y in dataset:
		pred = model.predict(batch_x, verbose="auto").ravel()
		batch_y_np = np.asarray(batch_y)
		y_true.extend(batch_y_np.tolist())
		y_score.extend(pred.tolist())

	return np.asarray(y_true, dtype=np.int32), np.asarray(y_score, dtype=np.float32)


def _save_decision_threshold(threshold: float, output_path: Path) -> None:
	output_path.parent.mkdir(parents=True, exist_ok=True)
	with output_path.open("w", encoding="utf-8") as f:
		json.dump({"threshold": float(threshold)}, f, indent=2)


def _print_sample_distribution(samples: list[tuple[str, int]], title: str) -> None:
	counter = Counter(label for _, label in samples)
	real_count = counter.get(0, 0)
	fake_count = counter.get(1, 0)
	print(f"{title}: total={len(samples)} real={real_count} fake={fake_count}")


def _cap_samples_per_class(samples: list[tuple[str, int]], max_per_class: int, seed: int) -> list[tuple[str, int]]:
	if max_per_class <= 0:
		return samples

	grouped: dict[int, list[tuple[str, int]]] = {0: [], 1: []}
	for item in samples:
		grouped[item[1]].append(item)

	rng = random.Random(seed)
	result: list[tuple[str, int]] = []
	for label in (0, 1):
		bucket = grouped.get(label, [])
		rng.shuffle(bucket)
		result.extend(bucket[:max_per_class])

	rng.shuffle(result)
	return result


def _extract_source_ids(video_path: str) -> list[str]:
	stem = Path(video_path).stem
	normalized = re.sub(r"[^0-9A-Za-z_]+", "_", stem)
	parts = [p for p in normalized.split("_") if p]
	numeric_ids = [p for p in parts if p.isdigit()]
	if numeric_ids:
		return sorted(set(numeric_ids[:2]))
	if parts:
		return [parts[0].lower()]
	return [stem.lower()]


def _group_samples_by_identity(samples: list[tuple[str, int]]) -> list[list[tuple[str, int]]]:
	grouped: dict[str, list[tuple[str, int]]] = {}
	for sample in samples:
		video_path, _ = sample
		ids = _extract_source_ids(video_path)
		# Use primary source id anchor to reduce train/val/test identity overlap
		# while keeping feasible class coverage for grouped splitting.
		anchor = ids[0]
		grouped.setdefault(anchor, []).append(sample)

	return list(grouped.values())


def _split_groups_with_targets(groups: list[list[tuple[str, int]]], total_counts: Counter[int], seed: int):
	rng = random.Random(seed)
	rng.shuffle(groups)
	groups = sorted(groups, key=len, reverse=True)

	target_ratios = {
		"train": 0.70,
		"val": 0.15,
		"test": 0.15,
	}
	targets = {
		split: {
			0: total_counts.get(0, 0) * ratio,
			1: total_counts.get(1, 0) * ratio,
			"total": sum(total_counts.values()) * ratio,
		}
		for split, ratio in target_ratios.items()
	}

	assigned_groups = {"train": [], "val": [], "test": []}
	current = {"train": Counter(), "val": Counter(), "test": Counter()}

	for group in groups:
		group_counts = Counter(label for _, label in group)
		group_total = len(group)

		best_split = None
		best_cost = float("inf")
		for split in ("train", "val", "test"):
			new_zero = current[split].get(0, 0) + group_counts.get(0, 0)
			new_one = current[split].get(1, 0) + group_counts.get(1, 0)
			new_total = sum(current[split].values()) + group_total

			cost = abs(new_zero - targets[split][0]) + abs(new_one - targets[split][1])
			cost += 0.35 * abs(new_total - targets[split]["total"])

			if cost < best_cost:
				best_cost = cost
				best_split = split

		assigned_groups[best_split].append(group)
		current[best_split].update(group_counts)

	def _group_has_label(group_items: list[tuple[str, int]], label: int) -> bool:
		return any(item_label == label for _, item_label in group_items)

	def _split_has_label(split_name: str, label: int) -> bool:
		for grp in assigned_groups[split_name]:
			if _group_has_label(grp, label):
				return True
		return False

	for split in ("train", "val", "test"):
		for label in (0, 1):
			if _split_has_label(split, label):
				continue

			donor_candidates = []
			for donor in ("train", "val", "test"):
				if donor == split:
					continue
				for group_index, grp in enumerate(assigned_groups[donor]):
					if _group_has_label(grp, label):
						donor_candidates.append((donor, group_index, grp))

			if not donor_candidates:
				continue

			donor, group_index, selected_group = min(donor_candidates, key=lambda x: len(x[2]))
			assigned_groups[split].append(selected_group)
			del assigned_groups[donor][group_index]

	train_samples = [item for grp in assigned_groups["train"] for item in grp]
	val_samples = [item for grp in assigned_groups["val"] for item in grp]
	test_samples = [item for grp in assigned_groups["test"] for item in grp]
	return train_samples, val_samples, test_samples


def _has_both_classes(samples: list[tuple[str, int]]) -> bool:
	counts = Counter(label for _, label in samples)
	return counts.get(0, 0) > 0 and counts.get(1, 0) > 0


def _compute_class_weights(samples: list[tuple[str, int]]) -> dict[int, float] | None:
	counts = Counter(label for _, label in samples)
	n_real = counts.get(0, 0)
	n_fake = counts.get(1, 0)
	if n_real == 0 or n_fake == 0:
		return None
	total = n_real + n_fake
	return {
		0: total / (2.0 * n_real),
		1: total / (2.0 * n_fake),
	}


def _rebalance_binary_samples(samples: list[tuple[str, int]], seed: int) -> list[tuple[str, int]]:
	grouped: dict[int, list[tuple[str, int]]] = {0: [], 1: []}
	for item in samples:
		label = item[1]
		if label in grouped:
			grouped[label].append(item)

	real_count = len(grouped[0])
	fake_count = len(grouped[1])
	if real_count == 0 or fake_count == 0:
		return samples

	target = min(real_count, fake_count)
	rng = random.Random(seed)

	real_bucket = grouped[0][:]
	fake_bucket = grouped[1][:]
	rng.shuffle(real_bucket)
	rng.shuffle(fake_bucket)

	balanced = real_bucket[:target] + fake_bucket[:target]
	rng.shuffle(balanced)
	return balanced


def _split_samples_or_none(
	samples: list[tuple[str, int]],
) -> tuple[list[tuple[str, int]], list[tuple[str, int]], list[tuple[str, int]]] | None:
	labels = [label for _, label in samples]
	counts = Counter(labels)
	if len(counts) < 2:
		print("Both classes are required for full mode training.")
		return None

	if min(counts.values()) < 6:
		print("Need at least 6 samples per class for stable train/val/test stratified split.")
		return None

	if LEAKAGE_SAFE_SPLIT:
		groups = _group_samples_by_identity(samples)
		total_n = len(samples)
		min_train = max(2, int(total_n * 0.55))
		min_val = max(1, int(total_n * 0.10))
		min_test = max(1, int(total_n * 0.10))
		for attempt in range(250):
			train_samples, val_samples, test_samples = _split_groups_with_targets(
				groups,
				counts,
				seed=SUBSET_SEED + attempt,
			)
			if len(train_samples) < min_train or len(val_samples) < min_val or len(test_samples) < min_test:
				continue
			if _has_both_classes(train_samples) and _has_both_classes(val_samples) and _has_both_classes(test_samples):
				print("Using leakage-safe grouped split by source identity.")
				_print_sample_distribution(train_samples, "Train split")
				_print_sample_distribution(val_samples, "Validation split")
				_print_sample_distribution(test_samples, "Test split")
				return train_samples, val_samples, test_samples
		print("Leakage-safe grouped split could not maintain class coverage; falling back to stratified random split.")

	try:
		train_samples, tmp_samples = train_test_split(samples, test_size=0.3, random_state=42, stratify=labels)
		tmp_labels = [label for _, label in tmp_samples]
		val_samples, test_samples = train_test_split(tmp_samples, test_size=0.5, random_state=42, stratify=tmp_labels)
	except ValueError as exc:
		print(f"Unable to split dataset safely: {exc}")
		return None

	_print_sample_distribution(train_samples, "Train split")
	_print_sample_distribution(val_samples, "Validation split")
	_print_sample_distribution(test_samples, "Test split")

	return train_samples, val_samples, test_samples


def _prepare_feature_tensors(
	samples: list[tuple[str, int]],
	extractor_factory,
	augment: bool,
	name: str,
	refresh_every: int = EXTRACTOR_REFRESH_EVERY,
) -> tuple[np.ndarray, np.ndarray]:
	x_list: list[np.ndarray] = []
	y_list: list[float] = []
	skipped = 0
	extractor = None

	total = len(samples)
	for idx, (video_path, label) in enumerate(samples, start=1):
		try:
			if extractor is None or ((idx - 1) % max(1, refresh_every) == 0 and idx != 1):
				if extractor is not None:
					del extractor
					gc.collect()
					tf.keras.backend.clear_session()
				extractor = extractor_factory()
				print(f"{name} extractor refresh at sample {idx}/{total}")

			frames = extract_frame_sequence(
				video_path,
				sequence_length=SEQUENCE_LENGTH,
				sample_rate=max(1, FRAME_SAMPLE_RATE),
			)
			if frames is None:
				skipped += 1
				continue

			if augment:
				frames = augment_frames(frames)

			features = extractor.extract(frames, batch_size=FEATURE_EXTRACT_BATCH)
			if features.shape != (SEQUENCE_LENGTH, FEATURE_DIM):
				skipped += 1
				continue

			x_list.append(features.astype(np.float32))
			y_list.append(float(label))
		except Exception:
			skipped += 1
			continue

		if idx % 100 == 0 or idx == total:
			print(f"{name} features: processed={idx}/{total} kept={len(x_list)} skipped={skipped}")

	if not x_list:
		if extractor is not None:
			del extractor
			gc.collect()
			tf.keras.backend.clear_session()
		return np.empty((0, SEQUENCE_LENGTH, FEATURE_DIM), dtype=np.float32), np.empty((0,), dtype=np.float32)

	x = np.stack(x_list, axis=0)
	y = np.asarray(y_list, dtype=np.float32)
	if extractor is not None:
		del extractor
		gc.collect()
		tf.keras.backend.clear_session()
	real_count = int(np.sum(y == 0.0))
	fake_count = int(np.sum(y == 1.0))
	print(f"{name} tensor: total={len(y)} real={real_count} fake={fake_count} skipped={skipped}")
	return x, y


def _compute_class_weights_from_labels(labels: np.ndarray) -> dict[int, float] | None:
	if labels.size == 0:
		return None
	n_real = int(np.sum(labels == 0.0))
	n_fake = int(np.sum(labels == 1.0))
	if n_real == 0 or n_fake == 0:
		return None
	total = n_real + n_fake
	return {
		0: total / (2.0 * n_real),
		1: total / (2.0 * n_fake),
	}


def run_synthetic_fallback_mode() -> None:
	print("Running synthetic fallback mode with generated sequences...")
	rng = np.random.default_rng(42)
	real = rng.normal(loc=0.4, scale=0.15, size=(100, SEQUENCE_LENGTH, FEATURE_DIM)).astype(np.float32)
	fake = rng.normal(loc=0.6, scale=0.15, size=(100, SEQUENCE_LENGTH, FEATURE_DIM)).astype(np.float32)
	pattern = np.sin(np.linspace(0, np.pi * 2, SEQUENCE_LENGTH)).reshape(1, SEQUENCE_LENGTH, 1)
	fake += pattern.astype(np.float32) * 0.1

	x = np.concatenate([real, fake], axis=0)
	y = np.concatenate([np.zeros(100), np.ones(100)], axis=0).astype(np.float32)

	x_train, x_tmp, y_train, y_tmp = train_test_split(x, y, test_size=0.3, random_state=42, stratify=y)
	x_val, x_test, y_val, y_test = train_test_split(x_tmp, y_tmp, test_size=0.5, random_state=42, stratify=y_tmp)

	model = build_lstm_model(SEQUENCE_LENGTH, FEATURE_DIM)
	MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
	callbacks = [
		EarlyStopping(monitor=CALLBACK_MONITOR, mode="max", patience=5, restore_best_weights=True),
		ModelCheckpoint(str(MODEL_OUT), monitor=CALLBACK_MONITOR, mode="max", save_best_only=True),
		ReduceLROnPlateau(monitor=CALLBACK_MONITOR, mode="max", factor=0.5, patience=2, min_lr=1e-6),
	]

	history = model.fit(
		x_train,
		y_train,
		validation_data=(x_val, y_val),
		epochs=max(1, FALLBACK_EPOCHS),
		batch_size=max(4, BATCH_SIZE),
		callbacks=callbacks,
		verbose="auto",
	)
	_plot_history(history, CURVE_OUT)

	val_scores = model.predict(x_val, verbose="auto").ravel()
	test_scores = model.predict(x_test, verbose="auto").ravel()
	threshold = _select_best_threshold(y_val.astype(np.int32), val_scores)
	_save_decision_threshold(threshold, THRESHOLD_OUT)
	print("Model summary:")
	model.summary()
	_print_eval_metrics(y_test.astype(np.int32), test_scores, threshold=threshold)
	print(f"Saved synthetic fallback model to: {MODEL_OUT}")
	print(f"Saved decision threshold to: {THRESHOLD_OUT}")
	print(f"Saved curves to: {CURVE_OUT}")


def run_full_mode() -> None:
	print("Running FULL MODE with FaceForensics++ videos...")
	samples = list_video_samples(str(DATASET_ROOT))
	_print_sample_distribution(samples, "Discovered samples")
	if len(samples) < 20:
		print("Dataset not found or too small for full mode. Falling back to synthetic mode.")
		run_synthetic_fallback_mode()
		return

	samples = _cap_samples_per_class(samples, MAX_SAMPLES_PER_CLASS, SUBSET_SEED)
	_print_sample_distribution(samples, "Samples after cap")
	if BALANCE_CLASSES:
		samples = _rebalance_binary_samples(samples, SUBSET_SEED)
		_print_sample_distribution(samples, "Samples after class rebalance")

	splits = _split_samples_or_none(samples)
	if splits is None:
		print("Falling back to synthetic mode due to dataset split constraints.")
		run_synthetic_fallback_mode()
		return
	train_samples, val_samples, test_samples = splits

	from app.models.resnet_model import ResNetFeatureExtractor  # lazy import for script portability

	def _make_resnet_extractor():
		extractor = ResNetFeatureExtractor()
		extractor.load()
		return extractor

	try:
		x_train, y_train = _prepare_feature_tensors(train_samples, _make_resnet_extractor, augment=True, name="Train")
		x_val, y_val = _prepare_feature_tensors(val_samples, _make_resnet_extractor, augment=False, name="Validation")
		x_test, y_test = _prepare_feature_tensors(test_samples, _make_resnet_extractor, augment=False, name="Test")
	except Exception as exc:
		print(f"Feature extraction failed unexpectedly: {exc}")
		print("Falling back to synthetic mode.")
		run_synthetic_fallback_mode()
		return

	if x_train.shape[0] == 0 or x_val.shape[0] == 0 or x_test.shape[0] == 0:
		print("Feature tensor extraction produced empty split(s). Falling back to synthetic mode.")
		run_synthetic_fallback_mode()
		return

	if len(np.unique(y_train)) < 2 or len(np.unique(y_val)) < 2 or len(np.unique(y_test)) < 2:
		print("Feature tensors lost class diversity in one or more splits. Falling back to synthetic mode.")
		run_synthetic_fallback_mode()
		return

	model = build_lstm_model(SEQUENCE_LENGTH, FEATURE_DIM)
	MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
	class_weights = _compute_class_weights_from_labels(y_train)
	if class_weights is not None:
		print(f"Using class weights: real={class_weights[0]:.4f}, fake={class_weights[1]:.4f}")
	callbacks = [
		EarlyStopping(monitor=CALLBACK_MONITOR, mode="max", patience=5, restore_best_weights=True),
		ModelCheckpoint(str(MODEL_OUT), monitor=CALLBACK_MONITOR, mode="max", save_best_only=True),
		ReduceLROnPlateau(monitor=CALLBACK_MONITOR, mode="max", factor=0.5, patience=2, min_lr=1e-6),
	]

	history = model.fit(
		x_train,
		y_train,
		validation_data=(x_val, y_val),
		epochs=max(1, TRAIN_EPOCHS),
		batch_size=max(4, BATCH_SIZE),
		callbacks=callbacks,
		verbose="auto",
		class_weight=class_weights,
	)
	_plot_history(history, CURVE_OUT)

	y_val_score = model.predict(x_val, verbose="auto").ravel()
	threshold = _select_best_threshold(y_val.astype(np.int32), y_val_score)
	_save_decision_threshold(threshold, THRESHOLD_OUT)
	y_score = model.predict(x_test, verbose="auto").ravel()
	print("Model summary:")
	model.summary()
	_print_eval_metrics(y_test.astype(np.int32), y_score, threshold=threshold)
	print(f"Saved full model to: {MODEL_OUT}")
	print(f"Saved decision threshold to: {THRESHOLD_OUT}")
	print(f"Saved curves to: {CURVE_OUT}")


def main() -> None:
	_seed_everything(SUBSET_SEED)
	print_faceforensics_instructions()
	if not DATASET_ROOT.exists():
		run_synthetic_fallback_mode()
		return

	run_full_mode()


if __name__ == "__main__":
	main()

