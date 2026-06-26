import { clearInterviewFallbackState } from './interview-fallback';
import { clearInterviewSessionMeta } from './interview-session';
import { clearLlmSteps, clearAnsweredSteps } from './interview-llm-cache';
import { clearRejectedQuestions } from './interview-refresh';
import {
    BUILD_RESULT_KEY,
    CURATE_MODEL_KEY,
    DRAFT_KEY,
    LAST_DELIVERY_KEY,
    PENDING_BUILD_KEY,
    PROMPT_READY_KEY,
    PROMPT_TEXT_KEY,
    SESSION_KEY
} from './session-keys';
import { navigateTo } from './navigate';

export function performStartOver() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(CURATE_MODEL_KEY);
        sessionStorage.removeItem(LAST_DELIVERY_KEY);
        sessionStorage.removeItem(BUILD_RESULT_KEY);
        sessionStorage.removeItem(PENDING_BUILD_KEY);
        sessionStorage.removeItem(PROMPT_READY_KEY);
        sessionStorage.removeItem(PROMPT_TEXT_KEY);
        clearRejectedQuestions();
        clearLlmSteps();
        clearAnsweredSteps();
        clearInterviewSessionMeta();
        clearInterviewFallbackState();
    } catch {}
    navigateTo('/interview');
}
