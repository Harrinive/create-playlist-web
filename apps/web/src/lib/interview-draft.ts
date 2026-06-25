import { INTERVIEW_STEP_COUNT, INTERVIEW_STEP_IDS } from './interview-meta';
import { combineLabelWithGloss } from './interview-label';
import type { Locale } from './locale';
import type { InterviewAnswers, InterviewOption } from './types';

export type Draft = Partial<InterviewAnswers>;

export function getSelectedMulti(draft: Draft): InterviewOption[] {
    return Array.isArray(draft.m4) ? draft.m4 : [];
}

export function isStepIdComplete(stepId: (typeof INTERVIEW_STEP_IDS)[number], draft: Draft): boolean {
    if (stepId === 'm4') {
        const selected = getSelectedMulti(draft);
        return selected.length > 0 && selected.every((o) => Boolean(o?.id));
    }
    const value = draft[stepId];
    return Boolean(value && typeof value === 'object' && value.id);
}

export function countCompletedSteps(draft: Draft): number {
    let count = 0;
    for (const stepId of INTERVIEW_STEP_IDS) {
        if (!isStepIdComplete(stepId, draft)) break;
        count += 1;
    }
    return count;
}

export function isInterviewComplete(draft: Draft): boolean {
    return countCompletedSteps(draft) >= INTERVIEW_STEP_COUNT;
}

export function clearAnswersFromIndex(draft: Draft, fromIndex: number): void {
    for (let i = fromIndex; i < INTERVIEW_STEP_COUNT; i += 1) {
        const stepId = INTERVIEW_STEP_IDS[i];
        if (stepId === 'm4') draft.m4 = undefined;
        else delete (draft as Record<string, unknown>)[stepId];
    }
}

/** True when draft has answer keys but none form a valid consecutive prefix from m1. */
export function hasOrphanDraftAnswers(draft: Draft): boolean {
    if (countCompletedSteps(draft) > 0) return false;
    return INTERVIEW_STEP_IDS.some((stepId) => {
        if (stepId === 'm4') return getSelectedMulti(draft).length > 0;
        return draft[stepId] !== undefined;
    });
}

/** Answers for steps strictly before stepIndex (used when fetching that step from the API). */
export function buildPriorAnswersBeforeStep(
    draft: Draft,
    stepIndex: number
): Partial<InterviewAnswers> {
    const answers: Partial<InterviewAnswers> = {};
    for (let i = 0; i < stepIndex; i += 1) {
        const stepId = INTERVIEW_STEP_IDS[i];
        if (stepId === 'm4') {
            if (draft.m4?.length) answers.m4 = draft.m4;
        } else {
            const value = draft[stepId];
            if (value) answers[stepId] = value;
        }
    }
    return answers;
}

export function optionMatchesAnswer(
    option: InterviewOption,
    selected: InterviewOption,
    locale: Locale
): boolean {
    if (selected.id === option.id) return true;
    const displayed = combineLabelWithGloss(option.label, option.gloss, locale).trim();
    return displayed === selected.label.trim();
}

export function multiSelectionMatches(
    options: InterviewOption[],
    selected: InterviewOption[],
    locale: Locale
): Set<string> {
    const ids = new Set<string>();
    for (const sel of selected) {
        const match = options.find((opt) => optionMatchesAnswer(opt, sel, locale));
        if (match) ids.add(match.id);
    }
    return ids;
}
