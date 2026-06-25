import { joinSections } from '../join.js';

export const stemGlossRules = `## Stem gloss (stemGlossEn / stemGlossZh) — almost never
- **Default: omit** stemGloss on M1–M3 and m_clarify. The stem must stand alone.
- Use stemGloss **only** when the stem is genuinely obscure and needs one concrete decode — never to meta-explain the question type.
- **Forbidden stem gloss:** repeating or paraphrasing the question; labeling the question type ("scene question", "neutral scene question", "ask which feeling…").
- If the stem is clear, leave stemGlossEn and stemGlossZh **out of JSON entirely**.`;

export const m1StemRules = `## M1 stem — scene only (no music quiz)
- User picks a **place / film-still** — NOT "where does the music begin".
- **Forbidden in stemEn and stemZh:** music, soundtrack, song, BGM, 音乐, 配乐, 背景音乐, or quiz framing that treats the stem as a music-placement question.
- **Shape:** concrete objects/light + scene invitation — a place the user can enter, not a soundtrack prompt.`;

export const optionGlossRules = `## Option gloss (glossEn / glossZh) — only when the chip is vague
- **M1:** gloss OK when the main chip is poetic — gloss adds **concrete** social/energy register the chip does not spell out. Must not repeat the main line.
- **M2 / M3:** **omit gloss** — the main chip must be a self-contained concrete story beat (objects + event). No parenthetical mood stacks.
- **M4:** gloss required on poetic non-"none" avoids — decode reject cluster.
- **M4 gloss shape:** one plain sentence naming playlist/production traps (cliché register, hold music, trailer swell, gym hype, etc.) — not mood re-description of the chip.
- **Forbidden gloss:** mood adjective stacks that echo the main chip; parallel templates on every option; "room that feels…" paraphrase instead of trap names.`;

export const concreteStoryRules = `## Concrete story beats (M1–M3) — mandatory
Each option = **recognizable scene with objects and events** — not mood poetry.

**Shape:** props + light + action the user can picture — a film still, not a feeling label.
**Anti-patterns:** abstract mood verbs without objects; body-part choreography; duplicate crowd-energy variants; music-production vocabulary dressed as poetry.

M2 asks which **moment in the M1 scene** — name what is happening, not abstract feeling labels.
Options must be **visually distinct** — partition different concrete moments, not the same energy register five ways.`;

export function buildGlossRulesBlock(stepId: string): string {
    if (stepId === 'm4') {
        return joinSections(optionGlossRules);
    }
    if (stepId === 'm2' || stepId === 'm3') {
        return joinSections(stemGlossRules, concreteStoryRules, optionGlossRules);
    }
    if (stepId === 'm1') {
        return joinSections(stemGlossRules, m1StemRules, optionGlossRules, concreteStoryRules);
    }
    return joinSections(stemGlossRules, optionGlossRules, concreteStoryRules);
}
