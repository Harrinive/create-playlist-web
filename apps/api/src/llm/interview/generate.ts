import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import {
    type BilingualInterviewStep,
    interviewStepMeta
} from '../../types/interview-step.js';
import { draftInterviewStep, reviseInterviewStep } from './draft.js';
import { planInterviewTurn } from './plan.js';
import { buildFastUserPrompt, fastSystemPrompt } from './prompts.js';
import {
    extractJson,
    llmStepSchema,
    type InterviewTurnContext,
    type LlmStepDraft
} from './shared.js';
import { verifyInterviewStep } from './verify.js';

export type GenerateInterviewStepInput = InterviewTurnContext & {
    algorithmMode?: 'fast' | 'full';
};

function toBilingualStep(stepIndex: number, parsed: LlmStepDraft): BilingualInterviewStep {
    const meta = interviewStepMeta(stepIndex);
    if (!meta) {
        throw new Error(`Invalid step index ${stepIndex}`);
    }

    let options = parsed.options.map((option) => ({
        id: option.id,
        label: { en: option.labelEn.trim(), zh: option.labelZh.trim() }
    }));

    if (meta.multi) {
        const hasNone = options.some((o) => o.id === 'none');
        if (!hasNone) {
            options = [
                ...options,
                {
                    id: 'none',
                    label: { en: "None of these — I'm open", zh: '都可以' }
                }
            ];
        }
    }

    const step: BilingualInterviewStep = {
        id: meta.id,
        dimension: { ...meta.dimension },
        stem: { en: parsed.stemEn.trim(), zh: parsed.stemZh.trim() },
        multi: meta.multi,
        options
    };

    if (parsed.hintEn?.trim() && parsed.hintZh?.trim()) {
        step.hint = { en: parsed.hintEn.trim(), zh: parsed.hintZh.trim() };
    }

    return step;
}

async function generateInterviewStepFast(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<BilingualInterviewStep> {
    const meta = interviewStepMeta(input.stepIndex);
    if (!meta) {
        throw new Error(`Invalid step index ${input.stepIndex}`);
    }

    const userPrompt = buildFastUserPrompt(
        input.stepIndex,
        input.priorAnswers,
        input.rejectedStems,
        input.refresh
    );

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: fastSystemPrompt() },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = llmStepSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Interview LLM returned invalid JSON: ${parsed.error.message}`);
    }

    return toBilingualStep(input.stepIndex, parsed.data);
}

async function generateInterviewStepFull(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<BilingualInterviewStep> {
    const meta = interviewStepMeta(input.stepIndex);
    if (!meta) {
        throw new Error(`Invalid step index ${input.stepIndex}`);
    }

    const plan = await planInterviewTurn(env, input, model);
    let draft = await draftInterviewStep(env, input, plan, model);

    const verification = await verifyInterviewStep(env, input, plan, draft, model);
    if (!verification.passed && verification.failures.length > 0) {
        draft = await reviseInterviewStep(env, input, plan, draft, verification.failures, model);
    }

    return toBilingualStep(input.stepIndex, draft);
}

export function resolveInterviewAlgorithmMode(
    env: Env,
    override?: 'fast' | 'full'
): 'fast' | 'full' {
    if (override === 'fast' || override === 'full') return override;
    const mode = env.INTERVIEW_ALGORITHM_MODE ?? 'full';
    return mode === 'fast' ? 'fast' : 'full';
}

export async function generateInterviewStep(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<BilingualInterviewStep> {
    const mode = resolveInterviewAlgorithmMode(env, input.algorithmMode);
    if (mode === 'fast') {
        return generateInterviewStepFast(env, input, model);
    }
    return generateInterviewStepFull(env, input, model);
}
