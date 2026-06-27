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
| gym-hype, peak-club-banger | Intimate/calm M3, post-party aftermath, winding-down |
| sad-acoustic-cliche | Kinetic social — **keep** for melancholy/wistful calm scenes |
| aggressive-distortion | Calm M2/M3 unless edge-charged region |
| trailer-swell | Optional drop when M3 still + M2 calm |

Full registry: `TRAP_CLUSTERS` in `m4-eligibility.ts`.

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
