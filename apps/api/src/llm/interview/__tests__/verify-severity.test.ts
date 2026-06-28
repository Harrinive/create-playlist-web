import assert from 'node:assert/strict';
import test from 'node:test';
import { partitionDeterministicFailures } from '../verify-severity.js';

test('treats all deterministic failures as hard', () => {
    const { hard, soft } = partitionDeterministicFailures([
        'options inconsistent with prior answers — no overlap with established scene (keys, coffee)',
        'option count 3 outside 4–6 for m1',
        'Q1 missing kinetic/crowd option in labels'
    ]);
    assert.equal(hard.length, 3);
    assert.equal(soft.length, 0);
});

test('treats Q1 checklist failures as hard', () => {
    const { hard } = partitionDeterministicFailures([
        'Q1 option "booth" tagged kinetic-high but label lacks kinetic/crowd register'
    ]);
    assert.equal(hard.length, 1);
});
