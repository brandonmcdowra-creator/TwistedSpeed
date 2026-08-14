@echo off
cd /d "%~dp0"
echo.
echo  Twisted Speed — Night Circuit
echo  Serving: %CD%
echo  Open:    http://127.0.0.1:8765/
echo.
echo  Leave this window open. Press Ctrl+C to stop.
echo.
start "" "http://127.0.0.1:8765/"
python -m http.server 8765
pause
