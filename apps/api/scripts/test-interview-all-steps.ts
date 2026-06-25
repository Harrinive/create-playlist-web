/**
 * Full-mode E2E: generate m1 → m2 → m3 → m4 in sequence (mirrors web flow).
 * Usage: cd apps/api && npx tsx scripts/test-interview-all-steps.ts
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { emptyPlannerState } from '../src/types/interview-planner.js';

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);

if (!model) {
    console.error('No interview model configured — set OPENAI_API_KEY / INTERVIEW_LLM_MODEL');
    process.exit(1);
}

const priorAnswers: Partial<InterviewAnswers> = {};
let plannerState = emptyPlannerState();
let stepIds: string[] = [];

console.log(`Model: ${model}`);
console.log('Mode: full\n');

for (let stepIndex = 0; stepIndex < 4; stepIndex += 1) {
    const label = stepIds[stepIndex] ?? `index-${stepIndex}`;
    const started = Date.now();
    process.stdout.write(`[${stepIndex + 1}/4] Generating ${label}… `);

    try {
        const result = await generateInterviewStep(
            env,
            {
                stepIndex,
                priorAnswers,
                rejectedStems: [],
                refresh: false,
                algorithmMode: 'full',
                plannerState
            },
            model
        );

        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        const step = result.step;
        stepIds = result.stepIds;
        plannerState = result.plannerState;

        const pick = step.options[0];
        if (!pick) throw new Error('no options returned');

        priorAnswers[step.id as keyof InterviewAnswers] = {
            id: pick.id,
            label: pick.label.en
        };

        console.log(`OK (${elapsed}s) — ${step.id} "${step.stem.en.slice(0, 48)}…" [${step.options.length} opts]`);
    } catch (error) {
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        console.log(`FAIL (${elapsed}s)`);
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

console.log('\nAll steps generated successfully.');
console.log(`Sequence: ${stepIds.join(' → ')}`);
