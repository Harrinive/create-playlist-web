# Agent guide — create-playlist-web

**Start here** if you are implementing the Spotify music recommendation website.

**Local path:** `Programs/create-playlist-web/`  
**Full plan:** [PLAN.md](./PLAN.md)  
**Product behavior (canonical):** `~/.cursor/skills/create-playlist/` — interview rules, Step 2.1 prompt format, Step 2.2 verify/publish algorithm

---

## One-sentence summary

Build a **web version of the create-playlist skill**: Astro interview UI on Cloudflare Pages + optional Fly.io API for per-user Spotify OAuth and ~20-track playlist publish.

---

## Read order

1. **This file** — scope and constraints
2. **[PLAN.md](./PLAN.md)** — architecture, phases, stack
3. **Skill router:** `~/.cursor/skills/create-playlist/SKILL.md`
4. **For Step 2.2 API mapping:** `step-2-2-mcp-fallback.md` (direct Spotify Web API, not MCP)
5. **Reference apps:** [dychen.net](https://github.com/Harrinive/dychen-net) (Astro/CF), [Cycloud](https://github.com/Harrinive/Cycloud) (Fly/secrets)
6. **Shared libs:** [toolbox/AGENTS.md](https://github.com/Harrinive/toolbox/blob/main/AGENTS.md)

---

## Current status

| Item | State |
|------|-------|
| Repo / git | Folder created locally; **not** initialized on GitHub yet |
| Code | None — planning docs only |
| Spotify Developer app | TBD |
| Domain | TBD (`playlist.dychen.net` suggested) |

---

## What to build first (recommended)

**Phase 1 — Prompt-only MVP** (no backend):

- Astro site under `apps/web/`
- 4-step interview wizard (static option sets inspired by skill M1–M5)
- Output: English Spotify Prompted Playlist paragraph ([step-2-1-prompt.md](file://~/.cursor/skills/create-playlist/step-2-1-prompt.md))
- Deploy to Cloudflare Pages

Do **not** start with OAuth or Fly unless explicitly asked — ship interview + prompt first.

---

## Architecture (short)

```text
Astro (CF Pages)  ──API──►  Node or Python API (Fly.io)
                              ├── Spotify OAuth (per user)
                              ├── llm-router (curate tracklist)
                              └── spotify-mcp-server utils (search, publish)
```

MCP is **not** used in production. Port `createSpotifyApi` / `spotifyFetch` from `Programs/Packages/spotify-mcp-server`.

---

## Skill → web mapping

| Skill | Web |
|-------|-----|
| Step 1 interview (`AskQuestion`) | Multi-step UI with clickable options |
| Step 2 delivery choice | Two primary actions: Prompt / Build |
| Step 2.1 | Copyable paragraph page |
| Step 2.2.3 curate | `POST /api/curate` + LLM |
| Step 2.2.4–2.2.5 verify | `POST /api/verify` + Spotify search |
| Step 2.2.6–2.2.8 publish | `POST /api/publish` + create playlist |
| Step 2.2.9 report | Results page with table + Spotify link |

**Hard rules from skill:** verify/publish must not re-curate or reorder from scratch; trim preserves propose order; offer prompt fallback if verify &lt;50% ok.

---

## toolbox packages

| Package | When |
|---------|------|
| `design-tokens` | UI theme (dychen or new playlist theme) |
| `llm-router` | Tracklist curation, optional interview LLM |
| `atomic-json` | Optional audit/run logs |
| `flask-web-auth` | **Do not use** — Spotify OAuth instead |

Pin `@v0.x.y` tags from https://github.com/Harrinive/toolbox/tags

---

## Agent rules

1. **Skill is product spec** — don't invent new interview logic; port from skill docs.
2. **Minimize v1 scope** — prompt-only before OAuth unless user requests full build.
3. **Reuse existing repos** — don't duplicate Spotify or LLM code; extract to shared package when stable.
4. **Match Harry's deploy pattern** — CF Pages for static, Fly for secrets/DB.
5. **No commits/push** unless user asks.
6. **English deliverables** — playlist names, prompts, track notes stay English (Chinese mode = bilingual interview labels only).

---

## Key files (when implemented)

```text
apps/web/src/pages/interview/   # Step 1 UI
apps/web/src/pages/prompt/      # Step 2.1
apps/web/src/pages/build/       # Step 2.2 flow
apps/api/src/auth/spotify.ts    # OAuth
apps/api/src/routes/publish.ts  # Create playlist
packages/shared/                # M1–M5 types, templates
```

---

## Open questions (ask user if blocked)

See [PLAN.md § Open decisions](./PLAN.md#open-decisions): domain, API language (Node vs Python), repo visibility, interview static vs LLM for v1.
