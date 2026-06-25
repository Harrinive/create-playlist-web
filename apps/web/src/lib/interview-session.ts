import { safeSessionGet, safeSessionRemove, safeSessionSet } from './session-storage';
import { INTERVIEW_PLANNER_KEY, INTERVIEW_STEP_IDS_KEY } from './session-keys';

export type OpeningContext = {
    intent: 'open' | 'vibe';
    reference?: string;
    constraints?: string[];
};

export type InterviewPlannerState = {
    version: 1;
    hypotheses: string[];
    coverageRisk: boolean;
    m1RegionId?: string;
    m1SceneId?: string;
    needsGrooveGrain?: boolean;
    needsClarification?: boolean;
    lastQuestionMode?: 'avoid' | 'discriminant' | 'skip';
    inferredM5Draft?: string;
    openingContext?: OpeningContext;
    stepIds?: string[];
};

export const DEFAULT_STEP_IDS = ['m1', 'm2', 'm3', 'm4'] as const;

export function readInterviewStepIds(): string[] {
    try {
        const raw = safeSessionGet(INTERVIEW_STEP_IDS_KEY);
        if (!raw) return [...DEFAULT_STEP_IDS];
        const parsed = JSON.parse(raw) as string[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_STEP_IDS];
    } catch {
        return [...DEFAULT_STEP_IDS];
    }
}

export function writeInterviewStepIds(stepIds: string[]): boolean {
    return safeSessionSet(INTERVIEW_STEP_IDS_KEY, JSON.stringify(stepIds));
}

export function readPlannerState(): InterviewPlannerState | null {
    try {
        const raw = safeSessionGet(INTERVIEW_PLANNER_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as InterviewPlannerState;
    } catch {
        return null;
    }
}

export function writePlannerState(state: InterviewPlannerState): boolean {
    return safeSessionSet(INTERVIEW_PLANNER_KEY, JSON.stringify(state));
}

export function clearInterviewSessionMeta(): void {
    safeSessionRemove(INTERVIEW_PLANNER_KEY);
    safeSessionRemove(INTERVIEW_STEP_IDS_KEY);
}

export function interviewStepCount(): number {
    return readInterviewStepIds().length;
}
