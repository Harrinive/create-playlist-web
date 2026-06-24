import type { Env } from '../config.js';
import { resolveCurateDefaultModel } from './models.js';

type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

type ParsedModel = {
    provider: 'openai' | 'anthropic';
    model: string;
};

function parseModel(model: string | undefined, env: Env): ParsedModel {
    const raw = model ?? resolveCurateDefaultModel(env) ?? 'openai:gpt-4o-mini';
    if (raw.startsWith('openai:')) {
        return { provider: 'openai', model: raw.slice('openai:'.length) };
    }
    if (raw.startsWith('anthropic:') || raw.startsWith('claude:')) {
        return {
            provider: 'anthropic',
            model: raw.replace(/^(anthropic|claude):/, '')
        };
    }
    if (raw.startsWith('gpt-')) {
        return { provider: 'openai', model: raw };
    }
    if (raw.startsWith('claude-')) {
        return { provider: 'anthropic', model: raw };
    }
    return { provider: 'openai', model: raw };
}

async function openAiChat(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
        throw new Error('OpenAI returned an empty response');
    }
    return content;
}

async function anthropicChat(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
    const system = messages.find((m) => m.role === 'system')?.content;
    const chatMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            system,
            messages: chatMessages
        })
    });

    if (!response.ok) {
        throw new Error(`Anthropic request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
    };
    const content = data.content?.find((block) => block.type === 'text')?.text?.trim();
    if (!content) {
        throw new Error('Anthropic returned an empty response');
    }
    return content;
}

export async function chatCompletion(
    env: Env,
    messages: ChatMessage[],
    modelOverride?: string
): Promise<string> {
    const { provider, model } = parseModel(modelOverride, env);

    if (provider === 'openai') {
        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is required for LLM curation');
        }
        return openAiChat(apiKey, model, messages);
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is required for LLM curation');
    }
    return anthropicChat(apiKey, model, messages);
}
