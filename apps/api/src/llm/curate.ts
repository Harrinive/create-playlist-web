import type { CompactBrief, ProposedLine } from '../types/interview.js';
import type { BilingualText } from '../types/interview-step.js';
import type { Env } from '../config.js';
import { completeChat } from '../llm-router/index.js';
import { formatBriefBlock } from '../brief.js';
import {
    type BilingualPlaylistMetadata,
    parsePlaylistMetadata,
    resolvePlaylistMetadata
} from './curate-metadata.js';
import { CURATE_SYSTEM_PROMPT, TASK_PROMPT_STARTER, TASK_RULES } from './curate-prompt.js';

export type { BilingualPlaylistMetadata, PlaylistMetadataFields } from './curate-metadata.js';
export {
    parsePlaylistMetadata,
    pickPlaylistMetadata,
    validatePlaylistMetadata,
    fallbackPlaylistMetadata
} from './curate-metadata.js';

export type CurateResult = {
    sequenceIntent: BilingualText;
    playlistMetadata: BilingualPlaylistMetadata;
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

const SEQUENCE_EN_HEADING = '### English';
const SEQUENCE_ZH_HEADING = '### 中文';

export function parseSequenceIntent(section: string): BilingualText {
    const enStart = section.indexOf(SEQUENCE_EN_HEADING);
    const zhStart = section.indexOf(SEQUENCE_ZH_HEADING);

    if (enStart !== -1 && zhStart !== -1 && zhStart > enStart) {
        return {
            en: section.slice(enStart + SEQUENCE_EN_HEADING.length, zhStart).trim(),
            zh: section.slice(zhStart + SEQUENCE_ZH_HEADING.length).trim()
        };
    }

    const trimmed = section.trim();
    return { en: trimmed, zh: '' };
}

export function parseCurateResponse(raw: string, brief?: CompactBrief): CurateResult {
    const hasMetadataBlock = raw.includes('## Playlist metadata');
    const sequenceSection = extractSection(
        raw,
        '## Sequence intent',
        hasMetadataBlock ? '## Playlist metadata' : '## Ordering axes'
    );
    const sequenceIntent = parseSequenceIntent(sequenceSection);
    const metadataSection = hasMetadataBlock
        ? extractSection(raw, '## Playlist metadata', '## Ordering axes')
        : '';
    const parsedMetadata = parsePlaylistMetadata(metadataSection);
    const playlistMetadata = resolvePlaylistMetadata(parsedMetadata, sequenceIntent, brief);
    const orderingAxes = extractSection(raw, '## Ordering axes', '## Proposed tracklist');
    const tracklistSection = extractSection(raw, '## Proposed tracklist');
    const lines = parseProposedLines(tracklistSection);

    if (lines.length < 20) {
        throw new Error(`Curate response had only ${lines.length} proposed lines (expected ~26)`);
    }

    return { sequenceIntent, playlistMetadata, orderingAxes, lines, raw };
}

export async function curateTracklist(
    env: Env,
    brief: CompactBrief,
    model?: string,
    hypotheses?: string[]
): Promise<CurateResult> {
    const hypothesesBlock =
        hypotheses && hypotheses.length > 0
            ? `\nHYPOTHESES: ${hypotheses.join(' · ')}\nPick ~26 tracks consistent with the story; blend reachable flavors — do not force one subgenre.`
            : '';

    const userPrompt = `${TASK_PROMPT_STARTER}

BRIEF:
${formatBriefBlock(brief)}${hypothesesBlock}

${TASK_RULES}`;

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: CURATE_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    return parseCurateResponse(raw, brief);
}
