const THEME_KEY = 'theme';
const THEME_MODE_KEY = 'theme-mode';

type Theme = 'light' | 'dark';
type ThemeMode = Theme | 'system';

const root = document.documentElement;
const themeBtn = document.getElementById('theme-toggle');
const colorSchemeMq = window.matchMedia('(prefers-color-scheme: dark)');

const isTheme = (value: string | null): value is Theme => value === 'light' || value === 'dark';
const isThemeMode = (value: string | null): value is ThemeMode =>
    value === 'system' || isTheme(value);

const getSystemTheme = (): Theme => (colorSchemeMq.matches ? 'dark' : 'light');
const resolveTheme = (mode: ThemeMode): Theme => (mode === 'system' ? getSystemTheme() : mode);

const readThemeMode = (): ThemeMode => {
    try {
        const storedMode = localStorage.getItem(THEME_MODE_KEY);
        if (isThemeMode(storedMode)) return storedMode;
        const legacyTheme = localStorage.getItem(THEME_KEY);
        if (isTheme(legacyTheme)) return legacyTheme;
    } catch {}
    return 'system';
};

const writeThemeMode = (mode: ThemeMode) => {
    try {
        localStorage.setItem(THEME_MODE_KEY, mode);
        if (mode === 'system') localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, mode);
    } catch {}
};

const getNextThemeMode = (mode: ThemeMode): ThemeMode => {
    if (mode === 'system') return 'light';
    if (mode === 'light') return 'dark';
    return 'system';
};

const getLocale = (): 'en' | 'zh' =>
    document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';

const getThemeModeLabel = (mode: ThemeMode, theme: Theme): string => {
    const zh = getLocale() === 'zh';
    if (mode === 'system') {
        return zh
            ? `跟随系统（${theme === 'dark' ? '深色' : '浅色'}）`
            : `System (${theme === 'dark' ? 'dark' : 'light'})`;
    }
    if (zh) return theme === 'dark' ? '深色模式' : '浅色模式';
    return theme === 'dark' ? 'Dark mode' : 'Light mode';
};

let activeThemeMode: ThemeMode = readThemeMode();

const applyTheme = (theme: Theme, mode: ThemeMode = activeThemeMode) => {
    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    if (!themeBtn) return;
    const dark = theme === 'dark';
    themeBtn.setAttribute('aria-pressed', mode === 'system' ? 'mixed' : dark ? 'true' : 'false');
    const label = getThemeModeLabel(mode, theme);
    themeBtn.setAttribute('aria-label', label);
    themeBtn.setAttribute('data-tooltip', label);
};

const setThemeMode = (mode: ThemeMode, persist = true) => {
    activeThemeMode = mode;
    applyTheme(resolveTheme(mode), mode);
    if (persist) writeThemeMode(mode);
};

let systemListenerBound = false;

const initTheme = () => {
    setThemeMode(activeThemeMode, false);
    if (themeBtn && themeBtn.dataset.bound !== 'true') {
        themeBtn.dataset.bound = 'true';
        themeBtn.addEventListener('click', () => setThemeMode(getNextThemeMode(activeThemeMode)));
    }
    if (!systemListenerBound) {
        systemListenerBound = true;
        colorSchemeMq.addEventListener?.('change', () => {
            if (activeThemeMode === 'system') setThemeMode('system', false);
        });
    }
};

const bootTheme = () => {
    initTheme();
};

document.addEventListener('astro:page-load', bootTheme);
document.addEventListener('locale-changed', () => applyTheme(resolveTheme(activeThemeMode), activeThemeMode));

export {};
