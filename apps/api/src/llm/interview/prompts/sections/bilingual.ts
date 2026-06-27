import { joinSections } from '../join.js';

const bilingualIntro = `Bilingual: same axis in EN and ZH — each side composed independently, never line-by-line translation.`;

const englishFreeVerse = `## English — imagist free verse, not UX copy
Concrete nouns/verbs; ~3–9 words per chip; read aloud — if it sounds like a survey label, rewrite.
Forbidden: "what kind of place…" · parallel comma-noun templates on every option · motion-manual chips.`;

const chineseModernPoetry = `## Chinese — 现代诗, not 英译中
Compose labelZh/stemZh independently. One image per chip; 4–12 字 typical. Forbidden: 怎么动起来 · 这首歌 · English word order.`;

/** M1–M3 scene turns: imagist register. */
export function buildSceneCopyRules(): string {
    return joinSections(bilingualIntro, englishFreeVerse, chineseModernPoetry);
}

/** M4 avoid: plain Skip/Avoid trap sentences — not imagist chips. */
export function buildM4AvoidCopyRules(): string {
    return joinSections(
        bilingualIntro,
        `## English — plain trap reject (M4 avoid only)
Each non-"none" labelEn starts with **Skip** or **Avoid** + trap lexicon (muzak, hype, cliché, swell, rabbit hole, etc.).
Self-contained playlist-trap name — not imagist scene poetry, not survey UX.
~6–12 words OK for trap clarity.
When labelEn/labelZh match the canonical trap registry for the option id, accept unchanged.`,
        `## Chinese — plain trap reject, composed independently
Parallel trap name in natural modern Chinese (别要… / 避开… / 不要…).
No English loanwords when a plain Chinese trap name exists (健身歌单 not workout 歌单).
Same trap axis as EN — not line-by-line translation of Skip/Avoid prefix.`
    );
}

/** M4 discriminant fallback: positive felt groove/pace/space. */
export function buildM4DiscriminantCopyRules(): string {
    return joinSections(
        bilingualIntro,
        `## English — plain felt sonic/motion (M4 discriminant only)
Short felt labels (~3–9 words): pace, groove grain, or spatial texture.
NO Skip/Avoid prefix · NO trap-cluster wording · NO genre names.`,
        `## Chinese — felt sonic/motion, composed independently
One clear image per chip; plain body/groove/space read — not trap rejects, not 英译中.`
    );
}

/** @deprecated Use buildSceneCopyRules for M1–M3; mode-specific builders for M4. */
export function buildBilingualCopyRules(): string {
    return buildSceneCopyRules();
}

export const BILINGUAL_COPY_RULES = buildBilingualCopyRules();
export const CHINESE_LOCALIZATION_RULES = BILINGUAL_COPY_RULES;
