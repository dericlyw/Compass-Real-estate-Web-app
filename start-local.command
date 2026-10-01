#!/bin/bash
# PropVid — run locally on macOS. Double-click this file (first time: right-click → Open).
# Needs Node.js 22 or newer: https://nodejs.org (LTS installer).
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Get the LTS version from https://nodejs.org then run this again."
  read -r -p "Press Enter to close"; exit 1
fi
if [ ! -d node_modules ]; then
  echo "Installing (first run only, about 1-2 minutes)..."
  npm install || { read -r -p "Install failed. Press Enter to close"; exit 1; }
fi
echo
echo "Starting PropVid at http://localhost:3000  (close this window to stop)"
(sleep 6 && open "http://localhost:3000/engine") &
npm run dev
