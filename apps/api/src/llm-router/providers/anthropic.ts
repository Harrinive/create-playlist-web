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

    const body: {
        model: string;
        max_tokens: number;
        system: string | undefined;
        messages: Array<{ role: ChatMessage['role']; content: string }>;
        thinking?: { type: 'between_tools' };
    } = {
        model,
        max_tokens: 4096,
        system,
        messages: chatMessages
    };
    // Sonnet 5.5 thinks by default and bills that as output. between_tools skips
    // up-front thinking on a request with no tools, which is how Sonnet 4.6 ran.
    if (model === 'claude-sonnet-5-5' || model.startsWith('claude-sonnet-5-5-')) {
        body.thinking = { type: 'between_tools' };
    }
    // Opus 5.5 always thinks, and max_tokens covers thinking plus the reply.
    if (model === 'claude-opus-5-5' || model.startsWith('claude-opus-5-5-')) {
        body.max_tokens = 16000;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
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
