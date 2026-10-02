import type { ChatMessage } from '../types.js';

export async function openAiChat(
    apiKey: string,
    model: string,
    messages: readonly ChatMessage[]
): Promise<string> {
    const body: {
        model: string;
        messages: readonly ChatMessage[];
        temperature: number;
        reasoning_effort?: 'none';
    } = {
        model,
        messages,
        temperature: 1
    };
    // Luna defaults reasoning to medium, and Chat Completions rejects temperature
    // unless effort is none. none keeps the cheap path (no reasoning tokens) and
    // allows this temperature. 1.0 is the creative setting; the API allows up to 2.
    if (model === 'gpt-6-luna' || model.startsWith('gpt-6-luna-')) {
        body.reasoning_effort = 'none';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
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
