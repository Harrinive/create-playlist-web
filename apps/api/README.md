# Fly.io API for Spotify OAuth and playlist build (Phase 2+).

## Local dev

```bash
cp .env.example .env   # fill Spotify app credentials
npm install
npm run dev            # http://127.0.0.1:3001
```

Pair with the web app — **use 127.0.0.1 everywhere** (`localhost` breaks session cookies):

```bash
# apps/web/.env
PUBLIC_API_URL=http://127.0.0.1:3001

# apps/api/.env
WEB_ORIGIN=http://127.0.0.1:4321
```

Open **http://127.0.0.1:4321** in the browser (Astro dev binds to 127.0.0.1).

Spotify Developer redirect URI: `http://127.0.0.1:3001/auth/spotify/callback`

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/auth/spotify` | Start OAuth |
| GET | `/auth/spotify/callback` | OAuth callback |
| POST | `/auth/logout` | Clear session |
| GET | `/api/me` | Session status |
| GET | `/api/search?q=` | Track search (auth required) |

## Deploy (Fly.io)

```bash
fly apps create create-playlist-api   # once
fly secrets set \
  SPOTIFY_CLIENT_ID=... \
  SPOTIFY_CLIENT_SECRET=... \
  SPOTIFY_REDIRECT_URI=https://create-playlist-api.fly.dev/auth/spotify/callback \
  SESSION_SECRET=... \
  WEB_ORIGIN=https://vibelist.dychen.net \
  DATABASE_URL=...
fly deploy
```

Add the production redirect URI in the Spotify Developer dashboard.

**CORS:** session cookie is set on the API host; the web app calls the API with `credentials: 'include'`.

Without `DATABASE_URL`, dev uses an in-memory store. Production requires Postgres (Neon).
