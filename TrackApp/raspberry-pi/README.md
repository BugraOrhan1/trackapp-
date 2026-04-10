# TrackApp Raspberry Pi

This folder contains the Target Blue Eye scanner and BLE GATT server used by the TrackApp premium scanner flow.

## Files
- `target_blue_eye_scanner.py` scans 380-400 MHz with an RTL-SDR dongle and writes snapshots to `detections.json`.
- `ble_server.py` exposes the latest scanner data via a BlueZ GATT service.
- `install.sh` installs the dependencies.
- `start.sh` runs the scanner and BLE server together.

## Notes
- Intended for Raspberry Pi OS / Linux with BlueZ.
- Requires an RTL-SDR dongle for live scanning.
