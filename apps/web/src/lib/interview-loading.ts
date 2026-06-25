import type { InterviewAlgorithmMode } from './interview-algorithm-mode';
import type { Locale } from './locale';

type LoadingProfile = {
    stages: string[];
    /** Delay (ms) before advancing from stage i to stage i + 1 */
    stageDelaysMs: number[];
    /** Progress % at each stage index (same length as stages) */
    progressAtStage: number[];
};

type LoadingCopy = {
    badge: string;
    title: string;
    fastTitle: string;
    fastSubtitle: string;
    fullModeProfile: LoadingProfile;
};

const LOADING_COPY: Record<Locale, LoadingCopy> = {
    en: {
        badge: 'Full mode',
        title: 'Crafting your question',
        fastTitle: 'Please wait…',
        fastSubtitle: 'Preparing your next question',
        fullModeProfile: {
            stages: [
                'Planning this turn…',
                'Writing stem and options…',
                'Checking logic and coverage…',
                'Revising if needed…',
                'Finishing up…'
            ],
            stageDelaysMs: [8000, 20000, 40000, 65000],
            progressAtStage: [12, 28, 48, 68, 85]
        }
    },
    zh: {
        badge: '完整模式',
        title: '正在打磨题目',
        fastTitle: '请稍候…',
        fastSubtitle: '正在准备下一题',
        fullModeProfile: {
            stages: [
                '规划这一题…',
                '撰写题干与选项…',
                '校验逻辑与覆盖…',
                '必要时修订…',
                '即将完成…'
            ],
            stageDelaysMs: [8000, 20000, 40000, 65000],
            progressAtStage: [12, 28, 48, 68, 85]
        }
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
        return { element: block, stop: () => {} };
    }

    const profile = copy.fullModeProfile;

    block.innerHTML = `
        <p class="interview-loading__badge">${copy.badge}</p>
        <p class="interview-loading__text">${copy.title}</p>
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
        <p class="interview-loading__stage" aria-live="polite">${profile.stages[0]}</p>
    `;

    const progress = block.querySelector<HTMLElement>('.interview-loading__progress');
    const bar = block.querySelector<HTMLElement>('.interview-loading__progress-bar');
    const stageEl = block.querySelector<HTMLElement>('.interview-loading__stage');
    if (!progress || !bar || !stageEl) {
        return { element: block, stop: () => {} };
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let progressPct = profile.progressAtStage[0];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let creepInterval: ReturnType<typeof setInterval> | null = null;

    function setProgress(pct: number) {
        progressPct = Math.min(pct, 96);
        progress.setAttribute('aria-valuenow', String(progressPct));
        bar.style.width = `${progressPct}%`;
    }

    function setStage(index: number) {
        const clamped = Math.min(index, profile.stages.length - 1);
        stageEl.textContent = profile.stages[clamped];
        setProgress(profile.progressAtStage[clamped] ?? progressPct);
    }

    setStage(0);

    if (!reducedMotion) {
        let cumulative = 0;
        for (let i = 0; i < profile.stageDelaysMs.length; i += 1) {
            cumulative += profile.stageDelaysMs[i];
            const stageTarget = i + 1;
            timeouts.push(
                setTimeout(() => {
                    setStage(stageTarget);
                }, cumulative)
            );
        }

        const creepStartMs = profile.stageDelaysMs.reduce((a, b) => a + b, 0) + 2000;
        timeouts.push(
            setTimeout(() => {
                creepInterval = setInterval(() => {
                    if (progressPct < 96) setProgress(progressPct + 1);
                }, 4000);
            }, creepStartMs)
        );
    }

    return {
        element: block,
        stop: () => {
            for (const id of timeouts) clearTimeout(id);
            if (creepInterval) clearInterval(creepInterval);
            setProgress(100);
            stageEl.textContent = profile.stages[profile.stages.length - 1];
        }
    };
}
