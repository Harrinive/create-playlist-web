import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import { buildStoryUserPrompt, storySystemPrompt } from './prompts.js';
import { extractJson } from './shared.js';
import type { InterviewAnswers } from '../../types/interview.js';
import { z } from 'zod';

const storySchema = z.object({
    storyEn: z.string().min(1),
    storyZh: z.string().min(1)
});

export type InterviewStory = {
    en: string;
    zh: string;
};

export function hasM1M2M3Answers(prior: Partial<InterviewAnswers>): boolean {
    return Boolean(prior.m1?.id && prior.m2?.id && prior.m3?.id);
}

export async function synthesizeInterviewStory(
    env: Env,
    priorAnswers: Partial<InterviewAnswers>,
    reachableGenresNote?: string,
    model?: string
): Promise<InterviewStory> {
    const userPrompt = buildStoryUserPrompt(priorAnswers, reachableGenresNote);

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: storySystemPrompt() },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = storySchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Story synthesis returned invalid JSON: ${parsed.error.message}`);
    }

    return {
        en: parsed.data.storyEn.trim(),
        zh: parsed.data.storyZh.trim()
    };
}

/** One-line delivery note from reachable genres prose — not raw planner dump. */
export function sanitizeDeliveryGenreNote(reachableGenresNote: string): string {
    const firstSentence = reachableGenresNote.split(/[.!?。！？]/)[0]?.trim() ?? reachableGenresNote;
    const trimmed = firstSentence.slice(0, 120).trim();
    if (trimmed.length < reachableGenresNote.length && !trimmed.endsWith('…')) {
        return `${trimmed}…`;
    }
    return trimmed;
}
