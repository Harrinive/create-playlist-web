const PRODUCTION_API_URL = 'https://api.vibelist.dychen.net';

/** Base URL for create-playlist-api (no trailing slash). */
export function getApiBaseUrl(): string {
    const url = import.meta.env.PUBLIC_API_URL;
    if (typeof url === 'string' && url.length > 0) {
        return url.replace(/\/$/, '');
    }

    // Fallback when CF Pages build env was not set (static site bakes env at build time).
    if (typeof window !== 'undefined' && window.location.hostname === 'vibelist.dychen.net') {
        return PRODUCTION_API_URL;
    }

    return '';
}

export function isApiConfigured(): boolean {
    return getApiBaseUrl().length > 0;
}

/**
 * localhost and 127.0.0.1 are different sites — session cookies on the API
 * (127.0.0.1 per Spotify redirect rules) won't be sent from localhost pages.
 */
export function hasDevHostMismatch(): boolean {
    if (typeof window === 'undefined') return false;
    const api = getApiBaseUrl();
    if (!api.includes('127.0.0.1')) return false;
    return window.location.hostname === 'localhost';
}
