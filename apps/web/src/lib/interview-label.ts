import type { Locale } from './locale';

/** Append optional gloss in locale-appropriate parentheses (stored on answer for brief fallback). */
export function combineLabelWithGloss(
    label: string,
    gloss: string | undefined,
    locale: Locale
): string {
    const trimmedGloss = gloss?.trim();
    if (!trimmedGloss) return label;
    return locale === 'zh' ? `${label}（${trimmedGloss}）` : `${label} (${trimmedGloss})`;
}

/** Extract trailing gloss for brief text — prefers the clearer parenthetical when present. */
export function labelForBrief(label: string, locale: Locale): string {
    const trimmed = label.trim();
    if (!trimmed) return trimmed;

    const match = trimmed.match(/^(.*?)(?:\s*[（(]([^）)]+)[）)])\s*$/);
    if (match) {
        const gloss = match[2].trim();
        if (gloss) return locale === 'en' ? gloss.toLowerCase() : gloss;
    }

    return locale === 'en' ? trimmed.toLowerCase() : trimmed;
}
