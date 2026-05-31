#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

START_BLE="${START_BLE:-0}"

/usr/bin/python3 -u "${ROOT_DIR}/target_blue_eye_scanner.py" --start 380 --stop 400 --step 0.2 --interval 8 --leds &
SCANNER_PID=$!

BLE_PID=""
if [ "${START_BLE}" = "1" ]; then
  /usr/bin/python3 -u "${ROOT_DIR}/ble_server.py" &
  BLE_PID=$!
fi

cleanup() {
  kill "$SCANNER_PID" ${BLE_PID:+"$BLE_PID"} 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if [ -n "$BLE_PID" ]; then
  wait -n "$SCANNER_PID" "$BLE_PID"
else
  wait "$SCANNER_PID"
fi
