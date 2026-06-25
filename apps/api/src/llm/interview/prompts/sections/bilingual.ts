import { joinSections } from '../join.js';

const englishFreeVerse = `## English — imagist free verse, not UX copy
Concrete nouns/verbs; ~3–9 words per chip; read aloud — if it sounds like a survey label, rewrite.
Forbidden: "what kind of place…" · parallel comma-noun templates on every option · motion-manual chips.`;

const chineseModernPoetry = `## Chinese — 现代诗, not 英译中
Compose labelZh/stemZh independently. One image per chip; 4–12 字 typical. Forbidden: 怎么动起来 · 这首歌 · English word order.`;

const bilingualIntro = `Bilingual: same axis in EN and ZH — each side composed independently, never line-by-line translation.`;

export function buildBilingualCopyRules(): string {
    return joinSections(bilingualIntro, englishFreeVerse, chineseModernPoetry);
}

export const BILINGUAL_COPY_RULES = buildBilingualCopyRules();
export const CHINESE_LOCALIZATION_RULES = BILINGUAL_COPY_RULES;
