# Interview strategy v3 (self-contained implementation spec)

**Status:** Documented — not yet implemented  
**Audience:** Implementers and agents — **read only this file** for interview design; v1/v2 are historical snapshots  
**Genre analysis (optional):** [INTERVIEW-STRATEGY-COVERAGE-REPORT.md](./INTERVIEW-STRATEGY-COVERAGE-REPORT.md)  
**Skill canon (sync when shipping):** `~/.cursor/skills/create-playlist/step-1-interview.md`  
**Current production:** fixed `m1 → m2 → m3 → m5 → m4` in `apps/api/src/llm/interview/`

---

## One-sentence goal

Ask **easy, scene-grounded feeling questions** users can answer by recognition; **internally** use mood/tempo slots (`calm`, `restless`, `sway`, …) and genre `hypotheses[]` for planning. **Coverage beats precision** — unresolved genre is fine; the **~26-track curate list** must represent every cluster still consistent with the answers. **No user-facing M5** (no 质感 step); sonic palette is inferred server-side.

---

## Design history (one paragraph)

v1 removed poetic user-facing sonic texture (the failed *"vending hum — where does it land?"* / 质感 Q4). v2 added nine Q1 regions, `coverageRisk`, curate breadth, opening path, and `you-decide`. **v3** makes M2/M3 **concrete in the M1 scene** while keeping abstract emotion/tempo **planner-only**.

---

## Coverage over precision

| Priority | Rule |
|----------|------|
| **1. Breadth** | Nine Q1 regions on fresh interview; verify enforces partition |
| **2. Honest ambiguity** | Plural `hypotheses[]` after interview is OK |
| **3. Playlist carries ambiguity** | Curate: **≥2–4 tracks per cluster** in ~26 lines; sequence intent names all clusters |
| **4. Discriminant last** | `m_clarify` / ClearDiscriminant only on **`coverageRisk`** — not high entropy alone |
| **5. You decide** | On LogicalDecision turns, preferred when breadth is OK; curate still spans clusters |

**Not the goal:** Precise Spotify subgenre from interview alone.  
**Is the goal:** User never feels genre X was impossible when X matched their scene/feeling answers.

---

## Two-layer question model

```text
USER:    "Rain on the steps — you're not going back in yet"
           ↓ private
PLANNER: emotionSlot: wistful · function: validate · → hypotheses / brief / curate
```

| Layer | Seen by | Purpose |
|-------|---------|---------|
| User | UI | Concrete film-still — *"that's me here"* |
| Planner | plan JSON only | `emotionSlot`, `tempoSlot`, `function`, `hypotheses[]` |

**User test:** *Can I point at this without translating mood theory or music production?*  
**Planner test:** *Distinct slot per option on this turn's axis?*

---

## Product principles

### Ask / don't ask

| Ask | Don't ask |
|-----|-----------|
| Where am I? (M1) | Genre? Instrument? |
| What's true for me **in this place**? (M2) | Chip text: Calm, Restless, Hold, Nudge |
| What is my **body doing here**? (M3) | Tempo BPM, energy level, 质感 |
| What must we **not** sound like? (M4 + gloss) | Genre menus |
| Clear discriminant on `coverageRisk` only | Cryptic sonic metaphor quiz |
| **You decide** / 你来定 | Forcing one genre lane |

### Three modes — never hybrid

1. **SceneFeeling** — M1, M2, M3 (default), `m_clarify`
2. **ClearDiscriminant** — M4 avoid; late turn on `coverageRisk`
3. **LogicalDecision** — M3 `needsGrooveGrain`; body + gloss + `you-decide`

### Hard bans (fail verify)

| Bad | Why |
|-----|-----|
| Stem: *"vending hum stains the air — where does it land?"* | Sonic metaphor quiz |
| Options: *"Near enough to breathe"* without scene/gloss | Opaque texture |
| User step labeled **质感 / Sound** | Primes music-texture decision |
| M2: *Hold me here* / *Calm* / *Restless* as chip text | Abstract — user translates |
| M3: *Low energy* / *Upbeat* | Tempo label, not body in scene |
| LogicalDecision without `you-decide` | Forces guess |
| Options contradict M1–M3 frame | Inconsistent |

