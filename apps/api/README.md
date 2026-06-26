# Fly.io API for Spotify OAuth and playlist build (Phase 2+).

**Production:** https://api.vibelist.dychen.net  
**Fly app:** `create-playlist-api`

LLM curation uses the in-repo Node **llm-router** module (`src/llm-router/`). Python twin: [toolbox `packages/llm-router`](https://github.com/Harrinive/toolbox/tree/main/packages/llm-router).

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
| POST | `/api/curate` | LLM tracklist from interview answers (session optional; cooldown when logged in) |
| GET | `/api/curate/models` | Available curation models for delivery UI |
| POST | `/api/verify` | Verify proposed lines on Spotify + trim to ~20 (session optional; app token for search) |
| POST | `/api/publish` | Create private playlist + append per-user memory (**auth required**) |

Session cookie: `cp_session` (httpOnly). Production uses `SameSite=Lax` when API and web share `*.dychen.net`.

## Deploy (Fly.io)

```bash
fly apps create create-playlist-api   # once
fly certs add api.vibelist.dychen.net -a create-playlist-api
fly secrets set \
  SPOTIFY_CLIENT_ID=... \
  SPOTIFY_CLIENT_SECRET=... \
  SPOTIFY_REDIRECT_URI=https://api.vibelist.dychen.net/auth/spotify/callback \
  SESSION_SECRET=... \
  WEB_ORIGIN=https://vibelist.dychen.net \
  DATABASE_URL=... \
  OPENAI_API_KEY=... \
  NODE_ENV=production \
  -a create-playlist-api
fly deploy -a create-playlist-api
```

Add both redirect URIs in the Spotify Developer dashboard (local + production).

**DNS:** `CNAME api.vibelist` → `le60ye1.create-playlist-api.fly.dev` (grey cloud in Cloudflare). See [docs/DASHBOARD-OPS.md](../../docs/DASHBOARD-OPS.md).

**CORS:** web calls API with `credentials: 'include'`. API and web must be same-site in production (`vibelist.dychen.net` + `api.vibelist.dychen.net`).

Without `DATABASE_URL`, dev uses an in-memory store. Production requires Postgres.

## CI

`.github/workflows/deploy-api.yml` deploys on push to `apps/api/**` when `FLY_API_TOKEN` is set in GitHub secrets.
