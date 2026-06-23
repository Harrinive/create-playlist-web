export type Locale = 'en' | 'zh';

export const LOCALE_KEY = 'create-playlist-locale';

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

export function writeLocale(locale: Locale) {
    try {
        localStorage.setItem(LOCALE_KEY, locale);
    } catch {}
}

export function applyLocaleToDocument(locale: Locale) {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll<HTMLElement>('[data-locale]').forEach((node) => {
        const show = node.dataset.locale === locale;
        node.hidden = !show;
    });
}
