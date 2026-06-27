import { describe, expect, it } from 'vitest';
import { pickSequenceIntent } from './build-copy';

describe('pickSequenceIntent', () => {
    const intent = {
        en: 'Opens sparse, then tightens.',
        zh: '开场稀疏，随后收紧。'
    };

    it('returns Chinese in zh locale', () => {
        expect(pickSequenceIntent('zh', intent)).toBe('开场稀疏，随后收紧。');
    });

    it('returns English in en locale', () => {
        expect(pickSequenceIntent('en', intent)).toBe('Opens sparse, then tightens.');
    });

    it('falls back to English when zh is missing', () => {
        expect(pickSequenceIntent('zh', { en: 'English only.', zh: '' })).toBe('English only.');
    });

    it('accepts legacy string-only intent', () => {
        expect(pickSequenceIntent('en', 'Legacy arc.')).toBe('Legacy arc.');
    });
});
