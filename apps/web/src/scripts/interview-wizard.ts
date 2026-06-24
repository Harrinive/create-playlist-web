import type { InterviewAnswers, InterviewOption } from '../lib/types';
import type { InterviewStep } from '../lib/interview-questions';
import { WIZARD_LABELS, getInterviewSteps } from '../lib/interview-questions';
import { readInterviewModel } from '../lib/interview-model';
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

function clearAnswersFromIndex(draft: Draft, steps: InterviewStep[], fromIndex: number) {
    for (let i = fromIndex; i < steps.length; i += 1) {
        const step = steps[i];
        if (step.multi) draft.m4 = undefined;
        else delete (draft as Record<string, unknown>)[step.id];
    }
}

async function resolveNextStep(steps: InterviewStep[], stepIndex: number): Promise<InterviewStep | null> {
    return refreshActiveStep(steps, stepIndex);
}

async function refreshActiveStep(steps: InterviewStep[], stepIndex: number): Promise<InterviewStep | null> {
    const step = steps[stepIndex];
    if (!step) return null;

    const rejectedStems = rejectedStemsForStep(step.id);
    void readInterviewModel();
    void rejectedStems;
    // Phase 4: POST /api/interview/next with prior answers + differentFrom rejected stems.
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

    let locale: Locale = readLocale();
    let steps = stepsByLocale[locale] ?? getInterviewSteps(locale);
    let loading = false;

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
        stem.textContent = step.stem;

        block.append(header, stem);

        if (step.hint) {
            const hint = document.createElement('p');
            hint.className = 'help-line interview-step__hint';
            hint.textContent = step.hint;
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
        if (stem) stem.textContent = step.stem;

        if (hint) {
            if (step.hint) {
                hint.textContent = step.hint;
                hint.hidden = false;
            } else {
                hint.textContent = '';
                hint.hidden = true;
            }
        } else if (step.hint) {
            const hintEl = document.createElement('p');
            hintEl.className = 'help-line interview-step__hint';
            hintEl.textContent = step.hint;
            const optionsEl = block.querySelector('.interview-step__options');
            optionsEl?.before(hintEl);
        }
    }

    function bindRefreshButton(block: HTMLElement, step: InterviewStep, stepIndex: number) {
        const btn = block.querySelector<HTMLButtonElement>('[data-role="refresh"]');
        if (!btn || btn.dataset.bound === 'true') return;
        btn.dataset.bound = 'true';
        btn.addEventListener(
            'click',
            () => {
                if (loading) return;
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
            const refreshed = await refreshActiveStep(steps, stepIndex);
            const nextStep = refreshed ?? step;
            steps = [...steps];
            steps[stepIndex] = nextStep;
            updateStepContent(block, nextStep, stepIndex);
            renderOptions(block, nextStep, stepIndex);
            bindRefreshButton(block, nextStep, stepIndex);
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
                btn.textContent = option.label;
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
            bindRefreshButton(block, step, stepIndex);
            return;
        }

        const selected = draft[step.id as keyof Draft] as InterviewOption | undefined;
        step.options.forEach((option) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chip-option';
            btn.textContent = option.label;
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

        bindRefreshButton(block, step, stepIndex);
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
            clearAnswersFromIndex(draft, steps, stepIndex + 1);
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
        if (isRetro) clearAnswersFromIndex(draft, steps, stepIndex + 1);
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
            if (nextIndex >= steps.length) {
                finishInterview();
                return;
            }

            const loadingEl = createLoadingBlock();
            stackEl.appendChild(loadingEl);
            loadingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            const nextStep = await resolveNextStep(steps, nextIndex);
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

        if (completed >= steps.length) {
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

    function ensureActiveQuestion() {
        const draft = getDraft();
        const completed = countCompletedSteps(steps, draft);

        if (completed >= steps.length) {
            finishInterview();
            return;
        }

        const hasTail = stackEl.querySelector('.interview-step--active, .interview-loading');
        if (hasTail) return;

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
            steps = stepsByLocale[locale] ?? getInterviewSteps(locale);
            void renderStack().then(() => ensureActiveQuestion());
        },
        { signal }
    );

    document.addEventListener(
        'interview-model-changed',
        () => {
            clearDraft();
            clearRejectedQuestions();
            stackEl.innerHTML = '';
            void renderStack().then(() => ensureActiveQuestion());
        },
        { signal }
    );

    void renderStack().then(() => ensureActiveQuestion());
}
