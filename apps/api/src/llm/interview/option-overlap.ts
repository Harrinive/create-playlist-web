import type { LlmStepDraft } from './shared.js';

const STOP_WORDS = new Set([
    'the',
    'and',
    'with',
    'that',
    'this',
    'your',
    'you',
    'for',
    'from',
    'into',
    'most',
    'like',
    'feels',
    'feel',
    'when',
    'where',
    'what',
    'which',
    'about',
    'already',
    'still',
    'just',
    'whole',
    'wide',
    'open',
    'opens',
    'whole'
]);

const CROWD_MOOD_BEAT =
    /\b(room|crowd|shoulder|laughter|smile|surges?|softens?|sparks?|unguarded|catches|spills|opens wide)\b/i;

const PARALLEL_COMMA_AND = /^[^,]{4,},\s+and\s+/i;

function significantTokens(text: string): string[] {
    return text
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

function jaccardSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1;
    const setA = new Set(a);
    const setB = new Set(b);
    let inter = 0;
    for (const token of setA) {
        if (setB.has(token)) inter += 1;
    }
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : inter / union;
}

/** Flag overlapping or same-template options (M1–M3). */
export function verifyOptionOverlap(stepId: string, draft: LlmStepDraft): string[] {
    if (!['m1', 'm2', 'm3', 'm_clarify', 'm4'].includes(stepId)) return [];

    const failures: string[] = [];
    const options = draft.options;
    if (options.length < 2) return failures;

    const tokenSets = options.map((o) => significantTokens(o.labelEn));

    for (let i = 0; i < tokenSets.length; i += 1) {
        for (let j = i + 1; j < tokenSets.length; j += 1) {
            const shared = tokenSets[i].filter((t) => tokenSets[j].includes(t));
            if (shared.length >= 2) {
                failures.push(
                    `options "${options[i].id}" and "${options[j].id}" overlap on "${shared.join(', ')}" — distinct story beats required`
                );
            }
            const sim = jaccardSimilarity(tokenSets[i], tokenSets[j]);
            if (sim >= 0.38) {
                failures.push(
                    `options "${options[i].id}" and "${options[j].id}" too similar (${Math.round(sim * 100)}% token overlap) — rewrite one`
                );
            }
        }
    }

    if (stepId === 'm2' || stepId === 'm3') {
        const crowdBeatCount = options.filter((o) => CROWD_MOOD_BEAT.test(o.labelEn)).length;
        if (crowdBeatCount >= 3) {
            failures.push(
                `${crowdBeatCount} options share crowd-mood template (room/crowd/shoulders/laughter) — use different props and actions per beat`
            );
        }

        const parallelCount = options.filter((o) => PARALLEL_COMMA_AND.test(o.labelEn.trim())).length;
        if (parallelCount >= 3) {
            failures.push(
                `${parallelCount} options use the same "X, and Y" mood-poetry template — vary structure and concrete details`
            );
        }

        const roomCount = options.filter((o) => /\broom\b/i.test(o.labelEn)).length;
        if (roomCount >= 3) {
            failures.push(
                `${roomCount} options anchor on "room" — spread beats across different concrete focal points`
            );
        }
    }

    const glossTexts = options
        .map((o) => `${o.glossEn ?? ''} ${o.glossZh ?? ''}`.trim().toLowerCase())
        .filter(Boolean);
    for (let i = 0; i < glossTexts.length; i += 1) {
        for (let j = i + 1; j < glossTexts.length; j += 1) {
            const gi = significantTokens(glossTexts[i]);
            const gj = significantTokens(glossTexts[j]);
            if (jaccardSimilarity(gi, gj) >= 0.5) {
                failures.push(
                    `option gloss on "${options[i].id}" and "${options[j].id}" overlap — omit gloss or decode different registers`
                );
            }
        }
    }

    return failures;
}
