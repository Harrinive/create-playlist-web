# Interview strategy v4 (coverage-first · story-native · agent-reasoned genres)

**Status:** Proposed — second-round redesign (post–v3 UX review)  
**Implementation:** **Implemented** in `apps/api/src/llm/interview/` (2026-06-25)  
**Audience:** Implementers and agents — **read this file** for the current interview iteration  
**Prior art:** [INTERVIEW-STRATEGY-v3.md](./INTERVIEW-STRATEGY-v3.md) (shipped to `main` 2026-06-25) · v1/v2 historical  
**Genre analysis (optional):** [INTERVIEW-STRATEGY-COVERAGE-REPORT.md](./INTERVIEW-STRATEGY-COVERAGE-REPORT.md)  
**Skill canon (sync when shipping):** `~/.cursor/skills/create-playlist/step-1-interview.md`  
**Current production:** v4 pipeline in `apps/api/src/llm/interview/` — story-native M2/M3, agent-reasoned `reachableGenresNote`, 2–6 options, auto 3-sentence story after M3

---

## One-sentence goal

Help the user **recognize themselves in concrete scenes and stories**. Before each new question, the **interviewer agent re-reads all prior answers** and privately asks: *what music flavors / genres are still reachable?* Later questions **split what remains** when useful — with **2–6 options** (not a fixed count). Unresolved ambiguity is OK; **curate** picks a coherent tracklist from what’s still plausible and **delivery** explains that in plain language.

---

## What we are **not** building

| Rejected approach | Why |
|-------------------|-----|
| Fixed roster of ~20 internal neighborhood IDs | Hard to maintain; false rigor; “spanning” tests become a second product |
| Huge tree of unresolved genres (`candidateGenres[]` updated deterministically) | Documents 5^5-style combinatorics; brittle; overlaps with story layer |
| Forcing curate to “cover” every neighborhood in a JSON list | Spanning is difficult and not the user promise |
| 8–10 options on Q1 | Too many; **~6 upper limit** recommended |
| Fixed 5 options every turn | Use **2 options** when only two forks remain |

**Instead:** genre reachability lives in the **agent’s head** (plan + curate prompts), grounded in prior answers — same as a skilled human interviewer.

---

## What v3 got wrong (UX review summary)

| Issue | Example | Why it fails |
|-------|---------|--------------|
| **Middle-ground chips** | *Head nods on the 2 beat, feet stay planted* | Neither story nor clear music read |
| **Music pattern in story clothing** | *The kick switches; person mid-sentence stops talking* | User hears production vocabulary, not a life moment |
| **Abstract mood labels** | *Even, clean, fully settled* | User must translate → music |
| **Micro-drama beats** | *Fork still lifted, waiting for the next sentence* | Not background-music mood |
| **False precision** | Separating house vs techno in story chips | Users can’t feel the difference there |

**User mental model:**

1. **Q1** — I’m **in this place**.  
2. **Q2** — This is **how it feels** (soundtrack mood).  
3. **Q3** — **Where the night is in its story** (energy arc — not BPM).  
4. **Synthesis** — Short **3-sentence story** (scene · mood · energy).  
5. **Music** — Plays like the **background to that story**; genre is inferred, not quizzed.

---

## Core principles

### 1. Coverage over pinning one genre

- Goal is **not** a unique Spotify subgenre ID.  
- Goal is **not** to maintain a complete genre taxonomy in code.  
- Goal **is**: user never feels *“no playlist could match what I meant.”*  
- **OK** if several genre flavors stay reachable until curate — or even after delivery.

### 2. Never mix layers in user-facing copy

| Layer | User copy | When |
|-------|-----------|------|
| **Vibe / scene / story** | Concrete story, atmosphere, felt moment | M1–M3, story, optional clarify |
| **Music / logical** | Plain language + gloss; `you-decide` | M4 avoid · optional groove fork only |

**Hard rule:** If a chip only makes sense if you know what a kick drum is → **not** M2/M3.

### Clarifiers (gloss) — when to use

| Surface | Default | Use gloss only when… |
|---------|---------|----------------------|
| **Stem** (`stemGloss`) | **Omit** on M1–M3 | Never to meta-explain the question ("neutral scene question", "问音乐最先像落在什么地方"). |
| **M1 options** | Optional | Main chip is poetic — gloss adds **concrete** social/energy register the chip does not spell out. |
| **M2 / M3 options** | **Omit** | Main chip must be a self-contained **concrete story beat** (objects + event). |
| **M4 options** | Required on poetic non-`none` | Decodes reject cluster in plain language. |

