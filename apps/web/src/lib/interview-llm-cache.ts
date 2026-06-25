import type { BilingualInterviewStep } from './interview-i18n';
import { safeSessionGet, safeSessionRemove, safeSessionSet } from './session-storage';
import { ANSWERED_STEPS_KEY, LLM_STEPS_KEY } from './session-keys';

export { LLM_STEPS_KEY };

function isBilingualStep(value: unknown): value is BilingualInterviewStep {
    return Boolean(value && typeof value === 'object' && 'id' in value && 'options' in value);
}

function readStepArray(key: string): BilingualInterviewStep[] {
    try {
        const raw = safeSessionGet(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown[];
        if (!Array.isArray(parsed)) return [];
        const result: BilingualInterviewStep[] = [];
        for (let i = 0; i < parsed.length; i += 1) {
            const item = parsed[i];
            if (isBilingualStep(item)) result[i] = item;
        }
        return result;
    } catch {
        return [];
    }
}

function writeStepArray(key: string, steps: BilingualInterviewStep[]): boolean {
    return safeSessionSet(key, JSON.stringify(steps));
}

/** Grow array to stepIndex without copying the step into filler slots. */
function upsertStepAtIndex(
    read: () => BilingualInterviewStep[],
    write: (steps: BilingualInterviewStep[]) => boolean,
    stepIndex: number,
    step: BilingualInterviewStep
): boolean {
    const steps = read();
    if (steps.length <= stepIndex) {
        steps.length = stepIndex + 1;
    }
    steps[stepIndex] = step;
    return write(steps);
}

export function readLlmSteps(): BilingualInterviewStep[] {
    return readStepArray(LLM_STEPS_KEY);
}

export function readAnsweredSteps(): BilingualInterviewStep[] {
    return readStepArray(ANSWERED_STEPS_KEY);
}

export function writeLlmSteps(steps: BilingualInterviewStep[]): boolean {
    return writeStepArray(LLM_STEPS_KEY, steps);
}

export function upsertLlmStep(stepIndex: number, step: BilingualInterviewStep): boolean {
    return upsertStepAtIndex(readLlmSteps, writeLlmSteps, stepIndex, step);
}

/** Snapshot the exact question the user answered — used when resuming a draft. */
export function pinAnsweredStep(stepIndex: number, step: BilingualInterviewStep): boolean {
    return upsertStepAtIndex(readAnsweredSteps, (steps) => writeStepArray(ANSWERED_STEPS_KEY, steps), stepIndex, step);
}

export function clearLlmSteps(): void {
    safeSessionRemove(LLM_STEPS_KEY);
}

export function clearAnsweredSteps(): void {
    safeSessionRemove(ANSWERED_STEPS_KEY);
}

export function truncateLlmSteps(fromIndex: number): boolean {
    const steps = readLlmSteps();
    return writeLlmSteps(steps.slice(0, fromIndex));
}

export function truncateAnsweredSteps(fromIndex: number): boolean {
    const steps = readAnsweredSteps();
    return writeStepArray(ANSWERED_STEPS_KEY, steps.slice(0, fromIndex));
}

/** For tests — pad behavior when inserting at a non-zero index into an empty array. */
export function upsertLlmStepForTest(
    existing: BilingualInterviewStep[],
    stepIndex: number,
    step: BilingualInterviewStep
): BilingualInterviewStep[] {
    const steps = existing.slice();
    if (steps.length <= stepIndex) {
        steps.length = stepIndex + 1;
    }
    steps[stepIndex] = step;
    return steps;
}
