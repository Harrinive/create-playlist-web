import type { CompactBrief, ProposedLine } from '../types/interview.js';
import type { Env } from '../config.js';
import { completeChat } from '../llm-router/index.js';
import { formatBriefBlock } from '../brief.js';

const TASK_PROMPT_STARTER = `You are a music supervisor scoring a short scene. The brief below is the director's note—treat it as law.

Translate scene, feeling, and sonic texture into 26 real songs listeners can find on Spotify—album cuts, not karaoke, cover spam, or upload junk.

Honor REJECT literally. Honor COOLDOWN when present (do not propose listed tracks or lean on listed artists). Honor SEEDS when not "none". Vary artists (≤3 per artist unless SEEDS focus one artist).

You have no tools and will not search—use catalog knowledge only. Propose tracks in INTENDED LISTEN ORDER—not a random bag to sort later. No intro essay, no Spotify IDs—output only the three blocks specified below.`;

const TASK_RULES = `Rules:
- Exactly 26 numbered lines in LISTEN ORDER: "Artist — Title" + tags (below)
- Real tracks likely on Spotify; no fabricated deep cuts
- Honor REJECT, COOLDOWN (if in brief), and SEEDS; max 3 tracks per artist unless seed-focused
- Match EMOTION, PACE, SONIC, FLOW using musical knowledge (not title SEO)
- Prefer album cuts over karaoke/cover spam
- Output ONLY these three blocks (in this order):

## Sequence intent
3–5 sentences: listen arc for all 26. Declare 0–2 EXTRA ordering dimensions beyond energy when they matter for this brief (e.g. density, brightness, warmth, vocal presence)—tag those only on lines where transitions need them.

## Ordering axes
One line: which tags appear on each line (e.g. "energy · cue · role (sparse) · density (dip & lift only)").

## Proposed tracklist
Each line:
N. Artist — Title · [energy: low|low-med|med|med-high|high] · [cue: 2–4 brief-aligned felt words] · [optional role: opener|turn|peak|breather|closer—sparse; only when FLOW has shape] · [optional extra axis value—only if declared]

Energy + cue REQUIRED every line. Cues = felt qualities from the brief (live pocket, warm low, close breath)—not genre labels. Roles on opener, turn, peak, closer—not every line.`;

export type CurateResult = {
    sequenceIntent: string;
    orderingAxes: string;
    lines: ProposedLine[];
    raw: string;
};

function parseProposedLines(section: string): ProposedLine[] {
    const lines: ProposedLine[] = [];
    for (const rawLine of section.split('\n')) {
        const trimmed = rawLine.trim();
        const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (!match) continue;

        const lineNumber = Number(match[1]);
        const body = match[2];
        const parts = body.split('·').map((part) => part.trim());
        const artistTitle = parts[0] ?? body;
        const tags = parts.slice(1).join(' · ');

        const dashIndex = artistTitle.indexOf(' — ');
        if (dashIndex === -1) {
            lines.push({
                lineNumber,
                artist: artistTitle,
                title: artistTitle,
                tags,
                raw: trimmed
            });
            continue;
        }

        lines.push({
            lineNumber,
            artist: artistTitle.slice(0, dashIndex).trim(),
            title: artistTitle.slice(dashIndex + 3).trim(),
            tags,
            raw: trimmed
        });
    }
    return lines;
}

function extractSection(raw: string, heading: string, nextHeading?: string): string {
    const start = raw.indexOf(heading);
    if (start === -1) return '';
    const from = start + heading.length;
    const end = nextHeading ? raw.indexOf(nextHeading, from) : raw.length;
    return raw.slice(from, end === -1 ? raw.length : end).trim();
}

export function parseCurateResponse(raw: string): CurateResult {
    const sequenceIntent = extractSection(raw, '## Sequence intent', '## Ordering axes');
    const orderingAxes = extractSection(raw, '## Ordering axes', '## Proposed tracklist');
    const tracklistSection = extractSection(raw, '## Proposed tracklist');
    const lines = parseProposedLines(tracklistSection);

    if (lines.length < 20) {
        throw new Error(`Curate response had only ${lines.length} proposed lines (expected ~26)`);
    }

    return { sequenceIntent, orderingAxes, lines, raw };
}

export async function curateTracklist(
    env: Env,
    brief: CompactBrief,
    model?: string
): Promise<CurateResult> {
    const userPrompt = `${TASK_PROMPT_STARTER}

BRIEF:
${formatBriefBlock(brief)}

${TASK_RULES}`;

    const raw = await completeChat(
        env,
        [
            {
                role: 'system',
                content:
                    'You are an expert music supervisor. Follow the output format exactly. English only.'
            },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    return parseCurateResponse(raw);
}
