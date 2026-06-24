import type { ChatMessage } from '../types.js';

export async function openAiChat(
    apiKey: string,
    model: string,
    messages: readonly ChatMessage[]
): Promise<string> {
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
