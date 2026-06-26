import { countCompletedSteps, type Draft } from './interview-draft';
import { readInterviewStepIds } from './interview-session';
import { navigateTo } from './navigate';
import { safeSessionGet, safeSessionRemove, safeSessionSet } from './session-storage';
import { DRAFT_KEY, INTERVIEW_FALLBACK_KEY } from './session-keys';

const HARD_FAILURE_PREFIXES = [
    'Interview verify failed',
    'Interview plan returned invalid JSON',
    'Interview draft returned invalid JSON',
    'Interview revise returned invalid JSON',
    'Interview LLM returned invalid JSON',
    'Story synthesis returned invalid JSON'
] as const;

export type InterviewFallbackState = {
    failedStepIndex: number;
    failedStepId: string;
    completedSteps: number;
    canResume: boolean;
    createdAt: number;
};

function readDraft(): Draft {
    try {
        const raw = safeSessionGet(DRAFT_KEY);
        return raw ? (JSON.parse(raw) as Draft) : {};
    } catch {
        return {};
    }
}

export function isInterviewHardFailure(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.trim();
    return HARD_FAILURE_PREFIXES.some((prefix) => message.startsWith(prefix));
}

export function readInterviewFallbackState(): InterviewFallbackState | null {
    try {
        const raw = safeSessionGet(INTERVIEW_FALLBACK_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as InterviewFallbackState;
        if (typeof parsed.failedStepIndex !== 'number') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeInterviewFallbackState(state: InterviewFallbackState): boolean {
    return safeSessionSet(INTERVIEW_FALLBACK_KEY, JSON.stringify(state));
}

export function clearInterviewFallbackState(): void {
    safeSessionRemove(INTERVIEW_FALLBACK_KEY);
}

export function buildInterviewFallbackState(input: {
    failedStepIndex: number;
    failedStepId: string;
}): InterviewFallbackState {
    const stepIds = readInterviewStepIds();
    const draft = readDraft();
    const completedSteps = countCompletedSteps(draft, stepIds);
    return {
        failedStepIndex: input.failedStepIndex,
        failedStepId: input.failedStepId,
        completedSteps,
        canResume: completedSteps > 0,
        createdAt: Date.now()
    };
}

export function redirectToInterviewFallback(input: {
    failedStepIndex: number;
    failedStepId: string;
}): void {
    writeInterviewFallbackState(buildInterviewFallbackState(input));
    navigateTo('/interview/fallback');
}
