# Upload naar Netlify

## Voor je upload:

1. **VEREIST**: Pas `.env` aan met je echte values:
   - `NEON_DATABASE_URL` = jouw Neon connection string
   - `JWT_SECRET` = sterke willekeurige string (bijv. output van `openssl rand -base64 32`)
   - `PUBLIC_APP_URL` = jouw Netlify custom domain (bijv. `https://flitser-alert.netlify.app`)

2. **Upload alles in deze map naar Netlify**:
   - Via Netlify CLI: `netlify deploy --prod`
   - Via GitHub: Push naar je connected repo
   - Via drag-drop: Sleep `index.html` + hele folder op Netlify

3. **Na upload**:
   - In Netlify Dashboard → Settings → Build & Deploy → Environment
   - Voeg environment variables in (dezelfde als in `.env`)
   - Netlify bouwt Functions automatisch af `netlify/` folder
   - Site wordt live wanneer Functions beschikbaar zijn

## Map inhoud:
- `index.html` - Frontend app
- `app.js`, `config.js`, `styles.js`, `status.js` - App logica
- `netlify/functions/` - Backend serverless functions
- `package.json` - Dependencies (Netlify draait `npm install` automatisch)
- `.env` - Environment variables (zet dit NOOIT in Git!)
- `.gitignore` - Sluit `node_modules` en `.env` uit van commits

Vragen? Check `../data/NETLIFY_NEON_SETUP.txt` voor volledige setup guide.
