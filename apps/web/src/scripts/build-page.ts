import { getApiBaseUrl, hasDevHostMismatch, isApiConfigured } from '../lib/api-config';
import {
    curateModelLabel,
    currentLocale,
    DEV_PREVIEW_CURATE_MODELS,
    readCurateModel,
    type CurateModelsResponse
} from '../lib/curate-model';
import { isValidAnswers } from '../lib/build-prompt';
import type { InterviewAnswers } from '../lib/types';
import { SESSION_KEY } from '../lib/types';

type MeResponse =
    | { authenticated: false }
    | { authenticated: true; user: { displayName: string | null; spotifyUserId: string } };

type SearchResponse = {
    query: string;
    tracks: Array<{ id: string; name: string; artists: string; uri: string }>;
};

type CompactBrief = {
    anchor: string;
    emotion: string;
    pace: string;
    sonic: string;
    flow: string;
    reject: string[];
    seeds: string;
    cooldownText?: string;
};

type ProposedLine = {
    lineNumber: number;
    artist: string;
    title: string;
    tags: string;
    raw: string;
};

type CurateResponse = {
    brief: CompactBrief;
    sequenceIntent: string;
    lines: ProposedLine[];
    proposedCount: number;
};

type VerifyResponse = {
    successRate: number;
    okCount: number;
    proposedCount: number;
    offerPromptFallback: boolean;
    tracks: Array<{
        lineNumber: number;
        id: string;
        artist: string;
        title: string;
        uri: string;
    }>;
    skipped: Array<{ proposed: string; reason: string }>;
};

type PublishResponse = {
    playlist: { id: string; url: string; name: string };
    trackCount: number;
    proposedCount: number;
    sequenceIntent: string;
    tracks: VerifyResponse['tracks'];
    skipped: Array<{ proposed: string; reason: string }>;
};

