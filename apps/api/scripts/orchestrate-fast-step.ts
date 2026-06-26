/**
 * Generate one fast-mode step with optional prior answers JSON.
 * Usage: npx tsx scripts/orchestrate-fast-step.ts <stepId|index> '[priorAnswersJson]'
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { emptyPlannerState } from '../src/types/interview-planner.js';
import { buildStepIds } from '../src/llm/interview/resolve-step.js';

const stepArg = process.argv[2] ?? 'm1';
const priorJson = process.argv[3] ?? '{}';
const priorAnswers = JSON.parse(priorJson) as Partial<InterviewAnswers>;
const stepIds = buildStepIds(emptyPlannerState());
const stepIndex = stepIds.indexOf(stepArg) >= 0 ? stepIds.indexOf(stepArg) : Number.parseInt(stepArg, 10);

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);
if (!model) process.exit(1);

const result = await generateInterviewStep(
    env,
    {
        stepIndex,
        priorAnswers,
        rejectedStems: [],
        refresh: false,
        algorithmMode: 'fast',
        plannerState: emptyPlannerState()
    },
    model
);

const st = result.step;
console.log(
    JSON.stringify(
        {
            stepIndex,
            mode: 'fast',
            id: st.id,
            stem: st.stem,
            options: st.options.map((o) => ({
                id: o.id,
                en: o.label.en,
                zh: o.label.zh,
                gloss: o.gloss
            })),
            optionCount: st.options.length
        },
        null,
        2
    )
);
