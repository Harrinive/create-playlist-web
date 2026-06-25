import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import type { BilingualInterviewStep } from '../../types/interview-step.js';
import { draftInterviewStep, reviseInterviewStep } from './draft.js';
import { planInterviewTurn } from './plan.js';
import { buildFastUserPrompt, fastSystemPrompt } from './prompts.js';
import {
    mergePlanIntoPlannerState,
    resolveInterviewStep,
    stepMetaForId
} from './resolve-step.js';
import type { InterviewPlannerState } from '../../types/interview-planner.js';
import { emptyPlannerState } from '../../types/interview-planner.js';
import {
    extractJson,
    llmStepSchema,
    type InterviewTurnContext,
    type LlmStepDraft,
    type TurnPlan
} from './shared.js';
import { verifyDeterministic } from './verify-deterministic.js';
import { fitDraftOptionCount, fitPlanOptionIds, normalizeDraftM4Ids } from './normalize-draft.js';
import {
    classifyReviseKind,
    verifyCopyInterviewStep,
    verifyLogicInterviewStep
} from './verify.js';
import {
    hasM1M2M3Answers,
    sanitizeDeliveryGenreNote,
    synthesizeInterviewStory
} from './story-synthesize.js';
import { partitionDeterministicFailures } from './verify-severity.js';

export type GenerateInterviewStepInput = InterviewTurnContext & {
    algorithmMode?: 'fast' | 'full';
};

export type GenerateInterviewStepResult = {
    step: BilingualInterviewStep;
    plannerState: InterviewPlannerState;
    totalSteps: number;
    stepIds: string[];
    optionalClarifyIncluded: boolean;
    confidenceDiscriminantIncluded: boolean;
    plan?: TurnPlan;
};

function toBilingualStep(stepId: string, parsed: LlmStepDraft): BilingualInterviewStep {
    const meta = stepMetaForId(stepId);

    let options = parsed.options.map((option) => {
        const entry: BilingualInterviewStep['options'][number] = {
            id: option.id,
            label: { en: option.labelEn.trim(), zh: option.labelZh.trim() }
        };
        const allowOptionGloss = meta.id !== 'm2' && meta.id !== 'm3';
        if (allowOptionGloss && option.glossEn?.trim() && option.glossZh?.trim()) {
            entry.gloss = { en: option.glossEn.trim(), zh: option.glossZh.trim() };
        }
        return entry;
    });

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
        id: meta.id as BilingualInterviewStep['id'],
        dimension: { ...meta.dimension },
        stem: { en: parsed.stemEn.trim(), zh: parsed.stemZh.trim() },
        multi: meta.multi,
        options
    };

    if (parsed.hintEn?.trim() && parsed.hintZh?.trim()) {
        step.hint = { en: parsed.hintEn.trim(), zh: parsed.hintZh.trim() };
    }

    if (parsed.stemGlossEn?.trim() && parsed.stemGlossZh?.trim()) {
        const sceneStep = ['m1', 'm2', 'm3', 'm_clarify'].includes(meta.id);
        if (!sceneStep) {
            step.stemGloss = { en: parsed.stemGlossEn.trim(), zh: parsed.stemGlossZh.trim() };
        }
    }

    return step;
}

