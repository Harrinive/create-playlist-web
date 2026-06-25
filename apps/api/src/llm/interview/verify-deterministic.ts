import type { LlmStepDraft, TurnPlan } from './shared.js';
import { Q1_REGION_IDS } from './prompts.js';
import { verifyGlossAndConcreteness } from './gloss-verify.js';
import { verifyOptionOverlap } from './option-overlap.js';
import { verifySceneContinuity } from './scene-continuity.js';

export type DeterministicVerifyInput = {
    stepId: string;
    plan: TurnPlan;
    draft: LlmStepDraft;
    optionMin: number;
    optionMax: number;
    priorLabels?: string[];
};

export type DeterministicVerifyResult = {
    passed: boolean;
    failures: string[];
};

const ABSTRACT_MOOD_BAN =
    /\b(calm|restless|hold me here|low energy|upbeat|hold me|numb mood)\b/i;

const MUSIC_PATTERN_BAN =
    /\b(kick|drop|BPM|bpm|grid|four-on-the-floor|beat switch|nod on the|nodding|thigh keeping|tempo label)\b/i;

const SURVEY_STEM_BAN =
    /what kind of place|how does the track|what does the room take|which scene steps forward|choose the scene/i;

const PLAIN_REJECT_KEYWORDS =
    /\b(gym|workout|club|edm|sad.?acoustic|elevator|trailer|polish|hype|distort|aggressive)\b/i;

function wordCountEn(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function isPlainRejectLabel(label: string): boolean {
    return PLAIN_REJECT_KEYWORDS.test(label);
}

export function verifyDeterministic(input: DeterministicVerifyInput): DeterministicVerifyResult {
    const failures: string[] = [];
    const { stepId, plan, draft, optionMin, optionMax, priorLabels } = input;
    const options = draft.options;

    if (options.length < optionMin || options.length > optionMax) {
        failures.push(
            `option count ${options.length} outside ${optionMin}–${optionMax} for ${stepId}`
        );
    }

    const plannedIds = plan.plannedOptionIds ?? Object.keys(plan.optionSlots ?? {});
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
    failures.push(...verifySceneContinuity(stepId, draft, priorLabels ?? []));

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
            if (MUSIC_PATTERN_BAN.test(opt.labelEn)) {
                failures.push(
                    `music-pattern word on ${stepId} option "${opt.id}": ${opt.labelEn}`
                );
            }
        }
    }

    if (stepId === 'm4') {
        const hasNone = options.some((o) => o.id === 'none');
        if (!hasNone) {
            failures.push('M4 missing id "none" option');
        }
        for (const opt of options) {
            if (opt.id === 'none') continue;
            if (/^too-/.test(opt.id)) {
                failures.push(
                    `M4 option id "${opt.id}" mood-template too-* — name trap cluster instead`
                );
            }
            const poetic = !isPlainRejectLabel(opt.labelEn) && !isPlainRejectLabel(opt.labelZh);
            if (poetic && (!opt.glossEn?.trim() || !opt.glossZh?.trim())) {
                failures.push(
                    `M4 poetic option "${opt.id}" missing glossEn/glossZh`
                );
            }
        }
    }

    if (plan.questionMode === 'LogicalDecision' || (stepId === 'm3' && plan.needsGrooveGrain)) {
        const hasYouDecide = options.some((o) => o.id === 'you-decide');
        if (!hasYouDecide) {
            failures.push('LogicalDecision missing option id "you-decide"');
        }
        for (const opt of options) {
            if (opt.id === 'you-decide') continue;
            if (!opt.glossEn?.trim() || !opt.glossZh?.trim()) {
                failures.push(
                    `LogicalDecision option "${opt.id}" missing glossEn/glossZh`
                );
            }
        }
    }

    if (stepId === 'm1' && plan.q1RegionsToCover?.length) {
        const covered = new Set<string>();
        for (const opt of options) {
            const regionId = plan.optionSlots[opt.id]?.regionId;
            if (regionId) covered.add(regionId);
        }
        const kineticRegions = ['kinetic-high', 'rhythm-social', 'edge-charged'];
        if (!kineticRegions.some((r) => covered.has(r))) {
            failures.push('Q1 missing kinetic/crowd region (kinetic-high, rhythm-social, or edge-charged)');
        }
    }

    if (stepId === 'm1' && !plan.q1RegionsToCover?.length) {
        const covered = new Set(
            options
                .map((o) => plan.optionSlots[o.id]?.regionId)
                .filter(Boolean) as string[]
        );
        if (covered.size < Math.min(3, Q1_REGION_IDS.length)) {
            failures.push(`Q1 only ${covered.size} distinct regions in optionSlots`);
        }
    }

    if (stepId === 'm4') {
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
