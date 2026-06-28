import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
    buildCompactBrief,
    formatBriefBlock
} from '../brief.js';
import type { Env } from '../config.js';
import { curateTracklist } from '../llm/curate.js';
import { pickPlaylistMetadata } from '../llm/curate-metadata.js';
import { inferSonic, answersWithInferredM5 } from '../llm/infer-sonic.js';
import { interviewPlannerStateSchema, parsePlannerState } from '../types/interview-planner.js';
import {
    findCurateModel,
    isAllowedCurateModel,
    listCurateModels,
    llmConfigured,
    normalizeCurateModelId,
    resolveCurateDefaultModel
} from '../llm/models.js';
import { addTracksToPlaylist, createPlaylist } from '../spotify/publish.js';
import { trimVerifiedLines, verifySuccessRate } from '../spotify/trim.js';
import { verifyProposedLines } from '../spotify/verify.js';
import { getAppAccessToken, getValidAccessToken } from '../spotify/client.js';
import { deriveCooldownSets } from '../store/playlist-memory.js';
import type { InterviewAnswers } from '../types/interview.js';
import type { TokenStore, UserRecord } from '../store/types.js';
import { resolveSessionUser } from './auth.js';

const interviewOptionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1)
});

const interviewAnswersSchema = z.object({
    m1: interviewOptionSchema,
    m2: interviewOptionSchema,
    m3: interviewOptionSchema,
    m5: interviewOptionSchema.optional(),
    m_clarify: interviewOptionSchema.optional(),
    m4: z.array(interviewOptionSchema).min(1)
});

const proposedLineSchema = z.object({
    lineNumber: z.number().int().positive(),
    artist: z.string().min(1),
    title: z.string().min(1),
    tags: z.string(),
    raw: z.string().min(1)
});

const playlistMetadataSchema = z.object({
    en: z.object({ name: z.string(), description: z.string() }),
    zh: z.object({ name: z.string(), description: z.string() })
});

const sequenceIntentSchema = z.union([
    z.string(),
    z.object({ en: z.string(), zh: z.string() })
]);

function normalizeSequenceIntent(
    value: string | { en: string; zh: string } | undefined
): { en: string; zh: string } {
    if (!value) return { en: '', zh: '' };
    if (typeof value === 'string') return { en: value.trim(), zh: '' };
    return { en: value.en.trim(), zh: value.zh.trim() };
}

const compactBriefSchema = z.object({
    anchor: z.string(),
    emotion: z.string(),
    pace: z.string(),
    sonic: z.string(),
    flow: z.string(),
    reject: z.array(z.string()),
    seeds: z.string(),
    cooldownText: z.string().optional()
});

type AppContext = {
    env: Env;
    store: TokenStore;
};

async function resolveOptionalUser(
    request: Parameters<typeof resolveSessionUser>[0],
    ctx: AppContext
): Promise<UserRecord | null> {
    const summary = await resolveSessionUser(request, ctx);
    if (!summary) return null;
    return ctx.store.getUserById(summary.id);
}

async function requireUser(request: Parameters<typeof resolveSessionUser>[0], ctx: AppContext) {
    return resolveOptionalUser(request, ctx);
}

async function loadCooldownForUser(ctx: AppContext, user: UserRecord | null) {
    if (!user) {
        return deriveCooldownSets([]);
    }
    const memory = await ctx.store.getPlaylistMemory(user.id);
    return deriveCooldownSets(memory);
}

