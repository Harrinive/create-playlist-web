import type { Env } from '../../config.js';
import { resolveInterviewDefaultModel } from '../interview-models.js';
import { completeChat } from '../../llm-router/index.js';
import {
    buildCopyVerifyUserPrompt,
    buildLogicVerifyUserPrompt,
    copyVerifySystemPrompt,
    logicVerifySystemPrompt
} from './prompts.js';
import { resolveTurnConfig } from './turn-config.js';
import { resolveInterviewStep } from './resolve-step.js';
import {
    extractJson,
    verifyResultSchema,
    type InterviewTurnContext,
    type LlmStepDraft,
    type TurnPlan,
    type VerifyResult
} from './shared.js';

function resolveStepId(ctx: InterviewTurnContext): string {
    if (ctx.stepId) return ctx.stepId;
    return resolveInterviewStep(
        ctx.stepIndex,
        ctx.priorAnswers,
        ctx.plannerState,
        ctx.openingContext
    ).stepId;
}

function resolveTotalSteps(ctx: InterviewTurnContext): number {
    if (ctx.plannerState?.stepIds?.length) return ctx.plannerState.stepIds.length;
    return resolveInterviewStep(
        ctx.stepIndex,
        ctx.priorAnswers,
        ctx.plannerState,
        ctx.openingContext
    ).totalSteps;
}

function resolveVerifyModel(env: Env, model?: string): string | undefined {
    return env.INTERVIEW_VERIFY_MODEL ?? model ?? resolveInterviewDefaultModel(env) ?? undefined;
}

async function runVerifyLlm(
    env: Env,
    systemPrompt: string,
    userPrompt: string,
    model?: string
): Promise<VerifyResult> {
    const verifyModel = resolveVerifyModel(env, model);
    const raw = await completeChat(
        env,
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        { model: verifyModel }
    );

    const parsed = verifyResultSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        return { passed: false, failures: ['verify JSON parse error'] };
    }

    return parsed.data;
}

export async function verifyLogicInterviewStep(
    env: Env,
    ctx: InterviewTurnContext,
    plan: TurnPlan,
    draft: LlmStepDraft,
    model?: string
): Promise<VerifyResult> {
    const stepId = resolveStepId(ctx);
    const m4Mode = ctx.plannerState?.m4Mode;
    const totalSteps = resolveTotalSteps(ctx);
    const turnConfig = resolveTurnConfig(stepId, plan, ctx.priorAnswers, ctx.plannerState);
    const userPrompt = buildLogicVerifyUserPrompt(
        ctx.stepIndex,
        stepId,
        ctx.priorAnswers,
        JSON.stringify(plan, null, 2),
        JSON.stringify(draft, null, 2),
        turnConfig.logicVerifyIntro,
        m4Mode,
        totalSteps
    );

    return runVerifyLlm(env, logicVerifySystemPrompt(), userPrompt, model);
}

export async function verifyCopyInterviewStep(
    env: Env,
    ctx: InterviewTurnContext,
    draft: LlmStepDraft,
    model?: string
): Promise<VerifyResult> {
    const stepId = resolveStepId(ctx);
    const m4Mode = ctx.plannerState?.m4Mode;
    const totalSteps = resolveTotalSteps(ctx);
    const turnConfig = resolveTurnConfig(stepId, {} as TurnPlan, ctx.priorAnswers, ctx.plannerState);
    const userPrompt = buildCopyVerifyUserPrompt(
        ctx.stepIndex,
        stepId,
        ctx.priorAnswers,
        JSON.stringify(draft, null, 2),
        turnConfig.copyVerifyIntro,
        m4Mode,
        totalSteps
    );

    return runVerifyLlm(env, copyVerifySystemPrompt(stepId, m4Mode), userPrompt, model);
}

/** @deprecated Use verifyLogicInterviewStep + verifyCopyInterviewStep */
export async function verifyInterviewStep(
    env: Env,
    ctx: InterviewTurnContext,
    plan: TurnPlan,
    draft: LlmStepDraft,
    model?: string
): Promise<VerifyResult> {
    const logic = await verifyLogicInterviewStep(env, ctx, plan, draft, model);
    if (!logic.passed) return logic;
    return verifyCopyInterviewStep(env, ctx, draft, model);
}

export type CombinedVerifyResult = {
    passed: boolean;
    failures: string[];
    logicFailures: string[];
    copyFailures: string[];
    deterministicFailures: string[];
};

export function classifyReviseKind(
    deterministicFailures: string[],
    logicFailures: string[],
    copyFailures: string[]
): 'all' | 'logic' | 'copy' {
    if (deterministicFailures.length > 0 || logicFailures.length > 0) return 'all';
    if (copyFailures.length > 0) return 'copy';
    return 'all';
}
