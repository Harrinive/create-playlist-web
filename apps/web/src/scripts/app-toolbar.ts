import { applyLocaleToDocument, readLocale, writeLocale, type Locale } from '../lib/locale';
import { SESSION_KEY } from '../lib/types';

const DRAFT_KEY = `${SESSION_KEY}-draft`;

function updateLocaleButtons(locale: Locale) {
    document.querySelectorAll<HTMLButtonElement>('[data-locale-btn]').forEach((btn) => {
        const active = btn.dataset.localeBtn === locale;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function setLocale(locale: Locale) {
    writeLocale(locale);
    applyLocaleToDocument(locale);
    updateLocaleButtons(locale);
    document.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
}

function startOver() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    window.location.assign('/interview');
}

function bindLocaleButtons() {
    document.querySelectorAll<HTMLButtonElement>('[data-locale-btn]').forEach((btn) => {
        if (btn.dataset.bound === 'true') return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => {
            const next = btn.dataset.localeBtn;
            if (next === 'en' || next === 'zh') setLocale(next);
        });
    });
}

function bindStartOver() {
    document.querySelectorAll<HTMLElement>('[data-start-over]').forEach((btn) => {
        if (btn.dataset.bound === 'true') return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', startOver);
    });
}

export function initAppToolbar() {
    const locale = readLocale();
    applyLocaleToDocument(locale);
    updateLocaleButtons(locale);
    bindLocaleButtons();
    bindStartOver();
}

initAppToolbar();
document.addEventListener('astro:page-load', initAppToolbar);

export {};
