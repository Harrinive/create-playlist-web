# create-playlist-web

Web app for mood-driven Spotify playlist creation — a browser version of the **create-playlist** Cursor skill (`~/.cursor/skills/create-playlist/`).

**Status:** Phase 1 MVP — interview + Spotify prompt (local preview ready).

| Doc | Purpose |
|-----|---------|
| [PLAN.md](./PLAN.md) | Architecture, phases, stack, cost, open questions |
| [AGENTS.md](./AGENTS.md) | Agent handoff — start here for implementation |

## Run locally

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) — complete the interview, then copy the prompt on `/prompt`.

**UI:** [Astro Whono](https://github.com/cxro/astro-whono) theme (two-column layout, typography, light/dark). Sidebar nav is replaced with **EN / 中文**, **Start over**, **Last prompt**, and theme toggle.

Production build: `npm run build && npm run preview`

---

**Related repos:**

- [spotify-mcp-server](https://github.com/Harrinive/spotify-mcp-server) — Spotify Web API helpers (extract for backend)
- [toolbox](https://github.com/Harrinive/toolbox) — `llm-router`, `design-tokens`
- [dychen.net](https://github.com/Harrinive/dychen-net) — Astro + Cloudflare Pages reference UI
- [Cycloud](https://github.com/Harrinive/Cycloud) — Fly.io + OAuth/secrets reference backend
