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

## Current status (2026-06-24)

| Item | State |
|------|-------|
| Repo / git | **Public** — `Harrinive/create-playlist-web`, `main` |
| Phase | **Phase 3 complete** — curate / verify / publish + Cursor curation |
| Frontend | `apps/web/` — Astro 6, Whono-style UI |
| Interview | Stacked static wizard (M1–M5), EN + 中文; **New question** refresh on active step (LLM regen Phase 4) |
| Delivery | `/delivery` — Prompt + per-model tracklist options (Step 2.2.3) |
| Prompt | Client-side Step 2.1 (`build-prompt.ts`) |
| Build path | `/build` — OAuth + curate → verify → publish UI |
| API | `apps/api/` on Fly — `api.vibelist.dychen.net` |
| Live web | **https://vibelist.dychen.net** |
| Ops docs | [docs/PROGRESS.md](./docs/PROGRESS.md), [docs/DASHBOARD-OPS.md](./docs/DASHBOARD-OPS.md) |

### Shipped (Phase 1)

- Landing (`/`), interview wizard (`/interview`), delivery choice (`/delivery`), prompt (`/prompt`)
- Session storage for answers; draft resume via `sessionStorage`
- Bilingual interview labels (Chinese mode); **English prompt output** always
- Sidebar utilities: language + interview model dropdowns, mobile Menu panel, Start over (interview), Last prompt/result, theme (light / dark / system)
- Deployed to Cloudflare Pages (Git connect, root `apps/web`, output `dist`)

### Phase 2 (complete)

| Item | Status |
|------|--------|
| `apps/api/` Fastify server | Done — health, OAuth, `/api/me`, `/api/search` |
| Spotify OAuth (auth code flow) | Done — verified locally and production |
| Token store (Postgres or in-memory dev) | Done — Fly `DATABASE_URL` in prod |
| `/build` Connect Spotify UI | Done |
| Fly deploy `create-playlist-api` | Done |
| API custom domain `api.vibelist.dychen.net` | Done — TLS Issued; same-site cookies |
| CF Pages `PUBLIC_API_URL` + `NODE_VERSION` | Done |
| Spotify production redirect URI | Done |
| GitHub `deploy-api.yml` | Optional — needs `FLY_API_TOKEN` |
| Web deploy | CF Pages Git connect on push to `main` |

**Phase 2 exit criteria:** met — connect Spotify → search tracks (production verified).

### Phase 3 (complete)

| Item | Status |
|------|--------|
| `POST /api/curate`, `/api/verify`, `/api/publish` | Done |
| `GET /api/curate/models` + delivery model picker | Done |
| Node `llm-router` (`apps/api/src/llm-router/`) | Done — OpenAI, Anthropic, Cursor (`@cursor/sdk`) |
| `CURSOR_API_KEY` + `cursor:composer-2.5` at delivery | Done — verified local + production |
| Per-user playlist memory (Postgres) | Done |
| `/build` end-to-end UI + results table | Done |
| Build model resolution + Astro double-init fix | Done |
| Production E2E curate → publish | **Verified** (allowlisted user) |

**Phase 3 exit criteria:** met — interview → delivery (model) → build → playlist on production.

### Next recommended work

1. **Phase 4 interview LLM:** wire **New question** refresh → `POST /api/interview/next` with rejected stems (`differentFromInstruction`)
2. Optional: migrate `DATABASE_URL` to Supabase; Spotify app review for public users
3. Optional: extract Node `llm-router` to toolbox npm when a second Node consumer exists
4. Link from dychen.net nav

---

## Read order

1. **This file** — scope and constraints
2. **[PLAN.md](./PLAN.md)** — architecture, phases, stack
3. **[docs/PROGRESS.md](./docs/PROGRESS.md)** — shipped work and bug fixes
4. **[docs/DASHBOARD-OPS.md](./docs/DASHBOARD-OPS.md)** — CF / Fly / Spotify / GitHub settings
5. **Skill router:** `~/.cursor/skills/create-playlist/SKILL.md`
6. **For Step 2.2 API mapping:** `step-2-2-mcp-fallback.md` (direct Spotify Web API, not MCP)
7. **Reference apps:** [dychen.net](https://github.com/Harrinive/dychen-net) (Astro/CF deploy pattern), [Cycloud](https://github.com/Harrinive/Cycloud) (Fly/secrets)
8. **UI reference:** [astro-whono](https://github.com/cxro/astro-whono) (theme ported into `apps/web/src/styles/`)
9. **Shared libs:** [toolbox/AGENTS.md](https://github.com/Harrinive/toolbox/blob/main/AGENTS.md)

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
| Step 2 delivery choice | `/delivery` — Prompt + model picker | Done |
| Step 2.1 | `/prompt` — copyable paragraph | Done |
| Step 2.2 build | `/build` + API | Curate / verify / publish + Cursor via Node `llm-router` |

**Hard rules from skill:** verify/publish must not re-curate or reorder from scratch; trim preserves propose order; offer prompt fallback if verify &lt;50% ok.

---

## Key files (implemented)

```text
apps/web/          # Astro — interview, delivery, prompt, build UI
apps/api/          # Fastify — OAuth, curate, verify, publish (see apps/api/README.md)
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

**Resolved:** repo public; UI theme = astro-whono; domain = `vibelist.dychen.net`; API = `api.vibelist.dychen.net`; CF Pages via Git connect; Phase 2 OAuth production verified.
