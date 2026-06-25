/**
 * Smoke test: generate one interview step with default model.
 * Usage: cd apps/api && npx tsx scripts/test-interview-step.ts [fast|full] [step]
 *   step: m1 | m2 | m3 | m4 | m_clarify | 0-4 (default m1)
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { emptyPlannerState } from '../src/types/interview-planner.js';
import { buildStepIds, resolveInterviewStep } from '../src/llm/interview/resolve-step.js';

const modeArg = process.argv[2];
const stepArg = process.argv[3] ?? 'm1';
const algorithmMode = modeArg === 'fast' || modeArg === 'full' ? modeArg : 'full';

function resolveStepIndex(arg: string): number {
    const planner = emptyPlannerState();
    const stepIds = buildStepIds(planner);
    const byId = stepIds.indexOf(arg);
    if (byId >= 0) return byId;
    const n = Number.parseInt(arg, 10);
    if (!Number.isNaN(n) && n >= 0 && n < stepIds.length) return n;
    return 0;
}

/** Sample priors for steps after M1 */
const STEP_PRIORS: Partial<InterviewAnswers> = {
    m1: { id: 'stairwell-cup', label: 'Paper cup, elevator hush' },
    m2: { id: 'bittersweet-afterglow', label: 'Bittersweet afterglow, not heavy' },
    m3: { id: 'unhurried-sway', label: 'Unhurried sway, not sleepy' }
};

function priorsForStepIndex(index: number): Partial<InterviewAnswers> {
    if (index >= 3) return { m1: STEP_PRIORS.m1, m2: STEP_PRIORS.m2, m3: STEP_PRIORS.m3 };
    if (index >= 2) return { m1: STEP_PRIORS.m1, m2: STEP_PRIORS.m2 };
    if (index >= 1) return { m1: STEP_PRIORS.m1 };
    return {};
}

const stepIndex = resolveStepIndex(stepArg);
const priorAnswers = priorsForStepIndex(stepIndex);

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);

if (!model) {
    console.error('No interview model configured — set OPENAI_API_KEY / INTERVIEW_LLM_MODEL');
    process.exit(1);
}

const resolved = resolveInterviewStep(stepIndex, priorAnswers, emptyPlannerState());

console.log(`Model: ${model}`);
console.log(`Mode: ${algorithmMode}`);
console.log(`Step: ${resolved.stepId} (index ${stepIndex})`);
console.log(`Sequence: ${resolved.stepIds.join(' → ')}`);
console.log('Generating…\n');

const result = await generateInterviewStep(
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

console.log(JSON.stringify(result, null, 2));
