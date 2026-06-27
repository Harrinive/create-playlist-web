/** Stem (headline) vs hint (subtitle) — M1–M3 and m_clarify. */
export const stemHintOutputBlock = `## Stem vs hint (hintEn / hintZh)
**Stem** = film-still + question when needed. **Hint** = optional subtitle — a *different* layer only.

**Shape A (default):** stem carries scene + ask → **omit** hintEn and hintZh entirely.
**Shape B:** stem is scene image only (no ask words) → one plain hint line for task or mechanics.

**Hint may add when stem lacks it:**
- Interaction mechanics (M4 multi-select: pick any / 可多选)
- Turn axis when stem is pure image (M2: which moment; M3: which chapter)
- Continuity anchor to prior turn when stem dropped the prop

**Anti-patterns:**
- Hint restates the stem ask (选/走进/哪一处/最像 ↔ pick/choose/step into/most like)
- Hint paraphrases the invitation in plainer UX copy when stem already asked
- Scene poetry duplicated in hint — hint is plain, not a second poem`;

export const m4HintOutputBlock = `## M4 hint (optional)
Use hint only for **mechanics** (e.g. multi-select: pick any that apply / 可多选).
Do not restate the sonic-reject question if stemEn/stemZh already asks what to skip.`;
