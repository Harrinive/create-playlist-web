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
**plannedOptionIds:** name trap clusters (playlist/production cliché) — e.g. elevator-muzak, trailer-swell, sad-acoustic-cliche, gym-hype, coffee-shop-template, grief-dirge, hyperpop-gloss, lo-fi-study, peak-club-banger.
**Anti-pattern ids:** mood-template too-* prefix (too-shiny, too-sad, too-mellow, etc.) — verify rejects these.
**reachableGenresNote:** re-read Q1 social heat and region; crowded/kinetic scenes keep social house/dance warmth reachable unless answers explicitly wind down.
**optionGuidance:** each non-none trap = distinct accidental playlist cluster still plausible; omit traps already ruled out by M1–M3.`;
}

export function m4ExampleBlock(): string {
    return `## M4 structural shape (invent fresh wording — do not copy prompt canon)
**Stem:** one M3 prop/beat still visible + reject question in the same scene world.
**Options:** multi-select playlist traps + id "none". Each non-none = distinct accidental match still plausible after M1–M3.
**Ids:** name trap clusters — not mood-adjective quartet pattern (too-X ids).
**Gloss:** on poetic non-"none" only — one plain sentence decoding the reject cluster.
**Filter:** omit avoids already implied by prior answers; keep aesthetic false positives user might still hit.`;
}

export function m4AvoidGlossBlock(): string {
    return `## M4 avoid gloss
Poetic non-"none" options: glossEn + glossZh = ONE plain sentence naming a concrete playlist/production trap.

**Shape:** name the trap register (cliché acoustic template, hold music, trailer swell, hyperpop gloss, grief dirge, gym hype, lo-fi study beats, motivational arc, peak-club banger, etc.) — decode what to skip, not how the room feels.
**Anti-patterns:** mood-template openers that paraphrase the chip ("still too …", "still feels too …"); "Avoid X, Y, or a room that feels Z" — mood-stack paraphrase instead of trap names.`;
}

export function m5FeltAxesBlock(): string {
    return `## M5 (inferred server-side only in v4)`;
}
