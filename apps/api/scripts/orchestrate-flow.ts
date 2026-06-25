/**
 * Run interview steps in sequence with accumulating answers + planner state.
 * Usage: npx tsx scripts/orchestrate-flow.ts [maxSteps]
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { emptyPlannerState } from '../src/types/interview-planner.js';
import type { InterviewPlannerState } from '../src/types/interview-planner.js';

const maxSteps = Number.parseInt(process.argv[2] ?? '4', 10);
const pickIndex = Number.parseInt(process.argv[3] ?? '0', 10);

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);
if (!model) {
    console.error('No interview model configured');
    process.exit(1);
}

const priorAnswers: Partial<InterviewAnswers> = {};
let plannerState: InterviewPlannerState = emptyPlannerState();

for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
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

    const st = result.step;
    plannerState = result.plannerState;

    const output = {
        stepIndex,
        id: st.id,
        stem: st.stem,
        options: st.options.map((o) => ({
            id: o.id,
            en: o.label.en,
            zh: o.label.zh,
            gloss: o.gloss
        })),
        optionCount: st.options.length,
        interviewStory: plannerState.interviewStory,
        plan: {
            plannedOptionCount: result.plan?.plannedOptionCount,
            reachableGenresNote: result.plan?.reachableGenresNote,
            questionMode: result.plan?.questionMode
        }
    };

    console.log(`\n=== STEP ${stepIndex + 1}: ${st.id} ===`);
    console.log(JSON.stringify(output, null, 2));

    const pick = st.options[pickIndex] ?? st.options[0];
    if (!pick) break;

    priorAnswers[st.id as keyof InterviewAnswers] = {
        id: pick.id,
        label: pick.label.en
    };
    console.log(`\n>>> Picked option ${pickIndex}: ${pick.label.en}`);
}

console.log('\n=== FINAL ANSWERS ===');
console.log(JSON.stringify(priorAnswers, null, 2));
if (plannerState.interviewStory) {
    console.log('\n=== STORY ===');
    console.log(JSON.stringify(plannerState.interviewStory, null, 2));
}
