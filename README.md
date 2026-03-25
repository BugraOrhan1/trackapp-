# TrackApp (Flitser Alert Pro)

Opgeschoonde versie met 1 duidelijke flow voor web + Raspberry Pi.

## Wat zit erin

- Frontend web app: kaart, meldingen, Bluetooth status
- Netlify Functions backend: auth + reports + health-check
- Neon PostgreSQL database
- Raspberry Pi scanner: RTL-SDR + Bluetooth stream

## Snel starten

### 1. Web app lokaal

1. Installeer dependencies:

```bash
npm install
```

2. Start lokaal met Netlify Functions:

```bash
npx netlify dev
```

3. Open:

```text
http://localhost:8888
```

### 2. Netlify productie

1. Push naar GitHub (repo gekoppeld aan Netlify)
2. Zet environment variables in Netlify:

```text
NEON_DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
JWT_SECRET=<sterke-random-string-32+>
```

3. Run SQL schema in Neon:

Gebruik het bestand `DATABASE_SCHEMA.sql`.

### 3. Raspberry Pi in 1 keer

Run op de Raspberry Pi:

```bash
curl -fsSL https://raw.githubusercontent.com/BugraOrhan1/trackapp-/main/raspberry-pi/setup-rpi.sh | bash
```

Daarna telefoon pairen + rfcomm binden:

```bash
bluetoothctl paired-devices
MAC=$(bluetoothctl paired-devices | head -n1 | awk '{print $2}')
sudo rfcomm release /dev/rfcomm0 2>/dev/null || true
sudo rfcomm bind /dev/rfcomm0 "$MAC"
sudo systemctl restart rpi_scanner.service
```

Logs checken:

```bash
journalctl -u rpi_scanner.service -f
```

## Auth/demo modus

In `config.js`:

- `requireAuth: false` -> direct app starten (demo)
- `requireAuth: true` -> login verplicht

## Belangrijkste bestanden

- `index.html`, `app.js`, `styles.css` - frontend
- `config.js` - runtime instellingen
- `netlify/functions/` - backend endpoints
- `DATABASE_SCHEMA.sql` - database schema
- `raspberry-pi/rpi_live_scanner.py` - scanner
- `raspberry-pi/setup-rpi.sh` - all-in-one Pi setup

## Troubleshooting

- 500 errors op auth endpoints:
  - check `NEON_DATABASE_URL` en `JWT_SECRET` in Netlify
  - check Netlify Function logs
- Geen `/dev/rfcomm0`:
  - check pairing met `bluetoothctl paired-devices`
  - bind handmatig met `rfcomm bind`
- Scanner service start niet:
  - `sudo systemctl status rpi_scanner.service`
  - `journalctl -u rpi_scanner.service -n 100 --no-pager`
