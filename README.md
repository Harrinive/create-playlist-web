# create-playlist-web

Web app for mood-driven Spotify playlist creation — a browser version of the **create-playlist** Cursor skill (`~/.cursor/skills/create-playlist/`).

**Repo:** https://github.com/Harrinive/create-playlist-web  
**Live:** https://vibelist.dychen.net  
**API:** https://api.vibelist.dychen.net  
**Status:** Phase 3 complete — full build path (curate / verify / publish) with OpenAI, Anthropic, and Cursor; production E2E verified.

| Doc | Purpose |
|-----|---------|
| [PLAN.md](./PLAN.md) | Architecture, phases, stack, open questions |
| [AGENTS.md](./AGENTS.md) | Agent handoff — start here for implementation |
| [docs/PROGRESS.md](./docs/PROGRESS.md) | What shipped, bugs fixed, deploy history |
| [docs/DASHBOARD-OPS.md](./docs/DASHBOARD-OPS.md) | CF / Fly / Spotify / GitHub settings (no secret values) |
| [apps/api/README.md](./apps/api/README.md) | API local dev + Fly deploy |

---

## Progress

### Done (Phase 0–1)

| Feature | Route | Notes |
|---------|-------|-------|
| Landing | `/` | How-it-works, start interview |
| Interview wizard | `/interview` | 5 steps → M1–M5 |
| Delivery choice | `/delivery` | Prompt + per-model build options (Step 2.2.3) |
| Spotify prompt | `/prompt` | Step 2.1 paragraph + copy |
| EN / 中文 + theme | Sidebar | Bilingual interview; English prompt |
| Deploy | CF Pages | `vibelist.dychen.net`, root `apps/web` |

### Done (Phase 2)

| Item | Notes |
|------|-------|
| `apps/api/` on Fly | OAuth, `/api/me`, `/api/search` |
| API domain | `api.vibelist.dychen.net` (same-site cookies with web) |
| `/build` | Connect Spotify, test search, disconnect — **verified production** |
| CF Pages env | `PUBLIC_API_URL`, `NODE_VERSION=22` |
| Dev hosts | **127.0.0.1** (not `localhost`) for web + API cookies |

### Done (Phase 3)

| Item | Notes |
|------|-------|
| `POST /api/curate`, `/api/verify`, `/api/publish` | Step 2.2 orchestration |
| `GET /api/curate/models` | Delivery model picker (OpenAI, Anthropic, Cursor) |
| Node `llm-router` | `apps/api/src/llm-router/` — Python twin in toolbox |
| `/build` full flow | Curate → verify → publish; model resolved from API at build time |
| Fly LLM secrets | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `CURSOR_API_KEY`, `CURATE_LLM_MODEL`, `INTERVIEW_LLM_MODEL` |
| Production E2E | Interview → delivery → build → playlist URL verified |

### Not done yet (Phase 4+)

- Phase 4: LLM interview (`POST /api/interview/next`), dychen.net nav, Spotify app review
- Optional: Supabase migration for `DATABASE_URL`; extract Node `llm-router` to shared npm package

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
cp .env.example .env    # Spotify + WEB_ORIGIN; add OPENAI_API_KEY or ANTHROPIC_API_KEY for curate
npm install && npm run dev
```

Spotify redirect URI: `http://127.0.0.1:3001/auth/spotify/callback`

---

## Deploy

| Layer | Host | Notes |
|-------|------|-------|
| Web | Cloudflare Pages | Git connect on `main`, root `apps/web`, output `dist` |
| API | Fly.io | `create-playlist-api` → `api.vibelist.dychen.net` |

See [docs/DASHBOARD-OPS.md](./docs/DASHBOARD-OPS.md) for full dashboard checklist.

---

## Related repos

- [spotify-mcp-server](https://github.com/Harrinive/spotify-mcp-server) — Spotify Web API helpers
- [toolbox](https://github.com/Harrinive/toolbox) — `llm-router`
- [dychen.net](https://github.com/Harrinive/dychen.net) — Astro + CF Pages pattern
- [Cycloud](https://github.com/Harrinive/Cycloud) — Fly.io + secrets reference
