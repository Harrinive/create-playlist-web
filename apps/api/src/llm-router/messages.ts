import type { ChatMessage } from './types.js';

export function messagesToPrompt(messages: readonly ChatMessage[]): string {
    const parts: string[] = [];
    for (const message of messages) {
        const content = message.content.trim();
        if (!content) continue;
        if (message.role === 'system') {
            parts.push(`[System instructions]\n${content}`);
        } else if (message.role === 'user') {
            parts.push(content);
        } else {
            parts.push(`[${message.role}]\n${content}`);
        }
    }
    return parts.join('\n\n');
}
