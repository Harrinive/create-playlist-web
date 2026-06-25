import { joinSections } from './join.js';
import { buildBilingualCopyRules } from './sections/bilingual.js';
import { creativityRules, musicPatternBan, twoLayerRule } from './sections/bans.js';
import { draftOutputSchema } from './sections/schemas.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import { freshInterviewBlock, priorContextBlock, refreshLine } from './fragments.js';
import { turnLabel, isQ1Step, isM4Step, isM5Step } from './dimension.js';
import { m4AvoidGlossBlock, m5FeltAxesBlock, q1CoverageBlock } from './blocks.js';

export function fastSystemPrompt(): string {
    return joinSections(
        'Music mood interviewer — fast mode, one shot (v4 story-native).',
        twoLayerRule,
        creativityRules,
        musicPatternBan,
        '- Q1: 4–6 scene options spanning energy/social heat',
        '- M2: story mood; M3: night chapter; M4: avoid + none',
        buildBilingualCopyRules(),
        draftOutputSchema
    );
}

export function buildFastUserPrompt(
    stepIndex: number,
    priorAnswers: Partial<InterviewAnswers>,
    rejectedStems: string[],
    refresh: boolean
): string {
    return joinSections(
        turnLabel(stepIndex),
        refreshLine(refresh, 'fast'),
        freshInterviewBlock(priorAnswers),
        priorContextBlock(priorAnswers, rejectedStems),
        isQ1Step(stepIndex) ? q1CoverageBlock() : '',
        isM5Step(stepIndex) ? m5FeltAxesBlock() : '',
        isM4Step(stepIndex) ? m4AvoidGlossBlock() : '',
        'Return JSON only.'
    );
}
