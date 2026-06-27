/** Q4 discriminant modes when M4 avoid gate fails (<4 eligible traps). */

export const positiveDiscriminantBlock = `## PositiveDiscriminant mode (M4 discriminant fallback)
Single-select; NO id "none". Advance one M3 prop in the SAME scene world.
Ask what **fits** — felt motion, groove, or spatial texture — NOT what to skip.
**FORBIDDEN stem:** "must NOT sound like", "avoid", "skip", reject framing — use positive fit questions only.
Plain felt language in labelEn/labelZh; no genre names, no gear lists.`;

export const discriminant1aBlock = `## Discriminant 1a — energy / pace
**Stem:** one M3 beat still visible + plain body-motion question in scene world.
**Options:** distinct pace registers — steady pulse, loose sway, barely moving, forward push.
**Map:** M3 refinement / FLOW for curate.`;

export const discriminant1bBlock = `## Discriminant 1b — sonic groove / timbre
**Stem:** one M3 prop + positive fit question ("which groove feels closest?" / "哪一下节拍最像你？").
**FORBIDDEN stem words:** not, avoid, skip, must not, 不该, 不要, 最不该
**Options:** distinct timbre/groove reads — dusty pocket, almost no beat, warm low end, sharp edge.
**FORBIDDEN option shape:** Skip/Avoid trap labels; trap cluster ids (gym-hype, elevator-muzak, etc.)

**Good example (invent fresh stem):**
- Stem: "Still drifting in that bed — which groove feels closest?"
- Options: "Loose sway, barely there" · "Warm low end, dusty pocket" · "Wide air, far hum" · "Close breath, soft pulse"

**Bad example (reject):**
- Stem: "What must it not sound like?"
- Options: "Skip gym hype" · "Avoid elevator muzak"

Examples: "Beat, breath, or distortion?" · "Dusty drums or almost none?"
**Map:** primary M5 sonic seed — user pick becomes felt sonic floor.`;

export const discriminant1cBlock = `## Discriminant 1c — latent axis (space / density / grain)
**Stem:** one M3 prop + spatial or textural question in scene metaphor.
**Options:** space (close vs hallway), density (one lamp vs many), grain (behind beat vs on grid).
Examples: "Close breath, or from the hallway?" · "One lamp or many candles?"
**Map:** M5 + latent axis tag for curate.`;

export function discriminantBlockForMode(
    mode: 'discriminant-1a' | 'discriminant-1b' | 'discriminant-1c'
): string {
    switch (mode) {
        case 'discriminant-1a':
            return `${positiveDiscriminantBlock}\n\n${discriminant1aBlock}`;
        case 'discriminant-1b':
            return `${positiveDiscriminantBlock}\n\n${discriminant1bBlock}`;
        case 'discriminant-1c':
            return `${positiveDiscriminantBlock}\n\n${discriminant1cBlock}`;
    }
}
