import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocaleScope } from './locale-scope';
import { notifyLocaleRelocalizers } from './locale';

describe('createLocaleScope', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('runNow invokes registered handlers with read locale', () => {
        const controller = new AbortController();
        const scope = createLocaleScope(controller.signal);
        const handler = vi.fn();
        scope.onRelocalize(handler);

        scope.runNow();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith('en');
    });

    it('forwards locale on notifyLocaleRelocalizers', () => {
        const controller = new AbortController();
        const scope = createLocaleScope(controller.signal);
        const handler = vi.fn();
        scope.onRelocalize(handler);

        notifyLocaleRelocalizers('zh');

        expect(handler).toHaveBeenCalledWith('zh');
    });

    it('stops notifying after abort', () => {
        const controller = new AbortController();
        const scope = createLocaleScope(controller.signal);
        const handler = vi.fn();
        scope.onRelocalize(handler);

        controller.abort();
        notifyLocaleRelocalizers('zh');

        expect(handler).not.toHaveBeenCalled();
    });
});
