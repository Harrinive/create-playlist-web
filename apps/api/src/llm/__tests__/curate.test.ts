import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCurateResponse, parseSequenceIntent } from '../curate.js';

const SAMPLE_TRACKLIST = `
## Proposed tracklist
1. Artist A — Song One · [energy: low] · [cue: hush air]
2. Artist B — Song Two · [energy: med] · [cue: warm bench]
`.repeat(11);

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

test('parseSequenceIntent falls back to English-only legacy section', () => {
    assert.deepEqual(parseSequenceIntent('Legacy English arc only.'), {
        en: 'Legacy English arc only.',
        zh: ''
    });
});

test('parseCurateResponse extracts bilingual sequence intent and metadata', () => {
    const raw = `## Sequence intent
### English
The sequence opens in hollow hush after the last carriage leaves.

### 中文
末班列车离去后，序列从空荡的静默里展开。

## Playlist metadata
### English
name: Empty platform — close breath and strings
description: The platform empties after the last train; hollow hush holds in the air before warmth gathers around close strings.

### 中文
name: 空荡站台 — 近距弦音
description: 末班离去后站台空下来，静默里慢慢聚起一点温度，弦音贴得很近。

## Ordering axes
energy · cue

${SAMPLE_TRACKLIST}`;

    const result = parseCurateResponse(raw);
    assert.match(result.sequenceIntent.en, /hollow hush/);
    assert.match(result.sequenceIntent.zh, /空荡/);
    assert.match(result.playlistMetadata.en.name, /Empty platform/);
    assert.equal(result.orderingAxes, 'energy · cue');
    assert.ok(result.lines.length >= 20);
});
