import type { InterviewAnswers, InterviewOption } from '../lib/types';
import type { InterviewStep } from '../lib/interview-meta';
import { WIZARD_LABELS, INTERVIEW_STEP_COUNT, INTERVIEW_STEP_IDS } from '../lib/interview-meta';
import { fetchInterviewNext } from '../lib/interview-api';
import { bilingualStepToDisplay, fillInterviewBilingual, fillInterviewLineWithGloss } from '../lib/interview-i18n';
import { combineLabelWithGloss } from '../lib/interview-label';
import {
    clearLlmSteps,
    readLlmSteps,
    truncateLlmSteps,
    upsertLlmStep
} from '../lib/interview-llm-cache';
import { isApiConfigured } from '../lib/api-config';
import { resolveInterviewModelId } from '../lib/interview-model';
import { readInterviewAlgorithmMode } from '../lib/interview-algorithm-mode';
import { mountInterviewLoading, type InterviewLoadingHandle } from '../lib/interview-loading';
import {
    clearRejectedQuestions,
    recordRejectedQuestion,
    rejectedStemsForStep
} from '../lib/interview-refresh';
import { readLocale, type Locale } from '../lib/locale';
import { localizeApiError } from '../lib/localized-errors';
import { DRAFT_KEY, SESSION_KEY } from '../lib/session-keys';
import { readStoredInterviewAnswers } from '../lib/session-answers';
import { performStartOver } from '../lib/start-over';
import { navigateTo } from '../lib/navigate';
import { staggerAppear } from '../lib/motion';

type Draft = Partial<InterviewAnswers>;

const abortByRoot = new WeakMap<HTMLElement, AbortController>();
let wizardSession = 0;

function getDraft(): Draft {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        return raw ? (JSON.parse(raw) as Draft) : {};
    } catch {
        return {};
    }
}

function saveDraft(draft: Draft) {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
    sessionStorage.removeItem(DRAFT_KEY);
}

function restoreDraftFromSessionIfNeeded() {
    const draft = getDraft();
    if (countCompletedSteps(draft) > 0) return;
    const stored = readStoredInterviewAnswers();
    if (stored) saveDraft(stored);
}

function isInterviewComplete(draft: Draft): boolean {
    return countCompletedSteps(draft) >= INTERVIEW_STEP_COUNT;
}

function getSelectedMulti(draft: Draft): InterviewOption[] {
    return Array.isArray(draft.m4) ? draft.m4 : [];
}

function isStepIdComplete(stepId: (typeof INTERVIEW_STEP_IDS)[number], draft: Draft): boolean {
    if (stepId === 'm4') return getSelectedMulti(draft).length > 0;
    return Boolean(draft[stepId]);
}

function countCompletedSteps(draft: Draft): number {
    let count = 0;
    for (const stepId of INTERVIEW_STEP_IDS) {
        if (!isStepIdComplete(stepId, draft)) break;
        count += 1;
    }
    return count;
}

function clearAnswersFromIndex(draft: Draft, fromIndex: number) {
    for (let i = fromIndex; i < INTERVIEW_STEP_COUNT; i += 1) {
        const stepId = INTERVIEW_STEP_IDS[i];
        if (stepId === 'm4') draft.m4 = undefined;
        else delete (draft as Record<string, unknown>)[stepId];
    }
}

function displayStepFromCache(stepIndex: number, locale: Locale): InterviewStep | null {
    const cached = readLlmSteps()[stepIndex];
    if (!cached) return null;
    return bilingualStepToDisplay(cached, locale) as InterviewStep;
}

function buildDraftAnswers(draft: Draft): Partial<InterviewAnswers> {
    const answers: Partial<InterviewAnswers> = {};
    if (draft.m1) answers.m1 = draft.m1;
    if (draft.m2) answers.m2 = draft.m2;
    if (draft.m3) answers.m3 = draft.m3;
    if (draft.m5) answers.m5 = draft.m5;
    if (draft.m4?.length) answers.m4 = draft.m4;
    return answers;
}

