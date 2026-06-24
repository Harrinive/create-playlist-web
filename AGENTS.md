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
| Phase | **Phase 1 complete** — prompt-only MVP live on CF Pages |
| Frontend | `apps/web/` — Astro 6, [astro-whono](https://github.com/cxro/astro-whono)-style UI |
| Interview | Static 5-step wizard (M1–M5), EN + 中文 UI toggle |
| Delivery | `/delivery` — Prompt vs Build fork (skill Step 2) |
| Prompt | Client-side Step 2.1 paragraph (`build-prompt.ts`), copy button |
| Build path | `/build` — **placeholder**; awaits Phase 2 API + OAuth |
| API / OAuth | **Not started** (`apps/api/` does not exist yet) |
| Spotify Developer app | TBD |
| Domain / CF Pages | **vibelist.dychen.net** — Pages Git connect (same pattern as dychen.net) |

### Shipped (Phase 1)

- Landing (`/`), interview wizard (`/interview`), delivery choice (`/delivery`), prompt (`/prompt`)
- Session storage for answers; draft resume via `sessionStorage`
- Bilingual interview labels (Chinese mode); **English prompt output** always
- Sidebar utilities: **EN / 中文**, **Start over**, **Last prompt**, theme (light / dark / system)
- Deployed to Cloudflare Pages (`apps/web`, root `apps/web`, output `dist`)

### Phase 2 progress (frontend prep only)

Work done so far **does not include a backend** — it wires the UI for the full build path:

| Item | Status |
|------|--------|
| `/delivery` — Prompt vs Build choice | Done (`delivery.astro`, `delivery-page.ts`) |
| Interview → `/delivery` (not straight to prompt) | Done |
| `/build` placeholder + session guard | Done (`build.astro`, `build-page.ts`) |
| `wrangler.toml` (Pages output dir) | Done |
| `.github/workflows/deploy-web.yml` | Optional; CF Git deploy is primary (no repo secrets needed) |
| `apps/api/` Fly + Neon skeleton | **Not started** |
| Spotify OAuth login/logout | **Not started** |
| Port `spotifyFetch` / search from spotify-mcp-server | **Not started** |

### Next recommended work (Phase 2 backend)

1. Create Spotify Developer app; redirect URI → Fly API callback
2. Scaffold `apps/api/` on Fly.io + Neon (sessions, refresh tokens)
3. `GET /auth/spotify`, callback, logout; CORS `WEB_ORIGIN=https://vibelist.dychen.net`
4. Port search helpers from [spotify-mcp-server](https://github.com/Harrinive/spotify-mcp-server)
5. Wire `/build` to “Connect Spotify” → API (replace placeholder copy)

Phase 3 after that: `POST /api/curate`, verify, publish (~20 tracks).

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

**Today:** static Astro only — no API.

MCP is **not** used in production. Port `createSpotifyApi` / `spotifyFetch` from `Programs/Packages/spotify-mcp-server`.

---

## Skill → web mapping

| Skill | Web | Status |
|-------|-----|--------|
| Step 1 interview | `/interview` — chip wizard | Done (static bank) |
| Step 2 delivery choice | `/delivery` — Prompt vs Build | Done |
| Step 2.1 | `/prompt` — copyable paragraph | Done |
| Step 2.2 build | `/build` + API | Placeholder UI only; API not started |

**Hard rules from skill:** verify/publish must not re-curate or reorder from scratch; trim preserves propose order; offer prompt fallback if verify &lt;50% ok.

---

## Key files (implemented)

```text
apps/web/
├── src/pages/
│   ├── index.astro
│   ├── interview.astro
│   ├── delivery.astro         # Step 2 fork
│   ├── prompt.astro
│   └── build.astro            # Phase 2 placeholder
├── src/scripts/
│   ├── interview-wizard.ts
│   ├── delivery-page.ts
│   ├── build-page.ts
│   ├── prompt-page.ts
│   ├── app-toolbar.ts
│   └── sidebar-theme.ts
├── src/lib/
│   ├── interview-questions.ts
│   ├── build-prompt.ts
│   └── locale.ts
└── wrangler.toml

# Not yet:
apps/api/                      # Phase 2 backend
packages/shared/               # Optional shared types
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
