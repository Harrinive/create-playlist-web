export const Q1_COVERAGE_REGIONS = [
    {
        id: 'intimate-still',
        territory: 'solo, enclosed, low social heat — after guests left, empty museum, 2 a.m. desk',
        genreReach: 'ambient, folk, neo-classical, intimate singer-songwriter'
    },
    {
        id: 'bittersweet-mid',
        territory: 'winding down, mixed feeling — kitchen cleanup, last train, porch after rain',
        genreReach: 'indie, alt, mellow pop, sad-not-heavy R&B'
    },
    {
        id: 'focus-flow',
        territory: 'task or transit attention — coding session, long drive, morning routine',
        genreReach: 'focus electronic, lo-fi, light jazz, instrumental'
    },
    {
        id: 'social-mid',
        territory: 'people nearby, not peak chaos — dinner still going, gallery opening, road-trip car',
        genreReach: 'indie pop, soul/R&B mood, mellow hip-hop, lounge'
    },
    {
        id: 'kinetic-high',
        territory: 'body energy IN the loud scene — kitchen party peak, club door, gym floor, festival field',
        genreReach: 'house/techno energy, upbeat pop, gym-pop, rock/alt drive'
    },
    {
        id: 'restless-charged',
        territory: 'solo but wired — can\'t sleep, angry walk, pre-show hallway, night run',
        genreReach: 'alt-rock, charged R&B, post-punk energy, restless electronic'
    },
    {
        id: 'rhythm-social',
        territory: 'block party on sidewalk · kitchen everyone moving · parade drum two streets away',
        genreReach: 'reggae, ska, afrobeat, latin social dance mood, funk'
    },
    {
        id: 'edge-charged',
        territory: 'basement door bass in chest · parking lot after show · hallway before something breaks',
        genreReach: 'punk, metal-adjacent drive, post-punk, noise-rock'
    },
    {
        id: 'elsewhere-transit',
        territory: 'bus in unfamiliar city · night market alley · airport gate 5am',
        genreReach: 'world lounge, city-pop mood, travel ambient, global pop'
    }
] as const;

export const Q1_REGION_IDS = Q1_COVERAGE_REGIONS.map((r) => r.id);
