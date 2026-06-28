# M4 Avoid — eligibility and dual mode

**Status:** Implemented in `apps/api/src/llm/interview/m4-eligibility.ts`  
**Product canon:** `~/.cursor/skills/create-playlist/step-1-interview.md` § M4 interview gate

---

## M4 interview gate

After M3 (or optional `m_clarify`), the server counts **eligible trap clusters** from prior answers and Q1 region.

| Eligible traps | Last turn mode |
|----------------|----------------|
| ≥ 4 | **Avoid** — multi-select plain trap labels + `"none"` |
| < 4 | **Discriminant** — single-select Q4 1a / 1b / 1c |

Discriminant priority (skill § Question 4):

1. **1a Energy** — body pace still splits hypotheses (`coverageRisk`, not still/drift)
2. **1b Sound** — groove/timbre splits hypotheses (`needsGrooveGrain` or plural hypotheses)
3. **1c Feel** — latent axis (space, density, grain) default fallback

---

## Trap cluster drop rules (condensed)

| Trap cluster | Drop when |
|--------------|-----------|
| coffee-shop-template, lo-fi-study, elevator-muzak, grief-dirge | Kinetic/social Q1 region or kinetic story (neon, crowd, club, street) |
| gym-hype, peak-club-banger, glossy-motivational, hyperpop-sheen | **Low social heat** — non-kinetic picked arc and non-kinetic Q1 region; OR intimate/calm/still M2–M3; OR post-party aftermath |
| sad-acoustic-cliche | Kinetic social — **keep** for melancholy/wistful calm scenes |
| aggressive-distortion | Calm/low-heat arc unless edge-charged region or kinetic story |
| trailer-swell | Optional drop when M3 still + M2 calm |

**Low social heat (structural):** picked labels contain no kinetic signals **and** Q1 `m1RegionId` is not kinetic-high / rhythm-social / edge-charged / restless-charged. Catches social-mid paths (e.g. window booth, shared fries) even when M2–M3 copy is poetic and lacks “quiet/intimate” keywords.

Full registry: `TRAP_CLUSTERS` in `m4-eligibility.ts`.

---

## `none` option semantics

M4 avoid is **multi-select**. User picks any traps that would wrongly pull the playlist.

| id | Meaning |
|----|---------|
| trap cluster ids | Skip this accidental playlist pattern |
| `"none"` | **No extra avoids** — user is open; implied avoids from dropped traps still apply downstream |

**Canonical labels:** EN `"Nothing extra to avoid — I'm open"` · ZH `没有额外要避开的`

**Not:** “None of these” (reads like rejecting all listed traps) · bare `都可以` (ambiguous in a reject question)

---

## Enforcement layers

| Layer | Role |
|-------|------|
| **`m4-eligibility.ts`** | High-confidence floor — registry, region + non-kinetic arc drops, gate count |
| **Deterministic verify** | Roster match, dropped-trap hard-fail, canonical `none` label, counts |
| **Plan + draft prompts** | Plausible false positives only; pick from eligible roster |
| **LLM logic verify** | **Obvious-answer test** on full M1–M3 context — fail traps a reasonable listener would already assume out of scope, even if eligibility missed them |

Do not expect keyword heuristics to cover every poetic path; LLM verify owns context-dependent coherence.

---

## Implied avoids

Traps **dropped** from the interview (already ruled out by M1–M3) are still merged into:

- `buildCompactBrief` → `REJECT` block
- `generateSpotifyPrompt` → avoid clause
- `inferSonic` → honor literally

Even when the user picks `"none"` on avoid mode or when M4 is discriminant instead of avoid.

---

## Downstream mapping

| M4 mode | User answer stored in `answers.m4` | Curate use |
|---------|-----------------------------------|------------|
| avoid | Multi-select trap labels | `REJECT` + implied avoids |
| discriminant-1a | Single energy/pace pick | `PACE` refinement |
| discriminant-1b / 1c | Single felt sonic pick | Primary `SONIC` seed + M5 inference |
