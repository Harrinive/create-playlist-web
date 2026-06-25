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
    curateModelShortLabel,
    resolveCurateModelId
} from '../lib/curate-model';
import { readLocale } from '../lib/locale';
import { localizeApiError, localizeBuildError, localizeOAuthError } from '../lib/localized-errors';
import { readBuildResult, saveBuildResult, type BuildResultSnapshot } from '../lib/last-delivery';
import { readStoredInterviewAnswers } from '../lib/session-answers';
import { crossFadePanels, revealPanel } from '../lib/motion';

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

type BuildStatusState =
    | { kind: 'oauth'; code: string }
    | { kind: 'api'; raw: string }
    | { kind: 'devHost' }
    | { kind: 'apiUnreachable' }
    | {
          kind: 'verifyFallback';
          okCount: number;
          proposedCount: number;
          successRate: number;
      };

type BuildProgressState =
    | { kind: 'curating'; modelShort: string }
    | { kind: 'verifying'; count: number }
    | { kind: 'publishing'; count: number };

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

    let lastStatus: BuildStatusState | null = null;
    let lastProgress: BuildProgressState | null = null;

    function renderStatus() {
        if (!statusEl || !lastStatus) return;
        const locale = readLocale();
        switch (lastStatus.kind) {
            case 'oauth':
                statusEl.textContent = localizeBuildError('connectionFailed', locale, {
                    error: localizeOAuthError(lastStatus.code, locale)
                });
                break;
            case 'api':
                statusEl.textContent = localizeApiError(lastStatus.raw, locale, 'build');
                break;
            case 'devHost':
                statusEl.textContent = localizeBuildError('devHostMismatch', locale);
                break;
            case 'apiUnreachable':
                statusEl.textContent = localizeBuildError('apiUnreachable', locale);
                break;
            case 'verifyFallback':
                statusEl.textContent = buildVerifyFallbackMessage(
                    locale,
                    lastStatus.okCount,
                    lastStatus.proposedCount,
                    lastStatus.successRate
                );
                break;
        }
        statusEl.hidden = false;
    }

    function renderProgress() {
        if (!progressEl || !lastProgress) return;
        const locale = readLocale();
        switch (lastProgress.kind) {
            case 'curating':
                progressEl.textContent = buildProgressCurating(locale, lastProgress.modelShort);
                break;
            case 'verifying':
                progressEl.textContent = buildProgressVerifying(locale, lastProgress.count);
                break;
            case 'publishing':
                progressEl.textContent = buildProgressPublishing(locale, lastProgress.count);
                break;
        }
        progressEl.hidden = false;
    }

    document.addEventListener(
        'locale-changed',
        () => {
            if (lastStatus) renderStatus();
            if (lastProgress && !progressEl?.hidden) renderProgress();
        },
        { signal }
    );

    const error = readUrlFlag('error');
    if (error) clearUrlParams();

    if (statusEl && error) {
        lastStatus = { kind: 'oauth', code: error };
        renderStatus();
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
                const raw =
                    modelError instanceof Error
                        ? modelError.message
                        : 'Curation model unavailable on this server';
                lastStatus = { kind: 'api', raw };
                statusEl.dataset.modelError = 'true';
                renderStatus();
            }
        }
    }

    if (startBtn) startBtn.disabled = true;
    void syncCurateModelLabel();

    if (hasDevHostMismatch()) {
        if (statusEl) {
            lastStatus = { kind: 'devHost' };
            renderStatus();
        }
    }

    function setProgress(state: BuildProgressState) {
        lastProgress = state;
        renderProgress();
    }

    function hideProgress() {
        lastProgress = null;
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
        if (statusEl && statusEl.dataset.modelError !== 'true') {
            statusEl.hidden = true;
            statusEl.textContent = '';
            lastStatus = null;
        }
    }

    function renderSavedBuildResult(snapshot: BuildResultSnapshot) {
        if (signal.aborted) return;
        if (!resultsEl || !resultsSummary || !resultsOrder) return;

        const locale = readLocale();
        resultsSummary.innerHTML = `
            <dl class="build-results__meta">
                <div class="build-results__meta-row">
                    <dt>${escapeHtml(resultLabel(locale, 'name'))}</dt>
                    <dd>${escapeHtml(snapshot.playlistName)}</dd>
                </div>
                <div class="build-results__meta-row">
                    <dt>${escapeHtml(resultLabel(locale, 'link'))}</dt>
                    <dd><a href="${escapeHtml(snapshot.playlistUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(snapshot.playlistUrl)}</a></dd>
                </div>
                <div class="build-results__meta-row">
                    <dt>${escapeHtml(resultLabel(locale, 'tracks'))}</dt>
                    <dd>${escapeHtml(String(snapshot.trackCount))}</dd>
                </div>
            </dl>
        `;
        resultsOrder.innerHTML = '';

        crossFadePanels(resultsEl, [flowEl!, fallbackEl!].filter(Boolean) as HTMLElement[]);
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

            setProgress({
                kind: 'curating',
                modelShort: curateModelShortLabel(model, readLocale())
            });
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

            setProgress({ kind: 'verifying', count: curated.proposedCount });
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
                    lastStatus = {
                        kind: 'verifyFallback',
                        okCount: verified.okCount,
                        proposedCount: verified.proposedCount,
                        successRate: verified.successRate
                    };
                    renderStatus();
                }
                return;
            }

            setProgress({ kind: 'publishing', count: verified.tracks.length });
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
                const raw =
                    buildError instanceof Error ? buildError.message : 'Build failed — try again.';
                lastStatus = { kind: 'api', raw };
                renderStatus();
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
                const snapshot = readBuildResult();
                if (snapshot) renderSavedBuildResult(snapshot);
            } else {
                await showConnect();
            }
        } catch {
            if (statusEl) {
                lastStatus = { kind: 'apiUnreachable' };
                renderStatus();
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
