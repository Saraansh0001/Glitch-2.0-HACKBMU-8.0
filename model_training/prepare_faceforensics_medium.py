import argparse
import csv
import random
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath
from urllib.error import HTTPError, URLError


BASE_URL = "https://huggingface.co/datasets/1129ljc/FaceForensicsPlusPlus_c23/resolve/main"
ARCHIVE_SOURCES = {
	"Real": "original_sequences/youtube/c23/videos.zip",
	"Deepfakes": "manipulated_sequences/Deepfakes/c23/videos.zip",
	"Face2Face": "manipulated_sequences/Face2Face/c23/videos.zip",
	"FaceShifter": "manipulated_sequences/FaceShifter/c23/videos.zip",
	"FaceSwap": "manipulated_sequences/FaceSwap/c23/videos.zip",
	"NeuralTextures": "manipulated_sequences/NeuralTextures/c23/videos.zip",
}


def _safe_output_name(class_dir: Path, source_path: str) -> Path:
	name = PurePosixPath(source_path).name
	output_path = class_dir / name
	if not output_path.exists():
		return output_path

	stem = Path(name).stem
	suffix = Path(name).suffix
	idx = 1
	while True:
		candidate = class_dir / f"{stem}_{idx}{suffix}"
		if not candidate.exists():
			return candidate
		idx += 1


def _head_content_length(url: str) -> int:
	request = urllib.request.Request(url, method="HEAD")
	try:
		with urllib.request.urlopen(request) as response:
			return int(response.headers.get("Content-Length", "0"))
	except (HTTPError, URLError, ValueError):
		# Some hosts block HEAD requests; continue download without progress total.
		return 0


def _download_with_progress(url: str, destination: Path) -> None:
	destination.parent.mkdir(parents=True, exist_ok=True)
	remote_size = _head_content_length(url)

	if destination.exists() and destination.stat().st_size == remote_size and zipfile.is_zipfile(destination):
		print(f"Archive already ready: {destination}")
		return

	tmp_path = destination.with_suffix(destination.suffix + ".part")
	if tmp_path.exists():
		tmp_path.unlink()

	print(f"Downloading {url}")
	downloaded = 0
	chunk_size = 1024 * 1024
	try:
		with urllib.request.urlopen(url) as response, open(tmp_path, "wb") as out_file:
			while True:
				chunk = response.read(chunk_size)
				if not chunk:
					break
				out_file.write(chunk)
				downloaded += len(chunk)
				if remote_size > 0:
					pct = downloaded / remote_size * 100
					print(
						f"{destination.name}: {downloaded / (1024**3):.2f} GB / {remote_size / (1024**3):.2f} GB ({pct:.1f}%)",
						end="\r",
					)
	except Exception:
		tmp_path.unlink(missing_ok=True)
		raise

	if remote_size > 0 and tmp_path.stat().st_size != remote_size:
		tmp_path.unlink(missing_ok=True)
		raise RuntimeError(f"Incomplete download for {destination.name}.")

	if not zipfile.is_zipfile(tmp_path):
		tmp_path.unlink(missing_ok=True)
		raise RuntimeError(f"Downloaded file is not a valid zip: {destination.name}")

	shutil.move(str(tmp_path), str(destination))
	print(f"\nCompleted: {destination}")


def _extract_from_archive(
	archive_path: Path,
	class_name: str,
	videos_per_class: int,
	seed: int,
	videos_root: Path,
	rows: list[tuple[str, int, str, str, int]],
) -> int:
	with zipfile.ZipFile(archive_path, "r") as zf:
		members = [m for m in zf.infolist() if (not m.is_dir()) and m.filename.lower().endswith(".mp4")]

	if not members:
		print(f"No videos found in archive: {archive_path}")
		return 0

	rng = random.Random(seed)
	rng.shuffle(members)
	selected = members[: min(videos_per_class, len(members))]

	class_label = 0 if class_name == "Real" else 1
	class_dir = videos_root / class_name
	class_dir.mkdir(parents=True, exist_ok=True)

	with zipfile.ZipFile(archive_path, "r") as zf:
		for info in selected:
			out_path = _safe_output_name(class_dir, info.filename)
			with zf.open(info, "r") as src, open(out_path, "wb") as dst:
				shutil.copyfileobj(src, dst)
			rows.append((class_name, class_label, str(out_path), info.filename, info.file_size))

	return len(selected)


def parse_args() -> argparse.Namespace:
	project_root = Path(__file__).resolve().parents[1]
	default_dataset_root = project_root / "datasets" / "FaceForensics++"
	default_raw_dir = project_root / "datasets" / "raw" / "ffpp_c23_split"

	parser = argparse.ArgumentParser(description="Download and prepare a medium FaceForensics++ c23 subset.")
	parser.add_argument("--dataset-root", type=Path, default=default_dataset_root)
	parser.add_argument("--raw-dir", type=Path, default=default_raw_dir)
	parser.add_argument("--videos-per-class", type=int, default=200)
	parser.add_argument("--seed", type=int, default=42)
	parser.add_argument("--skip-download", action="store_true")
	parser.add_argument("--clean", action="store_true")
	return parser.parse_args()


def main() -> int:
	args = parse_args()
	videos_root = args.dataset_root / "videos"
	manifest_path = args.dataset_root / "manifest_medium.csv"

	print("Preparing FaceForensics++ medium subset")
	print(f"Dataset root: {args.dataset_root}")
	print(f"Raw archive dir: {args.raw_dir}")
	print(f"Videos per class: {args.videos_per_class}")
	print(f"Seed: {args.seed}")

	if args.clean and videos_root.exists():
		print(f"Removing existing extracted dataset at: {videos_root}")
		shutil.rmtree(videos_root)

	args.raw_dir.mkdir(parents=True, exist_ok=True)
	videos_root.mkdir(parents=True, exist_ok=True)

	archive_paths: dict[str, Path] = {}
	for class_name, relative_path in ARCHIVE_SOURCES.items():
		archive_name = class_name.lower() + "_videos.zip"
		archive_path = args.raw_dir / archive_name
		archive_paths[class_name] = archive_path

		if args.skip_download:
			if not archive_path.exists() or not zipfile.is_zipfile(archive_path):
				print(f"Missing or invalid local archive for class {class_name}: {archive_path}")
				return 1
			continue

		url = f"{BASE_URL}/{relative_path}?download=true"
		_download_with_progress(url, archive_path)

	rows: list[tuple[str, int, str, str, int]] = []
	print("Extracting balanced subset...")
	for class_name in ARCHIVE_SOURCES:
		extracted = _extract_from_archive(
			archive_path=archive_paths[class_name],
			class_name=class_name,
			videos_per_class=max(1, args.videos_per_class),
			seed=args.seed,
			videos_root=videos_root,
			rows=rows,
		)
		print(f"  {class_name}: extracted {extracted}")

	args.dataset_root.mkdir(parents=True, exist_ok=True)
	with open(manifest_path, "w", newline="", encoding="utf-8") as f:
		writer = csv.writer(f)
		writer.writerow(["class_name", "binary_label", "local_path", "archive_path", "size_bytes"])
		writer.writerows(rows)

	print("Preparation complete.")
	print(f"Video directory: {videos_root}")
	print(f"Manifest: {manifest_path}")
	print(f"Total extracted videos: {len(rows)}")
	return 0


if __name__ == "__main__":
	sys.exit(main())
