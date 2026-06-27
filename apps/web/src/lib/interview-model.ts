import {
    fetchInterviewModels as fetchInterviewModelsFromApi,
    type InterviewModelsResponse
} from './interview-api';
import { ensureInterviewAlgorithmModeDefault } from './interview-algorithm-mode';
import { CATALOG_INTERVIEW_MODELS } from '../data/model-catalog';
import { INTERVIEW_MODEL_KEY } from './session-keys';
import { safeSessionGet, safeSessionSet } from './session-storage';

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

export async function fetchInterviewModels(
    signal?: AbortSignal
): Promise<InterviewModelsResponse | null> {
    return fetchInterviewModelsFromApi(signal);
}

export function readInterviewModel(): string | null {
    return safeSessionGet(INTERVIEW_MODEL_KEY);
}

export function saveInterviewModel(modelId: string) {
    safeSessionSet(INTERVIEW_MODEL_KEY, modelId);
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

export { sameModelIds } from './model-utils';

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
