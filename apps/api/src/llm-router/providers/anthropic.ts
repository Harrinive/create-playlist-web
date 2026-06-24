import type { ChatMessage } from '../types.js';

export async function anthropicChat(
    apiKey: string,
    model: string,
    messages: readonly ChatMessage[]
): Promise<string> {
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
