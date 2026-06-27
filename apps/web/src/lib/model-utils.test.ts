import { describe, expect, it } from 'vitest';
import { sameModelIds } from './model-utils';

describe('sameModelIds', () => {
    it('returns true when ids match in order', () => {
        expect(
            sameModelIds([{ id: 'a' }, { id: 'b' }], [{ id: 'a' }, { id: 'b' }])
        ).toBe(true);
    });

    it('returns false when lengths differ', () => {
        expect(sameModelIds([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }])).toBe(false);
    });

    it('returns false when order differs', () => {
        expect(sameModelIds([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }])).toBe(false);
    });
});
