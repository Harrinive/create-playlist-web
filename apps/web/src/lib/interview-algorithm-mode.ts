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
        labelEn: 'Full',
        labelZh: '完整',
        descriptionEn: 'Plan → draft → verify',
        descriptionZh: '规划 → 出题 → 校验'
    },
    {
        id: 'fast',
        labelEn: 'Fast',
        labelZh: '快速',
        descriptionEn: 'Single LLM call',
        descriptionZh: '单次 LLM 调用'
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
