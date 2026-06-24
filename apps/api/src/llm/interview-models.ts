import type { Env } from '../config.js';
import { interviewCatalogEntries } from '../model-catalog.js';
import {
    anyLlmProviderConfigured,
    isProviderConfigured,
    normalizeModelId,
    parseModel
} from '../llm-router/index.js';

export type InterviewModelOption = {
    id: string;
    labelEn: string;
    labelZh: string;
    provider: 'openai' | 'anthropic' | 'cursor';
};

export function listInterviewModels(env: Env): InterviewModelOption[] {
    return interviewCatalogEntries()
        .filter((entry) => isProviderConfigured(env, entry.provider))
        .map((entry) => ({
            id: entry.id,
            labelEn: entry.labelEn,
            labelZh: entry.labelZh,
            provider: entry.provider
        }));
}

export function resolveInterviewDefaultModel(env: Env): string | null {
    const preferred = env.INTERVIEW_LLM_MODEL;
    const available = listInterviewModels(env);
    if (available.length === 0) return null;

    if (preferred) {
        const normalized = normalizeInterviewModelId(env, preferred);
        if (normalized) return normalized;
    }

    return available[0]?.id ?? null;
}

export function normalizeInterviewModelId(env: Env, model: string | undefined): string | undefined {
    if (!model) return undefined;
    const available = listInterviewModels(env);
    const ids = available.map((option) => option.id);
    return normalizeModelId(env, model, ids);
}

export function isAllowedInterviewModel(env: Env, model: string | undefined): boolean {
    if (!model) return true;
    return normalizeInterviewModelId(env, model) !== undefined;
}

export function findInterviewModel(env: Env, model: string): InterviewModelOption | null {
    const normalized = normalizeInterviewModelId(env, model);
    if (!normalized) return null;
    return listInterviewModels(env).find((option) => option.id === normalized) ?? null;
}

export function interviewLlmConfigured(env: Env): boolean {
    return anyLlmProviderConfigured(env);
}

export function interviewModelProvider(model: string): InterviewModelOption['provider'] {
    return parseModel(model).provider;
}
