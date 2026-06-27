import {
    clearDiscriminantBlock,
    concreteM2Block,
    concreteM3Block,
    m4ExampleBlock,
    m4PlainRejectBlock,
    q1CoverageBlock,
    sceneFeelingBlock,
    storyM1Block
} from './prompts/blocks.js';
import { discriminantBlockForMode } from './prompts/sections/positive-discriminant.js';
import type { InterviewAnswers } from '../../types/interview.js';
import type { InterviewPlannerState } from '../../types/interview-planner.js';

export function fastM1DiversityBlock(): string {
    return `## Fast M1 diversity (mandatory)
- **Social heat:** partition across intimate ↔ kinetic — include ≥1 intimate-still AND ≥1 kinetic/crowd register (kinetic-high, rhythm-social, or edge-charged).
- **Setting type:** spread home, transit, venue, outdoors/urban — not six copies of winding-down domestic or solo-night quiet.
- **Distinct beats:** each option = one film-still (props + light + action); no overlapping post-social domestic pairs or duplicate transit-quiet pairs.
- **Stem (Q1):** use a **place-neutral threshold** (light, weather, hour, doorway) + invitation to pick a still — options are *different* places; do NOT lock one interior/table/bus beat that most options contradict.`;
}

export function fastM2ContextBlock(priorM1?: string): string {
    const anchor = priorM1?.trim()
        ? `User's M1 pick: "${priorM1}" — stem and every option must stay in that scene world.`
        : '';
    return [
        '## Fast M2 continuity',
        anchor,
        'Stem advances one beat from M1 in the **same world** — not a new location or unrelated weather image.',
        'Stem must ask or frame the turn — never duplicate an option chip in stemEn/stemZh.'
    ]
        .filter(Boolean)
        .join('\n\n');
}

export function fastM3ContextBlock(prior: Partial<InterviewAnswers>): string {
    const lines = [
        prior.m1?.label ? `M1: ${prior.m1.label}` : '',
        prior.m2?.label ? `M2: ${prior.m2.label}` : ''
    ].filter(Boolean);
    const anchor =
        lines.length > 0
            ? `Prior picks:\n${lines.join('\n')}\nStay in the same scene world for M3 night-chapter beats.`
            : '';
    return ['## Fast M3 continuity', anchor].filter(Boolean).join('\n\n');
}

export function fastM4ContextBlock(
    prior: Partial<InterviewAnswers>,
    discriminant = false
): string {
    const m3 = prior.m3?.label?.trim();
    const anchor = m3
        ? discriminant
            ? `M3 beat to advance in stem: "${m3}" — ask which felt motion/groove/texture fits.`
            : `M3 beat to advance in stem: "${m3}" — ask what soundtrack must NOT sound like.`
        : '';
    return ['## Fast M4 continuity', anchor].filter(Boolean).join('\n\n');
}

/** Per-step principle blocks for fast mode (mirrors full draftBlocks, no plan JSON). */
export function buildFastTurnBlocks(
    stepId: string,
    priorAnswers: Partial<InterviewAnswers> = {},
    planner?: InterviewPlannerState | null
): string[] {
    switch (stepId) {
        case 'm1':
            return [sceneFeelingBlock(), storyM1Block(), q1CoverageBlock(), fastM1DiversityBlock()];
        case 'm2':
            return [
                sceneFeelingBlock(),
                fastM2ContextBlock(priorAnswers.m1?.label),
                concreteM2Block()
            ];
        case 'm3':
            return [sceneFeelingBlock(), fastM3ContextBlock(priorAnswers), concreteM3Block()];
        case 'm_clarify':
            return [sceneFeelingBlock()];
        case 'm4': {
            const m4Mode = planner?.m4Mode ?? 'avoid';
            if (m4Mode !== 'avoid') {
                return [
                    discriminantBlockForMode(m4Mode),
                    fastM4ContextBlock(priorAnswers, true)
                ];
            }
            return [
                clearDiscriminantBlock(),
                fastM4ContextBlock(priorAnswers, false),
                m4ExampleBlock(),
                m4PlainRejectBlock()
            ];
        }
        default:
            return [sceneFeelingBlock()];
    }
}

/** @deprecated Zero-gloss policy lives in fast-system/draft-system; kept for future re-enable. */
export function buildFastGlossBlock(_stepId: string): string {
    return '';
}
