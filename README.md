# TrackApp Webapp

Deze map bevat alleen de browser-app. Er is geen Netlify nodig.

## Snelle start op Windows

```powershell
cd webapp
.\start-local.ps1
```

Daarna opent je browser automatisch op:

```text
http://localhost:8000
```

## Handmatig starten

```bash
cd webapp
python3 -m http.server 8000
```

## Testen zonder Raspberry Pi

Open de app met:

```text
http://localhost:8000/?mock=1
```

Dat zet de webapp in mock mode zodat je meteen ziet of de UI, kaart, alerts en panelen goed werken.

## Web Bluetooth

- Chrome of Edge gebruiken
- HTTPS of localhost is verplicht
- Voor test op desktop is `localhost` genoeg
- Voor gebruik op telefoon heb je een secure origin nodig (bijvoorbeeld HTTPS)

## Belangrijke bestanden

- `index.html`
- `css/style.css`
- `js/ble-manager.js`
- `js/emergency-display.js`
- `js/app.js`
- `sounds/alert.mp3`
