import {
    fetchInterviewModels as fetchInterviewModelsFromApi,
    type InterviewModelsResponse
} from './interview-api';
import { ensureInterviewAlgorithmModeDefault } from './interview-algorithm-mode';
import { CATALOG_INTERVIEW_MODELS } from '../data/model-catalog';
import { INTERVIEW_MODEL_KEY } from './session-keys';

export type InterviewModelOption = {
    id: string;
    labelEn: string;
    labelZh: string;
};

export type { InterviewModelsResponse };

export { CATALOG_INTERVIEW_MODELS };

let modelsCache: InterviewModelsResponse | null = null;

const catalogFallback = (): InterviewModelsResponse => ({
    models: CATALOG_INTERVIEW_MODELS,
    defaultModel: CATALOG_INTERVIEW_MODELS[0]?.id ?? null,
    llmConfigured: false
});

export function invalidateInterviewModelsCache() {
    modelsCache = null;
}

export async function fetchInterviewModels(
    signal?: AbortSignal
): Promise<InterviewModelsResponse | null> {
    return fetchInterviewModelsFromApi(signal);
}

export async function loadInterviewModels(opts?: {
    signal?: AbortSignal;
}): Promise<InterviewModelsResponse> {
    if (modelsCache) return modelsCache;

    const data = await fetchInterviewModels(opts?.signal);
    if (data?.llmConfigured && data.models.length > 0) {
        if (data.defaultAlgorithmMode) {
            ensureInterviewAlgorithmModeDefault(data.defaultAlgorithmMode);
        }
        modelsCache = data;
        return data;
    }

    return catalogFallback();
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

export function interviewModelLabel(
    option: InterviewModelOption,
    locale: 'en' | 'zh'
): string {
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

export function sameModelIds(a: InterviewModelOption[], b: InterviewModelOption[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((model, index) => model.id === b[index]?.id);
}

export async function resolveInterviewModelId(signal?: AbortSignal): Promise<string | undefined> {
    const data = await fetchInterviewModels(signal);
    if (data?.llmConfigured && data.models.length > 0) {
        modelsCache = data;
        if (data.defaultAlgorithmMode) {
            ensureInterviewAlgorithmModeDefault(data.defaultAlgorithmMode);
        }
        const picked = pickInterviewModelOption(data, readInterviewModel());
        if (picked) {
            saveInterviewModel(picked.id);
            return picked.id;
        }
    }

    const catalog = catalogFallback();
    const picked = pickInterviewModelOption(catalog, readInterviewModel());
    if (picked) {
        saveInterviewModel(picked.id);
        return picked.id;
    }
    return undefined;
}
