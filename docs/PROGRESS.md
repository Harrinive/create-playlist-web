# Progress log — create-playlist-web

Chronological record through **Phase 4 complete** (June 2026).

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

## Phase 3 — Curate + verify + publish (complete)

### Backend (`apps/api/`)

| Item | Detail |
|------|--------|
| `POST /api/curate` | Step 2.2.3 via Node `llm-router` — OpenAI, Anthropic, Cursor |
| `GET /api/curate/models` | Lists models from `model-catalog.ts` (incl. `cursor:composer-2.5`) |
| `POST /api/verify` | Batched Spotify search, match rules, cooldown, trim to ~20 (preserve order) |
| `POST /api/publish` | Private playlist create + add tracks; per-user playlist memory (Postgres / in-memory dev) |
| `apps/api/src/llm-router/` | Extractable Node gateway; Python twin in toolbox `packages/llm-router/` |
| Model catalog | `apps/api/src/model-catalog.ts` — Composer 2.5 (curation only), GPT-5.4 mini, Claude Haiku 4.5, Claude Sonnet 4.6 |

### Frontend (`apps/web/`)

| Item | Detail |
|------|--------|
| `/build` | Full flow: curate → verify → publish; results table; &lt;50% verify → prompt fallback |
| `/delivery` | Dynamic model picker — prompt + one button per available curation model |
| Build reliability | Resolve curation model from API at click time; AbortController on page re-init |
| Model session | `sessionStorage` key `create-playlist-curate-model`; passed to `/api/curate` |
| Dev preview | `CATALOG_CURATE_MODELS` when API has no LLM keys (layout only) |

### Frontend lifecycle cleanup (2026-06-24)

| Item | Detail |
|------|--------|
| `/delivery` | Static `CATALOG_CURATE_MODELS` first paint; API refine; no duplicate boot |
| Interview model picker | Static `CATALOG_INTERVIEW_MODELS` in sidebar; API refine via `sameModelIds` |
| Page lifecycle | `AbortController` on delivery, build, prompt, interview wizard; build fetches use `signal` |
| Session keys | Centralized in `apps/web/src/lib/session-keys.ts`; `startOver` clears all user keys |
| Shared UI | `InterviewMissing.astro` for delivery / prompt / build empty states |
| App toolbar | Resize listener bound once (fixes ClientRouter leak) |

### Bugs fixed during Phase 3

| Bug | Cause | Fix |
|-----|-------|-----|
| Theme missing in `astro dev` | `global.css?url` + manual `<link>` — Vite serves path as JS in dev | Import `../styles/global.css` in `BaseHead.astro` (commit `fa42168`) |
| Build flashes then fails | Stale `sessionStorage` model slug; Astro double-init on `/build` | `resolveBuildModel()` at curate time; single init with `AbortController` |
| “Model not available on this server” | Dev preview or stale slug not in API catalog | Server-side `normalizeModelId`; delivery respects `llmConfigured` |

### Commits (Phase 3)

| Commit | Summary |
|--------|---------|
| `e34bf77` | Phase 3 API routes + build UI (curate / verify / publish) |
| `fa42168` | Fix theme CSS in Astro dev |
| `124086b` | Delivery model picker + `CURATE_LLM_MODEL` + dev preview models |
| _(this commit)_ | Node `llm-router` + Cursor provider; build fixes; Phase 3 docs |

### Production ops (Phase 3)

| Step | Status |
|------|--------|
| Fly LLM secrets (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `CURSOR_API_KEY`, `CURATE_LLM_MODEL`) | Done |
| Cursor cloud (`CURSOR_LLM_RUNTIME=cloud`, `CURSOR_CLOUD_REPO`) | Done on Fly |
| Web + API deploy from `main` | Auto via CF Pages Git + `deploy-api.yml` |
| E2E: interview → delivery (model) → build → playlist URL | **Verified** on allowlisted user |

**Phase 3 exit criteria met:** full Step 2.2 on production with user-chosen curation model.

---

## Phase 4 — LLM interview (complete)

