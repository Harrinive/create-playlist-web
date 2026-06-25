import { joinSections } from './join.js';
import { buildBilingualCopyRules } from './sections/bilingual.js';
import { creativityRules, musicPatternBan, twoLayerRule } from './sections/bans.js';
import { draftOutputSchema } from './sections/schemas.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import {
    freshInterviewBlock,
    priorContextBlock,
    refreshLine
} from './fragments.js';
import { turnLabel } from './dimension.js';
import { m4AvoidGlossBlock, m5FeltAxesBlock, q1CoverageBlock, q1DraftContextBlock } from './blocks.js';
import { buildGlossRulesBlock, stemGlossRules } from './sections/gloss-rules.js';

export function draftSystemPrompt(): string {
    return joinSections(
        'You draft music mood interview questions (v4 story-native).',
        twoLayerRule,
        creativityRules,
        musicPatternBan,
        '- Follow the turn plan exactly',
        '- Stems: one scene beat — **no stemGloss** on M1–M3',
        '- M1 stems: scene-only — no music/soundtrack vocabulary in stemEn or stemZh',
        '- M4 stem: advance M3 prop + ask what soundtrack must NOT sound like — sonic reject only; forbid scene-transformation ("turn into") and vague guardian framing',
        '- M4 option ids: name trap clusters (playlist cliché, production register) — hard-banned mood-template too-* ids',
        '- M4 gloss: name production/playlist trap register per gloss rules — trap lexicon check applies',
        '- Options: concrete objects + events; M2/M3 omit option gloss',
        '- Bilingual EN + ZH; compose each language independently',
        '- Option ids: lowercase kebab-case',
        '- No manual "something else" option',
        '## Bilingual bar',
        buildBilingualCopyRules(),
        stemGlossRules,
        '## Output',
        draftOutputSchema
    );
}

export function buildDraftUserPrompt(
    stepIndex: number,
    stepId: string,
    priorAnswers: Partial<InterviewAnswers>,
    rejectedStems: string[],
    refresh: boolean,
    planJson: string,
    optionCount: string,
    draftBlocks: string[],
    q1RegionsToCover?: string[]
): string {
    const q1Block =
        stepId === 'm1' && q1RegionsToCover?.length
            ? q1DraftContextBlock(q1RegionsToCover)
            : stepId === 'm1'
              ? q1CoverageBlock()
              : '';
    const m5Block = stepId === 'm5' ? m5FeltAxesBlock() : '';
    const m4Block = stepId === 'm4' ? m4AvoidGlossBlock() : '';
    const plannedIds = planJson.includes('plannedOptionIds')
        ? `## Planned option ids\nUse plannedOptionIds from the turn plan verbatim.`
        : '';

    return joinSections(
        turnLabel(stepIndex, stepId),
        refreshLine(refresh, 'draft'),
        freshInterviewBlock(priorAnswers),
        `## Turn plan\n${planJson}`,
        plannedIds,
        ...draftBlocks,
        buildGlossRulesBlock(stepId),
        q1Block,
        m5Block,
        m4Block,
        priorContextBlock(priorAnswers, rejectedStems),
        `Provide exactly ${optionCount} options. Return JSON only.`
    );
}

export function reviseCopySystemPrompt(): string {
    return joinSections(
        'Revise interview COPY only — fix grammar, calque, rhythm.',
        buildBilingualCopyRules(),
        draftOutputSchema
    );
}
