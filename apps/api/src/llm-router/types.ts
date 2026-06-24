export type LlmProvider = 'openai' | 'anthropic' | 'cursor';

export type ChatMessage = {
    role: 'system' | 'user' | 'assistant' | string;
    content: string;
};

export type ModelSpec = {
    provider: LlmProvider;
    modelId: string;
};

/** Env slice used by llm-router — extractable without app config types. */
export type LlmRouterEnv = {
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    CURSOR_API_KEY?: string;
    CURSOR_LLM_RUNTIME?: string;
    CURSOR_CLOUD_REPO?: string;
    CURSOR_CLOUD_REF?: string;
    CURSOR_LOCAL_CWD?: string;
    NODE_ENV?: string;
};

export type CompleteChatOptions = {
    model?: string;
    maxTokens?: number;
};
