@echo off
setlocal
echo Single-host production mode is enabled.
echo Starting full app via start_backend_prod.bat on http://localhost:5050 ...
call "%~dp0start_backend_prod.bat"
