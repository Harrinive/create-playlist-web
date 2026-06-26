/** Shown in draft/verify prompts — zero-gloss policy (API still accepts gloss fields for future use). */
export const noGlossOutputBlock = `## Copy in main fields only
- Put the full user-facing beat in stemEn/stemZh and labelEn/labelZh.
- Do **not** emit stemGlossEn, stemGlossZh, glossEn, or glossZh — omit those JSON keys entirely.
- M4 non-"none" options: plain playlist-trap language in the main label (e.g. skip elevator muzak, avoid gym hype) — not poetic metaphor plus a decoder.`;

export const concreteStoryRules = `## Concrete story beats (M1–M3) — mandatory
Each option = **recognizable scene with objects and events** — not mood poetry.

**Shape:** props + light + action the user can picture — a film still, not a feeling label.
**Anti-patterns:** abstract mood verbs without objects; body-part choreography; duplicate crowd-energy variants; music-production vocabulary dressed as poetry.

M2 asks which **moment in the M1 scene** — name what is happening, not abstract feeling labels.
Options must be **visually distinct** — partition different concrete moments, not the same energy register five ways.`;

/** @deprecated Prompts use noGlossOutputBlock; kept for future gloss re-enable. */
export const stemGlossRules = noGlossOutputBlock;

/** @deprecated Prompts use noGlossOutputBlock; kept for future gloss re-enable. */
export const optionGlossRules = noGlossOutputBlock;

export function buildGlossRulesBlock(_stepId: string): string {
    return noGlossOutputBlock;
}
