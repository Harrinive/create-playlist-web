import assert from 'node:assert/strict';
import test from 'node:test';
import { partitionDeterministicFailures } from '../verify-severity.js';

test('treats scene continuity as soft failure', () => {
    const { hard, soft } = partitionDeterministicFailures([
        'options inconsistent with prior answers — no overlap with established scene (keys, coffee)'
    ]);
    assert.equal(hard.length, 0);
    assert.equal(soft.length, 1);
});

test('treats Q1 kinetic label missing as hard failure', () => {
    const { hard, soft } = partitionDeterministicFailures([
        'Q1 missing kinetic/crowd option in labels — include ≥1 chip with body energy or crowd register (club, dance floor, party peak, parade, etc.)'
    ]);
    assert.equal(hard.length, 1);
    assert.equal(soft.length, 0);
});

test('treats option overlap as soft failure', () => {
    const { hard, soft } = partitionDeterministicFailures([
        'options "a" and "b" overlap on "platform" — distinct story beats required'
    ]);
    assert.equal(hard.length, 0);
    assert.equal(soft.length, 1);
});
