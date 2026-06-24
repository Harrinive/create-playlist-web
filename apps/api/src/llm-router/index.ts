/**
 * Node llm-router — multi-provider LLM gateway (OpenAI, Anthropic, Cursor).
 *
 * Python sibling: toolbox `packages/llm-router/` (`from llm_router import …`).
 * See `apps/api/src/llm-router/README.md` and toolbox `packages/llm-router/README.md`.
 * Keep model slugs and env vars aligned across both. Extract to a shared npm package when reused.
 */

export { anyLlmProviderConfigured, isProviderConfigured, requireApiKey, resolveCursorRuntime } from './config.js';
export { completeChat, isModelConfigured, normalizeModelId, resolveModelSpec } from './chat.js';
export { messagesToPrompt } from './messages.js';
export { formatModel, formatModelLog, parseModel } from './model.js';
export type { ChatMessage, CompleteChatOptions, LlmProvider, LlmRouterEnv, ModelSpec } from './types.js';
