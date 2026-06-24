import { Pool } from 'pg';
import type { Env } from '../config.js';
import { MemoryTokenStore } from './memory.js';
import { PostgresTokenStore } from './postgres.js';
import type { TokenStore } from './types.js';

export async function createTokenStore(env: Env): Promise<TokenStore> {
    if (env.DATABASE_URL) {
        const pool = new Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const store = new PostgresTokenStore(pool, env.SESSION_SECRET);
        await store.init();
        return store;
    }

    if (env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL is required in production');
    }

    console.warn('[store] DATABASE_URL not set — using in-memory token store (dev only)');
    const store = new MemoryTokenStore(env.SESSION_SECRET);
    await store.init();
    return store;
}
