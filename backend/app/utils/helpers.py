import logging
import os
from typing import Iterable


logger = logging.getLogger(__name__)


def ensure_directories(paths: Iterable[str]) -> None:
	for path in paths:
		try:
			os.makedirs(path, exist_ok=True)
		except OSError:
			logger.exception("Failed to create directory: %s", path)
			raise


def allowed_file(filename: str, allowed_extensions: set[str]) -> bool:
	if not filename or "." not in filename:
		return False
	ext = filename.rsplit(".", 1)[1].lower()
	return ext in allowed_extensions


def extension_from_filename(filename: str) -> str:
	if not filename or "." not in filename:
		return ""
	return filename.rsplit(".", 1)[1].lower()


def validate_video_signature(file_path: str, extension: str) -> bool:
	signatures = {
		"mp4": [b"ftyp"],
		"mov": [b"ftyp"],
		"avi": [b"RIFF"],
		"mkv": [b"\x1a\x45\xdf\xa3"],
		"webm": [b"\x1a\x45\xdf\xa3"],
	}
	if extension not in signatures:
		return False

	try:
		with open(file_path, "rb") as video_file:
			header = video_file.read(64)
	except OSError:
		logger.exception("Failed to read file header: %s", file_path)
		return False

	expected = signatures[extension]
	if extension in {"mp4", "mov"}:
		return any(token in header[:16] for token in expected)
	if extension == "avi":
		return header.startswith(b"RIFF") and b"AVI" in header[8:16]
	return any(header.startswith(token) for token in expected)


def error_payload(message: str, details: str | None = None) -> dict:
	payload = {"status": "error", "message": message}
	if details:
		payload["details"] = details
	return payload


def clamp_score(value: float) -> float:
	return float(max(0.0, min(1.0, value)))

