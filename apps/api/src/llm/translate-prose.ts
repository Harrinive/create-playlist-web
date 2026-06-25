import { z } from 'zod';
import type { Env } from '../config.js';
import { completeChat } from '../llm-router/index.js';
import { resolveInterviewDefaultModel } from './interview-models.js';
import { extractJson } from './interview/shared.js';

const textSchema = z.object({
    text: z.string().min(1)
});

const SYSTEM_PROMPT = `You translate music playlist prose into natural Simplified Chinese.

Rules:
- Simplified Chinese only — no English words unless an artist or song title
- Preserve musical meaning (tempo, texture, warmth, energy arc)
- Natural, readable prose — not word-for-word stiffness
- Do not add commentary

Return JSON only: { "text": "..." }`;

export async function translateProseToChinese(env: Env, prose: string, model?: string): Promise<string> {
    const resolvedModel = model ?? resolveInterviewDefaultModel(env);
    if (!resolvedModel) {
        throw new Error('No interview model configured for translation');
    }

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prose.trim() }
        ],
        { model: resolvedModel }
    );

    const parsed = textSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        const fallback = raw.trim().replace(/^```[\s\S]*?\n|```$/g, '').trim();
        if (fallback.length > 0) return fallback;
        throw new Error(`Translation LLM returned invalid JSON: ${parsed.error.message}`);
    }

    return parsed.data.text.trim();
}
