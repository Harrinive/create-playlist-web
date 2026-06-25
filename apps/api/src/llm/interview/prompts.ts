import type { InterviewAnswers } from '../../types/interview.js';
import { interviewStepMeta } from '../../types/interview-step.js';

// ---------------------------------------------------------------------------
// Q1 coverage data (genre reach via scene partition — not a genre menu)
// ---------------------------------------------------------------------------

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
    }
] as const;

export const Q1_REGION_IDS = Q1_COVERAGE_REGIONS.map((r) => r.id);

// ---------------------------------------------------------------------------
// Reusable prompt sections — edit here; system prompts compose below
// ---------------------------------------------------------------------------

const SECTION = {
    forbiddenMenus:
        'Never copy example menus from training (rain car + morning kitchen + rooftop + crowd edge + gym pack).',

    sceneAdvance:
        "Advance the scene on a new axis each turn; do not echo the user's last pick in the stem.",

    optionShape:
        'One immersive stem + distinct image-led options (~3–7 English words each; Chinese: lyrical film-still, same precision).',

    optionIds: 'Option ids: lowercase kebab-case English slugs (e.g. rain-car, warm-close).',

    bilingualFields:
        'Always output BOTH English and Chinese for stem, hint (if any), and every option label.',

    noSomethingElse: 'Do not include a manual "something else" option.',

    m5FeltFirst:
        'M5 (sound): felt-first texture (close/far, weight, density) — not instrument gear menus.',

    m4Avoid:
        'M4 (avoid): multi-select negatives; MUST include id "none" with open/surprise-me meaning.',

    q1Draft:
        'Q1: use 6–8 options when plan lists ≥5 q1RegionsToCover; each option maps to a distinct region — include kinetic-high and social-mid scenes, not only quiet/intimate.',

    q1Fast:
        'Q1 (scene): 6–8 options partitioning hypothesis space — neutral stem preferred. Cover intimate-still, bittersweet-mid, focus-flow, social-mid, kinetic-high, restless-charged unless prior answers ruled regions out. Include at least one high body-energy / crowd scene; passive ambience ≠ kinetic-high.',

    q2to4Count: 'Q2–Q4: 4–6 options.',

    fastFilter:
        'Filter options silently from prior answers (time-of-day, mood, energy must stay consistent).',

    draftFollowPlan:
        'Follow the provided turn plan (axis, scene beat, filter drops, q1RegionsToCover) exactly.',

    draftFilterDrops: 'Do NOT include options matching filterDrops themes.',

    bilingualCopy: `Bilingual copy (stemEn/Zh, labelEn/Zh, hintEn/Zh) — poetic AND precise:
Poetic bar: film-still images, sensory texture, spoken rhythm — in BOTH languages. Precision first (clear axis, decodable groove on Q4); then lift the language. Poetic ≠ cryptic.

English (~3–7 words, vary length):
- Strong: image + motion or object — "Ice clink, laughter in waves" · "Terrace wind, sun gone" · "Bass leaks through the door"
- Weak: flat modifier stacks — "warm and very close light" · "very close warm glow"
- Weak: therapy/survey tone — "warm, easy, unforced connection" · "What vibe should this capture?"

Chinese — write with native lyric rhythm, not translated prose:
- Strong: one image per beat, verb or noun cluster — "暖光栖在耳畔" · "静廊深处，钥匙一落" · "杯影轻晃，笑语成潮" · "低音穿门而入，脚步未停"
- Weak: 机翻 — "安静的走廊，刚刚放下钥匙" (mirrors English word order)
- Weak: adjective chains / 非常…的 — "温暖且非常接近的光芒" · "非常接近的暖光" (accurate but lifeless; no image)
- Weak: abstract therapy — "温暖的连接感" · dictionary glosses in parentheses
- Technique: concrete nouns (光, 雨, 风, 夜, 呼吸, 余温, 低鸣); prefer verb-led micro-scenes over "很/非常 + adj + 名词"

Paired precision check: after drafting, ask — would these two options still split hypotheses clearly in BOTH languages? If yes but copy feels flat → rewrite for texture, not length.`,

    planAlgorithm: `Per-turn algorithm (run in order):
1. Gap check — which M1–M5 dimensions are still empty this turn? (fixed order: m1 scene, m2 emotion, m3 energy, m5 sound, m4 avoid)
2. Scene beat — picture 10 seconds of film: light, temperature, one object, one sound, social distance. One NEW detail; never caption the user's last pick.
3. Hypotheses — list 6–10 broad cluster regions still plausible. Q1: nearly full space so pop, EDM, gym, folk, ambient, rock, R&B all stay reachable through SOME option (via scene × social heat × body energy — NOT a genre menu). Later turns: shrunk by prior answers.
4. Pick axis — single axis that splits the most remaining clusters this turn. Match the funnel slot dimension.
5. Draft guidance — stemGuidance + optionGuidance for the draft step. Q1: each option must map to a distinct hypothesis region (partition, not decorate). Q2–Q4: advance scene on new axis.`,

    planQ1Rules: `Q1 rules:
- q1RegionsToCover MUST list every major region still plausible — default all six: intimate-still, bittersweet-mid, focus-flow, social-mid, kinetic-high, restless-charged — minus any explicitly ruled out by opening/prior answers.
- Failure mode to prevent: five low-intimate scenes (kitchen, ferry, corridor ×5) with zero kinetic-high or social-mid → pop/EDM/gym dead before Q2.`,

    planOtherRules: `Other rules:
- At least one turn per interview should use a lateral hook (color, film mood, texture, memory, object) — set lateralHook true when this turn should.
- filterDrops: option themes to EXCLUDE (from contextual filtering).`,

    verifyChecks: `Checks (all that apply):
1. Consistency — stem frame matches every option (night stem → no morning coffee; rain → no sun-baked highway unless stem is neutral)
2. Advance the scene — stem does NOT quote or caption the user's last pick; at most 1–2 tiny ambient words reused invisibly
3. Partition — each option would yield a meaningfully different brief; no duplicate cluster regions
4. Q1 coverage — if q1RegionsToCover was provided in the plan, each major region should have ≥1 option unless explicitly ruled out. Fail if all options land in intimate-still/bittersweet with zero kinetic-high or social-mid (pop/EDM/gym unreachable).
5. Q1 genre reach — options span scene × social heat × body energy; at least one option puts listener IN a loud/kinetic/crowd scene (not passive distant bass)
6. Filter drops — no option should match filterDrops themes
7. Creativity — wording does not look copied from generic example menus (rain car + morning kitchen + rooftop + gym pack)
8. Bilingual poetry + precision — both languages image-led and lyrical, not flat modifier stacks or survey tone. Fail English if options read like "warm and very close light". Fail Chinese if 机翻, 非常…的 chains, or accurate-but-lifeless prose (e.g. 温暖且非常接近的光芒).
9. M4 — includes id "none" with open meaning when dimension is avoid`,

    draftOutputSchema: `{
  "stemEn": "...",
  "stemZh": "...",
  "hintEn": "optional short hint",
  "hintZh": "optional",
  "options": [{ "id": "slug", "labelEn": "...", "labelZh": "..." }]
}`,

    planOutputSchema: `{
  "gaps": ["m1"],
  "hypotheses": ["intimate-still", "social-mid", "kinetic-high", "focus-flow", "bittersweet-mid", "restless-charged"],
  "axis": "scene x social heat x body energy",
  "sceneBeat": "private 10s film beat — one new sensory detail",
  "lateralHook": false,
  "filterDrops": ["gym-pop motivation", "club drop energy"],
  "q1RegionsToCover": ["intimate-still", "bittersweet-mid", "focus-flow", "social-mid", "kinetic-high", "restless-charged"],
  "stemGuidance": "neutral stem — camera lands; do not lock night/quiet unless all options share frame",
  "optionGuidance": "6–8 immersive scenes; each rules in a different region; include at least one high body-energy / crowd scene"
}`,

    verifyOutputSchema: `{ "passed": true, "failures": [] }
or
{ "passed": false, "failures": ["specific failure 1", "specific failure 2"] }`
} as const;

