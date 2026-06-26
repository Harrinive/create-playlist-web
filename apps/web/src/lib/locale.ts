import { MOTION_MS, prefersReducedMotion } from './motion';

export type Locale = 'en' | 'zh';

export const LOCALE_KEY = 'create-playlist-locale';

export type ApplyLocaleOptions = {
    animate?: boolean;
    /** Runs while the shell is fully faded out, before fade-in. */
    onSwap?: () => void;
    onComplete?: () => void;
};

let localeTransitionTarget: Locale | null = null;

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

function localeNodes(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-locale]'));
}

function applyLocaleInstant(locale: Locale) {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    localeNodes().forEach((node) => {
        const show = node.dataset.locale === locale;
        node.hidden = !show;
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
    options?.onSwap?.();
    options?.onComplete?.();
}
