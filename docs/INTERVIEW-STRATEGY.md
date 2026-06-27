# Interview design

**Status:** Implemented in `apps/api/src/llm/interview/`  
**Product canon:** `~/.cursor/skills/create-playlist/step-1-interview.md`  
**M4 detail:** [INTERVIEW-M4-AVOID.md](./INTERVIEW-M4-AVOID.md)

---

## Goal

Help the user recognize themselves in concrete scenes and stories. The interviewer re-reads prior answers each turn and privately tracks which music flavors remain reachable. Questions split what's left when useful (2–6 options). Curate picks a coherent tracklist from the story and reachable genres — not a single pinned subgenre.

---

## Flow

```text
[optional] Opening context
  → M1 Scene (4–6 options)
  → M2 Mood in scene (story-native, 2–6 options)
  → M3 Night chapter (story arc, 2–6 options)
  → 3-sentence story synthesis (auto at M4 entry)
  → [optional] extra turn if ≥2 very different playlists still reachable
  → M4 (adaptive):
      avoid multi-select   IF ≥4 eligible trap false-positives
      OR discriminant      IF <4 eligible (1a energy / 1b sonic / 1c latent)
  → implied avoids merged at complete (even when traps dropped or avoid skipped)
  → M5 inferred server-side (seeded by discriminant when applicable)
  → curate → delivery note
```

Turn roles are guidance, not rigid slots. Stop early when curate can handle the remaining spread (~3–5 user turns typical).

---

## Core rules

### Story vs music layers

| Layer | Where | User copy |
|-------|-------|-----------|
| Vibe / scene / story | M1–M3, story, optional clarify | Concrete moments — BGM test: *would I put this on in the background here?* |
| Music / logical | M4 avoid or discriminant | Plain language — trap rejects or felt sonic/motion split |

**Hard ban:** music-production vocabulary in M2/M3 (kick, drop, BPM, grid, etc.). Abstract mood stacks and micro-drama beats are also rejected.

### M4 dual mode

See [INTERVIEW-M4-AVOID.md](./INTERVIEW-M4-AVOID.md). Deterministic trap eligibility runs before M4 generation; verify hard-fails options that match dropped clusters (e.g. coffee-shop acoustic after kinetic neon path).

### Agent-reasoned genres

Each plan turn the agent must:

1. Re-read all prior answers (and opening context, rejected stems).
2. Privately list reachable music flavors in normal genre language.
3. Design this turn's question to split reachable set via **story**, not genre menus.
4. Record `reachableGenresNote` in plan JSON (prose) for curate and delivery — never shown verbatim to user.

No fixed genre tree or neighborhood slug roster in user-facing logic.

### Option counts

| Situation | Options |
|-----------|---------|
| Q1 scene | 4–6 |
| M2 / M3 | 2–6 (2 is fine when only two forks remain) |
| M4 avoid | 3–5 traps + `"none"` |
| M4 discriminant | 2–6 single-select, no `"none"` |
| Upper bound | ~6 |

### Labels (zero-gloss policy)

- **M1:** optional stem gloss when main chip is poetic (currently off in code).
- **M2 / M3:** omit gloss — chip must be self-contained story beat.
- **M4 avoid:** plain trap language in main labels only — no separate gloss fields.

### Curate & delivery

Curate reads full answer history, 3-sentence story, `reachableGenresNote`, user M4 selections, and **implied avoids** from dropped traps. Delivery explains the lean in plain language (*late-night electronic*, *cozy indie*) — not internal slugs or false precision.

---

## Key implementation files

```text
apps/api/src/llm/interview/
  m4-eligibility.ts        # trap registry, gate, discriminant kind
  resolve-step.ts            # adaptive step routing + m4Mode step meta
  plan.ts / draft.ts         # LLM plan + draft generation
  story-synthesize.ts        # auto 3-sentence story at M4
  prompts/                   # tiered prompt modules (plan, draft, verify, story-native)
  prompts/sections/positive-discriminant.ts  # Q4 1a/1b/1c blocks
  verify-deterministic.ts    # option count, M2/M3 ban list, M4 trap eligibility
  verify-system.ts           # logic LLM checks (BGM test)
  shared.ts                  # reachableGenresNote, PositiveDiscriminant mode
  infer-sonic.ts             # M5 inference honors avoids + discriminant seed
```

Nine Q1 region IDs in `prompts/q1-regions.ts` are for **offline coverage audits** only — not shown as nine user buttons.

---

## Tests

```bash
cd apps/api && npm run test:verify
node --import tsx --test src/llm/interview/__tests__/m4-eligibility.test.ts
# optional story smoke: scripts/test-interview-story.ts
```
