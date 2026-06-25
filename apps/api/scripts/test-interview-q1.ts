/**
 * Smoke test: generate Q1 with default interview model.
 * Usage: cd apps/api && npx tsx scripts/test-interview-q1.ts [fast|full]
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';

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
console.log('Generating Q1…\n');

const step = await generateInterviewStep(
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

console.log(JSON.stringify(step, null, 2));
