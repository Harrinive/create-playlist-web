import { isProviderConfigured, requireApiKey } from './config.js';
import { formatModel, parseModel } from './model.js';
import { anthropicChat } from './providers/anthropic.js';
import { cursorChat } from './providers/cursor.js';
import { openAiChat } from './providers/openai.js';
import type { ChatMessage, CompleteChatOptions, LlmRouterEnv, ModelSpec } from './types.js';

export function resolveModelSpec(raw: string | undefined, fallback?: string): ModelSpec {
    const text = raw?.trim() || fallback?.trim();
    if (!text) {
        throw new Error('No LLM model specified.');
    }
    return parseModel(text);
}

export function isModelConfigured(env: LlmRouterEnv, raw: string | undefined): boolean {
    if (!raw?.trim()) return true;
    try {
        const spec = parseModel(raw);
        return isProviderConfigured(env, spec.provider);
    } catch {
        return false;
    }
}

export function normalizeModelId(env: LlmRouterEnv, raw: string, allowedIds: readonly string[]): string | undefined {
    if (allowedIds.includes(raw)) return raw;

    try {
        const formatted = formatModel(parseModel(raw));
        if (allowedIds.includes(formatted)) return formatted;
    } catch {
        return undefined;
    }

    const bare = allowedIds.find((id) => id.endsWith(`:${raw}`));
    if (bare && isProviderConfigured(env, parseModel(bare).provider)) {
        return bare;
    }
    return undefined;
}

export async function completeChat(
    env: LlmRouterEnv,
    messages: readonly ChatMessage[],
    options: CompleteChatOptions = {}
): Promise<string> {
    const spec = resolveModelSpec(options.model);
    if (!isProviderConfigured(env, spec.provider)) {
        throw new Error(`${spec.provider} is not configured on this server.`);
    }

    if (spec.provider === 'openai') {
        return openAiChat(requireApiKey(env, 'openai'), spec.modelId, messages);
    }
    if (spec.provider === 'anthropic') {
        return anthropicChat(requireApiKey(env, 'anthropic'), spec.modelId, messages);
    }
    return cursorChat(env, spec.modelId, messages, options.maxTokens);
}
