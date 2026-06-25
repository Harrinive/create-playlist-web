import type { Locale } from './locale';

type Bilingual = { en: string; zh: string };

export const DELIVERY_COPY = {
    promptLabel: { en: 'Prompt for Spotify Prompted Playlist', zh: 'Spotify 提示词' },
    promptSublabel: { en: 'Paste in the Spotify app', zh: '粘贴到 Spotify 应用' },
    buildFallbackLabel: { en: 'Build on Spotify', zh: '在 Spotify 上创建' },
    buildSublabelSpotify: {
        en: '~20 verified tracks on your Spotify',
        zh: '约 20 首验证曲目，发布到你的 Spotify'
    },
    buildSublabelAccount: {
        en: '~20 verified tracks on your account',
        zh: '约 20 首验证曲目，发布到你的账号'
    },
    stepKicker: { en: 'Step 2', zh: '步骤 2' },
    heading: { en: 'What should we deliver?', zh: '你想怎么交付？' },
    backToInterview: { en: 'Back to interview', zh: '返回访谈' },
    genreNotePrefix: {
        en: 'Based on your interview, this playlist leans toward',
        zh: '根据你的访谈，歌单可能偏向'
    }
} as const satisfies Record<string, Bilingual>;

export function deliveryText(key: keyof typeof DELIVERY_COPY, locale: Locale): string {
    const copy = DELIVERY_COPY[key];
    return locale === 'zh' ? copy.zh : copy.en;
}
