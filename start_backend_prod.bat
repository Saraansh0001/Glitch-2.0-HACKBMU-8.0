@echo off
setlocal
set "ROOT_DIR=%~dp0"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

if not exist "%FRONTEND_DIR%\package.json" (
  echo Frontend directory not found: %FRONTEND_DIR%
  exit /b 1
)

pushd "%FRONTEND_DIR%"
call npm install --no-audit
if errorlevel 1 exit /b %errorlevel%

call npm run build
if errorlevel 1 exit /b %errorlevel%
popd

cd /d "%ROOT_DIR%backend"

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

if "%PORT%"=="" set PORT=5050
if "%FRONTEND_ORIGIN%"=="" set FRONTEND_ORIGIN=http://localhost:%PORT%
set FLASK_ENV=production

powershell -NoProfile -Command "$procs=Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -match 'waitress' -and $_.CommandLine -match 'app.main:app' }; foreach($p in $procs){ Write-Host ('Stopping existing backend PID ' + $p.ProcessId); Stop-Process -Id $p.ProcessId -Force }"

%BACKEND_PY% -m waitress --host=0.0.0.0 --port=%PORT% app.main:app
