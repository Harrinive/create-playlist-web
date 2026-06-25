import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import {
    buildDraftUserPrompt,
    buildReviseUserPrompt,
    draftSystemPrompt,
    reviseCopySystemPrompt
} from './prompts.js';
import { resolveTurnConfig } from './turn-config.js';
import { resolveInterviewStep, stepMetaForId } from './resolve-step.js';
import {
    extractJson,
    llmStepSchema,
    type InterviewTurnContext,
    type LlmStepDraft,
    type TurnPlan
} from './shared.js';

export async function draftInterviewStep(
    env: Env,
    ctx: InterviewTurnContext,
    plan: TurnPlan,
    model?: string
): Promise<LlmStepDraft> {
    const resolved = resolveInterviewStep(
        ctx.stepIndex,
        ctx.priorAnswers,
        ctx.plannerState,
        ctx.openingContext
    );
    const stepId = ctx.stepId ?? resolved.stepId;
    const meta = stepMetaForId(stepId);
    const plannedCount = plan.plannedOptionCount;
    const optionCount =
        plannedCount >= meta.optionMin && plannedCount <= meta.optionMax
            ? String(plannedCount)
            : `${meta.optionMin}–${meta.optionMax}`;
    const turnConfig = resolveTurnConfig(stepId, plan, ctx.priorAnswers);
    const totalSteps = ctx.plannerState?.stepIds?.length ?? resolved.totalSteps;

    const userPrompt = buildDraftUserPrompt(
        ctx.stepIndex,
        stepId,
        ctx.priorAnswers,
        ctx.rejectedStems,
        ctx.refresh,
        JSON.stringify(plan, null, 2),
        optionCount,
        turnConfig.draftBlocks,
        plan.q1RegionsToCover
    );

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: draftSystemPrompt() },
            { role: 'user', content: userPrompt.replace(
                `Question ${ctx.stepIndex + 1} of 5`,
                `Question ${ctx.stepIndex + 1} of ${totalSteps}`
            ) }
        ],
        { model }
    );

    const parsed = llmStepSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Interview draft returned invalid JSON: ${parsed.error.message}`);
    }

    return parsed.data;
}

export async function reviseInterviewStep(
    env: Env,
    ctx: InterviewTurnContext,
    plan: TurnPlan,
    draft: LlmStepDraft,
    failures: string[],
    model?: string,
    kind: 'all' | 'logic' | 'copy' = 'all'
): Promise<LlmStepDraft> {
    const userPrompt = buildReviseUserPrompt(
        ctx.priorAnswers,
        ctx.rejectedStems,
        JSON.stringify(plan, null, 2),
        JSON.stringify(draft, null, 2),
        failures
    );

    const systemPrompt = kind === 'copy' ? reviseCopySystemPrompt() : draftSystemPrompt();

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = llmStepSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Interview revise returned invalid JSON: ${parsed.error.message}`);
    }

    return parsed.data;
}
