import { buildPrompt } from '../lib/build-prompt';
import { saveLastDelivery } from '../lib/last-delivery';
import { readLocale } from '../lib/locale';
import { readStoredInterviewAnswers } from '../lib/session-answers';

const COPY_OK: Record<'en' | 'zh', string> = {
    en: 'Copied!',
    zh: '已复制！'
};

const COPY_FAIL: Record<'en' | 'zh', string> = {
    en: 'Copy failed — select the text manually.',
    zh: '复制失败 — 请手动选择文本。'
};

const abortByRoot = new WeakMap<HTMLElement, AbortController>();

export function initPromptPage() {
    const root = document.getElementById('prompt-page');
    const promptEl = document.getElementById('prompt-text');
    const copyBtn = document.getElementById('copy-prompt') as HTMLButtonElement | null;
    const statusEl = document.getElementById('copy-status');
    const missingEl = document.getElementById('prompt-missing');
    const contentEl = document.getElementById('prompt-content');

    if (!root || !promptEl || !copyBtn || !statusEl || !missingEl || !contentEl) return;

    abortByRoot.get(root)?.abort();
    const controller = new AbortController();
    abortByRoot.set(root, controller);
    const { signal } = controller;

    let copyStatusTimer: ReturnType<typeof setTimeout> | undefined;
    signal.addEventListener('abort', () => {
        if (copyStatusTimer !== undefined) {
            clearTimeout(copyStatusTimer);
            copyStatusTimer = undefined;
        }
    });

    const answers = readStoredInterviewAnswers();
    if (!answers) {
        missingEl.hidden = false;
        contentEl.hidden = true;
        return;
    }

    const paragraph = buildPrompt(answers);
    promptEl.textContent = paragraph;
    saveLastDelivery('prompt');
    document.dispatchEvent(new CustomEvent('last-delivery-changed'));
    missingEl.hidden = true;
    contentEl.hidden = false;

    copyBtn.addEventListener(
        'click',
        async () => {
            const locale = readLocale();
            try {
                await navigator.clipboard.writeText(paragraph);
                statusEl.textContent = COPY_OK[locale];
                if (copyStatusTimer !== undefined) clearTimeout(copyStatusTimer);
                copyStatusTimer = window.setTimeout(() => {
                    statusEl.textContent = '';
                    copyStatusTimer = undefined;
                }, 2000);
            } catch {
                statusEl.textContent = COPY_FAIL[locale];
            }
        },
        { signal }
    );
}
