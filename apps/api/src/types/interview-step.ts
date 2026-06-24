export type BilingualText = {
    en: string;
    zh: string;
};

export type BilingualInterviewOption = {
    id: string;
    label: BilingualText;
};

/** LLM-generated interview step — always includes both languages for instant locale switching. */
export type BilingualInterviewStep = {
    id: 'm1' | 'm2' | 'm3' | 'm4' | 'm5';
    dimension: BilingualText;
    stem: BilingualText;
    hint?: BilingualText;
    multi: boolean;
    options: BilingualInterviewOption[];
};

export const INTERVIEW_STEP_SEQUENCE = [
    {
        id: 'm1' as const,
        dimension: { en: 'Scene', zh: '场景' },
        multi: false,
        optionMin: 5,
        optionMax: 8
    },
    {
        id: 'm2' as const,
        dimension: { en: 'Emotion', zh: '情绪' },
        multi: false,
        optionMin: 4,
        optionMax: 6
    },
    {
        id: 'm3' as const,
        dimension: { en: 'Energy', zh: '能量' },
        multi: false,
        optionMin: 4,
        optionMax: 6
    },
    {
        id: 'm5' as const,
        dimension: { en: 'Sound', zh: '质感' },
        multi: false,
        optionMin: 4,
        optionMax: 6
    },
    {
        id: 'm4' as const,
        dimension: { en: 'Avoid', zh: '避开' },
        multi: true,
        optionMin: 4,
        optionMax: 6
    }
] as const;

export function interviewStepMeta(stepIndex: number) {
    return INTERVIEW_STEP_SEQUENCE[stepIndex] ?? null;
}
