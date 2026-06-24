import type { Locale } from './locale';

export type BilingualText = {
    en: string;
    zh: string;
};

export type BilingualInterviewOption = {
    id: string;
    label: BilingualText;
};

export type BilingualInterviewStep = {
    id: 'm1' | 'm2' | 'm3' | 'm4' | 'm5';
    dimension: BilingualText;
    stem: BilingualText;
    hint?: BilingualText;
    multi: boolean;
    options: BilingualInterviewOption[];
};

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Chinese primary + smaller English secondary (interview stems, hints, options only). */
export function fillInterviewBilingual(
    el: HTMLElement,
    primary: string,
    secondaryEn: string | undefined,
    locale: Locale
): void {
    if (locale === 'en' || !secondaryEn) {
        el.textContent = primary;
        return;
    }
    el.innerHTML = `<span class="interview-bilingual__primary">${escapeHtml(primary)}</span><span class="interview-bilingual__secondary">${escapeHtml(secondaryEn)}</span>`;
}

export function toDisplayInterviewStep(
    step: BilingualInterviewStep,
    locale: Locale
): {
    id: BilingualInterviewStep['id'];
    dimension: string;
    stem: string;
    stemEn?: string;
    hint?: string;
    hintEn?: string;
    multi: boolean;
    options: Array<{ id: string; label: string; labelEn?: string }>;
} {
    return {
        id: step.id,
        dimension: locale === 'zh' ? step.dimension.zh : step.dimension.en,
        stem: locale === 'en' ? step.stem.en : step.stem.zh,
        stemEn: locale === 'zh' ? step.stem.en : undefined,
        hint: step.hint ? (locale === 'en' ? step.hint.en : step.hint.zh) : undefined,
        hintEn: step.hint && locale === 'zh' ? step.hint.en : undefined,
        multi: step.multi,
        options: step.options.map((option) => ({
            id: option.id,
            label: locale === 'en' ? option.label.en : option.label.zh,
            labelEn: locale === 'zh' ? option.label.en : undefined
        }))
    };
}

export const bilingualStepToDisplay = toDisplayInterviewStep;
