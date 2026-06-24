import { getApiBaseUrl, hasDevHostMismatch, isApiConfigured } from '../lib/api-config';
import { isValidAnswers } from '../lib/build-prompt';
import { SESSION_KEY } from '../lib/types';

type MeResponse =
    | { authenticated: false }
    | { authenticated: true; user: { displayName: string | null; spotifyUserId: string } };

type SearchResponse = {
    query: string;
    tracks: Array<{ id: string; name: string; artists: string; uri: string }>;
};

function readInterviewAnswers(): boolean {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        const raw = stored ? JSON.parse(stored) : null;
        return isValidAnswers(raw);
    } catch {
        return false;
    }
}

function readUrlFlag(name: string): string | null {
    return new URLSearchParams(window.location.search).get(name);
}

function clearUrlParams() {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.pathname);
}

export function initBuildPage() {
    const missingEl = document.getElementById('build-missing');
    const contentEl = document.getElementById('build-content');
    const unconfiguredEl = document.getElementById('build-unconfigured');
    const connectEl = document.getElementById('build-connect');
    const connectedEl = document.getElementById('build-connected');
    const statusEl = document.getElementById('build-status');
    const searchForm = document.getElementById('build-search-form') as HTMLFormElement | null;
    const searchInput = document.getElementById('build-search-input') as HTMLInputElement | null;
    const searchResults = document.getElementById('build-search-results');
    const connectBtn = document.getElementById('build-connect-btn') as HTMLAnchorElement | null;
    const logoutBtn = document.getElementById('build-logout-btn') as HTMLButtonElement | null;
    const userLabel = document.getElementById('build-user-label');

    if (!missingEl || !contentEl) return;

    const hasAnswers = readInterviewAnswers();
    missingEl.hidden = hasAnswers;
    contentEl.hidden = !hasAnswers;
    if (!hasAnswers) return;

    const error = readUrlFlag('error');
    const connected = readUrlFlag('connected');
    if (error || connected) clearUrlParams();

    if (statusEl && error) {
        statusEl.textContent = `Connection failed: ${error}`;
        statusEl.hidden = false;
    }

    if (!isApiConfigured()) {
        if (unconfiguredEl) unconfiguredEl.hidden = false;
        if (connectEl) connectEl.hidden = true;
        if (connectedEl) connectedEl.hidden = true;
        return;
    }

    const api = getApiBaseUrl();
    if (connectBtn) connectBtn.href = `${api}/auth/spotify`;

    if (hasDevHostMismatch()) {
        if (statusEl) {
            statusEl.textContent =
                'Open this site at http://127.0.0.1:4321 (not localhost) so Spotify login can keep your session.';
            statusEl.hidden = false;
        }
    }

    async function showConnect() {
        if (unconfiguredEl) unconfiguredEl.hidden = true;
        if (connectEl) connectEl.hidden = false;
        if (connectedEl) connectedEl.hidden = true;
    }

    async function showConnected(user: { displayName: string | null; spotifyUserId: string }) {
        if (unconfiguredEl) unconfiguredEl.hidden = true;
        if (connectEl) connectEl.hidden = true;
        if (connectedEl) connectedEl.hidden = false;
        if (userLabel) {
            userLabel.textContent = user.displayName ?? user.spotifyUserId;
        }
        if (statusEl && connected) {
            statusEl.textContent = 'Spotify connected.';
            statusEl.hidden = false;
        }
    }

    async function loadSession() {
        try {
            const response = await fetch(`${api}/api/me`, { credentials: 'include' });
            if (!response.ok) {
                await showConnect();
                return;
            }
            const data = (await response.json()) as MeResponse;
            if (data.authenticated) {
                await showConnected(data.user);
            } else {
                await showConnect();
            }
        } catch {
            if (statusEl) {
                statusEl.textContent = 'Could not reach the API. Is it running?';
                statusEl.hidden = false;
            }
            await showConnect();
        }
    }

    if (logoutBtn && logoutBtn.dataset.bound !== 'true') {
        logoutBtn.dataset.bound = 'true';
        logoutBtn.addEventListener('click', async () => {
            await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
            if (searchResults) searchResults.innerHTML = '';
            await showConnect();
        });
    }

    if (searchForm && searchInput && searchResults && searchForm.dataset.bound !== 'true') {
        searchForm.dataset.bound = 'true';
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const q = searchInput.value.trim();
            if (!q) return;

            searchResults.innerHTML = '';
            const response = await fetch(`${api}/api/search?q=${encodeURIComponent(q)}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                searchResults.textContent = 'Search failed — try reconnecting Spotify.';
                return;
            }
            const data = (await response.json()) as SearchResponse;
            if (data.tracks.length === 0) {
                searchResults.textContent = 'No tracks found.';
                return;
            }
            const list = document.createElement('ul');
            list.className = 'build-track-list';
            data.tracks.forEach((track) => {
                const item = document.createElement('li');
                item.textContent = `${track.name} — ${track.artists}`;
                list.appendChild(item);
            });
            searchResults.appendChild(list);
        });
    }

    void loadSession();
}
