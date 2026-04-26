@echo off
setlocal
set "FRONTEND_DIR=%~dp0frontend"

if not exist "%FRONTEND_DIR%\package.json" (
	echo Frontend directory not found: %FRONTEND_DIR%
	exit /b 1
)

pushd "%FRONTEND_DIR%"
call npm run dev
popd
