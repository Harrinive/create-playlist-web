/**
 * Generate up to target step with explicit picks, carrying planner state end-to-end.
 * Usage: npx tsx scripts/orchestrate-to-step.ts m4 packed-room-warm soft-laughs laughs-keep-coming
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { emptyPlannerState } from '../src/types/interview-planner.js';
import type { InterviewPlannerState } from '../src/types/interview-planner.js';
import { buildStepIds } from '../src/llm/interview/resolve-step.js';

const targetStepId = process.argv[2] ?? 'm4';
const pickIds = process.argv.slice(3);

const stepIds = buildStepIds(emptyPlannerState());
const targetIndex = stepIds.indexOf(targetStepId);
if (targetIndex < 0) {
    console.error(`Unknown step: ${targetStepId}`);
    process.exit(1);
}

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);
if (!model) {
    console.error('No interview model configured');
    process.exit(1);
}

const priorAnswers: Partial<InterviewAnswers> = {};
let plannerState: InterviewPlannerState = emptyPlannerState();
let lastOutput: unknown;

for (let stepIndex = 0; stepIndex <= targetIndex; stepIndex += 1) {
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

    lastOutput = {
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
        multi: st.multi,
        interviewStory: plannerState.interviewStory,
        plan: {
            plannedOptionCount: result.plan?.plannedOptionCount,
            plannedOptionIds: result.plan?.plannedOptionIds,
            reachableGenresNote: result.plan?.reachableGenresNote,
            questionMode: result.plan?.questionMode
        },
        plannerState: {
            m1RegionId: plannerState.m1RegionId,
            reachableGenresNote: plannerState.reachableGenresNote
        }
    };

    if (stepIndex < targetIndex) {
        const wantId = pickIds[stepIndex];
        const pick = wantId
            ? st.options.find((o) => o.id === wantId) ?? st.options[0]
            : st.options[0];
        if (!pick) throw new Error(`no options on ${st.id}`);
        priorAnswers[st.id as keyof InterviewAnswers] = {
            id: pick.id,
            label: pick.label.en
        };
    }
}

console.log(JSON.stringify(lastOutput, null, 2));
