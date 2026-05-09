#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

VENV_PYTHON="$ROOT_DIR/.venv/bin/python"
if [ ! -x "$VENV_PYTHON" ]; then
  echo "Missing virtual environment at $ROOT_DIR/.venv. Run install.sh first."
  exit 1
fi

"$VENV_PYTHON" target_blue_eye_scanner.py --start 380 --stop 400 --step 0.2 --interval 8 --leds &
SCANNER_PID=$!
"$VENV_PYTHON" ble_server.py &
BLE_PID=$!

cleanup() {
  kill "$SCANNER_PID" "$BLE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait -n "$SCANNER_PID" "$BLE_PID"
