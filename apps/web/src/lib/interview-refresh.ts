import { SESSION_KEY } from './types';

export type RejectedQuestion = {
    stepId: string;
    stepIndex: number;
    stem: string;
    dimension: string;
    rejectedAt: number;
};

export const REJECTED_KEY = `${SESSION_KEY}-interview-rejected`;

export function readRejectedQuestions(): RejectedQuestion[] {
    try {
        const raw = sessionStorage.getItem(REJECTED_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as RejectedQuestion[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function recordRejectedQuestion(entry: Omit<RejectedQuestion, 'rejectedAt'>) {
    const next: RejectedQuestion = { ...entry, rejectedAt: Date.now() };
    const existing = readRejectedQuestions();
    sessionStorage.setItem(REJECTED_KEY, JSON.stringify([...existing, next]));
}

export function rejectedStemsForStep(stepId: string): string[] {
    return readRejectedQuestions()
        .filter((item) => item.stepId === stepId)
        .map((item) => item.stem);
}

/** Prompt fragment for Phase 4 LLM interview regeneration. */
export function differentFromInstruction(stem: string): string {
    return `Be different from: ${stem}`;
}

export function clearRejectedQuestions() {
    sessionStorage.removeItem(REJECTED_KEY);
}
