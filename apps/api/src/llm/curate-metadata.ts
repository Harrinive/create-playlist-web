import type { CompactBrief } from '../types/interview.js';
import type { BilingualText } from '../types/interview-step.js';
import { metadataContainsLatinWords } from '../brief.js';
import {
    ARC_CATALOG_PATTERNS,
    REJECT_PROSE_PATTERNS,
    TEMPLATE_PROSE_PATTERNS,
    proseMostlySameAsArc,
    proseStartsArcPaste
} from './curate-prose-patterns.js';

export type PlaylistMetadataFields = {
    name: string;
    description: string;
};

export type BilingualPlaylistMetadata = {
    en: PlaylistMetadataFields;
    zh: PlaylistMetadataFields;
};

export type MetadataValidationIssue = {
    field: 'name' | 'description';
    locale: 'en' | 'zh';
    code: string;
    message: string;
};

const NAME_MAX = 100;
const NAME_PREFERRED_MAX = 80;
const DESCRIPTION_MAX = 300;

const GENERIC_NAME_PATTERNS: RegExp[] = [
    /^my playlist$/i,
    /^night mix$/i,
    /^chill vibes$/i,
    /^vibelist\b/i
];

const EN_HEADING = '### English';
const ZH_HEADING = '### 中文';

function parseLocaleBlock(section: string, locale: 'en' | 'zh'): PlaylistMetadataFields {
    const heading = locale === 'en' ? EN_HEADING : ZH_HEADING;
    const other = locale === 'en' ? ZH_HEADING : EN_HEADING;
    const start = section.indexOf(heading);
    if (start === -1) return { name: '', description: '' };

    const from = start + heading.length;
    const otherStart = section.indexOf(other, from);
    const block = section.slice(from, otherStart === -1 ? section.length : otherStart).trim();

    const nameMatch = block.match(/^name:\s*(.+)$/im);
    const descMatch = block.match(/^description:\s*([\s\S]+)$/im);

    return {
        name: (nameMatch?.[1] ?? '').trim().split('\n')[0]?.trim() ?? '',
        description: (descMatch?.[1] ?? '').trim()
    };
}

export function parsePlaylistMetadata(section: string): BilingualPlaylistMetadata {
    return {
        en: parseLocaleBlock(section, 'en'),
        zh: parseLocaleBlock(section, 'zh')
    };
}

function pushIssue(
    issues: MetadataValidationIssue[],
    field: 'name' | 'description',
    locale: 'en' | 'zh',
    code: string,
    message: string
) {
    issues.push({ field, locale, code, message });
}

export function validatePlaylistMetadata(metadata: BilingualPlaylistMetadata): MetadataValidationIssue[] {
    const issues: MetadataValidationIssue[] = [];

    for (const locale of ['en', 'zh'] as const) {
        const { name, description } = metadata[locale];
        if (!name && !description) continue;

        if (!name) {
            pushIssue(issues, 'name', locale, 'missing', 'name is required when description is present');
        }
        if (!description) {
            pushIssue(issues, 'description', locale, 'missing', 'description is required when name is present');
        }

        if (name.length > NAME_MAX) {
            pushIssue(issues, 'name', locale, 'too_long', `name exceeds ${NAME_MAX} characters`);
        }
        if (name.length > NAME_PREFERRED_MAX) {
            pushIssue(
                issues,
                'name',
                locale,
                'name_not_title',
                `name reads like prose not a title card (>${NAME_PREFERRED_MAX} chars)`
            );
        }
        if (description.length > DESCRIPTION_MAX) {
            pushIssue(
                issues,
                'description',
                locale,
                'too_long',
                `description exceeds ${DESCRIPTION_MAX} characters`
            );
        }

        for (const pattern of GENERIC_NAME_PATTERNS) {
            if (pattern.test(name)) {
                pushIssue(issues, 'name', locale, 'generic', 'name is too generic');
            }
        }

        for (const pattern of ARC_CATALOG_PATTERNS) {
            if (pattern.test(name)) {
                pushIssue(issues, 'name', locale, 'catalog_noise', 'name must not reference track counts');
            }
        }

        for (const text of [name, description]) {
            for (const pattern of REJECT_PROSE_PATTERNS) {
                if (pattern.test(text)) {
                    pushIssue(
                        issues,
                        text === name ? 'name' : 'description',
                        locale,
                        'explicit_reject',
                        'prose must not state avoids — REJECT is silent in copy'
                    );
                    break;
                }
            }
        }

        for (const text of [name, description]) {
            for (const pattern of TEMPLATE_PROSE_PATTERNS) {
                if (pattern.test(text)) {
                    pushIssue(
                        issues,
                        text === name ? 'name' : 'description',
                        locale,
                        'template_shape',
                        'reads like brief template or spec sheet, not supervisor story prose'
                    );
                    break;
                }
            }
        }

        if (locale === 'zh' && (name || description)) {
            if (metadataContainsLatinWords(name)) {
                pushIssue(issues, 'name', locale, 'english_leak', 'zh name must not contain English words');
            }
            if (metadataContainsLatinWords(description)) {
                pushIssue(
                    issues,
                    'description',
                    locale,
                    'english_leak',
                    'zh description must not contain English words'
                );
            }
        }
    }

    if (!metadata.en.name && !metadata.en.description) {
        pushIssue(issues, 'name', 'en', 'missing', 'English metadata block is required');
    }

    return issues;
}

