import type { LlmStepDraft, TurnPlan } from './shared.js';

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

/** Cap planner output so verify does not inherit oversized option lists. */
export function fitPlanOptionIds(
    plan: TurnPlan,
    stepId: string,
    optionMax: number
): TurnPlan {
    const ids = plan.plannedOptionIds;
    if (!ids || ids.length <= optionMax) return plan;

    const trimmed = ids.slice(0, optionMax);
    const slots = { ...plan.optionSlots };
    for (const key of Object.keys(slots)) {
        if (!trimmed.includes(key)) delete slots[key];
    }
    return { ...plan, plannedOptionIds: trimmed, optionSlots: slots };
}
