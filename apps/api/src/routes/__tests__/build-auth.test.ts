import assert from 'node:assert/strict';
import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import test from 'node:test';
import type { Env } from '../../config.js';
import { registerBuildRoutes } from '../../routes/build.js';
import { MemoryTokenStore } from '../../store/memory.js';

const testEnv = {
    SPOTIFY_CLIENT_ID: 'test-client-id',
    SPOTIFY_CLIENT_SECRET: 'test-client-secret',
    SPOTIFY_REDIRECT_URI: 'http://127.0.0.1:3001/auth/spotify/callback',
    SESSION_SECRET: 'test-session-secret-32chars',
    WEB_ORIGIN: 'http://127.0.0.1:4321',
    PORT: 3001,
    NODE_ENV: 'test'
} as Env;

async function buildTestApp() {
    const app = Fastify();
    const store = new MemoryTokenStore(testEnv.SESSION_SECRET);
    await app.register(cookie, { secret: testEnv.SESSION_SECRET, hook: 'onRequest' });
    await registerBuildRoutes(app, { env: testEnv, store });
    return { app, store };
}

test('POST /api/curate without session returns 400 not 401 for invalid body', async () => {
    const { app } = await buildTestApp();
    const response = await app.inject({
        method: 'POST',
        url: '/api/curate',
        payload: {}
    });
    assert.equal(response.statusCode, 400);
    await app.close();
});

test('POST /api/verify without session returns 400 not 401 for invalid body', async () => {
    const { app } = await buildTestApp();
    const response = await app.inject({
        method: 'POST',
        url: '/api/verify',
        payload: {}
    });
    assert.equal(response.statusCode, 400);
    await app.close();
});

test('POST /api/publish without session returns 401', async () => {
    const { app } = await buildTestApp();
    const response = await app.inject({
        method: 'POST',
        url: '/api/publish',
        payload: {
            brief: {
                anchor: 'a',
                emotion: 'b',
                pace: 'c',
                sonic: 'd',
                flow: 'e',
                reject: [],
                seeds: 'none'
            },
            answers: {
                m1: { id: '1', label: '1' },
                m2: { id: '2', label: '2' },
                m3: { id: '3', label: '3' },
                m4: [{ id: '4', label: '4' }]
            },
            tracks: [
                {
                    lineNumber: 1,
                    id: 'track-1',
                    artist: 'Artist',
                    title: 'Title',
                    uri: 'spotify:track:1'
                }
            ]
        }
    });
    assert.equal(response.statusCode, 401);
    await app.close();
});
