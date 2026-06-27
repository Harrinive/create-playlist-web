import type { TurnPlan, QuestionMode } from './shared.js';
import {
    clearDiscriminantBlock,
    concreteM2Block,
    concreteM3Block,
    logicalDecisionBlock,
    m4ExampleBlock,
    m4PlainRejectBlock,
    m5FeltAxesBlock,
    q1CoverageBlock,
    sceneFeelingBlock,
    storyM1Block
} from './prompts.js';
import { discriminantBlockForMode } from './prompts/sections/positive-discriminant.js';
import type { InterviewAnswers } from '../../types/interview.js';
import type { InterviewPlannerState, M4Mode } from '../../types/interview-planner.js';
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
    priorAnswers: Partial<InterviewAnswers>,
    planner?: InterviewPlannerState | null
): TurnConfig {
    const mode = plan.questionMode;

    switch (stepId) {
        case 'm1':
            return {
                questionMode: 'SceneFeeling',
                draftBlocks: [sceneFeelingBlock(), storyM1Block(), q1CoverageBlock()],
                logicVerifyIntro:
                    '## Logic verify focus\nQ1: 4–6 distinct film-stills; span social heat AND setting type; stem-option coherence; no music words in stem.',
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
                    '## Logic verify focus\nM2: distinct concrete moments in M1 world; register spread when kinetic survives; BGM test; stem-option coherence.',
                copyVerifyIntro: '## Copy verify focus\nBilingual copy quality for M2 story moments.'
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
                        '## Logic verify focus\nLogicalDecision: you-decide option + groove read in main labels.',
                    copyVerifyIntro: '## Copy verify focus\nPlain groove wording in both languages.'
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
                    '## Logic verify focus\nM3 night-chapter beats; same M1 world; no tempo labels or music-pattern poetry.',
                copyVerifyIntro: '## Copy verify focus\nBilingual copy for story beats.'
            };

        case 'm_clarify':
            return {
                questionMode: 'SceneFeeling',
                draftBlocks: [sceneFeelingBlock(), buildSceneAnchorBlock(priorAnswers, true)],
                logicVerifyIntro:
                    '## Logic verify focus\nm_clarify: film-stills only; not sonic axis quiz.',
                copyVerifyIntro: '## Copy verify focus\nBilingual film-still copy.'
            };

        case 'm4': {
            const m4Mode: M4Mode = planner?.m4Mode ?? 'avoid';
            if (m4Mode !== 'avoid') {
                return {
                    questionMode: 'PositiveDiscriminant',
                    draftBlocks: [
                        buildSceneAnchorBlock(priorAnswers, true),
                        discriminantBlockForMode(m4Mode)
                    ],
                    logicVerifyIntro:
                        '## Logic verify focus\nM4 discriminant ONLY — apply check 9b, NOT check 9. NO "none" required. NO Skip/Avoid labels. Positive fit stem + felt groove/space options.',
                    copyVerifyIntro:
                        '## Copy verify focus\nPlain felt sonic/motion wording in both languages.'
                };
            }
            return {
                questionMode: 'ClearDiscriminant',
                draftBlocks: [clearDiscriminantBlock(), m4ExampleBlock(), m4PlainRejectBlock()],
                logicVerifyIntro:
                    '## Logic verify focus\nM4: stem advances M3 prop; distinct trap clusters in plain labels; includes "none"; only eligible trap clusters.',
                copyVerifyIntro:
                    '## Copy verify focus\nPlain Skip/Avoid trap wording in both languages — preserve trap register; no imagist rewrite.'
            };
        }

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
