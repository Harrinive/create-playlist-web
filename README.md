# Vibelist

Mood-driven Spotify playlist creation in the browser — a web version of the **create-playlist** Cursor skill (`~/.cursor/skills/create-playlist/`).

**Live:** https://vibelist.dychen.net  
**API:** https://api.vibelist.dychen.net  
**Repo:** https://github.com/Harrinive/create-playlist-web

---

## What it does

1. **Interview** — LLM-guided chip wizard (scene → mood → night chapter → avoid)
2. **Delivery** — copy a Spotify Prompted Playlist paragraph, or pick a model to build a playlist
3. **Build** — connect Spotify, curate ~26 tracks, verify against search, publish to your account

Bilingual interview UI (EN / 中文); playlist prompts and track notes stay English.

---

## Local development

Use **127.0.0.1** (not `localhost`) for both web and API so session cookies work.

**Web** (terminal 1):

```bash
cd apps/web
cp .env.example .env    # PUBLIC_API_URL=http://127.0.0.1:3001
npm install && npm run dev
```

Open http://127.0.0.1:4321

**API** (terminal 2) — see [apps/api/README.md](./apps/api/README.md):

```bash
cd apps/api
cp .env.example .env    # Spotify credentials, WEB_ORIGIN, optional LLM keys
npm install && npm run dev
```

Spotify redirect URI for local dev: `http://127.0.0.1:3001/auth/spotify/callback`

---

## Project layout

```text
apps/web/     Astro frontend (Cloudflare Pages)
apps/api/     Fastify API (Fly.io) — OAuth, interview, curate, verify, publish
docs/         Ops checklist and interview design reference
```

| Route | Purpose |
|-------|---------|
| `/` | Home — continue or start interview |
| `/interview` | LLM chip wizard |
| `/delivery` | Prompt vs model-backed build |
| `/prompt` | Copyable Spotify paragraph (Step 2.1) |
| `/build` | Spotify OAuth + curate → verify → publish |

---

## Deploy

| Layer | Host |
|-------|------|
| Web | Cloudflare Pages — root `apps/web`, output `dist`, branch `main` |
| API | Fly.io — `create-playlist-api` → `api.vibelist.dychen.net` |

Dashboard settings and secret names: [docs/DASHBOARD-OPS.md](./docs/DASHBOARD-OPS.md)

---

## Documentation

| Doc | Audience |
|-----|----------|
| [AGENTS.md](./AGENTS.md) | Cursor agents — architecture, rules, key files |
| [docs/INTERVIEW-STRATEGY.md](./docs/INTERVIEW-STRATEGY.md) | Interview design (implemented) |
| [docs/INTERVIEW-M4-AVOID.md](./docs/INTERVIEW-M4-AVOID.md) | M4 avoid gate, trap eligibility, discriminant fallback |
| [docs/DASHBOARD-OPS.md](./docs/DASHBOARD-OPS.md) | CF / Fly / Spotify / GitHub ops |
| [apps/api/README.md](./apps/api/README.md) | API local dev and Fly deploy |

Product behavior canon: `~/.cursor/skills/create-playlist/`

---

## Related repos

- [spotify-mcp-server](https://github.com/Harrinive/spotify-mcp-server) — Spotify Web API helpers (ported into API)
- [toolbox](https://github.com/Harrinive/toolbox) — `llm-router` reference
- [dychen.net](https://github.com/Harrinive/dychen-net) — Astro + Cloudflare Pages pattern
