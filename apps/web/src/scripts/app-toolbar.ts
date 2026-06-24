import { applyLocaleToDocument, readLocale, writeLocale, type Locale } from '../lib/locale';
import {
    loadInterviewModels,
    interviewModelLabel,
    readInterviewModel,
    saveInterviewModel,
    pickInterviewModelOption,
    type InterviewModelOption
} from '../lib/interview-model';
import {
    INTERVIEW_ALGORITHM_MODES,
    algorithmModeDescription,
    algorithmModeLabel,
    readInterviewAlgorithmMode,
    saveInterviewAlgorithmMode
} from '../lib/interview-algorithm-mode';
import { clearRejectedQuestions } from '../lib/interview-refresh';
import { clearLlmSteps } from '../lib/interview-llm-cache';
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
    updateInterviewModelLabel(interviewModelCatalog);
    refreshInterviewModelMenuLabels(interviewModelCatalog);
    updateInterviewAlgorithmLabel();
    refreshInterviewAlgorithmMenuLabels();
    updateLastResultLink();
    closeMobileToolbar();
    document.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
}

/** Keep in sync with --layout-shell-max-inline-size (1100px) in global.css */
function isCompactToolbar(): boolean {
    return window.matchMedia('(max-width: 1100px)').matches;
}

function syncToolbarPanelVisibility() {
    const panel = document.getElementById('app-toolbar-panel');
    if (!panel) return;

    if (isCompactToolbar()) {
        panel.hidden = !panel.classList.contains('is-open');
        return;
    }

    panel.hidden = false;
    panel.classList.remove('is-open');
    const toggle = document.getElementById('toolbar-menu-toggle');
    toggle?.setAttribute('aria-expanded', 'false');
}

function closeMobileToolbar() {
    const panel = document.getElementById('app-toolbar-panel');
    const toggle = document.getElementById('toolbar-menu-toggle');
    if (!panel || !toggle) return;
    panel.classList.remove('is-open');
    if (isCompactToolbar()) panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
}

function toggleMobileToolbar() {
    const panel = document.getElementById('app-toolbar-panel');
    const toggle = document.getElementById('toolbar-menu-toggle');
    if (!panel || !toggle) return;

    const open = !panel.classList.contains('is-open');
    if (open) {
        closeLocaleMenu();
        closeInterviewModelMenu();
        closeInterviewAlgorithmMenu();
        panel.hidden = false;
        panel.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        return;
    }

    closeMobileToolbar();
}

function bindMobileToolbarMenu() {
    const toggle = document.getElementById('toolbar-menu-toggle');
    const panel = document.getElementById('app-toolbar-panel');
    const sidebar = document.getElementById('site-sidebar');
    if (!toggle || !panel || toggle.dataset.bound === 'true') return;
    toggle.dataset.bound = 'true';

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleMobileToolbar();
    });

    document.addEventListener('click', (event) => {
        if (!panel.classList.contains('is-open')) return;
        const target = event.target as Node;
        if (sidebar?.contains(target)) return;
        closeMobileToolbar();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMobileToolbar();
    });

    panel.querySelectorAll('a.app-toolbar__btn, [data-start-over]').forEach((node) => {
        node.addEventListener('click', () => closeMobileToolbar());
    });
}

function startOver() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
        clearRejectedQuestions();
        clearLlmSteps();
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
    closeInterviewAlgorithmMenu();
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

function updateInterviewModelLabel(catalog: InterviewModelOption[]) {
    const labelEl = document.getElementById('interview-model-label');
    if (!labelEl) return;
    const locale = readLocale();
    const modelId = readInterviewModel();
    const option = catalog.find((m) => m.id === modelId) ?? catalog[0];
    labelEl.textContent = option ? interviewModelLabel(option, locale) : '—';
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
    closeInterviewAlgorithmMenu();
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

function refreshInterviewModelMenuLabels(catalog: InterviewModelOption[]) {
    const menu = document.getElementById('interview-model-menu');
    if (!menu) return;
    const locale = readLocale();
    menu.querySelectorAll<HTMLElement>('[data-model-id]').forEach((item) => {
        const option = catalog.find((m) => m.id === item.dataset.modelId);
        if (!option) return;
        const label = item.querySelector('.toolbar-dropdown__option-label');
        if (label) label.textContent = interviewModelLabel(option, locale);
    });
}

function renderInterviewModelMenu(catalog: InterviewModelOption[]) {
    const menu = document.getElementById('interview-model-menu');
    if (!menu) return;

    menu.innerHTML = '';
    menu.dataset.rendered = 'true';

    const locale = readLocale();
    const selectedId = readInterviewModel();

    catalog.forEach((option) => {
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
            updateInterviewModelLabel(catalog);
            closeInterviewModelMenu();
            closeMobileToolbar();
            document.dispatchEvent(
                new CustomEvent('interview-model-changed', { detail: { modelId: option.id } })
            );
        });

        menu.appendChild(item);
    });
}

function updateInterviewAlgorithmLabel() {
    const labelEl = document.getElementById('interview-algorithm-label');
    if (!labelEl) return;
    const locale = readLocale();
    const modeId = readInterviewAlgorithmMode();
    const option =
        INTERVIEW_ALGORITHM_MODES.find((m) => m.id === modeId) ?? INTERVIEW_ALGORITHM_MODES[0];
    labelEl.textContent = algorithmModeLabel(option, locale);
}

