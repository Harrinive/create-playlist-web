# Agent guide — create-playlist-web

**Start here** for implementation work on the Spotify music recommendation website.

**Live:** https://vibelist.dychen.net  
**API:** https://api.vibelist.dychen.net  
**Product canon:** `~/.cursor/skills/create-playlist/` — interview rules, Step 2.1 prompt format, Step 2.2 verify/publish algorithm

---

## Summary

Web version of the **create-playlist skill**: Astro interview UI on Cloudflare Pages + Fly.io API for per-user Spotify OAuth and ~20-track playlist publish.

| Layer | Location |
|-------|----------|
| Frontend | `apps/web/` — Astro 6, Whono-style UI |
| API | `apps/api/` — Fastify on Fly, `api.vibelist.dychen.net` |
| Database | Supabase Postgres (`DATABASE_URL` on Fly) |
| Interview | LLM chip wizard — story-native M2/M3, `reachableGenresNote`, 2–6 options, auto 3-sentence story |
| Curate | Node `llm-router` in `apps/api/src/llm-router/` — OpenAI, Anthropic, Cursor |

---

## Architecture

```text
Astro (CF Pages)  ──API──►  Fastify (Fly.io)
                              ├── Spotify OAuth (per user)
                              ├── POST /api/interview/next
                              ├── POST /api/curate, /api/verify, /api/publish
                              └── llm-router (curate + interview)
```

MCP is **not** used in production. Spotify helpers ported from `spotify-mcp-server`.

---

## Skill → web mapping

| Skill | Web | Route |
|-------|-----|-------|
| Step 1 interview | LLM chip wizard + model picker | `/interview` |
| Step 2 delivery | Prompt + per-model build options | `/delivery` |
| Step 2.1 | Copyable paragraph | `/prompt` |
| Step 2.2 build | Generate tracklist → optional OAuth import | `/build` |

**Hard rules:** verify/publish must not re-curate or reorder from scratch; trim preserves propose order; offer prompt fallback if verify &lt;50% ok.

---

## Key files

```text
apps/web/                              # Astro — interview, delivery, prompt, build UI
apps/api/                              # Fastify — OAuth, interview, curate, verify, publish
apps/api/src/model-catalog.ts          # LLM roster — interview vs curation flags
apps/api/src/llm/interview/            # interview pipeline (see docs/INTERVIEW-STRATEGY.md)
apps/api/src/llm-router/               # OpenAI, Anthropic, Cursor providers
```

---

## Docs

| Doc | Purpose |
|-----|---------|
| [README.md](./README.md) | Project overview, local dev, deploy |
| [docs/INTERVIEW-STRATEGY.md](./docs/INTERVIEW-STRATEGY.md) | Interview design (implemented) |
| [docs/DASHBOARD-OPS.md](./docs/DASHBOARD-OPS.md) | CF / Fly / Spotify / GitHub settings |
| [apps/api/README.md](./apps/api/README.md) | API local dev + Fly deploy |

Reference: [dychen.net](https://github.com/Harrinive/dychen-net) (Astro/CF), [Cycloud](https://github.com/Harrinive/Cycloud) (Fly/secrets), [astro-whono](https://github.com/cxro/astro-whono) (theme), [toolbox](https://github.com/Harrinive/toolbox) (`llm-router`).

---

## Agent rules

1. **Skill is product spec** — don't invent new interview logic; port from skill docs.
2. **Minimize scope** — prompt-only before OAuth unless user requests full build.
3. **Reuse existing repos** — don't duplicate Spotify or LLM code.
4. **Match deploy pattern** — CF Pages for static (Git connect), Fly for secrets/DB.
5. **No commits/push** unless user asks.
6. **English deliverables** — playlist names, prompts, track notes stay English (Chinese mode = bilingual interview labels only).
