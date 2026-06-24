import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Env } from '../config.js';
import { generateInterviewStep } from '../llm/interview.js';
import {
    findInterviewModel,
    interviewLlmConfigured,
    isAllowedInterviewModel,
    listInterviewModels,
    resolveInterviewDefaultModel
} from '../llm/interview-models.js';

const interviewOptionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1)
});

const priorAnswersSchema = z
    .object({
        m1: interviewOptionSchema.optional(),
        m2: interviewOptionSchema.optional(),
        m3: interviewOptionSchema.optional(),
        m5: interviewOptionSchema.optional(),
        m4: z.array(interviewOptionSchema).optional()
    })
    .optional()
    .default({});

type AppContext = {
    env: Env;
};

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
            llmConfigured: interviewLlmConfigured(ctx.env)
        };
    });

    app.post('/api/interview/next', async (request, reply) => {
        const body = z
            .object({
                stepIndex: z.number().int().min(0).max(4),
                priorAnswers: priorAnswersSchema,
                rejectedStems: z.array(z.string()).optional().default([]),
                refresh: z.boolean().optional().default(false),
                model: z.string().optional()
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

        try {
            const model =
                body.data.model ??
                resolveInterviewDefaultModel(ctx.env) ??
                undefined;
            const step = await generateInterviewStep(
                ctx.env,
                {
                    stepIndex: body.data.stepIndex,
                    priorAnswers: body.data.priorAnswers,
                    rejectedStems: body.data.rejectedStems,
                    refresh: body.data.refresh
                },
                model
            );
            const modelInfo = model ? findInterviewModel(ctx.env, model) : null;
            return {
                step,
                model: model ?? null,
                modelLabel: modelInfo?.labelEn ?? model ?? null
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Interview generation failed';
            return reply.code(502).send({ error: message });
        }
    });
}
