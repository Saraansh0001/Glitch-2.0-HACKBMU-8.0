@echo off
setlocal
cd /d "%~dp0backend"

set BACKEND_PY=
set REQ_FILE=

if exist "venv_dml\Scripts\python.exe" (
  echo Using GPU profile: DirectML ^(venv_dml^)
  set BACKEND_PY=venv_dml\Scripts\python.exe
  set REQ_FILE=requirements-gpu-directml.txt
  set DML_VISIBLE_DEVICES=0
) else (
  if not exist "venv\Scripts\python.exe" (
    echo Creating backend virtual environment with Python 3.10...
    "C:\Users\Piyush\AppData\Local\Programs\Python\Python310\python.exe" -m venv venv
  )
  echo Using standard profile: CPU/portable ^(venv^)
  set BACKEND_PY=venv\Scripts\python.exe
  set REQ_FILE=requirements.txt
)

%BACKEND_PY% -m pip install -r %REQ_FILE%

set FLASK_ENV=development
set SECRET_KEY=satyanetra-dev-secret-2024
set PORT=5000

%BACKEND_PY% -m flask --app app.main run --port %PORT%