async function generateInterviewStepFast(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<GenerateInterviewStepResult> {
    const resolved = resolveInterviewStep(
        input.stepIndex,
        input.priorAnswers,
        input.plannerState,
        input.openingContext
    );

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

    const plannerState = input.plannerState ?? emptyPlannerState(input.openingContext);

    return {
        step: toBilingualStep(resolved.stepId, parsed.data),
        plannerState,
        totalSteps: resolved.totalSteps,
        stepIds: resolved.stepIds,
        optionalClarifyIncluded: resolved.optionalClarifyIncluded,
        confidenceDiscriminantIncluded: resolved.confidenceDiscriminantIncluded
    };
}

function maxVerifyAttempts(_stepId: string): number {
    return 5;
}

/** Copy verify is slow and subjective on scene turns — draft prompt + logic verify suffice. */
function shouldRunCopyVerify(stepId: string): boolean {
    return stepId === 'm4' || stepId === 'm_clarify';
}

function stripSceneStemGloss(draft: LlmStepDraft, stepId: string): LlmStepDraft {
    if (!['m1', 'm2', 'm3', 'm_clarify'].includes(stepId)) return draft;
    return {
        ...draft,
        stemGlossEn: undefined,
        stemGlossZh: undefined
    };
}

async function generateInterviewStepFull(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<GenerateInterviewStepResult> {
    const resolved = resolveInterviewStep(
        input.stepIndex,
        input.priorAnswers,
        input.plannerState,
        input.openingContext
    );
    let plannerState = input.plannerState ?? emptyPlannerState(input.openingContext);
    const stepId = resolved.stepId;
    const ctxWithStep: InterviewTurnContext = { ...input, stepId };

    if (
        stepId === 'm4' &&
        hasM1M2M3Answers(input.priorAnswers) &&
        !plannerState.interviewStory
    ) {
        try {
            const story = await synthesizeInterviewStory(
                env,
                input.priorAnswers,
                plannerState.reachableGenresNote,
                model
            );
            plannerState = {
                ...plannerState,
                interviewStory: story,
                deliveryGenreNote: plannerState.reachableGenresNote
                    ? sanitizeDeliveryGenreNote(plannerState.reachableGenresNote)
                    : plannerState.deliveryGenreNote
            };
        } catch (error) {
            console.warn(
                '[interview] story synthesis failed — continuing without interviewStory:',
                error instanceof Error ? error.message : error
            );
        }
    }

    const plan = await planInterviewTurn(env, ctxWithStep, model);
    const meta = stepMetaForId(stepId);
    const fittedPlan = fitPlanOptionIds(plan, stepId, meta.optionMax);

    if (stepId === 'm3') {
        plannerState = mergePlanIntoPlannerState(plannerState, fittedPlan, stepId);
        const refreshed = resolveInterviewStep(
            input.stepIndex,
            input.priorAnswers,
            plannerState,
            input.openingContext
        );
        plannerState = { ...plannerState, stepIds: refreshed.stepIds };
    } else {
        plannerState = mergePlanIntoPlannerState(plannerState, fittedPlan, stepId);
    }

    let draft = fitDraftOptionCount(
        normalizeDraftM4Ids(
            await draftInterviewStep(env, ctxWithStep, fittedPlan, model),
            stepId
        ),
        fittedPlan,
        stepId,
        meta.optionMax
    );

    let deterministicFailures: string[] = [];
    let logicFailures: string[] = [];
    let copyFailures: string[] = [];
    const verifyAttempts = maxVerifyAttempts(stepId);
    const runCopyVerify = shouldRunCopyVerify(stepId);

    for (let attempt = 0; attempt < verifyAttempts; attempt += 1) {
        draft = stripSceneStemGloss(
            fitDraftOptionCount(draft, fittedPlan, stepId, meta.optionMax),
            stepId
        );

        const priorLabels = [
            input.priorAnswers.m1?.label,
            stepId === 'm3' ? input.priorAnswers.m2?.label : undefined
        ].filter((l): l is string => Boolean(l?.trim()));

        const det = verifyDeterministic({
            stepId,
            plan: fittedPlan,
            draft,
            optionMin: meta.optionMin,
            optionMax: meta.optionMax,
            priorLabels
        });
        deterministicFailures = det.failures;

        const logic = await verifyLogicInterviewStep(env, ctxWithStep, fittedPlan, draft, model);
        logicFailures = logic.passed ? [] : logic.failures;

        const copy =
            runCopyVerify && det.passed && logic.passed
                ? await verifyCopyInterviewStep(env, ctxWithStep, draft, model)
                : { passed: true, failures: [] as string[] };
        copyFailures = copy.passed ? [] : copy.failures;

        const allFailures = [...deterministicFailures, ...logicFailures, ...copyFailures];
        if (allFailures.length === 0) break;

        const isLastAttempt = attempt === verifyAttempts - 1;
        if (isLastAttempt) {
            const { hard, soft } = partitionDeterministicFailures(deterministicFailures);
            if (hard.length === 0) {
                console.warn(
                    `[interview] verify exhausted (${verifyAttempts} attempts) — shipping best-effort draft:`,
                    [...soft, ...logicFailures, ...copyFailures].join('; ')
                );
                break;
            }
            throw new Error(
                `Interview verify failed after ${verifyAttempts} attempts: ${[...hard, ...soft, ...logicFailures, ...copyFailures].join('; ')}`
            );
        }

        const kind = classifyReviseKind(deterministicFailures, logicFailures, copyFailures);
        draft = fitDraftOptionCount(
            normalizeDraftM4Ids(
                await reviseInterviewStep(
                    env,
                    ctxWithStep,
                    fittedPlan,
                    draft,
                    allFailures,
                    model,
                    kind
                ),
                stepId
            ),
            fittedPlan,
            stepId,
            meta.optionMax
        );
    }

    const finalResolved = resolveInterviewStep(
        input.stepIndex,
        input.priorAnswers,
        plannerState,
        input.openingContext
    );

    return {
        step: toBilingualStep(stepId, draft),
        plannerState,
        totalSteps: finalResolved.totalSteps,
        stepIds: finalResolved.stepIds,
        optionalClarifyIncluded: finalResolved.optionalClarifyIncluded,
        confidenceDiscriminantIncluded: finalResolved.confidenceDiscriminantIncluded,
        plan: fittedPlan
    };
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
): Promise<GenerateInterviewStepResult> {
    const mode = resolveInterviewAlgorithmMode(env, input.algorithmMode);
    if (mode === 'fast') {
        return generateInterviewStepFast(env, input, model);
    }
    return generateInterviewStepFull(env, input, model);
}

/** @deprecated Use GenerateInterviewStepResult.step */
export async function generateInterviewStepLegacy(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<BilingualInterviewStep> {
    const result = await generateInterviewStep(env, input, model);
    return result.step;
}
