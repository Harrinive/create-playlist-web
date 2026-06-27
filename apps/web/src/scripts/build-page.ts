import { getApiBaseUrl, hasDevHostMismatch, isApiConfigured } from '../lib/api-config';
import {
    buildImportRepeatFallbackCopy,
    buildImportReverifying,
    buildPreviewMetaLine,
    buildProgressCurating,
    buildProgressPublishing,
    buildProgressVerifying,
    buildVerifyFallbackCopy,
    pickSequenceIntent,
    resultLabel,
    resultTracksLine,
    type BilingualProse
} from '../lib/build-copy';
import {
    curateModelLabel,
    curateModelShortLabel,
    resolveCurateModelId
} from '../lib/curate-model';
import { createLocaleScope } from '../lib/locale-scope';
import { readLocale } from '../lib/locale';
import { createPageScope } from '../lib/page-scope';
import { normalizeSessionState } from '../lib/session-normalize';
import {
    clearPendingBuild,
    readPendingBuild,
    savePendingBuild,
    type PendingBuildSnapshot
} from '../lib/pending-build';
import { readBuildResult, saveBuildResult, type BuildResultSnapshot } from '../lib/last-delivery';
import { readStoredInterviewAnswers } from '../lib/session-answers';
import { localizeApiError, localizeBuildError, localizeOAuthError } from '../lib/localized-errors';
import { crossFadePanels, revealPanel } from '../lib/motion';

type MeResponse =
    | { authenticated: false }
    | { authenticated: true; user: { displayName: string | null; spotifyUserId: string } };

type CompactBrief = PendingBuildSnapshot['brief'];
type ProposedLine = PendingBuildSnapshot['lines'][number];

type CurateResponse = {
    brief: CompactBrief;
    sequenceIntent: BilingualProse;
    lines: ProposedLine[];
    proposedCount: number;
    model?: string | null;
    modelLabel?: string | null;
};

type VerifyResponse = PendingBuildSnapshot['verified'];

type PublishResponse = {
    playlist: { id: string; url: string; name: string };
    trackCount: number;
    proposedCount: number;
    sequenceIntent: BilingualProse;
    tracks: VerifyResponse['tracks'];
    skipped: Array<{ proposed: string; reason: string }>;
};


function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

type BuildStatusState =
    | { kind: 'oauth'; code: string }
    | { kind: 'oauthConnected' }
    | { kind: 'api'; raw: string }
    | { kind: 'devHost' }
    | { kind: 'apiUnreachable' };

