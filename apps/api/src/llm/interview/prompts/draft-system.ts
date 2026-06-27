import { joinSections } from './join.js';
import {
    buildBilingualCopyRules,
    buildM4AvoidCopyRules,
    buildM4DiscriminantCopyRules,
    buildSceneCopyRules
} from './sections/bilingual.js';
import { creativityRules, musicPatternBan, twoLayerRule } from './sections/bans.js';
import { draftOutputSchema } from './sections/schemas.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import {
    freshInterviewBlock,
    priorContextBlock,
    refreshLine
} from './fragments.js';
import { turnLabel } from './dimension.js';
import { m5FeltAxesBlock, q1CoverageBlock, q1DraftContextBlock } from './blocks.js';
import { noGlossOutputBlock } from './sections/gloss-rules.js';
import { m4HintOutputBlock, stemHintOutputBlock } from './sections/hint-rules.js';
import type { M4Mode } from '../m4-eligibility.js';

export type DraftPromptContext = {
    stepId?: string;
    m4Mode?: M4Mode;
};

function bilingualBarForStep(ctx?: DraftPromptContext): string {
    if (ctx?.stepId === 'm4') {
        if (ctx.m4Mode && ctx.m4Mode !== 'avoid') {
            return buildM4DiscriminantCopyRules();
        }
        return buildM4AvoidCopyRules();
    }
    if (ctx?.stepId && ['m1', 'm2', 'm3', 'm_clarify'].includes(ctx.stepId)) {
        return buildSceneCopyRules();
    }
    return buildBilingualCopyRules();
}

function m4SystemLines(ctx?: DraftPromptContext): string {
    if (ctx?.stepId !== 'm4') return '';
    if (ctx.m4Mode && ctx.m4Mode !== 'avoid') {
        return joinSections(
            '- M4 discriminant: advance M3 prop + ask what **fits** (pace/groove/space) — positive fit only',
            '- FORBIDDEN: Skip/Avoid trap labels, trap cluster ids, id "none", reject framing in stem',
            '- Options: plain felt sonic/motion labels — no genre names'
        );
    }
    return joinSections(
        '- M4 avoid stem: advance M3 prop + ask what soundtrack must NOT sound like — sonic reject only',
        '- FORBIDDEN stem: scene-transformation ("turn into"), guardian/meta ("feel wrong", "soundtrack trap")',
        '- M4 option ids: trap cluster ids from plan — not mood-template too-* ids',
        '- M4 labels: plain Skip/Avoid trap language in labelEn/labelZh — no scene nouns in options'
    );
}

function hintBlockForStep(ctx?: DraftPromptContext): string {
    if (ctx?.stepId === 'm4') return m4HintOutputBlock;
    return stemHintOutputBlock;
}

export function draftSystemPrompt(ctx?: DraftPromptContext): string {
    const optionLines =
        ctx?.stepId === 'm1'
            ? '- M1 options: each chip = one distinct **place/world** (coverage partition) — not moments inside the stem'
            : ctx?.stepId && ['m2', 'm3', 'm_clarify'].includes(ctx.stepId)
              ? '- Options: concrete objects + events in main labels'
              : '- Options: follow turn plan shape for this step';

    const m1StemLines =
        ctx?.stepId === 'm1'
            ? joinSections(
                  '- M1 user job: pick which world — stem = threshold invite + explicit ask',
                  '- M1 stem must NOT lock one option world (no single-place caption without ask)'
              )
            : '';

    return joinSections(
        'You draft music mood interview questions (v4 story-native).',
        twoLayerRule,
        creativityRules,
        musicPatternBan,
        '- Follow the turn plan exactly — stemGuidance, optionGuidance, plannedOptionIds are authoritative',
        '- Stems: stemEn/stemZh must include an explicit ask — never scene-only caption',
        m1StemLines,
        '- M1 stems: no music/soundtrack vocabulary in stemEn or stemZh',
        m4SystemLines(ctx),
        optionLines,
        '- Bilingual EN + ZH; compose each language independently',
        '- Option ids: lowercase kebab-case',
        '- No manual "something else" option',
        '## Bilingual bar',
        bilingualBarForStep(ctx),
        noGlossOutputBlock,
        hintBlockForStep(ctx),
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
    q1RegionsToCover?: string[],
    m4Mode?: M4Mode,
    totalSteps = 5
): string {
    const q1Block =
        stepId === 'm1' && q1RegionsToCover?.length
            ? q1DraftContextBlock(q1RegionsToCover)
            : stepId === 'm1'
              ? q1CoverageBlock()
              : '';
    const m5Block = stepId === 'm5' ? m5FeltAxesBlock() : '';
    const plannedIds = planJson.includes('plannedOptionIds')
        ? `## Planned option ids\nUse plannedOptionIds from the turn plan verbatim.`
        : '';

    return joinSections(
        turnLabel(stepIndex, stepId, totalSteps, m4Mode),
        refreshLine(refresh, 'draft'),
        freshInterviewBlock(priorAnswers),
        `## Turn plan\n${planJson}`,
        plannedIds,
        ...draftBlocks,
        q1Block,
        m5Block,
        priorContextBlock(priorAnswers, rejectedStems),
        `Provide exactly ${optionCount} options. Return JSON only.`
    );
}

export function reviseCopySystemPrompt(ctx?: DraftPromptContext): string {
    return joinSections(
        'Revise interview COPY only — fix grammar, calque, rhythm.',
        'stemZh/labelZh: rewrite 英译腔 into native Chinese — same scene/trap axis, not a mirror of EN wording.',
        'Preserve the register for this step (scene imagist vs M4 plain trap vs M4 felt discriminant).',
        hintBlockForStep(ctx),
        bilingualBarForStep(ctx),
        draftOutputSchema
    );
}
