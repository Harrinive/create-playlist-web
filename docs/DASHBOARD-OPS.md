# Dashboard ops reference (Harry)

Personal checklist of **URLs, paths, and secret names** configured across platforms.  
**Do not commit real secret values** — store values in Fly secrets, CF env, GitHub secrets, or local `.env` only.

Fill in `YOUR_*` placeholders locally if you keep a private copy; this file tracks *what* is set and *where*.

---

## Quick URL map

| Role | URL |
|------|-----|
| **Live web** | https://vibelist.dychen.net |
| **CF Pages preview** | https://create-playlist-web.pages.dev |
| **Production API** | https://api.vibelist.dychen.net |
| **Fly default hostname** | https://create-playlist-api.fly.dev (legacy; OAuth should use custom domain) |
| **GitHub repo** | https://github.com/Harrinive/create-playlist-web |
| **Spotify Developer** | https://developer.spotify.com/dashboard |

---

## Cloudflare

### Account / zone

| Item | Value |
|------|-------|
| Zone | `dychen.net` (manages `vibelist.dychen.net` and `api.vibelist.dychen.net`) |
| Dashboard | Workers & Pages → **create-playlist-web** |

### Pages project — `create-playlist-web`

| Setting | Value |
|---------|-------|
| **Git repository** | `Harrinive/create-playlist-web` |
| **Production branch** | `main` |
| **Root directory** | `apps/web` |
| **Framework preset** | Astro |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Build system** | Version 3 |
| **Automatic deployments** | Enabled |
| **Build watch paths** | `*` (optional: narrow to `apps/web/**`) |
| **Build cache** | Enabled |

### Pages — environment variables (Production)

| Variable | Purpose | Example / your value |
|----------|---------|----------------------|
| `PUBLIC_API_URL` | Baked into static build; API base for `/build` | `https://api.vibelist.dychen.net` |
| `NODE_VERSION` | Match `package.json` engines | `22` |

Also set on **Preview** if you use PR preview deploys.

### Pages — custom domains

| Domain | Points to |
|--------|-----------|
| `vibelist.dychen.net` | Pages project (`create-playlist-web.pages.dev`) |

### DNS records (`dychen.net` zone)

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| (Pages-managed) | `vibelist` | Pages / CNAME to `*.pages.dev` | Usually proxied (orange) |
| **CNAME** | `api.vibelist` | `le60ye1.create-playlist-api.fly.dev` | **DNS only** (grey cloud) recommended for Fly TLS |

Fly alternative (if not using CNAME):

| Type | Name | Value |
|------|------|-------|
| A | `api.vibelist` | `66.241.125.21` |
| AAAA | `api.vibelist` | `2a09:8280:1::133:977d:0` |

Verify cert:

```bash
fly certs check api.vibelist.dychen.net -a create-playlist-api
# Status should be: Issued
```

### Cloudflare secrets (if using GitHub Actions deploy-web — optional)

| Secret name | Where | Status |
|-------------|-------|--------|
| `CLOUDFLARE_API_TOKEN` | GitHub → repo Secrets | **Not set** (not needed; Git connect used) |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub → repo Secrets | **Not set** |

---

## Fly.io

### App

| Item | Value |
|------|-------|
| App name | `create-playlist-api` |
| Region | `ord` |
| Dashboard | https://fly.io/apps/create-playlist-api |
| Config file | `apps/api/fly.toml` |
| Internal port | `3001` |
| Machines | auto-stop/start, min 0 |

### Custom domain / TLS

