import { readInterviewFallbackState } from '../lib/interview-fallback';
import { applyLocaleToDocument, readLocale } from '../lib/locale';
import { performStartOver } from '../lib/start-over';

export function initInterviewFallbackPage() {
    const root = document.getElementById('interview-fallback-page');
    if (!root) return;

    if (root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';

    const locale = readLocale();
    applyLocaleToDocument(locale);

    const state = readInterviewFallbackState();
    const canResume = state?.canResume ?? false;

    const resumeBtn = document.getElementById('interview-fallback-resume');
    const resumeHint = document.getElementById('interview-fallback-resume-hint');
    const noCheckpoint = document.getElementById('interview-fallback-no-checkpoint');
    const startOverBtn = document.getElementById('interview-fallback-start-over');

    if (canResume) {
        resumeBtn?.removeAttribute('hidden');
        resumeHint?.removeAttribute('hidden');
    } else {
        noCheckpoint?.removeAttribute('hidden');
        startOverBtn?.classList.add('text-link-button--primary');
    }

    startOverBtn?.addEventListener('click', () => {
        performStartOver();
    });
}
