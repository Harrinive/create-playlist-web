import { getApiBaseUrl } from '../lib/api-config';
import { saveCurateModel, DEV_PREVIEW_CURATE_MODELS, type CurateModelsResponse } from '../lib/curate-model';
import { isValidAnswers } from '../lib/build-prompt';
import { saveLastDelivery } from '../lib/last-delivery';
import { SESSION_KEY } from '../lib/types';

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

export async function initDeliveryPage() {
    const missingEl = document.getElementById('delivery-missing');
    const contentEl = document.getElementById('delivery-content');
    const optionsEl = document.getElementById('delivery-options');

    if (!missingEl || !contentEl || !optionsEl) return;

    let raw: unknown;
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        raw = stored ? JSON.parse(stored) : null;
    } catch {
        raw = null;
    }

    const hasAnswers = isValidAnswers(raw);
    missingEl.hidden = hasAnswers;
    contentEl.hidden = !hasAnswers;

    if (!hasAnswers || optionsEl.dataset.bound === 'true') return;
    optionsEl.dataset.bound = 'true';

    const promptButton = createDeliveryButton(
        { delivery: 'prompt' },
        'Prompt for Spotify Prompted Playlist',
        'Spotify 提示歌单段落 (Prompt for Spotify Prompted Playlist)',
        'Paste in the Spotify app',
        '在 Spotify 应用中粘贴'
    );
    optionsEl.appendChild(promptButton);

    const api = getApiBaseUrl();
    let models: CurateModelsResponse['models'] = [];

    if (api) {
        try {
            const response = await fetch(`${api}/api/curate/models`);
            if (response.ok) {
                const data = (await response.json()) as CurateModelsResponse;
                if (data.llmConfigured) {
                    models = data.models;
                }
            }
        } catch {
            models = [];
        }
    }

    if (models.length === 0 && import.meta.env.DEV) {
        models = DEV_PREVIEW_CURATE_MODELS;
    }

    if (models.length > 0) {
        for (const model of models) {
            const button = createDeliveryButton(
                { delivery: 'build', model: model.id },
                model.labelEn,
                model.labelZh,
                '~20 verified tracks on your Spotify',
                '约 20 首验证曲目，发布到你的 Spotify'
            );
            const labelEl = button.querySelector('.chip-option__label [data-locale="en"]');
            if (labelEl) labelEl.textContent = model.labelEn;
            optionsEl.appendChild(button);
        }
    } else {
        const button = createDeliveryButton(
            { delivery: 'build' },
            'Build on Spotify',
            '在 Spotify 上创建 (Build on Spotify)',
            '~20 verified tracks on your account',
            '约 20 首验证曲目，发布到你的账号'
        );
        optionsEl.appendChild(button);
    }

    optionsEl.querySelectorAll<HTMLButtonElement>('[data-delivery]').forEach((btn) => {
        btn.addEventListener('click', () => {
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
        });
    });
}
