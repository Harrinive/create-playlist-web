import {
    fetchCurateModels,
    saveCurateModel,
    type CurateModelOption
} from '../lib/curate-model';
import { DELIVERY_COPY } from '../lib/delivery-copy';
import { createLocaleScope } from '../lib/locale-scope';
import { readLocale, syncLocaleNodes } from '../lib/locale';
import { createPageScope } from '../lib/page-scope';
import { normalizeSessionState } from '../lib/session-normalize';
import { readStoredInterviewAnswers } from '../lib/session-answers';
import { readPlannerState } from '../lib/interview-session';
import { deliveryText } from '../lib/delivery-copy';
import { navigateTo } from '../lib/navigate';
import { sameModelIds } from '../lib/model-utils';

let deliveryOptionsGeneration = 0;

function modelIdsFromOptions(optionsEl: HTMLElement): string[] {
    return [...optionsEl.querySelectorAll<HTMLElement>('[data-model]')]
        .map((el) => el.dataset.model ?? '')
        .filter(Boolean);
}

function modelsMatchDom(optionsEl: HTMLElement, models: CurateModelOption[]): boolean {
    const domIds = modelIdsFromOptions(optionsEl);
    return sameModelIds(
        domIds.map((id) => ({ id })),
        models.map((m) => ({ id: m.id }))
    );
}

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
            DELIVERY_COPY.promptLabel.en,
            DELIVERY_COPY.promptLabel.zh,
            DELIVERY_COPY.promptSublabel.en,
            DELIVERY_COPY.promptSublabel.zh
        )
    );

    if (models.length > 0) {
        for (const model of models) {
            optionsEl.appendChild(
                createDeliveryButton(
                    { delivery: 'build', model: model.id },
                    model.labelEn,
                    model.labelZh,
                    DELIVERY_COPY.buildSublabelSpotify.en,
                    DELIVERY_COPY.buildSublabelSpotify.zh
                )
            );
        }
        return;
    }

    optionsEl.appendChild(
        createDeliveryButton(
            { delivery: 'build' },
            DELIVERY_COPY.buildFallbackLabel.en,
            DELIVERY_COPY.buildFallbackLabel.zh,
            DELIVERY_COPY.buildSublabelAccount.en,
            DELIVERY_COPY.buildSublabelAccount.zh
        )
    );
}

export async function initDeliveryPage() {
    const root = document.getElementById('delivery-page');
    const missingEl = document.getElementById('delivery-missing');
    const contentEl = document.getElementById('delivery-content');
    const optionsEl = document.getElementById('delivery-options');
    const genreNoteEl = document.getElementById('delivery-genre-note');

    if (!root || !missingEl || !contentEl || !optionsEl) return;

    normalizeSessionState();
    const { signal } = createPageScope(root);
    const gen = ++deliveryOptionsGeneration;

    const answers = readStoredInterviewAnswers();
    const hasAnswers = Boolean(answers);

    if (!hasAnswers) {
        contentEl.hidden = true;
        missingEl.hidden = false;
        return;
    }

    missingEl.hidden = true;
    contentEl.hidden = false;

    const planner = readPlannerState();
    const genreNote =
        planner?.deliveryGenreNote?.trim() || planner?.reachableGenresNote?.trim();

    function renderGenreNote(locale = readLocale()) {
        if (!genreNoteEl) return;
        if (!genreNote) {
            genreNoteEl.hidden = true;
            return;
        }
        genreNoteEl.textContent = `${deliveryText('genreNotePrefix', locale)} ${genreNote}`;
        genreNoteEl.hidden = false;
    }

    const localeScope = createLocaleScope(signal);
    localeScope.onRelocalize(renderGenreNote);
    localeScope.runNow();

    optionsEl.addEventListener(
        'click',
        (event) => {
            const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-delivery]');
            if (!btn) return;
            const choice = btn.dataset.delivery;
            const model = btn.dataset.model;
            if (choice === 'prompt') {
                navigateTo('/prompt');
                return;
            }
            if (choice === 'build') {
                if (model) saveCurateModel(model);
                navigateTo('/build');
            }
        },
        { signal }
    );

    try {
        const data = await fetchCurateModels(signal);
        if (gen !== deliveryOptionsGeneration || !data) return;

        const models = data.llmConfigured ? data.models : [];
        if (models.length > 0 && !modelsMatchDom(optionsEl, models)) {
            renderDeliveryOptions(optionsEl, models);
            syncLocaleNodes(readLocale());
        }
    } catch {
        // Keep SSR catalog on network failure.
    }
}
