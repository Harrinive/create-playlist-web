import { spotifyFetch } from './client.js';

export type CreatedPlaylist = {
    id: string;
    url: string;
    name: string;
};

export async function createPlaylist(
    accessToken: string,
    input: { name: string; description: string; public?: boolean }
): Promise<CreatedPlaylist> {
    const result = await spotifyFetch<{ id: string; external_urls?: { spotify?: string }; name: string }>(
        accessToken,
        'me/playlists',
        {
            method: 'POST',
            body: {
                name: input.name,
                description: input.description,
                public: input.public ?? false
            }
        }
    );

    return {
        id: result.id,
        url: result.external_urls?.spotify ?? `https://open.spotify.com/playlist/${result.id}`,
        name: result.name
    };
}

export async function addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    trackUris: string[]
): Promise<void> {
    const chunkSize = 100;
    for (let index = 0; index < trackUris.length; index += chunkSize) {
        const chunk = trackUris.slice(index, index + chunkSize);
        await spotifyFetch(accessToken, `playlists/${playlistId}/items`, {
            method: 'POST',
            body: { uris: chunk }
        });
    }
}