export const BILINGUAL_COPY_RULES = SECTION.bilingualCopy;

/** @deprecated Use BILINGUAL_COPY_RULES */
export const CHINESE_LOCALIZATION_RULES = BILINGUAL_COPY_RULES;

// ---------------------------------------------------------------------------
// Dimension guidance (per-step; Q1 coverage block injected separately)
// ---------------------------------------------------------------------------

const DIMENSION_LINES: Record<string, string> = {
    m1: 'M1 Scene — where does the music start? Prefer a NEUTRAL stem ("You hit play — where does the camera land?") so options carry the energy span.',
    m2: 'M2 Emotion — what should the music mainly feel like? Advance scene on a new axis; never caption the last pick. Options = sensory film-stills in both languages — lyrical, not therapy adjectives or flat modifier stacks.',
    m3: 'M3 Energy / tempo — how fast should the pace be? Filter from prior scene + emotion. Plain motion language but still image-led — decodable groove, not abstract tempo words.',
    m5: 'M5 Sonic texture (felt-first) — space, weight, density, organic vs machine; not instrument shopping.',
    m4: 'M4 Hard avoids — multi-select negatives. Include "none" for open/surprise me. Skip obvious false positives.'
};

export function dimensionGuidance(stepIndex: number): string {
    const meta = interviewStepMeta(stepIndex);
    if (!meta) return 'Unknown step';
    const line = DIMENSION_LINES[meta.id] ?? '';
    return `${meta.id.toUpperCase()} (${meta.dimension.en}): ${line} Target ${meta.optionMin}–${meta.optionMax} options.`;
}

