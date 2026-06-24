import type { LlmProvider, ModelSpec } from './types.js';

const CURSOR_PREFIXES = ['composer-', 'auto'] as const;
const ANTHROPIC_PREFIXES = ['claude-'] as const;

function normalizeProviderKey(providerKey: string): LlmProvider {
    const lowered = providerKey.trim().toLowerCase();
    if (lowered === 'openai' || lowered === 'cursor') {
        return lowered;
    }
    if (lowered === 'anthropic' || lowered === 'claude') {
        return 'anthropic';
    }
    throw new Error(
        `Unknown model provider ${providerKey}. Use openai:, cursor:, anthropic:, or claude:.`
    );
}

function isCursorModelId(modelId: string): boolean {
    const lowered = modelId.toLowerCase();
    return lowered === 'auto' || CURSOR_PREFIXES.some((prefix) => lowered.startsWith(prefix));
}

function isAnthropicModelId(modelId: string): boolean {
    const lowered = modelId.toLowerCase();
    return ANTHROPIC_PREFIXES.some((prefix) => lowered.startsWith(prefix));
}

export function parseModel(raw: string): ModelSpec {
    const text = raw.trim();
    if (!text) {
        throw new Error('Model id must be a non-empty string.');
    }

    if (text.includes(':')) {
        const colon = text.indexOf(':');
        const prefix = text.slice(0, colon);
        const modelId = text.slice(colon + 1).trim();
        if (!modelId) {
            throw new Error(`Invalid model id ${raw}: missing model name after prefix.`);
        }
        return { provider: normalizeProviderKey(prefix), modelId };
    }

    if (isCursorModelId(text)) {
        return { provider: 'cursor', modelId: text };
    }
    if (isAnthropicModelId(text)) {
        return { provider: 'anthropic', modelId: text };
    }
    return { provider: 'openai', modelId: text };
}

export function formatModel(spec: ModelSpec): string {
    return `${spec.provider}:${spec.modelId}`;
}

export function formatModelLog(spec: ModelSpec): string {
    return `${spec.provider}/${spec.modelId}`;
}
