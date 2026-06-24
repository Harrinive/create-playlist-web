# create-playlist-web

Web app for mood-driven Spotify playlist creation — a browser version of the **create-playlist** Cursor skill (`~/.cursor/skills/create-playlist/`).

**Repo:** https://github.com/Harrinive/create-playlist-web  
**Live:** https://vibelist.dychen.net  
**Status:** Phase 1 complete (prompt path live). Phase 2 backend not started; build-path UI placeholders in place.

| Doc | Purpose |
|-----|---------|
| [PLAN.md](./PLAN.md) | Architecture, phases, stack, open questions |
| [AGENTS.md](./AGENTS.md) | Agent handoff — start here for implementation |

---

## Progress

### Done (Phase 0–1)

| Feature | Route | Notes |
|---------|-------|-------|
| Landing | `/` | How-it-works, start interview |
| Interview wizard | `/interview` | 5 steps → M1–M5 via static chip options |
| Delivery choice | `/delivery` | Prompt vs Build (skill Step 2) |
| Spotify prompt | `/prompt` | Step 2.1 paragraph + copy button |
| Build placeholder | `/build` | “Coming soon” until Phase 2 API |
| EN / 中文 | Sidebar | Bilingual UI + interview labels; prompt stays English |
| Deploy | CF Pages | Git connect, root `apps/web`, output `dist` |

**Stack:** Astro 6, Whono-derived CSS, `@lucide/astro`, subset fonts in `public/fonts/`.

### Phase 2 (partial — frontend only)

| Item | Status |
|------|--------|
| Delivery + build placeholder pages | Done |
| Fly API + Spotify OAuth | Not started |
| Curate / verify / publish endpoints | Not started (Phase 3) |

---

## Run locally

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) — interview → delivery → prompt → copy.

Production build: `npm run build && npm run preview`

---

## Deploy (Cloudflare Pages)

Same pattern as [dychen.net](https://github.com/Harrinive/dychen-net): **Workers & Pages → Pages → Connect Git** (not Workers).

| Setting | Value |
|---------|--------|
| Root directory | `apps/web` |
| Build command | `npm ci && npm run build` |
| Build output | `dist` |

Custom domain: `vibelist.dychen.net` (add under Pages → Custom domains).

Optional: `.github/workflows/deploy-web.yml` exists for Wrangler-based CI deploy (requires `CLOUDFLARE_*` secrets). Not needed if using dashboard Git connect.

---

## Related repos

- [spotify-mcp-server](https://github.com/Harrinive/spotify-mcp-server) — Spotify Web API helpers (extract for backend)
- [toolbox](https://github.com/Harrinive/toolbox) — `llm-router`, `design-tokens`
- [astro-whono](https://github.com/cxro/astro-whono) — UI theme reference
- [dychen.net](https://github.com/Harrinive/dychen-net) — Astro + Cloudflare Pages deploy pattern
- [Cycloud](https://github.com/Harrinive/Cycloud) — Fly.io + OAuth/secrets reference backend