**Verifier (full mode):** deterministic + logic checks reject redundant stem gloss, vague mood-poetry chips, duplicate-feeling M2/M3 options, and M2/M3 option gloss.

### 3. No middle ground

Each option passes **story test** (*I’d put this on in the background here*) **or** **music-logical test** (M4 / explicit fork with gloss).

### 4. Agent-reasoned reachable genres (central v4 rule)

**Every** plan / draft turn, the agent MUST:

1. **Re-read** all prior answers (and opening context, rejects).  
2. **Privately list** remaining **reachable** music flavors — use **normal genre language** the agent already knows (indie folk, trip-hop, house party, ambient, etc.), not a mandated internal slug table.  
3. **Design this turn’s question** to split or weight what’s still reachable — only when a split helps.  
4. **Record briefly in plan JSON** (prose OK): `reachableGenresNote` — for curate and delivery, not shown verbatim to user.

No fixed tree to traverse. No requirement that options map 1:1 to genre tags.

**Example private planner note (after Q1 amp room):**

> Still reachable: heavy electronic room/listening, industrial-leaning noise, dub/downtempo weight, social house-party (don’t split house vs techno in user copy), breakbeat/jungle if energy goes forward, afterhours cooldown if user is mentally leaving.

User never sees this; curate and delivery agent do.

---

## Per-turn agent checklist (plan phase)

```text
1. Read prior answers + story so far
2. What genres / flavors are STILL reachable? What is ruled out?
3. Is another question worth it?
   - Yes if ≥2 reachable clusters would produce meaningfully different playlists
   - No if one coherent brief is enough → skip to story / M4 / curate
4. If yes: pick stem + options (2–6) that split reachable set via STORY, not genre menus
5. Option count = min(6, max(2, number of meaningful forks)) — 2 options is fine
6. Write reachableGenresNote for downstream
```

**Stop early** when the agent judges curate can handle the remaining spread in ~26 tracks — typically **3–5 user turns**, not a fixed 5^5 tree.

---

## Option count (adaptive)

| Situation | Options |
|-----------|---------|
| Only two meaningful forks left | **2** |
| Three distinct story branches | **3** |
| Default upper bound | **~6** |
| Q1 scene question | **4–6** (not 8–10) |

**No minimum** beyond what the fork requires. Merge indistinguishable branches.

---

## Target flow (v4)

```text
[optional] Opening path
  → m1 Scene (4–6 options · agent lists reachable genres after answer)
  → m2 Mood in scene (story · 2–6 options · agent revisits reachable genres)
  → m3 Night chapter (story arc · 2–6 options · agent revisits again)
  → [new] story synthesis — 3 sentences
  → [optional] extra turn ONLY if agent still sees ≥2 very different reachable playlists
  → m4 Avoid (music-logical)
  → infer M5 (server-side · not user-facing)
  → curate (reads answers + story + reachableGenresNote)
  → delivery note in plain language
```

Turn **roles** (m1/m2/m3) are **guidance**, not rigid slots — agent may insert an extra discriminant turn or stop at three if coverage is already fine.

---

## M1 Scene

### Coverage backend (planner only)

Keep **nine region IDs** in `Q1_COVERAGE_REGIONS` for **offline coverage audits** — which broad territories each Q1 option must keep reachable in the long run.

### User-facing Q1

- **4–6** scene options (recommended upper limit **~6**).  
- Each option = one film-still; invent fresh wording.  
- Regions can **share** a chip or tag multiple regions in plan JSON — user does not see nine buttons.

**After user answers Q1**, agent writes `reachableGenresNote` — broad, honest list of what’s still on the table (prose, not slug enum).

---

## M2 Mood — story-native

**Ask:** *Which moment is most you?* — thought + atmosphere; BGM test.

**Chip rules:** ban abstract mood stacks, micro-drama, music-pattern poetry. **2–6 options.**

**Agent:** before drafting, re-read Q1 + update reachable genres; options should **feel different as background music**, not tag different genres on the label.

### Example (domestic Q1)

**Q1:** 用过的盘子在凉，灯火还留着余温  

**Stem:** 灯还留着余温——哪一幕最像你？

| Option (EN) | 中文 |
|-------------|------|
| Plates stacked, steam flat — evening feels put away | 碗碟收净，热气也平了 |
| Cold at the window, lamp heat still on your arms | 窗边凉，灯热还贴在臂上 |
| Two cups left out on purpose — nobody clearing yet | 两只杯子故意没收 |

---

## M3 Energy — story chapter

