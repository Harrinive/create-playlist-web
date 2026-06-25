import { joinSections } from './join.js';
import { storyOutputSchema } from './sections/schemas.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import { formatPriorAnswers } from './fragments.js';

export function storySystemPrompt(): string {
    return joinSections(
        'Write a 3-sentence interview story from the user answers (v4).',
        'Sentence 1: scene (M1). Sentence 2: mood moment (M2). Sentence 3: night chapter (M3).',
        'Invent fresh wording; bilingual output.',
        storyOutputSchema
    );
}

export function buildStoryUserPrompt(
    priorAnswers: Partial<InterviewAnswers>,
    reachableGenresNote?: string
): string {
    return joinSections(
        `## Prior answers\n${formatPriorAnswers(priorAnswers)}`,
        reachableGenresNote
            ? `## Reachable genres (planner note)\n${reachableGenresNote}`
            : '',
        'Write storyEn and storyZh — exactly 3 sentences each. Return JSON only.'
    );
}
