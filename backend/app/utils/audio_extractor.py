import logging
import os

try:
	import numpy as np
except ImportError:  # pragma: no cover
	np = None

try:
	import tensorflow as tf
except ImportError:  # pragma: no cover
	tf = None

try:
	import tensorflow_hub as hub
except ImportError:  # pragma: no cover
	hub = None

try:
	from moviepy.editor import VideoFileClip
except ImportError:  # pragma: no cover
	VideoFileClip = None

try:
	from scipy.io import wavfile
except ImportError:  # pragma: no cover
	wavfile = None


logger = logging.getLogger(__name__)
_YAMNET_MODEL = None


def _load_yamnet():
	global _YAMNET_MODEL
	if _YAMNET_MODEL is not None:
		return _YAMNET_MODEL
	if hub is None:
		raise RuntimeError("tensorflow_hub is unavailable")

	_YAMNET_MODEL = hub.load("https://tfhub.dev/google/yamnet/1")
	return _YAMNET_MODEL


def extract_audio(video_path: str, output_path: str) -> str | None:
	if VideoFileClip is None:
		logger.warning("MoviePy is unavailable; audio extraction skipped.")
		return None

	clip = None
	try:
		clip = VideoFileClip(video_path)
		if clip.audio is None:
			logger.info("No audio track found in video: %s", video_path)
			return None

		clip.audio.write_audiofile(
			output_path,
			codec="pcm_s16le",
			fps=16000,
			verbose=False,
			logger=None,
		)
		return output_path if os.path.exists(output_path) else None
	except Exception:
		logger.exception("Audio extraction failed for %s", video_path)
		return None
	finally:
		if clip is not None:
			try:
				clip.close()
			except Exception:
				logger.exception("Failed to close MoviePy clip")


def _to_float32_mono(audio, sample_rate):
	if np is None:
		raise RuntimeError("Numpy unavailable")

	audio_arr = np.asarray(audio)
	if audio_arr.ndim > 1:
		audio_arr = audio_arr.mean(axis=1)

	if audio_arr.dtype.kind in {"i", "u"}:
		max_val = np.iinfo(audio_arr.dtype).max
		if max_val > 0:
			audio_arr = audio_arr.astype(np.float32) / max_val
	else:
		audio_arr = audio_arr.astype(np.float32)

	if sample_rate == 16000 or tf is None:
		return audio_arr

	signal = tf.convert_to_tensor(audio_arr, dtype=tf.float32)
	signal = tf.expand_dims(signal, axis=0)
	target_len = tf.cast(tf.shape(signal)[1] * 16000 / sample_rate, tf.int32)
	resampled = tf.signal.resample(signal, target_len)
	return tf.squeeze(resampled, axis=0).numpy()


def analyze_audio_yamnet(audio_path: str) -> dict:
	fallback = {"anomaly_score": 0.5, "anomaly_detected": False, "timestamps": []}
	if not audio_path:
		return fallback

	if wavfile is None or np is None:
		logger.warning("Scipy/Numpy unavailable; returning fallback audio result.")
		return fallback

	try:
		sample_rate, waveform = wavfile.read(audio_path)
		waveform = _to_float32_mono(waveform, sample_rate)
		if waveform.size == 0:
			return fallback

		model = _load_yamnet()
		scores, _, _ = model(waveform)
		scores_np = np.asarray(scores)
		mean_scores = scores_np.mean(axis=0)

		anomaly_score = float(1.0 - np.max(mean_scores))
		frame_peak = scores_np.max(axis=1)
		anomaly_mask = (1.0 - frame_peak) > 0.35
		timestamps = [round(index * 0.48, 2) for index, is_anomaly in enumerate(anomaly_mask) if is_anomaly]

		return {
			"anomaly_score": float(max(0.0, min(1.0, anomaly_score))),
			"anomaly_detected": anomaly_score > 0.5,
			"timestamps": timestamps,
		}
	except Exception:
		logger.exception("Audio analysis failed for %s", audio_path)
		return fallback

