import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyDeterministic } from '../verify-deterministic.js';
import type { LlmStepDraft, TurnPlan } from '../shared.js';

const basePlan: TurnPlan = {
    gaps: ['m2'],
    hypotheses: ['indie', 'jazz'],
    axis: 'emotion',
    sceneBeat: 'porch rain',
    lateralHook: false,
    filterDrops: [],
    stemGuidance: 'advance porch',
    optionGuidance: 'felt moments',
    questionMode: 'SceneFeeling',
    optionSlots: {
        wistful: { emotionSlot: 'wistful', function: 'validate' },
        hopeful: { emotionSlot: 'hopeful', function: 'challenge' }
    },
    plannedOptionIds: ['wistful', 'hopeful']
};

const baseDraft: LlmStepDraft = {
    stemEn: 'The porch is still dripping — what is true for you?',
    stemZh: '门廊还在滴水——此刻什么是真的？',
    options: [
        {
            id: 'wistful',
            labelEn: 'Rain on the steps — not going back in yet',
            labelZh: '台阶上的雨——还不打算回去'
        },
        {
            id: 'hopeful',
            labelEn: 'Towel on the railing, already thinking about tomorrow',
            labelZh: '毛巾搭在栏杆上，已经在想明天'
        }
    ]
};

test('passes valid M2 draft with distinct slots', () => {
    const result = verifyDeterministic({
        stepId: 'm2',
        plan: basePlan,
        draft: baseDraft,
        optionMin: 2,
        optionMax: 6
    });
    assert.equal(result.passed, true);
    assert.equal(result.failures.length, 0);
});

test('fails abstract mood chip on M2', () => {
    const draft: LlmStepDraft = {
        ...baseDraft,
        options: [
            { id: 'wistful', labelEn: 'Calm and still', labelZh: '平静停驻' },
            ...baseDraft.options.slice(1)
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm2',
        plan: basePlan,
        draft,
        optionMin: 2,
        optionMax: 6
    });
    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.includes('abstract mood')));
});

test('fails M4 poetic option without gloss', () => {
    const plan: TurnPlan = {
        ...basePlan,
        questionMode: 'ClearDiscriminant',
        optionSlots: {
            gym: { rejectCluster: 'gym hype' },
            none: { rejectCluster: 'open' }
        },
        plannedOptionIds: ['gym', 'none']
    };
    const draft: LlmStepDraft = {
        stemEn: 'What must we not sound like?',
        stemZh: '什么声音必须避开？',
        options: [
            {
                id: 'gym',
                labelEn: 'Iron doors echoing',
                labelZh: '铁门回响'
            },
            { id: 'none', labelEn: "None — I'm open", labelZh: '都可以' }
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm4',
        plan,
        draft,
        optionMin: 2,
        optionMax: 6
    });
    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.includes('gloss')));
});

test('fails LogicalDecision without you-decide', () => {
    const plan: TurnPlan = {
        ...basePlan,
        questionMode: 'LogicalDecision',
        needsGrooveGrain: true,
        optionSlots: {
            heel: { tempoSlot: 'on-grid' },
            sway: { tempoSlot: 'sway' }
        }
    };
    const draft: LlmStepDraft = {
        stemEn: 'What is your body doing on the step?',
        stemZh: '在台阶上，身体在做什么？',
        options: [
            {
                id: 'heel',
                labelEn: 'Heel on the step, steady',
                labelZh: '脚跟点阶，稳住',
                glossEn: 'even pulse',
                glossZh: '均匀拍点'
            },
            {
                id: 'sway',
                labelEn: 'Weight shifting side to side',
                labelZh: '重心左右移',
                glossEn: 'loose sway',
                glossZh: '松摆'
            }
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm3',
        plan,
        draft,
        optionMin: 2,
        optionMax: 6
    });
    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.includes('you-decide')));
});