### Backend (`apps/api/`)

| Item | Detail |
|------|--------|
| `POST /api/interview/next` | Generate or refresh one interview step from prior answers + rejected stems |
| `GET /api/interview/models` | Interview model roster (OpenAI + Anthropic; separate from curation catalog) |
| `apps/api/src/llm/interview/` | Per-turn algorithm: plan → draft → verify (+ optional revise); `INTERVIEW_ALGORITHM_MODE=fast\|full` |
| `INTERVIEW_LLM_MODEL` | Server default when client omits `model` on `/api/interview/next` |
| `LLM_MODEL` removed | Use `CURATE_LLM_MODEL` and `INTERVIEW_LLM_MODEL` only |

### Frontend (`apps/web/`)

| Item | Detail |
|------|--------|
| Interview always via API | Static question bank removed (`interview-questions.ts` → `interview-meta.ts`) |
| Sidebar model picker | Fetches `/api/interview/models`; stores slug in `sessionStorage` (like delivery curation) |
| **New question** | `POST /api/interview/next` with `refresh: true` + rejected stems |
| Bilingual UX | Chinese site copy; stems/options show Chinese + lighter English subline |
| Chinese publish metadata | `buildPlaylistMetadata(answers, locale)` at publish |
| Delivery locale fix | `applyLocaleToDocument()` after async model buttons append |

### Bugs fixed during Phase 4

| Bug | Cause | Fix |
|-----|-------|-----|
| Delivery buttons empty in 中文 | Dynamic buttons missed locale apply | `delivery-page.ts` + `locale-changed` listener |
| **New question** dead until language switch | Double `bootInterview()` left stale DOM | Session guard + event delegation; single boot on `astro:page-load` |
| Chip checkmark on new line | Flex layout on multi-line labels | CSS grid on `.chip-option` |
| API crash loop on Fly | Invalid `CURSOR_CLOUD_REPO` secret | Set valid GitHub URL on Fly |

### Production ops (Phase 4)

| Step | Status |
|------|--------|
| `DATABASE_URL` → Supabase | Done |
| `CURSOR_CLOUD_REPO` valid on Fly | Done |
| `CURATE_LLM_MODEL` on Fly | `anthropic:claude-sonnet-4-6` (default curation) |
| `INTERVIEW_LLM_MODEL` on Fly | Optional — code default `openai:gpt-5.4-mini` |
| Production smoke: `/health`, interview models, AI interview, build | **Verified** |

**Phase 4 exit criteria met:** LLM interview with model picker and refresh on production.

### Model roster (June 2026)

Central catalog: **`apps/api/src/model-catalog.ts`** — edit one file to change interview + curation pickers.

| Slug | Interview default | Curation default |
|------|-------------------|------------------|
| `cursor:composer-2.5` | — | option |
| `openai:gpt-5.4-mini` | **✓** | option |
| `anthropic:claude-haiku-4-5` | option | option |
| `anthropic:claude-sonnet-4-6` | option | **✓** (Fly `CURATE_LLM_MODEL` + `DEFAULT_CURATE_MODEL_ID`) |

Defaults live in `model-catalog.ts` (`DEFAULT_INTERVIEW_MODEL_ID`, `DEFAULT_CURATE_MODEL_ID`).

Per-turn interview algorithm (`INTERVIEW_ALGORITHM_MODE=full`), sidebar algorithm toggle, and `LLM_MODEL` removal shipped in same release window.

---

## Phase 3 — earlier notes (archive)

### Backend (`apps/api/`) — initial ship

| Item | Detail |
|------|--------|
| `POST /api/curate` | OpenAI / Anthropic chat for Step 2.2.3 (~26 proposed lines); `CURATE_LLM_MODEL` default |
| LLM client | Initially hand-rolled fetch in `apps/api/src/llm/client.ts` — replaced by `llm-router` |

### Frontend — initial ship

| Item | Detail |
|------|--------|
| Copy / footer | Home Step 2–3 updated; footer *Vibelist — mood interview → Spotify* |

