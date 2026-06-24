import { Pool } from 'pg';
import { encrypt, randomToken } from '../crypto.js';
import type { PlaylistMemoryEntry } from './playlist-memory.js';
import { prunePlaylistMemory } from './playlist-memory.js';
import type { OAuthStateRecord, SessionRecord, TokenStore, UserRecord } from './types.js';

export class PostgresTokenStore implements TokenStore {
    constructor(
        private readonly pool: Pool,
        private readonly sessionSecret: string
    ) {}

    async init(): Promise<void> {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                spotify_user_id TEXT UNIQUE NOT NULL,
                display_name TEXT,
                refresh_token_enc TEXT NOT NULL,
                access_token TEXT,
                expires_at BIGINT,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at BIGINT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                expires_at BIGINT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS playlist_memory (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                spotify_playlist_id TEXT NOT NULL,
                name TEXT NOT NULL,
                anchor TEXT,
                tracks JSONB NOT NULL
            );
        `);
    }

    async saveOAuthState(state: string, ttlMs: number): Promise<void> {
        const expiresAt = Date.now() + ttlMs;
        await this.pool.query(
            `INSERT INTO oauth_states (state, expires_at) VALUES ($1, $2)
             ON CONFLICT (state) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
            [state, expiresAt]
        );
    }

    async consumeOAuthState(state: string): Promise<boolean> {
        const result = await this.pool.query<OAuthStateRecord>(
            `DELETE FROM oauth_states WHERE state = $1 AND expires_at > $2 RETURNING state`,
            [state, Date.now()]
        );
        return result.rowCount === 1;
    }

    async upsertUser(input: {
        spotifyUserId: string;
        displayName: string | null;
        refreshToken: string;
        accessToken: string;
        expiresAt: number;
    }): Promise<UserRecord> {
        const id = randomToken(16);
        const refreshTokenEnc = encrypt(input.refreshToken, this.sessionSecret);
        const result = await this.pool.query<UserRecord>(
            `INSERT INTO users (id, spotify_user_id, display_name, refresh_token_enc, access_token, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (spotify_user_id) DO UPDATE SET
               display_name = EXCLUDED.display_name,
               refresh_token_enc = EXCLUDED.refresh_token_enc,
               access_token = EXCLUDED.access_token,
               expires_at = EXCLUDED.expires_at,
               updated_at = NOW()
             RETURNING id, spotify_user_id AS "spotifyUserId", display_name AS "displayName",
                       refresh_token_enc AS "refreshTokenEnc", access_token AS "accessToken",
                       expires_at AS "expiresAt"`,
            [id, input.spotifyUserId, input.displayName, refreshTokenEnc, input.accessToken, input.expiresAt]
        );
        return result.rows[0];
    }

    async getUserById(id: string): Promise<UserRecord | null> {
        const result = await this.pool.query<UserRecord>(
            `SELECT id, spotify_user_id AS "spotifyUserId", display_name AS "displayName",
                    refresh_token_enc AS "refreshTokenEnc", access_token AS "accessToken",
                    expires_at AS "expiresAt"
             FROM users WHERE id = $1`,
            [id]
        );
        return result.rows[0] ?? null;
    }

    async createSession(userId: string, ttlMs: number): Promise<SessionRecord> {
        const id = randomToken(24);
        const expiresAt = Date.now() + ttlMs;
        await this.pool.query(`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`, [
            id,
            userId,
            expiresAt
        ]);
        return { id, userId, expiresAt };
    }

    async getSession(id: string): Promise<SessionRecord | null> {
        const result = await this.pool.query<SessionRecord>(
            `SELECT id, user_id AS "userId", expires_at AS "expiresAt"
             FROM sessions WHERE id = $1 AND expires_at > $2`,
            [id, Date.now()]
        );
        return result.rows[0] ?? null;
    }

    async deleteSession(id: string): Promise<void> {
        await this.pool.query(`DELETE FROM sessions WHERE id = $1`, [id]);
    }

    async updateUserTokens(
        userId: string,
        input: { accessToken: string; expiresAt: number; refreshToken?: string }
    ): Promise<void> {
        if (input.refreshToken) {
            const refreshTokenEnc = encrypt(input.refreshToken, this.sessionSecret);
            await this.pool.query(
                `UPDATE users SET access_token = $2, expires_at = $3, refresh_token_enc = $4, updated_at = NOW()
                 WHERE id = $1`,
                [userId, input.accessToken, input.expiresAt, refreshTokenEnc]
            );
            return;
        }
        await this.pool.query(
            `UPDATE users SET access_token = $2, expires_at = $3, updated_at = NOW() WHERE id = $1`,
            [userId, input.accessToken, input.expiresAt]
        );
    }

    async getPlaylistMemory(userId: string): Promise<PlaylistMemoryEntry[]> {
        const result = await this.pool.query<{
            createdAt: string;
            spotifyPlaylistId: string;
            name: string;
            anchor: string | null;
            tracks: PlaylistMemoryEntry['tracks'];
        }>(
            `SELECT created_at AS "createdAt", spotify_playlist_id AS "spotifyPlaylistId",
                    name, anchor, tracks
             FROM playlist_memory
             WHERE user_id = $1
             ORDER BY created_at ASC`,
            [userId]
        );

        return result.rows.map((row) => ({
            createdAt: new Date(row.createdAt).toISOString(),
            spotifyPlaylistId: row.spotifyPlaylistId,
            name: row.name,
            anchor: row.anchor ?? '',
            tracks: row.tracks
        }));
    }

    async appendPlaylistMemory(userId: string, entry: PlaylistMemoryEntry): Promise<void> {
        const existing = await this.getPlaylistMemory(userId);
        const pruned = prunePlaylistMemory([...existing, entry]);
        await this.pool.query(`DELETE FROM playlist_memory WHERE user_id = $1`, [userId]);
        for (const playlist of pruned) {
            await this.pool.query(
                `INSERT INTO playlist_memory (id, user_id, created_at, spotify_playlist_id, name, anchor, tracks)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    randomToken(16),
                    userId,
                    playlist.createdAt,
                    playlist.spotifyPlaylistId,
                    playlist.name,
                    playlist.anchor,
                    JSON.stringify(playlist.tracks)
                ]
            );
        }
    }
}
