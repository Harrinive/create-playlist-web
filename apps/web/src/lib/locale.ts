import { MOTION_MS, prefersReducedMotion } from './motion';

export type Locale = 'en' | 'zh';

export const LOCALE_KEY = 'create-playlist-locale';

export type LocaleRelocalizer = (locale: Locale) => void;

export type ApplyLocaleOptions = {
    animate?: boolean;
    /** Runs while the shell is fully faded out, before fade-in. */
    onSwap?: () => void;
    onComplete?: () => void;
};

let localeTransitionTarget: Locale | null = null;
const relocalizers = new Set<LocaleRelocalizer>();

/**
 * Register dynamic UI relocalization. Handlers run at the fade midpoint whenever
 * the active locale changes (after static `[data-locale]` nodes swap).
 *
 * Prefer `createLocaleScope(signal).onRelocalize()` for page scripts that call
 * `readLocale()` inside render helpers. Use this directly when you track locale
 * in a local variable (e.g. interview wizard).
 */
export function onLocaleChange(handler: LocaleRelocalizer, signal?: AbortSignal): () => void {
    relocalizers.add(handler);
    const unregister = () => {
        relocalizers.delete(handler);
    };
    signal?.addEventListener('abort', unregister, { once: true });
    return unregister;
}

function emitLocaleChange(locale: Locale) {
    for (const handler of relocalizers) {
        handler(locale);
    }
}

/** Runs registered dynamic relocalizers. Normally invoked by applyLocaleToDocument. */
export function notifyLocaleRelocalizers(locale: Locale) {
    emitLocaleChange(locale);
}

export function isLocale(value: unknown): value is Locale {
    return value === 'en' || value === 'zh';
}

export function readLocale(): Locale {
    try {
        const stored = localStorage.getItem(LOCALE_KEY);
        if (isLocale(stored)) return stored;
    } catch {}
    return 'en';
}

export function readLocaleFromDocument(): Locale {
    return document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
}

export function writeLocale(locale: Locale) {
    try {
        localStorage.setItem(LOCALE_KEY, locale);
    } catch {}
}

/** Pick bilingual copy for the active locale. */
export function pickLocale<T>(copy: { en: T; zh: T }, locale: Locale): T {
    return locale === 'zh' ? copy.zh : copy.en;
}

function localeNodes(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-locale]'));
}

/** CSS hides wrong locale before JS; JS `hidden` syncs nodes injected mid-crossfade. */
export function syncLocaleNodes(locale: Locale = readLocale()) {
    localeNodes().forEach((node) => {
        node.hidden = node.dataset.locale !== locale;
    });
}

function applyLocaleInstant(locale: Locale) {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    syncLocaleNodes(locale);
    localeNodes().forEach((node) => {
        node.classList.remove('is-fading-out', 'appear-on-mount', 'panel-swap-target');
    });
}

function waitForLocaleShellFade(): Promise<void> {
    const shell = document.querySelector('.shell');
    if (!shell || prefersReducedMotion()) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };

        shell.addEventListener(
            'transitionend',
            (event) => {
                if (event.target === shell && event.propertyName === 'opacity') finish();
            },
            { once: true }
        );
        window.setTimeout(finish, MOTION_MS + 40);
    });
}

async function crossfadeLocale(to: Locale, onSwap?: () => void, onComplete?: () => void) {
    const root = document.documentElement;
    localeTransitionTarget = to;

    root.classList.add('is-locale-fading');
    await waitForLocaleShellFade();

    applyLocaleInstant(to);
    emitLocaleChange(to);
    onSwap?.();

    root.classList.remove('is-locale-fading');
    await waitForLocaleShellFade();

    localeTransitionTarget = null;
    onComplete?.();
}

export function applyLocaleToDocument(locale: Locale, options?: ApplyLocaleOptions) {
    const current = readLocaleFromDocument();

    if (localeTransitionTarget === locale) {
        return;
    }

    if (current === locale) {
        applyLocaleInstant(locale);
        options?.onComplete?.();
        return;
    }

    if (options?.animate && !prefersReducedMotion()) {
        void crossfadeLocale(locale, options.onSwap, options.onComplete);
        return;
    }

    localeTransitionTarget = null;
    applyLocaleInstant(locale);
    emitLocaleChange(locale);
    options?.onSwap?.();
    options?.onComplete?.();
}
