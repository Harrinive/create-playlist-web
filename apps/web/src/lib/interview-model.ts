import { fetchInterviewModels, type InterviewModelsResponse } from './interview-api';
import { ensureInterviewAlgorithmModeDefault } from './interview-algorithm-mode';
import { getApiBaseUrl } from './api-config';
import type { Locale } from './locale';

export const INTERVIEW_MODEL_KEY = 'create-playlist-interview-model';

export type InterviewModelOption = {
    id: string;
    labelEn: string;
    labelZh: string;
};

import { DEV_PREVIEW_INTERVIEW_MODELS } from '../data/model-catalog';

export { DEV_PREVIEW_INTERVIEW_MODELS };

let modelsCache: InterviewModelsResponse | null = null;

export async function loadInterviewModels(): Promise<InterviewModelsResponse> {
    if (modelsCache) return modelsCache;

    const api = getApiBaseUrl();
    if (api) {
        const data = await fetchInterviewModels();
        if (data?.llmConfigured && data.models.length > 0) {
            if (data.defaultAlgorithmMode) {
                ensureInterviewAlgorithmModeDefault(data.defaultAlgorithmMode);
            }
            modelsCache = data;
            return data;
        }
    }

    if (import.meta.env.DEV) {
        return {
            models: DEV_PREVIEW_INTERVIEW_MODELS,
            defaultModel: DEV_PREVIEW_INTERVIEW_MODELS[0]?.id ?? null,
            llmConfigured: false
        };
    }

    return { models: [], defaultModel: null, llmConfigured: false };
}

export function invalidateInterviewModelsCache() {
    modelsCache = null;
}

export function readInterviewModel(): string | null {
    try {
        return sessionStorage.getItem(INTERVIEW_MODEL_KEY);
    } catch {
        return null;
    }
}

export function saveInterviewModel(modelId: string) {
    sessionStorage.setItem(INTERVIEW_MODEL_KEY, modelId);
}

export function interviewModelLabel(option: InterviewModelOption, locale: Locale): string {
    return locale === 'zh' ? option.labelZh : option.labelEn;
}

/** Pick a server-allowed model; ignores stale session values (e.g. legacy `static` / `llm`). */
export function pickInterviewModelOption(
    data: InterviewModelsResponse,
    stored: string | null
): InterviewModelOption | null {
    if (data.models.length === 0) return null;
    const fromStorage = stored ? data.models.find((m) => m.id === stored) : null;
    const fromDefault = data.defaultModel
        ? data.models.find((m) => m.id === data.defaultModel)
        : null;
    return fromStorage ?? fromDefault ?? data.models[0] ?? null;
}

export async function resolveInterviewModelId(): Promise<string | undefined> {
    const data = await loadInterviewModels();
    const picked = pickInterviewModelOption(data, readInterviewModel());
    if (picked) {
        saveInterviewModel(picked.id);
        return picked.id;
    }
    return undefined;
}
