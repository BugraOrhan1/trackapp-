
# 📍 TrackApp - Bluetooth Low Energy Tracking System

Real-time tracking applicatie met BLE communicatie tussen Raspberry Pi en web browser.

## 🚀 Features

- ✅ Real-time locatie tracking via BLE
- ✅ Bidirectionele communicatie (Raspberry Pi ↔ Browser)
- ✅ Route geschiedenis en visualisatie
- ✅ Auto-verzenden van browser locatie
- ✅ Interactive kaart met Leaflet
- ✅ Responsive modern design

## 📋 Requirements

### Raspberry Pi
- Raspberry Pi 3/4/5 of Zero W (met Bluetooth)
- Raspbian/Raspberry Pi OS
- Python 3.7+
- BlueZ Bluetooth stack

### Web Browser
- Chrome 56+ / Edge 79+ / Opera 43+
- HTTPS verbinding (of localhost)
- Web Bluetooth API support

## 🔧 Installatie

### 1. Raspberry Pi Setup

```bash
# Clone repository
git clone https://github.com/BugraOrhan1/trackapp-.git
cd trackapp-/raspberry-pi

# Installeer dependencies
sudo ./install.sh

# Start BLE server
sudo ./start_ble.sh
```

### 2. Web App Setup

```bash
# Open index.html in browser (via HTTPS of localhost)
# Of gebruik een webserver:
python3 -m http.server 8000
# Open: http://localhost:8000
```

## 📖 Gebruik
- Start Raspberry Pi server: `sudo ./start_ble.sh`
- Open web app in Chrome/Edge
- Klik "Verbind met Raspberry Pi"
- Selecteer "TrackApp-RPI" in popup
- Start tracking en zie real-time updates!

## 🔑 BLE UUIDs

- Service:  4fafc201-1fb5-459e-8fcc-c5c9c331914b
- Location: beb5483e-36e1-4688-b7f5-ea07361b26a8
- Command:  cba1d466-344c-4be3-ab3f-189f80dd7518
- Status:   d4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f

## 🐛 Troubleshooting

- Browser kan device niet vinden
   - Check of Raspberry Pi server draait
   - Gebruik Chrome/Edge (niet Firefox/Safari)
   - Moet via HTTPS of localhost
- Permission denied op Raspberry Pi
   - `sudo python3 ble_tracker_server_dbus.py`
- Verbinding valt weg
   - Check bereik (max 10-30 meter)
   - Verminder WiFi interferentie

## 📁 Projectstructuur

```
trackapp/
├── raspberry-pi/
│   ├── ble_tracker_server_dbus.py
│   ├── rtl_scanner.py
│   ├── install.sh
│   ├── start_ble.sh
│   └── README.md
├── js/
│   ├── ble-manager.js
│   └── app.js
├── css/
│   └── style.css
├── index.html
└── README.md
```

## 👨‍💻 Auteur
BugraOrhan1

GitHub: @BugraOrhan1

## 📄 Licentie
MIT License - zie LICENSE file voor details

## Inhoud
- raspberry-pi/ble_tracker_server.py — Python BLE server voor Raspberry Pi (BLE peripheral)
- raspberry-pi/requirements.txt — Python dependencies
- raspberry-pi/start_ble.sh — Startscript voor BLE server
- js/ble-manager.js — Web Bluetooth manager (client)
- js/app.js — Webapp logica
- css/style.css — Stijlen voor webapp
- index.html — Webapp UI

## Installatie (Raspberry Pi)
1. Installeer dependencies:
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-dbus bluetooth bluez
   cd raspberry-pi
   sudo pip3 install -r requirements.txt
   ```
2. Start de BLE server:
   ```bash
   sudo ./start_ble.sh
   ```

## Gebruik (Webapp)
1. Open `index.html` in een ondersteunde browser (Chrome/Edge met Web Bluetooth).
2. Klik op "Verbinden" en selecteer het TrackApp BLE device.
3. Gebruik de knoppen om tracking te starten/stoppen, route op te vragen of te wissen.

## BLE UUIDs
- **Service UUID:** 4fafc201-1fb5-459e-8fcc-c5c9c331914b
- **Location Characteristic:** beb5483e-36e1-4688-b7f5-ea07361b26a8
- **Command Characteristic:** cba1d466-344c-4be3-ab3f-189f80dd7518
- **Status Characteristic:** d4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f

## Auteur
BugraOrhan1

## Licentie
MIT
