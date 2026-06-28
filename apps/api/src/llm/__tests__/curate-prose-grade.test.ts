import assert from 'node:assert/strict';
import test from 'node:test';
import { gradeCurateProse } from '../curate-prose-grade.js';
import type { CompactBrief } from '../../types/interview.js';

const BRIEF: CompactBrief = {
    anchor: 'sitting in the back seat while rain streaks the windows',
    emotion: 'wistful with a little unfinished feeling',
    pace: 'very slow and soft',
    sonic: 'close acoustic guitar with room around them',
    flow: 'fade to still',
    reject: ['clubby or EDM with big drops'],
    seeds: 'none',
    story: 'Rain beads on the glass while you sit in the back seat, unhurried.'
};

test('gradeCurateProse PASS on good supervisor prose', () => {
    const verdict = gradeCurateProse('fixture-good', BRIEF, {
        sequenceIntent: {
            en: 'Rain streaks the glass as the list opens in hollow hush. Close strings breathe in slow warmth. The arc gathers softly, then exhales into still.',
            zh: '雨点打在玻璃上，序列从静默里展开。弦音贴得很近，慢慢暖起来，最后轻轻收住。'
        },
        playlistMetadata: {
            en: {
                name: 'Back seat, rain on glass — room around the strings',
                description:
                    'Rain streaks the back-seat glass; the city blurs outside. The music stays unhurried and close, breathing through soft strings before it slowly gathers warmth.'
            },
            zh: {
                name: '雨夜后座 — 弦与留白',
                description: '雨点打在后座玻璃上，音乐贴得很近，在留白里慢慢暖起来。'
            }
        }
    });

    assert.equal(verdict.pass, true);
    assert.equal(verdict.blocking.length, 0);
});

test('gradeCurateProse FAIL on explicit reject in listen arc', () => {
    const verdict = gradeCurateProse('fixture-bad-reject', BRIEF, {
        sequenceIntent: {
            en: 'A slow arc through acoustic space. Please avoid club energy throughout.',
            zh: ''
        },
        playlistMetadata: {
            en: {
                name: 'Rain seat — close strings',
                description: 'Rain on the glass; close acoustic warmth throughout the list.'
            },
            zh: { name: '', description: '' }
        }
    });

    assert.equal(verdict.pass, false);
    assert.ok(verdict.blocking.some((i) => i.code === 'explicit_reject'));
});

test('gradeCurateProse FAIL on template-shaped description', () => {
    const verdict = gradeCurateProse('fixture-bad-template', BRIEF, {
        sequenceIntent: {
            en: 'Rain opens the list in close acoustic hush. Warmth gathers slowly across the arc.',
            zh: ''
        },
        playlistMetadata: {
            en: {
                name: 'Rain car — acoustic',
                description:
                    'A playlist for sitting in the back seat. Feels wistful, very slow, built from close acoustic guitar.'
            },
            zh: { name: '', description: '' }
        }
    });

    assert.equal(verdict.pass, false);
    assert.ok(verdict.blocking.some((i) => i.code === 'template_shape'));
});
