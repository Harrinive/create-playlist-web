/** Shared Q1 coverage contract — plan, draft, verify, fast must stay aligned. Mechanical checks live in verify-q1-coverage.ts. */
export const q1CoverageShapeBlock = `## Q1 coverage shape (4–6 options)
**User job:** partition reachable music lanes — each chip is one distinct place/world **and** a readable social-heat register.

**Shape**
- **Social heat:** span intimate ↔ kinetic in **visible chip copy** — ≥1 solo/low-heat still, ≥1 crowd/body-energy still
- **Setting type:** spread place families (home, transit, venue, outdoors, commercial, …) — not five chips in the same quiet-mid band
- **Planner slots:** tag each option \`regionId\`; chip register must match tag (kinetic tag → kinetic scene; intimate tag → solo still)
- **Stem:** threshold invite + explicit ask — neutral sensory anchor; options are different worlds

**Anti-patterns**
- Tag-only coverage (quiet chip + kinetic \`regionId\`)
- Poetic palette that clusters every chip in winding-down / solo-night energy
- Six variants of the same room temperature with no kinetic pole`;

/** Planner-only: region catalog for optionSlots tagging. */
export function q1CoveragePlannerBlock(regionRows: string[]): string {
    return `${q1CoverageShapeBlock}

**Planner backend:** tag 1 region id per option in \`optionSlots\`; \`optionGuidance\` must name distinct places **and** registers that match tags.
${regionRows.join('\n')}`;
}
