import type { CompactBrief, InterviewAnswers } from './types/interview.js';
import type { CooldownSets } from './store/playlist-memory.js';

const SCENE_PHRASES: Record<string, string> = {
    hallway: 'standing in a quiet hallway with keys just set down',
    'rain-car': 'sitting in the back seat while rain streaks the windows',
    kitchen: 'alone in a small kitchen late at night',
    'city-window': 'by an open window with city hum drifting in',
    highway: 'on a road still rolling under you'
};

const EMOTION_PHRASES: Record<string, string> = {
    wistful: 'wistful with a little unfinished feeling',
    calm: 'calm but not empty',
    hopeful: 'quietly hopeful underneath',
    restless: 'restless and needing to move',
    warm: 'warm and unhurried'
};

const PACE_PHRASES: Record<string, string> = {
    'very-slow': 'very slow and soft',
    slow: 'slow and steady',
    medium: 'medium, like a walking pace',
    upbeat: 'upbeat but not frantic',
    high: 'high energy with a forward push'
};

const FLOW_PHRASES: Record<string, string> = {
    'very-slow': 'fade to still — gentle opener, soft exhale at the end',
    slow: 'slow ignition — quiet start, gradual warmth',
    medium: 'gentle wave — swell, dip, soft lift',
    upbeat: 'flat scene, rotating faces — same temperature, new timbre',
    high: 'slow ignition — charged build without a cliff'
};

const SONIC_PHRASES: Record<string, string> = {
    acoustic: 'close acoustic guitar or fingerpicked strings with room around them',
    piano: 'sparse piano with lots of air',
    synth: 'soft synth pads in a wide space',
    groove: 'warm bass and a tight groove',
    vocals: 'distant, intimate vocals — tired, not belted'
};

const AVOID_PHRASES: Record<string, string> = {
    edm: 'clubby or EDM with big drops',
    'gym-pop': 'aggressive gym-pop or motivational hype',
    distorted: 'loud distorted guitars',
    radio: 'overly slick radio polish'
};

function phrase(map: Record<string, string>, id: string, fallback: string): string {
    return map[id] ?? fallback.toLowerCase();
}

function buildCooldownText(cooldown: CooldownSets): string | undefined {
    if (cooldown.hardBlockTitles.length === 0 && cooldown.artistSoft.length === 0) {
        return undefined;
    }

    const lines = [
        'Do not propose tracks we used in recent skill-built playlists.',
        cooldown.hardBlockTitles.length > 0
            ? `Blocked tracks (~30 most recent): ${cooldown.hardBlockTitles.join(', ')}.`
            : null,
        cooldown.artistSoft.length > 0
            ? `Vary these artists (heavy reuse in last 5 builds): ${cooldown.artistSoft.join(', ')}.`
            : null
    ].filter(Boolean);

    return lines.join('\n');
}

export function buildCompactBrief(
    answers: InterviewAnswers,
    cooldown?: CooldownSets
): CompactBrief {
    const anchor = phrase(SCENE_PHRASES, answers.m1.id, answers.m1.label);
    const emotion = phrase(EMOTION_PHRASES, answers.m2.id, answers.m2.label);
    const pace = phrase(PACE_PHRASES, answers.m3.id, answers.m3.label);
    const sonic = phrase(SONIC_PHRASES, answers.m5.id, answers.m5.label);
    const flow = phrase(FLOW_PHRASES, answers.m3.id, answers.m3.label);

    const reject = answers.m4
        .filter((item) => item.id !== 'none')
        .map((item) => phrase(AVOID_PHRASES, item.id, item.label));

    return {
        anchor,
        emotion,
        pace,
        sonic,
        flow,
        reject,
        seeds: 'none',
        cooldownText: cooldown ? buildCooldownText(cooldown) : undefined
    };
}

export function formatBriefBlock(brief: CompactBrief): string {
    const lines = [
        `ANCHOR: ${brief.anchor}`,
        `EMOTION: ${brief.emotion}`,
        `PACE: ${brief.pace}`,
        `SONIC: ${brief.sonic}`,
        `FLOW: ${brief.flow}`,
        brief.reject.length > 0 ? `REJECT: ${brief.reject.join('; ')}` : 'REJECT: none',
        `SEEDS: ${brief.seeds}`
    ];

    if (brief.cooldownText) {
        lines.push(`COOLDOWN:\n${brief.cooldownText}`);
    }

    return lines.join('\n');
}

export function buildPlaylistName(brief: CompactBrief): string {
    const scene = brief.anchor.split(' ').slice(0, 4).join(' ');
    const sonic = brief.sonic.split(' ').slice(0, 3).join(' ');
    return `${capitalize(scene)} — ${sonic}`;
}

export function buildPlaylistDescription(brief: CompactBrief): string {
    const reject =
        brief.reject.length > 0 ? ` Avoids ${brief.reject.slice(0, 2).join(' and ')}.` : '';
    const text = `A playlist for ${brief.anchor}. Feels ${brief.emotion}, ${brief.pace}, built from ${brief.sonic}.${reject}`;
    return text.slice(0, 300);
}

function capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}
