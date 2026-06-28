import type { CompactBrief } from '../types/interview.js';
import type { BilingualText } from '../types/interview-step.js';
import type { CurateResult } from './curate.js';
import {
    ARC_CATALOG_PATTERNS,
    REJECT_PROSE_PATTERNS,
    TAG_META_PATTERNS,
    TEMPLATE_PROSE_PATTERNS
} from './curate-prose-patterns.js';
import { metadataContainsLatinWords } from '../brief.js';
import {
    type BilingualPlaylistMetadata,
    type PlaylistMetadataFields,
    validateMetadataLocale,
    validateMetadataAgainstArc,
    validatePlaylistMetadata,
    metadataLocaleOk,
    pickPlaylistMetadata
} from './curate-metadata.js';

export type ProseField = 'sequenceIntent' | 'name' | 'description';

export type ProseGradeIssue = {
    field: ProseField;
    locale: 'en' | 'zh';
    code: string;
    message: string;
    blocking: boolean;
};

export type ProseGradeVerdict = {
    scenarioId: string;
    pass: boolean;
    score: number;
    blocking: ProseGradeIssue[];
    warnings: ProseGradeIssue[];
    output: {
        sequenceIntent: BilingualText;
        playlistMetadata: BilingualPlaylistMetadata;
        pickedEn: PlaylistMetadataFields;
        pickedZh: PlaylistMetadataFields;
    };
};

const ARC_MIN_SENTENCES = 3;
const ARC_MAX_SENTENCES = 5;

function countSentences(text: string, locale: 'en' | 'zh'): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    if (locale === 'zh') {
        return trimmed.split(/[。！？]+/).filter((s) => s.trim().length > 0).length;
    }
    return trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0).length;
}

function scanProse(
    text: string,
    field: ProseField,
    locale: 'en' | 'zh',
    issues: ProseGradeIssue[],
    kind: 'blocking' | 'warning'
) {
    const trimmed = text.trim();
    if (!trimmed) return;

    for (const pattern of REJECT_PROSE_PATTERNS) {
        if (pattern.test(trimmed)) {
            issues.push({
                field,
                locale,
                code: 'explicit_reject',
                message: 'prose must not state avoids — REJECT is silent in copy',
                blocking: true
            });
            return;
        }
    }

    if (field === 'sequenceIntent') {
        for (const pattern of TAG_META_PATTERNS) {
            if (pattern.test(trimmed)) {
                issues.push({
                    field,
                    locale,
                    code: 'tag_meta',
                    message: 'arc must describe movement and feel, not tag notation rules',
                    blocking: kind === 'blocking'
                });
                return;
            }
        }
    }

    if (field === 'name') {
        for (const pattern of ARC_CATALOG_PATTERNS) {
            if (pattern.test(trimmed)) {
                issues.push({
                    field,
                    locale,
                    code: 'catalog_noise',
                    message: 'name must not reference track counts or catalog mechanics',
                    blocking: kind === 'blocking'
                });
                return;
            }
        }
    }

    for (const pattern of TEMPLATE_PROSE_PATTERNS) {
        if (pattern.test(trimmed)) {
            issues.push({
                field,
                locale,
                code: 'template_shape',
                message: 'reads like brief template or spec sheet, not supervisor story prose',
                blocking: kind === 'blocking'
            });
            return;
        }
    }
}

function sceneTokens(brief: CompactBrief): string[] {
    const source = [brief.story, brief.anchor].filter(Boolean).join(' ');
    return source
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4);
}

function hasSceneOverlap(text: string, tokens: string[]): boolean {
    const lower = text.toLowerCase();
    return tokens.some((token) => lower.includes(token));
}

