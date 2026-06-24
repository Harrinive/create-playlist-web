# create-playlist-web

Web app for mood-driven Spotify playlist creation — a browser version of the **create-playlist** Cursor skill (`~/.cursor/skills/create-playlist/`).

**Repo:** https://github.com/Harrinive/create-playlist-web  
**Live:** https://vibelist.dychen.net  
**Status:** Phase 1 live. Phase 2 works locally (OAuth + track search); Fly deploy pending.

| Doc | Purpose |
|-----|---------|
| [PLAN.md](./PLAN.md) | Architecture, phases, stack, open questions |
| [AGENTS.md](./AGENTS.md) | Agent handoff — start here for implementation |
| [apps/api/README.md](./apps/api/README.md) | API local dev + Fly deploy |

---

## Progress

### Done (Phase 0–1)

| Feature | Route | Notes |
|---------|-------|-------|
| Landing | `/` | How-it-works, start interview |
| Interview wizard | `/interview` | 5 steps → M1–M5 |
| Delivery choice | `/delivery` | Prompt vs Build (skill Step 2) |
| Spotify prompt | `/prompt` | Step 2.1 paragraph + copy |
| EN / 中文 + theme | Sidebar | Bilingual interview; English prompt |
| Deploy | CF Pages | `vibelist.dychen.net`, root `apps/web` |

### Done (Phase 2 — local dev)

| Item | Notes |
|------|-------|
| `apps/api/` | Fastify — OAuth, `/api/me`, `/api/search` |
| `/build` | Connect Spotify, test search, disconnect |
| Interview wizard | Fixed Continue button on first visit |
| Dev hosts | Use **127.0.0.1** (not `localhost`) for web + API cookies |

**Phase 2 exit criteria met locally:** connect Spotify → search tracks on user's behalf.

### Not done yet

- Fly.io API deploy + Neon `DATABASE_URL`
- `PUBLIC_API_URL` on Cloudflare Pages (production build path)
- Phase 3: curate → verify → publish ~20 tracks

---

## Run locally

**Web** (terminal 1):

```bash
cd apps/web
cp .env.example .env    # PUBLIC_API_URL=http://127.0.0.1:3001
npm install && npm run dev
```

Open **http://127.0.0.1:4321** (not `localhost`).

**API** (terminal 2) — see [apps/api/README.md](./apps/api/README.md):

```bash
cd apps/api
cp .env.example .env    # Spotify credentials + WEB_ORIGIN=http://127.0.0.1:4321
npm install && npm run dev
```

Spotify redirect URI: `http://127.0.0.1:3001/auth/spotify/callback`

---

## Deploy

| Layer | Host | Notes |
|-------|------|-------|
| Web | Cloudflare Pages | Git connect, root `apps/web`, output `dist` |
| API | Fly.io | `apps/api` — secrets via `fly secrets set` |

Production: set `PUBLIC_API_URL` in Cloudflare Pages env; `WEB_ORIGIN=https://vibelist.dychen.net` on Fly.

---

## Related repos

- [spotify-mcp-server](https://github.com/Harrinive/spotify-mcp-server) — Spotify Web API helpers
- [toolbox](https://github.com/Harrinive/toolbox) — `llm-router`
- [dychen.net](https://github.com/Harrinive/dychen.net) — Astro + CF Pages pattern
- [Cycloud](https://github.com/Harrinive/Cycloud) — Fly.io + secrets reference
