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
                labelEn: 'Skip sad acoustic cliché',
                labelZh: '避开伤感木吉他套路'
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

test('fails M4 option without plain trap language', () => {
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
    assert.ok(result.failures.some((f) => f.includes('plain trap language')));
});

test('fails M1 option gloss', () => {
    const plan: TurnPlan = {
        ...basePlan,
        questionMode: 'SceneFeeling',
        optionSlots: {},
        plannedOptionIds: []
    };
    const draft: LlmStepDraft = {
        stemEn: 'Night air — pick the still that feels like you.',
        stemZh: '夜气里——选一个最像你的画面。',
        options: [
            {
                id: 'kitchen',
                labelEn: 'Quiet kitchen, one lamp on',
                labelZh: '安静的厨房，只剩一盏灯',
                glossEn: 'intimate still register',
                glossZh: '私密静止的调性'
            },
            {
                id: 'rooftop',
                labelEn: 'Neon rooftop, wind on the rail',
                labelZh: '霓虹天台，风过栏杆'
            }
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm1',
        plan,
        draft,
        optionMin: 2,
        optionMax: 6
    });
    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.includes('must not use gloss')));
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
                labelEn: 'Heel on the step, even pulse',
                labelZh: '脚跟点阶，均匀拍点'
            },
            {
                id: 'sway',
                labelEn: 'Weight shifting, loose sway',
                labelZh: '重心左右移，松摆'
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

test('fails when stem duplicates an option chip (production M2 bug)', () => {
    const draft: LlmStepDraft = {
        stemEn: 'A guard turns the brochure rack',
        stemZh: '保安翻动宣传架',
        options: [
            { id: 'glass-corner', labelEn: 'You stop by a glass corner', labelZh: '你停在玻璃转角' },
            {
                id: 'brochure-rack',
                labelEn: 'A guard turns the brochure rack',
                labelZh: '保安翻动宣传架'
            },
            { id: 'blue-bench', labelEn: 'One bench under blue light', labelZh: '蓝光下的一张长椅' }
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
    assert.ok(result.failures.some((f) => f.includes('stemEn duplicates option')));
    assert.ok(result.failures.some((f) => f.includes('stemZh duplicates option')));
});

test('fails M4 avoid option matching dropped trap on kinetic path', () => {
    const plan: TurnPlan = {
        ...basePlan,
        questionMode: 'ClearDiscriminant',
        optionSlots: {},
        plannedOptionIds: []
    };
    const draft: LlmStepDraft = {
        stemEn: 'The door swings open — what should this NOT sound like?',
        stemZh: '门一开——这配乐最不该像什么？',
        options: [
            {
                id: 'coffee-shop',
                labelEn: 'Skip coffee-shop acoustic',
                labelZh: '别要咖啡馆木吉他'
            },
            {
                id: 'trailer-swell',
                labelEn: 'Skip trailer swell',
                labelZh: '别要预告片大起势'
            },
            {
                id: 'hyperpop',
                labelEn: 'Skip hyperpop sheen',
                labelZh: '别要 glossy hyperpop'
            },
            { id: 'none', labelEn: "None — I'm open", labelZh: '都可以' }
        ]
    };
    const priorAnswers = {
        m1: { id: 'neon', label: 'Neon doorway, shoulders brushing fast' },
        m2: { id: 'crowd', label: 'The door opens, crowd spills out' },
        m3: { id: 'corner', label: 'One person peels off for the corner' }
    };
    const result = verifyDeterministic({
        stepId: 'm4',
        plan,
        draft,
        optionMin: 2,
        optionMax: 6,
        priorAnswers,
        planner: { version: 1, hypotheses: [], coverageRisk: false, m1RegionId: 'kinetic-high' }
    });
    assert.equal(result.passed, false);
    assert.ok(
        result.failures.some((f) => f.includes('coffee-shop-template') || f.includes('dropped trap'))
    );
});

test('fails M4 avoid stemZh with 变成 framing', () => {
    const plan: TurnPlan = {
        ...basePlan,
        questionMode: 'ClearDiscriminant',
        optionSlots: {},
        plannedOptionIds: ['gym-hype', 'none']
    };
    const draft: LlmStepDraft = {
        stemEn: 'Voices bounce off concrete — what should the soundtrack not turn into?',
        stemZh: '声音在水泥墙间来回弹着——这配乐最不该变成什么？',
        options: [
            {
                id: 'gym-hype',
                labelEn: 'Skip gym hype and workout playlists',
                labelZh: '避开健身打鸡血和运动歌单'
            },
            { id: 'none', labelEn: 'None', labelZh: '都可以' }
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
    assert.ok(result.failures.some((f) => f.includes('变成')));
});

test('fails M4 discriminant with parallel 感 labelZh chips', () => {
    const plan: TurnPlan = {
        ...basePlan,
        questionMode: 'PositiveDiscriminant',
        optionSlots: {},
        plannedOptionIds: ['a', 'b', 'c', 'd']
    };
    const draft: LlmStepDraft = {
        stemEn: 'Lying awake — which groove feels closest?',
        stemZh: '还醒着——哪一下节拍最像你？',
        options: [
            { id: 'a', labelEn: 'Barely-there sway', labelZh: '轻轻摇晃感' },
            { id: 'b', labelEn: 'Soft steady pulse', labelZh: '柔和脉动感' },
            { id: 'c', labelEn: 'Warm low-end weight', labelZh: '暖暖低频厚感' },
            { id: 'd', labelEn: 'Airy open room', labelZh: '空气感更开阔' }
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
    assert.ok(result.failures.some((f) => f.includes('…感')));
});

test('fails M4 discriminant with none option', () => {
    const plan: TurnPlan = {
        ...basePlan,
        questionMode: 'PositiveDiscriminant'
    };
    const draft: LlmStepDraft = {
        stemEn: 'At the open door — which beat feels most like you?',
        stemZh: '门一开——哪一下最像你？',
        options: [
            { id: 'steady', labelEn: 'Steady pulse under the sign', labelZh: '招牌下稳定的脉动' },
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
    assert.ok(result.failures.some((f) => f.includes('must not include id "none"')));
});

test('fails M1 when hint paraphrases stem ask', () => {
    const plan: TurnPlan = {
        ...basePlan,
        plannedOptionCount: 4,
        questionMode: 'SceneFeeling',
        optionSlots: {},
        plannedOptionIds: ['a', 'b', 'c', 'd']
    };
    const draft: LlmStepDraft = {
        stemEn: 'Rain beads on the window, a door half open. Step into the still that feels like home.',
        stemZh: '雨点挂在玻璃上，门半掩着。走进那一幕，选你像在的地方。',
        hintEn: 'Pick the place you can see yourself in.',
        hintZh: '选一处你能一下走进去的地方。',
        options: [
            { id: 'a', labelEn: 'One chair, rain on glass', labelZh: '一把椅子，雨敲玻璃' },
            { id: 'b', labelEn: 'Late platform, blue signs', labelZh: '蓝色站牌下的月台' },
            { id: 'c', labelEn: 'Kitchen counter, one lamp', labelZh: '厨房台面，一盏灯' },
            { id: 'd', labelEn: 'Bus seat under neon', labelZh: '霓虹下的公交座位' }
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
    assert.ok(result.failures.some((f) => f.includes('hint paraphrases stem ask')));
});

test('allows scene-only M1 stem with plain task hint', () => {
    const plan: TurnPlan = {
        ...basePlan,
        plannedOptionCount: 4,
        questionMode: 'SceneFeeling',
        optionSlots: {},
        plannedOptionIds: ['a', 'b', 'c', 'd']
    };
    const draft: LlmStepDraft = {
        stemEn: 'Rain beads on the window glass; a door stands half open.',
        stemZh: '雨点挂在玻璃上，门半掩着。',
        hintEn: 'Pick one place you can step into.',
        hintZh: '选一处你能走进去的场景。',
        options: [
            { id: 'a', labelEn: 'One chair, rain on glass', labelZh: '一把椅子，雨敲玻璃' },
            { id: 'b', labelEn: 'Late platform, blue signs', labelZh: '蓝色站牌下的月台' },
            { id: 'c', labelEn: 'Kitchen counter, one lamp', labelZh: '厨房台面，一盏灯' },
            { id: 'd', labelEn: 'Bus seat under neon', labelZh: '霓虹下的公交座位' }
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm1',
        plan,
        draft,
        optionMin: 4,
        optionMax: 6
    });
    assert.ok(!result.failures.some((f) => f.includes('hint paraphrases stem ask')));
});