export function gradeCurateProse(
    scenarioId: string,
    brief: CompactBrief,
    result: Pick<CurateResult, 'sequenceIntent' | 'playlistMetadata'>
): ProseGradeVerdict {
    const blocking: ProseGradeIssue[] = [];
    const warnings: ProseGradeIssue[] = [];

    const pickedEn = pickPlaylistMetadata('en', result.playlistMetadata);
    const pickedZh = pickPlaylistMetadata('zh', result.playlistMetadata);

    for (const locale of ['en', 'zh'] as const) {
        const arc = result.sequenceIntent[locale];
        if (locale === 'en' && !arc.trim()) {
            blocking.push({
                field: 'sequenceIntent',
                locale,
                code: 'missing',
                message: 'English listen arc is required',
                blocking: true
            });
        } else if (arc.trim()) {
            const sentences = countSentences(arc, locale);
            if (locale === 'en' && (sentences < ARC_MIN_SENTENCES || sentences > ARC_MAX_SENTENCES)) {
                warnings.push({
                    field: 'sequenceIntent',
                    locale,
                    code: 'arc_length',
                    message: `listen arc should be ${ARC_MIN_SENTENCES}–${ARC_MAX_SENTENCES} sentences (got ${sentences})`,
                    blocking: false
                });
            }
            scanProse(arc, 'sequenceIntent', locale, locale === 'en' ? blocking : warnings, 'blocking');
            if (locale === 'zh' && metadataContainsLatinWords(arc)) {
                warnings.push({
                    field: 'sequenceIntent',
                    locale,
                    code: 'english_leak',
                    message: 'Chinese listen arc should not contain English words',
                    blocking: false
                });
            }
        }

        if (locale === 'zh' && !arc.trim()) {
            warnings.push({
                field: 'sequenceIntent',
                locale,
                code: 'missing_zh',
                message: 'Chinese listen arc missing',
                blocking: false
            });
        }
    }

    for (const issue of validateMetadataAgainstArc(result.playlistMetadata, result.sequenceIntent)) {
        const entry: ProseGradeIssue = {
            field: issue.field,
            locale: issue.locale,
            code: issue.code,
            message: issue.message,
            blocking: issue.locale === 'en'
        };
        if (issue.locale === 'en') blocking.push(entry);
        else warnings.push({ ...entry, blocking: false });
    }

    for (const issue of validatePlaylistMetadata(result.playlistMetadata)) {
        const entry: ProseGradeIssue = {
            field: issue.field,
            locale: issue.locale,
            code: issue.code,
            message: issue.message,
            blocking: issue.locale === 'en'
        };
        if (issue.locale === 'en') blocking.push(entry);
        else warnings.push({ ...entry, blocking: false });
    }

    scanProse(pickedEn.description, 'description', 'en', blocking, 'blocking');
    scanProse(pickedEn.name, 'name', 'en', blocking, 'blocking');

    const zhIsNative = metadataLocaleOk(result.playlistMetadata.zh, 'zh');
    if (zhIsNative) {
        scanProse(pickedZh.description, 'description', 'zh', blocking, 'blocking');
        scanProse(pickedZh.name, 'name', 'zh', blocking, 'blocking');
    } else {
        warnings.push({
            field: 'name',
            locale: 'zh',
            code: 'missing_zh',
            message: 'Chinese playlist metadata invalid — publish will fall back to English',
            blocking: false
        });
    }

    const tokens = sceneTokens(brief);
    const sceneText = [result.sequenceIntent.en, pickedEn.description, pickedEn.name].join(' ');
    if (tokens.length > 0 && !hasSceneOverlap(sceneText, tokens)) {
        warnings.push({
            field: 'description',
            locale: 'en',
            code: 'scene_drift',
            message: 'prose may not reflect brief scene anchor',
            blocking: false
        });
    }

    if (!validateMetadataLocale(pickedEn, 'en').length && pickedEn.description.length > 280) {
        warnings.push({
            field: 'description',
            locale: 'en',
            code: 'description_dense',
            message: 'description is near length cap — may read like spec not story',
            blocking: false
        });
    }

    const blockingCount = blocking.length;
    const warningCount = warnings.length;
    const score = Math.max(0, 10 - blockingCount * 2 - warningCount * 0.5);

    return {
        scenarioId,
        pass: blockingCount === 0,
        score,
        blocking,
        warnings,
        output: {
            sequenceIntent: result.sequenceIntent,
            playlistMetadata: result.playlistMetadata,
            pickedEn,
            pickedZh
        }
    };
}

export function formatProseGradeReport(verdicts: ProseGradeVerdict[]): string {
    const lines: string[] = ['# Curate prose grade report', ''];

    for (const v of verdicts) {
        lines.push(`## ${v.scenarioId}`);
        lines.push(`VERDICT: ${v.pass ? 'PASS' : 'FAIL'} | SCORE: ${v.score.toFixed(1)}/10`);
        lines.push('');
        lines.push('### Listen arc (EN)');
        lines.push(v.output.sequenceIntent.en || '(empty)');
        lines.push('');
        lines.push('### Listen arc (中文)');
        lines.push(v.output.sequenceIntent.zh || '(empty)');
        lines.push('');
        lines.push('### Playlist name (EN, publish)');
        lines.push(v.output.pickedEn.name || '(empty)');
        lines.push('');
        lines.push('### Playlist description (EN, publish)');
        lines.push(v.output.pickedEn.description || '(empty)');
        lines.push('');
        lines.push('### Playlist name (中文, publish)');
        lines.push(v.output.pickedZh.name || '(empty)');
        lines.push('');
        lines.push('### Playlist description (中文, publish)');
        lines.push(v.output.pickedZh.description || '(empty)');
        lines.push('');

        if (v.blocking.length) {
            lines.push('**Blocking:**');
            for (const issue of v.blocking) {
                lines.push(`- [${issue.field}/${issue.locale}] ${issue.code}: ${issue.message}`);
            }
            lines.push('');
        }
        if (v.warnings.length) {
            lines.push('**Warnings:**');
            for (const issue of v.warnings) {
                lines.push(`- [${issue.field}/${issue.locale}] ${issue.code}: ${issue.message}`);
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}
