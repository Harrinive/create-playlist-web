import type { LlmStepDraft, TurnPlan } from './shared.js';
import { trapClusterById } from './m4-eligibility.js';

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
    const filtered = draft.options.filter((o) => o.id !== 'none');
    return { ...draft, options: filtered };
}

export function normalizeM4Draft(
    draft: LlmStepDraft,
    stepId: string,
    plan: TurnPlan
): LlmStepDraft {
    let next = normalizeDraftM4Ids(draft, stepId);
    if (stepId !== 'm4') return next;
    if (plan.questionMode === 'PositiveDiscriminant') {
        return normalizeM4DiscriminantDraft(next, plan);
    }
    return normalizeM4AvoidLabels(next, plan);
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
