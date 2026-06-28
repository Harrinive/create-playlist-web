import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import type { BilingualInterviewStep } from '../../types/interview-step.js';
import { draftInterviewStep, reviseInterviewStep } from './draft.js';
import { planInterviewTurn } from './plan.js';
import { buildFastUserPrompt, fastSystemPrompt } from './prompts.js';
import {
    applyM4GateToPlanner,
    mergePlanIntoPlannerState,
    resolveInterviewStep,
    stepMetaForId
} from './resolve-step.js';
import { M4_NONE_LABELS } from './m4-eligibility.js';
import type { InterviewAnswers } from '../../types/interview.js';
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
import {
    fitDraftOptionCount,
    fitPlanOptionIds,
    normalizeM1Draft,
    normalizeM4Draft,
    trimSceneOptionLabels,
    type M4NormalizeContext
} from './normalize-draft.js';
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
import { draftUsesCanonicalTrapLabels } from './m4-eligibility.js';

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

/** Zero-gloss policy: LLM prompts omit gloss fields; re-enable when product wants parens again. */
const EMIT_OPTION_GLOSS = false;
const EMIT_STEM_GLOSS = false;

function toBilingualStep(
    stepId: string,
    parsed: LlmStepDraft,
    planner?: InterviewPlannerState | null
): BilingualInterviewStep {
    const meta = stepMetaForId(stepId, planner);

    let options = parsed.options.map((option) => {
        const entry: BilingualInterviewStep['options'][number] = {
            id: option.id,
            label: { en: option.labelEn.trim(), zh: option.labelZh.trim() }
        };
        const allowOptionGloss =
            EMIT_OPTION_GLOSS && meta.id !== 'm2' && meta.id !== 'm3';
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
                    label: { en: M4_NONE_LABELS.labelEn, zh: M4_NONE_LABELS.labelZh }
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

    if (
        EMIT_STEM_GLOSS &&
        parsed.stemGlossEn?.trim() &&
        parsed.stemGlossZh?.trim()
    ) {
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
    const stepId = resolved.stepId;
    let plannerState = input.plannerState ?? emptyPlannerState(input.openingContext);

    if (stepId === 'm4' && !plannerState.m4Mode) {
        plannerState = applyM4GateToPlanner(plannerState, input.priorAnswers);
    }

    const meta = stepMetaForId(stepId, plannerState);
    const totalSteps = resolved.totalSteps;
    const emptyPlan: TurnPlan = {
        gaps: [],
        reachableGenresNote: 'fast mode',
        hypotheses: ['open'],
        plannedOptionCount: meta.optionMax,
        axis: stepId,
        sceneBeat: '',
        lateralHook: false,
        filterDrops: [],
        stemGuidance: '',
        optionGuidance: '',
        questionMode:
            stepId === 'm4'
                ? plannerState.m4Mode === 'avoid' || !plannerState.m4Mode
                    ? 'ClearDiscriminant'
                    : 'PositiveDiscriminant'
                : 'SceneFeeling',
        optionSlots: {},
        lastQuestionMode: plannerState.lastQuestionMode ?? 'avoid'
    };

    const priorLabels = [
        input.priorAnswers.m1?.label,
        stepId === 'm3' || stepId === 'm4' ? input.priorAnswers.m2?.label : undefined
    ].filter((l): l is string => Boolean(l?.trim()));

    let draft: LlmStepDraft | null = null;
    let verifyFailures: string[] = [];
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const userPrompt = buildFastUserPrompt(
            input.stepIndex,
            stepId,
            input.priorAnswers,
            input.rejectedStems,
            input.refresh || attempt > 0,
            totalSteps,
            attempt > 0 ? verifyFailures : [],
            plannerState
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
            if (attempt === maxAttempts - 1) {
                throw new Error(`Interview LLM returned invalid JSON: ${parsed.error.message}`);
            }
            verifyFailures = [`invalid JSON: ${parsed.error.message}`];
            continue;
        }

        draft = fitDraftOptionCount(
            stripSceneStemGloss(normalizeInterviewDraft(parsed.data, stepId, emptyPlan), stepId),
            emptyPlan,
            stepId,
            meta.optionMax
        );

        const det = verifyDeterministic({
            stepId,
            plan: emptyPlan,
            draft,
            optionMin: meta.optionMin,
            optionMax: meta.optionMax,
            priorLabels,
            priorAnswers: input.priorAnswers,
            planner: plannerState
        });

        verifyFailures = det.failures;
        if (det.passed) break;

        if (attempt === maxAttempts - 1) {
            throw new Error(
                `Fast interview verify failed after ${maxAttempts} attempts: ${verifyFailures.join('; ')}`
            );
        }
    }

    if (!draft) {
        throw new Error('Fast interview produced no draft');
    }

    return {
        step: toBilingualStep(stepId, draft, plannerState),
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

function m4NormalizeCtx(
    stepId: string,
    priorAnswers: Partial<InterviewAnswers>,
    planner: InterviewPlannerState,
    optionMin: number,
    optionMax: number
): M4NormalizeContext | undefined {
    if (stepId !== 'm4') return undefined;
    return { priorAnswers, planner, optionMin, optionMax };
}

function stripSceneStemGloss(draft: LlmStepDraft, stepId: string): LlmStepDraft {
    if (!['m1', 'm2', 'm3', 'm_clarify'].includes(stepId)) return draft;
    return {
        ...draft,
        stemGlossEn: undefined,
        stemGlossZh: undefined
    };
}

const JSON_RETRY_ATTEMPTS = 3;

function isJsonExtractFailure(err: unknown): boolean {
    if (err instanceof SyntaxError) return true;
    const message = err instanceof Error ? err.message : String(err);
    return /invalid JSON|JSON\.parse|Unexpected token|not valid JSON/i.test(message);
}

function isPlanSchemaRetryable(err: unknown): boolean {
    if (isJsonExtractFailure(err)) return true;
    const message = err instanceof Error ? err.message : String(err);
    return /Interview plan returned invalid JSON|invalid_type|Expected array, received null/i.test(
        message
    );
}

async function withJsonRetry<T>(
    label: string,
    fn: () => Promise<T>,
    retryable: (err: unknown) => boolean = isJsonExtractFailure
): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < JSON_RETRY_ATTEMPTS; attempt += 1) {
        try {
            return await fn();
        } catch (err) {
            if (!retryable(err)) throw err;
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt === JSON_RETRY_ATTEMPTS - 1) break;
        }
    }
    throw lastError ?? new Error(`${label} failed after ${JSON_RETRY_ATTEMPTS} retries`);
}

function normalizeInterviewDraft(
    draft: LlmStepDraft,
    stepId: string,
    plan: TurnPlan,
    ctx?: M4NormalizeContext
): LlmStepDraft {
    return normalizeM1Draft(normalizeM4Draft(draft, stepId, plan, ctx), stepId, plan);
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

    if (stepId === 'm4' && !plannerState.m4Mode) {
        plannerState = applyM4GateToPlanner(plannerState, input.priorAnswers);
    }

    const plan = await withJsonRetry(
        'plan',
        () => planInterviewTurn(env, { ...ctxWithStep, plannerState }, model),
        isPlanSchemaRetryable
    );
    const meta = stepMetaForId(stepId, plannerState);
    const fittedPlan = fitPlanOptionIds(plan, stepId, meta.optionMax);

    if (stepId === 'm3') {
        plannerState = mergePlanIntoPlannerState(
            plannerState,
            fittedPlan,
            stepId,
            undefined,
            input.priorAnswers
        );
        const refreshed = resolveInterviewStep(
            input.stepIndex,
            input.priorAnswers,
            plannerState,
            input.openingContext
        );
        plannerState = { ...plannerState, stepIds: refreshed.stepIds };
    } else if (stepId === 'm_clarify') {
        plannerState = mergePlanIntoPlannerState(
            plannerState,
            fittedPlan,
            stepId,
            undefined,
            input.priorAnswers
        );
    } else {
        plannerState = mergePlanIntoPlannerState(plannerState, fittedPlan, stepId);
    }

    let draft = fitDraftOptionCount(
        trimSceneOptionLabels(
            normalizeInterviewDraft(
                await withJsonRetry('draft', () =>
                    draftInterviewStep(env, ctxWithStep, fittedPlan, model)
                ),
                stepId,
                fittedPlan,
                m4NormalizeCtx(stepId, input.priorAnswers, plannerState, meta.optionMin, meta.optionMax)
            ),
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
            fitDraftOptionCount(trimSceneOptionLabels(draft, stepId), fittedPlan, stepId, meta.optionMax),
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
            priorLabels,
            priorAnswers: input.priorAnswers,
            planner: plannerState
        });
        deterministicFailures = det.failures;

        const logic = await verifyLogicInterviewStep(env, ctxWithStep, fittedPlan, draft, model);
        logicFailures = logic.passed ? [] : logic.failures;

        const skipM4CopyVerify =
            stepId === 'm4' &&
            (plannerState.m4Mode === 'avoid' || !plannerState.m4Mode) &&
            draftUsesCanonicalTrapLabels(draft);

        const copy =
            runCopyVerify && !skipM4CopyVerify && det.passed && logic.passed
                ? await verifyCopyInterviewStep(env, ctxWithStep, draft, model)
                : { passed: true, failures: [] as string[] };
        copyFailures = copy.passed ? [] : copy.failures;

        const allFailures = [...deterministicFailures, ...logicFailures, ...copyFailures];
        if (allFailures.length === 0) break;

        const isLastAttempt = attempt === verifyAttempts - 1;
        if (isLastAttempt) {
            throw new Error(
                `Interview verify failed after ${verifyAttempts} attempts: ${allFailures.join('; ')}`
            );
        }

        const kind = classifyReviseKind(deterministicFailures, logicFailures, copyFailures);
        draft = fitDraftOptionCount(
            trimSceneOptionLabels(
                normalizeInterviewDraft(
                    await withJsonRetry('revise', () =>
                        reviseInterviewStep(
                            env,
                            ctxWithStep,
                            fittedPlan,
                            draft,
                            allFailures,
                            model,
                            kind
                        )
                    ),
                    stepId,
                    fittedPlan,
                    m4NormalizeCtx(stepId, input.priorAnswers, plannerState, meta.optionMin, meta.optionMax)
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
        step: toBilingualStep(stepId, draft, plannerState),
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
