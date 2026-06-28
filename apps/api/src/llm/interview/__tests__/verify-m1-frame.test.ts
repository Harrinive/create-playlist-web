import assert from 'node:assert/strict';
import test from 'node:test';
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
    stemGuidance: 'threshold',
    optionGuidance: 'places',
    questionMode: 'SceneFeeling',
    optionRole: 'place-partition'
};

test('fails M1 workbench caption with cross-world options', () => {
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
    const failures = verifyM1PlacePartition(draft, basePlan);
    assert.ok(failures.some((f) => f.includes('locks one place')));
});

test('passes M1 threshold invite with cross-world options', () => {
    const draft: LlmStepDraft = {
        stemEn: 'Pick a still — where are you right now?',
        stemZh: '选一处画面——你此刻在哪里？',
        options: [
            { id: 'a', labelEn: 'Late platform under blue signs', labelZh: '蓝色站牌下的月台' },
            { id: 'b', labelEn: 'Kitchen counter, one lamp', labelZh: '厨房台面，一盏灯' }
        ]
    };
    const failures = verifyM1PlacePartition(draft, basePlan);
    assert.equal(failures.length, 0);
});

test('fails M1 moment-in-scene optionRole', () => {
    const draft: LlmStepDraft = {
        stemEn: 'Pick a still — where are you?',
        stemZh: '选一处画面——你此刻在哪里？',
        options: [{ id: 'a', labelEn: 'Kitchen counter', labelZh: '厨房台面' }]
    };
    const failures = verifyM1PlacePartition(draft, {
        ...basePlan,
        optionRole: 'moment-in-scene'
    });
    assert.ok(failures.some((f) => f.includes('place-partition')));
});
