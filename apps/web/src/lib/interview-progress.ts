import { countCompletedSteps, type Draft } from './interview-draft';
import { safeSessionGet } from './session-storage';
import { DRAFT_KEY } from './session-keys';

export function readInterviewDraft(): Draft {
    try {
        const raw = safeSessionGet(DRAFT_KEY);
        return raw ? (JSON.parse(raw) as Draft) : {};
    } catch {
        return {};
    }
}

export function hasInterviewProgress(): boolean {
    return countCompletedSteps(readInterviewDraft()) > 0;
}
