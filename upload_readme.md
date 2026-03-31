# Upload instructies voor TrackApp BLE

## Raspberry Pi
1. Upload de map `raspberry-pi/` naar je Raspberry Pi (bijvoorbeeld via SCP, WinSCP, of USB-stick).
2. Installeer de vereiste Python packages:
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-dbus bluetooth bluez
   cd raspberry-pi
   sudo pip3 install -r requirements.txt
   ```
3. Start de BLE server:
   ```bash
   sudo ./start_ble.sh
   ```

## Webapp
1. Upload de bestanden `index.html`, `js/`, en `css/` naar je webserver of open `index.html` direct in een ondersteunde browser.
2. Zorg dat je browser Web Bluetooth ondersteunt (Chrome/Edge).
3. Klik op "Verbinden" om te starten.

## Opmerkingen
- Zorg dat Bluetooth op de Pi actief is en de adapter aan staat.
- De webapp werkt alleen via HTTPS of localhost (beveiligingsrestrictie van Web Bluetooth).
- Voor productie: host de webapp op een HTTPS-server.

## Auteur
BugraOrhan1
