# Interview design

**Status:** Implemented in `apps/api/src/llm/interview/`  
**Product canon:** `~/.cursor/skills/create-playlist/step-1-interview.md`  
**M4 detail:** [INTERVIEW-M4-AVOID.md](./INTERVIEW-M4-AVOID.md)  
**Prompt tuning (shape-first):** [INTERVIEW-PROMPT-STRATEGY.md](./INTERVIEW-PROMPT-STRATEGY.md)

---

## Principles

1. **Coverage** — Reach across a broad music family — classics, mainstream, indie, and niche electronic. M1 is the widest cut: 4–6 scene options must span social heat, setting type, and distinct genre-adjacent worlds so no major lane is closed on turn one.
2. **Immersive, readable copy** — Ease reading and deciding: each option is a concrete setting with characters and actions the user can step into (BGM test — mood felt, not labeled). Where music logic is needed, plain beginner-friendly terms are OK; keep mood register and music register separate. See **Copy register** below.
3. **Contemporary poetry voice** — M1–M3 stems and options use imagist English free verse and Chinese 现代诗: lyrical, image-led, still grounded in concrete scenes (not mood adjectives or decoder metaphors). EN and ZH composed independently — same axis, not line-by-line translation. M4 and music-pattern labels stay plain (copy register OK tier).
4. **Private genre map** — Each turn, re-read all prior answers; privately track reachable flavors in normal genre language; split what's left via **story**, not slug menus. Record `reachableGenresNote` for curate — never shown verbatim to the user.
5. **Adaptive questions** — Ask only while multiple coherent playlists remain (~3–5 user turns typical). Option count 2–6; form follows what's left (M4 avoid vs. discriminant, optional clarify when paths still diverge).
6. **Plain language** — Self-contained chip labels (zero gloss on M2/M3); M4 traps in plain reject wording; delivery explains the lean in everyday terms (*late-night electronic*, *cozy indie*), not internal IDs.
7. **Whole-story curate** — Curate reads full history, 3-sentence story, reachable note, M4 selections, and implied avoids — a coherent tracklist from the story, not one pinned subgenre.

---

## Goal

Help the user recognize themselves in concrete scenes. The interviewer narrows reachable music flavors each turn; curate picks from the resulting story and genre map.

---

## Flow

```text
[optional] Opening context
  → M1 Scene (4–6 options — all-encompassing coverage partition)
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

Turn roles are guidance, not rigid slots. Stop early when curate can handle the remaining spread.

---

## Rules

### Copy register (questions & options)

| Tier | Pattern |
|------|---------|
| **Preferred** | Concrete setting + characters + actions; each option is a mini scene to inhabit — mood felt by immersion. Voice: imagist EN free verse / ZH 现代诗 (concrete images, not mood adjectives) |
| **OK** | Accurate, clear, standard beginner-friendly music terms where music logic is needed (mainly M4) |
| **Disallowed** | Direct mood/feeling labels; faux story that only restates a vacuous feeling; vague poetic wording for music patterns; mixing mood copy with music-pattern copy in the same label |

**Hard ban in M2/M3:** kick, drop, BPM, grid, abstract mood stacks, micro-drama beats (production jargon — distinct from beginner-friendly music terms in M4).

### Story vs music layers

| Layer | Where | User copy |
|-------|-------|-----------|
| Vibe / scene / story | M1–M3, story, optional clarify | Copy register — preferred tier |
| Music / logical | M4 avoid or discriminant | Copy register — OK tier; plain trap rejects or felt sonic/motion split |

### M1 coverage

Planner uses nine Q1 region IDs (`prompts/q1-regions.ts`) for offline audits — user sees **4–6** invented scenes only. Options must span intimate ↔ kinetic social heat **and** setting type (e.g. kinetic-high, rhythm-social, edge-charged when count ≥5); no six quiet-hush variants.

### M4 dual mode

See [INTERVIEW-M4-AVOID.md](./INTERVIEW-M4-AVOID.md). Deterministic trap eligibility before M4 generation; verify hard-fails options matching dropped clusters.

### Option counts

| Situation | Options |
|-----------|---------|
| M1 scene | 4–6 |
| M2 / M3 | 2–6 |
| M4 avoid | 3–5 traps + `"none"` |
| M4 discriminant | 2–6 single-select, no `"none"` |

### Labels

- **M1:** optional stem gloss when chip is poetic (off in code).
- **M2 / M3:** no gloss — chip is self-contained story beat.
- **M4 avoid:** plain trap language in main labels only.

---

## Key implementation files

```text
apps/api/src/llm/interview/
  m4-eligibility.ts        # trap registry, gate, discriminant kind
  resolve-step.ts            # adaptive step routing + m4Mode step meta
  plan.ts / draft.ts         # LLM plan + draft generation
  story-synthesize.ts        # auto 3-sentence story at M4
  prompts/                   # tiered prompt modules (plan, draft, verify, story-native)
  prompts/q1-regions.ts      # M1 coverage audit regions (planner-only)
  prompts/sections/positive-discriminant.ts  # Q4 1a/1b/1c blocks
  verify-deterministic.ts    # option count, M2/M3 ban list, M4 trap eligibility
  verify-system.ts           # logic LLM checks (BGM test)
  shared.ts                  # reachableGenresNote, PositiveDiscriminant mode
  infer-sonic.ts             # M5 inference honors avoids + discriminant seed
```

---

## Tests

```bash
cd apps/api && npm run test:verify
node --import tsx --test src/llm/interview/__tests__/m4-eligibility.test.ts
# optional story smoke: scripts/test-interview-story.ts
```
