import { describe, expect, it } from 'vitest';
import { localizeApiError, localizeBuildError, localizeOAuthError } from './localized-errors';

describe('localizeApiError', () => {
    it('maps Failed to fetch in both locales', () => {
        expect(localizeApiError('Failed to fetch', 'en', 'interview')).toContain('reach');
        expect(localizeApiError('Failed to fetch', 'zh', 'interview')).toContain('无法连接');
    });

    it('maps known API errors', () => {
        expect(localizeApiError('Not authenticated', 'en', 'build')).toBe('Connect Spotify to continue.');
    });

    it('falls back for empty zh messages', () => {
        expect(localizeApiError('unknown server explosion', 'zh', 'prompt')).toContain('无法生成');
    });
});

describe('localizeBuildError', () => {
    it('reports OAuth connection success', () => {
        expect(localizeBuildError('connectionSuccess', 'en')).toContain('connected');
        expect(localizeBuildError('connectionSuccess', 'zh')).toContain('已连接');
    });
});

describe('localizeOAuthError', () => {
    it('maps access_denied', () => {
        expect(localizeOAuthError('access_denied', 'en')).toContain('declined');
    });
});
