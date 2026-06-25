import type { InterviewAlgorithmMode } from './interview-algorithm-mode';
import type { Locale } from './locale';
import { appearOnMount } from './motion';

const FULL_STAGE_MS = [2800, 3500, 4500] as const;
const FULL_PROGRESS = [18, 48, 78, 92] as const;

type LoadingCopy = {
    badge: string;
    title: string;
    subtitle: string;
    stages: [string, string, string, string];
    fastTitle: string;
    fastSubtitle: string;
};

const LOADING_COPY: Record<Locale, LoadingCopy> = {
    en: {
        badge: 'Full mode',
        title: 'Crafting your question',
        subtitle: 'Plan → draft → verify — usually 20–40 seconds.',
        stages: ['Planning this turn…', 'Writing stem and options…', 'Checking quality…', 'Almost ready…'],
        fastTitle: 'Please wait…',
        fastSubtitle: 'Preparing your next question'
    },
    zh: {
        badge: '完整模式',
        title: '正在打磨题目',
        subtitle: '规划 → 出题 → 校验，大约需要 20–40 秒。',
        stages: ['规划这一题…', '撰写题干与选项…', '校验质量…', '即将完成…'],
        fastTitle: '请稍候…',
        fastSubtitle: '正在准备下一题'
    }
};

export type InterviewLoadingHandle = {
    element: HTMLElement;
    stop: () => void;
};

export function mountInterviewLoading(
    locale: Locale,
    mode: InterviewAlgorithmMode
): InterviewLoadingHandle {
    const copy = LOADING_COPY[locale];
    const block = document.createElement('div');
    block.className = 'interview-loading';

    if (mode === 'fast') {
        block.innerHTML = `
            <p class="interview-loading__text">${copy.fastTitle}</p>
            <p class="interview-loading__hint">${copy.fastSubtitle}</p>
        `;
        appearOnMount(block);
        return { element: block, stop: () => {} };
    }

    block.innerHTML = `
        <p class="interview-loading__badge">${copy.badge}</p>
        <p class="interview-loading__text">${copy.title}</p>
        <p class="interview-loading__hint">${copy.subtitle}</p>
        <div
            class="interview-loading__progress"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="0"
            aria-label="${copy.title}"
        >
            <div class="interview-loading__progress-bar"></div>
        </div>
        <p class="interview-loading__stage" aria-live="polite">${copy.stages[0]}</p>
    `;

    const progress = block.querySelector<HTMLElement>('.interview-loading__progress');
    const bar = block.querySelector<HTMLElement>('.interview-loading__progress-bar');
    const stageEl = block.querySelector<HTMLElement>('.interview-loading__stage');
    if (!progress || !bar || !stageEl) {
        appearOnMount(block);
        return { element: block, stop: () => {} };
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stageIndex = 0;
    let progressPct = FULL_PROGRESS[0];
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function setProgress(pct: number) {
        progressPct = pct;
        progress.setAttribute('aria-valuenow', String(pct));
        bar.style.width = `${pct}%`;
    }

    function setStage(index: number) {
        stageIndex = index;
        stageEl.textContent = copy.stages[Math.min(index, copy.stages.length - 1)];
        setProgress(FULL_PROGRESS[Math.min(index, FULL_PROGRESS.length - 1)]);
    }

    setStage(0);

    if (!reducedMotion) {
        for (let i = 0; i < FULL_STAGE_MS.length; i += 1) {
            const delay = FULL_STAGE_MS.slice(0, i + 1).reduce((sum, ms) => sum + ms, 0);
            timeouts.push(
                setTimeout(() => {
                    setStage(i + 1);
                }, delay)
            );
        }
    }

    appearOnMount(block);

    return {
        element: block,
        stop: () => {
            for (const id of timeouts) clearTimeout(id);
            setProgress(100);
            stageEl.textContent = copy.stages[copy.stages.length - 1];
        }
    };
}
