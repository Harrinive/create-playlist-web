import { getApiBaseUrl } from './api-config';
import type { BilingualInterviewStep } from './interview-i18n';
import type { InterviewAnswers } from './types';
import type { InterviewPlannerState, OpeningContext } from './interview-session';

import type { InterviewAlgorithmMode } from './interview-algorithm-mode';

export type InterviewNextResponse = {
    step: BilingualInterviewStep;
    stepIndex: number;
    stepId: string;
    totalSteps: number;
    stepIds: string[];
    plannerState: InterviewPlannerState;
    optionalClarifyIncluded: boolean;
    confidenceDiscriminantIncluded: boolean;
    model: string | null;
    modelLabel: string | null;
    algorithmMode?: InterviewAlgorithmMode;
};

export type InterviewModelsResponse = {
    models: Array<{ id: string; labelEn: string; labelZh: string }>;
    defaultModel: string | null;
    defaultAlgorithmMode?: InterviewAlgorithmMode;
    llmConfigured: boolean;
};

export async function fetchInterviewModels(
    signal?: AbortSignal
): Promise<InterviewModelsResponse | null> {
    const api = getApiBaseUrl();
    if (!api) return null;

    try {
        const response = await fetch(`${api}/api/interview/models`, { signal });
        if (!response.ok) return null;
        return (await response.json()) as InterviewModelsResponse;
    } catch {
        return null;
    }
}

export async function fetchInterviewNext(
    input: {
        stepIndex: number;
        priorAnswers: Partial<InterviewAnswers>;
        rejectedStems: string[];
        refresh: boolean;
        model?: string;
        algorithmMode?: InterviewAlgorithmMode;
        plannerState?: InterviewPlannerState | null;
        openingContext?: OpeningContext;
        signal?: AbortSignal;
    }
): Promise<InterviewNextResponse> {
    const api = getApiBaseUrl();
    if (!api) {
        throw new Error('API not configured');
    }

    const { signal, plannerState, openingContext, ...rest } = input;
    const requestBody: Record<string, unknown> = { ...rest };
    if (plannerState != null) requestBody.plannerState = plannerState;
    if (openingContext != null) requestBody.openingContext = openingContext;

    let response: Response;
    try {
        response = await fetch(`${api}/api/interview/next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal
        });
    } catch {
        throw new Error('Failed to fetch');
    }

    const payload = (await response.json()) as InterviewNextResponse & { error?: string };
    if (!response.ok) {
        throw new Error(payload.error ?? `Interview request failed (${response.status})`);
    }

    return payload;
}

export async function fetchInterviewComplete(input: {
    answers: InterviewAnswers;
    plannerState?: InterviewPlannerState | null;
    model?: string;
    signal?: AbortSignal;
}): Promise<{ answers: InterviewAnswers; inferredM5?: { id: string; label: string; prose: string } }> {
    const api = getApiBaseUrl();
    if (!api) throw new Error('API not configured');

    const { signal, ...body } = input;
    const response = await fetch(`${api}/api/interview/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal
    });

    const payload = (await response.json()) as {
        answers: InterviewAnswers;
        inferredM5?: { id: string; label: string; prose: string };
        error?: string;
    };
    if (!response.ok) {
        throw new Error(payload.error ?? `Interview complete failed (${response.status})`);
    }
    return payload;
}