type BuildProgressState =
    | { kind: 'curating'; modelShort: string }
    | { kind: 'verifying'; count: number }
    | { kind: 'publishing'; count: number }
    | { kind: 'reverifying' };

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

    normalizeSessionState();
    const { signal } = createPageScope(root);

    const missingEl = document.getElementById('build-missing');
    const contentEl = document.getElementById('build-content');
    const unconfiguredEl = document.getElementById('build-unconfigured');
    const mainEl = document.getElementById('build-main');
    const statusEl = document.getElementById('build-status');
    const progressEl = document.getElementById('build-progress');
    const importProgressEl = document.getElementById('build-import-progress');
    const flowEl = document.getElementById('build-flow');
    const previewEl = document.getElementById('build-preview');
    const previewSequence = document.getElementById('build-preview-sequence');
    const previewOrder = document.getElementById('build-preview-order');
    const importNoteEl = document.getElementById('build-import-note');
    const pageTitleEl = document.getElementById('build-page-title');
    const pageMetaEl = document.getElementById('build-page-meta');
    const resultsEl = document.getElementById('build-results');
    const fallbackEl = document.getElementById('build-fallback');
    const fallbackBodyEl = document.getElementById('build-fallback-body');
    const resultsSummary = document.getElementById('build-results-summary');
    const resultsOrder = document.getElementById('build-results-order');
    const startBtn = document.getElementById('build-start-btn') as HTMLButtonElement | null;
    const importBtn = document.getElementById('build-import-btn') as HTMLButtonElement | null;
    const regenerateBtn = document.getElementById('build-regenerate-btn') as HTMLButtonElement | null;
    const fallbackRegenerateBtn = document.getElementById('build-fallback-regenerate') as HTMLButtonElement | null;
    const modelLabelEl = document.getElementById('build-model-label');
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
    let lastFallbackState: {
        okCount: number;
        proposedCount: number;
        successRate: number;
        repeatFallback: boolean;
    } | null = null;
    let lastPublishResult: PublishResponse | null = null;
    let pendingSnapshot: PendingBuildSnapshot | null = readPendingBuild();
    let isAuthenticated = false;
    let pipelineInFlight = false;

    function renderStatus() {
        if (!statusEl || !lastStatus) return;
        const locale = readLocale();
        switch (lastStatus.kind) {
            case 'oauth':
                statusEl.textContent = localizeBuildError('connectionFailed', locale, {
                    error: localizeOAuthError(lastStatus.code, locale)
                });
                break;
            case 'oauthConnected':
                statusEl.textContent = localizeBuildError('connectionSuccess', locale);
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
        }
        statusEl.hidden = false;
    }

    function renderVerifyFallback(
        okCount: number,
        proposedCount: number,
        successRate: number,
        repeatFallback = false
    ) {
        lastFallbackState = { okCount, proposedCount, successRate, repeatFallback };
        if (!fallbackBodyEl) return;
        const copy = repeatFallback
            ? buildImportRepeatFallbackCopy(readLocale())
            : buildVerifyFallbackCopy(readLocale(), okCount, proposedCount, successRate);
        setPageHeader('fallback', copy.title);
        fallbackBodyEl.textContent = copy.body;
        if (statusEl) {
            statusEl.hidden = true;
            statusEl.textContent = '';
        }
    }

    function renderProgress(target: HTMLElement | null) {
        if (!target || !lastProgress) return;
        const locale = readLocale();
        switch (lastProgress.kind) {
            case 'curating':
                target.textContent = buildProgressCurating(locale, lastProgress.modelShort);
                break;
            case 'verifying':
                target.textContent = buildProgressVerifying(locale, lastProgress.count);
                break;
            case 'publishing':
                target.textContent = buildProgressPublishing(locale, lastProgress.count);
                break;
            case 'reverifying':
                target.textContent = buildImportReverifying(locale);
                break;
        }
        target.hidden = false;
    }

    function relocalizeDynamicUi() {
        if (lastStatus) renderStatus();
        if (lastProgress) {
            renderProgress(progressEl);
            renderProgress(importProgressEl);
        }
        if (pendingSnapshot && previewEl && !previewEl.hidden) {
            renderPreview(pendingSnapshot);
        }
        if (lastFallbackState && fallbackEl && !fallbackEl.hidden) {
            renderVerifyFallback(
                lastFallbackState.okCount,
                lastFallbackState.proposedCount,
                lastFallbackState.successRate,
                lastFallbackState.repeatFallback
            );
        }
        if (resultsEl && !resultsEl.hidden) {
            if (lastPublishResult) {
                renderResults(lastPublishResult);
            } else {
                const published = readBuildResult();
                if (published) renderSavedBuildResult(published);
            }
        }
        void syncCurateModelLabel();
        updateImportButtonLabels();
    }

    const localeScope = createLocaleScope(signal);
    localeScope.onRelocalize(relocalizeDynamicUi);

    const error = readUrlFlag('error');
    const connected = readUrlFlag('connected');
    if (error || connected) clearUrlParams();

    if (statusEl && error) {
        lastStatus = { kind: 'oauth', code: error };
        renderStatus();
    } else if (statusEl && connected) {
        lastStatus = { kind: 'oauthConnected' };
        renderStatus();
    }

    if (!isApiConfigured()) {
        if (mainEl) mainEl.hidden = true;
        unconfiguredEl!.hidden = false;
        return;
    }

    const api = getApiBaseUrl();

    function updateImportButtonLabels() {
        if (!importBtn) return;
        const mode = isAuthenticated ? 'import' : 'connect';
        importBtn.querySelectorAll<HTMLElement>('[data-import-label]').forEach((el) => {
            el.hidden = el.dataset.importLabel !== mode;
        });
    }

    function updateAuthUi(user?: { displayName: string | null; spotifyUserId: string }) {
        if (user) {
            isAuthenticated = true;
            if (userLabel) userLabel.textContent = user.displayName ?? user.spotifyUserId;
            if (userSubtitleEl) userSubtitleEl.hidden = false;
            if (logoutBtn) logoutBtn.hidden = false;
        } else {
            isAuthenticated = false;
            if (userSubtitleEl) userSubtitleEl.hidden = true;
            if (logoutBtn) logoutBtn.hidden = true;
        }
        updateImportButtonLabels();
        updateImportNoteVisibility();
    }

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

    function setPageHeader(mode: 'flow' | 'preview' | 'results' | 'fallback', titleOverride?: string) {
        if (pageTitleEl) {
            pageTitleEl.querySelectorAll<HTMLElement>('[data-title-mode]').forEach((el) => {
                el.hidden = el.dataset.titleMode !== mode;
            });
            if (titleOverride && mode === 'fallback') {
                const active = pageTitleEl.querySelector<HTMLElement>(`[data-title-mode="${mode}"]`);
                if (active) {
                    const locale = readLocale();
                    const span = active.querySelector<HTMLElement>(`[data-locale="${locale}"]`);
                    if (span) span.textContent = titleOverride;
                }
            }
        }
        if (pageMetaEl && mode !== 'preview') {
            pageMetaEl.hidden = true;
            pageMetaEl.textContent = '';
        }
    }

    function updateImportNoteVisibility() {
        if (!importNoteEl) return;
        importNoteEl.hidden = isAuthenticated;
    }

    function setProgress(state: BuildProgressState, target: 'generate' | 'import' = 'generate') {
        lastProgress = state;
        if (target === 'generate') {
            renderProgress(progressEl);
            if (importProgressEl) importProgressEl.hidden = true;
        } else {
            renderProgress(importProgressEl);
            if (progressEl) progressEl.hidden = true;
        }
    }

    function hideProgress() {
        lastProgress = null;
        if (progressEl) progressEl.hidden = true;
        if (importProgressEl) importProgressEl.hidden = true;
    }

    function showPanel(panel: HTMLElement) {
        const others = [flowEl, previewEl, resultsEl, fallbackEl].filter(
            (el): el is HTMLElement => Boolean(el) && el !== panel
        );
        crossFadePanels(panel, others);
    }

    function renderPreview(snapshot: PendingBuildSnapshot) {
        if (!previewEl || !previewOrder) return;
        pendingSnapshot = snapshot;
        const locale = readLocale();
        const sequence = pickSequenceIntent(locale, snapshot.sequenceIntent);

        setPageHeader('preview');
        if (pageMetaEl) {
            pageMetaEl.textContent = buildPreviewMetaLine(
                locale,
                snapshot.verified.tracks.length,
                snapshot.verified.proposedCount,
                snapshot.modelLabel
            );
            pageMetaEl.hidden = false;
        }

        if (previewSequence) {
            if (sequence) {
                previewSequence.innerHTML = `
                    <h2 class="build-preview__heading">${escapeHtml(resultLabel(locale, 'sequence'))}</h2>
                    <p class="build-preview__sequence-text">${escapeHtml(sequence)}</p>
                `;
                previewSequence.hidden = false;
            } else {
                previewSequence.innerHTML = '';
                previewSequence.hidden = true;
            }
        }

        const orderItems = snapshot.verified.tracks
            .map(
                (track) =>
                    `<li class="build-tracklist__item">${escapeHtml(track.artist)} — ${escapeHtml(track.title)}</li>`
            )
            .join('');
        previewOrder.innerHTML = `
            <h2 class="build-preview__heading">${escapeHtml(resultLabel(locale, 'order'))}</h2>
            <ol class="build-tracklist__list">${orderItems}</ol>
        `;

        updateImportNoteVisibility();
        showPanel(previewEl);
        document.dispatchEvent(new CustomEvent('last-delivery-changed'));
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
        setPageHeader('results');
        showPanel(resultsEl);
    }

    function renderResults(data: PublishResponse) {
        if (signal.aborted) return;
        if (!resultsEl || !resultsSummary || !resultsOrder) return;

        lastPublishResult = data;
        setPageHeader('results');
        const locale = readLocale();
        const sequence = pickSequenceIntent(locale, data.sequenceIntent);

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
                        <h2 class="build-preview__heading">${escapeHtml(resultLabel(locale, 'sequence'))}</h2>
                        <p class="build-results__sequence-text">${escapeHtml(sequence)}</p>
                       </div>`
                    : ''
            }
        `;

        const orderItems = data.tracks
            .map(
                (track) =>
                    `<li class="build-tracklist__item">${escapeHtml(track.artist)} — ${escapeHtml(track.title)}</li>`
            )
            .join('');
        resultsOrder.innerHTML = `
            <h2 class="build-preview__heading">${escapeHtml(resultLabel(locale, 'order'))}</h2>
            <ol class="build-tracklist__list">${orderItems}</ol>
        `;

        showPanel(resultsEl);
        clearPendingBuild();
        saveBuildResult({
            playlistName: data.playlist.name,
            playlistUrl: data.playlist.url,
            trackCount: data.trackCount
        });
        document.dispatchEvent(new CustomEvent('last-delivery-changed'));
    }

    async function fetchCurate(modelId: string): Promise<CurateResponse> {
        const curateResponse = await fetch(`${api}/api/curate`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers, model: modelId }),
            signal
        });
        if (!curateResponse.ok) {
            const err = (await curateResponse.json().catch(() => null)) as { error?: string } | null;
            throw new Error(err?.error ?? 'Curate failed');
        }
        return (await curateResponse.json()) as CurateResponse;
    }

    async function fetchVerify(lines: ProposedLine[], brief: CompactBrief): Promise<VerifyResponse> {
        const verifyResponse = await fetch(`${api}/api/verify`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lines, brief }),
            signal
        });
        if (!verifyResponse.ok) {
            const err = (await verifyResponse.json().catch(() => null)) as { error?: string } | null;
            throw new Error(err?.error ?? 'Verify failed');
        }
        return (await verifyResponse.json()) as VerifyResponse;
    }

    function snapshotFromCurated(
        curated: CurateResponse,
        verified: VerifyResponse,
        modelId: string,
        modelLabel: string
    ): PendingBuildSnapshot {
        return {
            brief: curated.brief,
            sequenceIntent: curated.sequenceIntent,
            lines: curated.lines,
            verified,
            model: modelId,
            modelLabel,
            generatedAt: new Date().toISOString()
        };
    }

    async function runGenerate() {
        if (!startBtn || signal.aborted || pipelineInFlight) return;
        pipelineInFlight = true;
        startBtn.disabled = true;
        if (regenerateBtn) regenerateBtn.disabled = true;
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
            setPageHeader('flow');
            showPanel(flowEl!);

            const curated = await fetchCurate(model.id);
            if (signal.aborted) return;

            setProgress({ kind: 'verifying', count: curated.proposedCount });
            const verified = await fetchVerify(curated.lines, curated.brief);
            if (signal.aborted) return;

            if (verified.offerPromptFallback || verified.tracks.length < 10) {
                hideProgress();
                renderVerifyFallback(verified.okCount, verified.proposedCount, verified.successRate);
                if (fallbackEl) showPanel(fallbackEl);
                return;
            }

            hideProgress();
            const snapshot = snapshotFromCurated(curated, verified, model.id, curateLabel);
            savePendingBuild(snapshot);
            renderPreview(snapshot);
        } catch (buildError) {
            if (signal.aborted || isAbortError(buildError)) return;
            hideProgress();
            if (statusEl) {
                const raw =
                    buildError instanceof Error ? buildError.message : 'Build failed — try again.';
                lastStatus = { kind: 'api', raw };
                renderStatus();
            }
        } finally {
            pipelineInFlight = false;
            if (!signal.aborted) {
                if (startBtn) startBtn.disabled = false;
                if (regenerateBtn) regenerateBtn.disabled = false;
            }
        }
    }

    async function runImport() {
        if (!importBtn || !pendingSnapshot || signal.aborted || pipelineInFlight) return;
        pipelineInFlight = true;

        if (!isAuthenticated) {
            pipelineInFlight = false;
            savePendingBuild(pendingSnapshot);
            window.location.href = `${api}/auth/spotify`;
            return;
        }

        importBtn.disabled = true;
        if (regenerateBtn) regenerateBtn.disabled = true;
        if (statusEl) {
            statusEl.hidden = true;
            statusEl.textContent = '';
        }

        try {
            setProgress({ kind: 'reverifying' }, 'import');
            const verified = await fetchVerify(pendingSnapshot.lines, pendingSnapshot.brief);
            if (signal.aborted) return;

            if (verified.offerPromptFallback || verified.tracks.length < 10) {
                hideProgress();
                renderVerifyFallback(
                    verified.okCount,
                    verified.proposedCount,
                    verified.successRate,
                    true
                );
                if (fallbackEl) showPanel(fallbackEl);
                return;
            }

            pendingSnapshot = {
                ...pendingSnapshot,
                verified,
                generatedAt: new Date().toISOString()
            };
            savePendingBuild(pendingSnapshot);

            setProgress({ kind: 'publishing', count: verified.tracks.length }, 'import');
            const publishResponse = await fetch(`${api}/api/publish`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brief: pendingSnapshot.brief,
                    answers,
                    locale: readLocale(),
                    sequenceIntent: pendingSnapshot.sequenceIntent,
                    proposedCount: pendingSnapshot.verified.proposedCount,
                    tracks: verified.tracks,
                    skipped: verified.skipped
                }),
                signal
            });
            if (signal.aborted) return;
            if (!publishResponse.ok) {
                const err = (await publishResponse.json().catch(() => null)) as {
                    error?: string;
                } | null;
                const code = err?.error ?? 'Publish failed';
                if (code === 'cooldown_conflict') {
                    throw new Error('cooldown_conflict');
                }
                throw new Error(code);
            }
            const published = (await publishResponse.json()) as PublishResponse;
            if (signal.aborted) return;
            hideProgress();
            renderResults(published);
        } catch (error) {
            if (signal.aborted || isAbortError(error)) return;
            hideProgress();
            if (statusEl) {
                const raw = error instanceof Error ? error.message : 'Publish failed';
                lastStatus = { kind: 'api', raw };
                renderStatus();
            }
        } finally {
            pipelineInFlight = false;
            if (!signal.aborted) {
                importBtn.disabled = false;
                if (regenerateBtn) regenerateBtn.disabled = false;
            }
        }
    }

    async function loadSession() {
        try {
            const response = await fetch(`${api}/api/me`, { credentials: 'include', signal });
            if (signal.aborted) return;
            if (!response.ok) {
                updateAuthUi();
                return;
            }
            const data = (await response.json()) as MeResponse;
            if (data.authenticated) {
                updateAuthUi(data.user);
            } else {
                updateAuthUi();
            }
        } catch (error) {
            if (signal.aborted || isAbortError(error)) return;
            if (statusEl) {
                lastStatus = { kind: 'apiUnreachable' };
                renderStatus();
            }
            updateAuthUi();
        }
    }

    function initPanels() {
        if (signal.aborted) return;
        const published = readBuildResult();
        if (pendingSnapshot) {
            renderPreview(pendingSnapshot);
        } else if (published) {
            renderSavedBuildResult(published);
        } else {
            setPageHeader('flow');
            showPanel(flowEl!);
        }
    }

    logoutBtn?.addEventListener(
        'click',
        async () => {
            try {
                const response = await fetch(`${api}/auth/logout`, {
                    method: 'POST',
                    credentials: 'include',
                    signal
                });
                if (signal.aborted) return;
                if (!response.ok) throw new Error('Logout failed');
                updateAuthUi();
            } catch (error) {
                if (signal.aborted || isAbortError(error)) return;
                if (statusEl) {
                    lastStatus = {
                        kind: 'api',
                        raw: error instanceof Error ? error.message : 'Logout failed'
                    };
                    renderStatus();
                }
            }
        },
        { signal }
    );

    startBtn?.addEventListener('click', () => void runGenerate(), { signal });
    regenerateBtn?.addEventListener(
        'click',
        () => {
            clearPendingBuild();
            pendingSnapshot = null;
            void runGenerate();
        },
        { signal }
    );
    fallbackRegenerateBtn?.addEventListener(
        'click',
        () => {
            clearPendingBuild();
            pendingSnapshot = null;
            void runGenerate();
        },
        { signal }
    );
    importBtn?.addEventListener('click', () => void runImport(), { signal });

    void loadSession().then(() => {
        if (signal.aborted) return;
        initPanels();
    });

    localeScope.runNow();
}
