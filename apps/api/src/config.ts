import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    SPOTIFY_CLIENT_ID: z.string().min(1),
    SPOTIFY_CLIENT_SECRET: z.string().min(1),
    SPOTIFY_REDIRECT_URI: z.string().url(),
    SESSION_SECRET: z.string().min(16),
    WEB_ORIGIN: z.string().url(),
    DATABASE_URL: z.string().url().optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    LLM_MODEL: z.string().min(1).optional(),
    PORT: z.coerce.number().int().positive().default(3001),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
        throw new Error(`Invalid environment:\n${lines.join('\n')}`);
    }
    return parsed.data;
}

export const SPOTIFY_SCOPES = [
    'playlist-modify-private',
    'playlist-modify-public',
    'user-read-private'
].join(' ');