### Local dev (Phase 3)

| Step | Detail |
|------|--------|
| Web | `http://127.0.0.1:4321` — `PUBLIC_API_URL=http://127.0.0.1:3001` in `apps/web/.env` |
| API | `http://127.0.0.1:3001` — at least one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `CURSOR_API_KEY` |
| Cursor local | `CURSOR_LLM_RUNTIME=local` in `apps/api/.env` |
| Full build | Spotify OAuth + LLM key(s); user on Spotify app allowlist |

---

## CI / deploy model (current)

| Path | Trigger | Notes |
|------|---------|-------|
| **Cloudflare Pages Git connect** | Push to `main` | **Canonical** web deploy; no GitHub secrets needed |
| `.github/workflows/deploy-web.yml` | Manual (`workflow_dispatch` only) | Optional; needs CF API token if used |
| `.github/workflows/deploy-api.yml` | Push to `main` when `apps/api/**` changes | Needs `FLY_API_TOKEN` in GitHub secrets |

---

## Not done yet

| Item | Notes |
|------|-------|
| dychen.net nav link | Deferred |
| Spotify app review | Public users beyond Dev Mode allowlist |
| Interview skill parity | **Partial** — `full` mode runs plan/draft/verify pipeline; not a Cursor agent |
| Ops optional | Extract Node `llm-router` to toolbox npm; narrow CF build watch paths |

### Interview generation vs skill

The Cursor skill runs the full **per-turn algorithm** privately before each question. The web API **`full` mode** (`INTERVIEW_ALGORITHM_MODE=full`, default) approximates this with three chat calls per question:

1. **Plan** — gap check, hypotheses, axis, scene beat, filter drops  
2. **Draft** — bilingual stem + options JSON  
3. **Verify** — consistency, Q1 coverage, partition, creativity; one revise if needed  

`fast` mode keeps the original single-call path. Deterministic filter hints live in `interview/filter.ts`. This is still not a Cursor agent — latency stays suitable for the chip wizard (~5–15s per question on GPT/Claude).

---

## Key lessons (for future agents)

1. **OAuth session cookies require same-site alignment** — match registrable domain (e.g. `*.dychen.net`), not just HTTPS.
2. **Astro env vars are build-time** — changing `PUBLIC_API_URL` in CF requires a new Pages build.
3. **Spotify redirect URI must exactly match** the API callback URL including host (`127.0.0.1` vs `localhost` matters).
4. **CF Pages “Retry deployment”** — row menu (⋮) or deployment Details; push to `main` also triggers auto deploy.
5. **Astro CSS in dev** — import styles in layout/frontmatter; do not use `?url` + `<link rel="stylesheet">` for global theme.
6. **LLM keys on Fly** — at least one of `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `CURSOR_API_KEY` for `/api/curate` and `/api/interview/next`; set `CURATE_LLM_MODEL` and optionally `INTERVIEW_LLM_MODEL` to match provider. Cursor on Fly needs `CURSOR_LLM_RUNTIME=cloud` + valid `CURSOR_CLOUD_REPO`.
7. **Node vs Python llm-router** — Vibelist uses `apps/api/src/llm-router/`; Cycloud uses toolbox `packages/llm-router/`. Keep model slugs and env vars aligned; see README in each package.

---

## Interview UX (June 2026)

### Shipped

| Item | Detail |
|------|--------|
| Stacked interview | Questions appear below prior answers; retro-edit with confirm clears downstream |
| Sidebar toolbar | Language + **interview model** dropdown (API roster); mobile **Menu** panel |
| **New question** | Active step only — rejected stem in `sessionStorage`; LLM regen via API |
| LLM step cache | `sessionStorage` `create-playlist-interview-llm-steps` for back-navigation |

---

## References

- [DASHBOARD-OPS.md](./DASHBOARD-OPS.md) — URLs, dashboard settings, secret locations (no values in git)
- [AGENTS.md](../AGENTS.md) — agent handoff
- [PLAN.md](../PLAN.md) — architecture and phases
