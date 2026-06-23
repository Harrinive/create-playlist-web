import type { InterviewAnswers } from './types';

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

/**
 * Build Step 2.1 Spotify Prompted Playlist paragraph from interview answers.
 * @see ~/.cursor/skills/create-playlist/step-2-1-prompt.md
 */
export function buildPrompt(answers: InterviewAnswers): string {
    const scene = phrase(SCENE_PHRASES, answers.m1.id, answers.m1.label);
    const emotion = phrase(EMOTION_PHRASES, answers.m2.id, answers.m2.label);
    const pace = phrase(PACE_PHRASES, answers.m3.id, answers.m3.label);
    const sonic = phrase(SONIC_PHRASES, answers.m5.id, answers.m5.label);

    const avoids = answers.m4
        .filter((item) => item.id !== 'none')
        .map((item) => phrase(AVOID_PHRASES, item.id, item.label));

    let paragraph =
        `A playlist for ${scene}. ` +
        `I'm looking for music that feels ${emotion}. ` +
        `The pace should be ${pace}. ` +
        `Sonically, built from ${sonic}.`;

    if (avoids.length > 0) {
        paragraph += ` Please avoid anything ${avoids.join(', ')}.`;
    }

    return paragraph;
}

export function isValidAnswers(value: unknown): value is InterviewAnswers {
    if (!value || typeof value !== 'object') return false;
    const a = value as InterviewAnswers;
    return Boolean(a.m1?.id && a.m2?.id && a.m3?.id && a.m5?.id && Array.isArray(a.m4) && a.m4.length > 0);
}
