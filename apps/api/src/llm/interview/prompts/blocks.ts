import { Q1_COVERAGE_REGIONS, Q1_REGION_IDS } from './q1-regions.js';
import { joinSections } from './join.js';
import {
    clearDiscriminantBlock as clearDiscriminantText,
    logicalDecisionBlock as logicalDecisionText,
    sceneFeelingBlock as sceneFeelingText,
    storyM1Block as storyM1Text,
    storyM2Block,
    storyM3Block
} from './sections/story-native.js';
import type { M4Mode } from '../m4-eligibility.js';
import { M4_NONE_LABELS, trapLabelTemplatesBlock } from '../m4-eligibility.js';
import { q1OpeningDiversityBlock as q1OpeningDiversityText } from './sections/q1-opening.js';
import {
    q1CoveragePlannerBlock,
    q1CoverageShapeBlock
} from './sections/q1-coverage-shape.js';

export { q1CoverageShapeBlock } from './sections/q1-coverage-shape.js';

export function sceneFeelingBlock(): string {
    return sceneFeelingText;
}

export function storyM1Block(): string {
    return storyM1Text;
}

export function q1OpeningDiversityBlock(): string {
    return q1OpeningDiversityText;
}

export function concreteM2Block(): string {
    return storyM2Block;
}

export function concreteM3Block(): string {
    return storyM3Block;
}

export function logicalDecisionBlock(): string {
    return logicalDecisionText;
}

export function clearDiscriminantBlock(): string {
    return clearDiscriminantText;
}

export { storyM2Block, storyM3Block };

function q1RegionCatalogRows(): string[] {
    return Q1_COVERAGE_REGIONS.map(
        (r) => `- ${r.id}: ${r.territory} → keeps ${r.genreReach} reachable`
    );
}

/** @deprecated Prefer q1CoverageShapeBlock (draft/verify) or q1PlanContextBlock (plan). */
export function q1CoverageBlock(): string {
    return q1CoveragePlannerBlock(q1RegionCatalogRows());
}

export function q1PlanContextBlock(): string {
    return `${q1CoveragePlannerBlock(q1RegionCatalogRows())}
${q1OpeningDiversityText}

**M1 plan shape (mandatory):** m1StemMode=threshold-invite · optionRole=place-partition · stemGuidance = threshold pick-a-still ask · optionGuidance = distinct places **and** matching social-heat registers per slot.

User-facing: **4–6** options. Region ids: ${Q1_REGION_IDS.join(', ')}`;
}

export function q1DraftContextBlock(regionsToCover: string[]): string {
    return joinSections(
        `## Q1 regions in plan\n${regionsToCover.join(', ')}`,
        q1CoverageShapeBlock,
        'Fill labels for plannedOptionIds — chip register must match each optionSlots.regionId.'
    );
}

export function q1VerifyContextBlock(): string {
    return joinSections(
        '## Q1 verify — fail closed on any broken item',
        q1CoverageShapeBlock,
        'Also check: distinct film-stills; no overlapping beats; threshold stem + explicit ask; stem rotates setting family (cozy-weather default only when options warrant).'
    );
}

const m4PlanAvoidBlock = `## M4 plan — avoid mode (ClearDiscriminant)
**questionMode:** ClearDiscriminant
**plannedOptionIds:** pick ONLY from **Eligible trap clusters** in filter hints (plus id "none"). Do not invent ids outside that roster.
**Mandatory keepers:** when filter hints say "Do NOT drop …" — include those trap ids even if tempting to omit.
**Anti-pattern ids:** mood-template too-* prefix (too-shiny, too-sad, too-mellow, etc.) — verify rejects these.
**reachableGenresNote:** re-read Q1 social heat and region; crowded/kinetic scenes keep social house/dance warmth reachable unless answers explicitly wind down.
**optionGuidance:** each non-none trap = distinct **plausible false positive** for a remaining hypothesis; plain Skip/Avoid label shape in plan notes; omit traps already ruled out by M1–M3 and filter DROP lines — never offer gym/club/workout on non-kinetic social-mid arcs.
**none option:** id "none" — EN "${M4_NONE_LABELS.labelEn}" / ZH "${M4_NONE_LABELS.labelZh}" (no extra avoids; not "None of these")`;

