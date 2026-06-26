import type { Locale } from './locale';

type Copy = { en: string; zh: string };

function pick(locale: Locale, copy: Copy): string {
    return locale === 'zh' ? copy.zh : copy.en;
}

export function buildProgressCurating(locale: Locale, modelLabel: string): string {
    return pick(locale, {
        en: `Generating your tracklist with ${modelLabel}…`,
        zh: `正在用 ${modelLabel} 生成曲目…`
    });
}

export function buildProgressVerifying(locale: Locale, count: number): string {
    return pick(locale, {
        en: `Checking ${count} tracks on Spotify…`,
        zh: `正在 Spotify 上验证 ${count} 首曲目…`
    });
}

export function buildProgressPublishing(locale: Locale, count: number): string {
    return pick(locale, {
        en: `Publishing ${count} tracks to your playlist…`,
        zh: `正在将 ${count} 首曲目发布到你的歌单…`
    });
}

export type BuildVerifyFallbackCopy = { title: string; body: string };

export function buildVerifyFallbackCopy(
    locale: Locale,
    okCount: number,
    proposedCount: number,
    successRate: number
): BuildVerifyFallbackCopy {
    const pct = Math.round(successRate * 100);
    return pick(locale, {
        en: {
            title: 'Too few tracks on Spotify',
            body: `Only ${okCount} of ${proposedCount} matched (${pct}%). Use the prompt path instead — paste the paragraph into Spotify\u2019s Prompted Playlist feature.`
        },
        zh: {
            title: 'Spotify 上匹配的曲目太少',
            body: `仅 ${okCount} / ${proposedCount} 首通过验证（${pct}%）。请改用提示词路径，将段落粘贴到 Spotify 的 AI 歌单功能中。`
        }
    });
}

const RESULT_LABELS = {
    name: { en: 'Playlist name', zh: '歌单名称' },
    link: { en: 'Open in Spotify', zh: '在 Spotify 中打开' },
    tracks: { en: 'Tracks', zh: '曲目数' },
    sequence: { en: 'Listen arc', zh: '聆听走向' },
    order: { en: 'Track order', zh: '曲目顺序' }
} as const;

export function resultLabel(locale: Locale, key: keyof typeof RESULT_LABELS): string {
    return pick(locale, RESULT_LABELS[key]);
}

export function resultTracksLine(locale: Locale, trackCount: number, proposedCount: number): string {
    return pick(locale, {
        en: `${trackCount} published (from ${proposedCount} proposed)`,
        zh: `已发布 ${trackCount} 首（候选 ${proposedCount} 首）`
    });
}

/** Light cleanup for LLM sequence prose — strip markdown emphasis markers. */
export function formatSequenceIntent(text: string): string {
    return text
        .trim()
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\s+/g, ' ');
}
