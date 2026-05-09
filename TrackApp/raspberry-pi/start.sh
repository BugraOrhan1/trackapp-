#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

python3 target_blue_eye_scanner.py --start 380 --stop 400 --step 0.2 --interval 8 --leds &
SCANNER_PID=$!
python3 ble_server.py &
BLE_PID=$!

cleanup() {
  kill "$SCANNER_PID" "$BLE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait -n "$SCANNER_PID" "$BLE_PID"
