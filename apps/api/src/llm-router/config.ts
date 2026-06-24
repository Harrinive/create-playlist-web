import type { LlmProvider, LlmRouterEnv } from './types.js';

export function isProviderConfigured(env: LlmRouterEnv, provider: LlmProvider): boolean {
    if (provider === 'openai') return Boolean(env.OPENAI_API_KEY);
    if (provider === 'anthropic') return Boolean(env.ANTHROPIC_API_KEY);
    return Boolean(env.CURSOR_API_KEY);
}

export function anyLlmProviderConfigured(env: LlmRouterEnv): boolean {
    return (
        isProviderConfigured(env, 'openai') ||
        isProviderConfigured(env, 'anthropic') ||
        isProviderConfigured(env, 'cursor')
    );
}

export function requireApiKey(env: LlmRouterEnv, provider: LlmProvider): string {
    if (provider === 'openai') {
        const key = env.OPENAI_API_KEY;
        if (!key) throw new Error('OPENAI_API_KEY is required for OpenAI models.');
        return key;
    }
    if (provider === 'anthropic') {
        const key = env.ANTHROPIC_API_KEY;
        if (!key) throw new Error('ANTHROPIC_API_KEY is required for Anthropic models.');
        return key;
    }
    const key = env.CURSOR_API_KEY;
    if (!key) throw new Error('CURSOR_API_KEY is required for Cursor models.');
    return key;
}

export function resolveCursorRuntime(env: LlmRouterEnv): 'local' | 'cloud' {
    const explicit = env.CURSOR_LLM_RUNTIME?.trim().toLowerCase();
    if (explicit === 'local' || explicit === 'cloud') return explicit;

    const ci = process.env.CI?.trim().toLowerCase();
    if (ci === '1' || ci === 'true' || ci === 'yes') return 'cloud';

    if (env.CURSOR_CLOUD_REPO?.trim()) return 'cloud';
    if (env.NODE_ENV === 'production') return 'cloud';

    return 'local';
}
