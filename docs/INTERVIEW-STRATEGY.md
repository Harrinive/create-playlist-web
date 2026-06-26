# Interview design

**Status:** Implemented in `apps/api/src/llm/interview/`  
**Product canon:** `~/.cursor/skills/create-playlist/step-1-interview.md`

---

## Goal

Help the user recognize themselves in concrete scenes and stories. The interviewer re-reads prior answers each turn and privately tracks which music flavors remain reachable. Questions split what’s left when useful (2–6 options). Curate picks a coherent tracklist from the story and reachable genres — not a single pinned subgenre.

---

## Flow

```text
[optional] Opening context
  → M1 Scene (4–6 options)
  → M2 Mood in scene (story-native, 2–6 options)
  → M3 Night chapter (story arc, 2–6 options)
  → 3-sentence story synthesis (auto at M4 entry)
  → [optional] extra turn if ≥2 very different playlists still reachable
  → M4 Avoid (music-logical rejects + none)
  → M5 inferred server-side (not user-facing)
  → curate → delivery note
```

Turn roles are guidance, not rigid slots. Stop early when curate can handle the remaining spread (~3–5 user turns typical).

---

## Core rules

### Story vs music layers

| Layer | Where | User copy |
|-------|-------|-----------|
| Vibe / scene / story | M1–M3, story, optional clarify | Concrete moments — BGM test: *would I put this on in the background here?* |
| Music / logical | M4 avoid | Plain language + gloss on poetic rejects |

**Hard ban:** music-production vocabulary in M2/M3 (kick, drop, BPM, grid, etc.). Abstract mood stacks and micro-drama beats are also rejected.

### Agent-reasoned genres

Each plan turn the agent must:

1. Re-read all prior answers (and opening context, rejected stems).
2. Privately list reachable music flavors in normal genre language.
3. Design this turn’s question to split reachable set via **story**, not genre menus.
4. Record `reachableGenresNote` in plan JSON (prose) for curate and delivery — never shown verbatim to user.

No fixed genre tree or neighborhood slug roster in user-facing logic.

### Option counts

| Situation | Options |
|-----------|---------|
| Q1 scene | 4–6 |
| M2 / M3 | 2–6 (2 is fine when only two forks remain) |
| Upper bound | ~6 |

### Gloss (clarifiers)

- **M1:** optional when main chip is poetic.
- **M2 / M3:** omit — chip must be self-contained story beat.
- **M4:** required on poetic non-`none` options.

### Curate & delivery

Curate reads full answer history, 3-sentence story, and `reachableGenresNote`. Delivery explains the lean in plain language (*late-night electronic*, *cozy indie*) — not internal slugs or false precision.

---

## Key implementation files

```text
apps/api/src/llm/interview/
  resolve-step.ts          # adaptive step routing (m1→m2→m3→m4)
  plan.ts / draft.ts       # LLM plan + draft generation
  story-synthesize.ts      # auto 3-sentence story at M4
  prompts/                 # tiered prompt modules (plan, draft, verify, story-native)
  verify-deterministic.ts  # option count, M2/M3 ban list, M4 none
  verify-system.ts         # logic LLM checks (BGM test, gloss rules)
  shared.ts                # reachableGenresNote, plannedOptionCount
```

Nine Q1 region IDs in `prompts/q1-regions.ts` are for **offline coverage audits** only — not shown as nine user buttons.

---

## Tests

```bash
cd apps/api && npm run test:verify
# optional story smoke: scripts/test-interview-story.ts
```
