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

export function buildImportReverifying(locale: Locale): string {
    return pick(locale, {
        en: 'Checking against your past Vibelist playlists…',
        zh: '正在对照你过去的 Vibelist 歌单…'
    });
}

export function buildPreviewTracksLine(locale: Locale, trackCount: number, proposedCount: number): string {
    return pick(locale, {
        en: `${trackCount} tracks verified (from ${proposedCount} proposed)`,
        zh: `${trackCount} 首已验证（候选 ${proposedCount} 首）`
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
            title: 'Too few tracks on Spotify',
            body: `Only ${okCount} of ${proposedCount} matched (${pct}%). Use the prompt path instead — paste the paragraph into Spotify\u2019s Prompted Playlist feature.`
        },
        zh: {
            title: 'Spotify 上匹配的曲目太少',
            body: `仅 ${okCount} / ${proposedCount} 首通过验证（${pct}%）。请改用提示词路径，将段落粘贴到 Spotify 的 AI 歌单功能中。`
        }
    });
}

export function buildImportRepeatFallbackCopy(locale: Locale): BuildVerifyFallbackCopy {
    return pick(locale, {
        en: {
            title: 'Too few tracks to import',
            body: 'Some tracks were removed because they\u2019re already on your recent Vibelist playlists. Regenerate the tracklist or use the prompt path instead.'
        },
        zh: {
            title: '可导入的曲目太少',
            body: '部分曲目因已出现在你近期的 Vibelist 歌单中而被移除。请重新生成曲目，或改用提示词路径。'
        }
    });
}

export function buildPendingRestored(locale: Locale): string {
    return pick(locale, {
        en: 'Restored your tracklist from this session.',
        zh: '已恢复本会话中的曲目列表。'
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
