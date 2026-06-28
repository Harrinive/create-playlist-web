import type { InterviewAnswers } from '../../types/interview.js';
import type { InterviewPlannerState } from '../../types/interview-planner.js';
import {
    computeEligibleTraps,
    optionMatchesAnyDroppedTrap,
    trapClusterById
} from './m4-eligibility.js';
import type { LlmStepDraft, TurnPlan } from './shared.js';
import { Q1_REGION_IDS } from './prompts.js';
import { M4_TRAP_LEXICON, verifyGlossAndConcreteness } from './gloss-verify.js';
import { verifyOptionOverlap } from './option-overlap.js';
import { verifySceneContinuity } from './scene-continuity.js';
import { verifyStemDistinctFromOptions } from './verify-stem-distinct.js';
import { verifyM1PlacePartition } from './verify-m1-frame.js';
import { stemHasExplicitAsk, turnHasExplicitAsk, verifyStemHintOverlap } from './verify-stem-hint.js';

export type DeterministicVerifyInput = {
    stepId: string;
    plan: TurnPlan;
    draft: LlmStepDraft;
    optionMin: number;
    optionMax: number;
    priorLabels?: string[];
    priorAnswers?: Partial<InterviewAnswers>;
    planner?: InterviewPlannerState | null;
};

export type DeterministicVerifyResult = {
    passed: boolean;
    failures: string[];
};

const ABSTRACT_MOOD_BAN =
    /\b(calm|restless|hold me here|low energy|upbeat|hold me|numb mood)\b/i;

/** Production/tempo vocabulary — not physical verbs like "shoulders drop". */
function labelHasMusicPattern(labelEn: string): boolean {
    if (
        /\b(kick\b|kick drum|four-on-the-floor|beat switch|BPM|bpm|grid|nod on the|nodding|thigh keeping|tempo label)\b/i.test(
            labelEn
        )
    ) {
        return true;
    }
    if (/\b(kick|drop)\b/i.test(labelEn)) {
        return /\b(bass|edm|beat|track|club|floor|kick drum|the drop)\b/i.test(labelEn);
    }
    return false;
}

const DISCRIMINANT_NEG_LABEL =
    /^(No |Not |Without )|\b(must not|never |without )\b|^(Skip|Avoid)\s/i;

const SURVEY_STEM_BAN =
    /what kind of place|how does the track|what does the room take|which scene steps forward|choose the scene/i;

const PLAIN_REJECT_KEYWORDS =
    /\b(gym|workout|club|edm|sad.?acoustic|elevator|trailer|polish|hype|distort|aggressive|muzak|clich|rabbit|algorithm|motivational|hyperpop|lo-fi|banger|swell|dirge|grief|discover weekly)\b/i;

const SKIP_AVOID_PREFIX = /^(Skip|Avoid)\s+/i;

const M4_AVOID_STEM_GUARDIAN_BAN =
    /\b(feel wrong|feels wrong|soundtrack trap|never become|not become|not turn into|turn into|make this moment|which trap would|would make this)\b/i;

const M4_AVOID_STEM_ZH_TRANSFORM_BAN = /(不该变成|最不该变成|不该成为|不能变成|变成什么|turn into)/i;

const KINETIC_LABEL =
    /\b(crowd|packed|dance|club|party|bar|floor|bodies|neon spill|moving|speakers|gym|parade|block party)\b/i;

const KINETIC_REGION_IDS = ['kinetic-high', 'rhythm-social', 'edge-charged'] as const;

function hasKineticCrowdLabel(options: LlmStepDraft['options']): boolean {
    return options.some((opt) => KINETIC_LABEL.test(opt.labelEn));
}

