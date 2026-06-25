import type { Locale } from './locale';

export type BilingualText = {
    en: string;
    zh: string;
};

export type BilingualInterviewOption = {
    id: string;
    label: BilingualText;
    gloss?: BilingualText;
};

export type BilingualInterviewStep = {
    id: 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm_clarify';
    dimension: BilingualText;
    stem: BilingualText;
    stemGloss?: BilingualText;
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

function glossWrapper(locale: Locale, gloss: string): string {
    return locale === 'zh' ? `（${gloss}）` : ` (${gloss})`;
}

/** Poetic main + optional muted parenthetical gloss; optional EN secondary in zh mode. */
export function fillInterviewLineWithGloss(
    el: HTMLElement,
    primary: string,
    gloss: string | undefined,
    secondaryEn: string | undefined,
    locale: Locale
): void {
    const glossHtml = gloss?.trim()
        ? `<span class="interview-option-gloss">${escapeHtml(glossWrapper(locale, gloss.trim()))}</span>`
        : '';

    const primaryHtml = glossHtml
        ? `<span class="interview-bilingual__label">${escapeHtml(primary)}</span>${glossHtml}`
        : escapeHtml(primary);

    if (locale === 'en' || !secondaryEn) {
        el.innerHTML = `<span class="interview-bilingual__primary">${primaryHtml}</span>`;
        return;
    }

    el.innerHTML = `<span class="interview-bilingual__primary">${primaryHtml}</span><span class="interview-bilingual__secondary">${escapeHtml(secondaryEn)}</span>`;
}

export function toDisplayInterviewStep(
    step: BilingualInterviewStep,
    locale: Locale
): {
    id: BilingualInterviewStep['id'];
    dimension: string;
    stem: string;
    stemEn?: string;
    stemGloss?: string;
    stemGlossEn?: string;
    hint?: string;
    hintEn?: string;
    multi: boolean;
    options: Array<{ id: string; label: string; labelEn?: string; gloss?: string; glossEn?: string }>;
} {
    return {
        id: step.id,
        dimension: locale === 'zh' ? step.dimension.zh : step.dimension.en,
        stem: locale === 'en' ? step.stem.en : step.stem.zh,
        stemEn: locale === 'zh' ? step.stem.en : undefined,
        stemGloss: step.stemGloss
            ? locale === 'en'
                ? step.stemGloss.en
                : step.stemGloss.zh
            : undefined,
        stemGlossEn: step.stemGloss && locale === 'zh' ? step.stemGloss.en : undefined,
        hint: step.hint ? (locale === 'en' ? step.hint.en : step.hint.zh) : undefined,
        hintEn: step.hint && locale === 'zh' ? step.hint.en : undefined,
        multi: step.multi,
        options: step.options.map((option) => ({
            id: option.id,
            label: locale === 'en' ? option.label.en : option.label.zh,
            labelEn: locale === 'zh' ? option.label.en : undefined,
            gloss: option.gloss ? (locale === 'en' ? option.gloss.en : option.gloss.zh) : undefined,
            glossEn: option.gloss && locale === 'zh' ? option.gloss.en : undefined
        }))
    };
}

export const bilingualStepToDisplay = toDisplayInterviewStep;
