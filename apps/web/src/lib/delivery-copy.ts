import type { Locale } from './locale';

type Bilingual = { en: string; zh: string };

export const DELIVERY_COPY = {
    promptLabel: { en: 'Prompt for Spotify Prompted Playlist', zh: 'Spotify 提示词' },
    promptSublabel: { en: 'Paste in the Spotify app', zh: '粘贴到 Spotify 应用' },
    buildFallbackLabel: { en: 'Build on Spotify', zh: '在 Spotify 上创建' },
    buildSublabelSpotify: {
        en: 'About 20 tracks to preview — import to Spotify optional',
        zh: '约 20 首曲目可预览 — 导入 Spotify 可选'
    },
    buildSublabelAccount: {
        en: 'About 20 tracks to preview — connect to import',
        zh: '约 20 首曲目可预览 — 连接后导入'
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