export async function registerBuildRoutes(app: FastifyInstance, ctx: AppContext) {
    app.get('/api/curate/models', async () => {
        const models = listCurateModels(ctx.env).map((option) => ({
            id: option.id,
            labelEn: option.labelEn,
            labelZh: option.labelZh
        }));
        return {
            models,
            defaultModel: resolveCurateDefaultModel(ctx.env),
            llmConfigured: models.length > 0
        };
    });

    app.post('/api/curate', async (request, reply) => {
        const user = await resolveOptionalUser(request, ctx);

        const body = z
            .object({
                answers: interviewAnswersSchema,
                model: z.string().optional(),
                plannerState: interviewPlannerStateSchema.nullish()
            })
            .safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid interview answers' });
        }

        if (!isAllowedCurateModel(ctx.env, body.data.model)) {
            return reply.code(400).send({
                error: 'Model not available on this server',
                requestedModel: body.data.model ?? null,
                availableModels: listCurateModels(ctx.env).map((option) => option.id)
            });
        }

        if (!llmConfigured(ctx.env)) {
            return reply.code(503).send({
                error: 'LLM not configured',
                hint: 'Set OPENAI_API_KEY, ANTHROPIC_API_KEY, and/or CURSOR_API_KEY on the API server'
            });
        }

        const cooldown = await loadCooldownForUser(ctx, user);
        const plannerState = body.data.plannerState
            ? parsePlannerState(body.data.plannerState)
            : null;

        let answers = body.data.answers as InterviewAnswers;
        let inferredProse: string | undefined;
        if (!answers.m5?.id) {
            const inferred = await inferSonic(
                ctx.env,
                answers,
                plannerState,
                body.data.model
            );
            answers = answersWithInferredM5(answers, inferred);
            inferredProse = inferred.prose;
        }

        const brief = buildCompactBrief(answers, cooldown, inferredProse, {
            interviewStory: plannerState?.interviewStory,
            reachableGenresNote: plannerState?.reachableGenresNote,
            plannerState
        });

        try {
            const model =
                normalizeCurateModelId(ctx.env, body.data.model) ??
                resolveCurateDefaultModel(ctx.env) ??
                undefined;
            const curated = await curateTracklist(
                ctx.env,
                brief,
                model,
                plannerState?.hypotheses
            );
            const modelInfo = model ? findCurateModel(ctx.env, model) : null;
            return {
                brief,
                briefText: formatBriefBlock(brief),
                sequenceIntent: curated.sequenceIntent,
                playlistMetadata: curated.playlistMetadata,
                orderingAxes: curated.orderingAxes,
                lines: curated.lines,
                proposedCount: curated.lines.length,
                model: model ?? null,
                modelLabel: modelInfo?.labelEn ?? model ?? null
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Curate failed';
            return reply.code(502).send({ error: message });
        }
    });

    app.post('/api/verify', async (request, reply) => {
        const user = await resolveOptionalUser(request, ctx);

        const body = z
            .object({
                lines: z.array(proposedLineSchema).min(1),
                brief: compactBriefSchema.optional()
            })
            .safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid verify payload' });
        }

        const cooldown = await loadCooldownForUser(ctx, user);
        const accessToken = await getAppAccessToken(ctx.env);
        const verified = await verifyProposedLines(accessToken, body.data.lines, cooldown);
        const successRate = verifySuccessRate(verified);
        const trimmed = trimVerifiedLines(verified, cooldown);

        return {
            verified,
            successRate,
            okCount: verified.filter((line) => line.status === 'ok').length,
            proposedCount: body.data.lines.length,
            tracks: trimmed.tracks,
            skipped: trimmed.skipped,
            offerPromptFallback: successRate < 0.5,
            brief: body.data.brief ?? null
        };
    });

    app.post('/api/publish', async (request, reply) => {
        const user = await requireUser(request, ctx);
        if (!user) {
            return reply.code(401).send({ error: 'Not authenticated' });
        }

        const body = z
            .object({
                brief: compactBriefSchema,
                answers: interviewAnswersSchema,
                locale: z.enum(['en', 'zh']).optional().default('en'),
                sequenceIntent: sequenceIntentSchema.optional(),
                playlistMetadata: playlistMetadataSchema.optional(),
                proposedCount: z.number().int().positive().optional(),
                tracks: z
                    .array(
                        z.object({
                            lineNumber: z.number().int().positive(),
                            id: z.string().min(1),
                            artist: z.string().min(1),
                            title: z.string().min(1),
                            uri: z.string().min(1)
                        })
                    )
                    .min(1)
                    .max(100),
                skipped: z.array(
                    z.object({
                        proposed: z.string(),
                        reason: z.string()
                    })
                ).optional()
            })
            .safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid publish payload' });
        }

        const memory = await ctx.store.getPlaylistMemory(user.id);
        const cooldown = deriveCooldownSets(memory);
        const publishTracks = body.data.tracks.filter((track) => !cooldown.hardBlockIds.has(track.id));
        if (publishTracks.length < 10) {
            return reply.code(409).send({
                error: 'cooldown_conflict',
                trackCount: publishTracks.length,
                message: 'Too few tracks remain after filtering recent playlist repeats'
            });
        }

        const accessToken = await getValidAccessToken(ctx.env, ctx.store, user);
        const locale = body.data.locale;
        let name = '';
        let description = '';

        if (body.data.playlistMetadata) {
            ({ name, description } = pickPlaylistMetadata(locale, body.data.playlistMetadata));
        }

        if (!name.trim() || !description.trim()) {
            return reply.code(400).send({
                error: 'missing_playlist_metadata',
                message: 'Publish requires curate-generated playlist metadata'
            });
        }

        name = name.slice(0, 100);
        description = description.slice(0, 300);

        const sequenceIntent = normalizeSequenceIntent(body.data.sequenceIntent);

        try {
            const playlist = await createPlaylist(accessToken, { name, description, public: false });
            await addTracksToPlaylist(
                accessToken,
                playlist.id,
                publishTracks.map((track) => track.uri)
            );

            await ctx.store.appendPlaylistMemory(user.id, {
                createdAt: new Date().toISOString(),
                spotifyPlaylistId: playlist.id,
                name: playlist.name,
                anchor: body.data.brief.anchor,
                tracks: publishTracks.map((track) => ({
                    id: track.id,
                    artist: track.artist,
                    title: track.title
                }))
            });

            return {
                playlist: {
                    id: playlist.id,
                    url: playlist.url,
                    name: playlist.name
                },
                trackCount: publishTracks.length,
                proposedCount: body.data.proposedCount ?? publishTracks.length,
                sequenceIntent,
                tracks: publishTracks,
                skipped: body.data.skipped ?? []
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Publish failed';
            return reply.code(502).send({ error: message });
        }
    });
}
