import type { InterviewAnswers, InterviewOption } from '../lib/types';
import type { InterviewStep } from '../lib/interview-meta';
import { WIZARD_LABELS } from '../lib/interview-meta';
import { fetchInterviewNext } from '../lib/interview-api';
import {
    bilingualStepToDisplay,
    fillInterviewBilingual,
    fillInterviewLineWithGloss,
    type BilingualInterviewStep
} from '../lib/interview-i18n';
import { combineLabelWithGloss } from '../lib/interview-label';
import {
    buildPriorAnswersBeforeStep,
    countCompletedSteps,
    clearAnswersFromIndex,
    getSelectedMulti,
    hasOrphanDraftAnswers,
    isInterviewComplete,
    isStepIdComplete,
    multiSelectionMatches,
    optionMatchesAnswer,
    type Draft
} from '../lib/interview-draft';
import {
    clearAnsweredSteps,
    clearLlmSteps,
    pinAnsweredStep,
    readAnsweredSteps,
    readLlmSteps,
    truncateAnsweredSteps,
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
import { applyLocaleToDocument, readLocale, type Locale } from '../lib/locale';
import { localizeApiError } from '../lib/localized-errors';
import { safeSessionGet, safeSessionRemove, safeSessionSet } from '../lib/session-storage';
import { DRAFT_KEY, SESSION_KEY } from '../lib/session-keys';
import { readStoredInterviewAnswers } from '../lib/session-answers';
import { performStartOver } from '../lib/start-over';
import {
    readInterviewStepIds,
    writeInterviewStepIds,
    readPlannerState,
    writePlannerState,
    interviewStepCount,
    clearInterviewSessionMeta
} from '../lib/interview-session';
import {
    clearInterviewFallbackState,
    isInterviewHardFailure,
    redirectToInterviewFallback
} from '../lib/interview-fallback';
import { navigateTo } from '../lib/navigate';
import { staggerAppear } from '../lib/motion';

const abortByRoot = new WeakMap<HTMLElement, AbortController>();
let wizardSession = 0;

function getDraft(): Draft {
    try {
        const raw = safeSessionGet(DRAFT_KEY);
        return raw ? (JSON.parse(raw) as Draft) : {};
    } catch {
        return {};
    }
}

function clearDraft() {
    safeSessionRemove(DRAFT_KEY);
}

function displayStepFromCache(stepIndex: number, locale: Locale): InterviewStep | null {
    const answered = readAnsweredSteps()[stepIndex];
    if (answered) {
        return bilingualStepToDisplay(answered, locale) as InterviewStep;
    }
    const cached = readLlmSteps()[stepIndex];
    if (!cached) return null;
    return bilingualStepToDisplay(cached, locale) as InterviewStep;
}

function stepIds(): string[] {
    return readInterviewStepIds();
}

function backfillAnsweredSnapshots(draft: Draft) {
    const ids = stepIds();
    const completed = countCompletedSteps(draft, ids);
    for (let i = 0; i < completed; i += 1) {
        if (readAnsweredSteps()[i]) continue;
        const llm = readLlmSteps()[i];
        if (llm) pinAnsweredStep(i, llm);
    }
}

function prepareDraftOnInit(): Draft {
    let draft = getDraft();
    const ids = stepIds();
    if (hasOrphanDraftAnswers(draft, ids)) {
        clearDraft();
        draft = {};
    }
    if (countCompletedSteps(draft, ids) === 0) {
        const stored = readStoredInterviewAnswers();
        if (stored) {
            safeSessionSet(DRAFT_KEY, JSON.stringify(stored));
            draft = stored;
        }
    }
    backfillAnsweredSnapshots(draft);
    return draft;
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

function tryRedirectInterviewFallback(error: unknown, stepIndex: number, stepId?: string): boolean {
    if (!isInterviewHardFailure(error)) return false;
    const ids = stepIds();
    redirectToInterviewFallback({
        failedStepIndex: stepIndex,
        failedStepId: stepId ?? ids[stepIndex] ?? 'm1'
    });
    return true;
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
    const stepLoadGen: number[] = [];
    const lastFetchedBilingual = new Map<number, BilingualInterviewStep>();
    let storageErrorShown = false;

    async function dismissLoading() {
        const handle = activeLoading;
        activeLoading = null;
        await handle?.stop();
    }

    function resolveStepsForLocale(nextLocale: Locale): InterviewStep[] {
        const cached = readLlmSteps();
        return cached.map((step) => bilingualStepToDisplay(step, nextLocale) as InterviewStep);
    }

    function labels() {
        return WIZARD_LABELS[locale];
    }

    function showStorageError() {
        if (storageErrorShown) return;
        storageErrorShown = true;
        const err = document.createElement('p');
        err.className = 'help-line';
        err.dataset.role = 'storage-error';
        err.textContent = labels().storageError;
        stackEl.appendChild(err);
    }

    function saveDraft(draft: Draft): boolean {
        const ok = safeSessionSet(DRAFT_KEY, JSON.stringify(draft));
        if (!ok) showStorageError();
        return ok;
    }

    function pinAnsweredStepToCache(stepIndex: number) {
        const bilingual =
            readLlmSteps()[stepIndex] ?? lastFetchedBilingual.get(stepIndex) ?? null;
        if (!bilingual) {
            if (import.meta.env.DEV) {
                console.warn(`[interview] no bilingual step to pin at index ${stepIndex}`);
            }
            return;
        }
        if (!pinAnsweredStep(stepIndex, bilingual)) showStorageError();
    }

    function appendResumeUnavailableNotice(stepIndex: number) {
        const block = document.createElement('article');
        block.className = 'interview-step interview-step--answered';
        block.dataset.stepIndex = String(stepIndex);
        const notice = document.createElement('p');
        notice.className = 'help-line';
        notice.textContent = labels().resumeUnavailable;
        block.appendChild(notice);
        stackEl.appendChild(block);
    }

    function draftHasAnswerAt(stepIndex: number, draft: Draft): boolean {
        const stepId = stepIds()[stepIndex];
        if (!stepId) return false;
        return isStepIdComplete(stepId, draft);
    }

    async function loadLlmStep(
        stepIndex: number,
        refresh: boolean,
        modelId: string | undefined
    ): Promise<InterviewStep> {
        if (!refresh) {
            const cached = readLlmSteps()[stepIndex];
            if (cached) {
                lastFetchedBilingual.set(stepIndex, cached);
                return bilingualStepToDisplay(cached, locale) as InterviewStep;
            }
        }

        const gen = (stepLoadGen[stepIndex] ?? 0) + 1;
        stepLoadGen[stepIndex] = gen;

        const draft = getDraft();
        const ids = stepIds();
        const response = await fetchInterviewNext({
            stepIndex,
            priorAnswers: buildPriorAnswersBeforeStep(draft, stepIndex, ids),
            rejectedStems: rejectedStemsForStep(ids[stepIndex] ?? 'm1'),
            refresh,
            model: modelId,
            algorithmMode: readInterviewAlgorithmMode(),
            plannerState: readPlannerState(),
            signal
        });

        if (signal.aborted || stepLoadGen[stepIndex] !== gen) {
            throw new DOMException('Aborted', 'AbortError');
        }

        writeInterviewStepIds(response.stepIds);
        writePlannerState(response.plannerState);
        clearInterviewFallbackState();

        lastFetchedBilingual.set(stepIndex, response.step);
        if (!upsertLlmStep(stepIndex, response.step)) showStorageError();
        return bilingualStepToDisplay(response.step, locale) as InterviewStep;
    }

    function finishInterview() {
        const draft = getDraft();
        const answers: InterviewAnswers = {
            m1: draft.m1!,
            m2: draft.m2!,
            m3: draft.m3!,
            m4: draft.m4!
        };
        if (draft.m_clarify) answers.m_clarify = draft.m_clarify;
        if (draft.m5) answers.m5 = draft.m5;
        if (!safeSessionSet(SESSION_KEY, JSON.stringify(answers))) {
            showStorageError();
            return;
        }
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
            if (!saveDraft(draft)) return;
        } else {
            const draft = getDraft();
            delete (draft as Record<string, unknown>)[step.id];
            if (!saveDraft(draft)) return;
        }
        truncateAnsweredSteps(stepIndex);

        loading = true;
        setRefreshLoading(block, true);

        try {
            const refreshed = await loadLlmStep(stepIndex, true, interviewModelId);
            if (!isActive()) return;
            const nextStep = refreshed ?? step;
            steps = [...steps];
            steps[stepIndex] = nextStep;
            updateStepContent(block, nextStep, stepIndex);
            renderOptions(block, nextStep, stepIndex);
        } catch (error) {
            if (!isActive()) return;
            const ids = stepIds();
            if (tryRedirectInterviewFallback(error, stepIndex, step.id ?? ids[stepIndex])) return;
            const err = document.createElement('p');
            err.className = 'help-line';
            err.textContent = interviewLoadError(error, locale);
            block.appendChild(err);
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
            const selectedIds = multiSelectionMatches(step.options, selected, locale);

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
            if (selected && optionMatchesAnswer(option, selected, locale)) {
                btn.classList.add('is-selected');
            }

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
        if (!saveDraft(draft)) return;
        renderOptions(block, step, stepIndex);
    }

    async function handleMultiDone(step: InterviewStep, stepIndex: number, block: HTMLElement) {
        const draft = getDraft();
        const selected = getSelectedMulti(draft);
        if (selected.length === 0) return;

        const ids = stepIds();
        const completed = countCompletedSteps(draft, ids);
        const hasDownstreamAnswers = stepIndex + 1 < completed;
        const committedIds = block.dataset.committedIds?.split(',').filter(Boolean) ?? [];
        const currentIds = selected.map((o) => o.id).sort();
        const selectionChanged =
            committedIds.length !== currentIds.length ||
            committedIds.sort().some((id, i) => id !== currentIds[i]);

        if (hasDownstreamAnswers && !selectionChanged) return;

        if (hasDownstreamAnswers && !window.confirm(labels().changeConfirm)) return;

        if (hasDownstreamAnswers) {
            clearAnswersFromIndex(draft, stepIndex + 1, ids);
            truncateLlmSteps(stepIndex + 1);
            truncateAnsweredSteps(stepIndex + 1);
            if (!saveDraft(draft)) return;
            await renderStack();
            await advanceFromStep(stepIndex);
            return;
        }

        demoteStepToAnswered(block);
        block.dataset.committedIds = currentIds.join(',');
        pinAnsweredStepToCache(stepIndex);
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

        const ids = stepIds();
        const completed = countCompletedSteps(draft, ids);
        const isRetro = stepIndex < completed;

        if (isRetro && !window.confirm(labels().changeConfirm)) return;

        (draft as Record<string, InterviewOption>)[step.id] = optionForAnswer(option);
        if (isRetro) clearAnswersFromIndex(draft, stepIndex + 1, ids);
        if (isRetro) truncateLlmSteps(stepIndex + 1);
        if (isRetro) truncateAnsweredSteps(stepIndex + 1);
        if (!saveDraft(draft)) return;
        pinAnsweredStepToCache(stepIndex);

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
            if (nextIndex >= interviewStepCount()) {
                finishInterview();
                return;
            }

            const loadingEl = createLoadingBlock();
            stackEl.appendChild(loadingEl);
            loadingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            const nextStep = await loadLlmStep(nextIndex, false, interviewModelId);
            if (!isActive()) return;
            await dismissLoading();

            if (!nextStep) {
                loadingEl.remove();
                return;
            }

            const block = createStepBlock(nextStep, nextIndex, 'active');
            renderOptions(block, nextStep, nextIndex, true);
            swapLoadingForStep(loadingEl, block);
            block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            if (!isActive()) return;
            stackEl.querySelector('.interview-loading')?.remove();
            await dismissLoading();
            const ids = stepIds();
            if (tryRedirectInterviewFallback(error, nextIndex, ids[nextIndex])) return;
            const message = interviewLoadError(error, locale);
            const err = document.createElement('p');
            err.className = 'help-line';
            err.textContent = message;
            stackEl.appendChild(err);
        } finally {
            loading = false;
            await dismissLoading();
        }
    }

    function relocalizeStackInPlace() {
        stackEl.querySelectorAll<HTMLElement>('.interview-step').forEach((block) => {
            const stepIndex = Number(block.dataset.stepIndex);
            if (Number.isNaN(stepIndex)) return;

            const step = displayStepFromCache(stepIndex, locale);
            if (!step) return;

            const isActive = block.classList.contains('interview-step--active');
            updateStepContent(block, step, stepIndex);
            renderOptions(block, step, stepIndex, false);
            if (isActive) {
                block.classList.add('interview-step--active');
            }
        });
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
        const ids = stepIds();
        const completed = countCompletedSteps(draft, ids);
        const allComplete = isInterviewComplete(draft, ids);

        for (let i = 0; i < completed; i += 1) {
            let step = displayStepFromCache(i, locale) ?? steps[i];
            if (!step) {
                const draftAt = getDraft();
                if (draftHasAnswerAt(i, draftAt)) {
                    appendResumeUnavailableNotice(i);
                    continue;
                }
                try {
                    step = await loadLlmStep(i, false, interviewModelId);
                } catch (error) {
                    if (!isActive()) return;
                    const ids = stepIds();
                    if (tryRedirectInterviewFallback(error, i, ids[i])) return;
                    throw error;
                }
                if (!isActive()) return;
                steps = resolveStepsForLocale(locale);
                step = displayStepFromCache(i, locale) ?? steps[i];
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

        if (!allComplete) {
            const activeIndex = completed;
            const activeStep = displayStepFromCache(activeIndex, locale);
            if (activeStep) {
                const block = createStepBlock(activeStep, activeIndex, 'active');
                renderOptions(block, activeStep, activeIndex, false);
                stackEl.appendChild(block);
            }
        }
    }

    async function ensureActiveQuestion() {
        const draft = getDraft();
        const ids = stepIds();
        const completed = countCompletedSteps(draft, ids);

        if (isInterviewComplete(draft, ids)) return;

        const hasActive = stackEl.querySelector('.interview-step--active');
        if (hasActive) return;

        loading = true;
        const loadingEl = prepareLoadingBlock();
        loadingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try {
            const activeStep = await loadLlmStep(completed, false, interviewModelId);
            if (!isActive()) return;
            await dismissLoading();
            steps = resolveStepsForLocale(locale);
            const block = createStepBlock(activeStep, completed, 'active');
            renderOptions(block, activeStep, completed, true);
            swapLoadingForStep(loadingEl, block);
        } catch (error) {
            if (!isActive()) return;
            loadingEl.remove();
            await dismissLoading();
            const ids = stepIds();
            if (tryRedirectInterviewFallback(error, completed, ids[completed])) return;
            const message = interviewLoadError(error, locale);
            const err = document.createElement('p');
            err.className = 'help-line';
            err.textContent = message;
            stackEl.appendChild(err);
        } finally {
            loading = false;
            await dismissLoading();
        }
    }

    document.addEventListener(
        'locale-changed',
        (event) => {
            const detail = (event as CustomEvent<{ locale: Locale }>).detail;
            if (!detail?.locale || detail.locale === locale) return;
            locale = detail.locale;
            steps = resolveStepsForLocale(locale);
            applyLocaleToDocument(locale);
            relocalizeStackInPlace();
        },
        { signal }
    );

    document.addEventListener(
        'interview-algorithm-mode-changed',
        () => {
            clearDraft();
            clearRejectedQuestions();
            clearLlmSteps();
            clearAnsweredSteps();
            clearInterviewSessionMeta();
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
            clearAnsweredSteps();
            clearInterviewSessionMeta();
            steps = resolveStepsForLocale(locale);
            void renderStack(true).then(() => {
                if (!isActive()) return;
                return ensureActiveQuestion();
            });
        },
        { signal }
    );

    bindStackActions();

    prepareDraftOnInit();

    void renderStack().then(() => {
        if (!isActive()) return;
        return ensureActiveQuestion();
    });
}
