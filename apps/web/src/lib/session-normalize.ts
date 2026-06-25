import { hasOrphanDraftAnswers } from './interview-draft';
import { clearAnsweredSteps, clearLlmSteps } from './interview-llm-cache';
import { readBuildResult, readLastDelivery, readSavedPromptText } from './last-delivery';
import { readInterviewDraft } from './interview-progress';
import { readStoredInterviewAnswers } from './session-answers';
import {
    BUILD_RESULT_KEY,
    DRAFT_KEY,
    LAST_DELIVERY_KEY,
    PROMPT_READY_KEY,
    PROMPT_TEXT_KEY
} from './session-keys';
import { safeSessionRemove } from './session-storage';

/** Prune inconsistent sessionStorage keys before reading home progress. */
export function normalizeSessionState(): void {
    const answers = readStoredInterviewAnswers();

    if (!answers) {
        if (readSavedPromptText()) safeSessionRemove(PROMPT_TEXT_KEY);
        try {
            if (sessionStorage.getItem(PROMPT_READY_KEY)) safeSessionRemove(PROMPT_READY_KEY);
        } catch {}
        if (readLastDelivery() === 'prompt') safeSessionRemove(LAST_DELIVERY_KEY);
    }

    try {
        if (sessionStorage.getItem(PROMPT_READY_KEY) && !readSavedPromptText()) {
            safeSessionRemove(PROMPT_READY_KEY);
            if (readLastDelivery() === 'prompt') safeSessionRemove(LAST_DELIVERY_KEY);
        }
    } catch {}

    if (!readBuildResult()) {
        try {
            const raw = sessionStorage.getItem(BUILD_RESULT_KEY);
            if (raw) safeSessionRemove(BUILD_RESULT_KEY);
        } catch {}
        if (readLastDelivery() === 'build') safeSessionRemove(LAST_DELIVERY_KEY);
    }

    const draft = readInterviewDraft();
    if (hasOrphanDraftAnswers(draft)) {
        safeSessionRemove(DRAFT_KEY);
        clearLlmSteps();
        clearAnsweredSteps();
    }
}
