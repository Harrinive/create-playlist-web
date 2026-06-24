import type { Env } from '../config.js';

export type CurateModelOption = {
    id: string;
    labelEn: string;
    labelZh: string;
    provider: 'openai' | 'anthropic';
};

/** Curated Step 2.2.3 roster — adjust when flagship models change. */
const CURATE_MODEL_CATALOG: CurateModelOption[] = [
    {
        id: 'openai:gpt-4o',
        provider: 'openai',
        labelEn: 'Generate tracklist by GPT-4o',
        labelZh: '用 GPT-4o 生成曲目列表 (Generate tracklist by GPT-4o)'
    },
    {
        id: 'openai:gpt-4o-mini',
        provider: 'openai',
        labelEn: 'Generate tracklist by GPT-4o mini',
        labelZh: '用 GPT-4o mini 生成曲目列表 (Generate tracklist by GPT-4o mini)'
    },
    {
        id: 'anthropic:claude-sonnet-4-6',
        provider: 'anthropic',
        labelEn: 'Generate tracklist by Claude Sonnet',
        labelZh: '用 Claude Sonnet 生成曲目列表 (Generate tracklist by Claude Sonnet)'
    }
];

function providerConfigured(env: Env, provider: CurateModelOption['provider']): boolean {
    if (provider === 'openai') return Boolean(env.OPENAI_API_KEY);
    return Boolean(env.ANTHROPIC_API_KEY);
}

export function listCurateModels(env: Env): CurateModelOption[] {
    return CURATE_MODEL_CATALOG.filter((option) => providerConfigured(env, option.provider));
}

export function resolveCurateDefaultModel(env: Env): string | null {
    const preferred = env.CURATE_LLM_MODEL ?? env.LLM_MODEL;
    const available = listCurateModels(env);
    if (available.length === 0) return null;

    if (preferred && available.some((option) => option.id === preferred)) {
        return preferred;
    }

    return available[0]?.id ?? null;
}

export function isAllowedCurateModel(env: Env, model: string | undefined): boolean {
    if (!model) return true;
    return listCurateModels(env).some((option) => option.id === model);
}

export function findCurateModel(env: Env, model: string): CurateModelOption | null {
    return listCurateModels(env).find((option) => option.id === model) ?? null;
}
