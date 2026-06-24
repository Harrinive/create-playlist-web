import type { InterviewAnswers, InterviewOption } from '../lib/types';
import type { InterviewStep } from '../lib/interview-questions';
import { WIZARD_LABELS, getInterviewSteps, INTERVIEW_STEP_COUNT, INTERVIEW_STEP_IDS } from '../lib/interview-questions';
import { fetchInterviewNext } from '../lib/interview-api';
import { bilingualStepToDisplay, fillInterviewBilingual } from '../lib/interview-i18n';
import {
    clearLlmSteps,
    readLlmSteps,
    truncateLlmSteps,
    upsertLlmStep
} from '../lib/interview-llm-cache';
import { isApiConfigured } from '../lib/api-config';
import { isLlmInterviewModel, readInterviewModel } from '../lib/interview-model';
import {
    clearRejectedQuestions,
    recordRejectedQuestion,
    rejectedStemsForStep
} from '../lib/interview-refresh';
import { readLocale, type Locale } from '../lib/locale';
import { SESSION_KEY } from '../lib/types';

type Draft = Partial<InterviewAnswers>;
type StepsByLocale = Record<Locale, InterviewStep[]>;

const DRAFT_KEY = `${SESSION_KEY}-draft`;
const MIN_LOADING_MS = 450;

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

function getSelectedMulti(draft: Draft): InterviewOption[] {
    return Array.isArray(draft.m4) ? draft.m4 : [];
}

function isStepComplete(step: InterviewStep, draft: Draft): boolean {
    if (step.multi) return getSelectedMulti(draft).length > 0;
    return Boolean(draft[step.id as keyof Draft]);
}

function countCompletedSteps(steps: InterviewStep[], draft: Draft): number {
    let count = 0;
    for (const step of steps) {
        if (!isStepComplete(step, draft)) break;
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

function useLlmInterview(): boolean {
    return isLlmInterviewModel() && isApiConfigured();
}

function staticSteps(locale: Locale): InterviewStep[] {
    return getInterviewSteps(locale);
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
    refresh: boolean
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
        refresh
    });

    upsertLlmStep(stepIndex, response.step);
    return bilingualStepToDisplay(response.step, locale) as InterviewStep;
}

async function resolveNextStep(
    steps: InterviewStep[],
    stepIndex: number,
    locale: Locale
): Promise<InterviewStep | null> {
    if (useLlmInterview()) {
        return loadLlmStep(stepIndex, locale, false);
    }
    return refreshActiveStep(steps, stepIndex);
}

async function refreshActiveStep(
    steps: InterviewStep[],
    stepIndex: number,
    locale: Locale
): Promise<InterviewStep | null> {
    const step = steps[stepIndex];
    if (!step) return null;

    if (useLlmInterview()) {
        return loadLlmStep(stepIndex, locale, true);
    }

    const rejectedStems = rejectedStemsForStep(step.id);
    void readInterviewModel();
    void rejectedStems;
    await new Promise((resolve) => window.setTimeout(resolve, MIN_LOADING_MS));
    return step;
}

