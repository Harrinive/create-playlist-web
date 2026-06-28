import type { LlmStepDraft } from './shared.js';

const STEM_ASK_EN =
    /\b(which|where|what|pick|choose|step into|most like|feels like you|feel most like|holds you|where are you|pick a still|which (?:place|world|still|scene|moment|beat|groove|fit|chapter|one)|are you in|right now)\b/i;
const STEM_ASK_ZH =
    /[选哪]|最像|走进|进到|哪一处|哪一幕|像在的地方|你此刻|在哪里|哪一段|进行到哪|哪一下|最对路|最贴近|最不该像|不要像|哪一个|哪一刻|哪一章/;

const HINT_TASK_EN =
    /\b(pick|choose|select|step into|see yourself|most like|place you|which moment|where is tonight)\b/i;
const HINT_TASK_ZH = /选|走进|进到|最像|一处|场景|地方|哪一刻|哪一段|走进去/;

const M4_REJECT_ASK =
    /\b(not sound like|must not|should not|avoid|skip|不该|不要像|最不该|别让它)/i;

const HINT_MECHANICS_EN = /\b(pick any|select all|multiple|tap one|choose one)\b/i;
const HINT_MECHANICS_ZH = /可多选|选多个|点一个|选一个|都可以选/;

export function stemHasExplicitAsk(stemEn: string, stemZh: string): boolean {
    return STEM_ASK_EN.test(stemEn) || STEM_ASK_ZH.test(stemZh);
}

/** Stem or hint carries the pick/choose ask (shape A or shape B). */
export function turnHasExplicitAsk(draft: LlmStepDraft): boolean {
    if (stemHasExplicitAsk(draft.stemEn, draft.stemZh)) return true;
    const hintEn = draft.hintEn?.trim() ?? '';
    const hintZh = draft.hintZh?.trim() ?? '';
    if (!hintEn && !hintZh) return false;
    return stemHasExplicitAsk(hintEn, hintZh);
}

/** Deterministic stem/hint redundancy check. */
export function verifyStemHintOverlap(stepId: string, draft: LlmStepDraft): string[] {
    const hintEn = draft.hintEn?.trim() ?? '';
    const hintZh = draft.hintZh?.trim() ?? '';
    if (!hintEn && !hintZh) return [];

    if (stepId === 'm4') {
        const stemHasReject =
            M4_REJECT_ASK.test(draft.stemEn) || M4_REJECT_ASK.test(draft.stemZh);
        const hintRepeatsReject =
            M4_REJECT_ASK.test(hintEn) || M4_REJECT_ASK.test(hintZh);
        const hintIsMechanics =
            HINT_MECHANICS_EN.test(hintEn) || HINT_MECHANICS_ZH.test(hintZh);
        if (stemHasReject && hintRepeatsReject && !hintIsMechanics) {
            return [
                'M4 hint restates sonic-reject ask — use mechanics-only hint or omit hintEn/hintZh'
            ];
        }
        return [];
    }

    if (!['m1', 'm2', 'm3', 'm_clarify'].includes(stepId)) return [];

    const failures: string[] = [];

    if (stemHasExplicitAsk(draft.stemEn, draft.stemZh)) {
        const enRedundant = hintEn && HINT_TASK_EN.test(hintEn) && STEM_ASK_EN.test(draft.stemEn);
        const zhRedundant = hintZh && HINT_TASK_ZH.test(hintZh) && STEM_ASK_ZH.test(draft.stemZh);
        const crossRedundant =
            (hintEn && HINT_TASK_EN.test(hintEn) && STEM_ASK_ZH.test(draft.stemZh)) ||
            (hintZh && HINT_TASK_ZH.test(hintZh) && STEM_ASK_EN.test(draft.stemEn));

        if (enRedundant || zhRedundant || crossRedundant) {
            failures.push(
                'hint paraphrases stem ask — omit hintEn/hintZh when stem already frames the question'
            );
        }
    }

    return failures;
}
