import { isApiConfigured } from '../lib/api-config';
import { saveLastDelivery } from '../lib/last-delivery';
import { readLocale } from '../lib/locale';
import { localizeApiError } from '../lib/localized-errors';
import { resolveInterviewModelId } from '../lib/interview-model';
import { fetchSpotifyPrompt } from '../lib/prompt-api';
import { crossFadePanels, revealPanel } from '../lib/motion';
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
    let lastErrorRaw: string | undefined;
    let lastCopyStatus: 'ok' | 'fail' | null = null;

    signal.addEventListener('abort', () => {
        if (copyStatusTimer !== undefined) {
            clearTimeout(copyStatusTimer);
            copyStatusTimer = undefined;
        }
    });

    const answers = readStoredInterviewAnswers();
    const panels = [contentEl, loadingEl, errorEl, unconfiguredEl];

    function renderErrorText() {
        const locale = readLocale();
        errorTextEl.textContent = lastErrorRaw
            ? localizeApiError(lastErrorRaw, locale, 'prompt')
            : ERROR_GENERIC[locale];
    }

    function renderCopyStatus() {
        if (!lastCopyStatus) {
            statusEl.textContent = '';
            return;
        }
        const locale = readLocale();
        statusEl.textContent = lastCopyStatus === 'ok' ? COPY_OK[locale] : COPY_FAIL[locale];
    }

    document.addEventListener(
        'locale-changed',
        () => {
            if (!errorEl.hidden) renderErrorText();
            if (lastCopyStatus) renderCopyStatus();
        },
        { signal }
    );

    if (!answers) {
        revealPanel(missingEl, panels);
        return;
    }

    missingEl.hidden = true;

    if (!isApiConfigured()) {
        crossFadePanels(unconfiguredEl, [contentEl, loadingEl, errorEl]);
        return;
    }

    function showLoading() {
        if (loadingEl.hidden) {
            crossFadePanels(loadingEl, [contentEl, errorEl, unconfiguredEl]);
        }
    }

    function showError(message?: string) {
        lastErrorRaw = message;
        renderErrorText();
        crossFadePanels(errorEl, [loadingEl, contentEl, unconfiguredEl]);
    }

    function showContent(text: string) {
        paragraph = text;
        promptEl.textContent = text;
        crossFadePanels(contentEl, [loadingEl, errorEl, unconfiguredEl]);
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
            try {
                await navigator.clipboard.writeText(paragraph);
                lastCopyStatus = 'ok';
                renderCopyStatus();
                if (copyStatusTimer !== undefined) clearTimeout(copyStatusTimer);
                copyStatusTimer = window.setTimeout(() => {
                    lastCopyStatus = null;
                    statusEl.textContent = '';
                    copyStatusTimer = undefined;
                }, 2000);
            } catch {
                lastCopyStatus = 'fail';
                renderCopyStatus();
            }
        },
        { signal }
    );

    retryBtn.addEventListener('click', () => void generatePrompt(), { signal });

    void generatePrompt();
}
