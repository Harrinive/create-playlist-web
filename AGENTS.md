# Agent guide — create-playlist-web

**Start here** if you are implementing the Spotify music recommendation website.

**Local path:** `Programs/create-playlist-web/`  
**GitHub:** https://github.com/Harrinive/create-playlist-web  
**Live site:** https://vibelist.dychen.net (Cloudflare Pages)  
**Full plan:** [PLAN.md](./PLAN.md)  
**Product behavior (canonical):** `~/.cursor/skills/create-playlist/` — interview rules, Step 2.1 prompt format, Step 2.2 verify/publish algorithm

---

## One-sentence summary

Build a **web version of the create-playlist skill**: Astro interview UI on Cloudflare Pages + optional Fly.io API for per-user Spotify OAuth and ~20-track playlist publish.

---

## Current status (2026-06-23)

| Item | State |
|------|-------|
| Repo / git | **Public** — `Harrinive/create-playlist-web`, `main` |
| Phase | **Phase 2 local complete** — OAuth + search verified; Fly deploy pending |
| Frontend | `apps/web/` — Astro 6, Whono-style UI |
| Interview | Static 5-step wizard (M1–M5), EN + 中文; Continue-button fix shipped |
| Delivery | `/delivery` — Prompt vs Build |
| Prompt | Client-side Step 2.1 (`build-prompt.ts`) |
| Build path | `/build` — Connect Spotify + test search (`PUBLIC_API_URL`) |
| API | `apps/api/` — Fastify, OAuth, Postgres or in-memory dev store |
| Live web | **vibelist.dychen.net** (prompt path; build awaits Fly + `PUBLIC_API_URL`) |

### Shipped (Phase 1)

- Landing (`/`), interview wizard (`/interview`), delivery choice (`/delivery`), prompt (`/prompt`)
- Session storage for answers; draft resume via `sessionStorage`
- Bilingual interview labels (Chinese mode); **English prompt output** always
- Sidebar utilities: **EN / 中文**, **Start over**, **Last prompt**, theme (light / dark / system)
- Deployed to Cloudflare Pages (`apps/web`, root `apps/web`, output `dist`)

### Phase 2 progress

| Item | Status |
|------|--------|
| `apps/api/` Fastify server | Done — health, OAuth, `/api/me`, `/api/search` |
| Spotify OAuth (auth code flow) | Done — verified locally |
| Token store (Postgres or in-memory dev) | Done |
| `/build` Connect Spotify UI | Done |
| Interview Continue button (first visit) | Fixed — Astro double-init |
| Dev cookie host | **127.0.0.1** for web + API (not `localhost`) |
| `dotenv` loads `apps/api/.env` | Done |
| Fly.io deploy + Neon production DB | **Not deployed** |
| `PUBLIC_API_URL` on CF Pages | **Not set** |

**Phase 2 exit criteria:** met locally (connect Spotify → search one track).

### Next recommended work

1. Commit pushed → `fly deploy` `apps/api` + Neon `DATABASE_URL`
2. Fly secrets: `SPOTIFY_*`, `SESSION_SECRET`, `WEB_ORIGIN=https://vibelist.dychen.net`
3. Spotify dashboard: production redirect URI on Fly hostname
4. Cloudflare Pages: `PUBLIC_API_URL=https://create-playlist-api.fly.dev` → redeploy web
5. **Phase 3:** `POST /api/curate`, verify loop, publish playlist

---

## Read order

1. **This file** — scope and constraints
2. **[PLAN.md](./PLAN.md)** — architecture, phases, stack
3. **Skill router:** `~/.cursor/skills/create-playlist/SKILL.md`
4. **For Step 2.2 API mapping:** `step-2-2-mcp-fallback.md` (direct Spotify Web API, not MCP)
5. **Reference apps:** [dychen.net](https://github.com/Harrinive/dychen-net) (Astro/CF deploy pattern), [Cycloud](https://github.com/Harrinive/Cycloud) (Fly/secrets)
6. **UI reference:** [astro-whono](https://github.com/cxro/astro-whono) (theme ported into `apps/web/src/styles/`)
7. **Shared libs:** [toolbox/AGENTS.md](https://github.com/Harrinive/toolbox/blob/main/AGENTS.md)

---

## Architecture (short)

```text
Astro (CF Pages)  ──API──►  Node or Python API (Fly.io)   [Phase 2+]
                              ├── Spotify OAuth (per user)
                              ├── llm-router (curate tracklist)
                              └── spotify-mcp-server utils (search, publish)
```

**Today:** static web on CF Pages; API runs separately (local or Fly) for build path.

MCP is **not** used in production. Port `createSpotifyApi` / `spotifyFetch` from `Programs/Packages/spotify-mcp-server`.

---

## Skill → web mapping

| Skill | Web | Status |
|-------|-----|--------|
| Step 1 interview | `/interview` — chip wizard | Done (static bank) |
| Step 2 delivery choice | `/delivery` — Prompt vs Build | Done |
| Step 2.1 | `/prompt` — copyable paragraph | Done |
| Step 2.2 build | `/build` + API | OAuth + search done locally; curate/publish Phase 3 |

**Hard rules from skill:** verify/publish must not re-curate or reorder from scratch; trim preserves propose order; offer prompt fallback if verify &lt;50% ok.

---

## Key files (implemented)

```text
apps/web/          # Astro — interview, delivery, prompt, build UI
apps/api/          # Fastify — OAuth, /api/me, /api/search (see apps/api/README.md)
```

---

## Agent rules

1. **Skill is product spec** — don't invent new interview logic; port from skill docs.
2. **Minimize scope** — prompt-only before OAuth unless user requests full build.
3. **Reuse existing repos** — don't duplicate Spotify or LLM code; extract to shared package when stable.
4. **Match Harry's deploy pattern** — CF Pages for static (Git connect), Fly for secrets/DB.
5. **No commits/push** unless user asks.
6. **English deliverables** — playlist names, prompts, track notes stay English (Chinese mode = bilingual interview labels only).

---

## Open questions

See [PLAN.md § Open decisions](./PLAN.md#open-decisions): API language (Node vs Python), interview LLM vs static (static chosen for v1).

**Resolved:** repo public; UI theme = astro-whono; domain = `vibelist.dychen.net`; CF Pages via Git connect (not GitHub Actions secrets).
