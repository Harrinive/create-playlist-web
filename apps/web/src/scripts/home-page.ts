import { hasInterviewProgress } from '../lib/interview-progress';
import { performStartOver } from '../lib/start-over';

export function initHomePage() {
    const root = document.getElementById('home-interview-actions');
    if (!root) return;

    const startOverBtn = document.getElementById('home-start-over') as HTMLButtonElement | null;
    const inProgress = hasInterviewProgress();

    root.querySelectorAll<HTMLElement>('[data-home-interview-label]').forEach((el) => {
        el.hidden = el.dataset.homeInterviewLabel !== (inProgress ? 'continue' : 'start');
    });

    if (startOverBtn) startOverBtn.hidden = !inProgress;

    if (startOverBtn && startOverBtn.dataset.bound !== 'true') {
        startOverBtn.dataset.bound = 'true';
        startOverBtn.addEventListener('click', () => performStartOver());
    }
}

document.addEventListener('astro:page-load', () => initHomePage());
