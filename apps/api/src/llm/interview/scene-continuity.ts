import type { LlmStepDraft } from './shared.js';

const STOP = new Set(['the', 'this', 'that', 'with', 'from', 'still', 'most', 'like', 'feels', 'feel']);

function anchorTokens(label: string): string[] {
    const raw = label
        .toLowerCase()
        .split(/[\s,，、—–-]+/)
        .map((w) => w.replace(/[^a-z0-9\u4e00-\u9fff]/g, ''))
        .filter((w) => w.length >= 3 && !STOP.has(w));
    return [...new Set(raw)];
}

function textIncludesAnchor(text: string, token: string): boolean {
    const lower = text.toLowerCase();
    if (lower.includes(token)) return true;
    if (token.endsWith('s') && lower.includes(token.slice(0, -1))) return true;
    return false;
}

function optionUsesAnchor(opt: LlmStepDraft['options'][number], tokens: string[]): boolean {
    const blob = `${opt.labelEn} ${opt.labelZh}`.toLowerCase();
    return tokens.some((t) => textIncludesAnchor(blob, t));
}

/** Soft hint for logic verify — stem or ≥1 option should echo prior scene. */
export function verifySceneContinuity(
    stepId: string,
    draft: LlmStepDraft,
    priorLabels: string[]
): string[] {
    if (priorLabels.length === 0 || !['m2', 'm3', 'm4'].includes(stepId)) return [];

    const tokens = [...new Set(priorLabels.flatMap((l) => anchorTokens(l)))];
    if (tokens.length === 0) return [];

    const stemBlob = `${draft.stemEn} ${draft.stemZh}`.toLowerCase();
    const stemHits = tokens.some((t) => textIncludesAnchor(stemBlob, t));
    const optionHits = draft.options.filter((o) => optionUsesAnchor(o, tokens)).length;

    if (!stemHits && optionHits === 0) {
        return [
            `options inconsistent with prior answers — no overlap with established scene (${tokens.slice(0, 6).join(', ')})`
        ];
    }

    return [];
}