export function initInterviewWizard(stepsByLocale: StepsByLocale) {
    const root = document.getElementById('interview-wizard');
    const stackEl = document.getElementById('interview-stack');
    if (!root || !stackEl) return;

    abortByRoot.get(root)?.abort();
    const controller = new AbortController();
    abortByRoot.set(root, controller);
    const { signal } = controller;
    const session = ++wizardSession;

    function isActive(): boolean {
        return wizardSession === session && abortByRoot.get(root) === controller;
    }

    let locale: Locale = readLocale();
    let steps = resolveStepsForLocale(locale);
    let loading = false;

    function resolveStepsForLocale(nextLocale: Locale): InterviewStep[] {
        if (useLlmInterview()) {
            const cached = readLlmSteps();
            return cached.map((step) => bilingualStepToDisplay(step, nextLocale) as InterviewStep);
        }
        return stepsByLocale[nextLocale] ?? staticSteps(nextLocale);
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
        clearDraft();
        clearRejectedQuestions();
        clearLlmSteps();
        window.location.assign('/delivery');
    }

    function createLoadingBlock(): HTMLElement {
        const block = document.createElement('div');
        block.className = 'interview-loading';
        block.innerHTML = `
            <p class="interview-loading__text">${labels().pleaseWait}</p>
            <p class="interview-loading__hint">${labels().preparingQuestion}</p>
        `;
        return block;
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
        fillInterviewBilingual(stem, step.stem, step.stemEn, locale);

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
            refreshBtn.innerHTML = `<span class="interview-step__refresh-icon" aria-hidden="true">↻</span><span>${labels().refreshQuestion}</span>`;
            refreshActions.appendChild(refreshBtn);
            block.appendChild(refreshActions);
        }

        if (step.multi) {
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
        if (stem) fillInterviewBilingual(stem as HTMLElement, step.stem, step.stemEn, locale);

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

    function bindStackActions() {
        stackEl.addEventListener(
            'click',
            (event) => {
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
        if (!refreshBtn) return;
        refreshBtn.disabled = active;
        const label = refreshBtn.querySelector('span:last-child');
        if (label) {
            label.textContent = active ? labels().refreshingQuestion : labels().refreshQuestion;
        }
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
            const refreshed = await refreshActiveStep(steps, stepIndex, locale);
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

    function renderOptions(block: HTMLElement, step: InterviewStep, stepIndex: number) {
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
                fillInterviewBilingual(btn, option.label, option.labelEn, locale);
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
            return;
        }

        const selected = draft[step.id as keyof Draft] as InterviewOption | undefined;
        step.options.forEach((option) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chip-option';
            fillInterviewBilingual(btn, option.label, option.labelEn, locale);
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

        const completed = countCompletedSteps(steps, draft);
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
            if (useLlmInterview()) truncateLlmSteps(stepIndex + 1);
            saveDraft(draft);
            await renderStack();
            await advanceFromStep(stepIndex);
            return;
        }

        block.classList.remove('interview-step--active');
        block.classList.add('interview-step--answered');
        block.dataset.committedIds = currentIds.join(',');
        await advanceFromStep(stepIndex);
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

        const completed = countCompletedSteps(steps, draft);
        const isRetro = stepIndex < completed;

        if (isRetro && !window.confirm(labels().changeConfirm)) return;

        (draft as Record<string, InterviewOption>)[step.id] = option;
        if (isRetro) clearAnswersFromIndex(draft, stepIndex + 1);
        if (isRetro && useLlmInterview()) truncateLlmSteps(stepIndex + 1);
        saveDraft(draft);

        if (isRetro) {
            await renderStack();
            await advanceFromStep(stepIndex);
            return;
        }

        block.classList.remove('interview-step--active');
        block.classList.add('interview-step--answered');
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

            const nextStep = await resolveNextStep(steps, nextIndex, locale);
            if (!isActive()) return;
            loadingEl.remove();

            if (!nextStep) return;

            const block = createStepBlock(nextStep, nextIndex, 'active');
            stackEl.appendChild(block);
            loading = false;
            renderOptions(block, nextStep, nextIndex);
            block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } finally {
            loading = false;
        }
    }

    async function renderStack() {
        stackEl.innerHTML = '';
        const draft = getDraft();
        const completed = countCompletedSteps(steps, draft);

        if (completed >= INTERVIEW_STEP_COUNT) {
            finishInterview();
            return;
        }

        for (let i = 0; i < completed; i += 1) {
            const step = steps[i];
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
    }

    async function ensureActiveQuestion() {
        const draft = getDraft();
        const completed = countCompletedSteps(steps, draft);

        if (completed >= INTERVIEW_STEP_COUNT) {
            finishInterview();
            return;
        }

        const hasTail = stackEl.querySelector('.interview-step--active, .interview-loading');
        if (hasTail) return;

        if (useLlmInterview()) {
            loading = true;
            const loadingEl = createLoadingBlock();
            stackEl.appendChild(loadingEl);
            loadingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            try {
                const activeStep = await loadLlmStep(completed, locale, false);
                if (!isActive()) return;
                steps = resolveStepsForLocale(locale);
                loadingEl.remove();
                const block = createStepBlock(activeStep, completed, 'active');
                stackEl.appendChild(block);
                renderOptions(block, activeStep, completed);
            } catch (error) {
                if (!isActive()) return;
                loadingEl.remove();
                const message =
                    error instanceof Error ? error.message : 'Could not load question';
                const err = document.createElement('p');
                err.className = 'help-line';
                err.textContent = message;
                stackEl.appendChild(err);
            } finally {
                loading = false;
            }
            return;
        }

        const activeStep = steps[completed];
        const block = createStepBlock(activeStep, completed, 'active');
        stackEl.appendChild(block);
        renderOptions(block, activeStep, completed);
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
        'interview-model-changed',
        () => {
            clearDraft();
            clearRejectedQuestions();
            clearLlmSteps();
            stackEl.innerHTML = '';
            steps = resolveStepsForLocale(locale);
            void renderStack().then(() => {
                if (!isActive()) return;
                return ensureActiveQuestion();
            });
        },
        { signal }
    );

    bindStackActions();

    void renderStack().then(() => {
        if (!isActive()) return;
        return ensureActiveQuestion();
    });
}
