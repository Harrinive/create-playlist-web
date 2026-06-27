import type { InterviewAnswers } from '../../types/interview.js';
import type { InterviewPlannerState, OpeningContext } from '../../types/interview-planner.js';
import { emptyPlannerState } from '../../types/interview-planner.js';
import { resolveM4Gate } from './m4-eligibility.js';
import { sanitizeDeliveryGenreNote } from './story-synthesize.js';

export type ResolvedInterviewStep = {
    stepId: string;
    stepIndex: number;
    totalSteps: number;
    stepIds: string[];
    optionalClarifyIncluded: boolean;
    confidenceDiscriminantIncluded: boolean;
};

/** Build step sequence from planner state (v3: no user-facing m5). */
export function buildStepIds(planner: InterviewPlannerState): string[] {
    const ids: string[] = ['m1', 'm2', 'm3'];

    if (planner.needsClarification && planner.coverageRisk) {
        ids.push('m_clarify');
    }

    ids.push('m4');
    return ids;
}

/** Recompute step ids after M3 plan updates planner flags. */
export function refreshStepIds(planner: InterviewPlannerState): InterviewPlannerState {
    const stepIds = buildStepIds(planner);
    return { ...planner, stepIds };
}

export function resolveInterviewStep(
    stepIndex: number,
    _priorAnswers: Partial<InterviewAnswers>,
    plannerState?: InterviewPlannerState | null,
    openingContext?: OpeningContext
): ResolvedInterviewStep {
    const planner = refreshStepIds(
        plannerState ?? emptyPlannerState(openingContext)
    );
    const stepIds = planner.stepIds ?? buildStepIds(planner);
    const totalSteps = stepIds.length;
    const stepId = stepIds[stepIndex] ?? stepIds[stepIds.length - 1] ?? 'm1';

    return {
        stepId,
        stepIndex,
        totalSteps,
        stepIds,
        optionalClarifyIncluded: stepIds.includes('m_clarify'),
        confidenceDiscriminantIncluded:
            planner.m4Mode != null &&
            planner.m4Mode !== 'avoid' &&
            planner.lastQuestionMode === 'discriminant'
    };
}

/** Compute M4 gate from prior answers and merge into planner (after M3 / m_clarify). */
export function applyM4GateToPlanner(
    planner: InterviewPlannerState,
    prior: Partial<InterviewAnswers>
): InterviewPlannerState {
    const gate = resolveM4Gate(prior, planner);
    return {
        ...planner,
        m4Mode: gate.m4Mode,
        lastQuestionMode: gate.lastQuestionMode,
        eligibleTrapCount: gate.eligibleTrapCount,
        impliedAvoids: gate.impliedAvoids,
        eligibleTrapIds: gate.eligibleTrapIds,
        discriminantAxis: gate.discriminantAxis
    };
}

export function stepMetaForId(
    stepId: string,
    planner?: InterviewPlannerState | null
): {
    id: string;
    dimension: { en: string; zh: string };
    multi: boolean;
    optionMin: number;
    optionMax: number;
} {
    if (stepId === 'm4' && planner?.m4Mode && planner.m4Mode !== 'avoid') {
        const dim =
            planner.m4Mode === 'discriminant-1a'
                ? { en: 'Energy', zh: '能量' }
                : planner.m4Mode === 'discriminant-1b'
                  ? { en: 'Sound', zh: '质感' }
                  : { en: 'Feel', zh: '感觉' };
        return {
            id: 'm4',
            dimension: dim,
            multi: false,
            optionMin: 2,
            optionMax: 6
        };
    }

    switch (stepId) {
        case 'm1':
            return {
                id: 'm1',
                dimension: { en: 'Scene', zh: '场景' },
                multi: false,
                optionMin: 4,
                optionMax: 6
            };
        case 'm2':
            return {
                id: 'm2',
                dimension: { en: 'Emotion', zh: '情绪' },
                multi: false,
                optionMin: 2,
                optionMax: 6
            };
        case 'm3':
            return {
                id: 'm3',
                dimension: { en: 'Energy', zh: '能量' },
                multi: false,
                optionMin: 2,
                optionMax: 6
            };
        case 'm_clarify':
            return {
                id: 'm_clarify',
                dimension: { en: 'Moment', zh: '一刻' },
                multi: false,
                optionMin: 2,
                optionMax: 6
            };
        case 'm4':
            return {
                id: 'm4',
                dimension: { en: 'Avoid', zh: '避开' },
                multi: true,
                optionMin: 2,
                optionMax: 6
            };
        case 'm5':
            return {
                id: 'm5',
                dimension: { en: 'Sound', zh: '质感' },
                multi: false,
                optionMin: 2,
                optionMax: 6
            };
        default:
            return {
                id: stepId,
                dimension: { en: stepId, zh: stepId },
                multi: false,
                optionMin: 2,
                optionMax: 6
            };
    }
}

/** Merge plan outputs into planner state after each turn. */
export function mergePlanIntoPlannerState(
    planner: InterviewPlannerState,
    plan: {
        hypotheses?: string[];
        reachableGenresNote?: string;
        interviewStory?: { en: string; zh: string };
        coverageRisk?: boolean;
        needsGrooveGrain?: boolean;
        needsClarification?: boolean;
        lastQuestionMode?: 'avoid' | 'discriminant' | 'skip';
        inferredM5Draft?: string | null;
        m1RegionId?: string;
        questionMode?: string;
    },
    stepId: string,
    chosenOptionId?: string,
    priorAnswers?: Partial<InterviewAnswers>
): InterviewPlannerState {
    const next: InterviewPlannerState = {
        ...planner,
        hypotheses: plan.hypotheses?.length ? plan.hypotheses : planner.hypotheses,
        reachableGenresNote: plan.reachableGenresNote ?? planner.reachableGenresNote,
        interviewStory: plan.interviewStory ?? planner.interviewStory,
        deliveryGenreNote:
            plan.reachableGenresNote != null
                ? sanitizeDeliveryGenreNote(plan.reachableGenresNote)
                : planner.deliveryGenreNote,
        coverageRisk: plan.coverageRisk ?? planner.coverageRisk,
        needsGrooveGrain: plan.needsGrooveGrain ?? planner.needsGrooveGrain,
        needsClarification: plan.needsClarification ?? planner.needsClarification,
        lastQuestionMode: plan.lastQuestionMode ?? planner.lastQuestionMode,
        inferredM5Draft:
            plan.inferredM5Draft != null
                ? plan.inferredM5Draft
                : planner.inferredM5Draft,
        m1RegionId:
            stepId === 'm1' && chosenOptionId
                ? plan.m1RegionId ?? planner.m1RegionId
                : planner.m1RegionId,
        m1SceneId: stepId === 'm1' && chosenOptionId ? chosenOptionId : planner.m1SceneId
    };

    const refreshed = refreshStepIds(next);

    if ((stepId === 'm3' || stepId === 'm_clarify') && priorAnswers) {
        return applyM4GateToPlanner(refreshed, priorAnswers);
    }

    return refreshed;
}

/** Legacy fixed sequence for backward compat tests. */
export const LEGACY_INTERVIEW_STEP_SEQUENCE = [
    { id: 'm1' as const, optionMin: 6, optionMax: 8 },
    { id: 'm2' as const, optionMin: 4, optionMax: 6 },
    { id: 'm3' as const, optionMin: 4, optionMax: 6 },
    { id: 'm5' as const, optionMin: 4, optionMax: 6 },
    { id: 'm4' as const, optionMin: 4, optionMax: 6 }
];
