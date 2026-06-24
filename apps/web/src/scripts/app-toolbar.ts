import { applyLocaleToDocument, readLocale, writeLocale, type Locale } from '../lib/locale';
import {
    INTERVIEW_MODELS,
    interviewModelDescription,
    interviewModelLabel,
    readInterviewModel,
    saveInterviewModel
} from '../lib/interview-model';
import { clearRejectedQuestions } from '../lib/interview-refresh';
import { lastResultHref, readLastDelivery } from '../lib/last-delivery';
import { SESSION_KEY } from '../lib/types';

const DRAFT_KEY = `${SESSION_KEY}-draft`;

const LOCALE_OPTIONS: {
    id: Locale;
    labelEn: string;
    labelZh: string;
    descEn: string;
    descZh: string;
}[] = [
    {
        id: 'en',
        labelEn: 'English',
        labelZh: 'English',
        descEn: 'UI and interview in English',
        descZh: 'UI and interview in English'
    },
    {
        id: 'zh',
        labelEn: '中文',
        labelZh: '中文',
        descEn: 'Bilingual interview labels',
        descZh: '双语访谈界面'
    }
];

function localeOptionLabel(option: (typeof LOCALE_OPTIONS)[number], locale: Locale): string {
    return locale === 'zh' ? option.labelZh : option.labelEn;
}

function localeOptionDescription(option: (typeof LOCALE_OPTIONS)[number], locale: Locale): string {
    return locale === 'zh' ? option.descZh : option.descEn;
}

function setLocale(locale: Locale) {
    writeLocale(locale);
    applyLocaleToDocument(locale);
    updateLocaleLabel();
    refreshLocaleMenuLabels();
    updateInterviewModelLabel();
    refreshInterviewModelMenuLabels();
    updateLastResultLink();
    closeMobileToolbar();
    document.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
}

function closeMobileToolbar() {
    const toolbar = document.getElementById('app-toolbar');
    const toggle = document.getElementById('toolbar-menu-toggle');
    if (!toolbar || !toggle) return;
    toolbar.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
}

function toggleMobileToolbar() {
    const toolbar = document.getElementById('app-toolbar');
    const toggle = document.getElementById('toolbar-menu-toggle');
    if (!toolbar || !toggle) return;

    const open = !toolbar.classList.contains('is-open');
    if (open) {
        closeLocaleMenu();
        closeInterviewModelMenu();
        toolbar.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        return;
    }

    closeMobileToolbar();
}

function bindMobileToolbarMenu() {
    const toggle = document.getElementById('toolbar-menu-toggle');
    const toolbar = document.getElementById('app-toolbar');
    const sidebar = document.getElementById('site-sidebar');
    if (!toggle || !toolbar || toggle.dataset.bound === 'true') return;
    toggle.dataset.bound = 'true';

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleMobileToolbar();
    });

    document.addEventListener('click', (event) => {
        if (!toolbar.classList.contains('is-open')) return;
        const target = event.target as Node;
        if (sidebar?.contains(target)) return;
        closeMobileToolbar();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMobileToolbar();
    });

    toolbar.querySelectorAll('a.app-toolbar__btn, [data-start-over]').forEach((node) => {
        node.addEventListener('click', () => closeMobileToolbar());
    });
}

function startOver() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
        clearRejectedQuestions();
    } catch {}
    window.location.assign('/interview');
}

function updateLocaleLabel() {
    const labelEl = document.getElementById('locale-label');
    if (!labelEl) return;
    const locale = readLocale();
    const option = LOCALE_OPTIONS.find((item) => item.id === locale) ?? LOCALE_OPTIONS[0];
    labelEl.textContent = localeOptionLabel(option, locale);
}

function closeLocaleMenu() {
    const menu = document.getElementById('locale-menu');
    const trigger = document.getElementById('locale-trigger');
    if (!menu || !trigger) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
}

function openLocaleMenu() {
    closeInterviewModelMenu();
    const menu = document.getElementById('locale-menu');
    const trigger = document.getElementById('locale-trigger');
    if (!menu || !trigger) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
}

function toggleLocaleMenu() {
    const menu = document.getElementById('locale-menu');
    if (!menu) return;
    if (menu.hidden) openLocaleMenu();
    else closeLocaleMenu();
}

function refreshLocaleMenuLabels() {
    const menu = document.getElementById('locale-menu');
    if (!menu) return;
    const locale = readLocale();
    menu.querySelectorAll<HTMLElement>('[data-locale-id]').forEach((item) => {
        const option = LOCALE_OPTIONS.find((entry) => entry.id === item.dataset.localeId);
        if (!option) return;
        const label = item.querySelector('.toolbar-dropdown__option-label');
        const desc = item.querySelector('.toolbar-dropdown__option-desc');
        if (label) label.textContent = localeOptionLabel(option, locale);
        if (desc) desc.textContent = localeOptionDescription(option, locale);
    });
}

function renderLocaleMenu() {
    const menu = document.getElementById('locale-menu');
    if (!menu || menu.dataset.rendered === 'true') return;
    menu.dataset.rendered = 'true';

    const locale = readLocale();

    LOCALE_OPTIONS.forEach((option) => {
        const item = document.createElement('li');
        item.setAttribute('role', 'option');
        item.dataset.localeId = option.id;
        item.className = 'toolbar-dropdown__option';
        if (option.id === locale) {
            item.setAttribute('aria-selected', 'true');
            item.classList.add('is-selected');
        }

        item.innerHTML = `
            <span class="toolbar-dropdown__option-label">${localeOptionLabel(option, locale)}</span>
            <span class="toolbar-dropdown__option-desc">${localeOptionDescription(option, locale)}</span>
        `;

        item.addEventListener('click', () => {
            if (option.id === readLocale()) {
                closeLocaleMenu();
                return;
            }
            menu.querySelectorAll('[role="option"]').forEach((node) => {
                node.classList.remove('is-selected');
                node.setAttribute('aria-selected', 'false');
            });
            item.classList.add('is-selected');
            item.setAttribute('aria-selected', 'true');
            setLocale(option.id);
            closeLocaleMenu();
        });

        menu.appendChild(item);
    });
}

