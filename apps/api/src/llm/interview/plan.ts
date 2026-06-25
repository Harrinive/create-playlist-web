import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import { buildFilterHints } from './filter.js';
import { buildPlanUserPrompt, planSystemPrompt } from './prompts.js';
import { extractJson, turnPlanSchema, type InterviewTurnContext, type TurnPlan } from './shared.js';

export async function planInterviewTurn(
    env: Env,
    ctx: InterviewTurnContext,
    model?: string
): Promise<TurnPlan> {
    const filterHints = buildFilterHints(ctx.stepIndex, ctx.priorAnswers);
    const userPrompt = buildPlanUserPrompt(
        ctx.stepIndex,
        ctx.priorAnswers,
        ctx.rejectedStems,
        ctx.refresh,
        filterHints
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
    return { ...parsed.data, filterDrops: mergedDrops };
}
