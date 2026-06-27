/**
 * Full-chain interview generation for a fixed story path (M1→M4).
 * Usage: npx tsx scripts/orchestrate-path.ts <pathId>
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { emptyPlannerState } from '../src/types/interview-planner.js';
import type { InterviewPlannerState } from '../src/types/interview-planner.js';
import { findInterviewPath, INTERVIEW_PATHS } from './interview-paths.js';

const pathId = process.argv[2];
const preset = pathId ? findInterviewPath(pathId) : undefined;

if (!preset) {
    console.error(`Usage: npx tsx scripts/orchestrate-path.ts <pathId>`);
    console.error(`Paths: ${INTERVIEW_PATHS.map((p) => p.id).join(', ')}`);
    process.exit(1);
}

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);
if (!model) {
    console.error('No interview model configured');
    process.exit(1);
}

const stepOrder = ['m1', 'm2', 'm3', 'm4'] as const;
const priorAnswers: Partial<InterviewAnswers> = {};
let plannerState: InterviewPlannerState = {
    ...emptyPlannerState(),
    ...preset.planner
};

console.log(`Path: ${preset.id} — ${preset.description}`);
console.log(`Model: ${model}\n`);

for (const stepId of stepOrder) {
    const stepIndex = stepOrder.indexOf(stepId);
    const started = Date.now();

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
    const st = result.step;
    plannerState = result.plannerState;

    console.log(`=== ${stepId.toUpperCase()} (${elapsed}s) ===`);
    console.log(`Stem EN: ${st.stem.en}`);
    console.log(`Options (${st.options.length}):`);
    for (const o of st.options) {
        console.log(`  ${o.id}: ${o.label.en}`);
    }
    if (result.plan?.reachableGenresNote) {
        console.log(`reachableGenresNote: ${result.plan.reachableGenresNote.slice(0, 200)}…`);
    }
    if (stepId === 'm4') {
        console.log(`questionMode: ${result.plan?.questionMode} m4Mode: ${plannerState.m4Mode}`);
    }

    const pick = preset.priorAnswers[stepId as keyof InterviewAnswers];
    if (pick && stepId !== 'm4') {
        priorAnswers[stepId as keyof InterviewAnswers] = pick;
        console.log(`>>> Simulated pick: ${pick.label}`);
    }
    console.log('');
}

if (plannerState.interviewStory?.en) {
    console.log('=== STORY ===');
    console.log(plannerState.interviewStory.en);
}
