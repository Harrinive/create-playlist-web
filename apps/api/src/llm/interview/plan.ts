import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import { buildFilterHints } from './filter.js';
import { buildPlanUserPrompt, planSystemPrompt, Q1_REGION_IDS } from './prompts.js';
import { resolveInterviewStep } from './resolve-step.js';
import { extractJson, turnPlanSchema, type InterviewTurnContext, type TurnPlan } from './shared.js';

function defaultQ1Regions(): string[] {
    return [...Q1_REGION_IDS];
}

const KINETIC_REGION_IDS = ['kinetic-high', 'rhythm-social', 'edge-charged'] as const;

/** Planner often omits kinetic tags — verify hard-fails Q1 without one. */
export function ensureM1KineticCoverage(plan: TurnPlan): TurnPlan {
    const slots = { ...(plan.optionSlots ?? {}) };
    const hasKinetic = Object.values(slots).some((slot) =>
        KINETIC_REGION_IDS.includes(slot.regionId as (typeof KINETIC_REGION_IDS)[number])
    );
    if (hasKinetic) return plan;

    const entries = Object.entries(slots);
    if (entries.length === 0) return plan;

    const preferRegion = ['social-mid', 'restless-charged', 'focus-flow', 'bittersweet-mid'];
    const pick =
        entries.find(([, slot]) => slot.regionId && preferRegion.includes(slot.regionId)) ??
        entries[entries.length - 1];
    const [slotId, slot] = pick;

    slots[slotId] = { ...slot, regionId: 'kinetic-high' };

    return { ...plan, optionSlots: slots };
}

export async function planInterviewTurn(
    env: Env,
    ctx: InterviewTurnContext,
    model?: string
): Promise<TurnPlan> {
    const resolved = resolveInterviewStep(
        ctx.stepIndex,
        ctx.priorAnswers,
        ctx.plannerState,
        ctx.openingContext
    );
    const stepId = ctx.stepId ?? resolved.stepId;
    const filterHints = buildFilterHints(stepId, ctx.priorAnswers, ctx.plannerState);
    const userPrompt = buildPlanUserPrompt(
        ctx.stepIndex,
        stepId,
        ctx.priorAnswers,
        ctx.rejectedStems,
        ctx.refresh,
        filterHints,
        resolved.totalSteps
    );

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: planSystemPrompt() },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = turnPlanSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Interview plan returned invalid JSON: ${parsed.error.message}`);
    }

    const mergedDrops = [...new Set([...parsed.data.filterDrops, ...filterHints])];
    const plan: TurnPlan = {
        ...parsed.data,
        filterDrops: mergedDrops,
        q1RegionsToCover:
            stepId === 'm1'
                ? parsed.data.q1RegionsToCover ?? defaultQ1Regions()
                : parsed.data.q1RegionsToCover,
        questionMode:
            parsed.data.questionMode ??
            (stepId === 'm4' ? 'ClearDiscriminant' : 'SceneFeeling'),
        needsGrooveGrain:
            parsed.data.needsGrooveGrain ??
            (ctx.plannerState?.needsGrooveGrain && stepId === 'm3' && parsed.data.coverageRisk)
    };

    if (stepId === 'm3' && plan.needsGrooveGrain && plan.coverageRisk) {
        plan.questionMode = 'LogicalDecision';
    }

    if (stepId === 'm4') {
        plan.questionMode = 'ClearDiscriminant';
    }

    if (stepId === 'm1') {
        return ensureM1KineticCoverage(plan);
    }

    return plan;
}
