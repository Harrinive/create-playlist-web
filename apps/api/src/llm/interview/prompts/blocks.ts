import { Q1_COVERAGE_REGIONS, Q1_REGION_IDS } from './q1-regions.js';
import {
    clearDiscriminantBlock as clearDiscriminantText,
    logicalDecisionBlock as logicalDecisionText,
    sceneFeelingBlock as sceneFeelingText,
    storyM1Block as storyM1Text,
    storyM2Block,
    storyM3Block
} from './sections/story-native.js';
import type { M4Mode } from '../m4-eligibility.js';
import { trapLabelTemplatesBlock } from '../m4-eligibility.js';
import { q1OpeningDiversityBlock } from './sections/q1-opening.js';

export function sceneFeelingBlock(): string {
    return sceneFeelingText;
}

export function storyM1Block(): string {
    return storyM1Text;
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

export function q1CoverageBlock(): string {
    const rows = Q1_COVERAGE_REGIONS.map(
        (r) => `- ${r.id}: ${r.territory} → keeps ${r.genreReach} reachable`
    );
    return `## Q1 coverage (planner backend — user sees 4–6 options only)
Tag 1–2 region ids per option in optionSlots.

**Diversity principle:** span both **social heat** (intimate ↔ kinetic) AND **setting type** (home, transit, venue, outdoors, etc.) — not six variants of the same room energy.
${q1OpeningDiversityBlock}
${rows.join('\n')}`;
}

export function q1PlanContextBlock(): string {
    return `${q1CoverageBlock()}\n\nUser-facing: **4–6** options. Regions: ${Q1_REGION_IDS.join(', ')}`;
}

export function q1DraftContextBlock(regionsToCover: string[]): string {
    return `## Q1 regions in plan\n${regionsToCover.join(', ')}\n\n${q1CoverageBlock()}`;
}

export function q1VerifyContextBlock(): string {
    return `## Q1 verify
4–6 options; distinct scenes; span social heat AND setting type; kinetic + intimate coverage; no overlapping beats.
Stem uses a concrete setting family — not the default cozy-weather opener unless options warrant wistful weather.`;
}

const m4PlanAvoidBlock = `## M4 plan — avoid mode (ClearDiscriminant)
**questionMode:** ClearDiscriminant
**plannedOptionIds:** pick ONLY from **Eligible trap clusters** in filter hints (plus id "none"). Do not invent ids outside that roster.
**Mandatory keepers:** when filter hints say "Do NOT drop …" — include those trap ids even if tempting to omit.
**Anti-pattern ids:** mood-template too-* prefix (too-shiny, too-sad, too-mellow, etc.) — verify rejects these.
**reachableGenresNote:** re-read Q1 social heat and region; crowded/kinetic scenes keep social house/dance warmth reachable unless answers explicitly wind down.
**optionGuidance:** each non-none trap = distinct accidental playlist cluster; plain Skip/Avoid label shape in plan notes; omit traps already ruled out by M1–M3 and filter DROP lines.`;

const m4PlanDiscriminantBlock = `## M4 plan — discriminant fallback (PositiveDiscriminant)
**questionMode:** PositiveDiscriminant
**plannedOptionIds:** 2–6 felt motion/groove/space options — NO id "none"; NO trap-cluster ids.
**reachableGenresNote:** name which hypotheses the discriminant axis still splits.
**optionGuidance:** single-select felt registers (pace, groove grain, or latent space) — plain labels, no genre names.`;

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

**Label template (mandatory for every non-none option):**
- labelEn: starts with **Skip** or **Avoid** + trap lexicon (e.g. "Skip elevator muzak and hold music", "Avoid gym hype and workout playlists", "Skip the algorithm rabbit hole / Discover Weekly rut")
- labelZh: parallel plain reject (e.g. "别要电梯音乐和背景 Muzak", "避开健身 hype 歌单", "别掉进算法推荐的老路")

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
**ZH template:** 别要… / 避开… / 不要… — parallel trap name, not scene poetry
When option id matches a trap cluster, use these canonical labels exactly — copy verify must accept them unchanged:

${trapLabelTemplatesBlock()}

Anti-patterns: poetic metaphor mains that need a decoder; mood-adjective ids (too-*); vague "feels too bright" wording; scene nouns inside option labels; rewriting canonical trap labels into imagist scene chips.`;
}

/** @deprecated Use m4PlainRejectBlock — kept for import compatibility. */
export const m4AvoidGlossBlock = m4PlainRejectBlock;

export function m5FeltAxesBlock(): string {
    return `## M5 (inferred server-side only in v4)`;
}
