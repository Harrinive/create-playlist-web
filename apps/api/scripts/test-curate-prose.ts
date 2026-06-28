/**
 * Generate listen arc + playlist metadata via curateTracklist, grade prose output.
 *
 * Usage:
 *   cd apps/api && npx tsx scripts/test-curate-prose.ts
 *   cd apps/api && npx tsx scripts/test-curate-prose.ts openai:gpt-4.1-mini
 *
 * Grader-editor loop: feed the printed report to a Grader subagent (canon: docs/PLAYLIST-METADATA.md).
 * Editor adjusts curate-prompt.ts — not individual generated strings.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from '../src/config.js';
import { curateTracklist } from '../src/llm/curate.js';
import {
    formatProseGradeReport,
    gradeCurateProse,
    type ProseGradeVerdict
} from '../src/llm/curate-prose-grade.js';
import { resolveCurateDefaultModel, normalizeCurateModelId } from '../src/llm/models.js';
import type { CompactBrief } from '../src/types/interview.js';

const env = loadEnv();
const modelArg = process.argv[2];
const model =
    (modelArg ? normalizeCurateModelId(env, modelArg) : null) ??
    resolveCurateDefaultModel(env);

if (!model) {
    console.error('No curate model configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or CURSOR_API_KEY.');
    process.exit(1);
}

/** Divergent brief paths — principle F: grade across ≥2 contexts. */
const SCENARIOS: Array<{ id: string; brief: CompactBrief }> = [
    {
        id: 'rain-car-wistful-acoustic',
        brief: {
            anchor: 'sitting in the back seat while rain streaks the windows',
            emotion: 'wistful with a little unfinished feeling',
            pace: 'very slow and soft',
            sonic: 'close acoustic guitar or fingerpicked strings with room around them',
            flow: 'fade to still — gentle opener, soft exhale at the end',
            reject: ['clubby or EDM with big drops', 'aggressive gym-pop or motivational hype'],
            seeds: 'none',
            story:
                'Rain beads on the glass while you sit in the back seat, unhurried. A wistful feeling lingers — not heavy, just unfinished. The night stays very slow and soft.'
        }
    },
    {
        id: 'highway-restless-synth',
        brief: {
            anchor: 'on a road still rolling under you',
            emotion: 'restless and needing to move',
            pace: 'medium, like a walking pace',
            sonic: 'soft synth pads in a wide space',
            flow: 'slow ignition — charged build without a cliff',
            reject: ['overly slick radio polish'],
            seeds: 'none',
            story:
                'The highway shoulder blurs under streetlights; the road keeps rolling. Restless energy wants forward motion without tipping into frenzy. Warm synth begins quiet, then slowly charges.'
        }
    }
];

console.log(`Curate prose test — model: ${model}`);
console.log(`Scenarios: ${SCENARIOS.map((s) => s.id).join(', ')}\n`);

const verdicts: ProseGradeVerdict[] = [];

for (const scenario of SCENARIOS) {
    console.log(`--- Generating: ${scenario.id} ---`);
    const result = await curateTracklist(env, scenario.brief, model);
    const verdict = gradeCurateProse(scenario.id, scenario.brief, result);
    verdicts.push(verdict);
    console.log(`  ${verdict.pass ? 'PASS' : 'FAIL'} (${verdict.score.toFixed(1)}/10)`);
    if (verdict.blocking.length) {
        for (const issue of verdict.blocking) {
            console.log(`  BLOCK [${issue.field}] ${issue.code}: ${issue.message}`);
        }
    }
}

const report = formatProseGradeReport(verdicts);
console.log('\n' + report);

const outDir = join(process.cwd(), '.curate-prose');
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = join(outDir, `grade-${stamp}.md`);
const jsonPath = join(outDir, `grade-${stamp}.json`);
writeFileSync(reportPath, report, 'utf8');
writeFileSync(jsonPath, JSON.stringify({ model, verdicts }, null, 2), 'utf8');
console.log(`\nWrote ${reportPath}`);

const allPass = verdicts.every((v) => v.pass);
if (!allPass) {
    console.error('\nDeterministic prose grade: FAIL — see blocking issues above.');
    process.exit(1);
}

console.log('\nDeterministic prose grade: PASS');