### Good M1 reference

- Stem: *"Blue light on the stair landing — what waits by the door?"*
- Options: keys on the sill · porch boards, rain still cooling · train doors, bodies shifting

---

## Target flow (4–6 turns)

```text
[optional] Opening path
  → m1 Scene (9 regions, 8–10 options)
  → m2 Emotion (concrete felt moments in M1 scene)
  → m3 Energy (body in same scene; optional groove LogicalDecision)
  → [optional] m_clarify (film-still; coverageRisk)
  → m4 Avoid OR [optional] ClearDiscriminant (coverageRisk)
  → infer M5 + hypotheses[] → curate spans all clusters
```

| ID | Label | Mode | Required |
|----|-------|------|----------|
| `m1` | Scene / 场景 | SceneFeeling | yes |
| `m2` | Emotion / 情绪 | SceneFeeling | yes |
| `m3` | Energy / 能量 | SceneFeeling or LogicalDecision | yes |
| `m_clarify` | Moment / 一刻 | SceneFeeling | optional |
| `m4` | Avoid / 避开 | ClearDiscriminant | yes |

**No user-facing `m5`.** Inferred in `infer-sonic.ts` before prompt/curate.

---

## M1 Scene — nine Q1 regions

Implement in `apps/api/src/llm/interview/prompts.ts` → `Q1_COVERAGE_REGIONS`.

| ID | Territory (invent fresh) | Genre families reachable |
|----|--------------------------|---------------------------|
| `intimate-still` | Solo, enclosed, low social heat | ambient, folk, neo-classical, intimate singer-songwriter |
| `bittersweet-mid` | Winding down, mixed feeling | indie, alt, mellow pop, sad-not-heavy R&B |
| `focus-flow` | Task or transit attention | focus electronic, lo-fi, light jazz, instrumental |
| `social-mid` | People nearby, not peak chaos | indie pop, soul/R&B mood, mellow hip-hop, lounge |
| `kinetic-high` | Body IN loud/kinetic scene | house/techno energy, upbeat pop, gym-pop, rock drive |
| `restless-charged` | Solo but wired | alt-rock, charged R&B, post-punk, restless electronic |
| `rhythm-social` | Block party on sidewalk · kitchen everyone moving · parade drum two streets away | reggae, ska, afrobeat, latin social dance mood, funk |
| `edge-charged` | Basement door bass in chest · parking lot after show · hallway before something breaks | punk, metal-adjacent drive, post-punk, noise-rock |
| `elsewhere-transit` | Bus in unfamiliar city · night market alley · airport gate 5am | world lounge, city-pop mood, travel ambient, global pop |

**Q1 verify:** one option per **nine** regions (unless opening ruled out); **8–10** options; ≥1 kinetic/crowd; ≥1 non-domestic; passive distant bass ≠ `kinetic-high`.

---

## M2 Emotion — concrete in scene

After M1, ask: **what's true for you in that place right now?**

### Rules

- Stem: advance one beat from M1; same world (night/rain/etc.); not *"what's your mood?"*
- Options: **sensory micro-moments** or small behaviors — one film-still each
- Planner: distinct `emotionSlot` + `function` (`validate` | `challenge` | `neutral`) per option
- Never put slot names on chips

### Internal `emotionSlot` vocabulary (planner only)

`calm` · `restless` · `wistful` · `bittersweet` · `hopeful` · `detached` · `tender` · `charged` · `cathartic` · `numb` · `defiant` · `playful` (extend as needed)

### Example

**M1:** *Porch boards, rain still cooling*  
**Stem:** *"The porch is still dripping — what's true for you right now?"*

| User option | `emotionSlot` | `function` |
|-------------|---------------|------------|
| Rain on the steps — you're not going back in yet | `wistful` | validate |
| Towel on the railing, already thinking about tomorrow | `hopeful` | challenge |
| Everything past the gutter looks far away | `detached` | validate |

