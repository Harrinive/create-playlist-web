import type { Locale } from './locale';

export type InterviewAlgorithmMode = 'fast' | 'full';

export const INTERVIEW_ALGORITHM_MODE_KEY = 'create-playlist-interview-algorithm-mode';

export type InterviewAlgorithmModeOption = {
    id: InterviewAlgorithmMode;
    labelEn: string;
    labelZh: string;
    descriptionEn: string;
    descriptionZh: string;
};

export const INTERVIEW_ALGORITHM_MODES: InterviewAlgorithmModeOption[] = [
    {
        id: 'full',
        labelEn: 'Polished',
        labelZh: '打磨',
        descriptionEn: 'Questions refined before you see them',
        descriptionZh: '题目会先打磨再给你'
    },
    {
        id: 'fast',
        labelEn: 'Quick',
        labelZh: '快速',
        descriptionEn: 'Skip the wait',
        descriptionZh: '不用等打磨'
    }
];

export function readInterviewAlgorithmMode(): InterviewAlgorithmMode {
    try {
        const stored = sessionStorage.getItem(INTERVIEW_ALGORITHM_MODE_KEY);
        if (stored === 'fast' || stored === 'full') return stored;
    } catch {}
    return 'full';
}

export function saveInterviewAlgorithmMode(mode: InterviewAlgorithmMode) {
    sessionStorage.setItem(INTERVIEW_ALGORITHM_MODE_KEY, mode);
}

/** Apply server default only when the user has not chosen a mode yet. */
export function ensureInterviewAlgorithmModeDefault(defaultMode: InterviewAlgorithmMode) {
    try {
        const stored = sessionStorage.getItem(INTERVIEW_ALGORITHM_MODE_KEY);
        if (stored === 'fast' || stored === 'full') return;
        saveInterviewAlgorithmMode(defaultMode);
    } catch {}
}

export function algorithmModeLabel(option: InterviewAlgorithmModeOption, locale: Locale): string {
    return locale === 'zh' ? option.labelZh : option.labelEn;
}

export function algorithmModeDescription(
    option: InterviewAlgorithmModeOption,
    locale: Locale
): string {
    return locale === 'zh' ? option.descriptionZh : option.descriptionEn;
}
