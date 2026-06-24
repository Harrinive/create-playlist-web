import type { Locale } from './locale';

export const INTERVIEW_MODEL_KEY = 'create-playlist-interview-model';

export type InterviewModelOption = {
    id: string;
    labelEn: string;
    labelZh: string;
    descriptionEn: string;
    descriptionZh: string;
};

export const INTERVIEW_MODELS: InterviewModelOption[] = [
    {
        id: 'static',
        labelEn: 'Question bank',
        labelZh: '题库模式',
        descriptionEn: 'Fixed mood interview (v1)',
        descriptionZh: '固定情绪访谈（v1）'
    },
    {
        id: 'llm',
        labelEn: 'AI interview',
        labelZh: 'AI 访谈',
        descriptionEn: 'Fresh questions each run (needs API)',
        descriptionZh: '每次全新出题（需 API）'
    }
];

export function readInterviewModel(): string {
    try {
        const stored = sessionStorage.getItem(INTERVIEW_MODEL_KEY);
        if (stored && INTERVIEW_MODELS.some((m) => m.id === stored)) return stored;
    } catch {}
    return 'static';
}

export function isLlmInterviewModel(modelId?: string): boolean {
    return (modelId ?? readInterviewModel()) === 'llm';
}

export function saveInterviewModel(modelId: string) {
    sessionStorage.setItem(INTERVIEW_MODEL_KEY, modelId);
}

export function interviewModelLabel(option: InterviewModelOption, locale: Locale): string {
    return locale === 'zh' ? option.labelZh : option.labelEn;
}

export function interviewModelDescription(option: InterviewModelOption, locale: Locale): string {
    return locale === 'zh' ? option.descriptionZh : option.descriptionEn;
}
