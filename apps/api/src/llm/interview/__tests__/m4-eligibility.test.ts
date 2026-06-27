import assert from 'node:assert/strict';
import test from 'node:test';
import {
    computeEligibleTraps,
    countEligibleTraps,
    optionMatchesAnyDroppedTrap,
    resolveM4Gate,
    suggestDiscriminantKind
} from '../m4-eligibility.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import type { InterviewPlannerState } from '../../../types/interview-planner.js';

const neonKineticPrior: Partial<InterviewAnswers> = {
    m1: { id: 'neon-doorway', label: 'Neon doorway, shoulders brushing fast' },
    m2: { id: 'crowd-spills', label: 'The door opens, crowd spills out' },
    m3: { id: 'peel-corner', label: 'One person peels off for the corner' }
};

const neonPlanner: InterviewPlannerState = {
    version: 1,
    hypotheses: ['alt-r&b', 'electronic night', 'indie dance'],
    coverageRisk: false,
    m1RegionId: 'kinetic-high'
};

const carRainPrior: Partial<InterviewAnswers> = {
    m1: { id: 'car-rain', label: 'Car in the rain, windows fogged' },
    m2: { id: 'nostalgic', label: 'Nostalgic, watching wipers' },
    m3: { id: 'drifting', label: 'Drifting slow, not going anywhere yet' }
};

const carRainPlanner: InterviewPlannerState = {
    version: 1,
    hypotheses: ['indie folk', 'sad indie', 'ambient'],
    coverageRisk: false,
    m1RegionId: 'intimate-still'
};

const postPartyPrior: Partial<InterviewAnswers> = {
    m1: { id: 'kitchen-after', label: 'Kitchen after the party, cake on the counter' },
    m2: { id: 'quiet', label: 'Quiet relief, candle still lit' },
    m3: { id: 'stacking-plates', label: 'Stacking plates, chairs pushed back' }
};

test('neon kinetic path drops calm/acoustic/study/elevator traps', () => {
    const result = computeEligibleTraps(neonKineticPrior, neonPlanner);
    const droppedIds = result.droppedIds;

    assert.ok(droppedIds.includes('coffee-shop-template'));
    assert.ok(droppedIds.includes('lo-fi-study'));
    assert.ok(droppedIds.includes('elevator-muzak'));
    assert.ok(droppedIds.includes('grief-dirge'));

    assert.ok(!result.eligibleIds.includes('coffee-shop-template'));
    assert.ok(!result.eligibleIds.includes('lo-fi-study'));
});

test('neon kinetic path keeps hypothesis-relevant traps or triggers avoid mode', () => {
    const count = countEligibleTraps(neonKineticPrior, neonPlanner);
    assert.ok(count >= 4, `expected >=4 eligible traps, got ${count}`);

    const gate = resolveM4Gate(neonKineticPrior, neonPlanner);
    assert.equal(gate.m4Mode, 'avoid');
    assert.equal(gate.lastQuestionMode, 'avoid');
});

test('dropped trap detection matches option labels', () => {
    const { dropped } = computeEligibleTraps(neonKineticPrior, neonPlanner);
    const match = optionMatchesAnyDroppedTrap(
        'coffee-shop',
        'Skip coffee-shop acoustic',
        '避开咖啡馆木吉他模板',
        dropped
    );
    assert.ok(match);
    assert.equal(match?.id, 'coffee-shop-template');
});

test('car-rain nostalgic drift drops gym/party keeps sad-acoustic', () => {
    const result = computeEligibleTraps(carRainPrior, carRainPlanner);
    const droppedIds = result.droppedIds;

    assert.ok(droppedIds.includes('gym-hype'));
    assert.ok(droppedIds.includes('peak-club-banger'));
    assert.ok(result.eligibleIds.includes('sad-acoustic-cliche'));
});

test('post-party drops party/club avoids', () => {
    const result = computeEligibleTraps(postPartyPrior, { version: 1, hypotheses: [], coverageRisk: false });
    assert.ok(result.droppedIds.includes('peak-club-banger'));
});

test('discriminant fallback when fewer than 4 eligible traps', () => {
    // Very constrained context — many traps dropped
    const tightPrior: Partial<InterviewAnswers> = {
        m1: { id: 'solo-sleep', label: 'Solo in bed, quiet late night sleep' },
        m2: { id: 'calm', label: 'Calm peaceful tender wistful slow drift' },
        m3: { id: 'still', label: 'Still drifting slow barely moving' }
    };
    const gate = resolveM4Gate(tightPrior, {
        version: 1,
        hypotheses: ['ambient', 'classical'],
        coverageRisk: true,
        needsGrooveGrain: false
    });

    if (gate.eligibleTrapCount < 4) {
        assert.equal(gate.lastQuestionMode, 'discriminant');
        assert.ok(gate.m4Mode.startsWith('discriminant-'));
        assert.ok(gate.impliedAvoids.length > 0);
    }
});

test('suggestDiscriminantKind prefers 1b when groove grain needed', () => {
    const kind = suggestDiscriminantKind(neonKineticPrior, {
        ...neonPlanner,
        needsGrooveGrain: true,
        coverageRisk: true
    });
    assert.equal(kind, 'discriminant-1b');
});