export function turnLabel(stepIndex: number): string {
    return `Question ${stepIndex + 1} of 5 — ${dimensionGuidance(stepIndex)}`;
}

export function isQ1Step(stepIndex: number): boolean {
    return interviewStepMeta(stepIndex)?.id === 'm1';
}

// ---------------------------------------------------------------------------
// Q1 user-context block (inject once per Q1 user prompt — not in dimensionGuidance)
// ---------------------------------------------------------------------------

export function q1CoverageBlock(): string {
    const rows = Q1_COVERAGE_REGIONS.map(
        (r) => `- ${r.id}: ${r.territory} → keeps ${r.genreReach} reachable`
    );
    return `## Q1 coverage regions
Each needs ≥1 option unless opening or prior answers ruled it out:
${rows.join('\n')}

Partition rule: options must COLLAPSE uncertainty differently — not five variants of the same intimate-low scene.
Passive ambience (distant bass through a wall) ≠ kinetic-high — put the listener IN the loud/kinetic scene.`;
}

export function q1PlanContextBlock(): string {
    return `${q1CoverageBlock()}

Default q1RegionsToCover ids: ${Q1_REGION_IDS.join(', ')}`;
}

export function q1DraftContextBlock(regionsToCover: string[]): string {
    return `## Q1 regions to cover
Each needs ≥1 option: ${regionsToCover.join(', ')}

${q1CoverageBlock()}`;
}

export function q1VerifyContextBlock(): string {
    return `## Q1 verification focus
Run coverage check against q1RegionsToCover and genre reachability.

${q1CoverageBlock()}`;
}

// ---------------------------------------------------------------------------
// Shared user-prompt fragments
// ---------------------------------------------------------------------------

export function formatPriorAnswers(prior: Partial<InterviewAnswers>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(prior)) {
        if (!value) continue;
        if (Array.isArray(value)) {
            const labels = value.map((o) => o.label).join('; ');
            lines.push(`${key}: ${labels}`);
        } else {
            lines.push(`${key}: ${value.label}`);
        }
    }
    return lines.length > 0 ? lines.join('\n') : '(none yet — this is the opening question)';
}

export function rejectedStemsBlock(rejectedStems: string[]): string {
    if (rejectedStems.length === 0) return '';
    return `## Rejected stems
Invent something clearly different:
${rejectedStems.map((s) => `- ${s}`).join('\n')}`;
}

function priorContextBlock(prior: Partial<InterviewAnswers>, rejectedStems: string[]): string {
    const parts = [`## Prior answers\n${formatPriorAnswers(prior)}`];
    const rejected = rejectedStemsBlock(rejectedStems);
    if (rejected) parts.push(rejected);
    return parts.join('\n\n');
}

function refreshLine(refresh: boolean, tone: 'plan' | 'draft' | 'fast'): string {
    if (!refresh) return '';
    const messages = {
        plan: 'REFRESH: user rejected the previous stem on this dimension — plan a clearly different scene on the same axis.',
        draft: 'REFRESH — invent a new stem on the same dimension.',
        fast: 'REFRESH — user rejected the previous stem; invent a new scene on the same dimension.'
    };
    return messages[tone];
}

function joinSections(...sections: string[]): string {
    return sections.filter((s) => s.trim().length > 0).join('\n\n');
}

// ---------------------------------------------------------------------------
// System prompts (composed from SECTION)
// ---------------------------------------------------------------------------

export function planSystemPrompt(): string {
    return joinSections(
        'You are the private planning phase of a music mood interviewer (Step 1 skill algorithm).',
        'Run the per-turn checklist BEFORE any question is shown. Output JSON only — this plan is never shown to the user.',
        '## Algorithm',
        SECTION.planAlgorithm,
        '## Q1',
        SECTION.planQ1Rules,
        '## Rules',
        SECTION.planOtherRules,
        SECTION.forbiddenMenus,
        '## Output',
        'Respond with JSON only:',
        SECTION.planOutputSchema
    );
}

export function draftSystemPrompt(): string {
    return joinSections(
        'You are a music mood interviewer for a playlist app. Invent fresh scene-first questions.',
        SECTION.forbiddenMenus,
        '## Core rules',
        [
            SECTION.optionShape,
            SECTION.sceneAdvance,
            SECTION.draftFollowPlan,
            SECTION.optionIds,
            SECTION.bilingualFields,
            SECTION.noSomethingElse,
            SECTION.draftFilterDrops
        ]
            .map((r) => `- ${r}`)
            .join('\n'),
        '## Bilingual copy',
        SECTION.bilingualCopy,
        '## Dimension notes',
        [SECTION.q1Draft, SECTION.m5FeltFirst, SECTION.m4Avoid].map((r) => `- ${r}`).join('\n'),
        '## Output',
        'Respond with JSON only (no markdown fences):',
        SECTION.draftOutputSchema
    );
}

