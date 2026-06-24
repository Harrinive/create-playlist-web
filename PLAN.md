# create-playlist-web — project plan

Replace the Cursor-only `/create-playlist` flow with a **public website** where anyone can run the interview, get a Spotify Prompted Playlist paragraph, or (optionally) connect Spotify and publish a verified ~20-track playlist.

**Local path:** `Programs/create-playlist-web/`  
**Skill spec (source of truth for product behavior):** `~/.cursor/skills/create-playlist/`  
**Target domain:** `vibelist.dychen.net` (Cloudflare Pages)

---

## Problem & goal

| Today | Target |
|-------|--------|
| Interview + delivery only inside Cursor | Same UX in a browser |
| Step 2.2 requires `user-spotify` MCP + Harry's tokens | Per-visitor **Spotify OAuth**; each user publishes to their own account |
| Step 2.1 works anywhere (paste prompt into Spotify app) | Zero-backend **prompt-only mode** on static pages |
| LLM tracklist curation via Cursor Task subagent | Server-side LLM via **toolbox `llm-router`** |

**Non-goals for v1:** mobile native app, social/sharing feeds, playlist editing after publish, paid tiers.

---

## Product modes (from create-playlist skill)

Map skill steps to web features:

| Skill step | Web feature | Backend required? |
|------------|-------------|-------------------|
| **Step 1** — Interview (≤4 questions, M1–M5) | Multi-step UI (cards or wizard); hypothesis-driven Q1 | LLM for question generation (optional v1: fixed question bank) |
| **Step 2** — Delivery choice | Two buttons: Prompt vs Build | Build path needs auth |
| **Step 2.1** — Spotify Prompted Playlist paragraph | Show copyable English paragraph | Optional LLM call; can run client-side with API key **or** server proxy |
| **Step 2.2** — Build ~20 tracks | Search verify → trim → create playlist → add tracks | **Yes** — OAuth + Spotify Web API + LLM |

**MVP recommendation:** Ship **2.1 + interview UI** first (static Astro), then add **2.2 backend** on Fly.io.

---

## Recommended architecture

Hybrid split — same pattern as dychen.net (static) + Cycloud (stateful API):

```text
┌─────────────────────────────────────────────────────────────┐
│  Astro frontend — Cloudflare Pages (free)                   │
│  • Landing, interview wizard, prompt display                │
│  • "Connect Spotify" → redirect to API /auth/spotify        │
│  • design-tokens (dychen palette) or new playlist theme     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS /api/*
┌──────────────────────────▼──────────────────────────────────┐
│  API — Fly.io (free allowance / low cost)                     │
│  • Spotify OAuth (Authorization Code + PKCE)                  │
│  • Session / encrypted refresh tokens (Postgres or KV)        │
│  • POST /api/curate → llm-router tracklist (Step 2.2.3)       │
│  • POST /api/verify → Spotify search per line (2.2.4–2.2.5)   │
│  • POST /api/publish → create playlist + add items (2.2.6–8)  │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   Neon Postgres     Spotify Web API    OpenAI / Anthropic /
   (free tier)       (per-user token)    Cursor via llm-router
```

### Why not one stack?

| Approach | Verdict |
|----------|---------|
| **Astro only (CF Pages)** | Great for Step 2.1; cannot safely hold Spotify client secret, refresh tokens, or LLM keys |
| **Flask only (like Cycloud)** | Works, but Harry already ships marketing/content on Astro; interview UI fits Astro better |
| **Next.js on Vercel** | Fine, but duplicates dychen.net toolchain; CF Pages + Fly matches existing ops |
| **MCP in browser** | No — MCP is a Cursor/agent transport, not a web protocol |

---

## Stack choices

