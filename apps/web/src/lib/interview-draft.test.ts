import { describe, expect, it } from 'vitest';
import {
    buildPriorAnswersBeforeStep,
    clearAnswersFromIndex,
    countCompletedSteps,
    hasOrphanDraftAnswers,
    multiSelectionMatches,
    optionMatchesAnswer,
    type Draft
} from './interview-draft';
import { upsertLlmStepForTest } from './interview-llm-cache';
import type { BilingualInterviewStep } from './interview-i18n';

const sampleStep = (id: string): BilingualInterviewStep => ({
    id: 'm1',
    dimension: { en: 'Scene', zh: '场景' },
    stem: { en: 'Stem', zh: '题干' },
    multi: false,
    options: [{ id, label: { en: 'opt', zh: '选项' } }]
});

describe('countCompletedSteps', () => {
    it('counts consecutive answers from m1', () => {
        const draft: Draft = {
            m1: { id: 'a', label: 'A' },
            m2: { id: 'b', label: 'B' }
        };
        expect(countCompletedSteps(draft)).toBe(2);
    });

    it('stops at first gap', () => {
        const draft: Draft = {
            m2: { id: 'b', label: 'B' }
        };
        expect(countCompletedSteps(draft)).toBe(0);
    });

    it('requires option id for single-select steps', () => {
        const draft: Draft = {
            m1: { id: '', label: 'no id' }
        };
        expect(countCompletedSteps(draft)).toBe(0);
    });

    it('requires ids on m4 selections', () => {
        const draft: Draft = {
            m1: { id: 'a', label: 'A' },
            m2: { id: 'b', label: 'B' },
            m3: { id: 'c', label: 'C' },
            m5: { id: 'e', label: 'E' },
            m4: [{ id: '', label: 'bad' }]
        };
        expect(countCompletedSteps(draft)).toBe(4);
    });
});

describe('buildPriorAnswersBeforeStep', () => {
    it('excludes the current step answer', () => {
        const draft: Draft = {
            m1: { id: 'a', label: 'A' },
            m2: { id: 'b', label: 'B' }
        };
        expect(buildPriorAnswersBeforeStep(draft, 0)).toEqual({});
        expect(buildPriorAnswersBeforeStep(draft, 1)).toEqual({ m1: draft.m1 });
        expect(buildPriorAnswersBeforeStep(draft, 2)).toEqual({ m1: draft.m1, m2: draft.m2 });
    });
});

describe('clearAnswersFromIndex', () => {
    it('clears from index onward', () => {
        const draft: Draft = {
            m1: { id: 'a', label: 'A' },
            m2: { id: 'b', label: 'B' },
            m3: { id: 'c', label: 'C' }
        };
        clearAnswersFromIndex(draft, 1);
        expect(draft.m1).toBeDefined();
        expect(draft.m2).toBeUndefined();
        expect(draft.m3).toBeUndefined();
    });
});

describe('hasOrphanDraftAnswers', () => {
    it('detects non-prefix answers', () => {
        expect(hasOrphanDraftAnswers({ m2: { id: 'b', label: 'B' } })).toBe(true);
        expect(hasOrphanDraftAnswers({ m1: { id: 'a', label: 'A' } })).toBe(false);
    });
});

describe('optionMatchesAnswer', () => {
    it('matches by id', () => {
        expect(
            optionMatchesAnswer(
                { id: 'x', label: 'One' },
                { id: 'x', label: 'Other label' },
                'en'
            )
        ).toBe(true);
    });

    it('falls back to combined label', () => {
        expect(
            optionMatchesAnswer(
                { id: 'new', label: 'Rain', gloss: 'soft' },
                { id: 'old', label: 'Rain (soft)' },
                'en'
            )
        ).toBe(true);
    });
});

describe('multiSelectionMatches', () => {
    it('maps stored answers to current option ids', () => {
        const options = [
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' }
        ];
        const selected = [{ id: 'legacy', label: 'Beta' }];
        const ids = multiSelectionMatches(options, selected, 'en');
        expect(ids.has('b')).toBe(true);
    });
});

describe('upsertLlmStepForTest', () => {
    it('does not duplicate the step into filler indices', () => {
        const stepAt2 = sampleStep('two');
        const result = upsertLlmStepForTest([], 2, stepAt2);
        expect(result.length).toBe(3);
        expect(result[0]).toBeUndefined();
        expect(result[1]).toBeUndefined();
        expect(result[2]).toBe(stepAt2);
    });
});
