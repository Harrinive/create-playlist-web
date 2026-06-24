export type MemoryTrack = {
    id: string;
    artist: string;
    title: string;
};

export type PlaylistMemoryEntry = {
    createdAt: string;
    spotifyPlaylistId: string;
    name: string;
    anchor: string;
    tracks: MemoryTrack[];
};

export type CooldownSets = {
    hardBlockIds: Set<string>;
    hardBlockTitles: string[];
    artistSoft: string[];
    artistCounts: Map<string, number>;
};

const HARD_BLOCK_PLAYLIST_COUNT = 3;
const ARTIST_SOFT_PLAYLIST_COUNT = 5;
const ARTIST_SOFT_THRESHOLD = 4;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 8;

function normalizeArtist(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s*\(feat\..*\)/i, '')
        .replace(/\s*feat\..*/i, '')
        .trim();
}

export function deriveCooldownSets(entries: PlaylistMemoryEntry[]): CooldownSets {
    const recentForHard = entries.slice(-HARD_BLOCK_PLAYLIST_COUNT);
    const recentForArtist = entries.slice(-ARTIST_SOFT_PLAYLIST_COUNT);

    const hardBlockIds = new Set<string>();
    const hardBlockTitles: string[] = [];
    for (const playlist of recentForHard) {
        for (const track of playlist.tracks) {
            hardBlockIds.add(track.id);
            hardBlockTitles.push(`${track.artist} — ${track.title}`);
        }
    }

    const artistCounts = new Map<string, number>();
    for (const playlist of recentForArtist) {
        for (const track of playlist.tracks) {
            const artist = normalizeArtist(track.artist);
            artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
        }
    }

    const artistSoft = [...artistCounts.entries()]
        .filter(([, count]) => count >= ARTIST_SOFT_THRESHOLD)
        .map(([artist]) => artist);

    return {
        hardBlockIds,
        hardBlockTitles: hardBlockTitles.slice(-30),
        artistSoft,
        artistCounts
    };
}

export function prunePlaylistMemory(entries: PlaylistMemoryEntry[]): PlaylistMemoryEntry[] {
    const cutoff = Date.now() - MAX_AGE_MS;
    const fresh = entries.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff);
    return fresh.slice(-MAX_ENTRIES);
}
