import { getApiBaseUrl } from './api-config';
import { CATALOG_CURATE_MODELS } from '../data/model-catalog';
import { CURATE_MODEL_KEY } from './session-keys';
import { safeSessionGet, safeSessionSet } from './session-storage';

export { CURATE_MODEL_KEY };

export type CurateModelOption = {
    id: string;
    labelEn: string;
    labelZh: string;
    shortLabelEn: string;
    shortLabelZh: string;
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

export async function fetchCurateModels(signal?: AbortSignal): Promise<CurateModelsResponse | null> {
    const api = getApiBaseUrl();
    if (!api) return null;

    try {
        const response = await fetch(`${api}/api/curate/models`, { signal });
        if (!response.ok) return null;
        const data = (await response.json()) as CurateModelsResponse;
        return {
            ...data,
            models: data.models.map((model) => enrichCurateModel(model))
        };
    } catch {
        return null;
    }
}

export function readCurateModel(): string | null {
    return safeSessionGet(CURATE_MODEL_KEY);
}

export function saveCurateModel(modelId: string) {
    safeSessionSet(CURATE_MODEL_KEY, modelId);
}

export function curateModelLabel(option: CurateModelOption, locale: 'en' | 'zh'): string {
    return locale === 'zh' ? option.labelZh : option.labelEn;
}

export function curateModelShortLabel(option: CurateModelOption, locale: 'en' | 'zh'): string {
    const direct = locale === 'zh' ? option.shortLabelZh : option.shortLabelEn;
    if (direct?.trim()) return direct.trim();

    const catalog = CATALOG_CURATE_MODELS.find((m) => m.id === option.id);
    const fromCatalog = locale === 'zh' ? catalog?.shortLabelZh : catalog?.shortLabelEn;
    if (fromCatalog?.trim()) return fromCatalog.trim();

    const curationLabel = locale === 'zh' ? option.labelZh : option.labelEn;
    const parsed = parseShortFromCurationLabel(curationLabel, locale);
    if (parsed) return parsed;

    return curateModelLabel(option, locale);
}

function parseShortFromCurationLabel(label: string, locale: 'en' | 'zh'): string | null {
    const trimmed = label.trim();
    if (!trimmed) return null;

    if (locale === 'zh') {
        const match = trimmed.match(/^用\s+(.+?)\s+生成曲目列表$/);
        return match?.[1]?.trim() ?? null;
    }

    const match = trimmed.match(/^Generate tracklist by\s+(.+)$/i);
    return match?.[1]?.trim() ?? null;
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

export { sameModelIds } from './model-utils';

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
    const enriched = enrichCurateModel(resolved);
    if (stored !== enriched.id) {
        saveCurateModel(enriched.id);
    }
    return enriched;
}

function enrichCurateModel(model: CurateModelOption): CurateModelOption {
    const catalog = CATALOG_CURATE_MODELS.find((m) => m.id === model.id);
    return {
        id: model.id,
        labelEn: model.labelEn || catalog?.labelEn || model.id,
        labelZh: model.labelZh || catalog?.labelZh || model.id,
        shortLabelEn: model.shortLabelEn || catalog?.shortLabelEn || '',
        shortLabelZh: model.shortLabelZh || catalog?.shortLabelZh || ''
    };
}
