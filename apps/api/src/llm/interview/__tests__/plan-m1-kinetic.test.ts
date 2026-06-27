import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureM1KineticCoverage } from '../plan.js';
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

test('ensureM1KineticCoverage adds kinetic-high when planner omitted it', () => {
    const next = ensureM1KineticCoverage(basePlan);
    const regions = Object.values(next.optionSlots).map((slot) => slot.regionId);
    assert.ok(regions.includes('kinetic-high'));
});

test('ensureM1KineticCoverage is a no-op when kinetic already present', () => {
    const withKinetic: TurnPlan = {
        ...basePlan,
        optionSlots: {
            ...basePlan.optionSlots,
            party: { regionId: 'kinetic-high' }
        }
    };
    assert.deepEqual(ensureM1KineticCoverage(withKinetic), withKinetic);
});

test('Q1 verify accepts kinetic crowd labels when optionSlots lack kinetic tags', () => {
    const plan: TurnPlan = {
        ...basePlan,
        plannedOptionIds: ['quiet', 'club'],
        optionSlots: {
            quiet: { regionId: 'intimate-still' },
            club: { regionId: 'social-mid' }
        }
    };
    const draft: LlmStepDraft = {
        stemEn: 'Pick a still — where are you right now? The hallway is still warm from everyone leaving.',
        stemZh: '选一处画面——你此刻在哪里？走廊还留着人群散去后的热气。',
        options: [
            { id: 'quiet', labelEn: 'Empty cups, lamp still on', labelZh: '空杯子，灯还亮着' },
            { id: 'club', labelEn: 'Packed dance floor, bodies moving', labelZh: '挤满的舞池，人群在动' }
        ]
    };
    const result = verifyDeterministic({
        stepId: 'm1',
        plan,
        draft,
        optionMin: 2,
        optionMax: 6
    });
    assert.equal(result.passed, true);
});
