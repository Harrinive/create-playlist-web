import type { Locale } from './locale';

type Copy = { en: string; zh: string };

export const INTERVIEW_FALLBACK_COPY = {
    title: {
        en: 'We couldn\u2019t shape the next question',
        zh: '下一题没能好好落下'
    },
    body: {
        en: 'We tried several times, but the words kept slipping off the page \u2014 not your fault. If your earlier picks are still here, you can step back to the last question. Or begin again from the threshold.',
        zh: '我们试了几遍，问题还是没能落在你的场景里 \u2014 不是你的错。若刚才的选择还在，可以回到上一题；也可以从门口重新开始。'
    },
    resumeHint: {
        en: 'Your answers from earlier questions are saved in this browser session.',
        zh: '前面几题的选择还保存在当前浏览器会话里。'
    },
    resumeButton: {
        en: 'Back to last question',
        zh: '回到上一题'
    },
    startOverButton: {
        en: 'Start over',
        zh: '重新开始'
    },
    homeButton: {
        en: 'Home',
        zh: '首页'
    },
    noCheckpoint: {
        en: 'Nothing to return to yet \u2014 start fresh when you\u2019re ready.',
        zh: '还没有可返回的检查点 \u2014 准备好了就从头开始。'
    }
} as const satisfies Record<string, Copy>;

export function pickInterviewFallbackCopy(key: keyof typeof INTERVIEW_FALLBACK_COPY, locale: Locale): string {
    const copy = INTERVIEW_FALLBACK_COPY[key];
    return locale === 'zh' ? copy.zh : copy.en;
}