function bindLocaleDropdown() {
    const dropdown = document.getElementById('locale-dropdown');
    const trigger = document.getElementById('locale-trigger');
    if (!dropdown || !trigger || dropdown.dataset.bound === 'true') return;
    dropdown.dataset.bound = 'true';

    renderLocaleMenu();
    updateLocaleLabel();

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleLocaleMenu();
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target as Node)) closeLocaleMenu();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeLocaleMenu();
    });
}

function bindStartOver() {
    document.querySelectorAll<HTMLElement>('[data-start-over]').forEach((btn) => {
        if (btn.dataset.bound === 'true') return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', startOver);
    });
}

function updateInterviewModelLabel() {
    const labelEl = document.getElementById('interview-model-label');
    if (!labelEl) return;
    const locale = readLocale();
    const modelId = readInterviewModel();
    const option = INTERVIEW_MODELS.find((m) => m.id === modelId) ?? INTERVIEW_MODELS[0];
    labelEl.textContent = interviewModelLabel(option, locale);
}

function closeInterviewModelMenu() {
    const menu = document.getElementById('interview-model-menu');
    const trigger = document.getElementById('interview-model-trigger');
    if (!menu || !trigger) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
}

function openInterviewModelMenu() {
    closeLocaleMenu();
    const menu = document.getElementById('interview-model-menu');
    const trigger = document.getElementById('interview-model-trigger');
    if (!menu || !trigger) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
}

function toggleInterviewModelMenu() {
    const menu = document.getElementById('interview-model-menu');
    if (!menu) return;
    if (menu.hidden) openInterviewModelMenu();
    else closeInterviewModelMenu();
}

function refreshInterviewModelMenuLabels() {
    const menu = document.getElementById('interview-model-menu');
    if (!menu) return;
    const locale = readLocale();
    menu.querySelectorAll<HTMLElement>('[data-model-id]').forEach((item) => {
        const option = INTERVIEW_MODELS.find((m) => m.id === item.dataset.modelId);
        if (!option) return;
        const label = item.querySelector('.toolbar-dropdown__option-label');
        const desc = item.querySelector('.toolbar-dropdown__option-desc');
        if (label) label.textContent = interviewModelLabel(option, locale);
        if (desc) desc.textContent = interviewModelDescription(option, locale);
    });
}

function renderInterviewModelMenu() {
    const menu = document.getElementById('interview-model-menu');
    if (!menu || menu.dataset.rendered === 'true') return;
    menu.dataset.rendered = 'true';

    const locale = readLocale();
    const selectedId = readInterviewModel();

    INTERVIEW_MODELS.forEach((option) => {
        const item = document.createElement('li');
        item.setAttribute('role', 'option');
        item.dataset.modelId = option.id;
        item.className = 'toolbar-dropdown__option';
        if (option.id === selectedId) {
            item.setAttribute('aria-selected', 'true');
            item.classList.add('is-selected');
        }

        item.innerHTML = `
            <span class="toolbar-dropdown__option-label">${interviewModelLabel(option, locale)}</span>
            <span class="toolbar-dropdown__option-desc">${interviewModelDescription(option, locale)}</span>
        `;

        item.addEventListener('click', () => {
            if (option.id === readInterviewModel()) {
                closeInterviewModelMenu();
                return;
            }
            saveInterviewModel(option.id);
            menu.querySelectorAll('[role="option"]').forEach((node) => {
                node.classList.remove('is-selected');
                node.setAttribute('aria-selected', 'false');
            });
            item.classList.add('is-selected');
            item.setAttribute('aria-selected', 'true');
            updateInterviewModelLabel();
            closeInterviewModelMenu();
            closeMobileToolbar();
            document.dispatchEvent(
                new CustomEvent('interview-model-changed', { detail: { modelId: option.id } })
            );
        });

        menu.appendChild(item);
    });
}

function bindInterviewModelDropdown() {
    const dropdown = document.getElementById('interview-model-dropdown');
    const trigger = document.getElementById('interview-model-trigger');
    if (!dropdown || !trigger || dropdown.dataset.bound === 'true') return;
    dropdown.dataset.bound = 'true';

    renderInterviewModelMenu();
    updateInterviewModelLabel();

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleInterviewModelMenu();
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target as Node)) closeInterviewModelMenu();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeInterviewModelMenu();
    });
}

function updateLastResultLink() {
    const link = document.getElementById('last-result-link') as HTMLAnchorElement | null;
    if (!link) return;

    const delivery = readLastDelivery() ?? 'prompt';
    link.href = lastResultHref();

    link.querySelectorAll('[data-last-label]').forEach((node) => {
        const el = node as HTMLElement;
        el.hidden = el.dataset.lastLabel !== delivery;
    });
}

let lastDeliveryListenerBound = false;

export function initAppToolbar() {
    const locale = readLocale();
    applyLocaleToDocument(locale);
    bindLocaleDropdown();
    updateLocaleLabel();
    bindMobileToolbarMenu();
    bindStartOver();
    bindInterviewModelDropdown();
    updateLastResultLink();

    if (!lastDeliveryListenerBound) {
        lastDeliveryListenerBound = true;
        document.addEventListener('last-delivery-changed', updateLastResultLink);
    }
}

initAppToolbar();
document.addEventListener('astro:page-load', initAppToolbar);

export {};
