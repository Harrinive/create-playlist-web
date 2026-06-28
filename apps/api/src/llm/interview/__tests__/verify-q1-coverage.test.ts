import assert from 'node:assert/strict';
import test from 'node:test';
import {
    labelReadsIntimate,
    labelReadsKinetic,
    verifyQ1Coverage
} from '../verify-q1-coverage.js';
import type { LlmStepDraft, TurnPlan } from '../shared.js';

const basePlan: TurnPlan = {
    gaps: [],
    reachableGenresNote: 'open',
    hypotheses: ['open'],
    plannedOptionCount: 5,
    axis: 'm1',
    sceneBeat: 'harbor',
    lateralHook: false,
    filterDrops: [],
    stemGuidance: 'harbor gate',
    optionGuidance: 'span settings',
    questionMode: 'SceneFeeling',
    optionSlots: {},
    lastQuestionMode: 'avoid'
};

test('labelReadsKinetic detects crowd register', () => {
    assert.equal(labelReadsKinetic('Packed dance floor, bodies moving', '挤满的舞池'), true);
    assert.equal(labelReadsKinetic('Hotel lobby after midnight', '午夜后的酒店大堂'), false);
});

test('labelReadsIntimate detects solo low-heat register', () => {
    assert.equal(labelReadsIntimate('One chair, cooling tea', '一把椅子，茶正凉着'), true);
    assert.equal(labelReadsIntimate('Corner booth, glasses clinking', '角落卡座'), false);
});

test('fails harbor-style quiet-mid Q1 without kinetic chip', () => {
    const draft: LlmStepDraft = {
        stemEn:
            'Salt air at the harbor gate, a light still on inside. Pick a still — where are you right now?',
        stemZh: '海港闸口带着盐味，里面还亮着一盏灯。选一处画面——你此刻在哪里？',
        options: [
            { id: 'tea', labelEn: 'One chair, cooling tea', labelZh: '一把椅子，茶正凉着' },
            { id: 'platform', labelEn: 'Last train platform, empty rails', labelZh: '末班月台，铁轨空着' },
            { id: 'lobby', labelEn: 'Hotel lobby after midnight', labelZh: '午夜后的酒店大堂' },
            { id: 'booth', labelEn: 'Corner booth, glasses clinking', labelZh: '角落卡座，杯子轻碰' },
            { id: 'fair', labelEn: 'Fairground edge, paper lanterns', labelZh: '集市边上，纸灯笼晃着' }
        ]
    };
    const failures = verifyQ1Coverage(draft, basePlan);
    assert.ok(failures.some((f) => f.includes('kinetic/crowd option in labels')));
    assert.ok(!failures.some((f) => f.includes('missing intimate-still')));
});

test('passes balanced Q1 with kinetic and intimate labels', () => {
    const plan: TurnPlan = {
        ...basePlan,
        optionSlots: {
            tea: { regionId: 'intimate-still' },
            platform: { regionId: 'bittersweet-mid' },
            club: { regionId: 'kinetic-high' },
            fair: { regionId: 'elsewhere-transit' }
        },
        plannedOptionIds: ['tea', 'platform', 'club', 'fair']
    };
    const draft: LlmStepDraft = {
        stemEn: 'Pick a still — where are you right now?',
        stemZh: '选一处画面——你此刻在哪里？',
        options: [
            { id: 'tea', labelEn: 'One chair, cooling tea', labelZh: '一把椅子，茶正凉着' },
            { id: 'platform', labelEn: 'Last train platform, empty rails', labelZh: '末班月台，铁轨空着' },
            { id: 'club', labelEn: 'Packed dance floor, bodies moving', labelZh: '挤满的舞池，人群在动' },
            { id: 'fair', labelEn: 'Night market alley, paper lanterns', labelZh: '夜市巷口，纸灯笼晃着' }
        ]
    };
    assert.deepEqual(verifyQ1Coverage(draft, plan), []);
});

test('fails when kinetic region tag does not match quiet label', () => {
    const plan: TurnPlan = {
        ...basePlan,
        optionSlots: {
            tea: { regionId: 'intimate-still' },
            booth: { regionId: 'kinetic-high' },
            platform: { regionId: 'bittersweet-mid' },
            fair: { regionId: 'elsewhere-transit' }
        }
    };
    const draft: LlmStepDraft = {
        stemEn: 'Pick a still — where are you right now?',
        stemZh: '选一处画面——你此刻在哪里？',
        options: [
            { id: 'tea', labelEn: 'One chair, cooling tea', labelZh: '一把椅子，茶正凉着' },
            { id: 'booth', labelEn: 'Corner booth, glasses clinking', labelZh: '角落卡座，杯子轻碰' },
            { id: 'platform', labelEn: 'Last train platform, empty rails', labelZh: '末班月台，铁轨空着' },
            { id: 'club', labelEn: 'Packed dance floor, bodies moving', labelZh: '挤满的舞池，人群在动' }
        ]
    };
    const failures = verifyQ1Coverage(draft, plan);
    assert.ok(
        failures.some((f) => f.includes('"booth"') && f.includes('tagged kinetic-high')),
        failures.join('; ')
    );
});
