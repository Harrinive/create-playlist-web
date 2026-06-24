import { buildPrompt, isValidAnswers } from '../lib/build-prompt';
import { saveLastDelivery } from '../lib/last-delivery';
import { readLocale } from '../lib/locale';
import { SESSION_KEY } from '../lib/types';

const COPY_OK: Record<'en' | 'zh', string> = {
    en: 'Copied!',
    zh: '已复制！'
};

const COPY_FAIL: Record<'en' | 'zh', string> = {
    en: 'Copy failed — select the text manually.',
    zh: '复制失败 — 请手动选择文本。'
};

export function initPromptPage() {
    const promptEl = document.getElementById('prompt-text');
    const copyBtn = document.getElementById('copy-prompt') as HTMLButtonElement | null;
    const statusEl = document.getElementById('copy-status');
    const missingEl = document.getElementById('prompt-missing');
    const contentEl = document.getElementById('prompt-content');

    if (!promptEl || !copyBtn || !statusEl || !missingEl || !contentEl) return;

    let raw: unknown;
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        raw = stored ? JSON.parse(stored) : null;
    } catch {
        raw = null;
    }

    if (!isValidAnswers(raw)) {
        missingEl.hidden = false;
        contentEl.hidden = true;
        return;
    }

    const paragraph = buildPrompt(raw);
    promptEl.textContent = paragraph;
    saveLastDelivery('prompt');
    document.dispatchEvent(new CustomEvent('last-delivery-changed'));
    missingEl.hidden = true;
    contentEl.hidden = false;

    copyBtn.replaceWith(copyBtn.cloneNode(true));
    const freshCopyBtn = document.getElementById('copy-prompt') as HTMLButtonElement;

    freshCopyBtn.addEventListener('click', async () => {
        const locale = readLocale();
        try {
            await navigator.clipboard.writeText(paragraph);
            statusEl.textContent = COPY_OK[locale];
            window.setTimeout(() => {
                statusEl.textContent = '';
            }, 2000);
        } catch {
            statusEl.textContent = COPY_FAIL[locale];
        }
    });
}
