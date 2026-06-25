import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import { interviewStepMeta } from '../../types/interview-step.js';
import {
    buildDraftUserPrompt,
    buildReviseUserPrompt,
    draftSystemPrompt
} from './prompts.js';
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
    const meta = interviewStepMeta(ctx.stepIndex);
    const optionCount = meta ? `${meta.optionMin}–${meta.optionMax}` : '4–6';
    const userPrompt = buildDraftUserPrompt(
        ctx.stepIndex,
        ctx.priorAnswers,
        ctx.rejectedStems,
        ctx.refresh,
        JSON.stringify(plan, null, 2),
        optionCount,
        plan.q1RegionsToCover
    );

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: draftSystemPrompt() },
            { role: 'user', content: userPrompt }
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
    model?: string
): Promise<LlmStepDraft> {
    const userPrompt = buildReviseUserPrompt(
        ctx.priorAnswers,
        ctx.rejectedStems,
        JSON.stringify(plan, null, 2),
        JSON.stringify(draft, null, 2),
        failures
    );

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: draftSystemPrompt() },
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
