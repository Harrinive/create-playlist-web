import type { InterviewAnswers } from './types';

export function isValidAnswers(value: unknown): value is InterviewAnswers {
    if (!value || typeof value !== 'object') return false;
    const a = value as InterviewAnswers;
    return Boolean(a.m1?.id && a.m2?.id && a.m3?.id && a.m5?.id && Array.isArray(a.m4) && a.m4.length > 0);
}
