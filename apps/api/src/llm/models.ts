import type { Env } from '../config.js';
import {
    anyLlmProviderConfigured,
    formatModel,
    isProviderConfigured,
    normalizeModelId,
    parseModel
} from '../llm-router/index.js';

export type CurateModelOption = {
    id: string;
    labelEn: string;
    labelZh: string;
    provider: 'openai' | 'anthropic' | 'cursor';
};

/** Curated Step 2.2.3 roster — adjust when flagship models change. */
const CURATE_MODEL_CATALOG: CurateModelOption[] = [
    {
        id: 'cursor:composer-2.5',
        provider: 'cursor',
        labelEn: 'Generate tracklist by Composer 2.5',
        labelZh: '用 Composer 2.5 生成曲目列表'
    },
    {
        id: 'openai:gpt-4o',
        provider: 'openai',
        labelEn: 'Generate tracklist by GPT-4o',
        labelZh: '用 GPT-4o 生成曲目列表'
    },
    {
        id: 'openai:gpt-4o-mini',
        provider: 'openai',
        labelEn: 'Generate tracklist by GPT-4o mini',
        labelZh: '用 GPT-4o mini 生成曲目列表'
    },
    {
        id: 'anthropic:claude-sonnet-4-6',
        provider: 'anthropic',
        labelEn: 'Generate tracklist by Claude Sonnet',
        labelZh: '用 Claude Sonnet 生成曲目列表'
    }
];

export function listCurateModels(env: Env): CurateModelOption[] {
    return CURATE_MODEL_CATALOG.filter((option) => isProviderConfigured(env, option.provider));
}

export function resolveCurateDefaultModel(env: Env): string | null {
    const preferred = env.CURATE_LLM_MODEL ?? env.LLM_MODEL;
    const available = listCurateModels(env);
    if (available.length === 0) return null;

    if (preferred) {
        const normalized = normalizeCurateModelId(env, preferred);
        if (normalized) return normalized;
    }

    return available[0]?.id ?? null;
}

export function normalizeCurateModelId(env: Env, model: string | undefined): string | undefined {
    if (!model) return undefined;
    const available = listCurateModels(env);
    const ids = available.map((option) => option.id);
    return normalizeModelId(env, model, ids);
}

export function isAllowedCurateModel(env: Env, model: string | undefined): boolean {
    if (!model) return true;
    return normalizeCurateModelId(env, model) !== undefined;
}

export function findCurateModel(env: Env, model: string): CurateModelOption | null {
    const normalized = normalizeCurateModelId(env, model);
    if (!normalized) return null;
    return listCurateModels(env).find((option) => option.id === normalized) ?? null;
}

export function llmConfigured(env: Env): boolean {
    return anyLlmProviderConfigured(env);
}

/** Resolve a catalog id from a slug (including bare `composer-2.5`). */
export function toCatalogModelId(raw: string): string {
    return formatModel(parseModel(raw));
}
