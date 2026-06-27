import { onLocaleChange, readLocale, type Locale } from './locale';

/**
 * Page-scoped helper for scripts that render dynamic copy with readLocale().
 * Handlers run on `runNow()` and whenever the user switches language
 * (while the shell is faded out, before fade-in).
 */
export function createLocaleScope(signal: AbortSignal) {
    const handlers: Array<(locale: Locale) => void> = [];

    onLocaleChange((locale) => {
        for (const handler of handlers) handler(locale);
    }, signal);

    return {
        onRelocalize(handler: (locale: Locale) => void) {
            handlers.push(handler);
        },
        /** Run all registered handlers once (call after wiring). */
        runNow() {
            const locale = readLocale();
            for (const handler of handlers) handler(locale);
        }
    };
}
