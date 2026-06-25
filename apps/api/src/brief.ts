import type { CompactBrief, InterviewAnswers } from './types/interview.js';
import type { CooldownSets } from './store/playlist-memory.js';

export type ContentLocale = 'en' | 'zh';

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

const SCENE_PHRASES_ZH: Record<string, string> = {
    hallway: '钥匙刚放下的安静玄关',
    'rain-car': '雨点打窗的后座',
    kitchen: '深夜独自的小厨房',
    'city-window': '开窗听见城市低鸣',
    highway: '脚下仍在滚动的路'
};

const EMOTION_PHRASES_ZH: Record<string, string> = {
    wistful: '略带怅然、未完结',
    calm: '平静但不空',
    hopeful: '底下藏着隐约的希望',
    restless: '不安分、想动起来',
    warm: '温暖、不赶时间'
};

const PACE_PHRASES_ZH: Record<string, string> = {
    'very-slow': '很慢、很轻',
    slow: '慢而稳',
    medium: '中等、像走路',
    upbeat: '轻快但不躁',
    high: '高能量、向前推'
};

const SONIC_PHRASES_ZH: Record<string, string> = {
    acoustic: '近距木吉他与拨弦',
    piano: '稀疏钢琴、留白多',
    synth: '柔软铺底、空间宽',
    groove: '暖低音与稳拍',
    vocals: '远处人声、亲密不喊'
};

const AVOID_PHRASES_ZH: Record<string, string> = {
    edm: 'EDM drop 与夜店感',
    'gym-pop': '激进健身流行',
    distorted: '过响的失真吉他',
    radio: '过于精修的电台感'
};

/** Short evocative fragments for playlist titles (zh). */
const NAME_SCENE_ZH: Record<string, string> = {
    hallway: '玄关静好',
    'rain-car': '雨夜后座',
    kitchen: '深夜厨房',
    'city-window': '窗前夜风',
    highway: '公路余温'
};

const NAME_SONIC_ZH: Record<string, string> = {
    acoustic: '木吉他与弦',
    piano: '留白钢琴',
    synth: '宽景铺底',
    groove: '暖低音',
    vocals: '远处人声'
};

function hasCjk(text: string): boolean {
    return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

/** Prefer Chinese main line; fall back to Chinese gloss when main is English-only. */
function chineseFromLabel(label: string): string {
    const trimmed = label.trim();
    if (!trimmed) return trimmed;

    const match = trimmed.match(/^(.*?)(?:\s*[（(]([^）)]+)[）)])\s*$/);
    if (match) {
        const main = match[1].trim();
        const gloss = match[2].trim();
        if (hasCjk(main)) return main;
        if (hasCjk(gloss)) return gloss;
    }

    return trimmed;
}

export function metadataContainsLatinWords(text: string): boolean {
    return /[a-zA-Z]{2,}/.test(text);
}

function sanitizeLabel(label: string, locale: ContentLocale): string {
    const trimmed = label.trim();
    if (!trimmed) return trimmed;

    const match = trimmed.match(/^(.*?)(?:\s*[（(]([^）)]+)[）)])\s*$/);
    if (match) {
        const gloss = match[2].trim();
        if (gloss) return locale === 'en' ? gloss.toLowerCase() : gloss;
    }

    return locale === 'en' ? trimmed.toLowerCase() : trimmed;
}

function phrase(
    locale: ContentLocale,
    enMap: Record<string, string>,
    zhMap: Record<string, string>,
    id: string,
    fallbackLabel: string
): string {
    const map = locale === 'zh' ? zhMap : enMap;
    const fromMap = map[id];
    if (fromMap) return fromMap;
    const cleaned = sanitizeLabel(fallbackLabel, locale);
    return locale === 'en' ? cleaned.toLowerCase() : cleaned;
}

function phraseEn(map: Record<string, string>, id: string, fallback: string): string {
    return phrase('en', map, {}, id, fallback);
}

