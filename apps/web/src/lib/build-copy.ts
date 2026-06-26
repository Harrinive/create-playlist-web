import type { Locale } from './locale';

type Copy = { en: string; zh: string };

function pick(locale: Locale, copy: Copy): string {
    return locale === 'zh' ? copy.zh : copy.en;
}

export function buildProgressCurating(locale: Locale, modelLabel: string): string {
    return pick(locale, {
        en: `Building your tracklist with ${modelLabel}…`,
        zh: `正在用 ${modelLabel} 生成曲目…`
    });
}

export function buildProgressVerifying(locale: Locale, count: number): string {
    return pick(locale, {
        en: `Matching ${count} songs on Spotify…`,
        zh: `正在 Spotify 上匹配 ${count} 首歌曲…`
    });
}

export function buildProgressPublishing(locale: Locale, count: number): string {
    return pick(locale, {
        en: `Adding ${count} songs to your playlist…`,
        zh: `正在将 ${count} 首歌曲加入歌单…`
    });
}

export function buildImportReverifying(locale: Locale): string {
    return pick(locale, {
        en: 'Skipping songs already on your recent playlists…',
        zh: '正在跳过你近期歌单里已有的歌曲…'
    });
}

export function buildPreviewTracksLine(locale: Locale, trackCount: number, _proposedCount?: number): string {
    return pick(locale, {
        en: `${trackCount} tracks`,
        zh: `${trackCount} 首曲目`
    });
}

export function buildPreviewMetaLine(
    locale: Locale,
    trackCount: number,
    proposedCount: number,
    modelLabel: string | null
): string {
    const tracks = buildPreviewTracksLine(locale, trackCount, proposedCount);
    if (!modelLabel) return tracks;
    return `${tracks} · ${modelLabel}`;
}

export function localizeSkippedReason(locale: Locale, reason: string): string {
    if (reason.includes('cooldown (recent build)')) {
        return pick(locale, {
            en: 'Already on a recent Vibelist playlist',
            zh: '已在近期 Vibelist 歌单中'
        });
    }
    if (reason.includes('artist cooldown')) {
        return pick(locale, {
            en: 'Dropped — artist used often in your recent playlists',
            zh: '已移除 — 该歌手在近期歌单中重复较多'
        });
    }
    if (reason === 'not_found') {
        return pick(locale, { en: 'Not found on Spotify', zh: 'Spotify 上未找到' });
    }
    if (reason === 'wrong_match') {
        return pick(locale, { en: 'Wrong match', zh: '匹配不正确' });
    }
    if (reason === 'duplicate') {
        return pick(locale, { en: 'Duplicate track', zh: '重复曲目' });
    }
    return reason;
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
            title: 'Too few songs matched on Spotify',
            body: `Only ${okCount} of ${proposedCount} songs matched (${pct}%). Try pasting a prompt into Spotify\u2019s Prompted Playlist instead.`
        },
        zh: {
            title: 'Spotify 上匹配到的歌曲太少',
            body: `${proposedCount} 首候选里只有 ${okCount} 首匹配（${pct}%）。可以改用 Spotify 提示词，粘贴到 Prompted Playlist。`
        }
    });
}

export function buildImportRepeatFallbackCopy(locale: Locale): BuildVerifyFallbackCopy {
    return pick(locale, {
        en: {
            title: 'Too few songs left to import',
            body: 'Some songs were already on your recent Vibelist playlists. Regenerate the list or try the Spotify prompt instead.'
        },
        zh: {
            title: '可导入的歌曲太少',
            body: '部分歌曲已出现在你近期的 Vibelist 歌单里。请重新生成，或改用 Spotify 提示词。'
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

export function resultTracksLine(locale: Locale, trackCount: number, _proposedCount?: number): string {
    return pick(locale, {
        en: `${trackCount} tracks`,
        zh: `${trackCount} 首`
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
