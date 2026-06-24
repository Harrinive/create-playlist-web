import { encrypt, randomToken } from '../crypto.js';
import type { OAuthStateRecord, SessionRecord, TokenStore, UserRecord } from './types.js';

export class MemoryTokenStore implements TokenStore {
    private users = new Map<string, UserRecord>();
    private usersBySpotifyId = new Map<string, string>();
    private sessions = new Map<string, SessionRecord>();
    private oauthStates = new Map<string, OAuthStateRecord>();

    constructor(private readonly sessionSecret: string) {}

    async init(): Promise<void> {}

    async saveOAuthState(state: string, ttlMs: number): Promise<void> {
        this.oauthStates.set(state, { state, expiresAt: Date.now() + ttlMs });
    }

    async consumeOAuthState(state: string): Promise<boolean> {
        const record = this.oauthStates.get(state);
        if (!record || record.expiresAt <= Date.now()) {
            this.oauthStates.delete(state);
            return false;
        }
        this.oauthStates.delete(state);
        return true;
    }

    async upsertUser(input: {
        spotifyUserId: string;
        displayName: string | null;
        refreshToken: string;
        accessToken: string;
        expiresAt: number;
    }): Promise<UserRecord> {
        const existingId = this.usersBySpotifyId.get(input.spotifyUserId);
        const id = existingId ?? randomToken(16);
        const user: UserRecord = {
            id,
            spotifyUserId: input.spotifyUserId,
            displayName: input.displayName,
            refreshTokenEnc: encrypt(input.refreshToken, this.sessionSecret),
            accessToken: input.accessToken,
            expiresAt: input.expiresAt
        };
        this.users.set(id, user);
        this.usersBySpotifyId.set(input.spotifyUserId, id);
        return user;
    }

    async getUserById(id: string): Promise<UserRecord | null> {
        return this.users.get(id) ?? null;
    }

    async createSession(userId: string, ttlMs: number): Promise<SessionRecord> {
        const session: SessionRecord = {
            id: randomToken(24),
            userId,
            expiresAt: Date.now() + ttlMs
        };
        this.sessions.set(session.id, session);
        return session;
    }

    async getSession(id: string): Promise<SessionRecord | null> {
        const session = this.sessions.get(id);
        if (!session || session.expiresAt <= Date.now()) {
            this.sessions.delete(id);
            return null;
        }
        return session;
    }

    async deleteSession(id: string): Promise<void> {
        this.sessions.delete(id);
    }

    async updateUserTokens(
        userId: string,
        input: { accessToken: string; expiresAt: number; refreshToken?: string }
    ): Promise<void> {
        const user = this.users.get(userId);
        if (!user) return;
        user.accessToken = input.accessToken;
        user.expiresAt = input.expiresAt;
        if (input.refreshToken) {
            user.refreshTokenEnc = encrypt(input.refreshToken, this.sessionSecret);
        }
    }
}
