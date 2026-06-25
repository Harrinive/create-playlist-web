import type { BilingualInterviewStep } from './interview-i18n';
import { ANSWERED_STEPS_KEY, LLM_STEPS_KEY } from './session-keys';

export { LLM_STEPS_KEY };

function readStepArray(key: string): BilingualInterviewStep[] {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as BilingualInterviewStep[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStepArray(key: string, steps: BilingualInterviewStep[]) {
    sessionStorage.setItem(key, JSON.stringify(steps));
}

export function readLlmSteps(): BilingualInterviewStep[] {
    return readStepArray(LLM_STEPS_KEY);
}

export function readAnsweredSteps(): BilingualInterviewStep[] {
    return readStepArray(ANSWERED_STEPS_KEY);
}

export function writeLlmSteps(steps: BilingualInterviewStep[]) {
    writeStepArray(LLM_STEPS_KEY, steps);
}

export function upsertLlmStep(stepIndex: number, step: BilingualInterviewStep) {
    const steps = readLlmSteps();
    while (steps.length <= stepIndex) {
        steps.push(step);
    }
    steps[stepIndex] = step;
    writeLlmSteps(steps);
}

/** Snapshot the exact question the user answered — used when resuming a draft. */
export function pinAnsweredStep(stepIndex: number, step: BilingualInterviewStep) {
    const steps = readAnsweredSteps();
    while (steps.length <= stepIndex) {
        steps.push(step);
    }
    steps[stepIndex] = step;
    writeStepArray(ANSWERED_STEPS_KEY, steps);
}

export function clearLlmSteps() {
    sessionStorage.removeItem(LLM_STEPS_KEY);
}

export function clearAnsweredSteps() {
    sessionStorage.removeItem(ANSWERED_STEPS_KEY);
}

export function truncateLlmSteps(fromIndex: number) {
    const steps = readLlmSteps();
    writeLlmSteps(steps.slice(0, fromIndex));
}

export function truncateAnsweredSteps(fromIndex: number) {
    const steps = readAnsweredSteps();
    writeStepArray(ANSWERED_STEPS_KEY, steps.slice(0, fromIndex));
}
