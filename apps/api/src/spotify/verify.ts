import type { CooldownSets } from '../store/playlist-memory.js';
import type { ProposedLine, VerifiedLine, VerifyStatus } from '../types/interview.js';
import { searchTracks, type SpotifySearchTrack } from './client.js';

const KARAOKE_PATTERN =
    /karaoke|sped up|sped-up|8d audio|tribute to|made famous|in the style of|cover version/i;
const MAX_DURATION_MS = 15 * 60 * 1000;
const BATCH_SIZE = 10;

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/feat\..*/i, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function titleMatches(proposed: string, candidate: string): boolean {
    const a = normalizeText(proposed);
    const b = normalizeText(candidate);
    if (!a || !b) return false;
    return b.includes(a) || a.includes(b);
}

function artistMatches(proposed: string, candidateArtists: string[]): boolean {
    const normalized = normalizeText(proposed);
    return candidateArtists.some((artist) => {
        const candidate = normalizeText(artist);
        return candidate.includes(normalized) || normalized.includes(candidate);
    });
}

function pickMatch(
    proposedArtist: string,
    proposedTitle: string,
    results: SpotifySearchTrack[]
): SpotifySearchTrack | null {
    for (const track of results) {
        if (track.duration_ms > MAX_DURATION_MS) continue;
        if (KARAOKE_PATTERN.test(track.name) || KARAOKE_PATTERN.test(track.album?.name ?? '')) {
            continue;
        }
        const artists = track.artists.map((artist) => artist.name);
        if (!artistMatches(proposedArtist, artists)) continue;
        if (!titleMatches(proposedTitle, track.name)) continue;
        return track;
    }
    return null;
}

async function searchWithRetry(
    accessToken: string,
    artist: string,
    title: string
): Promise<SpotifySearchTrack[]> {
    const forward = await searchTracks(accessToken, `${artist} ${title}`, 5);
    if (forward.length > 0) return forward;
    return searchTracks(accessToken, `${title} ${artist}`, 5);
}

async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await worker(items[index], index);
        }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
    return results;
}

export async function verifyProposedLines(
    accessToken: string,
    lines: ProposedLine[],
    cooldown: CooldownSets
): Promise<VerifiedLine[]> {
    const searched = await mapWithConcurrency(lines, BATCH_SIZE, async (line) => {
        const results = await searchWithRetry(accessToken, line.artist, line.title);
        const match = pickMatch(line.artist, line.title, results);
        return { line, match };
    });

    const usedIds = new Set<string>();
    const verified: VerifiedLine[] = [];

    for (const { line, match } of searched) {
        const proposed = `${line.artist} — ${line.title}`;
        let status: VerifyStatus = 'not_found';
        let spotifyId: string | null = null;
        let verifiedTitle: string | null = null;
        let verifiedArtist: string | null = null;
        let uri: string | null = null;

        if (match) {
            if (cooldown.hardBlockIds.has(match.id)) {
                status = 'cooldown';
            } else if (usedIds.has(match.id)) {
                status = 'duplicate';
            } else {
                status = 'ok';
                spotifyId = match.id;
                verifiedTitle = match.name;
                verifiedArtist = match.artists.map((artist) => artist.name).join(', ');
                uri = match.uri;
                usedIds.add(match.id);
            }
        }

        verified.push({
            lineNumber: line.lineNumber,
            proposed,
            artist: line.artist,
            title: line.title,
            tags: line.tags,
            spotifyId,
            verifiedTitle,
            verifiedArtist,
            uri,
            status
        });
    }

    return verified;
}
