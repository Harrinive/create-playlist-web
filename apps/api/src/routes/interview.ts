import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Env } from '../config.js';
import { generateInterviewStep } from '../llm/interview.js';
import { inferSonic, answersWithInferredM5 } from '../llm/infer-sonic.js';
import {
    findInterviewModel,
    interviewLlmConfigured,
    isAllowedInterviewModel,
    listInterviewModels,
    resolveInterviewDefaultModel
} from '../llm/interview-models.js';
import { resolveInterviewAlgorithmMode } from '../llm/interview.js';
import { generateSpotifyPrompt } from '../llm/spotify-prompt.js';
import {
    interviewPlannerStateSchema,
    openingContextSchema,
    parsePlannerState
} from '../types/interview-planner.js';
import type { InterviewAnswers } from '../types/interview.js';

const interviewOptionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1)
});

const promptOptionSchema = interviewOptionSchema.extend({
    labelEn: z.string().min(1).optional()
});

const priorAnswersSchema = z
    .object({
        m1: interviewOptionSchema.optional(),
        m2: interviewOptionSchema.optional(),
        m3: interviewOptionSchema.optional(),
        m5: interviewOptionSchema.optional(),
        m_clarify: interviewOptionSchema.optional(),
        m4: z.array(interviewOptionSchema).optional()
    })
    .optional()
    .default({});

type AppContext = {
    env: Env;
};

function isInterviewComplete(answers: Partial<InterviewAnswers>, stepIds: string[]): boolean {
    for (const stepId of stepIds) {
        if (stepId === 'm4') {
            if (!answers.m4?.length) return false;
            continue;
        }
        if (stepId === 'm_clarify') {
            if (!answers.m_clarify?.id) return false;
            continue;
        }
        const key = stepId as keyof InterviewAnswers;
        const value = answers[key];
        if (!value || Array.isArray(value)) return false;
        if (!('id' in value) || !value.id) return false;
    }
    return true;
}

