import { clearRejectedQuestions } from './interview-refresh';
import { clearLlmSteps, clearAnsweredSteps } from './interview-llm-cache';
import {
    BUILD_RESULT_KEY,
    CURATE_MODEL_KEY,
    DRAFT_KEY,
    LAST_DELIVERY_KEY,
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
        sessionStorage.removeItem(PROMPT_READY_KEY);
        sessionStorage.removeItem(PROMPT_TEXT_KEY);
        clearRejectedQuestions();
        clearLlmSteps();
        clearAnsweredSteps();
    } catch {}
    navigateTo('/interview');
}
