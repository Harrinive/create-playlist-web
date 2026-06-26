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

test('treats option count as hard failure', () => {
    const { hard } = partitionDeterministicFailures([
        'option count 3 outside 4–6 for m1'
    ]);
    assert.equal(hard.length, 1);
});

test('treats M4 too-* option id as hard failure', () => {
    const { hard, soft } = partitionDeterministicFailures([
        'M4 option id "too-sad" mood-template too-* — name trap cluster instead'
    ]);
    assert.equal(hard.length, 1);
    assert.equal(soft.length, 0);
});

test('treats stem-option duplication as hard failure', () => {
    const { hard } = partitionDeterministicFailures([
        'stemZh duplicates option "brochure-rack" — stem must ask/frame the turn, not repeat a chip verbatim'
    ]);
    assert.equal(hard.length, 1);
});