function readInterviewAnswers(): InterviewAnswers | null {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        const raw = stored ? JSON.parse(stored) : null;
        return isValidAnswers(raw) ? raw : null;
    } catch {
        return null;
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

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

export function initBuildPage() {
    const missingEl = document.getElementById('build-missing');
    const contentEl = document.getElementById('build-content');
    const unconfiguredEl = document.getElementById('build-unconfigured');
    const connectEl = document.getElementById('build-connect');
    const connectedEl = document.getElementById('build-connected');
    const statusEl = document.getElementById('build-status');
    const progressEl = document.getElementById('build-progress');
    const flowEl = document.getElementById('build-flow');
    const resultsEl = document.getElementById('build-results');
    const fallbackEl = document.getElementById('build-fallback');
    const resultsSummary = document.getElementById('build-results-summary');
    const resultsOrder = document.getElementById('build-results-order');
    const resultsSkipped = document.getElementById('build-results-skipped');
    const startBtn = document.getElementById('build-start-btn') as HTMLButtonElement | null;
    const modelLabelEl = document.getElementById('build-model-label');
    const searchForm = document.getElementById('build-search-form') as HTMLFormElement | null;
    const searchInput = document.getElementById('build-search-input') as HTMLInputElement | null;
    const searchResults = document.getElementById('build-search-results');
    const connectBtn = document.getElementById('build-connect-btn') as HTMLAnchorElement | null;
    const logoutBtn = document.getElementById('build-logout-btn') as HTMLButtonElement | null;
    const userLabel = document.getElementById('build-user-label');

    if (!missingEl || !contentEl) return;

    const answers = readInterviewAnswers();
    const hasAnswers = Boolean(answers);
    missingEl.hidden = hasAnswers;
    contentEl.hidden = !hasAnswers;
    if (!hasAnswers || !answers) return;

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

    let selectedModel: string | null = readCurateModel();
    let selectedModelLabel = '';

    async function loadCurateModelLabel() {
        if (!modelLabelEl || !api) return;
        try {
            const response = await fetch(`${api}/api/curate/models`);
            if (!response.ok) return;
            const data = (await response.json()) as CurateModelsResponse;
            if (!selectedModel && data.defaultModel) {
                selectedModel = data.defaultModel;
            }
            const match =
                data.models.find((option) => option.id === selectedModel) ??
                (data.defaultModel
                    ? data.models.find((option) => option.id === data.defaultModel)
                    : undefined);
            const previewMatch =
                import.meta.env.DEV && selectedModel
                    ? DEV_PREVIEW_CURATE_MODELS.find((option) => option.id === selectedModel)
                    : undefined;
            const resolved = match ?? previewMatch;
            if (resolved) {
                selectedModel = resolved.id;
                selectedModelLabel = curateModelLabel(resolved, currentLocale());
                modelLabelEl.textContent = selectedModelLabel;
                modelLabelEl.hidden = false;
            }
        } catch {
            modelLabelEl.hidden = true;
        }
    }

    void loadCurateModelLabel();

    if (hasDevHostMismatch()) {
        if (statusEl) {
            statusEl.textContent =
                'Open this site at http://127.0.0.1:4321 (not localhost) so Spotify login can keep your session.';
            statusEl.hidden = false;
        }
    }

    function setProgress(message: string) {
        if (!progressEl) return;
        progressEl.textContent = message;
        progressEl.hidden = false;
    }

    function hideProgress() {
        if (progressEl) progressEl.hidden = true;
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

    function renderResults(data: PublishResponse) {
        if (!resultsEl || !resultsSummary || !resultsOrder || !resultsSkipped) return;

        resultsSummary.innerHTML = `
            <p><strong>Name:</strong> ${escapeHtml(data.playlist.name)}</p>
            <p><strong>URL:</strong> <a href="${escapeHtml(data.playlist.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.playlist.url)}</a></p>
            <p><strong>Tracks:</strong> ${data.trackCount} (from ${data.proposedCount} proposed)</p>
            ${data.sequenceIntent ? `<p><strong>Sequence:</strong> ${escapeHtml(data.sequenceIntent)}</p>` : ''}
        `;

        const orderItems = data.tracks
            .map(
                (track, index) =>
                    `<li>${index + 1}. ${escapeHtml(track.artist)} — ${escapeHtml(track.title)} ✓</li>`
            )
            .join('');
        resultsOrder.innerHTML = `
            <h3 class="build-results__heading">Order</h3>
            <ol class="build-results__list">${orderItems}</ol>
        `;

        if (data.skipped.length > 0) {
            const rows = data.skipped
                .map(
                    (row) =>
                        `<tr><td>${escapeHtml(row.proposed)}</td><td>${escapeHtml(row.reason)}</td></tr>`
                )
                .join('');
            resultsSkipped.innerHTML = `
                <h3 class="build-results__heading">Not on playlist</h3>
                <table class="build-results__table">
                    <thead><tr><th>Line</th><th>Reason</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        } else {
            resultsSkipped.innerHTML = '';
        }

        resultsEl.hidden = false;
        if (flowEl) flowEl.hidden = true;
        if (fallbackEl) fallbackEl.hidden = true;
    }

    async function runBuild() {
        if (!startBtn) return;
        startBtn.disabled = true;
        if (resultsEl) resultsEl.hidden = true;
        if (fallbackEl) fallbackEl.hidden = true;

        try {
            const curateLabel = selectedModelLabel || 'curating tracklist';
            setProgress(`Step 2.2.3: ${curateLabel}…`);
            const curateResponse = await fetch(`${api}/api/curate`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers,
                    model: selectedModel ?? undefined
                })
            });
            if (!curateResponse.ok) {
                const err = (await curateResponse.json().catch(() => null)) as { error?: string } | null;
                throw new Error(err?.error ?? 'Curate failed');
            }
            const curated = (await curateResponse.json()) as CurateResponse;

            setProgress(`Step 2.2.4–2.2.5: verifying ${curated.proposedCount} lines on Spotify…`);
            const verifyResponse = await fetch(`${api}/api/verify`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lines: curated.lines,
                    brief: curated.brief
                })
            });
            if (!verifyResponse.ok) {
                const err = (await verifyResponse.json().catch(() => null)) as { error?: string } | null;
                throw new Error(err?.error ?? 'Verify failed');
            }
            const verified = (await verifyResponse.json()) as VerifyResponse;

            if (verified.offerPromptFallback || verified.tracks.length < 10) {
                hideProgress();
                if (fallbackEl) fallbackEl.hidden = false;
                if (statusEl) {
                    statusEl.textContent = `Only ${verified.okCount} of ${verified.proposedCount} lines verified (${Math.round(verified.successRate * 100)}%).`;
                    statusEl.hidden = false;
                }
                return;
            }

            setProgress(`Step 2.2.7: publishing ${verified.tracks.length} tracks…`);
            const publishResponse = await fetch(`${api}/api/publish`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brief: curated.brief,
                    sequenceIntent: curated.sequenceIntent,
                    proposedCount: curated.proposedCount,
                    tracks: verified.tracks,
                    skipped: verified.skipped
                })
            });
            if (!publishResponse.ok) {
                const err = (await publishResponse.json().catch(() => null)) as { error?: string } | null;
                throw new Error(err?.error ?? 'Publish failed');
            }
            const published = (await publishResponse.json()) as PublishResponse;
            hideProgress();
            renderResults(published);
        } catch (buildError) {
            hideProgress();
            if (statusEl) {
                statusEl.textContent =
                    buildError instanceof Error ? buildError.message : 'Build failed — try again.';
                statusEl.hidden = false;
            }
        } finally {
            startBtn.disabled = false;
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
            if (resultsEl) resultsEl.hidden = true;
            if (fallbackEl) fallbackEl.hidden = true;
            if (flowEl) flowEl.hidden = false;
            await showConnect();
        });
    }

    if (startBtn && startBtn.dataset.bound !== 'true') {
        startBtn.dataset.bound = 'true';
        startBtn.addEventListener('click', () => {
            void runBuild();
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