export function fastSystemPrompt(): string {
    return joinSections(
        'You are a music mood interviewer for a playlist app. Invent fresh scene-first questions.',
        SECTION.forbiddenMenus,
        '## Core rules',
        [
            SECTION.optionShape,
            SECTION.sceneAdvance,
            SECTION.fastFilter,
            SECTION.optionIds,
            SECTION.bilingualFields,
            SECTION.noSomethingElse
        ]
            .map((r) => `- ${r}`)
            .join('\n'),
        '## Bilingual copy',
        SECTION.bilingualCopy,
        '## Dimension notes',
        [SECTION.q1Fast, SECTION.q2to4Count, SECTION.m5FeltFirst, SECTION.m4Avoid]
            .map((r) => `- ${r}`)
            .join('\n'),
        '## Output',
        'Respond with JSON only (no markdown fences):',
        SECTION.draftOutputSchema
    );
}

export function verifySystemPrompt(): string {
    return joinSections(
        'You verify a drafted music interview question against the skill quality bar.',
        'Output JSON only. Be strict but practical.',
        '## Checks',
        SECTION.verifyChecks,
        '## Reference — bilingual copy bar',
        SECTION.bilingualCopy,
        '## Output',
        SECTION.verifyOutputSchema
    );
}

// ---------------------------------------------------------------------------
// User prompts (consistent structure across pipeline stages)
// ---------------------------------------------------------------------------

export function buildPlanUserPrompt(
    stepIndex: number,
    priorAnswers: Partial<InterviewAnswers>,
    rejectedStems: string[],
    refresh: boolean,
    filterHints: string[]
): string {
    const filterBlock =
        filterHints.length > 0
            ? `## Filter hints\nApply in filterDrops / optionGuidance:\n${filterHints.map((h) => `- ${h}`).join('\n')}`
            : '';

    return joinSections(
        turnLabel(stepIndex),
        refreshLine(refresh, 'plan'),
        priorContextBlock(priorAnswers, rejectedStems),
        filterBlock,
        isQ1Step(stepIndex) ? q1PlanContextBlock() : '',
        'Return JSON only.'
    );
}

export function buildDraftUserPrompt(
    stepIndex: number,
    priorAnswers: Partial<InterviewAnswers>,
    rejectedStems: string[],
    refresh: boolean,
    planJson: string,
    optionCount: string,
    q1RegionsToCover?: string[]
): string {
    const q1Block =
        isQ1Step(stepIndex) && q1RegionsToCover?.length
            ? q1DraftContextBlock(q1RegionsToCover)
            : isQ1Step(stepIndex)
              ? q1CoverageBlock()
              : '';

    return joinSections(
        turnLabel(stepIndex),
        refreshLine(refresh, 'draft'),
        `## Turn plan (private — follow closely)\n${planJson}`,
        q1Block,
        priorContextBlock(priorAnswers, rejectedStems),
        `Provide ${optionCount} options. Return JSON only.`
    );
}

export function buildFastUserPrompt(
    stepIndex: number,
    priorAnswers: Partial<InterviewAnswers>,
    rejectedStems: string[],
    refresh: boolean
): string {
    return joinSections(
        turnLabel(stepIndex),
        refreshLine(refresh, 'fast'),
        priorContextBlock(priorAnswers, rejectedStems),
        isQ1Step(stepIndex) ? q1CoverageBlock() : '',
        'Return JSON only.'
    );
}

export function buildVerifyUserPrompt(
    stepIndex: number,
    priorAnswers: Partial<InterviewAnswers>,
    planJson: string,
    draftJson: string
): string {
    return joinSections(
        turnLabel(stepIndex),
        isQ1Step(stepIndex)
            ? q1VerifyContextBlock()
            : '## Verification focus\nQ2–Q5 — run caption test and partition check.',
        `## Turn plan\n${planJson}`,
        `## Draft to verify\n${draftJson}`,
        `## Prior answers\n${formatPriorAnswers(priorAnswers)}`,
        'Return JSON only.'
    );
}

export function buildReviseUserPrompt(
    priorAnswers: Partial<InterviewAnswers>,
    rejectedStems: string[],
    planJson: string,
    draftJson: string,
    failures: string[]
): string {
    return joinSections(
        'Revise this interview question. Verification failed:',
        failures.map((f) => `- ${f}`).join('\n'),
        `## Turn plan\n${planJson}`,
        `## Current draft\n${draftJson}`,
        priorContextBlock(priorAnswers, rejectedStems),
        'Fix all failures. Keep the same dimension. Return revised JSON only.'
    );
}
