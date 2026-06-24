import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
    buildCompactBrief,
    buildPlaylistDescription,
    buildPlaylistName,
    formatBriefBlock
} from '../brief.js';
import type { Env } from '../config.js';
import { curateTracklist } from '../llm/curate.js';
import { addTracksToPlaylist, createPlaylist } from '../spotify/publish.js';
import { trimVerifiedLines, verifySuccessRate } from '../spotify/trim.js';
import { verifyProposedLines } from '../spotify/verify.js';
import { getValidAccessToken } from '../spotify/client.js';
import { deriveCooldownSets } from '../store/playlist-memory.js';
import type { InterviewAnswers } from '../types/interview.js';
import type { TokenStore } from '../store/types.js';
import { resolveSessionUser } from './auth.js';

const interviewOptionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1)
});

const interviewAnswersSchema = z.object({
    m1: interviewOptionSchema,
    m2: interviewOptionSchema,
    m3: interviewOptionSchema,
    m5: interviewOptionSchema,
    m4: z.array(interviewOptionSchema).min(1)
});

const proposedLineSchema = z.object({
    lineNumber: z.number().int().positive(),
    artist: z.string().min(1),
    title: z.string().min(1),
    tags: z.string(),
    raw: z.string().min(1)
});

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

async function requireUser(request: Parameters<typeof resolveSessionUser>[0], ctx: AppContext) {
    const summary = await resolveSessionUser(request, ctx);
    if (!summary) return null;
    const user = await ctx.store.getUserById(summary.id);
    if (!user) return null;
    return user;
}

export async function registerBuildRoutes(app: FastifyInstance, ctx: AppContext) {
    app.post('/api/curate', async (request, reply) => {
        const user = await requireUser(request, ctx);
        if (!user) {
            return reply.code(401).send({ error: 'Not authenticated' });
        }

        const body = z
            .object({
                answers: interviewAnswersSchema,
                model: z.string().optional()
            })
            .safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid interview answers' });
        }

        if (!ctx.env.OPENAI_API_KEY && !ctx.env.ANTHROPIC_API_KEY) {
            return reply.code(503).send({
                error: 'LLM not configured',
                hint: 'Set OPENAI_API_KEY or ANTHROPIC_API_KEY on the API server'
            });
        }

        const memory = await ctx.store.getPlaylistMemory(user.id);
        const cooldown = deriveCooldownSets(memory);
        const brief = buildCompactBrief(body.data.answers as InterviewAnswers, cooldown);

        try {
            const curated = await curateTracklist(ctx.env, brief, body.data.model);
            return {
                brief,
                briefText: formatBriefBlock(brief),
                sequenceIntent: curated.sequenceIntent,
                orderingAxes: curated.orderingAxes,
                lines: curated.lines,
                proposedCount: curated.lines.length
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Curate failed';
            return reply.code(502).send({ error: message });
        }
    });

    app.post('/api/verify', async (request, reply) => {
        const user = await requireUser(request, ctx);
        if (!user) {
            return reply.code(401).send({ error: 'Not authenticated' });
        }

        const body = z
            .object({
                lines: z.array(proposedLineSchema).min(1),
                brief: compactBriefSchema.optional()
            })
            .safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid verify payload' });
        }

        const memory = await ctx.store.getPlaylistMemory(user.id);
        const cooldown = deriveCooldownSets(memory);
        const accessToken = await getValidAccessToken(ctx.env, ctx.store, user);
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
                sequenceIntent: z.string().optional(),
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

        const accessToken = await getValidAccessToken(ctx.env, ctx.store, user);
        const name = buildPlaylistName(body.data.brief);
        const description = buildPlaylistDescription(body.data.brief);

        try {
            const playlist = await createPlaylist(accessToken, { name, description, public: false });
            await addTracksToPlaylist(
                accessToken,
                playlist.id,
                body.data.tracks.map((track) => track.uri)
            );

            await ctx.store.appendPlaylistMemory(user.id, {
                createdAt: new Date().toISOString(),
                spotifyPlaylistId: playlist.id,
                name: playlist.name,
                anchor: body.data.brief.anchor,
                tracks: body.data.tracks.map((track) => ({
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
                trackCount: body.data.tracks.length,
                proposedCount: body.data.proposedCount ?? body.data.tracks.length,
                sequenceIntent: body.data.sequenceIntent ?? '',
                tracks: body.data.tracks,
                skipped: body.data.skipped ?? []
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Publish failed';
            return reply.code(502).send({ error: message });
        }
    });
}