async function loadLlmStep(
    stepIndex: number,
    locale: Locale,
    refresh: boolean,
    modelId: string | undefined,
    signal?: AbortSignal
): Promise<InterviewStep> {
    if (!refresh) {
        const cached = displayStepFromCache(stepIndex, locale);
        if (cached) return cached;
    }

    const draft = getDraft();
    const response = await fetchInterviewNext({
        stepIndex,
        priorAnswers: buildDraftAnswers(draft),
        rejectedStems: rejectedStemsForStep(INTERVIEW_STEP_IDS[stepIndex] ?? 'm1'),
        refresh,
        model: modelId,
        algorithmMode: readInterviewAlgorithmMode(),
        signal
    });

    upsertLlmStep(stepIndex, response.step);
    return bilingualStepToDisplay(response.step, locale) as InterviewStep;
}

function interviewLoadError(error: unknown, locale: Locale): string {
    if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
            return WIZARD_LABELS[locale].apiUnreachable;
        }
        return localizeApiError(error.message, locale, 'interview');
    }
    return WIZARD_LABELS[locale].apiUnavailable;
}

export async function initInterviewWizard() {
    const root = document.getElementById('interview-wizard');
    const stackEl = document.getElementById('interview-stack');
    if (!root || !stackEl) return;

    const localeForError = readLocale();
    if (!isApiConfigured()) {
        stackEl.innerHTML = `<p class="help-line">${WIZARD_LABELS[localeForError].apiUnavailable}</p>`;
        return;
    }

    abortByRoot.get(root)?.abort();
    const controller = new AbortController();
    abortByRoot.set(root, controller);
    const { signal } = controller;
    const session = ++wizardSession;

    function isActive(): boolean {
        return wizardSession === session && abortByRoot.get(root) === controller;
    }

    let interviewModelId = await resolveInterviewModelId(signal);
    if (!isActive()) return;
    if (!interviewModelId) {
        stackEl.innerHTML = `<p class="help-line">${WIZARD_LABELS[localeForError].apiUnavailable}</p>`;
        return;
    }

    let locale: Locale = readLocale();
    let steps = resolveStepsForLocale(locale);
    let loading = false;
    let activeLoading: InterviewLoadingHandle | null = null;

    function dismissLoading() {
        activeLoading?.stop();
        activeLoading = null;
    }

    function resolveStepsForLocale(nextLocale: Locale): InterviewStep[] {
        const cached = readLlmSteps();
        return cached.map((step) => bilingualStepToDisplay(step, nextLocale) as InterviewStep);
    }

    function labels() {
        return WIZARD_LABELS[locale];
    }

    function finishInterview() {
        const draft = getDraft();
        const answers: InterviewAnswers = {
            m1: draft.m1!,
            m2: draft.m2!,
            m3: draft.m3!,
            m5: draft.m5!,
            m4: draft.m4!
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(answers));
        navigateTo('/delivery');
    }

    function createLoadingBlock(): HTMLElement {
        dismissLoading();
        const handle = mountInterviewLoading(locale, readInterviewAlgorithmMode());
        activeLoading = handle;
        return handle.element;
    }

    function prepareLoadingBlock(): HTMLElement {
        const boot = stackEl.querySelector<HTMLElement>('[data-interview-boot]');
        if (boot) {
            const mode = readInterviewAlgorithmMode();
            if (mode === 'fast') {
                boot.removeAttribute('data-interview-boot');
                return boot;
            }
            const handle = mountInterviewLoading(locale, mode);
            activeLoading = handle;
            boot.replaceWith(handle.element);
            return handle.element;
        }

        const existing = stackEl.querySelector<HTMLElement>('.interview-loading');
        if (existing) return existing;

        const loadingEl = createLoadingBlock();
        stackEl.appendChild(loadingEl);
        return loadingEl;
    }

    function swapLoadingForStep(loadingEl: HTMLElement, block: HTMLElement) {
        loadingEl.replaceWith(block);
        dismissLoading();
    }

    function removeRefreshActions(block: HTMLElement) {
        block.querySelector('.interview-step__actions--refresh')?.remove();
    }

    function demoteStepToAnswered(block: HTMLElement) {
        block.classList.remove('interview-step--active');
        block.classList.add('interview-step--answered');
        removeRefreshActions(block);
    }

    function createStepBlock(step: InterviewStep, stepIndex: number, mode: 'active' | 'answered'): HTMLElement {
        const block = document.createElement('article');
        block.className = `interview-step interview-step--${mode}`;
        block.dataset.stepIndex = String(stepIndex);

        const header = document.createElement('div');
        header.className = 'interview-step__header';
        header.innerHTML = `<p class="step-label">${labels().question(stepIndex + 1, step.dimension)}</p>`;

        const stem = document.createElement('h2');
        stem.className = 'interview-step__stem page-title';
        fillInterviewLineWithGloss(stem, step.stem, step.stemGloss, step.stemEn, locale);

        block.append(header, stem);

        if (step.hint) {
            const hint = document.createElement('p');
            hint.className = 'help-line interview-step__hint';
            fillInterviewBilingual(hint, step.hint, step.hintEn, locale);
            block.appendChild(hint);
        }

        const options = document.createElement('div');
        options.className = 'chip-grid interview-step__options';
        options.setAttribute('role', 'group');
        block.appendChild(options);

        if (mode === 'active') {
            const refreshActions = document.createElement('div');
            refreshActions.className = 'interview-step__actions interview-step__actions--refresh actions-row';

            const refreshBtn = document.createElement('button');
            refreshBtn.type = 'button';
            refreshBtn.className = 'text-link-button interview-step__refresh';
            refreshBtn.dataset.role = 'refresh';
            refreshBtn.textContent = labels().refreshQuestion;
            refreshActions.appendChild(refreshBtn);

            const startOverBtn = document.createElement('button');
            startOverBtn.type = 'button';
            startOverBtn.className = 'text-link-button';
            startOverBtn.dataset.role = 'start-over';
            startOverBtn.textContent = labels().startOver;
            refreshActions.appendChild(startOverBtn);
            block.appendChild(refreshActions);
        }

        if (step.multi && mode === 'active') {
            const actions = document.createElement('div');
            actions.className = 'interview-step__actions actions-row';
            const doneBtn = document.createElement('button');
            doneBtn.type = 'button';
            doneBtn.className = 'text-link-button text-link-button--primary';
            doneBtn.textContent = labels().done;
            doneBtn.disabled = true;
            doneBtn.dataset.role = 'done';
            actions.appendChild(doneBtn);
            block.appendChild(actions);
        }

        return block;
    }

    function updateStepContent(block: HTMLElement, step: InterviewStep, stepIndex: number) {
        const label = block.querySelector('.step-label');
        const stem = block.querySelector('.interview-step__stem');
        const hint = block.querySelector('.interview-step__hint');

        if (label) label.textContent = labels().question(stepIndex + 1, step.dimension);
        if (stem) fillInterviewLineWithGloss(stem as HTMLElement, step.stem, step.stemGloss, step.stemEn, locale);

        if (hint) {
            if (step.hint) {
                fillInterviewBilingual(hint as HTMLElement, step.hint, step.hintEn, locale);
                hint.hidden = false;
            } else {
                hint.textContent = '';
                hint.hidden = true;
            }
        } else if (step.hint) {
            const hintEl = document.createElement('p');
            hintEl.className = 'help-line interview-step__hint';
            fillInterviewBilingual(hintEl, step.hint, step.hintEn, locale);
            const optionsEl = block.querySelector('.interview-step__options');
            optionsEl?.before(hintEl);
        }
    }

    function removeContinueActions() {
        stackEl.querySelectorAll('[data-role="continue-delivery"]').forEach((el) => el.remove());
    }

    function renderContinueActions() {
        removeContinueActions();
        const lastStep = stackEl.querySelector<HTMLElement>('.interview-step:last-of-type');
        if (!lastStep) return;

        const row = document.createElement('div');
        row.className = 'interview-step__actions actions-row';
        row.dataset.role = 'continue-delivery';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'text-link-button text-link-button--primary';
        btn.textContent = labels().chooseDelivery;
        btn.addEventListener('click', () => navigateTo('/delivery'), { signal });
        row.appendChild(btn);
        lastStep.appendChild(row);
    }

    function bindStackActions() {
        stackEl.addEventListener(
            'click',
            (event) => {
                const startOverBtn = (event.target as HTMLElement).closest<HTMLButtonElement>(
                    '[data-role="start-over"]'
                );
                if (startOverBtn && !startOverBtn.disabled) {
                    performStartOver();
                    return;
                }

                const refreshBtn = (event.target as HTMLElement).closest<HTMLButtonElement>(
                    '[data-role="refresh"]'
                );
                if (!refreshBtn || refreshBtn.disabled) return;

                const block = refreshBtn.closest<HTMLElement>('.interview-step--active');
                if (!block || loading) return;

                const stepIndex = Number(block.dataset.stepIndex);
                if (Number.isNaN(stepIndex)) return;

                const step = steps[stepIndex];
                if (!step) return;

                void handleRefreshQuestion(step, stepIndex, block);
            },
            { signal }
        );
    }

    function setRefreshLoading(block: HTMLElement, active: boolean) {
        block.classList.toggle('is-refreshing', active);
        const refreshBtn = block.querySelector<HTMLButtonElement>('[data-role="refresh"]');
        const startOverBtn = block.querySelector<HTMLButtonElement>('[data-role="start-over"]');
        if (refreshBtn) {
            refreshBtn.disabled = active;
            refreshBtn.textContent = active ? labels().refreshingQuestion : labels().refreshQuestion;
        }
        if (startOverBtn) startOverBtn.disabled = active;
    }

    async function handleRefreshQuestion(step: InterviewStep, stepIndex: number, block: HTMLElement) {
        if (loading || !block.classList.contains('interview-step--active')) return;

        recordRejectedQuestion({
            stepId: step.id,
            stepIndex,
            stem: step.stem,
            dimension: step.dimension
        });

        if (step.multi) {
            const draft = getDraft();
            draft.m4 = undefined;
            saveDraft(draft);
        } else {
            const draft = getDraft();
            delete (draft as Record<string, unknown>)[step.id];
            saveDraft(draft);
        }

        loading = true;
        setRefreshLoading(block, true);

        try {
            const refreshed = await loadLlmStep(stepIndex, locale, true, interviewModelId, signal);
            if (!isActive()) return;
            const nextStep = refreshed ?? step;
            steps = [...steps];
            steps[stepIndex] = nextStep;
            updateStepContent(block, nextStep, stepIndex);
            renderOptions(block, nextStep, stepIndex);
        } finally {
            loading = false;
            setRefreshLoading(block, false);
        }
    }

    function renderOptions(
        block: HTMLElement,
        step: InterviewStep,
        stepIndex: number,
        animateOptions = false
    ) {
        const optionsEl = block.querySelector('.interview-step__options');
        const doneBtn = block.querySelector<HTMLButtonElement>('[data-role="done"]');
        if (!optionsEl) return;

        const draft = getDraft();
        optionsEl.innerHTML = '';

        if (step.multi) {
            const selected = getSelectedMulti(draft);
            const selectedIds = new Set(selected.map((o) => o.id));

            step.options.forEach((option) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chip-option';
                fillInterviewLineWithGloss(btn, option.label, option.gloss, option.labelEn, locale);
                if (selectedIds.has(option.id)) btn.classList.add('is-selected');

                btn.addEventListener(
                    'click',
                    () => {
                        if (loading) return;
                        void handleMultiToggle(step, stepIndex, option, block);
                    },
                    { signal }
                );

                optionsEl.appendChild(btn);
            });

            if (doneBtn) {
                doneBtn.disabled = selected.length === 0;
                const freshDone = doneBtn.cloneNode(true) as HTMLButtonElement;
                doneBtn.replaceWith(freshDone);
                freshDone.addEventListener(
                    'click',
                    () => {
                        if (loading || selected.length === 0) return;
                        void handleMultiDone(step, stepIndex, block);
                    },
                    { signal }
                );
            }
            if (animateOptions) staggerAppear(optionsEl, '.chip-option');
            return;
        }

        const selected = draft[step.id as keyof Draft] as InterviewOption | undefined;
        step.options.forEach((option) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chip-option';
            fillInterviewLineWithGloss(btn, option.label, option.gloss, option.labelEn, locale);
            if (selected?.id === option.id) btn.classList.add('is-selected');

            btn.addEventListener(
                'click',
                () => {
                    if (loading) return;
                    void handleSingleSelect(step, stepIndex, option, block);
                },
                { signal }
            );

            optionsEl.appendChild(btn);
        });

        if (animateOptions) staggerAppear(optionsEl, '.chip-option');
    }

    async function handleMultiToggle(
        step: InterviewStep,
        stepIndex: number,
        option: InterviewOption,
        block: HTMLElement
    ) {
        const draft = getDraft();
        let next = getSelectedMulti(draft);
        const selectedIds = new Set(next.map((o) => o.id));

        if (option.id === 'none') next = [option];
        else {
            next = next.filter((o) => o.id !== 'none');
            next = selectedIds.has(option.id)
                ? next.filter((o) => o.id !== option.id)
                : [...next, option];
        }

        draft.m4 = next;
        saveDraft(draft);
        renderOptions(block, step, stepIndex);
    }

    async function handleMultiDone(step: InterviewStep, stepIndex: number, block: HTMLElement) {
        const draft = getDraft();
        const selected = getSelectedMulti(draft);
        if (selected.length === 0) return;

        const completed = countCompletedSteps(draft);
        const hasDownstreamAnswers = stepIndex + 1 < completed;
        const committedIds = block.dataset.committedIds?.split(',').filter(Boolean) ?? [];
        const currentIds = selected.map((o) => o.id).sort();
        const selectionChanged =
            committedIds.length !== currentIds.length ||
            committedIds.sort().some((id, i) => id !== currentIds[i]);

        if (hasDownstreamAnswers && !selectionChanged) return;

        if (hasDownstreamAnswers && !window.confirm(labels().changeConfirm)) return;

        if (hasDownstreamAnswers) {
            clearAnswersFromIndex(draft, stepIndex + 1);
            truncateLlmSteps(stepIndex + 1);
            saveDraft(draft);
            await renderStack();
            await advanceFromStep(stepIndex);
            return;
        }

        demoteStepToAnswered(block);
        block.dataset.committedIds = currentIds.join(',');
        await advanceFromStep(stepIndex);
    }

    function optionForAnswer(option: InterviewOption): InterviewOption {
        const answer: InterviewOption = {
            id: option.id,
            label: combineLabelWithGloss(option.label, option.gloss, locale)
        };
        if (locale === 'zh' && option.labelEn) {
            answer.labelEn = combineLabelWithGloss(
                option.labelEn,
                option.glossEn,
                'en'
            );
        }
        return answer;
    }

    async function handleSingleSelect(
        step: InterviewStep,
        stepIndex: number,
        option: InterviewOption,
        block: HTMLElement
    ) {
        const draft = getDraft();
        const previous = draft[step.id as keyof Draft] as InterviewOption | undefined;
        if (previous?.id === option.id) return;

        const completed = countCompletedSteps(draft);
        const isRetro = stepIndex < completed;

        if (isRetro && !window.confirm(labels().changeConfirm)) return;

        (draft as Record<string, InterviewOption>)[step.id] = optionForAnswer(option);
        if (isRetro) clearAnswersFromIndex(draft, stepIndex + 1);
        if (isRetro) truncateLlmSteps(stepIndex + 1);
        saveDraft(draft);

        if (isRetro) {
            await renderStack();
            await advanceFromStep(stepIndex);
            return;
        }

        demoteStepToAnswered(block);
        block.dataset.committedIds = option.id;
        renderOptions(block, step, stepIndex);
        await advanceFromStep(stepIndex);
    }

    async function advanceFromStep(stepIndex: number) {
        if (loading) return;
        loading = true;

        try {
            const nextIndex = stepIndex + 1;
            if (nextIndex >= INTERVIEW_STEP_COUNT) {
                finishInterview();
                return;
            }

            const loadingEl = createLoadingBlock();
            stackEl.appendChild(loadingEl);
            loadingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            const nextStep = await loadLlmStep(nextIndex, locale, false, interviewModelId, signal);
            if (!isActive()) return;
            dismissLoading();

            if (!nextStep) {
                loadingEl.remove();
                return;
            }

            const block = createStepBlock(nextStep, nextIndex, 'active');
            renderOptions(block, nextStep, nextIndex, true);
            swapLoadingForStep(loadingEl, block);
            loading = false;
            block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } finally {
            loading = false;
            dismissLoading();
        }
    }

    async function renderStack(fullReset = false) {
        if (fullReset) {
            stackEl.innerHTML = '';
        } else {
            stackEl
                .querySelectorAll('.interview-step, .interview-loading')
                .forEach((el) => el.remove());
            removeContinueActions();
        }
        const draft = getDraft();
        const completed = countCompletedSteps(draft);
        const allComplete = isInterviewComplete(draft);

        for (let i = 0; i < completed; i += 1) {
            let step = steps[i];
            if (!step) {
                step = await loadLlmStep(i, locale, false, interviewModelId, signal);
                if (!isActive()) return;
                steps = resolveStepsForLocale(locale);
                step = steps[i];
            }
            if (!step) continue;

            const block = createStepBlock(step, i, 'answered');
            if (step.multi) {
                const selected = getSelectedMulti(draft);
                block.dataset.committedIds = selected.map((o) => o.id).join(',');
            } else {
                const selected = draft[step.id as keyof Draft] as InterviewOption | undefined;
                if (selected) block.dataset.committedIds = selected.id;
            }
            stackEl.appendChild(block);
            renderOptions(block, step, i);
        }

        if (allComplete) renderContinueActions();
    }

    async function ensureActiveQuestion() {
        const draft = getDraft();
        const completed = countCompletedSteps(draft);

        if (isInterviewComplete(draft)) return;

        const hasActive = stackEl.querySelector('.interview-step--active');
        if (hasActive) return;

        loading = true;
        const loadingEl = prepareLoadingBlock();
        loadingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try {
            const activeStep = await loadLlmStep(completed, locale, false, interviewModelId, signal);
            if (!isActive()) return;
            steps = resolveStepsForLocale(locale);
            const block = createStepBlock(activeStep, completed, 'active');
            renderOptions(block, activeStep, completed, true);
            swapLoadingForStep(loadingEl, block);
        } catch (error) {
            if (!isActive()) return;
            loadingEl.remove();
            dismissLoading();
            const message = interviewLoadError(error, locale);
            const err = document.createElement('p');
            err.className = 'help-line';
            err.textContent = message;
            stackEl.appendChild(err);
        } finally {
            loading = false;
            dismissLoading();
        }
    }

    document.addEventListener(
        'locale-changed',
        (event) => {
            const detail = (event as CustomEvent<{ locale: Locale }>).detail;
            if (!detail?.locale || detail.locale === locale) return;
            locale = detail.locale;
            steps = resolveStepsForLocale(locale);
            void renderStack().then(() => {
                if (!isActive()) return;
                return ensureActiveQuestion();
            });
        },
        { signal }
    );

    document.addEventListener(
        'interview-algorithm-mode-changed',
        () => {
            clearDraft();
            clearRejectedQuestions();
            clearLlmSteps();
            steps = resolveStepsForLocale(locale);
            void renderStack(true).then(() => {
                if (!isActive()) return;
                return ensureActiveQuestion();
            });
        },
        { signal }
    );

    document.addEventListener(
        'interview-model-changed',
        async () => {
            interviewModelId = (await resolveInterviewModelId(signal)) ?? interviewModelId;
            clearDraft();
            clearRejectedQuestions();
            clearLlmSteps();
            steps = resolveStepsForLocale(locale);
            void renderStack(true).then(() => {
                if (!isActive()) return;
                return ensureActiveQuestion();
            });
        },
        { signal }
    );

    bindStackActions();

    restoreDraftFromSessionIfNeeded();

    void renderStack().then(() => {
        if (!isActive()) return;
        return ensureActiveQuestion();
    });
}
