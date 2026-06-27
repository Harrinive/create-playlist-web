# Interview prompt strategy — shape-first, not ban-first

**Status:** In progress — M1 shape gates implemented in prompts + verify (2026)  
**Product canon:** [INTERVIEW-STRATEGY.md](./INTERVIEW-STRATEGY.md)  
**Process:** `~/.cursor/skills/grader-editor-loop/` + `~/.cursor/skills/prompt-editing/`  
**Repo runner:** `apps/api/scripts/run-interview-path-matrix.ts`, `test-m4-scenarios.ts`

---

## Problem

Interview copy tuning has drifted toward **failure-mode avoidance**: each bad run adds another anti-pattern sentence (calques, 变成, repeated 别要, …). That cannot converge — there are infinitely many ways to write bad copy.

Typical **structural** failure (worse than voice issues):

- **M1 stem** is a scene caption (“sunlight on the workbench…”) with **no ask**.
- **Options** are a coverage partition (highway, kitchen, platform) while the stem **already locked** one world (workbench).
- The user cannot tell what decision they are making.

Voice polish (native Chinese, no 英译腔) does not fix this. The model can satisfy “imagist poetry” and still fail the **user job**.

---

## Principle

> **Prompts define shape and register. Code enforces invariants.**

| Layer | Holds |
|-------|--------|
| **Turn shape / user job** | What the user decides this step (place, moment, chapter, trap skip, …) |
| **Planner JSON** | Partition, regions, option roles, stem mode — authoritative structure |
| **Draft prompt** | Prose inside the plan — labels only, no geometry changes |
| **Deterministic verify** | Finite must-pass rules (ask present, frame match, counts, eligibility) |
| **Copy verify / revise** | Native ZH, rhythm, register — **after** structure passes |

Do **not** add a new prompt sentence for every failed phrase. Generalize once, then **move repeated checks to code** or **planner fields**.

---

## User job per turn (positive contract)

Each step has **one user job**. Grader and verify should enforce this before literary quality.

| Turn | User job | Stem must | Options must |
|------|----------|-----------|--------------|
| **M1** | Pick **which world** I’m in | Invite a **place choice** (threshold / pick-a-still) — include an explicit ask | **4–6 distinct places** (coverage partition) — not moments inside the stem scene |
| **M2** | Pick **which moment** in that world | Frame M1 world + ask which beat | Concrete objects/events **in M1 world** |
| **M3** | Pick **where tonight is** in the story | Chapter ask in same world | Story beats, same world |
| **M4 avoid** | Pick **what to skip** sonically | M3 prop + sonic reject (`最不该像什么`) | Plain trap names only (+ `none`) |
| **M4 discriminant** | Pick **what fits** (pace / groove / space) | Positive fit ask on M3 prop | Separable felt axes — no trap wording |

**M1 anti-confusion rule:** If the stem describes one specific place (workbench, car, platform), options cannot include unrelated worlds unless the stem is **threshold-neutral** (invitation to pick a still, not a caption of one still).

---

## Planner owns structure; draft owns prose

Today the planner outputs regions and slots, but the draft still improvises turn geometry → caption stems, wrong option roles, incoherent frames.

**Target:** planner emits structured intent the draft cannot override:

```text
m1StemMode: "threshold-invite" | "single-scene-caption"  // prefer threshold-invite only
optionRole: "place-partition" | "moment-in-scene"       // M1 = place-partition only
plannedOptionIds + optionSlots.regionId                 // coverage — already partially there
```

Draft system prompt becomes: *Fill labels for this plan; do not change roles or partition.*

Structural bugs are caught **before** copy polish, not after five LLM verify retries.

---

## Mechanical gates (finite invariants)

Move “must always be true” checks into `verify-deterministic.ts` (and planner validation), not prose.

