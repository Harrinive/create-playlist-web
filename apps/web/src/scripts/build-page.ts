import { getApiBaseUrl, hasDevHostMismatch, isApiConfigured } from '../lib/api-config';
import {
    buildProgressCurating,
    buildProgressPublishing,
    buildProgressVerifying,
    buildVerifyFallbackMessage,
    formatSequenceIntent,
    resultLabel,
    resultTracksLine
} from '../lib/build-copy';
import {
    curateModelLabel,
    resolveCurateModelId
} from '../lib/curate-model';
import { readLocale } from '../lib/locale';
import { saveBuildResult, saveLastDelivery } from '../lib/last-delivery';
import { readStoredInterviewAnswers } from '../lib/session-answers';
import { appearOnMount, crossFadePanels, revealPanel } from '../lib/motion';

type MeResponse =
    | { authenticated: false }
    | { authenticated: true; user: { displayName: string | null; spotifyUserId: string } };

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

const abortByRoot = new WeakMap<HTMLElement, AbortController>();

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
    const root = document.getElementById('build-page');
    if (!root) return;

    abortByRoot.get(root)?.abort();
    const ac = new AbortController();
    abortByRoot.set(root, ac);
    const { signal } = ac;

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
    const startBtn = document.getElementById('build-start-btn') as HTMLButtonElement | null;
    const modelLabelEl = document.getElementById('build-model-label');
    const connectBtn = document.getElementById('build-connect-btn') as HTMLAnchorElement | null;
    const logoutBtn = document.getElementById('build-logout-btn') as HTMLButtonElement | null;
    const userLabel = document.getElementById('build-user-label');
    const userSubtitleEl = document.getElementById('build-user-subtitle');

    if (!missingEl || !contentEl) return;

    const answers = readStoredInterviewAnswers();
    const hasAnswers = Boolean(answers);
    missingEl.hidden = hasAnswers;
    contentEl.hidden = !hasAnswers;
    if (hasAnswers) {
        revealPanel(contentEl, [missingEl]);
    } else {
        revealPanel(missingEl, [contentEl]);
        return;
    }
    if (!answers) return;

    saveLastDelivery('build');
    document.dispatchEvent(new CustomEvent('last-delivery-changed'));

    const error = readUrlFlag('error');
    const connected = readUrlFlag('connected');
    if (error || connected) clearUrlParams();

    if (statusEl && error) {
        statusEl.textContent = `Connection failed: ${error}`;
        statusEl.hidden = false;
    }

    if (!isApiConfigured()) {
        crossFadePanels(unconfiguredEl!, [connectEl!, connectedEl!].filter(Boolean) as HTMLElement[]);
        return;
    }

    const api = getApiBaseUrl();
    if (connectBtn) connectBtn.href = `${api}/auth/spotify`;

    async function syncCurateModelLabel() {
        if (!modelLabelEl || !api || signal.aborted) return;
        try {
            const resolved = await resolveCurateModelId(signal);
            if (signal.aborted) return;
            modelLabelEl.textContent = curateModelLabel(resolved, readLocale());
            modelLabelEl.hidden = false;
            if (startBtn) startBtn.disabled = false;
            if (statusEl?.dataset.modelError === 'true') {
                statusEl.hidden = true;
                delete statusEl.dataset.modelError;
            }
        } catch (modelError) {
            if (signal.aborted) return;
            modelLabelEl.hidden = true;
            if (startBtn) startBtn.disabled = true;
            if (statusEl) {
                statusEl.textContent =
                    modelError instanceof Error
                        ? modelError.message
                        : 'Curation model unavailable on this server';
                statusEl.dataset.modelError = 'true';
                statusEl.hidden = false;
            }
        }
    }

    if (startBtn) startBtn.disabled = true;
    void syncCurateModelLabel();

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
        if (userSubtitleEl) userSubtitleEl.hidden = true;
        crossFadePanels(connectEl!, [unconfiguredEl!, connectedEl!].filter(Boolean) as HTMLElement[]);
    }

    async function showConnected(user: { displayName: string | null; spotifyUserId: string }) {
        crossFadePanels(connectedEl!, [unconfiguredEl!, connectEl!].filter(Boolean) as HTMLElement[]);
        if (userLabel) {
            userLabel.textContent = user.displayName ?? user.spotifyUserId;
        }
        if (userSubtitleEl) userSubtitleEl.hidden = false;
        if (statusEl && connected) {
            statusEl.textContent = 'Spotify connected.';
            statusEl.hidden = false;
            appearOnMount(statusEl);
        }
    }

    function renderResults(data: PublishResponse) {
        if (signal.aborted) return;
        if (!resultsEl || !resultsSummary || !resultsOrder) return;

        const locale = readLocale();
        const sequence = data.sequenceIntent ? formatSequenceIntent(data.sequenceIntent) : '';

        resultsSummary.innerHTML = `
            <dl class="build-results__meta">
                <div class="build-results__meta-row">
                    <dt>${escapeHtml(resultLabel(locale, 'name'))}</dt>
                    <dd>${escapeHtml(data.playlist.name)}</dd>
                </div>
                <div class="build-results__meta-row">
                    <dt>${escapeHtml(resultLabel(locale, 'link'))}</dt>
                    <dd><a href="${escapeHtml(data.playlist.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.playlist.url)}</a></dd>
                </div>
                <div class="build-results__meta-row">
                    <dt>${escapeHtml(resultLabel(locale, 'tracks'))}</dt>
                    <dd>${escapeHtml(resultTracksLine(locale, data.trackCount, data.proposedCount))}</dd>
                </div>
            </dl>
            ${
                sequence
                    ? `<div class="build-results__sequence">
                        <h3 class="build-results__heading">${escapeHtml(resultLabel(locale, 'sequence'))}</h3>
                        <p class="build-results__sequence-text">${escapeHtml(sequence)}</p>
                       </div>`
                    : ''
            }
        `;

        const orderItems = data.tracks
            .map(
                (track) =>
                    `<li><span class="build-results__track">${escapeHtml(track.artist)} — ${escapeHtml(track.title)}</span></li>`
            )
            .join('');
        resultsOrder.innerHTML = `
            <h3 class="build-results__heading">${escapeHtml(resultLabel(locale, 'order'))}</h3>
            <ol class="build-results__list">${orderItems}</ol>
        `;

        crossFadePanels(resultsEl, [flowEl!, fallbackEl!].filter(Boolean) as HTMLElement[]);
        saveBuildResult({
            playlistName: data.playlist.name,
            playlistUrl: data.playlist.url,
            trackCount: data.trackCount
        });
        document.dispatchEvent(new CustomEvent('last-delivery-changed'));
    }

    async function runBuild() {
        if (!startBtn || signal.aborted) return;
        startBtn.disabled = true;
        if (resultsEl) resultsEl.hidden = true;
        if (fallbackEl) fallbackEl.hidden = true;
        if (statusEl) {
            statusEl.hidden = true;
            delete statusEl.dataset.modelError;
        }

        try {
            const model = await resolveCurateModelId(signal);
            if (signal.aborted) return;
            const curateLabel = curateModelLabel(model, readLocale());
            if (modelLabelEl) {
                modelLabelEl.textContent = curateLabel;
                modelLabelEl.hidden = false;
            }

            setProgress(buildProgressCurating(readLocale(), curateLabel));
            const curateResponse = await fetch(`${api}/api/curate`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers,
                    model: model.id
                }),
                signal
            });
            if (signal.aborted) return;
            if (!curateResponse.ok) {
                const err = (await curateResponse.json().catch(() => null)) as { error?: string } | null;
                throw new Error(err?.error ?? 'Curate failed');
            }
            const curated = (await curateResponse.json()) as CurateResponse;
            if (signal.aborted) return;

            setProgress(buildProgressVerifying(readLocale(), curated.proposedCount));
            const verifyResponse = await fetch(`${api}/api/verify`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lines: curated.lines,
                    brief: curated.brief
                }),
                signal
            });
            if (signal.aborted) return;
            if (!verifyResponse.ok) {
                const err = (await verifyResponse.json().catch(() => null)) as { error?: string } | null;
                throw new Error(err?.error ?? 'Verify failed');
            }
            const verified = (await verifyResponse.json()) as VerifyResponse;
            if (signal.aborted) return;

            if (verified.offerPromptFallback || verified.tracks.length < 10) {
                hideProgress();
                if (signal.aborted) return;
                if (fallbackEl) {
                    crossFadePanels(fallbackEl, [resultsEl!, flowEl!].filter(Boolean) as HTMLElement[]);
                }
                if (statusEl) {
                    statusEl.textContent = buildVerifyFallbackMessage(
                        readLocale(),
                        verified.okCount,
                        verified.proposedCount,
                        verified.successRate
                    );
                    statusEl.hidden = false;
                    appearOnMount(statusEl);
                }
                return;
            }

            setProgress(buildProgressPublishing(readLocale(), verified.tracks.length));
            const publishResponse = await fetch(`${api}/api/publish`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brief: curated.brief,
                    answers,
                    locale: readLocale(),
                    sequenceIntent: curated.sequenceIntent,
                    proposedCount: curated.proposedCount,
                    tracks: verified.tracks,
                    skipped: verified.skipped
                }),
                signal
            });
            if (signal.aborted) return;
            if (!publishResponse.ok) {
                const err = (await publishResponse.json().catch(() => null)) as { error?: string } | null;
                throw new Error(err?.error ?? 'Publish failed');
            }
            const published = (await publishResponse.json()) as PublishResponse;
            if (signal.aborted) return;
            hideProgress();
            renderResults(published);
        } catch (buildError) {
            if (signal.aborted) return;
            hideProgress();
            if (statusEl) {
                statusEl.textContent =
                    buildError instanceof Error ? buildError.message : 'Build failed — try again.';
                statusEl.hidden = false;
            }
        } finally {
            if (!signal.aborted && startBtn) {
                startBtn.disabled = false;
            }
        }
    }

    async function loadSession() {
        try {
            const response = await fetch(`${api}/api/me`, { credentials: 'include', signal });
            if (signal.aborted) return;
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

    logoutBtn?.addEventListener(
        'click',
        async () => {
            await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
            if (resultsEl) resultsEl.hidden = true;
            if (fallbackEl) fallbackEl.hidden = true;
            if (flowEl) flowEl.hidden = false;
            await showConnect();
        },
        { signal }
    );

    startBtn?.addEventListener(
        'click',
        () => {
            void runBuild();
        },
        { signal }
    );

    void loadSession();
}