| Hostname | Status |
|----------|--------|
| `api.vibelist.dychen.net` | Issued (Let's Encrypt) |

```bash
fly certs list -a create-playlist-api
fly secrets list -a create-playlist-api   # names only
```

### Fly secrets (production)

Set via `fly secrets set -a create-playlist-api`. Values live only on Fly — **never commit**.

| Secret | Purpose | Your value location |
|--------|---------|---------------------|
| `SPOTIFY_CLIENT_ID` | Spotify Developer app | Same as local `apps/api/.env` |
| `SPOTIFY_CLIENT_SECRET` | Spotify Developer app | Same as local `apps/api/.env` |
| `SPOTIFY_REDIRECT_URI` | OAuth callback | `https://api.vibelist.dychen.net/auth/spotify/callback` |
| `WEB_ORIGIN` | CORS + post-OAuth redirect | `https://vibelist.dychen.net` |
| `SESSION_SECRET` | Sign OAuth state / session | Random 32+ chars (generated once) |
| `DATABASE_URL` | Postgres session + refresh tokens | Fly Managed Postgres **or** Supabase connection string |
| `NODE_ENV` | Production mode | `production` |
| `OPENAI_API_KEY` | OpenAI curation | Optional if other LLM keys set |
| `ANTHROPIC_API_KEY` | Anthropic curation | Optional if other LLM keys set |
| `CURSOR_API_KEY` | Cursor curation (`cursor:composer-2.5`) | [Cursor Dashboard → API Keys](https://cursor.com/dashboard) |
| `CURSOR_LLM_RUNTIME` | `cloud` on Fly; `local` for dev | Required with Cursor on production |
| `CURSOR_CLOUD_REPO` | Git URL for Cursor cloud agents | e.g. `https://github.com/Harrinive/create-playlist-web` |
| `CURSOR_CLOUD_REF` | Git ref for cloud repo | `main` |
| `CURATE_LLM_MODEL` | Default curation slug | e.g. `anthropic:claude-sonnet-4-6` (code default) or `cursor:composer-2.5` |
| `INTERVIEW_LLM_MODEL` | Default interview slug | e.g. `openai:gpt-5.4-mini` |
| `INTERVIEW_ALGORITHM_MODE` | Interview generation pipeline | `full` (plan→draft→verify, default) or `fast` (single call) |

List without values:

```bash
fly secrets list -a create-playlist-api
```

### Database (current)

| Item | Notes |
|------|-------|
| Provider | **Supabase** Postgres |
| Connection | `DATABASE_URL` Fly secret (Supabase connection string) |

### Deploy commands

```bash
cd apps/api
fly deploy -a create-playlist-api
fly logs -a create-playlist-api
curl https://api.vibelist.dychen.net/health   # {"ok":true}
```

---

## Spotify Developer Dashboard

### App

| Item | Your value |
|------|------------|
| Dashboard | https://developer.spotify.com/dashboard |
| App name | _(your app name)_ |
| Client ID | → `SPOTIFY_CLIENT_ID` (Fly + local `.env`) |
| Client secret | → `SPOTIFY_CLIENT_SECRET` (Fly + local `.env`) |

### Redirect URIs (must all be listed)

| Environment | Redirect URI |
|-------------|--------------|
| **Local dev** | `http://127.0.0.1:3001/auth/spotify/callback` |
| **Production** | `https://api.vibelist.dychen.net/auth/spotify/callback` |

Do **not** use `localhost` for local dev redirect — cookies break.

### Scopes (requested by API)

- `playlist-modify-private`
- `playlist-modify-public`
- `user-read-private`

### Dev mode / allowlist

Spotify apps in development mode only work for users added under **User Management**. Add your Spotify email for testing; plan **app review** before public launch.

---

## GitHub

### Repository

| Item | Value |
|------|-------|
| URL | https://github.com/Harrinive/create-playlist-web |
| Default branch | `main` |
| Visibility | Public |

### Actions secrets

| Secret | Used by | Purpose |
|--------|---------|---------|
| `FLY_API_TOKEN` | `.github/workflows/deploy-api.yml` | Auto-deploy API on push to `apps/api/**` |

Generate token: https://fly.io/user/personal_access_tokens

### Workflows

| Workflow | Trigger | Notes |
|----------|---------|-------|
| `deploy-api.yml` | Push `apps/api/**` on `main`, or manual | Needs `FLY_API_TOKEN` |
| `deploy-web.yml` | **Manual only** | Needs CF token; CF Git connect is primary |

### Pages / deploy notifications

Failed **Deploy web** emails were from `deploy-web.yml` before it was manual-only. Web deploy success/failure: **Cloudflare Pages → Deployments** tab.

---

## Local development `.env` files (gitignored)

### `apps/web/.env`

```env
PUBLIC_API_URL=http://127.0.0.1:3001
```

### `apps/api/.env`

```env
SPOTIFY_CLIENT_ID=<from Spotify dashboard>
SPOTIFY_CLIENT_SECRET=<from Spotify dashboard>
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/auth/spotify/callback
SESSION_SECRET=<local dev secret>
WEB_ORIGIN=http://127.0.0.1:4321
# DATABASE_URL=   # optional locally; omit = in-memory store
PORT=3001
```

### Local URLs

| Service | URL |
|---------|-----|
| Web | http://127.0.0.1:4321 |
| API | http://127.0.0.1:3001 |
| OAuth start | http://127.0.0.1:3001/auth/spotify |

---

## API route reference (production base: `https://api.vibelist.dychen.net`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | No |
| GET | `/auth/spotify` | No — starts OAuth |
| GET | `/auth/spotify/callback` | No — Spotify redirects here |
| POST | `/auth/logout` | Cookie |
| GET | `/api/me` | Cookie (`cp_session`) |
| GET | `/api/search?q=` | Cookie |

Session cookie name: **`cp_session`** (httpOnly, host `api.vibelist.dychen.net`).

---

## Smoke tests

```bash
# API up
curl -s https://api.vibelist.dychen.net/health

# Web build path (browser)
open https://vibelist.dychen.net/build
# → Connect Spotify → "Connected as …" → search "lane 8"
```

DevTools → Network: after login, `GET https://api.vibelist.dychen.net/api/me` should return **200** with `"authenticated": true`.

---

## Rotation / recovery cheatsheet

| If you need to… | Do this |
|-----------------|---------|
| Rotate Spotify secret | Spotify dashboard → reset → `fly secrets set SPOTIFY_CLIENT_SECRET=...` |
| Rotate session signing | Generate new string → `fly secrets set SESSION_SECRET=...` (invalidates all sessions) |
| Change API domain | Update DNS, Fly cert, `SPOTIFY_REDIRECT_URI`, Spotify redirect list, `PUBLIC_API_URL`, redeploy web |
| Redeploy web only | Push to `main` or CF Pages Deployments (⋮ → Retry on latest) |
| Redeploy API only | `fly deploy` or push `apps/api/**` (if `FLY_API_TOKEN` set) |

---

*Last updated: 2026-06-23 — Phase 2 production OAuth + search verified.*
