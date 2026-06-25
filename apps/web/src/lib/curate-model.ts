import { getApiBaseUrl } from './api-config';
import { CATALOG_CURATE_MODELS } from '../data/model-catalog';
import { CURATE_MODEL_KEY } from './session-keys';

export { CURATE_MODEL_KEY };

export type CurateModelOption = {
    id: string;
    labelEn: string;
    labelZh: string;
};

export type CurateModelsResponse = {
    models: CurateModelOption[];
    defaultModel: string | null;
    llmConfigured: boolean;
};

export { CATALOG_CURATE_MODELS };

let modelsCache: CurateModelsResponse | null = null;

const catalogFallback = (): CurateModelsResponse => ({
    models: CATALOG_CURATE_MODELS,
    defaultModel: CATALOG_CURATE_MODELS[0]?.id ?? null,
    llmConfigured: false
});

export function invalidateCurateModelsCache() {
    modelsCache = null;
}

export async function fetchCurateModels(signal?: AbortSignal): Promise<CurateModelsResponse | null> {
    const api = getApiBaseUrl();
    if (!api) return null;

    try {
        const response = await fetch(`${api}/api/curate/models`, { signal });
        if (!response.ok) return null;
        return (await response.json()) as CurateModelsResponse;
    } catch {
        return null;
    }
}

export async function loadCurateModels(opts?: { signal?: AbortSignal }): Promise<CurateModelsResponse> {
    if (modelsCache) return modelsCache;

    const data = await fetchCurateModels(opts?.signal);
    if (data?.llmConfigured && data.models.length > 0) {
        modelsCache = data;
        return data;
    }

    return catalogFallback();
}

export function readCurateModel(): string | null {
    try {
        return sessionStorage.getItem(CURATE_MODEL_KEY);
    } catch {
        return null;
    }
}

export function saveCurateModel(modelId: string) {
    sessionStorage.setItem(CURATE_MODEL_KEY, modelId);
}

export function curateModelLabel(option: CurateModelOption, locale: 'en' | 'zh'): string {
    return locale === 'zh' ? option.labelZh : option.labelEn;
}

/** Pick a server-allowed model; ignores stale or catalog-only session values. */
export function pickCurateModelOption(
    data: CurateModelsResponse,
    stored: string | null
): CurateModelOption | null {
    if (data.models.length === 0) return null;
    const fromStorage = stored ? data.models.find((m) => m.id === stored) : null;
    const fromDefault = data.defaultModel
        ? data.models.find((m) => m.id === data.defaultModel)
        : null;
    return fromStorage ?? fromDefault ?? data.models[0] ?? null;
}

export function sameModelIds(a: CurateModelOption[], b: CurateModelOption[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((model, index) => model.id === b[index]?.id);
}

export async function resolveCurateModelId(signal?: AbortSignal): Promise<CurateModelOption> {
    const data = await fetchCurateModels(signal);
    if (!data?.llmConfigured || data.models.length === 0) {
        throw new Error(
            'LLM not configured on this server — set OPENAI_API_KEY or ANTHROPIC_API_KEY on the API'
        );
    }

    modelsCache = data;
    const stored = readCurateModel();
    const resolved = pickCurateModelOption(data, stored);
    if (!resolved) {
        throw new Error(
            'LLM not configured on this server — set OPENAI_API_KEY or ANTHROPIC_API_KEY on the API'
        );
    }
    if (stored !== resolved.id) {
        saveCurateModel(resolved.id);
    }
    return resolved;
}
