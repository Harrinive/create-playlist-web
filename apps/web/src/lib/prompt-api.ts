import { getApiBaseUrl } from './api-config';
import type { InterviewAnswers } from './types';

export type PromptResponse = {
    paragraph: string;
    model: string | null;
    modelLabel: string | null;
};

export async function fetchSpotifyPrompt(
    answers: InterviewAnswers,
    opts?: { model?: string; signal?: AbortSignal }
): Promise<PromptResponse> {
    const api = getApiBaseUrl();
    if (!api) {
        throw new Error('API not configured');
    }

    const response = await fetch(`${api}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            answers,
            model: opts?.model
        }),
        signal: opts?.signal
    });

    const payload = (await response.json()) as PromptResponse & { error?: string };
    if (!response.ok) {
        throw new Error(payload.error ?? `Prompt request failed (${response.status})`);
    }

    return payload;
}
