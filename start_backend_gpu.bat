@echo off
setlocal
cd /d "%~dp0backend"

if not exist "venv_dml\Scripts\python.exe" (
  echo Creating DirectML GPU environment...
  "C:\Users\Piyush\AppData\Local\Programs\Python\Python310\python.exe" -m venv venv_dml
)

set DML_VISIBLE_DEVICES=0
set FLASK_ENV=development
set SECRET_KEY=satyanetra-dev-secret-2024
set PORT=5000

venv_dml\Scripts\python.exe -m pip install -r requirements-gpu-directml.txt
venv_dml\Scripts\python.exe -m flask --app app.main run --port %PORT%
