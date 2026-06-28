import assert from 'node:assert/strict';
import test from 'node:test';
import { INTERVIEW_PATHS } from '../../../../scripts/interview-paths.js';
import { repairM4AvoidEligibleTraps, normalizeM4DiscriminantDraft } from '../normalize-draft.js';
import type { LlmStepDraft, TurnPlan } from '../shared.js';
import { verifyDeterministic } from '../verify-deterministic.js';

const kineticPath = INTERVIEW_PATHS.find((p) => p.id === 'kinetic-neon')!;

test('repairM4AvoidEligibleTraps swaps dropped calm traps for kinetic-eligible ones', () => {
    const plan: TurnPlan = {
        gaps: [],
        reachableGenresNote: 'kinetic',
        hypotheses: ['a'],
        plannedOptionCount: 5,
        axis: 'm4',
        sceneBeat: 'corner',
        lateralHook: false,
        stemGuidance: 'avoid',
        optionGuidance: 'traps',
        questionMode: 'ClearDiscriminant',
        plannedOptionIds: [
            'elevator-muzak',
            'coffee-shop-template',
            'lo-fi-study',
            'grief-dirge',
            'none'
        ]
    };
    const draft: LlmStepDraft = {
        stemEn: 'Past the doorway — what should this NOT sound like?',
        stemZh: '门边那个角落——这配乐最不该像什么？',
        options: [
            { id: 'elevator-muzak', labelEn: 'Skip elevator muzak', labelZh: '别选电梯音乐' },
            {
                id: 'coffee-shop-template',
                labelEn: 'Skip coffee-shop acoustic templates',
                labelZh: '避开咖啡馆木吉他模板'
            },
            { id: 'lo-fi-study', labelEn: 'Avoid generic lo-fi study loops', labelZh: '不要复习循环' },
            { id: 'grief-dirge', labelEn: 'Skip grief dirges', labelZh: '避开挽歌' },
            { id: 'none', labelEn: 'None of these', labelZh: '以上都不是' }
        ]
    };

    const repaired = repairM4AvoidEligibleTraps(draft, plan, {
        priorAnswers: kineticPath.priorAnswers,
        planner: kineticPath.planner,
        optionMax: 6
    });

    const det = verifyDeterministic({
        stepId: 'm4',
        plan,
        draft: repaired,
        optionMin: 2,
        optionMax: 6,
        priorAnswers: kineticPath.priorAnswers,
        planner: kineticPath.planner
    });

    assert.ok(
        !det.failures.some((f) => f.includes('matches dropped trap cluster')),
        det.failures.join('; ')
    );
    assert.ok(repaired.options.some((o) => o.id === 'peak-club-banger' || o.id === 'gym-hype'));
});

test('normalizeM4DiscriminantDraft injects no-constraints when planned', () => {
    const plan: TurnPlan = {
        gaps: [],
        reachableGenresNote: 'ambient',
        hypotheses: ['a'],
        plannedOptionCount: 5,
        axis: 'm4',
        sceneBeat: 'bed',
        lateralHook: false,
        stemGuidance: 'discriminant',
        optionGuidance: 'felt',
        questionMode: 'PositiveDiscriminant',
        plannedOptionIds: ['close-grain', 'wide-air', 'suspended', 'no-constraints']
    };
    const draft: LlmStepDraft = {
        stemEn: 'Still drifting — how close should the sound feel?',
        stemZh: '还在漂浮——声音该有多近？',
        options: [
            { id: 'close-grain', labelEn: 'Close whisper grain', labelZh: '贴身细颗粒' },
            { id: 'wide-air', labelEn: 'Wide distant hum', labelZh: '远处空旷嗡鸣' },
            { id: 'suspended', labelEn: 'Suspended drift', labelZh: '悬浮慢漂' }
        ]
    };

    const normalized = normalizeM4DiscriminantDraft(draft, plan);
    assert.ok(normalized.options.some((o) => o.id === 'no-constraints'));
});
