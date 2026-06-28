import type { BilingualProse } from './build-copy';
import { PENDING_BUILD_KEY } from './session-keys';

export type CompactBriefSnapshot = {
    anchor: string;
    emotion: string;
    pace: string;
    sonic: string;
    flow: string;
    reject: string[];
    seeds: string;
    cooldownText?: string;
};

export type ProposedLineSnapshot = {
    lineNumber: number;
    artist: string;
    title: string;
    tags: string;
    raw: string;
};

export type VerifiedTrackSnapshot = {
    lineNumber: number;
    id: string;
    artist: string;
    title: string;
    uri: string;
};

export type VerifySnapshot = {
    successRate: number;
    okCount: number;
    proposedCount: number;
    offerPromptFallback: boolean;
    tracks: VerifiedTrackSnapshot[];
    skipped: Array<{ proposed: string; reason: string }>;
};

export type PlaylistMetadataSnapshot = {
    en: { name: string; description: string };
    zh: { name: string; description: string };
};

export type PendingBuildSnapshot = {
    brief: CompactBriefSnapshot;
    sequenceIntent: BilingualProse;
    playlistMetadata: PlaylistMetadataSnapshot;
    lines: ProposedLineSnapshot[];
    verified: VerifySnapshot;
    model: string | null;
    modelLabel: string | null;
    generatedAt: string;
};

export function savePendingBuild(snapshot: PendingBuildSnapshot) {
    try {
        sessionStorage.setItem(PENDING_BUILD_KEY, JSON.stringify(snapshot));
    } catch {}
}

export function readPendingBuild(): PendingBuildSnapshot | null {
    try {
        const raw = sessionStorage.getItem(PENDING_BUILD_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PendingBuildSnapshot & { sequenceIntent?: string | BilingualProse };
        if (!parsed?.lines?.length || !parsed.verified?.tracks) return null;
        if (parsed.sequenceIntent) {
            parsed.sequenceIntent =
                typeof parsed.sequenceIntent === 'string'
                    ? { en: parsed.sequenceIntent, zh: '' }
                    : parsed.sequenceIntent;
        } else {
            parsed.sequenceIntent = { en: '', zh: '' };
        }
        if (!parsed.playlistMetadata?.en?.name) {
            return null;
        }
        return parsed;
    } catch {}
    return null;
}

export function clearPendingBuild() {
    try {
        sessionStorage.removeItem(PENDING_BUILD_KEY);
    } catch {}
}
