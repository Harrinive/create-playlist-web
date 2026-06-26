import type { Locale } from './locale';

type Bilingual = { en: string; zh: string };

export const DELIVERY_COPY = {
    promptLabel: { en: 'Prompt for Spotify Prompted Playlist', zh: 'Spotify 提示词' },
    promptSublabel: { en: 'Paste in the Spotify app', zh: '粘贴到 Spotify 应用' },
    buildFallbackLabel: { en: 'Build on Spotify', zh: '在 Spotify 上创建' },
    buildSublabelSpotify: {
        en: 'Generate ~20 verified tracks; import to Spotify optional',
        zh: '生成约 20 首验证曲目；导入 Spotify 可选'
    },
    buildSublabelAccount: {
        en: 'Generate ~20 verified tracks; connect to import',
        zh: '生成约 20 首验证曲目；连接后导入'
    },
    genreNotePrefix: {
        en: 'Based on your interview, this playlist leans toward',
        zh: '根据你的访谈，歌单可能偏向'
    }
} as const satisfies Record<string, Bilingual>;

export function deliveryText(key: keyof typeof DELIVERY_COPY, locale: Locale): string {
    const copy = DELIVERY_COPY[key];
    return locale === 'zh' ? copy.zh : copy.en;
}
