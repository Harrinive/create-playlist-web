import { applyAriaLabels } from '../lib/aria-labels';
import { applyLocaleToDocument, onLocaleChange, readLocale, writeLocale, type Locale } from '../lib/locale';
import { sameModelIds } from '../lib/model-utils';
import {
    CATALOG_INTERVIEW_MODELS,
    fetchInterviewModels,
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
import { openOverlay, openWithFade, closeInstant, closeWithTransition } from '../lib/motion';

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
        descZh: '界面与访谈使用英文'
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

function refreshToolbarLocaleLabels(locale: Locale = readLocale()) {
    updateLocaleLabel();
    refreshLocaleMenuLabels();
    updateInterviewModelLabel(interviewModelCatalog);
    refreshInterviewModelMenuLabels(interviewModelCatalog);
    updateInterviewAlgorithmLabel();
    refreshInterviewAlgorithmMenuLabels();
}

function setLocale(locale: Locale) {
    writeLocale(locale);
    closeMobileToolbar();
    applyLocaleToDocument(locale, { animate: true });
}

onLocaleChange(refreshToolbarLocaleLabels);

/** Keep in sync with --layout-shell-max-inline-size (1100px) in global.css */
function isCompactToolbar(): boolean {
    return window.matchMedia('(max-width: 1100px)').matches;
}

function syncToolbarPanelVisibility() {
    const panel = document.getElementById('app-toolbar-panel');
    if (!panel) return;

    if (isCompactToolbar()) {
        if (!panel.classList.contains('is-open')) {
            panel.hidden = true;
        }
        return;
    }

    panel.hidden = false;
    panel.classList.remove('is-open', 'is-opening');
    const toggle = document.getElementById('toolbar-menu-toggle');
    toggle?.setAttribute('aria-expanded', 'false');
}

function closeMobileToolbar() {
    const panel = document.getElementById('app-toolbar-panel');
    const toggle = document.getElementById('toolbar-menu-toggle');
    if (!panel || !toggle) return;

    if (!panel.classList.contains('is-open')) {
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        return;
    }

    toggle.setAttribute('aria-expanded', 'false');
    void closeWithTransition(panel);
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
        openOverlay(panel);
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

    panel.querySelectorAll('a.app-toolbar__btn').forEach((node) => {
        node.addEventListener('click', () => closeMobileToolbar());
    });
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
    closeInstant(menu);
    trigger.setAttribute('aria-expanded', 'false');
}

function openLocaleMenu() {
    closeInterviewModelMenu();
    closeInterviewAlgorithmMenu();
    const menu = document.getElementById('locale-menu');
    const trigger = document.getElementById('locale-trigger');
    if (!menu || !trigger) return;
    openWithFade(menu);
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

function bindListboxKeyboard(menuId: string) {
    const menu = document.getElementById(menuId);
    if (!menu || menu.dataset.keyboardBound === 'true') return;
    menu.dataset.keyboardBound = 'true';

    menu.addEventListener('keydown', (event) => {
        const options = [...menu.querySelectorAll<HTMLElement>('[role="option"]')];
        if (options.length === 0) return;

        const current = Math.max(
            0,
            options.findIndex((option) => option.getAttribute('aria-selected') === 'true')
        );
        let next = current;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            next = (current + 1) % options.length;
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            next = (current - 1 + options.length) % options.length;
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            options[current]?.click();
            return;
        } else {
            return;
        }

        options.forEach((option, index) => {
            const selected = index === next;
            option.classList.toggle('is-selected', selected);
            option.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
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

    bindListboxKeyboard('locale-menu');
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
    closeInstant(menu);
    trigger.setAttribute('aria-expanded', 'false');
}

function openInterviewModelMenu() {
    closeLocaleMenu();
    closeInterviewAlgorithmMenu();
    const menu = document.getElementById('interview-model-menu');
    const trigger = document.getElementById('interview-model-trigger');
    if (!menu || !trigger) return;
    openWithFade(menu);
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
    closeInstant(menu);
    trigger.setAttribute('aria-expanded', 'false');
}

function openInterviewAlgorithmMenu() {
    closeLocaleMenu();
    closeInterviewModelMenu();
    const menu = document.getElementById('interview-algorithm-menu');
    const trigger = document.getElementById('interview-algorithm-trigger');
    if (!menu || !trigger) return;
    openWithFade(menu);
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

    bindListboxKeyboard('interview-algorithm-menu');
}

let interviewModelCatalog: InterviewModelOption[] = [];

async function bindInterviewModelDropdown() {
    const dropdown = document.getElementById('interview-model-dropdown');
    const trigger = document.getElementById('interview-model-trigger');
    if (!dropdown || !trigger) return;

    if (dropdown.dataset.bound !== 'true') {
        dropdown.dataset.bound = 'true';

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

        bindListboxKeyboard('interview-model-menu');
    }

    const catalogData = {
        models: CATALOG_INTERVIEW_MODELS,
        defaultModel: CATALOG_INTERVIEW_MODELS[0]?.id ?? null,
        llmConfigured: false
    };
    const catalogPicked = pickInterviewModelOption(catalogData, readInterviewModel());
    if (catalogPicked) saveInterviewModel(catalogPicked.id);

    interviewModelCatalog = CATALOG_INTERVIEW_MODELS;
    renderInterviewModelMenu(interviewModelCatalog);
    updateInterviewModelLabel(interviewModelCatalog);
    trigger.disabled = false;

    try {
        const data = await fetchInterviewModels();
        if (!data?.llmConfigured || data.models.length === 0) return;

        const picked = pickInterviewModelOption(data, readInterviewModel());
        if (picked) saveInterviewModel(picked.id);

        if (!sameModelIds(data.models, interviewModelCatalog)) {
            interviewModelCatalog = data.models;
            renderInterviewModelMenu(interviewModelCatalog);
            updateInterviewModelLabel(interviewModelCatalog);
        }
    } catch {
        // Keep static catalog on network failure.
    }
}

let resizeListenerBound = false;

export async function initAppToolbar() {
    const locale = readLocale();
    applyLocaleToDocument(locale);
    applyAriaLabels(locale);
    closeMobileToolbar();
    bindLocaleDropdown();
    updateLocaleLabel();
    bindMobileToolbarMenu();
    await bindInterviewModelDropdown();
    bindInterviewAlgorithmDropdown();
    syncToolbarPanelVisibility();
    if (!resizeListenerBound) {
        resizeListenerBound = true;
        window.addEventListener('resize', syncToolbarPanelVisibility);
    }
}

document.addEventListener('astro:page-load', () => {
    void initAppToolbar();
});

document.addEventListener('astro:before-swap', () => {
    closeMobileToolbar();
});

export {};
