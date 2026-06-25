import type { BilingualInterviewStep } from './interview-i18n';
import { LLM_STEPS_KEY } from './session-keys';

export { LLM_STEPS_KEY };

export function readLlmSteps(): BilingualInterviewStep[] {
    try {
        const raw = sessionStorage.getItem(LLM_STEPS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as BilingualInterviewStep[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function writeLlmSteps(steps: BilingualInterviewStep[]) {
    sessionStorage.setItem(LLM_STEPS_KEY, JSON.stringify(steps));
}

export function upsertLlmStep(stepIndex: number, step: BilingualInterviewStep) {
    const steps = readLlmSteps();
    while (steps.length <= stepIndex) {
        steps.push(step);
    }
    steps[stepIndex] = step;
    writeLlmSteps(steps);
}

export function clearLlmSteps() {
    sessionStorage.removeItem(LLM_STEPS_KEY);
}

export function truncateLlmSteps(fromIndex: number) {
    const steps = readLlmSteps();
    writeLlmSteps(steps.slice(0, fromIndex));
}
