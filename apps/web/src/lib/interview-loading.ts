import type { InterviewAlgorithmMode } from './interview-algorithm-mode';
import type { Locale } from './locale';

type LoadingProfile = {
    stages: string[];
    /** Delay (ms) before advancing from stage i to stage i + 1 */
    stageDelaysMs: number[];
    /** Progress % at each stage index (same length as stages) */
    progressAtStage: number[];
    /** Stage index for "Checking logic and coverage…" */
    verifyStageIndex: number;
    /** Minimum time (ms) to show verify stage before dismiss */
    verifyMinDisplayMs: number;
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
        badge: 'Polished',
        title: 'Crafting your question',
        fastTitle: 'Please wait…',
        fastSubtitle: 'Preparing your next question',
        fullModeProfile: {
            stages: [
                'Planning your question…',
                'Writing choices…',
                'Making sure it fits…',
                'Polishing…',
                'Almost ready…'
            ],
            stageDelaysMs: [2000, 4500, 9000, 14000],
            progressAtStage: [12, 28, 52, 72, 88],
            verifyStageIndex: 2,
            verifyMinDisplayMs: 700
        }
    },
    zh: {
        badge: '打磨',
        title: '正在打磨题目',
        fastTitle: '请稍候…',
        fastSubtitle: '正在准备下一题',
        fullModeProfile: {
            stages: [
                '构思题目…',
                '撰写选项…',
                '对照你的选择…',
                '微调措辞…',
                '马上好…'
            ],
            stageDelaysMs: [2000, 4500, 9000, 14000],
            progressAtStage: [12, 28, 52, 72, 88],
            verifyStageIndex: 2,
            verifyMinDisplayMs: 700
        }
    }
};

export type InterviewLoadingHandle = {
    element: HTMLElement;
    /** Await before removing the loading UI so verify stage is visible. */
    stop: () => Promise<void>;
    /** Refresh visible copy while keeping progress and stage timing. */
    relocalize: (locale: Locale) => void;
};

function noopLoadingHandle(element: HTMLElement): InterviewLoadingHandle {
    return {
        element,
        stop: async () => {},
        relocalize: () => {}
    };
}

export function mountInterviewLoading(
    locale: Locale,
    mode: InterviewAlgorithmMode
): InterviewLoadingHandle {
    let currentLocale = locale;
    const copy = LOADING_COPY[currentLocale];
    const block = document.createElement('div');
    block.className = 'interview-loading';

    if (mode === 'fast') {
        block.innerHTML = `
            <p class="interview-loading__text">${copy.fastTitle}</p>
            <p class="interview-loading__hint">${copy.fastSubtitle}</p>
        `;
        const titleEl = block.querySelector<HTMLElement>('.interview-loading__text');
        const hintEl = block.querySelector<HTMLElement>('.interview-loading__hint');
        if (!titleEl || !hintEl) return noopLoadingHandle(block);

        return {
            element: block,
            stop: async () => {},
            relocalize: (nextLocale) => {
                if (nextLocale === currentLocale) return;
                currentLocale = nextLocale;
                const nextCopy = LOADING_COPY[nextLocale];
                titleEl.textContent = nextCopy.fastTitle;
                hintEl.textContent = nextCopy.fastSubtitle;
            }
        };
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

    const badgeEl = block.querySelector<HTMLElement>('.interview-loading__badge');
    const titleEl = block.querySelector<HTMLElement>('.interview-loading__text');
    const progress = block.querySelector<HTMLElement>('.interview-loading__progress');
    const bar = block.querySelector<HTMLElement>('.interview-loading__progress-bar');
    const stageEl = block.querySelector<HTMLElement>('.interview-loading__stage');
    if (!badgeEl || !titleEl || !progress || !bar || !stageEl) {
        return noopLoadingHandle(block);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let progressPct = profile.progressAtStage[0];
    let currentStageIndex = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let creepInterval: ReturnType<typeof setInterval> | null = null;

    function activeProfile() {
        return LOADING_COPY[currentLocale].fullModeProfile;
    }

    function setProgress(pct: number) {
        progressPct = Math.min(pct, 96);
        progress.setAttribute('aria-valuenow', String(progressPct));
        bar.style.width = `${progressPct}%`;
    }

    function setStage(index: number) {
        const profile = activeProfile();
        const clamped = Math.min(index, profile.stages.length - 1);
        currentStageIndex = clamped;
        stageEl.textContent = profile.stages[clamped];
        setProgress(profile.progressAtStage[clamped] ?? progressPct);
    }

    function refreshStaticCopy() {
        const copy = LOADING_COPY[currentLocale];
        badgeEl.textContent = copy.badge;
        titleEl.textContent = copy.title;
        progress.setAttribute('aria-label', copy.title);
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
        stop: async () => {
            const profile = activeProfile();
            for (const id of timeouts) clearTimeout(id);
            if (creepInterval) clearInterval(creepInterval);

            if (currentStageIndex < profile.verifyStageIndex) {
                setStage(profile.verifyStageIndex);
                await new Promise((resolve) => {
                    setTimeout(resolve, profile.verifyMinDisplayMs);
                });
            }

            setProgress(100);
            stageEl.textContent = profile.stages[profile.stages.length - 1];
        },
        relocalize: (nextLocale) => {
            if (nextLocale === currentLocale) return;
            currentLocale = nextLocale;
            refreshStaticCopy();
            setStage(currentStageIndex);
        }
    };
}
