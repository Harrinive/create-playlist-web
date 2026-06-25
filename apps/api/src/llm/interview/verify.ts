import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import { buildVerifyUserPrompt, verifySystemPrompt } from './prompts.js';
import {
    extractJson,
    verifyResultSchema,
    type InterviewTurnContext,
    type LlmStepDraft,
    type TurnPlan,
    type VerifyResult
} from './shared.js';

export async function verifyInterviewStep(
    env: Env,
    ctx: InterviewTurnContext,
    plan: TurnPlan,
    draft: LlmStepDraft,
    model?: string
): Promise<VerifyResult> {
    const userPrompt = buildVerifyUserPrompt(
        ctx.stepIndex,
        ctx.priorAnswers,
        JSON.stringify(plan, null, 2),
        JSON.stringify(draft, null, 2)
    );

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: verifySystemPrompt() },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = verifyResultSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        return { passed: true, failures: [] };
    }

    return parsed.data;
}
