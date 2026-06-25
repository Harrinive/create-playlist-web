import type { InterviewAnswers } from '../../types/interview.js';
import type { InterviewPlannerState, OpeningContext } from '../../types/interview-planner.js';
import { emptyPlannerState } from '../../types/interview-planner.js';

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
            planner.lastQuestionMode === 'discriminant' && planner.coverageRisk
    };
}

export function stepMetaForId(stepId: string): {
    id: string;
    dimension: { en: string; zh: string };
    multi: boolean;
    optionMin: number;
    optionMax: number;
} {
    switch (stepId) {
        case 'm1':
            return {
                id: 'm1',
                dimension: { en: 'Scene', zh: '场景' },
                multi: false,
                optionMin: 8,
                optionMax: 10
            };
        case 'm2':
            return {
                id: 'm2',
                dimension: { en: 'Emotion', zh: '情绪' },
                multi: false,
                optionMin: 4,
                optionMax: 6
            };
        case 'm3':
            return {
                id: 'm3',
                dimension: { en: 'Energy', zh: '能量' },
                multi: false,
                optionMin: 4,
                optionMax: 6
            };
        case 'm_clarify':
            return {
                id: 'm_clarify',
                dimension: { en: 'Moment', zh: '一刻' },
                multi: false,
                optionMin: 4,
                optionMax: 6
            };
        case 'm4':
            return {
                id: 'm4',
                dimension: { en: 'Avoid', zh: '避开' },
                multi: true,
                optionMin: 4,
                optionMax: 6
            };
        case 'm5':
            return {
                id: 'm5',
                dimension: { en: 'Sound', zh: '质感' },
                multi: false,
                optionMin: 4,
                optionMax: 6
            };
        default:
            return {
                id: stepId,
                dimension: { en: stepId, zh: stepId },
                multi: false,
                optionMin: 4,
                optionMax: 6
            };
    }
}

/** Merge plan outputs into planner state after each turn. */
export function mergePlanIntoPlannerState(
    planner: InterviewPlannerState,
    plan: {
        hypotheses?: string[];
        coverageRisk?: boolean;
        needsGrooveGrain?: boolean;
        needsClarification?: boolean;
        lastQuestionMode?: 'avoid' | 'discriminant' | 'skip';
        inferredM5Draft?: string;
        m1RegionId?: string;
        questionMode?: string;
    },
    stepId: string,
    chosenOptionId?: string
): InterviewPlannerState {
    const next: InterviewPlannerState = {
        ...planner,
        hypotheses: plan.hypotheses?.length ? plan.hypotheses : planner.hypotheses,
        coverageRisk: plan.coverageRisk ?? planner.coverageRisk,
        needsGrooveGrain: plan.needsGrooveGrain ?? planner.needsGrooveGrain,
        needsClarification: plan.needsClarification ?? planner.needsClarification,
        lastQuestionMode: plan.lastQuestionMode ?? planner.lastQuestionMode,
        inferredM5Draft: plan.inferredM5Draft ?? planner.inferredM5Draft,
        m1RegionId:
            stepId === 'm1' && chosenOptionId
                ? plan.m1RegionId ?? planner.m1RegionId
                : planner.m1RegionId,
        m1SceneId: stepId === 'm1' && chosenOptionId ? chosenOptionId : planner.m1SceneId
    };

    return refreshStepIds(next);
}

/** Legacy fixed sequence for backward compat tests. */
export const LEGACY_INTERVIEW_STEP_SEQUENCE = [
    { id: 'm1' as const, optionMin: 6, optionMax: 8 },
    { id: 'm2' as const, optionMin: 4, optionMax: 6 },
    { id: 'm3' as const, optionMin: 4, optionMax: 6 },
    { id: 'm5' as const, optionMin: 4, optionMax: 6 },
    { id: 'm4' as const, optionMin: 4, optionMax: 6 }
];
