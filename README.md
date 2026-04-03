# TrackApp

TrackApp is een Target Blue Eye style project: een Raspberry Pi Zero 2 W met RTL2832U scant 380-400 MHz, stuurt detecties als JSON via BLE naar de telefoon, en de webapp toont die live op een kaart met cirkels en alerts.

## Eerst runnen

```bash
# 1. Download het project van GitHub
 git clone https://github.com/BugraOrhan1/trackapp-.git

# 2. Ga naar de projectmap
cd trackapp-

# 3. Installeer Raspberry Pi dependencies
cd raspberry-pi
sudo ./install.sh

# 4. Start de BLE server
sudo ./start_ble.sh
```

## Webapp starten

```bash
# Ga terug naar de project root
cd ..

# Start een lokale webserver voor Web Bluetooth
python3 -m http.server 8000
```

Open daarna in Chrome of Edge:

```text
http://localhost:8000
```

## Snel testen zonder Raspberry Pi

Gebruik mock mode om de UI nu al te testen:

```text
http://localhost:8000/?mock=1
```

Daarmee zie je direct:
- Verbinding status
- Live detecties
- Proximity cirkels
- Alert banner
- Audio/speech/vibration flow

## Hoe het werkt

- De RTL2832U scant de C2000-band tussen 380 en 400 MHz.
- De scanner meet eerst een baseline/noise floor.
- Daarna zoekt hij pieken boven baseline + threshold.
- De BLE server zet detecties om naar JSON en publiceert die via notify/read.
- De webapp leest die JSON en past de kaart en cirkels aan.

## Belangrijkste bestanden

- [raspberry-pi/target_blue_eye_scanner.py](raspberry-pi/target_blue_eye_scanner.py)
- [raspberry-pi/ble_server.py](raspberry-pi/ble_server.py)
- [js/ble-manager.js](js/ble-manager.js)
- [js/emergency-display.js](js/emergency-display.js)
- [js/app.js](js/app.js)
- [index.html](index.html)
- [css/style.css](css/style.css)

## BLE UUIDs

- Service: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- Detections: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- Command: `cba1d466-344c-4be3-ab3f-189f80dd7518`
- Status: `d4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f`

## Raspberry Pi install notities

De Pi gebruikt alleen system packages voor BLE:
- `python3-dbus`
- `python3-gi`
- `bluez`

De installer maakt daarnaast een `.venv` voor RTL-SDR Python packages, zodat je geen PEP 668 problemen krijgt.

## Troubleshooting

- Web Bluetooth werkt alleen in Chrome of Edge.
- Gebruik `http://localhost:8000` of HTTPS.
- Op de Pi moet Bluetooth actief zijn: `sudo systemctl status bluetooth`.
- Als de RTL dongle niet gevonden wordt, test met `rtl_test`.
- Als je alleen de UI wilt testen, gebruik `?mock=1`.

## Licentie

MIT
