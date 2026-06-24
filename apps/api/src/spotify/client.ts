import { decrypt } from '../crypto.js';
import type { Env } from '../config.js';
import type { TokenStore, UserRecord } from '../store/types.js';

type TokenResponse = {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
};

function basicAuth(clientId: string, clientSecret: string): string {
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

export async function exchangeCodeForTokens(
    env: Env,
    code: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.SPOTIFY_REDIRECT_URI
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: basicAuth(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    if (!response.ok) {
        throw new Error(`Token exchange failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as TokenResponse;
    if (!data.refresh_token) {
        throw new Error('Spotify did not return a refresh token');
    }

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000
    };
}

async function refreshAccessToken(
    env: Env,
    refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt: number }> {
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: basicAuth(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as TokenResponse;
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000
    };
}

export async function getValidAccessToken(
    env: Env,
    store: TokenStore,
    user: UserRecord
): Promise<string> {
    const now = Date.now();
    if (user.accessToken && user.expiresAt && user.expiresAt > now + 60_000) {
        return user.accessToken;
    }

    const refreshToken = decrypt(user.refreshTokenEnc, env.SESSION_SECRET);
    const tokens = await refreshAccessToken(env, refreshToken);
    await store.updateUserTokens(user.id, {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
        refreshToken: tokens.refreshToken
    });
    return tokens.accessToken;
}

export function buildAuthorizeUrl(env: Env, state: string): string {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: env.SPOTIFY_CLIENT_ID,
        scope: 'playlist-modify-private playlist-modify-public user-read-private',
        redirect_uri: env.SPOTIFY_REDIRECT_URI,
        state
    });
    return `https://accounts.spotify.com/authorize?${params}`;
}

type SpotifyProfile = {
    id: string;
    display_name: string | null;
};

export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyProfile> {
    const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        throw new Error(`Failed to load Spotify profile (${response.status})`);
    }
    return (await response.json()) as SpotifyProfile;
}

export type SpotifySearchTrack = {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    uri: string;
    duration_ms: number;
    album?: { name: string };
};

type SpotifyFetchOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
};

export async function spotifyFetch<T>(
    accessToken: string,
    path: string,
    options: SpotifyFetchOptions = {}
): Promise<T> {
    const response = await fetch(`https://api.spotify.com/v1/${path}`, {
        method: options.method ?? 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
        throw new Error(`Spotify API failed (${response.status}): ${await response.text()}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

type SpotifySearchResponse = {
    tracks?: {
        items: SpotifySearchTrack[];
    };
};

export async function searchTracks(
    accessToken: string,
    query: string,
    limit = 5
): Promise<SpotifySearchTrack[]> {
    const params = new URLSearchParams({
        q: query,
        type: 'track',
        limit: String(limit)
    });
    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        throw new Error(`Spotify search failed (${response.status}): ${await response.text()}`);
    }
    const data = (await response.json()) as SpotifySearchResponse;
    return data.tracks?.items ?? [];
}
