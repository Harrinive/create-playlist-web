# Progress log — create-playlist-web

Chronological record through **Phase 3 in progress** (June 2026).

---

## Phase 0–1 — Prompt-only MVP (complete)

| Date / milestone | What shipped |
|------------------|--------------|
| Repo scaffold | Public repo `Harrinive/create-playlist-web`, Astro 6 + Whono-style UI |
| Interview | Static 5-step wizard (M1–M5), EN + 中文 labels, `sessionStorage` draft |
| Step 2.1 | `/prompt` — client-side paragraph via `build-prompt.ts`, copy button |
| Step 2 delivery | `/delivery` — Prompt vs Build fork (skill Step 2) |
| Sidebar | EN/中文, Start over, Last prompt, light/dark/system theme |
| Deploy | Cloudflare Pages Git connect → **https://vibelist.dychen.net** |
| Commits | `8de0b35` delivery + CF config, `3b23fea` Phase 1 docs |

**Exit criteria met:** User completes interview and copies a valid Spotify Prompted Playlist paragraph.

---

## Phase 2 — API + OAuth (complete locally and in production)

### Backend (`apps/api/`)

| Item | Detail |
|------|--------|
| Stack | Fastify, TypeScript, `dotenv`, Zod config |
| Routes | `/health`, `/auth/spotify`, `/auth/spotify/callback`, `POST /auth/logout`, `GET /api/me`, `GET /api/search?q=` |
| Token store | Postgres via `DATABASE_URL` (production); in-memory fallback for dev without DB |
| Session cookie | `cp_session`, httpOnly; `SameSite=Lax` when web + API share `*.dychen.net` |
| Spotify scopes | `playlist-modify-private`, `playlist-modify-public`, `user-read-private` |
| CORS | Strict `WEB_ORIGIN` in production; any localhost port in dev |
| Deploy | Fly.io app `create-playlist-api`, region `ord`, Dockerfile build |
| Commit | `55709fc` Phase 2 API scaffold |

### Frontend (`apps/web/`)

| Item | Detail |
|------|--------|
| `/build` | Connect Spotify, session check, test search, disconnect |
| API config | `PUBLIC_API_URL` at build time; fallback to `https://api.vibelist.dychen.net` on vibelist hostname |
| Dev binding | Astro `server.host: '127.0.0.1'` (not `localhost`) for cookie same-site rules |

### Bugs fixed during Phase 2

| Bug | Cause | Fix |
|-----|-------|-----|
| Interview Continue dead on first visit | Double init (`bootInterview` + `astro:page-load`) | Single init with `AbortController` in `interview-wizard.ts` |
| API “Required” env errors on start | `dotenv` not loaded | `import 'dotenv/config'` in `config.ts` |
| Local OAuth: back to Connect screen | `localhost` vs `127.0.0.1` are different sites | Document + enforce 127.0.0.1 for web and API in dev |
| Production OAuth: same symptom | Web on `vibelist.dychen.net`, API on `create-playlist-api.fly.dev` (cross-site; third-party cookies blocked) | Custom domain **`api.vibelist.dychen.net`** on Fly; `SameSite=Lax` cookies |
| Build page “API not configured” | `PUBLIC_API_URL` unset at CF build time | Code fallback + CF env var |
| GitHub “Deploy web” email failures | Workflow needs `CLOUDFLARE_API_TOKEN` not set | Workflow changed to **manual only**; CF Git connect is canonical deploy |

### Production deploy (June 2026)

