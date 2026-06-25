import {
    CATALOG_CURATE_MODELS,
    fetchCurateModels,
    sameModelIds,
    saveCurateModel,
    type CurateModelOption
} from '../lib/curate-model';
import { saveLastDelivery } from '../lib/last-delivery';
import { applyLocaleToDocument, readLocale } from '../lib/locale';
import { readStoredInterviewAnswers } from '../lib/session-answers';
import { appearOnMount, revealPanel, staggerAppear } from '../lib/motion';

const abortByRoot = new WeakMap<HTMLElement, AbortController>();
let deliveryOptionsGeneration = 0;

function createDeliveryButton(
    option: { delivery: string; model?: string },
    labelEn: string,
    labelZh: string,
    sublabelEn: string,
    sublabelZh: string
): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip-option chip-option--delivery';
    button.dataset.delivery = option.delivery;
    if (option.model) button.dataset.model = option.model;

    button.innerHTML = `
        <span class="chip-option__label">
            <span data-locale="en">${labelEn}</span>
            <span data-locale="zh" hidden>${labelZh}</span>
        </span>
        <span class="chip-option__sublabel">
            <span data-locale="en">${sublabelEn}</span>
            <span data-locale="zh" hidden>${sublabelZh}</span>
        </span>
    `;
    return button;
}

function renderDeliveryOptions(optionsEl: HTMLElement, models: CurateModelOption[]) {
    optionsEl.replaceChildren();

    optionsEl.appendChild(
        createDeliveryButton(
            { delivery: 'prompt' },
            'Prompt for Spotify Prompted Playlist',
            'Spotify Prompted Playlist',
            'Paste in the Spotify app',
            '粘贴到 Spotify 应用'
        )
    );

    if (models.length > 0) {
        for (const model of models) {
            optionsEl.appendChild(
                createDeliveryButton(
                    { delivery: 'build', model: model.id },
                    model.labelEn,
                    model.labelZh,
                    '~20 verified tracks on your Spotify',
                    '约 20 首验证曲目，发布到你的 Spotify'
                )
            );
        }
        return;
    }

    optionsEl.appendChild(
        createDeliveryButton(
            { delivery: 'build' },
            'Build on Spotify',
            '在 Spotify 上创建',
            '~20 verified tracks on your account',
            '约 20 首验证曲目，发布到你的账号'
        )
    );
}

export async function initDeliveryPage() {
    const root = document.getElementById('delivery-page');
    const missingEl = document.getElementById('delivery-missing');
    const contentEl = document.getElementById('delivery-content');
    const optionsEl = document.getElementById('delivery-options');

    if (!root || !missingEl || !contentEl || !optionsEl) return;

    abortByRoot.get(root)?.abort();
    const controller = new AbortController();
    abortByRoot.set(root, controller);
    const { signal } = controller;
    const gen = ++deliveryOptionsGeneration;

    const answers = readStoredInterviewAnswers();
    const hasAnswers = Boolean(answers);
    missingEl.hidden = hasAnswers;
    contentEl.hidden = !hasAnswers;
    if (hasAnswers) {
        revealPanel(contentEl, [missingEl]);
    } else {
        revealPanel(missingEl, [contentEl]);
    }

    if (!hasAnswers) return;

    document.addEventListener(
        'locale-changed',
        () => applyLocaleToDocument(readLocale()),
        { signal }
    );

    renderDeliveryOptions(optionsEl, CATALOG_CURATE_MODELS);
    applyLocaleToDocument(readLocale());
    staggerAppear(optionsEl, '.chip-option');

    optionsEl.addEventListener(
        'click',
        (event) => {
            const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-delivery]');
            if (!btn) return;
            const choice = btn.dataset.delivery;
            const model = btn.dataset.model;
            if (choice === 'prompt') {
                saveLastDelivery('prompt');
                document.dispatchEvent(new CustomEvent('last-delivery-changed'));
                window.location.assign('/prompt');
                return;
            }
            if (choice === 'build') {
                if (model) saveCurateModel(model);
                saveLastDelivery('build');
                document.dispatchEvent(new CustomEvent('last-delivery-changed'));
                window.location.assign('/build');
            }
        },
        { signal }
    );

    try {
        const data = await fetchCurateModels(signal);
        if (gen !== deliveryOptionsGeneration || !data) return;

        const models = data.llmConfigured ? data.models : [];
        if (!sameModelIds(models, CATALOG_CURATE_MODELS)) {
            renderDeliveryOptions(optionsEl, models);
            applyLocaleToDocument(readLocale());
            staggerAppear(optionsEl, '.chip-option');
        }
    } catch {
        // Keep static catalog on network failure.
    }
}
