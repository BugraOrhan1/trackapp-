# TrackApp Raspberry Pi

This folder contains the Target Blue Eye scanner and BLE GATT server used by the TrackApp premium scanner flow.

## Files
- `target_blue_eye_scanner.py` scans 380-400 MHz with an RTL-SDR dongle and writes snapshots to `detections.json`.
- `ble_server.py` exposes the latest scanner data via a BlueZ GATT service.
- `install.sh` installs the dependencies.
- `start.sh` runs the scanner and BLE server together.

## GPIO LEDs
The scanner can also drive 4 LEDs on the Raspberry Pi using BCM numbering:
- `police` -> GPIO 17
- `ambulance` -> GPIO 27
- `fire` -> GPIO 22
- `defense` -> GPIO 23

When one of those service types is detected, the matching LED stays on until the next scan result clears it. If `RPi.GPIO` is not installed or the code is run off-Pi, LED output is disabled automatically.

Use this command if you want the LEDs enabled explicitly:
`python3 target_blue_eye_scanner.py --leds`

## Notes
- Intended for Raspberry Pi OS / Linux with BlueZ.
- Requires an RTL-SDR dongle for live scanning.
- `install.sh` now also installs and enables the `trackapp-pi.service` systemd unit.

## Auto start on boot
Use the bundled systemd service to start the scanner automatically after reboot.

```bash
sudo cp trackapp-pi.service /etc/systemd/system/trackapp-pi.service
sudo systemctl daemon-reload
sudo systemctl enable trackapp-pi.service
sudo systemctl start trackapp-pi.service
sudo systemctl status trackapp-pi.service
```

If your repo is not located in `/home/pi/trackapp/TrackApp/raspberry-pi`, update `WorkingDirectory` and `ExecStart` inside the service file first.

## Python environment
The installer creates a local `.venv` inside this folder and the boot script uses it automatically.
This avoids the Raspberry Pi OS "externally-managed-environment" error from system Python.