| Layer | Choice | Notes |
|-------|--------|-------|
| **Frontend** | Astro 6 + Whono CSS | Ported from [astro-whono](https://github.com/cxro/astro-whono); `@lucide/astro` icons; no Tailwind |
| **Frontend host** | Cloudflare Pages | Free, auto-deploy on push, custom subdomain |
| **API** | Node (Express/Fastify) **or** Python (FastAPI) | Prefer **Node** to reuse `spotify-mcp-server` TypeScript utils with minimal port |
| **API host** | Fly.io | Same as Cycloud; secrets via `fly secrets`; Dockerfile with `git` if toolbox pip deps |
| **Database** | Neon Postgres (free) | User sessions, refresh tokens, optional interview memory |
| **LLM** | toolbox `llm-router` | Chat for interview (later); JSON/text for tracklist brief (Step 2.2.3) |
| **Spotify** | Web API via extracted package | From [spotify-mcp-server](https://github.com/Harrinive/spotify-mcp-server) — see below |
| **Auth** | Spotify OAuth per user | App credentials in server env; per-user tokens in DB |

### Free-tier hosting estimate

| Service | Cost | Limit |
|---------|------|-------|
| Cloudflare Pages | $0 | Static + serverless functions (use sparingly) |
| Fly.io | $0–5/mo | 1 shared VM, auto-stop; within free allowance if low traffic |
| Neon | $0 | Free Postgres tier |
| Spotify Developer | $0 | Dev mode: allowlisted users until app review |
| LLM | Usage-based | Cursor/OpenAI/Anthropic keys already owned |

---

## Spotify integration

### Two credential layers (critical)

| Layer | What | Where |
|-------|------|-------|
| **App** | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Fly secrets — identifies *your* Developer app |
| **User** | access + refresh token | DB row per user — identifies *visitor's* Spotify account |

Every visitor clicks **Connect Spotify** → Spotify consent → callback stores refresh token server-side.

### Reuse from spotify-mcp-server

Do **not** run MCP in production. Port these modules into `packages/api/` or a future `toolbox/packages/spotify-api`:

| Module | Use |
|--------|-----|
| `createSpotifyApi()` | Search tracks (verify step) |
| `spotifyFetch()` | Create playlist, add items, token refresh |
| OAuth flow | Replace CLI `npm run auth` with web redirect handler |

**API rules** (from skill fallback doc):

- Create: `POST /v1/me/playlists` (not `/users/{id}/playlists`)
- Add tracks: `POST /v1/playlists/{id}/items` (not deprecated `/tracks`)

### Spotify Developer Dashboard

1. Create app at [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Redirect URI: `https://api.<domain>/auth/spotify/callback`
3. Scopes: `playlist-modify-private`, `playlist-modify-public`, `user-read-private` (minimal set — confirm at build time)
4. **Development mode:** add test users until Extended Quota / app review for public launch

---

## Interview UX (Step 1)

The Cursor skill uses `AskQuestion` with invented stems/options. On the web:

### Phase A — MVP (no LLM for questions)

- Fixed **4-step wizard** with curated option sets from [step-1-banks.md](file://~/.cursor/skills/create-playlist/step-1-banks.md) patterns
- Store answers in sessionStorage → build M1–M5 client-side
- Pro: shippable fast; Con: less magical than skill

### Phase B — Skill parity

- Server endpoint `POST /api/interview/next` calls `llm-router` with skill system prompt + prior answers
- Returns next stem + 4–8 options (JSON schema)
- UI renders as clickable chips (same as AskQuestion)
- **Chinese interview mode:** bilingual labels when `Accept-Language` or user toggle — deliverables stay English

**Must-ask checklist** (from skill): M1 mood/scene, M2 energy/tempo, M3 genre space, M4 avoids, M5 felt-first sonic texture — all before delivery step.

---

## Delivery flows

### Flow A — Prompt only (Step 2.1)

```text
Interview complete → user picks "Prompt for Spotify"
  → POST /api/prompt { M1..M5 }  (or client template fill)
  → display English paragraph + copy button
  → link: "Open Spotify Prompted Playlist" (spotify: URI or help text)
```

No Spotify login required. Can ship on **CF Pages only** if prompt generation is embedded or uses a single serverless function.

### Flow B — Full build (Step 2.2)

```text
Interview complete → user picks "Build on Spotify"
  → if no session: Connect Spotify
  → POST /api/curate { M1..M5, model? }     → ~20 proposed lines (Step 2.2.3)
  → POST /api/verify { lines }              → search each, mark ok/fuzzy/miss (2.2.4–5)
  → POST /api/publish { verified uris }     → create playlist, add in order (2.2.6–8)
  → show playlist URL + track table report (2.2.9)
```

**Clerk rules from skill:** verify pass must not re-curate or reorder from scratch; trim preserves propose order; offer Step 2.1 fallback if &lt;50% verify ok.

---

## Monorepo layout (proposed)

```text
create-playlist-web/
├── PLAN.md                 # this file
├── AGENTS.md               # agent runbook
├── README.md
├── apps/
│   ├── web/                # Astro — Cloudflare Pages
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── index.astro
│   │   │   │   ├── interview/
│   │   │   │   └── result/
│   │   │   └── components/
│   │   └── package.json
│   └── api/                # Node API — Fly.io
│       ├── src/
│       │   ├── auth/spotify.ts
│       │   ├── routes/
│       │   │   ├── interview.ts
│       │   │   ├── curate.ts
│       │   │   ├── verify.ts
│       │   │   └── publish.ts
│       │   └── spotify/    # ported from spotify-mcp-server
│       ├── Dockerfile
│       ├── fly.toml
│       └── package.json
├── packages/
│   └── shared/             # M1–M5 types, prompt templates, JSON schemas
└── .github/workflows/
    ├── deploy-web.yml      # CF Pages
    └── deploy-api.yml      # Fly (mirror Cycloud)
```

Alternative: two repos (`create-playlist-web` + `create-playlist-api`) — defer until deploy friction appears.

---

## Implementation phases

### Phase 0 — Scaffold (1 session)

- [x] Init git repo; push to `Harrinive/create-playlist-web`
- [x] Astro app with Whono-style shell (two-column layout, fonts)
- [x] Pages: `/`, `/interview`, `/prompt`, `/build` (placeholder)
- [x] README + AGENTS.md

### Phase 1 — Prompt-only MVP

- [x] Interview UI — static option bank covering M1–M5 (5 wizard steps)
- [x] Client prompt generation per [step-2-1-prompt.md](file://~/.cursor/skills/create-playlist/step-2-1-prompt.md)
- [x] Chinese interview mode toggle (bilingual Q/options; English prompt output)
- [x] Sidebar app toolbar (EN/中文, start over, last prompt, theme)
- [x] Step 2 delivery choice (`/delivery` — Prompt vs Build)
- [x] Deploy web to Cloudflare Pages (`vibelist.dychen.net`, Git connect)
- [x] No Spotify OAuth

**Exit criteria:** User can complete interview and copy a valid Spotify Prompted Playlist paragraph. **Met** — live at https://vibelist.dychen.net

### Phase 2 — API skeleton + OAuth

**Frontend prep (done — no backend yet):**

- [x] `/delivery` — skill Step 2 fork UI
- [x] `/build` — placeholder page + session guard; links back to prompt/delivery
- [x] Interview flow ends at `/delivery` (not `/prompt`)
- [x] `wrangler.toml` for Pages; optional GitHub Actions deploy workflow

**Backend (deployed — production verified 2026-06-23):**

- [x] `apps/api/` Fastify server (`/health`, CORS, cookies)
- [x] Spotify OAuth (`/auth/spotify`, callback, logout)
- [x] Token store (Postgres via Fly `DATABASE_URL`; in-memory dev fallback)
- [x] `GET /api/me`, `GET /api/search?q=` (auth required)
- [x] `/build` Connect Spotify UI (`PUBLIC_API_URL`)
- [x] Fly app `create-playlist-api` + secrets
- [x] API custom domain `api.vibelist.dychen.net` (same-site OAuth cookies)
- [x] Spotify Developer production redirect URI
- [x] `PUBLIC_API_URL` + `NODE_VERSION` on Cloudflare Pages

**Exit criteria:** User connects Spotify; server can search one track on their behalf. **Met** — production verified at https://vibelist.dychen.net/build

### Phase 3 — Curate + verify + publish (in progress)

**Shipped (code):**

- [x] `POST /api/curate` — Node direct OpenAI / Anthropic chat (not llm-router or Cursor yet)
- [x] `POST /api/verify` — batched Spotify search, match rules, cooldown, trim to ~20 (preserve order)
- [x] `POST /api/publish` — create private playlist, add tracks, per-user playlist memory (Postgres)
- [x] `/build` UI — curate → verify → publish + results table; prompt fallback if &lt;50% verify
- [x] **Curation model picker at delivery** — `GET /api/curate/models`; pass slug to `/api/curate`
- [x] **`CURATE_LLM_MODEL`** server default (with `LLM_MODEL` alias)
- [x] Theme CSS fix for `astro dev` (`BaseHead.astro` import)

**Remaining for Phase 3 exit:**

- [ ] Production E2E on Fly with LLM secrets set (see [Environment variables](#environment-variables-api))
- [ ] **Cursor provider** — support `cursor:` slugs (`composer-2.5`, etc.) via `CURSOR_API_KEY` + cursor-sdk or a Node port of toolbox `llm-router` Cursor path
- [ ] Optional: unify all providers through toolbox `llm-router` instead of hand-rolled OpenAI/Anthropic fetch

**Exit criteria:** End-to-end Step 2.2 parity with skill for an allowlisted Spotify test user, including user-visible model choice at delivery for Step 2.2.3.

### LLM model roles (do not conflate)

| Role | Skill step | Uses LLM? | Planned config / UX |
|------|------------|-----------|---------------------|
| **Interview** | Step 1 | Optional (Phase 4) | `INTERVIEW_LLM_MODEL` — separate from curation |
| **Curation** | Step 2.2.3 | **Yes** | User pick at `/delivery` → slug on `POST /api/curate`; server fallback `CURATE_LLM_MODEL` |
| **Orchestration** | Steps 2.2.4–2.2.9 | **No** | Deterministic API (verify, trim, publish) — no model |

Step 2.1 prompt today is client-side templates (no LLM). Orchestration must never re-curate or reorder from scratch regardless of model.

### Phase 4 — Polish

- [x] Chinese interview mode toggle *(shipped in Phase 1)*
- [ ] LLM-generated interview questions (skill parity) — uses `INTERVIEW_LLM_MODEL`, not the curation model
- [x] Per-user playlist memory in Postgres *(shipped in Phase 3)*
- [ ] Link from dychen.net nav
- [ ] Spotify app review for public users
- [ ] Extract `spotify-api` into toolbox (shared with MCP server)

---

## toolbox integration

| Package | Use in this project |
|---------|---------------------|
| **llm-router** | Tracklist curation (2.2.3), optional interview generation, prompt polish |
| **design-tokens** | UI theme — start with `dychen.css` or new `playlist.css` |
| **atomic-json** | Audit logs / run reports if batching test fixtures |
| **flask-web-auth** | **Not needed** — Spotify OAuth replaces Basic Auth |

**Future:** `spotify-api` npm package in toolbox — shared by MCP server and this API.

---

## Environment variables (API)

| Variable | Required | Purpose |
|----------|----------|---------|
| `SPOTIFY_CLIENT_ID` | yes | Developer app |
| `SPOTIFY_CLIENT_SECRET` | yes | Token exchange |
| `SPOTIFY_REDIRECT_URI` | yes | OAuth callback |
| `SESSION_SECRET` | yes | Cookie signing |
| `DATABASE_URL` | yes | Neon Postgres |
| `WEB_ORIGIN` | yes | CORS — `https://vibelist.dychen.net` |
| `OPENAI_API_KEY` | one of* | OpenAI curation (`openai:gpt-4o-mini`, etc.) |
| `ANTHROPIC_API_KEY` | one of* | Anthropic curation (`anthropic:claude-sonnet-4-6`, etc.) |
| `CURSOR_API_KEY` | one of* | Cursor curation — **not implemented yet**; needs Phase 3 Cursor provider |
| `LLM_MODEL` | no | **Current** server default for `/api/curate` when request omits `model` (e.g. `openai:gpt-4o-mini`) |
| `CURATE_LLM_MODEL` | no | **Planned** rename/default for Step 2.2.3 only (replaces `LLM_MODEL`) |
| `INTERVIEW_LLM_MODEL` | no | **Planned** Phase 4 — Step 1 question generation only |
| `CURSOR_LLM_RUNTIME` / `CURSOR_CLOUD_REPO` | no | Cursor provider only — see toolbox `llm-router` |

\*At least **one** LLM key required for `/api/curate`. You do **not** need both OpenAI and Anthropic unless you want multiple model families on the delivery panel. Set `LLM_MODEL` (later `CURATE_LLM_MODEL`) to match the provider you configured.

**Fly secrets (production):** add whichever keys you use, e.g. `fly secrets set OPENAI_API_KEY=... LLM_MODEL=openai:gpt-4o-mini -a create-playlist-api`. Add `ANTHROPIC_API_KEY` only if offering Claude tracklist options. Add `CURSOR_API_KEY` after Cursor provider ships.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Spotify Dev Mode user cap | Launch with allowlist; plan app review before marketing |
| Rate limits on search (~20+ queries per build) | Batch, backoff, cache search results in session |
| LLM proposes unfindable tracks | Skill verify step; fallback to Step 2.1 |
| OAuth token storage security | Encrypt refresh tokens at rest; httpOnly cookies |
| Scope creep (full skill in v1) | Phase 1 prompt-only ships value without backend |

---

## Open decisions

1. ~~**Domain:**~~ **Resolved** — `vibelist.dychen.net` on Cloudflare Pages
2. ~~**API language:**~~ **Leaning Node** — Phase 3 uses direct OpenAI/Anthropic fetch; Cursor/llm-router unification still open
3. ~~**Interview v1:**~~ **Resolved** — static wizard for v1; LLM interview in Phase 4 with separate `INTERVIEW_LLM_MODEL`
4. **Curation providers:** hand-rolled Node fetch vs toolbox `llm-router` (incl. Cursor via cursor-sdk)
5. **Repo name on GitHub:** `create-playlist-web` vs `teahouse-playlist`
6. ~~**Public vs private repo:**~~ **Resolved** — public at [Harrinive/create-playlist-web](https://github.com/Harrinive/create-playlist-web)

---

## Success metrics

- Phase 1: prompt copied and pasted into Spotify app successfully
- Phase 3: playlist created on user's account with ≥15/20 tracks verified `ok`
- Ops: deploy web + API from `main` push without manual steps

---

## References

- Cursor skill: `~/.cursor/skills/create-playlist/SKILL.md`
- MCP fallback (API mapping): `step-2-2-mcp-fallback.md`
- Cycloud agent guide: `Programs/Cycloud/AGENTS.md`
- toolbox agent guide: `Programs/Packages/toolbox/AGENTS.md`
- dychen.net plan: `Programs/dychen-net/PLAN.md`
