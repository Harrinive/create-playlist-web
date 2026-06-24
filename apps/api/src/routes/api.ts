import type { FastifyInstance } from 'fastify';
import type { Env } from '../config.js';
import { getValidAccessToken, searchTracks } from '../spotify/client.js';
import { registerAuthRoutes, resolveSessionUser } from './auth.js';
import { registerBuildRoutes } from './build.js';
import type { TokenStore } from '../store/types.js';

type AppContext = {
    env: Env;
    store: TokenStore;
};

export async function registerApiRoutes(app: FastifyInstance, ctx: AppContext) {
    await registerAuthRoutes(app, ctx);
    await registerBuildRoutes(app, ctx);

    app.get('/health', async () => ({ ok: true }));

    app.get('/api/me', async (request, reply) => {
        const user = await resolveSessionUser(request, ctx);
        if (!user) {
            return reply.code(401).send({ authenticated: false });
        }
        return { authenticated: true, user };
    });

    app.get('/api/search', async (request, reply) => {
        const userSummary = await resolveSessionUser(request, ctx);
        if (!userSummary) {
            return reply.code(401).send({ error: 'Not authenticated' });
        }

        const query = (request.query as { q?: string }).q?.trim();
        if (!query) {
            return reply.code(400).send({ error: 'Missing query parameter q' });
        }

        const user = await ctx.store.getUserById(userSummary.id);
        if (!user) {
            return reply.code(401).send({ error: 'Not authenticated' });
        }

        const accessToken = await getValidAccessToken(ctx.env, ctx.store, user);
        const tracks = await searchTracks(accessToken, query, 5);
        return {
            query,
            tracks: tracks.map((t) => ({
                id: t.id,
                name: t.name,
                artists: t.artists.map((a) => a.name).join(', '),
                uri: t.uri
            }))
        };
    });
}
