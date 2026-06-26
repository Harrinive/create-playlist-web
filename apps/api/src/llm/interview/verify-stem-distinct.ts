import type { LlmStepDraft } from './shared.js';

function normalizeCopy(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[.?!？！。、]+$/g, '');
}

/** Strip common question tails so we compare scene beat vs chip, not full stem vs chip. */
function stemBeatFragment(stem: string): string {
    let s = stem.trim();
    s = s.replace(/\s*[—–-]\s*(which|what|where|who|how|这一|哪一|最像).*$/iu, '');
    s = s.replace(/[?？].*$/u, '');
    s = s.replace(/^(which|what|where|who|how)\s+/iu, '');
    return normalizeCopy(s);
}

function copiesMatch(a: string, b: string): boolean {
    const na = normalizeCopy(a);
    const nb = normalizeCopy(b);
    if (!na || !nb) return false;
    if (na === nb) return true;

    const beat = stemBeatFragment(a);
    if (beat && beat === nb) return true;
    if (beat.length >= 6 && nb.length >= 6 && (beat.includes(nb) || nb.includes(beat))) {
        const ratio = Math.min(beat.length, nb.length) / Math.max(beat.length, nb.length);
        if (ratio >= 0.85) return true;
    }
    return false;
}

/** Stem must frame the turn — never duplicate an option chip verbatim (EN or ZH). */
export function verifyStemDistinctFromOptions(draft: LlmStepDraft): string[] {
    const failures: string[] = [];

    for (const opt of draft.options) {
        if (opt.id === 'none' || opt.id === 'you-decide') continue;

        if (copiesMatch(draft.stemEn, opt.labelEn)) {
            failures.push(
                `stemEn duplicates option "${opt.id}" — stem must ask/frame the turn, not repeat a chip verbatim`
            );
        }
        if (copiesMatch(draft.stemZh, opt.labelZh)) {
            failures.push(
                `stemZh duplicates option "${opt.id}" — stem must ask/frame the turn, not repeat a chip verbatim`
            );
        }
    }

    return failures;
}