export async function registerInterviewRoutes(app: FastifyInstance, ctx: AppContext) {
    app.get('/api/interview/models', async () => {
        const models = listInterviewModels(ctx.env).map((option) => ({
            id: option.id,
            labelEn: option.labelEn,
            labelZh: option.labelZh
        }));
        return {
            models,
            defaultModel: resolveInterviewDefaultModel(ctx.env),
            defaultAlgorithmMode: resolveInterviewAlgorithmMode(ctx.env),
            llmConfigured: interviewLlmConfigured(ctx.env)
        };
    });

    app.post('/api/interview/next', async (request, reply) => {
        const body = z
            .object({
                stepIndex: z.number().int().min(0).max(5),
                priorAnswers: priorAnswersSchema,
                rejectedStems: z.array(z.string()).optional().default([]),
                refresh: z.boolean().optional().default(false),
                model: z.string().optional(),
                algorithmMode: z.enum(['fast', 'full']).optional(),
                plannerState: interviewPlannerStateSchema.nullish(),
                openingContext: openingContextSchema.nullish()
            })
            .safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid interview request' });
        }

        if (!isAllowedInterviewModel(ctx.env, body.data.model)) {
            return reply.code(400).send({
                error: 'Model not available on this server',
                requestedModel: body.data.model ?? null,
                availableModels: listInterviewModels(ctx.env).map((option) => option.id)
            });
        }

        if (!interviewLlmConfigured(ctx.env)) {
            return reply.code(503).send({
                error: 'Interview LLM not configured',
                hint: 'Set OPENAI_API_KEY, ANTHROPIC_API_KEY, and/or CURSOR_API_KEY on the API server'
            });
        }

        const plannerState = body.data.plannerState
            ? parsePlannerState(body.data.plannerState)
            : null;
        if (body.data.plannerState && !plannerState) {
            return reply.code(400).send({ error: 'Invalid plannerState' });
        }

        try {
            const model =
                body.data.model ??
                resolveInterviewDefaultModel(ctx.env) ??
                undefined;
            const result = await generateInterviewStep(
                ctx.env,
                {
                    stepIndex: body.data.stepIndex,
                    priorAnswers: body.data.priorAnswers,
                    rejectedStems: body.data.rejectedStems,
                    refresh: body.data.refresh,
                    algorithmMode: body.data.algorithmMode,
                    plannerState: plannerState ?? undefined,
                    openingContext: body.data.openingContext ?? undefined
                },
                model
            );
            const modelInfo = model ? findInterviewModel(ctx.env, model) : null;
            return {
                step: result.step,
                stepIndex: body.data.stepIndex,
                stepId: result.step.id,
                totalSteps: result.totalSteps,
                stepIds: result.stepIds,
                plannerState: result.plannerState,
                optionalClarifyIncluded: result.optionalClarifyIncluded,
                confidenceDiscriminantIncluded: result.confidenceDiscriminantIncluded,
                model: model ?? null,
                modelLabel: modelInfo?.labelEn ?? model ?? null,
                algorithmMode: resolveInterviewAlgorithmMode(
                    ctx.env,
                    body.data.algorithmMode
                )
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Interview generation failed';
            return reply.code(502).send({ error: message });
        }
    });

    app.post('/api/interview/complete', async (request, reply) => {
        const body = z
            .object({
                answers: z.object({
                    m1: promptOptionSchema,
                    m2: promptOptionSchema,
                    m3: promptOptionSchema,
                    m5: promptOptionSchema.optional(),
                    m_clarify: promptOptionSchema.optional(),
                    m4: z.array(promptOptionSchema).min(1)
                }),
                plannerState: interviewPlannerStateSchema.nullish(),
                model: z.string().optional()
            })
            .safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid complete request' });
        }

        if (!interviewLlmConfigured(ctx.env)) {
            return reply.code(503).send({
                error: 'Interview LLM not configured',
                hint: 'Set OPENAI_API_KEY, ANTHROPIC_API_KEY, and/or CURSOR_API_KEY on the API server'
            });
        }

        try {
            const model =
                body.data.model ??
                resolveInterviewDefaultModel(ctx.env) ??
                undefined;
            const plannerState = body.data.plannerState
                ? parsePlannerState(body.data.plannerState)
                : null;

            const answers = body.data.answers as InterviewAnswers;
            const inferred = await inferSonic(
                ctx.env,
                answers,
                plannerState,
                model
            );
            const withM5 = answersWithInferredM5(answers, inferred);

            return {
                answers: withM5,
                inferredM5: inferred,
                plannerState: plannerState ?? undefined
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Interview complete failed';
            return reply.code(502).send({ error: message });
        }
    });

    app.post('/api/prompt', async (request, reply) => {
        const body = z
            .object({
                answers: z.object({
                    m1: promptOptionSchema,
                    m2: promptOptionSchema,
                    m3: promptOptionSchema,
                    m5: promptOptionSchema.optional(),
                    m_clarify: promptOptionSchema.optional(),
                    m4: z.array(promptOptionSchema).min(1)
                }),
                plannerState: interviewPlannerStateSchema.nullish(),
                model: z.string().optional()
            })
            .safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid prompt request' });
        }

        if (!isAllowedInterviewModel(ctx.env, body.data.model)) {
            return reply.code(400).send({
                error: 'Model not available on this server',
                requestedModel: body.data.model ?? null,
                availableModels: listInterviewModels(ctx.env).map((option) => option.id)
            });
        }

        if (!interviewLlmConfigured(ctx.env)) {
            return reply.code(503).send({
                error: 'Interview LLM not configured',
                hint: 'Set OPENAI_API_KEY, ANTHROPIC_API_KEY, and/or CURSOR_API_KEY on the API server'
            });
        }

        try {
            const model =
                body.data.model ??
                resolveInterviewDefaultModel(ctx.env) ??
                undefined;
            const plannerState = body.data.plannerState
                ? parsePlannerState(body.data.plannerState)
                : null;

            let answers = body.data.answers as InterviewAnswers;
            if (!answers.m5?.id) {
                const inferred = await inferSonic(ctx.env, answers, plannerState, model);
                answers = answersWithInferredM5(answers, inferred);
            }

            const paragraph = await generateSpotifyPrompt(
                ctx.env,
                answers,
                plannerState,
                model
            );
            const modelInfo = model ? findInterviewModel(ctx.env, model) : null;
            return {
                paragraph,
                answers,
                model: model ?? null,
                modelLabel: modelInfo?.labelEn ?? model ?? null
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Prompt generation failed';
            return reply.code(502).send({ error: message });
        }
    });
}

// exported for tests
export { isInterviewComplete };