**Ask:** *Where is tonight in the story?* — not BPM, not body-part choreography.

**Chip rules:** ban kick/drop/grid language. **2–6 options.**

**Agent:** re-read Q1–Q2; reachable genres may **narrow** or **stay plural**; do not force a unique genre.

### Example (amp room)

**Stem:** 这一晚，进行到哪一段了？

| Option (EN) | 中文 |
|-------------|------|
| One drink became three — jacket folded on the pile again | 本来一杯，现在夹克又在衣堆上折了一遍 |
| Kitchen is the real room; the front is just speakers | 厨房才是真主场 |
| Already in the taxi queue in your head — receipt, streetlight, cold air | 脑子里已在排队打车 |

---

## Story synthesis

After last vibe turn, agent writes **3 sentences**: scene · mood · energy chapter.

Curate uses **full answer history + story + reachableGenresNote** — not a structured genre tree.

---

## M4 Avoid

Unchanged from v3: ClearDiscriminant, gloss on poetic rejects, `none` option.

---

## Curate & delivery

**Curate system prompt (add):**

> Read all interview answers and the 3-sentence story. Read `reachableGenresNote` from the last plan. Pick ~26 tracks that fit the **story and feeling**; draw from **whatever genres are still reachable** — you may emphasize one flavor or blend several if the answers stay ambiguous. Do not invent precision the user did not give.

**Delivery note (plain language, agent-written at curate or delivery step):**

> Based on what you described — *[one-line story hook]* — we leaned toward **[flavor A]** and **[flavor B]** in this playlist. That’s the feeling, not a single genre label.

Use **widely understood words** (late-night electronic, cozy indie, social dance energy) — not internal slugs.

If only one cluster remains, say so simply. If many remain, say **blend** — don’t pretend the interview pinned one genre.

---

## Verify (v4 — lightweight)

| Check | How |
|-------|-----|
| Q1 region reach (offline) | Fixture / audit script — not per-request genre tree |
| Option count | **2–6** (soft max ~6 on Q1) |
| M4 none + gloss | deterministic |
| No music-pattern words in M2/M3 | deterministic ban list |
| Story / BGM test | logic LLM on user copy |
| **Reachable genres considered** | plan prompt requirement + spot-check; **not** deterministic partition of slug list |

Drop v3-style “each option must map to distinct slot on axis” when it forces middle-ground chips.

---

## v3 → v4 migration

| v3 | v4 |
|----|-----|
| `hypotheses[]` / candidate slug lists | `reachableGenresNote` (prose) in plan |
| 8–10 Q1 options | **4–6** Q1 options |
| Fixed 5-step semantics | **Adaptive** turns + **2–6** options |
| M3 body choreography | M3 **night chapter** story |
| Spanning neighborhoods in curate | Curate reads story + agent genre note |
| Strict slot collision verify | Verify **story distinction** + bans |

---

## Implementation checklist

1. [ ] Plan prompt: mandatory “re-read prior answers → reachable genres → design split” block  
2. [ ] `TurnPlan`: add `reachableGenresNote?: string`; drop or demote rigid `candidateGenres[]`  
3. [ ] Q1: cap options at ~6; keep nine-region **audit** separate from user option count  
4. [ ] Rewrite M2/M3 prompt blocks (story-native + bans)  
5. [ ] Adaptive `resolveInterviewStep`: allow early stop / optional 5th turn  
6. [ ] Story synthesis step after vibe turns  
7. [ ] Curate + delivery: consume `reachableGenresNote` + story  
8. [ ] Tests: banned words; Q1 option count; **not** full genre tree coverage in CI  

---

## Quick reference — good vs bad

| Good | Bad |
|------|-----|
| Agent privately: *“still reachable: trip-hop, downtempo, social dance…”* | Maintaining `neighborhoods.json` with 20 IDs |
| 2-option fork when only two stories differ | Always 5 options |
| *Jacket folded on the pile for the third time* | *Kick switches; person stops talking* |
| Delivery: *leaned toward late-night electronic and a social-dance warmth* | Delivery: *tech house 128 BPM* |
| Q1 with 5 scene options | Q1 with 9 scene options |

---

## Open decisions

1. Store `reachableGenresNote` on `InterviewPlannerState` and overwrite each turn, or only pass full transcript to curate?  
2. Story step: user edit or auto-only?  
3. Optional 4th vibe turn: agent-triggered only when reachable set still very wide?

---

*v4 (rev 2): story-native questions, adaptive 2–6 options, ~6 Q1 cap, agent-reasoned reachable genres — no fixed neighborhood roster or genre tree.*