| Step | Status |
|------|--------|
| Fly app `create-playlist-api` deployed | Done |
| Fly secrets (`SPOTIFY_*`, `SESSION_SECRET`, `WEB_ORIGIN`, `DATABASE_URL`) | Done |
| Fly TLS cert `api.vibelist.dychen.net` | **Issued** (Let's Encrypt) |
| DNS `api.vibelist` → Fly (`CNAME le60ye1.create-playlist-api.fly.dev` or A/AAAA) | Done |
| Spotify redirect URI for production API host | Done |
| CF Pages env: `PUBLIC_API_URL`, `NODE_VERSION=22` | Done |
| CF Pages build: root `apps/web`, output `dist`, branch `main` | Done |
| End-to-end test: Connect Spotify → search (e.g. “lane 8”) | **Verified** |
| Commits | `c04b3ea` Fly URL fallback, `a606b52` api.vibelist + cookie fix |

**Phase 2 exit criteria met:** User connects Spotify on production; server searches tracks on their behalf.

---

## Phase 3 — Curate + verify + publish (in progress)

### Backend (`apps/api/`)

| Item | Detail |
|------|--------|
| `POST /api/curate` | OpenAI / Anthropic chat for Step 2.2.3 (~26 proposed lines); `CURATE_LLM_MODEL` default |
| `GET /api/curate/models` | Lists models available from configured API keys |
| `POST /api/verify` | Batched Spotify search, match rules, cooldown, trim to ~20 (preserve order) |
| `POST /api/publish` | Private playlist create + add tracks; per-user playlist memory (Postgres / in-memory dev) |
| LLM client | Hand-rolled fetch in `apps/api/src/llm/` — not llm-router or Cursor yet |
| Model catalog | `apps/api/src/llm/models.ts` — GPT-4o, GPT-4o mini, Claude Sonnet (filtered by keys) |

### Frontend (`apps/web/`)

| Item | Detail |
|------|--------|
| `/build` | Full flow: curate → verify → publish; results table; &lt;50% verify → prompt fallback |
| `/delivery` | Dynamic model picker — prompt + one button per available curation model |
| Model session | `sessionStorage` key `create-playlist-curate-model`; passed to `/api/curate` |
| Dev preview | `DEV_PREVIEW_CURATE_MODELS` in `astro dev` when API has no LLM keys (layout only) |
| Copy / footer | Home Step 2–3 updated; footer *Vibelist — mood interview → Spotify* |

### Bugs fixed during Phase 3

| Bug | Cause | Fix |
|-----|-------|-----|
| Theme missing in `astro dev` | `global.css?url` + manual `<link>` — Vite serves path as JS in dev | Import `../styles/global.css` in `BaseHead.astro` (commit `fa42168`) |

### Commits (Phase 3)

| Commit | Summary |
|--------|---------|
| `e34bf77` | Phase 3 API routes + build UI (curate / verify / publish) |
| `fa42168` | Fix theme CSS in Astro dev |
| `124086b` | Delivery model picker + `CURATE_LLM_MODEL` + dev preview models |

### Local dev (Phase 3)

| Step | Detail |
|------|--------|
| Web | `http://127.0.0.1:4321` — `PUBLIC_API_URL=http://127.0.0.1:3001` in `apps/web/.env` |
| API | `http://127.0.0.1:3001` — add `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` for real curate |
| UI-only preview | No LLM keys needed — delivery shows dev preview model buttons |
| Full build | Spotify OAuth + at least one LLM key on API; user on Spotify app allowlist |

### Production ops (Phase 3)

| Step | Status |
|------|--------|
| Fly LLM secrets (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, `CURATE_LLM_MODEL`) | User set — **E2E build not yet logged in PROGRESS** |
| Web + API deploy from `main` | Auto via CF Pages Git + `deploy-api.yml` |

**Phase 3 exit criteria:** not yet met — need production E2E curate → verify → publish on allowlisted user; **Cursor provider** still open (see [PLAN.md](../PLAN.md)).

---

## CI / deploy model (current)

| Path | Trigger | Notes |
|------|---------|-------|
| **Cloudflare Pages Git connect** | Push to `main` | **Canonical** web deploy; no GitHub secrets needed |
| `.github/workflows/deploy-web.yml` | Manual (`workflow_dispatch` only) | Optional; needs CF API token if used |
| `.github/workflows/deploy-api.yml` | Push to `main` when `apps/api/**` changes | Needs `FLY_API_TOKEN` in GitHub secrets |

---

## Not done yet — Phase 3 remainder + Phase 4

| Phase | Work |
|-------|------|
| **Phase 3** | Production E2E verify; **Cursor provider** (`cursor:` + `CURSOR_API_KEY`); optional llm-router unification |
| **Phase 4** | LLM interview questions (`INTERVIEW_LLM_MODEL`), dychen.net nav link, Spotify app review for public users |
| **Ops optional** | Migrate `DATABASE_URL` to Supabase/Neon; narrow CF build watch paths to `apps/web/**` |

---

## Key lessons (for future agents)

1. **OAuth session cookies require same-site alignment** — match registrable domain (e.g. `*.dychen.net`), not just HTTPS.
2. **Astro env vars are build-time** — changing `PUBLIC_API_URL` in CF requires a new Pages build.
3. **Spotify redirect URI must exactly match** the API callback URL including host (`127.0.0.1` vs `localhost` matters).
4. **CF Pages “Retry deployment”** — row menu (⋮) or deployment Details; push to `main` also triggers auto deploy.
5. **Astro CSS in dev** — import styles in layout/frontmatter; do not use `?url` + `<link rel="stylesheet">` for global theme.
6. **LLM keys on Fly** — at least one of `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` for `/api/curate`; set `CURATE_LLM_MODEL` to match provider.

---

## References

- [DASHBOARD-OPS.md](./DASHBOARD-OPS.md) — URLs, dashboard settings, secret locations (no values in git)
- [AGENTS.md](../AGENTS.md) — agent handoff
- [PLAN.md](../PLAN.md) — architecture and phases
