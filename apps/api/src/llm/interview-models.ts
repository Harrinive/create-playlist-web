import type { Env } from '../config.js';
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

/** Step 1 interview roster — separate from Step 2.2.3 curation models. */
const INTERVIEW_MODEL_CATALOG: InterviewModelOption[] = [
    {
        id: 'openai:gpt-4o-mini',
        provider: 'openai',
        labelEn: 'GPT-4o mini',
        labelZh: 'GPT-4o mini'
    },
    {
        id: 'openai:gpt-4o',
        provider: 'openai',
        labelEn: 'GPT-4o',
        labelZh: 'GPT-4o'
    },
    {
        id: 'anthropic:claude-sonnet-4-6',
        provider: 'anthropic',
        labelEn: 'Claude Sonnet',
        labelZh: 'Claude Sonnet'
    }
];

export function listInterviewModels(env: Env): InterviewModelOption[] {
    return INTERVIEW_MODEL_CATALOG.filter((option) => isProviderConfigured(env, option.provider));
}

export function resolveInterviewDefaultModel(env: Env): string | null {
    const preferred = env.INTERVIEW_LLM_MODEL ?? env.LLM_MODEL;
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
