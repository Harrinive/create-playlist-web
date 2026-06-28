import type { InterviewAnswers } from '../../types/interview.js';
import type { InterviewPlannerState } from '../../types/interview-planner.js';
import type { LlmStepDraft, TurnPlan } from './shared.js';
import {
    computeEligibleTraps,
    optionMatchesAnyDroppedTrap,
    trapClusterById,
    type TrapCluster
} from './m4-eligibility.js';
import { verifyM1PlacePartition } from './verify-m1-frame.js';

const M1_THRESHOLD_STEM_EN = 'Pick a still — where are you right now?';
const M1_THRESHOLD_STEM_ZH = '选一处画面——你此刻在哪里？';

const M1_ASK_RE =
    /\b(pick|choose|where|which|what|step into|选|哪|你此刻|走进)\b/i;

function trimLabelEn(text: string, maxWords = 12): string {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return trimmed;

    const sentences = trimmed.split(/(?<=[.!?])\s+/);
    let acc = '';
    for (const sentence of sentences) {
        const candidate = acc ? `${acc} ${sentence}` : sentence;
        if (candidate.split(/\s+/).filter(Boolean).length <= maxWords) {
            acc = candidate;
        } else {
            break;
        }
    }
    if (acc.split(/\s+/).filter(Boolean).length >= 4) return acc.trim();

    return words.slice(0, maxWords).join(' ');
}

/** Cap EN chip length — verify hard-fails >12 words; trim before verify as structural repair. */
export function trimSceneOptionLabels(draft: LlmStepDraft, stepId: string, maxWords = 12): LlmStepDraft {
    if (!['m2', 'm3', 'm4'].includes(stepId)) return draft;
    return {
        ...draft,
        options: draft.options.map((opt) => {
            const next = trimLabelEn(opt.labelEn, maxWords);
            return next === opt.labelEn ? opt : { ...opt, labelEn: next };
        })
    };
}

/** Trim excess LLM options — keeps planned ids and Q1 region coverage first. */
export function fitDraftOptionCount(
    draft: LlmStepDraft,
    plan: TurnPlan,
    stepId: string,
    optionMax: number
): LlmStepDraft {
    if (draft.options.length <= optionMax) return draft;

    const byId = new Map(draft.options.map((o) => [o.id, o]));
    const kept: LlmStepDraft['options'] = [];
    const has = (id: string) => kept.some((o) => o.id === id);

    const push = (opt: LlmStepDraft['options'][number] | undefined) => {
        if (!opt || has(opt.id) || kept.length >= optionMax) return;
        kept.push(opt);
    };

    if (stepId === 'm1' && plan.q1RegionsToCover?.length) {
        for (const region of plan.q1RegionsToCover) {
            const match = draft.options.find(
                (o) => plan.optionSlots[o.id]?.regionId === region && !has(o.id)
            );
            push(match);
        }
        const kinetic = ['kinetic-high', 'rhythm-social', 'edge-charged'];
        if (!kept.some((o) => kinetic.includes(plan.optionSlots[o.id]?.regionId ?? ''))) {
            push(
                draft.options.find(
                    (o) =>
                        kinetic.includes(plan.optionSlots[o.id]?.regionId ?? '') && !has(o.id)
                )
            );
        }
    }

    for (const id of plan.plannedOptionIds ?? []) {
        push(byId.get(id));
    }
    for (const id of Object.keys(plan.optionSlots ?? {})) {
        push(byId.get(id));
    }
    for (const opt of draft.options) {
        push(opt);
    }

    return { ...draft, options: kept.slice(0, optionMax) };
}

/** Strip mood-template too-* prefix from M4 planned ids (verify hard-fails too-*). */
export function sanitizeM4TrapId(id: string): string {
    if (id === 'none' || id === 'you-decide') return id;
    if (!/^too-/i.test(id)) return id;
    const stripped = id.replace(/^too-/i, '').replace(/^-+/, '');
    return stripped.length > 0 ? stripped : 'playlist-trap';
}

export function normalizeDraftM4Ids(draft: LlmStepDraft, stepId: string): LlmStepDraft {
    if (stepId !== 'm4') return draft;
    return {
        ...draft,
        options: draft.options.map((opt) => ({
            ...opt,
            id: sanitizeM4TrapId(opt.id)
        }))
    };
}

