# create-playlist-web — frontend

Astro static site: interview → delivery → prompt (Phase 1) or Spotify connect + search (Phase 2).

**Live:** https://vibelist.dychen.net  
**API:** [apps/api/README.md](../api/README.md)

## Commands

```bash
npm install
npm run dev      # http://127.0.0.1:4321
npm run build
npm run preview
```

Copy `.env.example` → `.env` and set `PUBLIC_API_URL=http://127.0.0.1:3001` for the build path.

Requires Node ≥ 22.12. Dev server binds to **127.0.0.1** (required for API session cookies with Spotify).

## Routes

| Path | Purpose |
|------|---------|
| `/interview` | Step 1 wizard (M1–M5) |
| `/delivery` | Step 2 — Prompt vs Build |
| `/prompt` | Step 2.1 copyable paragraph |
| `/build` | Connect Spotify + test search |

## Local two-terminal setup

```text
Terminal 1: apps/web  → npm run dev   → http://127.0.0.1:4321
Terminal 2: apps/api  → npm run dev   → http://127.0.0.1:3001
```

See [AGENTS.md](../../AGENTS.md) for full project status.
