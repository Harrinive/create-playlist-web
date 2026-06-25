import { isApiConfigured } from '../lib/api-config';
import { saveLastDelivery } from '../lib/last-delivery';
import { readLocale } from '../lib/locale';
import { resolveInterviewModelId } from '../lib/interview-model';
import { fetchSpotifyPrompt } from '../lib/prompt-api';
import { readStoredInterviewAnswers } from '../lib/session-answers';

const COPY_OK: Record<'en' | 'zh', string> = {
    en: 'Copied!',
    zh: '已复制！'
};

const COPY_FAIL: Record<'en' | 'zh', string> = {
    en: 'Copy failed — select the text manually.',
    zh: '复制失败 — 请手动选择文本。'
};

const ERROR_GENERIC: Record<'en' | 'zh', string> = {
    en: 'Could not generate the prompt. Try again or start a new interview.',
    zh: '无法生成提示词。请重试或重新开始访谈。'
};

const abortByRoot = new WeakMap<HTMLElement, AbortController>();

export function initPromptPage() {
    const root = document.getElementById('prompt-page');
    const promptEl = document.getElementById('prompt-text');
    const copyBtn = document.getElementById('copy-prompt') as HTMLButtonElement | null;
    const statusEl = document.getElementById('copy-status');
    const missingEl = document.getElementById('prompt-missing');
    const contentEl = document.getElementById('prompt-content');
    const loadingEl = document.getElementById('prompt-loading');
    const errorEl = document.getElementById('prompt-error');
    const errorTextEl = document.getElementById('prompt-error-text');
    const retryBtn = document.getElementById('prompt-retry') as HTMLButtonElement | null;
    const unconfiguredEl = document.getElementById('prompt-unconfigured');

    if (
        !root ||
        !promptEl ||
        !copyBtn ||
        !statusEl ||
        !missingEl ||
        !contentEl ||
        !loadingEl ||
        !errorEl ||
        !errorTextEl ||
        !retryBtn ||
        !unconfiguredEl
    ) {
        return;
    }

    abortByRoot.get(root)?.abort();
    const controller = new AbortController();
    abortByRoot.set(root, controller);
    const { signal } = controller;

    let copyStatusTimer: ReturnType<typeof setTimeout> | undefined;
    let paragraph = '';

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
        loadingEl.hidden = true;
        errorEl.hidden = true;
        unconfiguredEl.hidden = true;
        return;
    }

    missingEl.hidden = true;

    if (!isApiConfigured()) {
        unconfiguredEl.hidden = false;
        contentEl.hidden = true;
        loadingEl.hidden = true;
        errorEl.hidden = true;
        return;
    }

    function showLoading() {
        loadingEl.hidden = false;
        contentEl.hidden = true;
        errorEl.hidden = true;
        unconfiguredEl.hidden = true;
    }

    function showError(message?: string) {
        loadingEl.hidden = true;
        contentEl.hidden = true;
        errorEl.hidden = false;
        unconfiguredEl.hidden = true;
        const locale = readLocale();
        errorTextEl.textContent = message ?? ERROR_GENERIC[locale];
    }

    function showContent(text: string) {
        paragraph = text;
        promptEl.textContent = text;
        loadingEl.hidden = true;
        errorEl.hidden = true;
        unconfiguredEl.hidden = true;
        contentEl.hidden = false;
        saveLastDelivery('prompt');
        document.dispatchEvent(new CustomEvent('last-delivery-changed'));
    }

    async function generatePrompt() {
        showLoading();
        copyBtn.disabled = true;

        try {
            const model = await resolveInterviewModelId(signal);
            const result = await fetchSpotifyPrompt(answers!, {
                model,
                signal
            });
            showContent(result.paragraph);
            copyBtn.disabled = false;
        } catch (error) {
            if (signal.aborted) return;
            const message = error instanceof Error ? error.message : undefined;
            showError(message);
            copyBtn.disabled = true;
        }
    }

    copyBtn.addEventListener(
        'click',
        async () => {
            if (!paragraph) return;
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

    retryBtn.addEventListener('click', () => void generatePrompt(), { signal });

    void generatePrompt();
}
