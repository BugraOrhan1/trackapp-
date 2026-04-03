# Raspberry Pi Setup (Zero 2 W + RTL2832U)

Deze map bevat de backend voor BLE JSON streaming naar je telefoon-webapp.

## Bestanden
- `target_blue_eye_scanner.py`: scanner met baseline scan + peak detectie
- `ble_server.py`: BlueZ D-Bus GATT server
- `install.sh`: systeem dependencies + python venv
- `start_ble.sh`: start bluetooth + BLE server

## Installatie
```bash
sudo ./install.sh
```

## Starten
```bash
sudo ./start_ble.sh
```

## Commands vanuit webapp
- `{ "action": "start_scan" }`
- `{ "action": "stop_scan" }`
- `{ "action": "baseline" }`
- `{ "action": "ping" }`

## BLE kenmerken
- Service: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- Detections (read/notify): `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- Command (write): `cba1d466-344c-4be3-ab3f-189f80dd7518`
- Status (read): `d4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f`

## Notes
- `dbus` en `gi` komen uit apt packages op de Pi.
- Editor waarschuwingen op Windows over deze imports kun je negeren.
- Voor audio alerts in webapp: voeg `sounds/alert.mp3` toe.
