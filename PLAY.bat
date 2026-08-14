@echo off
cd /d "%~dp0web"
echo.
echo  Twisted Speed — Night Circuit
echo  Serving: %CD%
echo  Open:    http://127.0.0.1:8765/
echo.
echo  Leave this window open. Press Ctrl+C to stop.
echo.
where python >nul 2>&1
if errorlevel 1 (
  echo  Python not found. Install Python 3 from https://www.python.org/downloads/
  echo  Or from this folder run:  npx --yes serve -l 8765
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8765/"
python -m http.server 8765
pause