export function validateMetadataAgainstArc(
    metadata: BilingualPlaylistMetadata,
    sequenceIntent: BilingualText
): MetadataValidationIssue[] {
    const issues: MetadataValidationIssue[] = [];

    for (const locale of ['en', 'zh'] as const) {
        const fields = metadata[locale];
        const arc = sequenceIntent[locale];
        if (!fields.name.trim() || !arc.trim()) continue;

        if (proseStartsArcPaste(fields.name, arc)) {
            pushIssue(
                issues,
                'name',
                locale,
                'arc_paste',
                'name must be a title card — not the opening sentence of the listen arc'
            );
        }
        if (proseMostlySameAsArc(fields.description, arc)) {
            pushIssue(
                issues,
                'description',
                locale,
                'arc_paste',
                'description must be a fresh mini arc — not a copy of the listen arc'
            );
        }
    }

    return issues;
}

export function validateMetadataLocale(
    fields: PlaylistMetadataFields,
    locale: 'en' | 'zh'
): MetadataValidationIssue[] {
    return validatePlaylistMetadata({
        en: locale === 'en' ? fields : { name: '', description: '' },
        zh: locale === 'zh' ? fields : { name: '', description: '' }
    }).filter((issue) => issue.locale === locale);
}

export function metadataLocaleOk(fields: PlaylistMetadataFields, locale: 'en' | 'zh'): boolean {
    if (!fields.name.trim() || !fields.description.trim()) return false;
    return validateMetadataLocale(fields, locale).length === 0;
}

export function pickPlaylistMetadata(
    locale: 'en' | 'zh',
    metadata: BilingualPlaylistMetadata
): PlaylistMetadataFields {
    const en = metadata.en;
    const zh = metadata.zh;

    if (locale === 'zh') {
        if (metadataLocaleOk(zh, 'zh')) {
            return { name: zh.name.trim(), description: zh.description.trim() };
        }
        return { name: en.name.trim(), description: en.description.trim() };
    }

    if (metadataLocaleOk(en, 'en')) {
        return { name: en.name.trim(), description: en.description.trim() };
    }

    return { name: en.name.trim(), description: en.description.trim() };
}

function truncateAtWord(text: string, max: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;
    const slice = trimmed.slice(0, max);
    const lastSpace = slice.lastIndexOf(' ');
    return (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trim();
}

/** When LLM metadata is missing or invalid — derive from listen arc + brief anchor. */
export function fallbackPlaylistMetadata(
    sequenceIntent: BilingualText,
    brief?: CompactBrief
): BilingualPlaylistMetadata {
    const derive = (arc: string, locale: 'en' | 'zh'): PlaylistMetadataFields => {
        const text = arc.trim();
        if (!text) return { name: '', description: '' };

        const firstSentence =
            locale === 'zh'
                ? (text.split(/[。！？]+/)[0]?.trim() ?? text)
                : (text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? text);

        let name = firstSentence.includes(' — ')
            ? firstSentence
            : truncateAtWord(firstSentence.replace(/[.!?。！？]$/, ''), NAME_PREFERRED_MAX);

        if (name.length > NAME_PREFERRED_MAX && brief) {
            const scene =
                locale === 'zh'
                    ? brief.anchor.split(/\s+/).slice(0, 4).join(' ')
                    : truncateAtWord(brief.anchor, 36);
            const sonic = truncateAtWord(brief.sonic.split(/\s+/).slice(0, 4).join(' '), 28);
            name = `${scene} — ${sonic}`;
        }

        return {
            name: truncateAtWord(name, NAME_PREFERRED_MAX),
            description: truncateAtWord(text, DESCRIPTION_MAX)
        };
    };

    return {
        en: derive(sequenceIntent.en, 'en'),
        zh: derive(sequenceIntent.zh, 'zh')
    };
}

export function metadataValidationOk(metadata: BilingualPlaylistMetadata): boolean {
    return validatePlaylistMetadata(metadata).length === 0;
}

function localeMetadataResolved(
    fields: PlaylistMetadataFields,
    locale: 'en' | 'zh',
    sequenceIntent: BilingualText
): boolean {
    if (!metadataLocaleOk(fields, locale)) return false;
    const partial: BilingualPlaylistMetadata = {
        en: locale === 'en' ? fields : { name: '', description: '' },
        zh: locale === 'zh' ? fields : { name: '', description: '' }
    };
    return validateMetadataAgainstArc(partial, sequenceIntent).every((issue) => issue.locale !== locale);
}

export function resolvePlaylistMetadata(
    parsed: BilingualPlaylistMetadata,
    sequenceIntent: BilingualText,
    brief?: CompactBrief
): BilingualPlaylistMetadata {
    const fallback = fallbackPlaylistMetadata(sequenceIntent, brief);

    const en = localeMetadataResolved(parsed.en, 'en', sequenceIntent) ? parsed.en : fallback.en;
    const zh = localeMetadataResolved(parsed.zh, 'zh', sequenceIntent) ? parsed.zh : fallback.zh;

    return { en, zh };
}