### Orthogonality vs M3

- **M2** = mental/emotional state **in the scene** (user copy = felt moment)
- **M3** = **body** in that scene (user copy = what body does)
- Same `wistful` + `still` vs `wistful` + `sway` = different briefs — both valid

---

## M3 Energy — body in same scene

Ask: **what is your body doing** here?

### Default SceneFeeling

| User option (porch / wistful) | `tempoSlot` |
|-------------------------------|-------------|
| Rocking slow in the chair, rain doing most of the moving | `still` |
| Toe tapping on the wet step | `sway` |
| Standing up — keys already in hand | `drive` |

Internal `tempoSlot`: `still` · `sway` · `walk` · `drive` · `on-grid` · `offbeat`

### `needsGrooveGrain` → LogicalDecision

When rhythm-native coverage at risk (reggae/funk/afrobeat collisions) or hypotheses differ on groove:

- Body move **main** + **mandatory gloss** + **`you-decide`** / 你来定
- Example: *Heel on the step, steady* (even pulse, not rushing) · *Weight shifting side to side* (loose sway)
- Never name reggae, dembow, genre

---

## Optional `m_clarify`

**Insert when:** ≥2 hypotheses plausible **and** scene/feeling gap **and** `coverageRisk` (curate would omit a neighborhood without this).  
**Skip when:** curate can span hypotheses with M1–M3 alone.

Planner picks **one** family per turn — user copy is **film-stills only**:

| Family | Planner axis (internal) | User option example |
|--------|-------------------------|---------------------|
| A — latent scene | social distance | Alone by the window while the party continues behind you |
| A | surface | Worn wool sleeve under your fingers |
| A | light | Neon flat on the wet pavement |
| B — memory shape | familiarity | Like a tape you haven't played in years |

---

## Opening path (before Q1)

**Not an interview question** — triage on landing / interview start.

| User intent | Stored | Effect |
|-------------|--------|--------|
| Surprise me | `intent: open` | Full interview; nine regions |
| Vibe, not words | `intent: vibe` | Full; `m_clarify` only if `coverageRisk` |
| Something like… | `reference: string` | Shorten resolved turns; enhancer in prompt |
| Hard constraints | `constraints: []` | Partial M4 prefill; filter Q1 |

Genre named in opener → enhancer in prompt/curate, **not** a genre chip grid. API accepts `openingContext` day one; UI phase 2.

---

## Confidence-gated ClearDiscriminant

**Secondary** — only when `coverageRisk` true (skipping excludes a valid cluster curate cannot represent). **Not** when entropy alone is high.

Planner fields: `hypotheses[]`, `coverageRisk`, `entropy` (informational), `inferenceConfidence`, `top2TimbreGap`.

**Allowed axes:** pace · groove grain · space · vocal presence · avoid (if M4 gate passes)  
**Forbidden:** poetic sonic stems · instruments · genre names · entropy-collapse-only questions

Prefer scene-grounded copy; include `you-decide`. Example stem: *"In this room — voices around you or one voice speaking to you?"*

---

## Last question routing

1. **M4 avoid** if ≥4 non-obvious avoids (meaningful, consistent with prior picks)
2. **ClearDiscriminant** only if `coverageRisk` and M4 cannot resolve
3. Else skip — plural `hypotheses[]` → curate
4. Never fake M4 when avoids already implied — write into prompt prose

**M4 gate:** multi-select; poetic chips OK with **required gloss** on non-`none` options decoding reject cluster.

---

## Edge and aggression

`edge-charged` Q1 = place (basement door, parking lot after show), not *"metal playlist"*.

**M4 filter exception:** when `edge-charged` or (`restless-charged` + challenge/cathartic M2) — do **not** drop aggressive/distortion avoids as implied.

When `intimate-still` + validate M2 — drop gym/club/aggressive avoids; write implied negatives in prompt.

---

## Planner behavior (full mode)

After each turn, especially M3:

