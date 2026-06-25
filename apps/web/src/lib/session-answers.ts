import { isValidAnswers } from './build-prompt';
import { SESSION_KEY } from './session-keys';
import type { InterviewAnswers } from './types';

export function readStoredInterviewAnswers(): InterviewAnswers | null {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        const raw = stored ? JSON.parse(stored) : null;
        return isValidAnswers(raw) ? raw : null;
    } catch {
        return null;
    }
}