function wordCountEn(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function isPlainRejectLabel(label: string, optionId?: string): boolean {
    if (PLAIN_REJECT_KEYWORDS.test(label) || M4_TRAP_LEXICON.test(label)) {
        return true;
    }
    if (SKIP_AVOID_PREFIX.test(label.trim()) && optionId && trapClusterById(optionId)) {
        return true;
    }
    return false;
}

export function verifyDeterministic(input: DeterministicVerifyInput): DeterministicVerifyResult {
    const failures: string[] = [];
    const { stepId, plan, draft, optionMin, optionMax, priorLabels, priorAnswers, planner } =
        input;
    const options = draft.options;

    if (options.length < optionMin || options.length > optionMax) {
        failures.push(
            `option count ${options.length} outside ${optionMin}–${optionMax} for ${stepId}`
        );
    }

    const plannedIds = (plan.plannedOptionIds ?? Object.keys(plan.optionSlots ?? {})).filter(
        (id) => !(plan.questionMode === 'PositiveDiscriminant' && id === 'none')
    );
    if (plannedIds.length > 0) {
        const draftIds = options.map((o) => o.id);
        for (const id of plannedIds) {
            if (!draftIds.includes(id)) {
                failures.push(`missing planned option id "${id}"`);
            }
        }
        const slotKeys = Object.keys(plan.optionSlots ?? {});
        for (const key of slotKeys) {
            if (!draftIds.includes(key)) {
                failures.push(`optionSlots key "${key}" missing from draft options`);
            }
        }
    }

    if (SURVEY_STEM_BAN.test(draft.stemEn)) {
        failures.push(`stemEn matches survey/meta ban: ${draft.stemEn.slice(0, 60)}`);
    }

    failures.push(...verifyGlossAndConcreteness(stepId, draft));
    failures.push(...verifyOptionOverlap(stepId, draft));
    failures.push(...verifyStemDistinctFromOptions(draft));
    failures.push(...verifyStemHintOverlap(stepId, draft));
    failures.push(...verifySceneContinuity(stepId, draft, priorLabels ?? []));

    if (stepId === 'm1') {
        failures.push(...verifyM1PlacePartition(draft, plan));
    }

    if (['m1', 'm2', 'm3', 'm_clarify'].includes(stepId)) {
        if (!turnHasExplicitAsk(draft)) {
            failures.push(
                `${stepId} stem missing explicit ask — user must know what to pick (threshold invite / which moment / which chapter)`
            );
        }
    }

    for (const opt of options) {
        if (wordCountEn(opt.labelEn) > 12) {
            failures.push(`labelEn >12 words on option "${opt.id}": ${opt.labelEn}`);
        }

        if (stepId === 'm2' || stepId === 'm3') {
            if (ABSTRACT_MOOD_BAN.test(opt.labelEn)) {
                failures.push(
                    `abstract mood/tempo chip on ${stepId} option "${opt.id}": ${opt.labelEn}`
                );
            }
            if (labelHasMusicPattern(opt.labelEn)) {
                failures.push(
                    `music-pattern word on ${stepId} option "${opt.id}": ${opt.labelEn}`
                );
            }
        }
    }

    if (stepId === 'm4') {
        const isDiscriminant = plan.questionMode === 'PositiveDiscriminant';

        if (isDiscriminant) {
            const hasNone = options.some((o) => o.id === 'none');
            if (hasNone) {
                failures.push('M4 discriminant must not include id "none"');
            }
            const avoidStem =
                /\b(not sound like|must not|should not|not turn into|not become|avoid|skip|不该|不要像|最不该|不能变成)\b/i;
            if (avoidStem.test(draft.stemEn) || avoidStem.test(draft.stemZh)) {
                failures.push(
                    'M4 discriminant stem uses avoid/reject framing — ask what fits (pace/groove/space)'
                );
            }
            for (const opt of options) {
                if (labelHasMusicPattern(opt.labelEn)) {
                    failures.push(
                        `music-pattern word on M4 discriminant option "${opt.id}": ${opt.labelEn}`
                    );
                }
                if (/^(Skip|Avoid)\s+/i.test(opt.labelEn.trim())) {
                    failures.push(
                        `M4 discriminant option "${opt.id}" uses avoid label — use positive felt groove/space language`
                    );
                }
                if (DISCRIMINANT_NEG_LABEL.test(opt.labelEn.trim())) {
                    failures.push(
                        `M4 discriminant option "${opt.id}" uses negative framing — positive felt label only: ${opt.labelEn.slice(0, 60)}`
                    );
                }
                if (/^(不要|别|不该|没有|无)/.test(opt.labelZh.trim())) {
                    failures.push(
                        `M4 discriminant option "${opt.id}" labelZh uses reject framing — positive felt chip only`
                    );
                }
                if (trapClusterById(opt.id)) {
                    failures.push(
                        `M4 discriminant option "${opt.id}" reuses trap-cluster id — use felt-axis ids instead`
                    );
                }
            }
            const zhFeelingSuffixCount = options.filter((o) => /感$/.test(o.labelZh.trim())).length;
            if (options.length >= 4 && zhFeelingSuffixCount >= 3) {
                failures.push(
                    'M4 discriminant labelZh: too many parallel 「…感」 chips — partition pace, groove grain, timbre/body, space'
                );
            }
        } else {
            const hasNone = options.some((o) => o.id === 'none');
            if (!hasNone) {
                failures.push('M4 missing id "none" option');
            }
            if (M4_AVOID_STEM_GUARDIAN_BAN.test(draft.stemEn)) {
                failures.push(
                    `M4 avoid stem uses forbidden guardian/transformation framing: ${draft.stemEn.slice(0, 60)}`
                );
            }
            if (M4_AVOID_STEM_ZH_TRANSFORM_BAN.test(draft.stemZh)) {
                failures.push(
                    `M4 avoid stemZh uses forbidden 变成 framing — ask sonic skip with 像什么: ${draft.stemZh.slice(0, 60)}`
                );
            }
            const { dropped } = computeEligibleTraps(priorAnswers ?? {}, planner);
            const nonNoneCount = options.filter((o) => o.id !== 'none').length;
            if (nonNoneCount < 3) {
                failures.push(`M4 avoid needs >=3 non-none options, got ${nonNoneCount}`);
            }
            for (const opt of options) {
                if (opt.id === 'none') continue;
                if (/^too-/.test(opt.id)) {
                    failures.push(
                        `M4 option id "${opt.id}" mood-template too-* — name trap cluster instead`
                    );
                }
                if (opt.glossEn?.trim() || opt.glossZh?.trim()) {
                    failures.push(
                        `M4 option "${opt.id}" must not use gloss — put trap name in labelEn/labelZh`
                    );
                }
                const matchedDrop = optionMatchesAnyDroppedTrap(
                    opt.id,
                    opt.labelEn,
                    opt.labelZh,
                    dropped
                );
                if (matchedDrop) {
                    failures.push(
                        `M4 option "${opt.id}" matches dropped trap cluster "${matchedDrop.id}" — already ruled out by prior answers`
                    );
                }
                const plain =
                    isPlainRejectLabel(opt.labelEn, opt.id) ||
                    isPlainRejectLabel(opt.labelZh, opt.id) ||
                    M4_TRAP_LEXICON.test(opt.labelEn);
                if (!plain) {
                    failures.push(
                        `M4 option "${opt.id}" needs plain trap language in labelEn/labelZh`
                    );
                }
            }
        }
    }

    if (plan.questionMode === 'LogicalDecision' || (stepId === 'm3' && plan.needsGrooveGrain)) {
        const hasYouDecide = options.some((o) => o.id === 'you-decide');
        if (!hasYouDecide) {
            failures.push('LogicalDecision missing option id "you-decide"');
        }
    }

    if (stepId === 'm1' && plan.q1RegionsToCover?.length) {
        const covered = new Set<string>();
        for (const opt of options) {
            const regionId = plan.optionSlots[opt.id]?.regionId;
            if (regionId) covered.add(regionId);
        }
        const hasKineticRegion = KINETIC_REGION_IDS.some((region) => covered.has(region));
        if (!hasKineticRegion && !hasKineticCrowdLabel(options)) {
            failures.push(
                'Q1 missing kinetic/crowd region (kinetic-high, rhythm-social, or edge-charged)'
            );
        }
    }

    if (
        stepId === 'm1' &&
        !plan.q1RegionsToCover?.length &&
        Object.keys(plan.optionSlots ?? {}).length === 0
    ) {
        if (!hasKineticCrowdLabel(options) && options.length >= 4) {
            failures.push(
                'Q1 missing kinetic/crowd option — span intimate and kinetic social heat'
            );
        }
    }

    if (
        stepId === 'm1' &&
        !plan.q1RegionsToCover?.length &&
        Object.keys(plan.optionSlots ?? {}).length > 0
    ) {
        const covered = new Set(
            options
                .map((o) => plan.optionSlots[o.id]?.regionId)
                .filter(Boolean) as string[]
        );
        if (covered.size < Math.min(3, Q1_REGION_IDS.length)) {
            failures.push(`Q1 only ${covered.size} distinct regions in optionSlots`);
        }
    }

    if (stepId === 'm4' && plan.questionMode !== 'PositiveDiscriminant') {
        const slots = plan.optionSlots ?? {};
        const rejectClusters: string[] = [];
        for (const opt of options) {
            const cluster = slots[opt.id]?.rejectCluster;
            if (!cluster || opt.id === 'none') continue;
            if (rejectClusters.includes(cluster)) {
                failures.push(`rejectCluster collision "${cluster}" on option "${opt.id}"`);
            }
            rejectClusters.push(cluster);
        }
    }

    return { passed: failures.length === 0, failures };
}
