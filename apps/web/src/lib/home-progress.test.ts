import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHomeProgressActions } from './home-progress';
import {
    BUILD_RESULT_KEY,
    DRAFT_KEY,
    LAST_DELIVERY_KEY,
    PROMPT_READY_KEY,
    PROMPT_TEXT_KEY,
    SESSION_KEY
} from './session-keys';
import { normalizeSessionState } from './session-normalize';
import type { InterviewAnswers } from './types';

const store = new Map<string, string>();

function mockSessionStorage() {
    vi.stubGlobal('sessionStorage', {
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
        key: () => null,
        get length() {
            return store.size;
        }
    });
}

const validAnswers: InterviewAnswers = {
    m1: { id: 'a', label: 'A' },
    m2: { id: 'b', label: 'B' },
    m3: { id: 'c', label: 'C' },
    m4: [{ id: 'd', label: 'D' }],
    m5: { id: 'e', label: 'E' }
};

function seedPartialDraft(stepCount: number) {
    const draft: Record<string, unknown> = {};
    const ids = ['m1', 'm2', 'm3', 'm4', 'm5'] as const;
    for (let i = 0; i < stepCount; i += 1) {
        const stepId = ids[i];
        if (stepId === 'm4') {
            draft.m4 = [{ id: `opt-${i}`, label: `Opt ${i}` }];
        } else {
            draft[stepId] = { id: `opt-${i}`, label: `Opt ${i}` };
        }
    }
    store.set(DRAFT_KEY, JSON.stringify(draft));
}

describe('getHomeProgressActions', () => {
    beforeEach(() => {
        store.clear();
        mockSessionStorage();
    });

    it('empty session shows start only', () => {
        const actions = getHomeProgressActions();
        expect(actions.interviewLabel).toBe('start');
        expect(actions.showStartOver).toBe(false);
        expect(actions.lastOutput).toBeNull();
    });

    it('partial draft shows continue and start over', () => {
        seedPartialDraft(2);
        const actions = getHomeProgressActions();
        expect(actions.interviewLabel).toBe('continue');
        expect(actions.showStartOver).toBe(true);
        expect(actions.lastOutput).toBeNull();
    });

    it('complete draft shows continue without start over', () => {
        seedPartialDraft(5);
        const actions = getHomeProgressActions();
        expect(actions.interviewLabel).toBe('continue');
        expect(actions.showStartOver).toBe(false);
        expect(actions.lastOutput).toBeNull();
    });

    it('saved prompt text and answers show last output prompt', () => {
        store.set(SESSION_KEY, JSON.stringify(validAnswers));
        store.set(PROMPT_TEXT_KEY, 'A mellow evening playlist with warm guitars.');
        store.set(LAST_DELIVERY_KEY, 'prompt');
        const actions = getHomeProgressActions();
        expect(actions.lastOutput).toEqual({ href: '/prompt', kind: 'prompt' });
    });

    it('build snapshot takes priority over prompt', () => {
        store.set(SESSION_KEY, JSON.stringify(validAnswers));
        store.set(PROMPT_TEXT_KEY, 'Prompt text');
        store.set(
            BUILD_RESULT_KEY,
            JSON.stringify({
                playlistName: 'Test',
                playlistUrl: 'https://open.spotify.com/playlist/abc',
                trackCount: 20
            })
        );
        store.set(LAST_DELIVERY_KEY, 'build');
        const actions = getHomeProgressActions();
        expect(actions.lastOutput).toEqual({ href: '/build', kind: 'build' });
    });

    it('legacy prompt-ready flag without text does not show last output', () => {
        store.set(SESSION_KEY, JSON.stringify(validAnswers));
        store.set(PROMPT_READY_KEY, '1');
        store.set(LAST_DELIVERY_KEY, 'prompt');
        normalizeSessionState();
        const actions = getHomeProgressActions();
        expect(actions.lastOutput).toBeNull();
    });

    it('start interview and start over are mutually exclusive', () => {
        const cases: Array<() => void> = [
            () => {},
            () => seedPartialDraft(2),
            () => seedPartialDraft(5),
            () => {
                store.set(SESSION_KEY, JSON.stringify(validAnswers));
                store.set(PROMPT_TEXT_KEY, 'Saved prompt');
            }
        ];

        for (const seed of cases) {
            store.clear();
            seed();
            const actions = getHomeProgressActions();
            if (actions.interviewLabel === 'start') {
                expect(actions.showStartOver).toBe(false);
            }
        }
    });
});
