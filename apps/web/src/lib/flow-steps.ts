import type { Locale } from './locale';

type Bilingual = { en: string; zh: string };

export type FlowStep = 1 | 2 | 3;

export const FLOW_STEP_KICKERS: Record<FlowStep, Bilingual> = {
    1: { en: 'Step 1', zh: '步骤 1' },
    2: { en: 'Step 2', zh: '步骤 2' },
    3: { en: 'Step 3', zh: '步骤 3' }
};

export const FLOW_PAGE_HEADINGS = {
    interview: { en: 'Interview', zh: '访谈' },
    delivery: { en: 'What should we deliver?', zh: '你想怎么交付？' },
    prompt: { en: 'Copy into Spotify', zh: '复制到 Spotify' },
    buildFlow: { en: 'Generate tracklist', zh: '生成曲目' },
    buildPreview: { en: 'Your tracklist', zh: '你的曲目' },
    buildResults: { en: 'Playlist created', zh: '歌单已创建' },
    buildFallback: { en: 'Tracklist issue', zh: '曲目问题' }
} as const satisfies Record<string, Bilingual>;

export const FLOW_STEP3_PROMPT_SUBTITLE: Bilingual = {
    en: 'Spotify Prompted Playlist',
    zh: 'Spotify Prompted Playlist'
};

export const FLOW_HOW_IT_WORKS: Array<{ step: FlowStep; text: Bilingual }> = [
    {
        step: 1,
        text: {
            en: 'Scene, mood, energy, and what to avoid — a few quick picks.',
            zh: '场景、情绪、能量与避开项 — 几步快速选择。'
        }
    },
    {
        step: 2,
        text: {
            en: 'Prompt paragraph or ~20 verified tracks — pick your model at delivery.',
            zh: '提示词段落或约 20 首验证曲目 — 在交付方式步骤选择模型。'
        }
    },
    {
        step: 3,
        text: {
            en: 'Paste into Spotify Prompted Playlist, or generate and publish a playlist to your account.',
            zh: '粘贴到 Spotify Prompted Playlist，或生成并发布歌单到你的账号。'
        }
    }
];

export function flowStepKicker(step: FlowStep, locale: Locale): string {
    const copy = FLOW_STEP_KICKERS[step];
    return locale === 'zh' ? copy.zh : copy.en;
}

export function flowPageHeading(key: keyof typeof FLOW_PAGE_HEADINGS, locale: Locale): string {
    const copy = FLOW_PAGE_HEADINGS[key];
    return locale === 'zh' ? copy.zh : copy.en;
}
