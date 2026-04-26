# SYSTEM AUDIT REPORT

Generated: 2026-04-07
Workspace: c:/Users/Piyush/Desktop/Deepfake/satyanetra

## Environment
- OS: Microsoft Windows 11 Home Single Language (Build 26200)
- Host: RED-PANDA
- Python (default PATH): 3.13.12 (incompatible for TensorFlow 2.15)
- Python (installed for project): 3.10.11 at `C:\Users\Piyush\AppData\Local\Programs\Python\Python310\python.exe`
- pip (Python 3.10 venv): 26.0.1
- Node.js: v24.14.0
- npm: 11.9.0
- Git: 2.53.0.windows.2

## Hardware
- RAM: 23.71 GB
- Free disk (C:): 35.39 GB
- GPU: NVIDIA GeForce RTX 4050 Laptop GPU (Driver 595.97, CUDA 13.2)

## Tooling
- ffmpeg: Installed via winget
- ffmpeg binary detected at:
  - `C:\Users\Piyush\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin\ffmpeg.exe`
- Note: current shell PATH does not yet resolve `ffmpeg`; opening a new terminal should load updated PATH.

## TensorFlow GPU Check
- TensorFlow version (backend venv): 2.15.0
- `tf.config.list_physical_devices('GPU')`: `[]`
- Result: TensorFlow will run in CPU mode on this Windows setup.
- Action: CPU-safe inference configuration will be used (small batch size).

## GPU Runtime Profile Added (Post-Audit Remediation)
- DirectML profile environment: `backend/venv_dml`
- TensorFlow (DirectML profile): 2.10.0 + `tensorflow-directml-plugin`
- Current runtime result in `start_backend.bat` GPU profile:
  - `gpu_available: true`
  - `inference_batch_size: 8`
  - Active adapter limited to discrete GPU via `DML_VISIBLE_DEVICES=0`
- Note: This is the recommended Windows-native GPU path for this project.

## Compatibility Verdict
- Status: PASS
- Hard blockers: None remaining after remediation.
- Important constraints:
  1. Use Python 3.10 explicit path when creating backend venv.
  2. Use explicit ffmpeg binary path until terminal PATH refresh.
  3. For GPU acceleration on Windows, use DirectML profile (`backend/venv_dml`).

## Remediation Performed
1. Installed Python 3.10.11 using winget.
2. Installed FFmpeg 8.1 using winget.

## Commands Executed (Phase 0)
- `systeminfo`
- `python --version`
- `python3 --version`
- `pip --version`
- `node --version`
- `npm --version`
- `nvidia-smi`
- `ffmpeg -version` (initially failed before install)
- `git --version`
- RAM and disk checks via PowerShell (`Get-CimInstance`, `Get-PSDrive`)

## Next Step Gate
Proceed using `start_backend.bat` (auto-prefers GPU profile when `backend/venv_dml` exists).
