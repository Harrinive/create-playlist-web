import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Env } from '../config.js';
import { randomToken } from '../crypto.js';
import {
    buildAuthorizeUrl,
    exchangeCodeForTokens,
    fetchSpotifyProfile
} from '../spotify/client.js';
import { SESSION_TTL_MS } from '../store/constants.js';
import type { TokenStore } from '../store/types.js';

export const SESSION_COOKIE = 'cp_session';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type AppContext = {
    env: Env;
    store: TokenStore;
};

function cookieOptions(env: Env) {
    const secure = env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure,
        sameSite: secure ? ('none' as const) : ('lax' as const),
        path: '/',
        maxAge: SESSION_TTL_MS / 1000
    };
}

export async function registerAuthRoutes(app: FastifyInstance, ctx: AppContext) {
    const { env, store } = ctx;

    app.get('/auth/spotify', async (_request, reply) => {
        const state = randomToken();
        await store.saveOAuthState(state, OAUTH_STATE_TTL_MS);
        reply.setCookie('cp_oauth_state', state, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: OAUTH_STATE_TTL_MS / 1000
        });
        return reply.redirect(buildAuthorizeUrl(env, state));
    });

    app.get('/auth/spotify/callback', async (request: FastifyRequest, reply: FastifyReply) => {
        const query = request.query as { code?: string; state?: string; error?: string };
        if (query.error) {
            return reply.redirect(`${env.WEB_ORIGIN}/build?error=${encodeURIComponent(query.error)}`);
        }

        const { code, state } = query;
        if (!code || !state) {
            return reply.redirect(`${env.WEB_ORIGIN}/build?error=missing_code`);
        }

        const cookieState = request.cookies.cp_oauth_state;
        if (!cookieState || cookieState !== state) {
            return reply.redirect(`${env.WEB_ORIGIN}/build?error=invalid_state`);
        }

        const valid = await store.consumeOAuthState(state);
        if (!valid) {
            return reply.redirect(`${env.WEB_ORIGIN}/build?error=expired_state`);
        }

        reply.clearCookie('cp_oauth_state', { path: '/' });

        try {
            const tokens = await exchangeCodeForTokens(env, code);
            const profile = await fetchSpotifyProfile(tokens.accessToken);
            const user = await store.upsertUser({
                spotifyUserId: profile.id,
                displayName: profile.display_name,
                refreshToken: tokens.refreshToken,
                accessToken: tokens.accessToken,
                expiresAt: tokens.expiresAt
            });
            const session = await store.createSession(user.id, SESSION_TTL_MS);
            reply.setCookie(SESSION_COOKIE, session.id, cookieOptions(env));
            return reply.redirect(`${env.WEB_ORIGIN}/build?connected=1`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'auth_failed';
            return reply.redirect(`${env.WEB_ORIGIN}/build?error=${encodeURIComponent(message)}`);
        }
    });

    app.post('/auth/logout', async (request, reply) => {
        const sessionId = request.cookies[SESSION_COOKIE];
        if (sessionId) {
            await store.deleteSession(sessionId);
        }
        reply.clearCookie(SESSION_COOKIE, { path: '/' });
        return { ok: true };
    });
}

export async function resolveSessionUser(
    request: FastifyRequest,
    ctx: AppContext
): Promise<{ id: string; spotifyUserId: string; displayName: string | null } | null> {
    const sessionId = request.cookies[SESSION_COOKIE];
    if (!sessionId) return null;

    const session = await ctx.store.getSession(sessionId);
    if (!session) return null;

    const user = await ctx.store.getUserById(session.userId);
    if (!user) return null;

    return {
        id: user.id,
        spotifyUserId: user.spotifyUserId,
        displayName: user.displayName
    };
}
