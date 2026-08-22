@echo off
cd /d "%~dp0"
set VER=399
for /f "tokens=2 delims==" %%A in ('findstr /C:"js/game.js?v=" index.html') do set RAW=%%A
for /f "tokens=1 delims=^"" %%B in ("%RAW%") do set VER=%%B
echo.
echo  Twisted Speed
echo  Folder: %CD%
echo  Build:  %VER%
echo  Open:   http://127.0.0.1:8765/?v=%VER%
echo.
echo  Title screen must say BUILD %VER%
echo  Leave this window open. Ctrl+C to stop.
echo.
start "" "http://127.0.0.1:8765/?v=%VER%"
python serve.py
pause
