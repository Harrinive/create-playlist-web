export const LAST_DELIVERY_KEY = 'create-playlist-last-delivery';
export const BUILD_RESULT_KEY = 'create-playlist-build-result';

export type LastDelivery = 'prompt' | 'build';

export type BuildResultSnapshot = {
    playlistName: string;
    playlistUrl: string;
    trackCount: number;
};

export function saveLastDelivery(kind: LastDelivery) {
    try {
        sessionStorage.setItem(LAST_DELIVERY_KEY, kind);
    } catch {}
}

export function readLastDelivery(): LastDelivery | null {
    try {
        const stored = sessionStorage.getItem(LAST_DELIVERY_KEY);
        if (stored === 'prompt' || stored === 'build') return stored;
    } catch {}
    return null;
}

export function saveBuildResult(result: BuildResultSnapshot) {
    try {
        sessionStorage.setItem(BUILD_RESULT_KEY, JSON.stringify(result));
        saveLastDelivery('build');
    } catch {}
}

export function readBuildResult(): BuildResultSnapshot | null {
    try {
        const raw = sessionStorage.getItem(BUILD_RESULT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as BuildResultSnapshot;
        if (parsed?.playlistUrl && typeof parsed.trackCount === 'number') return parsed;
    } catch {}
    return null;
}

export function lastResultHref(): string {
    const delivery = readLastDelivery();
    if (delivery === 'build') return '/build';
    return '/prompt';
}
