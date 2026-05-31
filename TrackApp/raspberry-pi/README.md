# TrackApp Raspberry Pi

This folder contains the Target Blue Eye scanner and BLE GATT server used by the TrackApp premium scanner flow.

## Files
- `target_blue_eye_scanner.py` scans 380-400 MHz with an RTL-SDR dongle and writes snapshots to `detections.json`.
- `ble_server.py` exposes the latest scanner data via a BlueZ GATT service.
- `install.sh` installs the dependencies.
- `start.sh` runs the scanner and BLE server together.

## GPIO LEDs
The scanner drives 4 LEDs on the Raspberry Pi using BCM numbering. LEDs indicate proximity to any detected emergency service (combined indicator), not the specific service type:
- `red` -> GPIO 23 (dichtbij)
- `orange` -> GPIO 27 (middel)
- `yellow` -> GPIO 17 (middel)
- `green` -> GPIO 22 (heel ver of geen)

When any service is detected, the LEDs represent distance (not the individual service):
- Zeer dichtbij: `red` aan.
- Middelafstand: `yellow` en `orange` aan.
- Ver (zwak): `green` aan.
- Geen detecties: alle LEDs uit.

If `RPi.GPIO` is not installed or the code is run off-Pi, LED output is disabled automatically.

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

## Python install mode
The installer now uses Raspberry Pi OS system Python with `--break-system-packages` for the required packages.
Use this only on the Pi you want to dedicate to TrackApp.

## One-command start
After cloning the repo on the Pi, this is the one command you need:

```bash
sudo bash install.sh
```

The installer will create the systemd service with the current user and repo path, enable it, and start it right away.

After running the installer once, the scanner will run automatically on boot — you do not need to SSH in or manually start it again.
