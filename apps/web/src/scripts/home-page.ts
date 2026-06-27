import { getHomeProgressActions, type HomeLastOutputLabel } from '../lib/home-progress';
import type { LastDelivery } from '../lib/last-delivery';
import { onLocaleChange, readLocale, syncLocaleNodes, type Locale } from '../lib/locale';
import { normalizeSessionState } from '../lib/session-normalize';
import { FLOW_SESSION_ACTIONS } from '../lib/flow-nav-copy';
import { performStartOver } from '../lib/start-over';

function clearDynamicHomeActions(root: HTMLElement) {
    root.querySelectorAll('[data-home-dynamic]').forEach((el) => el.remove());
}

function mountStartOverButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'text-link-button';
    btn.dataset.homeDynamic = '';
    btn.innerHTML = `
        <span data-locale="en">${FLOW_SESSION_ACTIONS.startOver.en}</span>
        <span data-locale="zh" hidden>${FLOW_SESSION_ACTIONS.startOver.zh}</span>
    `;
    btn.addEventListener('click', () => performStartOver());
    return btn;
}

function mountLastOutputLink(
    href: string,
    kind: LastDelivery,
    label: HomeLastOutputLabel
): HTMLAnchorElement {
    const link = document.createElement('a');
    link.className = 'text-link-button';
    link.href = href;
    link.dataset.homeDynamic = '';
    link.innerHTML = `
        <span data-locale="en">
            <span data-last-label="prompt">View last prompt</span>
            <span data-last-label="result" hidden>View last result</span>
            <span data-last-label="tracklist" hidden>View tracklist</span>
        </span>
        <span data-locale="zh" hidden>
            <span data-last-label="prompt">查看上次提示词</span>
            <span data-last-label="result" hidden>查看上次结果</span>
            <span data-last-label="tracklist" hidden>查看曲目</span>
        </span>
    `;
    link.querySelectorAll<HTMLElement>('[data-last-label]').forEach((el) => {
        el.hidden = el.dataset.lastLabel !== label;
    });
    return link;
}

function syncInterviewLabelVisibility(root: HTMLElement) {
    const actions = getHomeProgressActions();
    root.querySelectorAll<HTMLElement>('[data-home-interview-label]').forEach((el) => {
        el.hidden = el.dataset.homeInterviewLabel !== actions.interviewLabel;
    });
}

export function renderHomeActions() {
    const root = document.getElementById('home-interview-actions');
    if (!root) return;

    normalizeSessionState();
    const actions = getHomeProgressActions();

    syncInterviewLabelVisibility(root);

    clearDynamicHomeActions(root);

    if (actions.showStartOver) {
        root.appendChild(mountStartOverButton());
    }
    if (actions.lastOutput) {
        root.appendChild(mountLastOutputLink(actions.lastOutput.href, actions.lastOutput.kind, actions.lastOutput.label));
    }

    // Nodes ship with en-visible markup; sync hidden attrs (also safe mid-crossfade).
    syncLocaleNodes(readLocale());
}

function onHomeLocaleChange(_locale: Locale) {
    const root = document.getElementById('home-interview-actions');
    if (!root) return;
    // Keep mounted data-locale nodes — applyLocaleInstant already swapped them at fade midpoint.
    syncInterviewLabelVisibility(root);
}

let homeListenersBound = false;

function bindHomeListeners() {
    if (homeListenersBound) return;
    homeListenersBound = true;
    document.addEventListener('last-delivery-changed', renderHomeActions);
    onLocaleChange(onHomeLocaleChange);
}

export function initHomePage() {
    if (!document.getElementById('home-interview-actions')) return;
    renderHomeActions();
    bindHomeListeners();
}

function onHomeNavigation() {
    initHomePage();
}

document.addEventListener('astro:page-load', onHomeNavigation);
document.addEventListener('astro:after-swap', onHomeNavigation);
