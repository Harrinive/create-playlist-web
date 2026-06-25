import { combineLabelWithGloss } from './interview-label';
import type { Locale } from './locale';
import type { InterviewAnswers, InterviewOption } from './types';
import { DEFAULT_STEP_IDS } from './interview-session';

export type Draft = Partial<InterviewAnswers>;

export { DEFAULT_STEP_IDS };

export function getSelectedMulti(draft: Draft): InterviewOption[] {
    return Array.isArray(draft.m4) ? draft.m4 : [];
}

export function isStepIdComplete(stepId: string, draft: Draft): boolean {
    if (stepId === 'm4') {
        const selected = getSelectedMulti(draft);
        return selected.length > 0 && selected.every((o) => Boolean(o?.id));
    }
    if (stepId === 'm_clarify') {
        return Boolean(draft.m_clarify?.id);
    }
    const key = stepId as keyof Draft;
    const value = draft[key];
    if (!value || Array.isArray(value)) return false;
    return Boolean(value && typeof value === 'object' && 'id' in value && value.id);
}

export function countCompletedSteps(draft: Draft, stepIds: readonly string[] = DEFAULT_STEP_IDS): number {
    let count = 0;
    for (const stepId of stepIds) {
        if (!isStepIdComplete(stepId, draft)) break;
        count += 1;
    }
    return count;
}

export function isInterviewComplete(draft: Draft, stepIds: readonly string[] = DEFAULT_STEP_IDS): boolean {
    return countCompletedSteps(draft, stepIds) >= stepIds.length;
}

export function clearAnswersFromIndex(
    draft: Draft,
    fromIndex: number,
    stepIds: readonly string[] = DEFAULT_STEP_IDS
): void {
    for (let i = fromIndex; i < stepIds.length; i += 1) {
        const stepId = stepIds[i];
        if (stepId === 'm4') draft.m4 = undefined;
        else if (stepId === 'm_clarify') draft.m_clarify = undefined;
        else delete (draft as Record<string, unknown>)[stepId];
    }
}

export function hasOrphanDraftAnswers(draft: Draft, stepIds: readonly string[] = DEFAULT_STEP_IDS): boolean {
    if (countCompletedSteps(draft, stepIds) > 0) return false;
    return stepIds.some((stepId) => {
        if (stepId === 'm4') return getSelectedMulti(draft).length > 0;
        if (stepId === 'm_clarify') return draft.m_clarify !== undefined;
        return draft[stepId as keyof Draft] !== undefined;
    });
}

export function buildPriorAnswersBeforeStep(
    draft: Draft,
    stepIndex: number,
    stepIds: readonly string[] = DEFAULT_STEP_IDS
): Partial<InterviewAnswers> {
    const answers: Partial<InterviewAnswers> = {};
    for (let i = 0; i < stepIndex; i += 1) {
        const stepId = stepIds[i];
        if (stepId === 'm4') {
            if (draft.m4?.length) answers.m4 = draft.m4;
        } else if (stepId === 'm_clarify') {
            if (draft.m_clarify) answers.m_clarify = draft.m_clarify;
        } else {
            const value = draft[stepId as keyof Draft];
            if (value && !Array.isArray(value)) {
                (answers as Record<string, InterviewOption>)[stepId] = value as InterviewOption;
            }
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
