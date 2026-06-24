import { getApiBaseUrl } from './api-config';
import type { BilingualInterviewStep } from './interview-i18n';
import type { InterviewAnswers } from './types';

export type InterviewNextResponse = {
    step: BilingualInterviewStep;
    model: string | null;
    modelLabel: string | null;
};

export type InterviewModelsResponse = {
    models: Array<{ id: string; labelEn: string; labelZh: string }>;
    defaultModel: string | null;
    llmConfigured: boolean;
};

export async function fetchInterviewModels(): Promise<InterviewModelsResponse | null> {
    const api = getApiBaseUrl();
    if (!api) return null;

    try {
        const response = await fetch(`${api}/api/interview/models`);
        if (!response.ok) return null;
        return (await response.json()) as InterviewModelsResponse;
    } catch {
        return null;
    }
}

export async function fetchInterviewNext(input: {
    stepIndex: number;
    priorAnswers: Partial<InterviewAnswers>;
    rejectedStems: string[];
    refresh: boolean;
    model?: string;
}): Promise<InterviewNextResponse> {
    const api = getApiBaseUrl();
    if (!api) {
        throw new Error('API not configured');
    }

    const response = await fetch(`${api}/api/interview/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
    });

    const payload = (await response.json()) as InterviewNextResponse & { error?: string };
    if (!response.ok) {
        throw new Error(payload.error ?? `Interview request failed (${response.status})`);
    }

    return payload;
}
