import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyDeterministic } from '../verify-deterministic.js';
import type { LlmStepDraft, TurnPlan } from '../shared.js';

const basePlan: TurnPlan = {
    gaps: ['m2'],
    reachableGenresNote: 'indie folk and cool jazz still reachable; EDM ruled out',
    hypotheses: ['indie', 'jazz'],
    plannedOptionCount: 2,
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

test('fails M4 too-* mood-template option id', () => {
    const plan: TurnPlan = {
        ...basePlan,
        questionMode: 'ClearDiscriminant',
        optionSlots: {
            'too-sad': { rejectCluster: 'sad acoustic' },
            none: { rejectCluster: 'open' }
        },
        plannedOptionIds: ['too-sad', 'none']
    };
    const draft: LlmStepDraft = {
        stemEn: 'The cups are stacked — what should this NOT sound like?',
        stemZh: '杯子摞好了——这配乐最不该像什么？',
        options: [
            {
                id: 'too-sad',
                labelEn: 'Rain on the window',
                labelZh: '窗上雨',
                glossEn: 'sad acoustic cliché',
                glossZh: '伤感木吉他套路'
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
    assert.ok(result.failures.some((f) => f.includes('too-*')));
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

test('fails music-pattern word on M3', () => {
    const draft: LlmStepDraft = {
        ...baseDraft,
        options: [
            { id: 'wistful', labelEn: 'Kick switches — room goes quiet', labelZh: '鼓点切换' },
            ...baseDraft.options.slice(1)
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm3',
        plan: basePlan,
        draft,
        optionMin: 2,
        optionMax: 6
    });
    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.includes('music-pattern')));
});

test('fails stemGloss on scene turns', () => {
    const draft: LlmStepDraft = {
        ...baseDraft,
        stemGlossEn: 'Ask which feeling inside this crowd-moving moment is most like the user.',
        stemGlossZh: '问人群里哪种感觉最像你。'
    };
    const result = verifyDeterministic({
        stepId: 'm2',
        plan: basePlan,
        draft,
        optionMin: 2,
        optionMax: 6
    });
    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.includes('stemGloss')));
});

test('allows duplicate regionId on M2 (no slot collision)', () => {
    const plan: TurnPlan = {
        ...basePlan,
        optionSlots: {
            wistful: { regionId: 'kinetic-high' },
            hopeful: { regionId: 'kinetic-high' }
        }
    };
    const result = verifyDeterministic({
        stepId: 'm2',
        plan,
        draft: baseDraft,
        optionMin: 2,
        optionMax: 6
    });
    assert.equal(result.passed, true);
});

test('fails M2 options inconsistent with prior M1 scene', () => {
    const draft: LlmStepDraft = {
        stemEn: 'Which moment feels most like you?',
        stemZh: '哪个瞬间最像你？',
        options: [
            { id: 'keys', labelEn: 'Keys in hand, door still shut', labelZh: '钥匙攥在手里，门还没开' },
            { id: 'lamp', labelEn: 'Back turned, one last look at the lamp', labelZh: '背过身去，最后看一眼灯' }
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm2',
        plan: basePlan,
        draft,
        optionMin: 2,
        optionMax: 6,
        priorLabels: ['Neon rooftop at dusk, wind across the rail']
    });
    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.includes('prior answers')));
});

test('fails overlapping crowd-mood M2 options from production pattern', () => {
    const draft: LlmStepDraft = {
        stemEn: 'In this packed room, which moment feels most like you?',
        stemZh: '在人挤满的房间里，哪一刻最像你？',
        options: [
            {
                id: 'smile',
                labelEn: 'A smile opens wide, the room softens',
                labelZh: '笑开，屋子软下来'
            },
            {
                id: 'glance',
                labelEn: 'A glance catches, and the air sparks',
                labelZh: '目光相接，空气带电'
            },
            {
                id: 'shoulders',
                labelEn: 'Shoulders loosen, and laughter spills out',
                labelZh: '肩松了，笑涌出来'
            },
            {
                id: 'surge',
                labelEn: 'The whole room surges, and you go with it',
                labelZh: '整间屋子涌起来'
            }
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
    assert.ok(
        result.failures.some(
            (f) =>
                f.includes('overlap') ||
                f.includes('crowd-mood') ||
                f.includes('room') ||
                f.includes('softens') ||
                f.includes('template')
        )
    );
});
