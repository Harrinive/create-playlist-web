import { isApiConfigured } from '../lib/api-config';
import { readSavedPromptText, savePromptText } from '../lib/last-delivery';
import { createLocaleScope } from '../lib/locale-scope';
import { pickLocale, readLocale } from '../lib/locale';
import { localizeApiError } from '../lib/localized-errors';
import { resolveInterviewModelId } from '../lib/interview-model';
import { fetchSpotifyPrompt } from '../lib/prompt-api';
import { crossFadePanels, revealPanel } from '../lib/motion';
import { createPageScope } from '../lib/page-scope';
import { performStartOver } from '../lib/start-over';
import { normalizeSessionState } from '../lib/session-normalize';
import { readStoredInterviewAnswers } from '../lib/session-answers';

const PROMPT_ERROR_GENERIC = {
    en: 'Could not generate the prompt. Try again or start a new interview.',
    zh: '无法生成提示词。请重试或重新开始访谈。'
} as const;

const COPY_OK = {
    en: 'Copied!',
    zh: '已复制！'
} as const;

const COPY_FAIL = {
    en: 'Copy failed — select the text manually.',
    zh: '复制失败 — 请手动选择文本。'
} as const;

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

export function initPromptPage() {
    const root = document.getElementById('prompt-page');
    const promptEl = document.getElementById('prompt-text');
    const copyBtn = document.getElementById('copy-prompt') as HTMLButtonElement | null;
    const statusEl = document.getElementById('copy-status');
    const missingEl = document.getElementById('prompt-missing');
    const promptBodyEl = document.getElementById('prompt-body');
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
        !promptBodyEl ||
        !contentEl ||
        !loadingEl ||
        !errorEl ||
        !errorTextEl ||
        !retryBtn ||
        !unconfiguredEl
    ) {
        return;
    }

    normalizeSessionState();
    const { signal } = createPageScope(root);

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
    const panels = [contentEl, loadingEl, errorEl, unconfiguredEl, promptBodyEl];

    function renderErrorText(locale = readLocale()) {
        errorTextEl.textContent = lastErrorRaw
            ? localizeApiError(lastErrorRaw, locale, 'prompt')
            : pickLocale(PROMPT_ERROR_GENERIC, locale);
    }

    function renderCopyStatus(locale = readLocale()) {
        if (!lastCopyStatus) {
            statusEl.textContent = '';
            return;
        }
        statusEl.textContent =
            lastCopyStatus === 'ok' ? pickLocale(COPY_OK, locale) : pickLocale(COPY_FAIL, locale);
    }

    const localeScope = createLocaleScope(signal);
    localeScope.onRelocalize((locale) => {
        if (!errorEl.hidden) renderErrorText(locale);
        if (lastCopyStatus) renderCopyStatus(locale);
    });

    if (!answers) {
        revealPanel(missingEl, panels);
        return;
    }

    missingEl.hidden = true;

    if (!isApiConfigured()) {
        promptBodyEl.hidden = true;
        crossFadePanels(unconfiguredEl, [contentEl, loadingEl, errorEl, promptBodyEl]);
        return;
    }

    unconfiguredEl.hidden = true;
    promptBodyEl.hidden = false;

    function showLoading() {
        if (loadingEl.hidden) {
            crossFadePanels(loadingEl, [contentEl, errorEl]);
        }
    }

    function showError(message?: string) {
        lastErrorRaw = message;
        renderErrorText();
        crossFadePanels(errorEl, [loadingEl, contentEl]);
    }

    function showContent(text: string) {
        paragraph = text;
        promptEl.textContent = text;
        crossFadePanels(contentEl, [loadingEl, errorEl]);
        savePromptText(text);
        document.dispatchEvent(new CustomEvent('last-delivery-changed'));
    }

    async function generatePrompt(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = readSavedPromptText();
            if (cached) {
                showContent(cached);
                copyBtn.disabled = false;
                return;
            }
        }

        showLoading();
        copyBtn.disabled = true;

        try {
            const model = await resolveInterviewModelId(signal);
            const result = await fetchSpotifyPrompt(answers!, {
                model,
                signal
            });
            if (signal.aborted) return;
            showContent(result.paragraph);
            copyBtn.disabled = false;
        } catch (error) {
            if (signal.aborted || isAbortError(error)) return;
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

    retryBtn.addEventListener('click', () => void generatePrompt(true), { signal });

    root.querySelectorAll<HTMLButtonElement>('[data-action="start-over"]').forEach((btn) => {
        btn.addEventListener('click', () => performStartOver(), { signal });
    });

    localeScope.runNow();
    void generatePrompt();
}
