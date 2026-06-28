import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyDeterministic } from '../verify-deterministic.js';
import type { LlmStepDraft, TurnPlan } from '../shared.js';

const basePlan: TurnPlan = {
    gaps: [],
    reachableGenresNote: 'indie and house still reachable',
    hypotheses: ['open'],
    plannedOptionCount: 5,
    axis: 'm1',
    sceneBeat: 'late kitchen',
    lateralHook: false,
    filterDrops: [],
    stemGuidance: 'dim kitchen',
    optionGuidance: 'span settings',
    questionMode: 'SceneFeeling',
    q1RegionsToCover: ['intimate-still', 'social-mid'],
    optionSlots: {
        quiet: { regionId: 'intimate-still' },
        table: { regionId: 'social-mid' },
        train: { regionId: 'focus-flow' }
    },
    plannedOptionIds: ['quiet', 'table', 'train']
};

test('Q1 verify accepts kinetic crowd labels when optionSlots lack kinetic tags', () => {
    const plan: TurnPlan = {
        ...basePlan,
        plannedOptionCount: 4,
        plannedOptionIds: ['quiet', 'platform', 'club', 'fair'],
        optionSlots: {
            quiet: { regionId: 'intimate-still' },
            platform: { regionId: 'bittersweet-mid' },
            club: { regionId: 'kinetic-high' },
            fair: { regionId: 'elsewhere-transit' }
        }
    };
    const draft: LlmStepDraft = {
        stemEn: 'Pick a still — where are you right now? The hallway is still warm from everyone leaving.',
        stemZh: '选一处画面——你此刻在哪里？走廊还留着人群散去后的热气。',
        options: [
            { id: 'quiet', labelEn: 'One chair, cooling tea', labelZh: '一把椅子，茶正凉着' },
            { id: 'platform', labelEn: 'Last train platform, empty rails', labelZh: '末班月台，铁轨空着' },
            { id: 'club', labelEn: 'Packed dance floor, bodies moving', labelZh: '挤满的舞池，人群在动' },
            { id: 'fair', labelEn: 'Night market alley, paper lanterns', labelZh: '夜市巷口，纸灯笼晃着' }
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm1',
        plan,
        draft,
        optionMin: 4,
        optionMax: 6
    });
    assert.equal(result.passed, true);
});

test('Q1 verify rejects fake kinetic region tag on quiet label', () => {
    const plan: TurnPlan = {
        ...basePlan,
        plannedOptionCount: 4,
        plannedOptionIds: ['quiet', 'booth', 'platform', 'club'],
        optionSlots: {
            quiet: { regionId: 'intimate-still' },
            booth: { regionId: 'kinetic-high' },
            platform: { regionId: 'bittersweet-mid' },
            club: { regionId: 'rhythm-social' }
        }
    };
    const draft: LlmStepDraft = {
        stemEn: 'Pick a still — where are you right now?',
        stemZh: '选一处画面——你此刻在哪里？',
        options: [
            { id: 'quiet', labelEn: 'One chair, cooling tea', labelZh: '一把椅子，茶正凉着' },
            { id: 'booth', labelEn: 'Corner booth, glasses clinking', labelZh: '角落卡座，杯子轻碰' },
            { id: 'platform', labelEn: 'Last train platform, empty rails', labelZh: '末班月台，铁轨空着' },
            { id: 'club', labelEn: 'Packed dance floor, bodies moving', labelZh: '挤满的舞池，人群在动' }
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm1',
        plan,
        draft,
        optionMin: 4,
        optionMax: 6
    });
    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.includes('"booth"') && f.includes('kinetic')));
});
