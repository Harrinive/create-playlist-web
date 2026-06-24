export const CURATE_MODEL_KEY = 'create-playlist-curate-model';

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

/** Shown in `astro dev` when the API has no LLM keys — preview layout only. */
export const DEV_PREVIEW_CURATE_MODELS: CurateModelOption[] = [
    {
        id: 'cursor:composer-2.5',
        labelEn: 'Generate tracklist by Composer 2.5',
        labelZh: '用 Composer 2.5 生成曲目列表 (Generate tracklist by Composer 2.5)'
    },
    {
        id: 'openai:gpt-4o',
        labelEn: 'Generate tracklist by GPT-4o',
        labelZh: '用 GPT-4o 生成曲目列表 (Generate tracklist by GPT-4o)'
    },
    {
        id: 'anthropic:claude-sonnet-4-6',
        labelEn: 'Generate tracklist by Claude Sonnet',
        labelZh: '用 Claude Sonnet 生成曲目列表 (Generate tracklist by Claude Sonnet)'
    }
];

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

/** Pick a server-allowed model; ignores stale or dev-preview-only session values. */
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

export function currentLocale(): 'en' | 'zh' {
    if (typeof document === 'undefined') return 'en';
    return document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
}
