import type { InterviewAnswers } from './types';

export function isValidAnswers(value: unknown): value is InterviewAnswers {
    if (!value || typeof value !== 'object') return false;
    const a = value as InterviewAnswers;
    return Boolean(a.m1?.id && a.m2?.id && a.m3?.id && Array.isArray(a.m4) && a.m4.length > 0);
}

/** Legacy sessions may include user m5 — still valid. */
export function isValidAnswersLegacy(value: unknown): value is InterviewAnswers & { m5: { id: string } } {
    return isValidAnswers(value) && Boolean((value as InterviewAnswers).m5?.id);
}
