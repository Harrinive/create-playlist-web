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
**FORBIDDEN stem words:** not, avoid, skip, must not, 不该, 不要, 最不该, 哪种感觉最贴近
**Options:** one chip each on **pace · groove grain · timbre/body · space** — clearly separable felt fits.
**FORBIDDEN option shape:** Skip/Avoid trap labels; trap cluster ids; four parallel 「…感」 labels that differ only by soft adjective.

**Good example (invent fresh stem):**
- Stem: "Still drifting in that bed — which groove feels closest?"
- Options EN: "Loose sway, barely there" · "Warm low end, dusty pocket" · "Wide air, far hum" · "Close breath, soft pulse"
- Options ZH (independent): 「几乎静着，只有呼吸在晃」·「低处闷闷的鼓点」·「远一点的空旷回声」·「贴身的细脉冲」

**Bad example (reject):**
- Stem: "What must it not sound like?" / "哪种感觉最贴近？"
- Options: "Skip gym hype" · "Avoid elevator muzak"
- Options ZH: 「轻轻摇晃感」「柔和的脉动感」「暖暖的低频厚感」「空气感更开阔」 — overlapping soft-groove axis

**Map:** primary M5 sonic seed — user pick becomes felt sonic floor.`;

export const discriminant1cBlock = `## Discriminant 1c — latent axis (space / density / grain)
**User job:** pick one felt **space/density/grain** fit — not a scene still.

**Stem:** one M3 prop + name the axis in scene language (close vs far / one vs many / behind-beat vs on-grid).
**FORBIDDEN:** generic "which texture fits best" without naming the axis; scene-poetry option labels.

**Options:** partition ONE axis only — e.g. all spatial distance, or all density, or all grain.
**Shape:** plain felt chips (~3–9 words EN) — not mini scene paragraphs; NO Skip/Avoid/no/not wording.
**Escape hatch:** when plan includes id \`open-any\` or \`no-constraints\`, add one positive open chip (e.g. "Let it breathe — follow the moment" / 「随它去——跟着当下走」).

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