const m4PlanDiscriminantBlock = `## M4 plan — discriminant fallback (PositiveDiscriminant)
**questionMode:** PositiveDiscriminant
**plannedOptionIds:** 2–6 felt motion/groove/space options — NO id "none"; NO trap-cluster ids; optional escape id \`open-any\` or \`no-constraints\`.
**reachableGenresNote:** name which hypotheses the discriminant axis still splits.
**optionGuidance:** single-select felt registers (pace, groove grain, or latent space) — plain positive labels, no genre names, no Skip/Avoid/no/not wording.`;

/** Mode-conditional M4 planner context — avoid vs discriminant variants. */
export function m4PlanContextBlockForMode(m4Mode: M4Mode = 'avoid'): string {
    if (m4Mode === 'avoid') return m4PlanAvoidBlock;
    return `${m4PlanDiscriminantBlock}\n**discriminantKind:** ${m4Mode}`;
}

/** @deprecated Use m4PlanContextBlockForMode(m4Mode) */
export function m4PlanContextBlock(): string {
    return m4PlanAvoidBlock;
}

export function m4ExampleBlock(): string {
    return `## M4 avoid — structural shape (invent fresh STEM wording only)
**Stem (film-still register):** one M3 prop/beat still visible + plain sonic-reject question in the same scene world. Invent new wording each time — do not copy prompt canon.
**Options (plain reject register):** multi-select trap labels + id "none". Labels follow fixed template — do NOT invent poetic scene lines for options.
**none option (mandatory when avoid mode):** id "none" — EN "${M4_NONE_LABELS.labelEn}" / ZH "${M4_NONE_LABELS.labelZh}" — user has no **extra** avoids; not ambiguous "None of these".

**Label template (mandatory for every non-none option):**
- labelEn: starts with **Skip** or **Avoid** + trap lexicon (e.g. "Skip elevator muzak and hold music", "Avoid gym hype and workout playlists", "Skip the algorithm rabbit hole / Discover Weekly rut")
- labelZh: parallel plain trap name — vary openers (避开/不要/别选/别听/别掉进); use canonical registry wording when id matches

**algorithm-rabbit-hole trap:** when eligible, label must use plain **algorithm rabbit hole** or **Discover Weekly rut** wording — not vague "usual mix" alone.

**Kinetic neon example (eligible roster):** trailer-swell, hyperpop-sheen, algorithm-rabbit-hole, glossy-motivational — NOT coffee-shop, lo-fi-study, elevator-muzak (filter DROP).
**Ids:** trap cluster ids from eligible roster — not mood-adjective quartet (too-X ids).
**Stem vs options:** stem may name scene props; options name traps only — zero scene nouns in option labels.`;
}

/** Plain M4 reject labels — canonical templates from trap registry. */
export function m4PlainRejectBlock(): string {
    return `## M4 plain reject labels
Each non-"none" option = one plain sentence naming what to skip (playlist trap, production cliché).
**EN template:** "Skip …" or "Avoid …" + trap lexicon word (muzak, hype, cliché, swell, rabbit hole, Discover Weekly rut, etc.)
**ZH template:** vary openers (避开/不要/别选/别听/别掉进) — parallel trap name, not scene poetry
When option id matches a trap cluster, use these canonical labels exactly — copy verify must accept them unchanged:

${trapLabelTemplatesBlock()}

Anti-patterns: poetic metaphor mains that need a decoder; mood-adjective ids (too-*); vague "feels too bright" wording; scene nouns inside option labels; rewriting canonical trap labels into imagist scene chips.`;
}

/** @deprecated Use m4PlainRejectBlock — kept for import compatibility. */
export const m4AvoidGlossBlock = m4PlainRejectBlock;

export function m5FeltAxesBlock(): string {
    return `## M5 (inferred server-side only in v4)`;
}