| Invariant | Step | Suggested enforcement |
|-----------|------|------------------------|
| Stem contains an ask | M1, M2, M3 | Hard-fail if `stemHasExplicitAsk()` is false (today only used for hint redundancy) |
| M1 options = place partition | M1 | Fail if stem anchors one setting and ≥2 options imply incompatible settings (heuristic or `m1StemMode === threshold-invite`) |
| Stem ≠ option verbatim | All | Already in `verify-stem-distinct.ts` |
| M4 avoid: `像什么`, not `变成` | M4 avoid | Already added — keep in code, one line in prompt |
| M4 discriminant: no parallel `…感` chips | M4 1b | Already added — keep in code |
| Trap eligibility / canonical labels | M4 avoid | `m4-eligibility.ts` registry |

**Litmus:** If a rule can be expressed as regex, slot check, or schema field, it belongs in **code**, not another bullet in the system prompt.

---

## Shrink live prompts

Current prompts mix canon + voice + coverage + bans + examples → model optimizes poetry and ignores the ask.

**Target layout per stage (~15 lines):**

1. Role + **user job** (one sentence)
2. **Output shape** (fields + register)
3. One **structural** good/bad pair (not full sample outputs)
4. “Turn plan / filter hints are authoritative”

Keep long product rationale in **docs** and **grader canon** (`INTERVIEW-STRATEGY.md`, skill files), not duplicated in every system prompt.

Stable headers: `## User job`, `## Output shape`, `## Anti-patterns` (one pair max).

---

## Grader rubric shift

Grade **task completion** first, voice second.

### Blocking (structure)

1. Can the user answer in ~5 seconds without re-reading?
2. Is every option in the same **decision frame** as the stem?
3. Does each pick clearly narrow playlist hypotheses?

### Warnings (copy)

- 英译腔, calques, loanwords, repetitive openers
- Literary quality, 现代诗 rhythm

**Pass bar for a batch loop:** structure **100%**, copy **≥80%** — not 100% on everything via more bans.

---

## Fixtures = product scenarios

Prefer golden **paths** over failure archives.

| Runner | Use |
|--------|-----|
| `run-interview-path-matrix.ts` | Full M1→M4 regression |
| `orchestrate-step.ts` | Single step + prior JSON |
| `test-m4-scenarios.ts` | M4 batch (good pattern to copy for M1) |

Add **5–8 golden M1 scenarios** graded on:

- Explicit ask in stem
- Place-partition options (coverage span)
- Native ZH (secondary)

Validate **≥2 divergent paths** after each editor round (principle F in `prompt-editing`).

---

## Example: workbench caption failure

| Symptom | Root cause | Ban-list fix (avoid) | Shape fix (do) |
|---------|------------|----------------------|----------------|
| “Not even a question” | M1 allows scene-only stem | “Don’t write captions” | Hard-fail M1 without ask; stem mode = threshold-invite |
| Highway chip under workbench stem | M1 treats options as moments, not places | “Don’t mix settings” | Planner `optionRole=place-partition`; stem must not lock one world |
| Pretty but useless | Voice weighted over user job | More poetry rules | Lead prompt with user job; poetry constrains label prose only |

---

## Recommended edit loop (next)

Do **not** run another copy-only pass until M1 structure is gated.

```text
1. Grader  — score 8–10 M1 outputs on task clarity + stem/option frame only
2. Editor  — one pass:
             - story-native M1 block (user job + shape)
             - verify-deterministic: M1 ask gate + frame check
             - planner fields for m1StemMode / optionRole (if needed)
3. Regenerate — Q1 matrix only
4. Stop when every M1 has an explicit ask and place-partition options
```

After M1 shape is stable, resume copy loops (ZH naturalness) with the same shape-first grader.

---

## Related docs

| Doc | Role |
|-----|------|
| [INTERVIEW-STRATEGY.md](./INTERVIEW-STRATEGY.md) | Product design — what good interviews do |
| [INTERVIEW-M4-AVOID.md](./INTERVIEW-M4-AVOID.md) | M4 trap eligibility |
| This file | **How** to tune prompts without ban-list creep |
| `.cursor/skills/prompt-editing-playlist/SKILL.md` | Repo paths + runners |