function closeInterviewAlgorithmMenu() {
    const menu = document.getElementById('interview-algorithm-menu');
    const trigger = document.getElementById('interview-algorithm-trigger');
    if (!menu || !trigger) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
}

function openInterviewAlgorithmMenu() {
    closeLocaleMenu();
    closeInterviewModelMenu();
    const menu = document.getElementById('interview-algorithm-menu');
    const trigger = document.getElementById('interview-algorithm-trigger');
    if (!menu || !trigger) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
}

function toggleInterviewAlgorithmMenu() {
    const menu = document.getElementById('interview-algorithm-menu');
    if (!menu) return;
    if (menu.hidden) openInterviewAlgorithmMenu();
    else closeInterviewAlgorithmMenu();
}

function refreshInterviewAlgorithmMenuLabels() {
    const menu = document.getElementById('interview-algorithm-menu');
    if (!menu) return;
    const locale = readLocale();
    menu.querySelectorAll<HTMLElement>('[data-algorithm-id]').forEach((item) => {
        const option = INTERVIEW_ALGORITHM_MODES.find((m) => m.id === item.dataset.algorithmId);
        if (!option) return;
        const label = item.querySelector('.toolbar-dropdown__option-label');
        const desc = item.querySelector('.toolbar-dropdown__option-desc');
        if (label) label.textContent = algorithmModeLabel(option, locale);
        if (desc) desc.textContent = algorithmModeDescription(option, locale);
    });
}

function renderInterviewAlgorithmMenu() {
    const menu = document.getElementById('interview-algorithm-menu');
    if (!menu || menu.dataset.rendered === 'true') return;
    menu.dataset.rendered = 'true';

    const locale = readLocale();
    const selectedId = readInterviewAlgorithmMode();

    INTERVIEW_ALGORITHM_MODES.forEach((option) => {
        const item = document.createElement('li');
        item.setAttribute('role', 'option');
        item.dataset.algorithmId = option.id;
        item.className = 'toolbar-dropdown__option';
        if (option.id === selectedId) {
            item.setAttribute('aria-selected', 'true');
            item.classList.add('is-selected');
        }

        item.innerHTML = `
            <span class="toolbar-dropdown__option-label">${algorithmModeLabel(option, locale)}</span>
            <span class="toolbar-dropdown__option-desc">${algorithmModeDescription(option, locale)}</span>
        `;

        item.addEventListener('click', () => {
            if (option.id === readInterviewAlgorithmMode()) {
                closeInterviewAlgorithmMenu();
                return;
            }
            saveInterviewAlgorithmMode(option.id);
            menu.querySelectorAll('[role="option"]').forEach((node) => {
                node.classList.remove('is-selected');
                node.setAttribute('aria-selected', 'false');
            });
            item.classList.add('is-selected');
            item.setAttribute('aria-selected', 'true');
            updateInterviewAlgorithmLabel();
            closeInterviewAlgorithmMenu();
            closeMobileToolbar();
            document.dispatchEvent(
                new CustomEvent('interview-algorithm-mode-changed', {
                    detail: { mode: option.id }
                })
            );
        });

        menu.appendChild(item);
    });
}

function bindInterviewAlgorithmDropdown() {
    const dropdown = document.getElementById('interview-algorithm-dropdown');
    const trigger = document.getElementById('interview-algorithm-trigger');
    if (!dropdown || !trigger || dropdown.dataset.bound === 'true') return;
    dropdown.dataset.bound = 'true';

    renderInterviewAlgorithmMenu();
    updateInterviewAlgorithmLabel();

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleInterviewAlgorithmMenu();
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target as Node)) closeInterviewAlgorithmMenu();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeInterviewAlgorithmMenu();
    });
}

let interviewModelCatalog: InterviewModelOption[] = [];

async function bindInterviewModelDropdown() {
    const dropdown = document.getElementById('interview-model-dropdown');
    const trigger = document.getElementById('interview-model-trigger');
    if (!dropdown || !trigger || dropdown.dataset.bound === 'true') return;
    dropdown.dataset.bound = 'true';

    const data = await loadInterviewModels();
    const picked = pickInterviewModelOption(data, readInterviewModel());
    if (picked) saveInterviewModel(picked.id);

    interviewModelCatalog = data.models;
    renderInterviewModelMenu(interviewModelCatalog);
    updateInterviewModelLabel(interviewModelCatalog);

    if (interviewModelCatalog.length === 0) {
        trigger.disabled = true;
        const labelEl = document.getElementById('interview-model-label');
        if (labelEl) labelEl.textContent = '—';
        return;
    }

    trigger.disabled = false;

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

export async function initAppToolbar() {
    const locale = readLocale();
    applyLocaleToDocument(locale);
    bindLocaleDropdown();
    updateLocaleLabel();
    bindMobileToolbarMenu();
    bindStartOver();
    await bindInterviewModelDropdown();
    bindInterviewAlgorithmDropdown();
    updateLastResultLink();
    syncToolbarPanelVisibility();
    window.addEventListener('resize', syncToolbarPanelVisibility);

    if (!lastDeliveryListenerBound) {
        lastDeliveryListenerBound = true;
        document.addEventListener('last-delivery-changed', updateLastResultLink);
    }
}

void initAppToolbar();
document.addEventListener('astro:page-load', () => {
    void initAppToolbar();
});

export {};
