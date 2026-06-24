export type UserRecord = {
    id: string;
    spotifyUserId: string;
    displayName: string | null;
    refreshTokenEnc: string;
    accessToken: string | null;
    expiresAt: number | null;
};

export type SessionRecord = {
    id: string;
    userId: string;
    expiresAt: number;
};

export type OAuthStateRecord = {
    state: string;
    expiresAt: number;
};

export interface TokenStore {
    init(): Promise<void>;
    saveOAuthState(state: string, ttlMs: number): Promise<void>;
    consumeOAuthState(state: string): Promise<boolean>;
    upsertUser(input: {
        spotifyUserId: string;
        displayName: string | null;
        refreshToken: string;
        accessToken: string;
        expiresAt: number;
    }): Promise<UserRecord>;
    getUserById(id: string): Promise<UserRecord | null>;
    createSession(userId: string, ttlMs: number): Promise<SessionRecord>;
    getSession(id: string): Promise<SessionRecord | null>;
    deleteSession(id: string): Promise<void>;
    updateUserTokens(
        userId: string,
        input: { accessToken: string; expiresAt: number; refreshToken?: string }
    ): Promise<void>;
}
