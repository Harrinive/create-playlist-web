import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyLocaleRelocalizers, onLocaleChange } from './locale';

describe('locale relocalizers', () => {
    const cleanups: Array<() => void> = [];

    afterEach(() => {
        cleanups.splice(0).forEach((cleanup) => cleanup());
    });

    it('notifies handlers when locale changes', () => {
        const handler = vi.fn();
        cleanups.push(onLocaleChange(handler));

        notifyLocaleRelocalizers('zh');

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith('zh');
    });

    it('notifies multiple handlers in registration order', () => {
        const calls: string[] = [];
        cleanups.push(onLocaleChange(() => calls.push('first')));
        cleanups.push(onLocaleChange(() => calls.push('second')));

        notifyLocaleRelocalizers('en');

        expect(calls).toEqual(['first', 'second']);
    });

    it('unregisters when AbortSignal aborts', () => {
        const controller = new AbortController();
        const handler = vi.fn();
        cleanups.push(onLocaleChange(handler, controller.signal));

        controller.abort();
        notifyLocaleRelocalizers('zh');

        expect(handler).not.toHaveBeenCalled();
    });

    it('returns an explicit unregister function', () => {
        const handler = vi.fn();
        const unregister = onLocaleChange(handler);

        unregister();
        notifyLocaleRelocalizers('zh');

        expect(handler).not.toHaveBeenCalled();
    });
});
