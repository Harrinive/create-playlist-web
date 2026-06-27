import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCompactBrief } from '../brief.js';
import type { InterviewAnswers } from '../types/interview.js';

const baseAnswers: InterviewAnswers = {
    m1: { id: 'neon', label: 'Neon doorway' },
    m2: { id: 'crowd', label: 'Crowd spills out' },
    m3: { id: 'corner', label: 'Peels for the corner' },
    m4: [{ id: 'trailer-swell', label: 'Skip trailer swell' }]
};

test('buildCompactBrief merges implied avoids from planner', () => {
    const brief = buildCompactBrief(baseAnswers, undefined, undefined, {
        plannerState: {
            version: 1,
            hypotheses: [],
            coverageRisk: false,
            impliedAvoids: ['coffee-shop acoustic templates', 'generic lo-fi study loops']
        }
    });
    assert.ok(brief.reject.some((r) => r.includes('trailer') || r.includes('Skip trailer')));
    assert.ok(brief.reject.some((r) => r.includes('coffee-shop')));
    assert.ok(brief.reject.some((r) => r.includes('lo-fi')));
});

test('buildCompactBrief uses discriminant 1b pick as sonic floor', () => {
    const answers: InterviewAnswers = {
        ...baseAnswers,
        m4: [{ id: 'dusty-pocket', label: 'Dusty pocket, mellow low end' }]
    };
    const brief = buildCompactBrief(answers, undefined, undefined, {
        plannerState: {
            version: 1,
            hypotheses: [],
            coverageRisk: false,
            m4Mode: 'discriminant-1b'
        }
    });
    assert.equal(brief.sonic, 'Dusty pocket, mellow low end');
    assert.equal(brief.reject.length, 0);
});
