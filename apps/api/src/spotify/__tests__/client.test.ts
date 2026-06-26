import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import { getAppAccessToken, resetAppAccessTokenCache } from '../client.js';
import type { Env } from '../../config.js';

const testEnv = {
    SPOTIFY_CLIENT_ID: 'test-client-id',
    SPOTIFY_CLIENT_SECRET: 'test-client-secret',
    SPOTIFY_REDIRECT_URI: 'http://127.0.0.1:3001/auth/spotify/callback',
    SESSION_SECRET: 'test-session-secret-32chars',
    WEB_ORIGIN: 'http://127.0.0.1:4321',
    PORT: 3001,
    NODE_ENV: 'test'
} as Env;

const originalFetch = globalThis.fetch;

beforeEach(() => {
    resetAppAccessTokenCache();
});

afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAppAccessTokenCache();
});

test('getAppAccessToken fetches and caches client credentials token', async () => {
    let fetchCount = 0;
    globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.includes('accounts.spotify.com/api/token')) {
            fetchCount += 1;
            assert.equal(
                new URLSearchParams(String(init?.body)).get('grant_type'),
                'client_credentials'
            );
            return new Response(JSON.stringify({ access_token: 'app-token-1', expires_in: 3600 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        throw new Error(`Unexpected fetch: ${url}`);
    };

    const first = await getAppAccessToken(testEnv);
    const second = await getAppAccessToken(testEnv);
    assert.equal(first, 'app-token-1');
    assert.equal(second, 'app-token-1');
    assert.equal(fetchCount, 1);
});

test('getAppAccessToken refreshes when cache is near expiry', async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
        fetchCount += 1;
        const token = fetchCount === 1 ? 'app-token-old' : 'app-token-new';
        return new Response(JSON.stringify({ access_token: token, expires_in: 30 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    };

    const first = await getAppAccessToken(testEnv);
    const second = await getAppAccessToken(testEnv);
    assert.equal(first, 'app-token-old');
    assert.equal(second, 'app-token-new');
    assert.equal(fetchCount, 2);
});
