import { Q1_COVERAGE_REGIONS, Q1_REGION_IDS } from './q1-regions.js';
import {
    clearDiscriminantBlock as clearDiscriminantText,
    logicalDecisionBlock as logicalDecisionText,
    sceneFeelingBlock as sceneFeelingText,
    storyM1Block as storyM1Text,
    storyM2Block,
    storyM3Block
} from './sections/story-native.js';

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
4–6 options; distinct scenes; span social heat AND setting type; kinetic + intimate coverage; no overlapping beats.`;
}

export function m4PlanContextBlock(): string {
    return `## M4 plan requirements
**questionMode:** ClearDiscriminant
**plannedOptionIds:** name trap clusters (playlist/production cliché) — e.g. elevator-muzak, trailer-swell, sad-acoustic-cliche, gym-hype, coffee-shop-template, grief-dirge, hyperpop-sheen, lo-fi-study, peak-club-banger.
**Anti-pattern ids:** mood-template too-* prefix (too-shiny, too-sad, too-mellow, etc.) — verify rejects these.
**reachableGenresNote:** re-read Q1 social heat and region; crowded/kinetic scenes keep social house/dance warmth reachable unless answers explicitly wind down.
**optionGuidance:** each non-none trap = distinct accidental playlist cluster in plain labelEn/labelZh; omit traps already ruled out by M1–M3.`;
}

export function m4ExampleBlock(): string {
    return `## M4 structural shape (invent fresh wording — do not copy prompt canon)
**Stem:** one M3 prop/beat still visible + reject question in the same scene world.
**Options:** multi-select plain trap labels + id "none". Each non-none = distinct accidental match still plausible after M1–M3.
**Ids:** name trap clusters — not mood-adjective quartet pattern (too-X ids).
**Labels:** plain trap language in labelEn/labelZh (skip elevator muzak, avoid gym hype) — self-contained, no secondary decoder fields.
**Filter:** omit avoids already implied by prior answers; keep aesthetic false positives user might still hit.`;
}

/** Plain M4 reject labels — no separate gloss fields. */
export function m4PlainRejectBlock(): string {
    return `## M4 plain reject labels
Each non-"none" option = one plain sentence in labelEn/labelZh naming what to skip (playlist trap, production cliché).
Good shape: "Skip elevator muzak and hold music" / "Avoid gym hype and workout playlists"
Anti-patterns: poetic metaphor mains that need a decoder; mood-adjective ids (too-*); vague "feels too bright" wording.`;
}

/** @deprecated Use m4PlainRejectBlock — kept for import compatibility. */
export const m4AvoidGlossBlock = m4PlainRejectBlock;

export function m5FeltAxesBlock(): string {
    return `## M5 (inferred server-side only in v4)`;
}
