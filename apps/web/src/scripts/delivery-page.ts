import { isValidAnswers } from '../lib/build-prompt';
import { SESSION_KEY } from '../lib/types';

export function initDeliveryPage() {
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

    optionsEl.querySelectorAll<HTMLButtonElement>('[data-delivery]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const choice = btn.dataset.delivery;
            if (choice === 'prompt') window.location.assign('/prompt');
            if (choice === 'build') window.location.assign('/build');
        });
    });
}
