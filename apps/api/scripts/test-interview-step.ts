/**
 * Smoke test: generate one interview step with default model.
 * Usage: cd apps/api && npx tsx scripts/test-interview-step.ts [fast|full] [step]
 *   step: m1 | m2 | m3 | m5 | m4 | 0-4 (default m1)
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { INTERVIEW_STEP_SEQUENCE } from '../src/types/interview-step.js';

const modeArg = process.argv[2];
const stepArg = process.argv[3] ?? 'm1';
const algorithmMode = modeArg === 'fast' || modeArg === 'full' ? modeArg : 'full';

function resolveStepIndex(arg: string): number {
    const byId = INTERVIEW_STEP_SEQUENCE.findIndex((s) => s.id === arg);
    if (byId >= 0) return byId;
    const n = Number.parseInt(arg, 10);
    if (!Number.isNaN(n) && n >= 0 && n < INTERVIEW_STEP_SEQUENCE.length) return n;
    return 0;
}

/** Sample priors for M5 (Q4 sound) — bittersweet last-train scene, mid energy */
const M5_PRIORS: Partial<InterviewAnswers> = {
    m1: { id: 'last-train-platform', label: 'Last train, wet platform' },
    m2: { id: 'bittersweet-afterglow', label: 'Bittersweet afterglow, not heavy' },
    m3: { id: 'unhurried-sway', label: 'Unhurried sway, not sleepy' }
};

const stepIndex = resolveStepIndex(stepArg);
const priorAnswers = stepIndex >= 3 ? M5_PRIORS : {};

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);

if (!model) {
    console.error('No interview model configured — set OPENAI_API_KEY / INTERVIEW_LLM_MODEL');
    process.exit(1);
}

const stepId = INTERVIEW_STEP_SEQUENCE[stepIndex]?.id ?? 'm1';

console.log(`Model: ${model}`);
console.log(`Mode: ${algorithmMode}`);
console.log(`Step: ${stepId} (index ${stepIndex})`);
console.log('Generating…\n');

const step = await generateInterviewStep(
    env,
    {
        stepIndex,
        priorAnswers,
        rejectedStems: [],
        refresh: false,
        algorithmMode
    },
    model
);

console.log(JSON.stringify(step, null, 2));
