import assert from 'node:assert/strict';
import test from 'node:test';
import { repairM1ThresholdStem } from '../normalize-draft.js';
import { verifyM1PlacePartition } from '../verify-m1-frame.js';
import type { LlmStepDraft, TurnPlan } from '../shared.js';

const basePlan: TurnPlan = {
    gaps: [],
    reachableGenresNote: 'open',
    hypotheses: ['a', 'b'],
    plannedOptionCount: 4,
    axis: 'm1',
    sceneBeat: 'x',
    lateralHook: false,
    filterDrops: [],
    optionSlots: {},
    stemGuidance: 'threshold',
    optionGuidance: 'places',
    questionMode: 'SceneFeeling',
    optionRole: 'place-partition',
    m1StemMode: 'threshold-invite'
};

test('repairM1ThresholdStem rewrites locked-caption stem and preserves sensory prefix', () => {
    const draft: LlmStepDraft = {
        stemEn: 'Sunlight cuts across a workbench — wood shavings in the beam.',
        stemZh: '阳光切过工作台——木屑在光线里闪烁。',
        options: [
            { id: 'a', labelEn: 'Late platform under blue signs', labelZh: '蓝色站牌下的月台' },
            { id: 'b', labelEn: 'Kitchen counter, one lamp', labelZh: '厨房台面，一盏灯' },
            { id: 'c', labelEn: 'Highway dashboard glow', labelZh: '高速上的仪表盘光' },
            { id: 'd', labelEn: 'Crowded doorway', labelZh: '挤满人的门口' }
        ]
    };

    const repaired = repairM1ThresholdStem(draft, basePlan);

    assert.match(repaired.stemEn, /Sunlight cuts across a workbench/);
    assert.match(repaired.stemEn, /Pick a still — where are you right now\?/);
    assert.match(repaired.stemZh, /阳光切过工作台/);
    assert.match(repaired.stemZh, /选一处画面——你此刻在哪里？/);
    assert.equal(verifyM1PlacePartition(repaired, basePlan).length, 0);
});

test('repairM1ThresholdStem leaves threshold-invite stem unchanged', () => {
    const draft: LlmStepDraft = {
        stemEn: 'Pick a still — where are you right now?',
        stemZh: '选一处画面——你此刻在哪里？',
        options: [
            { id: 'a', labelEn: 'Late platform under blue signs', labelZh: '蓝色站牌下的月台' },
            { id: 'b', labelEn: 'Kitchen counter, one lamp', labelZh: '厨房台面，一盏灯' }
        ]
    };

    const repaired = repairM1ThresholdStem(draft, basePlan);
    assert.equal(repaired.stemEn, draft.stemEn);
    assert.equal(repaired.stemZh, draft.stemZh);
});
