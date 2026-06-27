import { joinSections } from './join.js';
import {
    creativityRules,
    musicPatternBan,
    twoLayerRule
} from './sections/bans.js';
import { planOutputSchema } from './sections/schemas.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import {
    freshInterviewBlock,
    planChecklistBlock,
    priorContextBlock,
    refreshLine
} from './fragments.js';
import { turnLabel } from './dimension.js';
import { q1PlanContextBlock, m4PlanContextBlockForMode } from './blocks.js';
import type { InterviewPlannerState } from '../../../types/interview-planner.js';

export function planSystemPrompt(): string {
    return joinSections(
        'You are the private planning phase of a music mood interviewer (v4).',
        'Output JSON only — plan is never shown to the user.',
        twoLayerRule,
        creativityRules,
        musicPatternBan,
        '## Output schema',
        planOutputSchema
    );
}

export function buildPlanUserPrompt(
    stepIndex: number,
    stepId: string,
    priorAnswers: Partial<InterviewAnswers>,
    rejectedStems: string[],
    refresh: boolean,
    filterHints: string[],
    totalSteps = 4,
    planner?: InterviewPlannerState | null
): string {
    const filterBlock =
        filterHints.length > 0
            ? `## Filter hints\n${filterHints.map((h) => `- ${h}`).join('\n')}`
            : '';

    return joinSections(
        priorContextBlock(priorAnswers, rejectedStems),
        planChecklistBlock,
        turnLabel(stepIndex, stepId, totalSteps),
        refreshLine(refresh, 'plan'),
        freshInterviewBlock(priorAnswers),
        filterBlock,
        stepId === 'm1' ? q1PlanContextBlock() : '',
        stepId === 'm4'
            ? m4PlanContextBlockForMode(planner?.m4Mode ?? 'avoid')
            : '',
        'Return JSON only.'
    );
}
