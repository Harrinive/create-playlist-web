import assert from 'node:assert/strict';
import test from 'node:test';
import { turnPlanSchema } from '../shared.js';

const base = {
    gaps: [],
    reachableGenresNote: 'open',
    hypotheses: ['a', 'b'],
    plannedOptionCount: 4,
    axis: 'm1',
    sceneBeat: 'x',
    lateralHook: false,
    stemGuidance: 'g',
    optionGuidance: 'o',
    questionMode: 'SceneFeeling'
};

test('turn plan normalizes invented optionRole from Haiku-style plans', () => {
    const parsed = turnPlanSchema.parse({
        ...base,
        optionRole: 'emotional-stance-partition',
        m1StemMode: 'threshold-invite'
    });
    assert.equal(parsed.optionRole, 'place-partition');
});

test('turn plan drops invalid m1StemMode prose values', () => {
    const parsed = turnPlanSchema.parse({
        ...base,
        m1StemMode: 'none—M2 does not reset stem',
        optionRole: 'feeling-within-the-scene'
    });
    assert.equal(parsed.m1StemMode, undefined);
    assert.equal(parsed.optionRole, 'moment-in-scene');
});

test('turn plan defaults m1StemMode and optionRole when omitted', () => {
    const parsed = turnPlanSchema.parse({
        ...base,
        axis: 'm1'
    });
    assert.equal(parsed.m1StemMode, 'threshold-invite');
    assert.equal(parsed.optionRole, 'place-partition');
});

test('turn plan coerces null q1RegionsToCover to undefined', () => {
    const parsed = turnPlanSchema.parse({
        ...base,
        q1RegionsToCover: null
    });
    assert.equal(parsed.q1RegionsToCover, undefined);
});

test('turn plan fills missing required planner fields', () => {
    const parsed = turnPlanSchema.parse({
        gaps: [],
        reachableGenresNote: 'open',
        hypotheses: ['a', 'b'],
        plannedOptionCount: 4,
        questionMode: 'SceneFeeling'
    });
    assert.equal(parsed.lateralHook, false);
    assert.equal(parsed.stemGuidance, 'threshold invite + explicit ask');
    assert.equal(parsed.axis, 'scene partition');
});
