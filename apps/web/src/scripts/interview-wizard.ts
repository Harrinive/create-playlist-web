import type { InterviewAnswers, InterviewOption } from '../lib/types';
import type { InterviewStep } from '../lib/interview-questions';
import { WIZARD_LABELS, getInterviewSteps } from '../lib/interview-questions';
import { readLocale, type Locale } from '../lib/locale';
import { SESSION_KEY } from '../lib/types';

type Draft = Partial<InterviewAnswers>;
type StepsByLocale = Record<Locale, InterviewStep[]>;

const DRAFT_KEY = `${SESSION_KEY}-draft`;
const STEP_KEY = `${SESSION_KEY}-wizard-step`;

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

function getStepIndex(root: HTMLElement): number {
    const raw = root.dataset.stepIndex;
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function setStepIndex(root: HTMLElement, index: number) {
    root.dataset.stepIndex = String(index);
}

export function initInterviewWizard(stepsByLocale: StepsByLocale) {
    const root = document.getElementById('interview-wizard');
    if (!root) return;

    const stemEl = document.getElementById('step-stem');
    const hintEl = document.getElementById('step-hint');
    const dimensionEl = document.getElementById('step-dimension');
    const optionsEl = document.getElementById('step-options');
    const backBtn = document.getElementById('step-back') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('step-next') as HTMLButtonElement | null;
    const dotsEl = document.getElementById('step-dots');

    if (!stemEl || !dimensionEl || !optionsEl || !backBtn || !nextBtn || !dotsEl) return;

    abortByRoot.get(root)?.abort();
    const controller = new AbortController();
    abortByRoot.set(root, controller);
    const { signal } = controller;

    let locale: Locale = readLocale();
    let steps = stepsByLocale[locale] ?? getInterviewSteps(locale);

    function getSelectedSingle(stepId: string): InterviewOption | undefined {
        const draft = getDraft();
        const key = stepId as keyof Draft;
        const value = draft[key];
        if (value && !Array.isArray(value)) return value as InterviewOption;
        return undefined;
    }

    function getSelectedMulti(): InterviewOption[] {
        const draft = getDraft();
        return Array.isArray(draft.m4) ? draft.m4 : [];
    }

    function isStepComplete(step: InterviewStep): boolean {
        if (step.multi) return getSelectedMulti().length > 0;
        return Boolean(getSelectedSingle(step.id));
    }

    function updateNextButton() {
        const stepIndex = getStepIndex(root);
        const step = steps[stepIndex];
        const labels = WIZARD_LABELS[locale];
        nextBtn.disabled = !isStepComplete(step);
        nextBtn.textContent = stepIndex === steps.length - 1 ? labels.chooseDelivery : labels.continue;
        backBtn.textContent = labels.back;
    }

    function renderOptions(step: InterviewStep) {
        optionsEl.innerHTML = '';

        if (step.multi) {
            const selected = getSelectedMulti();
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
                        const draft = getDraft();
                        let next = getSelectedMulti();
                        if (option.id === 'none') {
                            next = [option];
                        } else {
                            next = next.filter((o) => o.id !== 'none');
                            if (selectedIds.has(option.id)) {
                                next = next.filter((o) => o.id !== option.id);
                            } else {
                                next = [...next, option];
                            }
                        }
                        draft.m4 = next;
                        saveDraft(draft);
                        renderOptions(step);
                        updateNextButton();
                    },
                    { signal }
                );

                optionsEl.appendChild(btn);
            });
            return;
        }

        const selected = getSelectedSingle(step.id);
        step.options.forEach((option) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chip-option';
            btn.textContent = option.label;
            if (selected?.id === option.id) btn.classList.add('is-selected');

            btn.addEventListener(
                'click',
                () => {
                    const draft = getDraft();
                    (draft as Record<string, InterviewOption>)[step.id] = option;
                    saveDraft(draft);
                    renderOptions(step);
                    updateNextButton();
                },
                { signal }
            );

            optionsEl.appendChild(btn);
        });
    }

    function renderDots() {
        const stepIndex = getStepIndex(root);
        dotsEl.innerHTML = '';
        steps.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = 'step-dot';
            if (i < stepIndex) dot.classList.add('is-done');
            if (i === stepIndex) dot.classList.add('is-active');
            dot.setAttribute('aria-hidden', 'true');
            dotsEl.appendChild(dot);
        });
    }

    function renderStep() {
        const stepIndex = getStepIndex(root);
        const step = steps[stepIndex];
        const labels = WIZARD_LABELS[locale];
        dimensionEl.textContent = labels.question(stepIndex + 1, step.dimension);
        stemEl.textContent = step.stem;

        if (hintEl) {
            if (step.hint) {
                hintEl.textContent = step.hint;
                hintEl.hidden = false;
            } else {
                hintEl.textContent = '';
                hintEl.hidden = true;
            }
        }

        backBtn.disabled = stepIndex === 0;
        renderDots();
        renderOptions(step);
        updateNextButton();
    }

    backBtn.addEventListener(
        'click',
        () => {
            let stepIndex = getStepIndex(root);
            if (stepIndex > 0) {
                stepIndex -= 1;
                setStepIndex(root, stepIndex);
                renderStep();
            }
        },
        { signal }
    );

    nextBtn.addEventListener(
        'click',
        () => {
            const stepIndex = getStepIndex(root);
            const step = steps[stepIndex];
            if (!isStepComplete(step)) return;

            if (stepIndex < steps.length - 1) {
                setStepIndex(root, stepIndex + 1);
                renderStep();
                stemEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

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
            root.dataset.stepIndex = '0';
            window.location.assign('/delivery');
        },
        { signal }
    );

    document.addEventListener(
        'locale-changed',
        (event) => {
            const detail = (event as CustomEvent<{ locale: Locale }>).detail;
            if (!detail?.locale || detail.locale === locale) return;
            locale = detail.locale;
            steps = stepsByLocale[locale] ?? getInterviewSteps(locale);
            renderStep();
        },
        { signal }
    );

    renderStep();
}
