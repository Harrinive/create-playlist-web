import assert from 'node:assert/strict';
import test from 'node:test';
import {
    fallbackPlaylistMetadata,
    metadataLocaleOk,
    parsePlaylistMetadata,
    pickPlaylistMetadata,
    resolvePlaylistMetadata,
    validateMetadataAgainstArc,
    validatePlaylistMetadata
} from '../curate-metadata.js';
import { parseCurateResponse, parseSequenceIntent } from '../curate.js';

const SAMPLE_TRACKLIST = `
## Proposed tracklist
1. Artist A — Song One · [energy: low] · [cue: hush air]
2. Artist B — Song Two · [energy: med] · [cue: warm bench]
`.repeat(11);

const GOOD_METADATA = `### English
name: Back seat, rain on glass — room around the strings
description: Rain streaks the back-seat glass; the city blurs outside. The music stays unhurried and close — wistful, but not heavy — breathing through soft strings before it slowly gathers warmth.

### 中文
name: 雨夜后座 — 弦与留白
description: 雨点打在后座玻璃上，外面的城市化成一片模糊。音乐贴得很近，留一点怅然却不往下沉，在木吉他和弦的留白里慢慢暖起来。`;

const BAD_METADATA_EXPLICIT_REJECT = `### English
name: Night drive — warm synth
description: A slow night drive with warm synth pads. Please avoid club energy and EDM drops.

### 中文
name: 夜行 — 暖合成
description: 慢速夜行，暖合成铺底。避开夜店和 EDM。`;

const BAD_METADATA_TEMPLATE = `### English
name: My Playlist
description: A playlist for standing in a quiet hallway. Feels calm but not empty, slow and steady, built from close acoustic guitar.

### 中文
name: 歌单
description: 为玄关而选。感受平静，节奏慢。`;

test('parsePlaylistMetadata extracts bilingual name and description', () => {
    const parsed = parsePlaylistMetadata(GOOD_METADATA);
    assert.match(parsed.en.name, /Back seat/);
    assert.match(parsed.en.description, /Rain streaks/);
    assert.match(parsed.zh.name, /雨夜后座/);
    assert.match(parsed.zh.description, /雨点打在/);
});

test('metadataLocaleOk accepts good supervisor prose', () => {
    const parsed = parsePlaylistMetadata(GOOD_METADATA);
    assert.equal(metadataLocaleOk(parsed.en, 'en'), true);
    assert.equal(metadataLocaleOk(parsed.zh, 'zh'), true);
});

test('validatePlaylistMetadata rejects explicit reject clauses', () => {
    const parsed = parsePlaylistMetadata(BAD_METADATA_EXPLICIT_REJECT);
    const issues = validatePlaylistMetadata(parsed).filter((i) => i.code === 'explicit_reject');
    assert.ok(issues.length >= 1);
});

test('validatePlaylistMetadata rejects template-shaped prose', () => {
    const parsed = parsePlaylistMetadata(BAD_METADATA_TEMPLATE);
    const issues = validatePlaylistMetadata(parsed);
    assert.ok(issues.some((i) => i.code === 'template_shape' || i.code === 'generic'));
});

test('pickPlaylistMetadata prefers valid zh', () => {
    const metadata = parsePlaylistMetadata(GOOD_METADATA);
    const picked = pickPlaylistMetadata('zh', metadata);
    assert.match(picked.name, /雨夜后座/);
    assert.match(picked.description, /雨点打在/);
});

test('pickPlaylistMetadata falls back to en when zh invalid', () => {
    const metadata = parsePlaylistMetadata(GOOD_METADATA);
    metadata.zh = {
        name: 'Bad english restless',
        description: 'restless 向前'
    };
    const picked = pickPlaylistMetadata('zh', metadata);
    assert.match(picked.name, /Back seat/);
});

test('fallbackPlaylistMetadata derives from listen arc', () => {
    const arc = {
        en: 'The sequence opens in hollow hush after the last carriage leaves, then slowly gathers warmth.',
        zh: '末班列车离去后，序列从空荡的静默里展开，随后慢慢暖起来。'
    };
    const fallback = fallbackPlaylistMetadata(arc);
    assert.match(fallback.en.name, /hollow hush|sequence opens/i);
    assert.match(fallback.en.description, /hollow hush/);
    assert.match(fallback.zh.description, /末班列车/);
});

test('validateMetadataAgainstArc rejects arc paste in name and description', () => {
    const arc = {
        en: 'Rain opens on the glass. Warmth gathers slowly. The list exhales into still.',
        zh: '雨点打在玻璃上。温度慢慢升起。最后收进静止。'
    };
    const metadata = {
        en: {
            name: 'Rain opens on the glass',
            description:
                'Rain opens on the glass. Warmth gathers slowly. The list exhales into still.'
        },
        zh: { name: '', description: '' }
    };
    const issues = validateMetadataAgainstArc(metadata, arc);
    assert.ok(issues.some((i) => i.code === 'arc_paste' && i.field === 'name'));
    assert.ok(issues.some((i) => i.code === 'arc_paste' && i.field === 'description'));
});

test('resolvePlaylistMetadata falls back when parsed metadata invalid', () => {
    const sequenceIntent = {
        en: 'Rain streaks the glass as the list breathes in close acoustic warmth.',
        zh: ''
    };
    const resolved = resolvePlaylistMetadata(parsePlaylistMetadata(BAD_METADATA_TEMPLATE), sequenceIntent);
    assert.equal(metadataLocaleOk(resolved.en, 'en'), true);
    assert.match(resolved.en.description, /Rain streaks|breathes/i);
});

test('parseCurateResponse extracts metadata block with legacy ordering-axes boundary', () => {
    const raw = `## Sequence intent
### English
The sequence opens in hollow hush after the last carriage leaves.

### 中文
末班列车离去后，序列从空荡的静默里展开。

## Playlist metadata
${GOOD_METADATA}

## Ordering axes
energy · cue

${SAMPLE_TRACKLIST}`;

    const result = parseCurateResponse(raw);
    assert.match(result.sequenceIntent.en, /hollow hush/);
    assert.match(result.playlistMetadata.en.name, /Back seat/);
    assert.equal(result.orderingAxes, 'energy · cue');
    assert.ok(result.lines.length >= 20);
});

test('parseCurateResponse legacy format without metadata falls back to arc', () => {
    const raw = `## Sequence intent
### English
The sequence opens in hollow hush after the last carriage leaves.

### 中文
末班列车离去后，序列从空荡的静默里展开。

## Ordering axes
energy · cue

${SAMPLE_TRACKLIST}`;

    const result = parseCurateResponse(raw);
    assert.match(result.playlistMetadata.en.name, /hollow hush|sequence opens/i);
    assert.match(result.playlistMetadata.en.description, /hollow hush/);
});

test('parseSequenceIntent splits bilingual subsections', () => {
    const section = `### English
Opens sparse, then tightens.

### 中文
开场稀疏，随后收紧。`;

    assert.deepEqual(parseSequenceIntent(section), {
        en: 'Opens sparse, then tightens.',
        zh: '开场稀疏，随后收紧。'
    });
});
