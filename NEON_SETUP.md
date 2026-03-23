# Neon Database Setup Verification

## ✅ What's Configured

The application is set up to connect to Neon PostgreSQL:

- **Database Library**: `@neondatabase/serverless` (already in package.json)
- **Connection Method**: Uses `NEON_DATABASE_URL` environment variable
- **Functions Using DB**: 
  - `auth-register.js` - Creates new users
  - `auth-login.js` - Authenticates users
  - `auth-me.js` - Retrieves current user
  - `reports-*.js` - Report management (create, list, update, delete)

## 📋 Required Setup in Netlify Dashboard

1. Go to **[app.netlify.com](https://app.netlify.com)**
2. Select your site → **Site settings** → **Build & deploy** → **Environment**
3. Add these environment variables:

   | Key | Value |
   |-----|-------|
   | `NEON_DATABASE_URL` | `postgresql://neondb_owner:npg_cmlx2q6UWfiS@ep-weathered-art-ajseo667-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
   | `JWT_SECRET` | (Your secret key - e.g., `super-secret-key-12345`) |

4. **Save changes** and trigger a new deploy

## 🧪 Testing the Connection

Once deployed, test by calling the register endpoint:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/auth-register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123",
    "birthDate": "1990-01-01"
  }'
```

Expected response:
```json
{
  "ok": true,
  "message": "Ingelogd!",
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

## 🔧 Database Schema Required

Make sure your Neon database has the `app_users` table:

```sql
CREATE TABLE app_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📍 Current Status

- ✅ Code configured to use Neon
- ⏳ Awaiting environment variables set in Netlify dashboard
- ⏳ Database schema needs to be created in Neon