1. Gap check (scene / feeling / setting)
2. `hypotheses[]` 2–10 — **retain plural** unless ruled out
3. `coverageRisk` — would skipping a turn exclude a cluster from curate?
4. `m_clarify`? (gap + coverageRisk)
5. `needsGrooveGrain` on M3?
6. Draft `inferredM5` — broad when hypotheses plural
7. Last-question routing

### Plan JSON (v3)

```json
{
  "hypotheses": ["indie folk intimate", "cool jazz lounge", "trip-hop dusk"],
  "coverageRisk": false,
  "entropy": "high",
  "inferenceConfidence": "low",
  "m1SceneId": "porch-rain-cooling",
  "optionSlots": {
    "not-going-in": { "emotionSlot": "wistful", "function": "validate" },
    "gutter-far": { "emotionSlot": "detached", "function": "validate" }
  },
  "inferredM5": "intimate air, warm low end; room for folk guitar and jazz piano in curate",
  "needsClarification": false,
  "needsConfidenceDiscriminant": false,
  "needsGrooveGrain": false,
  "lastQuestionMode": "avoid",
  "openingContext": { "intent": "open" },
  "q1RegionsToCover": ["intimate-still", "...", "elsewhere-transit"],
  "filterDrops": [],
  "stemGuidance": "...",
  "optionGuidance": "..."
}
```

M3 turns use `tempoSlot` in `optionSlots`. Draft must match slots; verify fails on slot collision or abstract M2/M3 chips.

---

## Server-side M5 inference

`apps/api/src/llm/infer-sonic.ts`

- **Input:** m1–m4, optional `m_clarify`, `openingContext`, `hypotheses[]`, slots, `inferredM5` draft
- **Output:** synthetic `m5` for prompt/brief — shared sonic **floor** when hypotheses plural
- **Wire:** `spotify-prompt.ts`, `brief.ts`, curate route
- **`you-decide`:** curate honors all `hypotheses[]` unless ruled out
- **Backward compat:** skip if session already has user `m5` (old production)

---

## Playlist breadth at curate

Ambiguity resolves here — not by over-questioning.

1. **≥2–4 tracks per cluster** in ~26 lines; state split in Sequence intent
2. **No silent collapse** to one subgenre when brief allows three
3. EMOTION/PACE/SONIC = shared room; per-line **cue** tags show cluster flavor
4. FLOW may weave clusters (opener A → turn B → peak C)
5. Verify/publish trim preserves order; don't re-curate to single genre on verify fail

**Example:** hypotheses folk · jazz · trip-hop → lines 1–8 folk cues, 9–17 jazz, 18–26 trip-hop.

**Prompt path:** plural hypotheses → paragraph says *"open to X, Y, or Z — not one lane only"*.

---

## Bilingual and gloss

- Always EN + ZH for stems and options; compose **independently** (not calque)
- **LogicalDecision / M4 / cryptic lines:** gloss in separate `glossEn` / `glossZh` — clearer, shorter; EN ASCII parens voice, ZH fullwidth
- **SceneFeeling M2/M3:** gloss optional unless cryptic
- **`you-decide`:** no gloss

### LogicalDecision shape

| Main (EN) | Gloss (EN) |
|-----------|------------|
| Hips find the gap | offbeat sway, not marching |
| You decide | — |

| Main (ZH) | Gloss (ZH) |
|-----------|------------|
| 胯找空隙 | 偏拍摇摆，不齐步 |
| 你来定 | — |

---

## Prompt and verify (implementation)

Replace production `m5FeltAxesBlock()` with:

- `sceneFeelingBlock()` — M1, M2, M3, `m_clarify`
- `concreteM2Block()` / `concreteM3Block()` — v3 scene-grounding
- `clearDiscriminantBlock()` · `logicalDecisionBlock()`

**Verify checks:**

