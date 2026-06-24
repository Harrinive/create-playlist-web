import type { Env } from './config.js';

const LOCAL_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** CORS origin check — any localhost port in dev; strict WEB_ORIGIN in production. */
export function isAllowedWebOrigin(origin: string | undefined, env: Env): boolean {
    if (!origin) return true;
    if (origin === env.WEB_ORIGIN) return true;
    if (env.NODE_ENV === 'development' && LOCAL_DEV_ORIGIN.test(origin)) return true;
    return false;
}