function phraseZh(zhMap: Record<string, string>, id: string, fallbackLabel: string): string {
    const fromMap = zhMap[id];
    if (fromMap) return fromMap;
    return chineseFromLabel(fallbackLabel);
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
    cooldown?: CooldownSets,
    inferredSonic?: string,
    extras?: {
        interviewStory?: { en: string };
        reachableGenresNote?: string;
    }
): CompactBrief {
    const story = extras?.interviewStory?.en?.trim();
    const anchor = story
        ? story.split(/[.!?]/)[0]?.trim() || phraseEn(SCENE_PHRASES, answers.m1.id, answers.m1.label)
        : phraseEn(SCENE_PHRASES, answers.m1.id, answers.m1.label);
    const emotion = story
        ? story.split(/[.!?]/)[1]?.trim() || phraseEn(EMOTION_PHRASES, answers.m2.id, answers.m2.label)
        : phraseEn(EMOTION_PHRASES, answers.m2.id, answers.m2.label);
    const pace = story
        ? story.split(/[.!?]/)[2]?.trim() || phraseEn(PACE_PHRASES, answers.m3.id, answers.m3.label)
        : phraseEn(PACE_PHRASES, answers.m3.id, answers.m3.label);
    const sonic = answers.m5
        ? phraseEn(SONIC_PHRASES, answers.m5.id, answers.m5.label)
        : inferredSonic ?? 'warm intimate air with room for varied timbres';
    const flow = phraseEn(FLOW_PHRASES, answers.m3.id, answers.m3.label);

    const reject = answers.m4
        .filter((item) => item.id !== 'none')
        .map((item) => phraseEn(AVOID_PHRASES, item.id, item.label));

    return {
        anchor,
        emotion,
        pace,
        sonic,
        flow,
        reject,
        seeds: 'none',
        story,
        reachableGenresNote: extras?.reachableGenresNote?.trim(),
        cooldownText: cooldown ? buildCooldownText(cooldown) : undefined
    };
}

export function formatBriefBlock(brief: CompactBrief): string {
    const lines = [
        brief.story ? `STORY: ${brief.story}` : null,
        brief.reachableGenresNote
            ? `REACHABLE (from interview): ${brief.reachableGenresNote}`
            : null,
        `ANCHOR: ${brief.anchor}`,
        `EMOTION: ${brief.emotion}`,
        `PACE: ${brief.pace}`,
        `SONIC: ${brief.sonic}`,
        `FLOW: ${brief.flow}`,
        brief.reject.length > 0 ? `REJECT: ${brief.reject.join('; ')}` : 'REJECT: none',
        `SEEDS: ${brief.seeds}`
    ].filter(Boolean) as string[];

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

/** Spotify playlist title + description — locale-aware; LLM curate brief stays English. */
export function buildPlaylistMetadata(
    answers: InterviewAnswers,
    locale: ContentLocale = 'en'
): { name: string; description: string } {
    if (locale === 'en') {
        const brief = buildCompactBrief(answers);
        return {
            name: buildPlaylistName(brief),
            description: buildPlaylistDescription(brief)
        };
    }

    const scene =
        NAME_SCENE_ZH[answers.m1.id] ?? chineseFromLabel(answers.m1.label).slice(0, 12);
    const sonicShort =
        NAME_SONIC_ZH[answers.m5?.id ?? ''] ??
        (answers.m5 ? chineseFromLabel(answers.m5.label).slice(0, 12) : '多样质感');
    const name = `${scene} — ${sonicShort}`;

    const anchor = phraseZh(SCENE_PHRASES_ZH, answers.m1.id, answers.m1.label);
    const emotion = phraseZh(EMOTION_PHRASES_ZH, answers.m2.id, answers.m2.label);
    const pace = phraseZh(PACE_PHRASES_ZH, answers.m3.id, answers.m3.label);
    const sonic = answers.m5
        ? phraseZh(SONIC_PHRASES_ZH, answers.m5.id, answers.m5.label)
        : '温暖留白、质感可多样';
    const reject = answers.m4
        .filter((item) => item.id !== 'none')
        .map((item) => phraseZh(AVOID_PHRASES_ZH, item.id, item.label));

    const rejectClause = reject.length > 0 ? `避开${reject.slice(0, 2).join('、')}。` : '';
    const description = `为${anchor}而选。感受${emotion}，节奏${pace}，以${sonic}为质感。${rejectClause}`.slice(
        0,
        300
    );

    return { name, description };
}

function capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}
