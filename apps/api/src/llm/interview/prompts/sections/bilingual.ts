import { joinSections } from '../join.js';

const bilingualIntro = `Bilingual: same axis in EN and ZH — each side composed independently, never line-by-line translation.`;

const englishFreeVerse = `## English — imagist free verse, not UX copy
Concrete nouns/verbs; ~3–9 words per chip; read aloud — if it sounds like a survey label, rewrite.
Forbidden: "what kind of place…" · parallel comma-noun templates on every option · motion-manual chips.`;

const chineseAntiCalqueBody = `Write stemZh/labelZh as if Chinese-first — same scene or trap axis as EN, not a mirror of stemEn/labelEn.
**Shape:** one clear image or trap name per line; natural spoken rhythm; 4–14 字 typical for chips.
**Anti-patterns (rewrite if present):**
- Adverb/adjective calques mirroring English (-ly → …地, color/state words stacked like English: 发黑地躺着)
- English clause order (把英文语序硬搬进中文)
- Same reject opener on every M4 option (e.g. five consecutive 别要…)
- English loanwords when plain Chinese exists (swell → 大起势/层层推高; muzak → 电梯音乐/背景循环)
- Survey UX: 怎么动起来 · 这首歌 · 哪种类型`;

const chineseAntiCalque = `## Chinese — native composition, not 英译中
${chineseAntiCalqueBody}`;

const chineseModernPoetry = `## Chinese — scene stills (M1–M3 stems/options)
${chineseAntiCalqueBody}
Scene beats: concrete 物件 + 动作/光 — 现代诗画面感, not mood adjectives.`;

const chineseM4Stem = `## Chinese — M4 avoid stem (scene half only)
stemZh = one native scene still from M3 + plain sonic-reject ask (…——这(段)配乐最不该像什么？).
Compose the scene half independently — if stemZh reads like stemEn translated word-for-word, rewrite.
Scene half = film-still register; reject ask = plain 像什么 — FORBIDDEN 变成什么 / 不该变成 / 不能变成.`;

const chineseM4Trap = `## Chinese — M4 avoid options (trap names only)
Plain trap reject in natural modern Chinese — self-contained playlist-trap name, not scene poetry.
**Shape:** vary openers across options (避开… / 不要… / 别选… / 别听… / 别掉进…) — not the same prefix on every chip.
When labelEn/labelZh match the canonical trap registry for the option id, use registry wording exactly.`;

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
~6–12 words OK for trap clarity.`,
        chineseM4Stem,
        chineseM4Trap
    );
}

/** M4 discriminant fallback: positive felt groove/pace/space. */
export function buildM4DiscriminantCopyRules(): string {
    return joinSections(
        bilingualIntro,
        `## English — plain felt sonic/motion (M4 discriminant only)
Short felt labels (~3–9 words): pace, groove grain, or spatial texture.
NO Skip/Avoid prefix · NO trap-cluster wording · NO genre names.`,
        `${chineseAntiCalque}
One clear felt read per chip — body/groove/space, not trap rejects.`
    );
}

/** @deprecated Use buildSceneCopyRules for M1–M3; mode-specific builders for M4. */
export function buildBilingualCopyRules(): string {
    return buildSceneCopyRules();
}

export const BILINGUAL_COPY_RULES = buildBilingualCopyRules();
export const CHINESE_LOCALIZATION_RULES = BILINGUAL_COPY_RULES;
