export const sceneFeelingBlock = `## SceneFeeling mode (M1, M2, M3, m_clarify)
User copy = concrete story moments with **objects and events** — "that's me here".
Never genre menus, mood adjective stacks, or meta explanations of the question type.`;

export const storyM1Block = `## M1 Scene — pick a place
**User job:** pick **which world** I'm in (coverage partition — 4–6 distinct places).

**When plan sets m1StemMode=threshold-invite or optionRole=place-partition:** threshold stem is mandatory — never a locked single-world caption.

**Output shape**
- **Stem:** threshold invite + explicit ask — light sensory anchor, then pick-a-still question. Stem must NOT describe one specific option world (no workbench-only caption, no locked kitchen/car/platform scene).
- **Options:** each chip = one **place/world** (transit, venue, home, outdoors, workplace, …) — not a moment inside the stem scene.
- **EN + ZH:** compose independently; imagist free verse / 现代诗 for labels only.

**Good (structural):** Stem asks "Pick a still — where are you?" / "选一处画面——你此刻在哪里？" · Options: platform / kitchen / highway / studio (distinct worlds).

**Anti-pattern:** Scene caption stem (workbench detail, no ask) + options that mix unrelated worlds — user cannot tell what to decide.`;

export const storyM2Block = `## M2 Mood — moment in the M1 scene
**User job:** pick **which moment** in the M1 world is most you (BGM test).

**Output shape**
- **Stem:** name M1 world + explicit ask which beat/moment — must include pick/choose framing (which moment feels most like you?).
- **Options:** concrete objects + event **in M1 world only** — **max 12 words EN** (hard limit); one prop + one action per chip.
- **FORBIDDEN:** mood-poetry without props; production vocab (drop, kick, BPM); stem re-captioning M1 pick verbatim.

**Anti-pattern:** abstract mood poetry; 3+ interchangeable crowd-energy lines; stem copies an option chip verbatim.`;

export const storyM3Block = `## M3 Night chapter — where is tonight in the story?
**User job:** pick **where tonight is** in the story arc (same M1 world).

**Output shape**
- **Stem:** chapter ask with explicit frame — 这一晚进行到哪一段？ / Which beat happens next in the story?
- **Options:** story beats (props, light, action) — max ~12 words EN; no production vocab (drop, kick, BPM).

**Anti-pattern:** universal drift metaphor without branching ("where does the night pull you?"); body-part choreography; music-pattern poetry dressed as scene.`;

export const logicalDecisionBlock = `## M3 LogicalDecision — groove grain (only when coverageRisk + needsGrooveGrain)
Plain body-move main lines + you-decide / 你来定. Put groove read in the main label (even pulse, loose sway) — never name genres.`;

export const clearDiscriminantBlock = `## ClearDiscriminant mode (M4 avoid) — register flip
M1–M3 = story film-stills. **M4 avoid = plain skip/avoid trap sentences — NOT scene poetry.**

Multi-select negatives; include id "none".

**User job:** pick **what to skip** sonically (playlist traps).

**Stem shape:** advance one concrete prop/beat from M3 in the SAME scene world. Ask what the **soundtrack must NOT sound like** — sonic reject only.
- REQUIRED: scene prop from M3 + plain reject question ("what should this NOT sound like?" / "这(段)配乐最不该像什么？")
- stemEn/stemZh: compose each language independently — same prop + ask, not line-by-line translation
- FORBIDDEN in stem: scene-transformation (变成什么, turn into, not become); guardian/meta framing

**Options — trap names only (no scene nouns):**
- labelEn MUST start with **Skip** or **Avoid** + trap lexicon
- labelZh = parallel plain trap name — vary openers (避开/不要/别选/别听/别掉进)
- **Id shape:** trap cluster id from eligible roster — not too-* mood-template ids
- **Filter coherence:** plannedOptionIds from eligible trap clusters only`;