/** Positive escape hatch when discriminant plan calls for open/no-constraints slot. */
const DISCRIMINANT_ESCAPE_IDS = new Set(['open-any', 'no-constraints', 'no-constraint']);
const DISCRIMINANT_ESCAPE_OPTION = {
    id: 'open-any',
    labelEn: 'Let it breathe — follow the moment',
    labelZh: '随它去——跟着当下走'
};

export type M4NormalizeContext = {
    priorAnswers?: Partial<InterviewAnswers>;
    planner?: InterviewPlannerState | null;
    optionMin?: number;
    optionMax?: number;
};

function trapOptionFromCluster(cluster: TrapCluster): LlmStepDraft['options'][number] {
    return {
        id: cluster.id,
        labelEn: cluster.labelEnTemplate,
        labelZh: cluster.labelZhTemplate
    };
}

/** Replace dropped M4 avoid traps with eligible registry clusters (deterministic repair). */
export function repairM4AvoidEligibleTraps(
    draft: LlmStepDraft,
    plan: TurnPlan,
    ctx: M4NormalizeContext
): LlmStepDraft {
    if (plan.questionMode !== 'ClearDiscriminant') return draft;
    const prior = ctx.priorAnswers ?? {};
    const { eligible, dropped } = computeEligibleTraps(prior, ctx.planner);
    const eligibleById = new Map(eligible.map((c) => [c.id, c]));
    const droppedIds = new Set(dropped.map((c) => c.id));

    const noneOpt = draft.options.find((o) => o.id === 'none');
    const keptNonNone = draft.options.filter((opt) => {
        if (opt.id === 'none') return false;
        return !optionMatchesAnyDroppedTrap(opt.id, opt.labelEn, opt.labelZh, dropped);
    });

    const usedIds = new Set(keptNonNone.map((o) => o.id));
    const plannedNonNone = (plan.plannedOptionIds ?? []).filter((id) => id !== 'none').length;
    const maxTotal = ctx.optionMax ?? 6;
    const targetNonNone = Math.max(
        3,
        Math.min(maxTotal - (noneOpt ? 1 : 0), plannedNonNone || plan.plannedOptionCount || 4)
    );

    const additions: LlmStepDraft['options'] = [];
    const tryAdd = (cluster: TrapCluster | undefined) => {
        if (
            !cluster ||
            droppedIds.has(cluster.id) ||
            usedIds.has(cluster.id) ||
            additions.length + keptNonNone.length >= targetNonNone
        ) {
            return;
        }
        additions.push(trapOptionFromCluster(cluster));
        usedIds.add(cluster.id);
    };

    for (const id of plan.plannedOptionIds ?? []) {
        if (id === 'none') continue;
        tryAdd(eligibleById.get(id));
    }
    for (const cluster of eligible) {
        if (additions.length + keptNonNone.length >= targetNonNone) break;
        tryAdd(cluster);
    }

    const merged = [...keptNonNone, ...additions];
    if (noneOpt) merged.push(noneOpt);
    return { ...draft, options: merged.slice(0, ctx.optionMax ?? 6) };
}

/** Apply canonical trap label templates when option id matches registry (avoid mode). */
export function normalizeM4AvoidLabels(draft: LlmStepDraft, plan: TurnPlan): LlmStepDraft {
    if (plan.questionMode !== 'ClearDiscriminant') return draft;
    return {
        ...draft,
        options: draft.options.map((opt) => {
            if (opt.id === 'none') return opt;
            const cluster = trapClusterById(opt.id);
            if (!cluster) return opt;
            return {
                ...opt,
                labelEn: cluster.labelEnTemplate,
                labelZh: cluster.labelZhTemplate
            };
        })
    };
}

/** Strip none and avoid-framing leakage on discriminant drafts. */
export function normalizeM4DiscriminantDraft(draft: LlmStepDraft, plan: TurnPlan): LlmStepDraft {
    if (plan.questionMode !== 'PositiveDiscriminant') return draft;
    let options = draft.options.filter((o) => o.id !== 'none');

    const plannedEscape = (plan.plannedOptionIds ?? []).find((id) =>
        DISCRIMINANT_ESCAPE_IDS.has(id)
    );
    if (plannedEscape && !options.some((o) => DISCRIMINANT_ESCAPE_IDS.has(o.id))) {
        options = [
            ...options,
            {
                ...DISCRIMINANT_ESCAPE_OPTION,
                id: plannedEscape === 'no-constraints' ? 'no-constraints' : DISCRIMINANT_ESCAPE_OPTION.id
            }
        ];
    }

    return { ...draft, options };
}

