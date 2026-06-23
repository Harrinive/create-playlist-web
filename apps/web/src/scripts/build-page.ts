import { isValidAnswers } from '../lib/build-prompt';
import { SESSION_KEY } from '../lib/types';

export function initBuildPage() {
    const missingEl = document.getElementById('build-missing');
    const contentEl = document.getElementById('build-content');

    if (!missingEl || !contentEl) return;

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
}
