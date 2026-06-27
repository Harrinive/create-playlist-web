export const sceneFeelingBlock = `## SceneFeeling mode (M1, M2, M3, m_clarify)
User copy = concrete story moments with **objects and events** — "that's me here".
Never genre menus, mood adjective stacks, or meta explanations of the question type.`;

export const storyM1Block = `## M1 Scene — pick a place
User answers: "I'm in this place" — NOT "where does the music begin".

**Stem shape:** one film-still beat — concrete objects/light + scene invitation. No music/soundtrack vocabulary in stem or options.
**Anti-patterns:** quiz framing that asks where music "begins" or "lands"; abstract mood without a place you can picture.`;

export const storyM2Block = `## M2 Mood — story in the M1 scene
Ask: which **moment in this scene** is most you? (BGM test)

Each option = **concrete objects + event** in the M1 world — a still you can picture.
NOT abstract mood poetry, NOT body-part choreography, NOT five variants of the same crowd-energy register.

**Distinctness:** each option must differ by props, focal points, or actions — not 3+ interchangeable "room/crowd" mood lines.
**Register spread:** when kinetic genres remain reachable, span social heat across options (intimate still vs busier corners) — not five copies of the same energy level.
**Continuity:** options stay in the M1 world — no scene reset.
**Stem vs options:** stem asks or frames the turn — never copy an option chip verbatim in stemEn/stemZh.`;

export const storyM3Block = `## M3 Night chapter — where is tonight in the story?
Ask: 这一晚，进行到哪一段了？ / Where is tonight in the story?

Each option = one story beat (1–2 sentences max). Same M1 world.

**Anti-patterns:** tempo/energy labels; body-part choreography; music-pattern narrative dressed as poetry.
**Shape:** name what is happening (props, light, action) — a chapter beat the user recognizes, not abstract feeling labels.`;

export const logicalDecisionBlock = `## M3 LogicalDecision — groove grain (only when coverageRisk + needsGrooveGrain)
Plain body-move main lines + you-decide / 你来定. Put groove read in the main label (even pulse, loose sway) — never name genres.`;

export const clearDiscriminantBlock = `## ClearDiscriminant mode (M4 avoid) — register flip
M1–M3 = story film-stills. **M4 avoid = plain skip/avoid trap sentences — NOT scene poetry.**

Multi-select negatives; include id "none".

**Stem shape:** advance one concrete prop/beat from M3 in the SAME scene world. Ask what the **soundtrack must NOT sound like** — sonic reject only.
- REQUIRED: scene prop from M3 + plain reject question ("what should this NOT sound like?" / "这配乐最不该像什么？")
- FORBIDDEN in stem: scene-transformation asks ("turn into", "become", "shift into"); poetic metaphor; vague "feels wrong/off in the room"; guardian/meta; "must not enter" language

**Options — trap names only (no scene nouns):**
- labelEn MUST start with **Skip** or **Avoid** + a trap-lexicon word (muzak, hype, cliché, swell, rabbit hole, etc.)
- labelZh = parallel plain reject (别要… / 避开… / 不要…) — same trap, not scene poetry
- **Id shape:** trap cluster id from eligible roster — not mood-adjective template ids (too-* pattern)
- **No scene nouns in options:** no bed, kitchen, rain, neon, crowd, etc. — traps only
- **Filter coherence:** plannedOptionIds must come ONLY from eligible trap clusters in filter hints; honor mandatory keepers (e.g. "Do NOT drop aggressive"). Each trap guards a different remaining hypothesis.`;
