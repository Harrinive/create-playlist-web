/** Shared prose pattern checks — code layer (prompt-editing principle G). */

export const REJECT_PROSE_PATTERNS: RegExp[] = [
    /\bavoid(s|ing)?\b/i,
    /\bkeep clear of\b/i,
    /\bplease no\b/i,
    /\bnothing clubby\b/i,
    /\bno club\b/i,
    /\bno edm\b/i,
    /避开/,
    /不要/,
    /请勿/,
    /别要/
];

export const TEMPLATE_PROSE_PATTERNS: RegExp[] = [
    /^a playlist for\b/i,
    /\bfeels [a-z]/i,
    /\bbuilt from\b/i,
    /\bthe pace should be\b/i,
    /\bi'm looking for music\b/i,
    /\bsonically,\b/i,
    /\bscene:\s/i,
    /\bmood:\s/i,
    /为.+而选/,
    /感受.+，节奏/
];

export const TAG_META_PATTERNS: RegExp[] = [
    /\btags mark\b/i,
    /\btags flag\b/i,
    /\btag those\b/i,
    /\b标注/,
    /只在.*标注/,
    /标注.*过渡/,
    /ordering dimensions?:/i,
    /extra ordering dimensions/i
];

export const ARC_CATALOG_PATTERNS: RegExp[] = [
    /^二十六首/,
    /^twenty-six (cuts|tracks)/i,
    /\b26 (tracks|cuts|songs)\b/i
];

export function proseStartsArcPaste(field: string, arc: string): boolean {
    const f = field.trim();
    const a = arc.trim();
    if (!f || !a || f.length < 16) return false;
    return a.startsWith(f.slice(0, Math.min(f.length, 48)));
}

export function proseMostlySameAsArc(field: string, arc: string): boolean {
    const f = field.trim();
    const a = arc.trim();
    if (!f || !a) return false;
    if (f === a) return true;
    const shorter = f.length < a.length ? f : a;
    const longer = f.length < a.length ? a : f;
    if (shorter.length < 40) return false;
    return longer.startsWith(shorter.slice(0, Math.min(shorter.length, 120)));
}
