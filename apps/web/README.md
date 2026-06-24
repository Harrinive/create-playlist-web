# create-playlist-web — frontend

Astro static site: mood interview → delivery choice → Spotify Prompted Playlist paragraph (Phase 1) or build placeholder (Phase 2).

**Live:** https://vibelist.dychen.net  
Parent repo: [create-playlist-web](https://github.com/Harrinive/create-playlist-web)

## Commands

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/
npm run preview  # serve dist/
```

Requires Node ≥ 22.12.

## Routes

| Path | File | Purpose |
|------|------|---------|
| `/` | `src/pages/index.astro` | Landing |
| `/interview` | `src/pages/interview.astro` | Step 1 wizard (M1–M5) |
| `/delivery` | `src/pages/delivery.astro` | Step 2 — Prompt vs Build |
| `/prompt` | `src/pages/prompt.astro` | Step 2.1 — copyable paragraph |
| `/build` | `src/pages/build.astro` | Phase 2 placeholder (awaits API) |

## Architecture

```text
Sidebar (Sidebar.astro)
  ├── EN / 中文     → app-toolbar.ts + locale.ts
  ├── Start over    → clears sessionStorage
  ├── Last prompt   → /prompt
  └── Theme toggle  → sidebar-theme.ts

/interview → /delivery → /prompt  or  /build (placeholder)
```

**Session keys:** `create-playlist-answers`, `create-playlist-answers-draft`, `create-playlist-locale`

## Styling

Whono-derived CSS (no Tailwind): `src/styles/global.css`, `layout.css`, `app.css`.  
Fonts: LXGW WenKai Lite + Noto Serif SC subsets in `public/fonts/`.

## Skill alignment

- Interview covers M1–M5 before delivery (static bank, not LLM)
- Prompt format: `~/.cursor/skills/create-playlist/step-2-1-prompt.md`
- Chinese mode: bilingual Q/options only; deliverables English

See [AGENTS.md](../../AGENTS.md) for Phase 2 backend status.
