import type { TurnPlan, QuestionMode } from './shared.js';
import {
    clearDiscriminantBlock,
    concreteM2Block,
    concreteM3Block,
    logicalDecisionBlock,
    m4AvoidGlossBlock,
    m5FeltAxesBlock,
    q1CoverageBlock,
    sceneFeelingBlock
} from './prompts.js';
import type { InterviewAnswers } from '../../types/interview.js';
import { buildSceneAnchorBlock } from './scene-anchor.js';

export type TurnConfig = {
    questionMode: QuestionMode;
    draftBlocks: string[];
    logicVerifyIntro: string;
    copyVerifyIntro: string;
};

export function resolveTurnConfig(
    stepId: string,
    plan: TurnPlan,
    priorAnswers: Partial<InterviewAnswers>
): TurnConfig {
    const mode = plan.questionMode;

    switch (stepId) {
        case 'm1':
            return {
                questionMode: 'SceneFeeling',
                draftBlocks: [sceneFeelingBlock(), q1CoverageBlock()],
                logicVerifyIntro:
                    '## Logic verify focus\nQ1 nine-region coverage, partition, kinetic/non-domestic.',
                copyVerifyIntro: '## Copy verify focus\nEN free verse + ZH 现代诗 for Q1 stem/options.'
            };

        case 'm2':
            return {
                questionMode: 'SceneFeeling',
                draftBlocks: [
                    sceneFeelingBlock(),
                    buildSceneAnchorBlock(priorAnswers, false),
                    concreteM2Block()
                ],
                logicVerifyIntro:
                    '## Logic verify focus\nM2 concrete in M1 scene; distinct emotionSlot per option; no abstract mood chips.',
                copyVerifyIntro: '## Copy verify focus\nBilingual copy quality for M2 felt moments.'
            };

        case 'm3':
            if (mode === 'LogicalDecision') {
                return {
                    questionMode: 'LogicalDecision',
                    draftBlocks: [
                        buildSceneAnchorBlock(priorAnswers, true),
                        logicalDecisionBlock()
                    ],
                    logicVerifyIntro:
                        '## Logic verify focus\nLogicalDecision: you-decide option + gloss on others; body in scene.',
                    copyVerifyIntro: '## Copy verify focus\nGloss clarity for groove grain options.'
                };
            }
            return {
                questionMode: 'SceneFeeling',
                draftBlocks: [
                    sceneFeelingBlock(),
                    buildSceneAnchorBlock(priorAnswers, true),
                    concreteM3Block()
                ],
                logicVerifyIntro:
                    '## Logic verify focus\nM3 body in same scene; distinct tempoSlot; not tempo labels on chips.',
                copyVerifyIntro: '## Copy verify focus\nBilingual copy for body-motion chips.'
            };

        case 'm_clarify':
            return {
                questionMode: 'SceneFeeling',
                draftBlocks: [sceneFeelingBlock(), buildSceneAnchorBlock(priorAnswers, true)],
                logicVerifyIntro:
                    '## Logic verify focus\nm_clarify: film-stills only; not sonic axis quiz.',
                copyVerifyIntro: '## Copy verify focus\nBilingual film-still copy.'
            };

        case 'm4':
            return {
                questionMode: 'ClearDiscriminant',
                draftBlocks: [clearDiscriminantBlock(), m4AvoidGlossBlock()],
                logicVerifyIntro:
                    '## Logic verify focus\nM4 avoid partition; includes id "none"; gloss on poetic non-none options.',
                copyVerifyIntro: '## Copy verify focus\nM4 gloss decodes reject clusters.'
            };

        case 'm5':
            return {
                questionMode: 'SceneFeeling',
                draftBlocks: [m5FeltAxesBlock()],
                logicVerifyIntro:
                    '## Logic verify focus\nM5 felt sonic axis partition; no scenery-only props.',
                copyVerifyIntro: '## Copy verify focus\nSonic feel wording in both languages.'
            };

        default:
            return {
                questionMode: mode,
                draftBlocks: [sceneFeelingBlock()],
                logicVerifyIntro: '## Logic verify focus\nStandard partition and consistency.',
                copyVerifyIntro: '## Copy verify focus\nStandard bilingual copy bar.'
            };
    }
}
