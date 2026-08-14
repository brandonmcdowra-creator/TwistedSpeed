#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/web"
echo ""
echo " Twisted Speed — Night Circuit"
echo " Serving: $(pwd)"
echo " Open:    http://127.0.0.1:8765/"
echo ""
echo " Leave this terminal open. Press Ctrl+C to stop."
echo ""
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server 8765
elif command -v python >/dev/null 2>&1; then
  python -m http.server 8765
else
  echo "Python not found. Install Python 3, or run: npx --yes serve -l 8765"
  exit 1
fi
