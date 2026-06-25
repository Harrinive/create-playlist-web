/**
 * Q1 region coverage audit (deterministic plan slots).
 * Usage: cd apps/api && npx tsx scripts/test-interview-q1.ts [fast|full]
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import { Q1_REGION_IDS } from '../src/llm/interview/prompts.js';

const modeArg = process.argv[2];
const algorithmMode = modeArg === 'fast' || modeArg === 'full' ? modeArg : 'full';

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);

if (!model) {
    console.error('No interview model configured — set OPENAI_API_KEY / INTERVIEW_LLM_MODEL');
    process.exit(1);
}

console.log(`Model: ${model}`);
console.log(`Mode: ${algorithmMode}`);
console.log(`Expected regions: ${Q1_REGION_IDS.length}`);
console.log('Generating Q1…\n');

const result = await generateInterviewStep(
    env,
    {
        stepIndex: 0,
        priorAnswers: {},
        rejectedStems: [],
        refresh: false,
        algorithmMode
    },
    model
);

console.log(JSON.stringify(result.step, null, 2));
console.log(`\nOptions: ${result.step.options.length}`);
console.log(`Step ids for session: ${result.stepIds.join(' → ')}`);