export function normalizeM4Draft(
    draft: LlmStepDraft,
    stepId: string,
    plan: TurnPlan,
    ctx: M4NormalizeContext = {}
): LlmStepDraft {
    let next = normalizeDraftM4Ids(draft, stepId);
    if (stepId !== 'm4') return next;
    if (plan.questionMode === 'PositiveDiscriminant') {
        return normalizeM4DiscriminantDraft(next, plan);
    }
    next = repairM4AvoidEligibleTraps(next, plan, ctx);
    return normalizeM4AvoidLabels(next, plan);
}

function extractM1SensoryPrefix(text: string, maxWords = 14): string | undefined {
    const trimmed = text.trim();
    if (!trimmed || M1_ASK_RE.test(trimmed)) return undefined;

    const dashParts = trimmed.split(/\s*[—–]\s*/);
    if (dashParts.length >= 2) {
        const first = dashParts[0]!.trim();
        if (first.split(/\s+/).filter(Boolean).length <= maxWords) return first;
    }

    const sentence = trimmed.split(/(?<=[.!?])\s+/)[0]?.trim().replace(/[.!?]$/, '');
    if (sentence && sentence.split(/\s+/).filter(Boolean).length <= maxWords) {
        return sentence;
    }
    return undefined;
}

/** Rewrite locked-caption M1 stems to threshold-invite before verify (deterministic repair). */
export function repairM1ThresholdStem(draft: LlmStepDraft, plan: TurnPlan): LlmStepDraft {
    const failures = verifyM1PlacePartition(draft, plan);
    const stemFailures = failures.filter((f) => !f.includes('optionRole must be place-partition'));
    if (stemFailures.length === 0) return draft;

    const prefixEn = extractM1SensoryPrefix(draft.stemEn);
    const prefixZh = extractM1SensoryPrefix(draft.stemZh);

    return {
        ...draft,
        stemEn: prefixEn ? `${prefixEn} — ${M1_THRESHOLD_STEM_EN}` : M1_THRESHOLD_STEM_EN,
        stemZh: prefixZh ? `${prefixZh}——${M1_THRESHOLD_STEM_ZH}` : M1_THRESHOLD_STEM_ZH
    };
}

export function normalizeM1Draft(
    draft: LlmStepDraft,
    stepId: string,
    plan: TurnPlan
): LlmStepDraft {
    if (stepId !== 'm1') return draft;
    return repairM1ThresholdStem(draft, plan);
}

/** Cap planner output so verify does not inherit oversized option lists. */
export function fitPlanOptionIds(
    plan: TurnPlan,
    stepId: string,
    optionMax: number
): TurnPlan {
    let next = plan;
    if (stepId === 'm4' && plan.plannedOptionIds?.length) {
        const idMap = new Map<string, string>();
        for (const id of plan.plannedOptionIds) {
            idMap.set(id, sanitizeM4TrapId(id));
        }
        const plannedOptionIds = plan.plannedOptionIds.map((id) => idMap.get(id) ?? id);
        const optionSlots: TurnPlan['optionSlots'] = {};
        for (const [key, slot] of Object.entries(plan.optionSlots ?? {})) {
            optionSlots[sanitizeM4TrapId(key)] = slot;
        }
        next = { ...plan, plannedOptionIds, optionSlots };
    }

    const cap = next.plannedOptionCount
        ? Math.min(next.plannedOptionCount, optionMax)
        : optionMax;
    const ids = next.plannedOptionIds;
    if (!ids || ids.length <= cap) return next;

    const trimmed = ids.slice(0, cap);
    const slots = { ...next.optionSlots };
    for (const key of Object.keys(slots)) {
        if (!trimmed.includes(key)) delete slots[key];
    }
    return { ...next, plannedOptionIds: trimmed, optionSlots: slots };
}