- Q1 nine-region coverage
- M2/M3 scene-grounding (§ Hard bans)
- Distinct `emotionSlot` / `tempoSlot` per option
- `m_clarify` not sonic axis
- Forbidden vending-hum / where-does-it-land stems
- LogicalDecision: `you-decide` + gloss on others
- User-decodability: >50% options need music knowledge → fail
- Fail closed on verify parse errors for `m_clarify` / last step (recommended)

---

## API and web

`POST /api/interview/next`:

- `resolveInterviewStep(stepIndex, priorAnswers, openingContext)` — dynamic 4–6 steps
- Response: `{ step, totalSteps, stepIds, optionalClarifyIncluded, confidenceDiscriminantIncluded }`
- Slots **server-only** — not in client response

| File | Change |
|------|--------|
| `interview-step.ts` | Dynamic sequence; no user `m5` |
| `prompts.ts` | Nine regions; v3 blocks |
| `plan.ts` / `draft.ts` | `optionSlots`; inject M1 into M2 prompt, M1+M2 into M3 |
| `verify.ts` | v3 checks |
| `infer-sonic.ts` | new |
| `curate.ts` | hypotheses breadth rules |
| `interview-meta.ts` / `interview-wizard.ts` | `totalSteps` |
| `build-prompt.ts` | valid = m1–m3 + m4; m5 optional |

---

## Implementation checklist

1. [ ] Types + `resolveInterviewStep()` dynamic 4–6 steps
2. [ ] Nine-region Q1 in `prompts.ts` + verify
3. [ ] Plan schema: `hypotheses`, `coverageRisk`, `optionSlots`, groove/clarify flags
4. [ ] v3 prompt blocks; remove user M5 interview
5. [ ] `draft.ts` prior-context injection for M2/M3
6. [ ] `verify.ts` v3 checks
7. [ ] `infer-sonic.ts` + brief + prompt + curate
8. [ ] Curate breadth mandate + `hypotheses[]` in brief
9. [ ] Web dynamic `totalSteps`; opening path types (UI phase 2)
10. [ ] M4 edge-charged exceptions in `filter.ts`
11. [ ] Benchmark: Q1 batch, Tier B fixtures, curate collapse audit, niche spot-check
12. [ ] Skill doc sync

---

## Testing matrix

1. Q1: nine regions; ≥1 kinetic; ≥1 non-domestic
2. No user step 质感 / Sound
3. M2: all options in M1 world; no abstract mood chips; distinct `emotionSlot`
4. M3: body in same scene; distinct `tempoSlot`; groove turn has gloss + `you-decide`
5. `m_clarify` only on `coverageRisk`; film-stills only
6. ClearDiscriminant only on `coverageRisk` — not entropy alone
7. No vending-hum / opaque sonic stems without gloss
8. Inferred M5 in prompt without user M5 chip
9. Plural hypotheses → curate ≥2 tracks per cluster; no 26× one subgenre
10. `edge-charged` does not over-filter aggressive avoids
11. Old sessions with stored `m5` still work
12. E2E: porch M1 + wistful concrete M2 + still body M3 → brief uses slots, not chip words *calm*/*hold*

---

## Production vs target

| | Production today | v3 target |
|--|------------------|-----------|
| Steps | 5 (incl. user m5) | 4–6 dynamic |
| Q1 regions | 6 | 9 |
| M2 | LLM varies | Concrete in M1 scene; internal slots |
| M3 | LLM varies | Body in scene; groove LogicalDecision |
| Sonic | User 质感 | Inferred M5 |
| Ambiguity | — | Curate spans `hypotheses[]` |
| Precision | — | `coverageRisk` only |

---

## Related files

- [INTERVIEW-STRATEGY-COVERAGE-REPORT.md](./INTERVIEW-STRATEGY-COVERAGE-REPORT.md) — genre tier analysis (optional)
- [AGENTS.md](../AGENTS.md) — project guide
- `apps/api/src/llm/interview/prompts.ts` — implementation

**Historical only:** [INTERVIEW-STRATEGY.md](./INTERVIEW-STRATEGY.md), [INTERVIEW-STRATEGY-v2.md](./INTERVIEW-STRATEGY-v2.md)
