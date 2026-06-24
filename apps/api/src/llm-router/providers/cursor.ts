import { Agent } from '@cursor/sdk';
import { requireApiKey, resolveCursorRuntime } from '../config.js';
import { messagesToPrompt } from '../messages.js';
import type { ChatMessage, LlmRouterEnv } from '../types.js';

type CursorModelParam = { id: string; value: string };

function normalizeCursorModel(
    model: string,
    params: CursorModelParam[] = []
): { modelId: string; params: CursorModelParam[] } {
    let modelId = model.trim();
    let normalizedParams = [...params];

    if (modelId.endsWith('-fast')) {
        modelId = modelId.slice(0, -'-fast'.length);
        normalizedParams = [{ id: 'fast', value: 'true' }, ...normalizedParams];
    } else if (modelId.endsWith('-slow')) {
        modelId = modelId.slice(0, -'-slow'.length);
        normalizedParams = [{ id: 'fast', value: 'false' }, ...normalizedParams];
    }

    const deduped: CursorModelParam[] = [];
    const seen = new Set<string>();
    for (const item of [...normalizedParams].reverse()) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        deduped.push(item);
    }
    deduped.reverse();

    return { modelId, params: deduped };
}

function resolveCursorModelSelection(model: string) {
    const { modelId, params } = normalizeCursorModel(model);
    if (params.length === 0) {
        return { id: modelId };
    }
    return {
        id: modelId,
        params: params.map((item) => ({ id: item.id, value: item.value }))
    };
}

export async function cursorChat(
    env: LlmRouterEnv,
    model: string,
    messages: readonly ChatMessage[],
    maxTokens?: number
): Promise<string> {
    const apiKey = requireApiKey(env, 'cursor');
    const runtime = resolveCursorRuntime(env);
    const prompt = messagesToPrompt(messages);
    const boundedPrompt =
        maxTokens && maxTokens > 0
            ? `${prompt}\n\n(Please keep the response under roughly ${maxTokens} tokens.)`
            : prompt;

    const modelSelection = resolveCursorModelSelection(model);
    const base = { apiKey, model: modelSelection };

    const options =
        runtime === 'cloud'
            ? (() => {
                  const repoUrl = env.CURSOR_CLOUD_REPO?.trim();
                  if (!repoUrl) {
                      throw new Error(
                          'CURSOR_CLOUD_REPO is required for Cursor cloud runtime (set CURSOR_LLM_RUNTIME=local for local runs).'
                      );
                  }
                  const ref = env.CURSOR_CLOUD_REF?.trim() || 'main';
                  return {
                      ...base,
                      cloud: {
                          repos: [{ url: repoUrl, startingRef: ref }]
                      }
                  };
              })()
            : {
                  ...base,
                  local: {
                      cwd: env.CURSOR_LOCAL_CWD?.trim() || process.cwd()
                  }
              };

    try {
        const result = await Agent.prompt(boundedPrompt, options);
        if (result.status === 'error') {
            throw new Error(`Cursor agent run failed: ${result.id}`);
        }
        const text = result.result?.trim();
        if (!text) {
            throw new Error('Cursor agent returned no assistant text.');
        }
        return text;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Cursor agent failed: ${message}`);
    }
}
