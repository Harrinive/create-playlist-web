import type { CooldownSets } from '../store/playlist-memory.js';
import type { PublishTrack, SkippedLine, VerifiedLine } from '../types/interview.js';

const TARGET_TRACKS = 20;
const MAX_TRACKS = 22;
const MAX_PER_ARTIST = 3;

function normalizeArtist(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s*\(feat\..*\)/i, '')
        .replace(/\s*feat\..*/i, '')
        .trim();
}

function energyFromTags(tags: string): string | null {
    const match = tags.match(/energy:\s*([a-z-]+)/i) ?? tags.match(/\b(low-med|med-high|low|med|high)\b/i);
    return match?.[1]?.toLowerCase() ?? null;
}

export type TrimResult = {
    tracks: PublishTrack[];
    skipped: SkippedLine[];
};

export function trimVerifiedLines(verified: VerifiedLine[], cooldown: CooldownSets): TrimResult {
    const skipped: SkippedLine[] = [];
    const survivors: VerifiedLine[] = [];

    for (const line of verified) {
        if (line.status === 'cooldown') {
            skipped.push({ proposed: line.proposed, reason: 'cooldown (recent build)' });
            continue;
        }
        if (line.status === 'duplicate') {
            skipped.push({ proposed: line.proposed, reason: 'duplicate' });
            continue;
        }
        if (line.status === 'not_found' || line.status === 'wrong_match') {
            skipped.push({
                proposed: line.proposed,
                reason: line.status === 'not_found' ? 'not_found' : 'wrong_match'
            });
            continue;
        }
        if (line.status === 'ok' && line.spotifyId && line.uri) {
            survivors.push(line);
        }
    }

    const artistCounts = new Map<string, number>();
    const selected: VerifiedLine[] = [];

    for (const line of survivors) {
        const artist = normalizeArtist(line.verifiedArtist ?? line.artist);
        const count = artistCounts.get(artist) ?? 0;
        if (count >= MAX_PER_ARTIST) {
            skipped.push({ proposed: line.proposed, reason: 'dropped (per-artist cap)' });
            continue;
        }

        if (selected.length >= MAX_TRACKS) {
            const isSoftArtist = cooldown.artistSoft.includes(artist);
            skipped.push({
                proposed: line.proposed,
                reason: isSoftArtist
                    ? 'dropped (artist cooldown)'
                    : 'dropped (length trim)'
            });
            continue;
        }

        if (selected.length >= TARGET_TRACKS) {
            const last = selected[selected.length - 1];
            const sameEnergy =
                energyFromTags(line.tags) &&
                energyFromTags(line.tags) === energyFromTags(last?.tags ?? '');
            const sameCue = line.tags === last?.tags;
            if (sameEnergy && sameCue) {
                skipped.push({ proposed: line.proposed, reason: 'dropped (redundant energy + cue)' });
                continue;
            }
        }

        artistCounts.set(artist, count + 1);
        selected.push(line);
    }

    const tracks: PublishTrack[] = selected.map((line) => ({
        lineNumber: line.lineNumber,
        id: line.spotifyId!,
        artist: line.verifiedArtist ?? line.artist,
        title: line.verifiedTitle ?? line.title,
        uri: line.uri!
    }));

    return { tracks, skipped };
}

export function verifySuccessRate(verified: VerifiedLine[]): number {
    if (verified.length === 0) return 0;
    const ok = verified.filter((line) => line.status === 'ok').length;
    return ok / verified.length;
}
