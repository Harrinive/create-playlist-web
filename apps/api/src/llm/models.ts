import type { Env } from '../config.js';
import { curationCatalogEntries } from '../model-catalog.js';
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

export function listCurateModels(env: Env): CurateModelOption[] {
    return curationCatalogEntries()
        .filter((entry) => isProviderConfigured(env, entry.provider))
        .map((entry) => ({
            id: entry.id,
            labelEn: entry.curationLabelEn,
            labelZh: entry.curationLabelZh,
            provider: entry.provider
        }));
}

export function resolveCurateDefaultModel(env: Env): string | null {
    const preferred = env.CURATE_LLM_MODEL;
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
