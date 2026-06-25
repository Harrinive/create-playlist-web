/**
 * House/electronic test path — full chain with planner state, kinetic Q1 pick.
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { emptyPlannerState } from '../src/types/interview-planner.js';
import type { InterviewPlannerState } from '../src/types/interview-planner.js';
import { buildStepIds } from '../src/llm/interview/resolve-step.js';

const KINETIC_RANK = [
    /crowd|packed|crosswalk|neon|bar|club|dance|floor|speakers|everyone moving|music in the next|人群|挤|霓虹|酒吧|舞/,
    /kitchen.*moving|party|warm.*talk|朋友.*聊/
];

function pickKinetic(options: { id: string; label: { en: string } }[]) {
    const skip = /after.?guest|cleanup|plates|sink full|wind.?down|quiet sink|one lamp|收拾|洗碗|盘子|安静/i;
    const score = (o: { id: string; label: { en: string } }) => {
        const text = `${o.id} ${o.label.en}`.toLowerCase();
        if (skip.test(text)) return -1;
        if (/crowd|packed|bar|club|neon|crosswalk|moving|dance|surge|floor|speakers/.test(text)) return 3;
        if (/kitchen|party|talk|friend|warm/.test(text)) return 2;
        return 0;
    };
    return [...options].sort((a, b) => score(b) - score(a))[0] ?? options[0];
}

function pickSocial(options: { id: string; label: { en: string } }[], avoid: RegExp) {
    const score = (o: { id: string; label: { en: string } }) => {
        const text = `${o.id} ${o.label.en}`.toLowerCase();
        if (avoid.test(text)) return -1;
        if (/laugh|social|friend|group|stranger|warm|moving|neon|louder|舞|笑|朋友/.test(text)) return 3;
        if (/watch|still|pocket|quiet|drift|静|站/.test(text)) return 0;
        return 1;
    };
    return [...options].sort((a, b) => score(b) - score(a))[0] ?? options[0];
}

function pickPartyChapter(options: { id: string; label: { en: string } }[]) {
    const score = (o: { id: string; label: { en: string } }) => {
        const text = `${o.id} ${o.label.en}`.toLowerCase();
        if (/moving|louder|neon|group|leave|lights|noise|又| louder|走/.test(text)) return 3;
        if (/still|late|text|curb|等/.test(text)) return 1;
        return 0;
    };
    return [...options].sort((a, b) => score(b) - score(a))[0] ?? options[0];
}

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);
if (!model) process.exit(1);

const priorAnswers: Partial<InterviewAnswers> = {};
let plannerState: InterviewPlannerState = emptyPlannerState();
const stepIds = buildStepIds(plannerState);
const picks: Record<string, string> = {};

for (let stepIndex = 0; stepIndex < stepIds.length; stepIndex += 1) {
    const stepId = stepIds[stepIndex]!;
    let attempts = 0;
    while (attempts < 4) {
        attempts += 1;
        try {
            const result = await generateInterviewStep(
                env,
                {
                    stepIndex,
                    priorAnswers,
                    rejectedStems: [],
                    refresh: attempts > 1,
                    algorithmMode: 'full',
                    plannerState
                },
                model
            );

            const st = result.step;
            plannerState = result.plannerState;

            let pick =
                stepId === 'm1'
                    ? pickKinetic(st.options)
                    : stepId === 'm2'
                      ? pickSocial(st.options, /stack|settl|slow|wind|quiet|静|慢|收/)
                      : stepId === 'm3'
                        ? pickPartyChapter(st.options)
                        : st.options.find((o) => o.id === 'none') ?? st.options[0];

            if (stepId !== 'm4') {
                priorAnswers[stepId as keyof InterviewAnswers] = {
                    id: pick!.id,
                    label: pick!.label.en
                };
                picks[stepId] = `${pick!.id}: ${pick!.label.en}`;
            }

            console.log(`\n=== ${stepId.toUpperCase()} (attempt ${attempts}) ===`);
            console.log(`Stem EN: ${st.stem.en}`);
            console.log(`Options (${st.options.length}):`);
            for (const o of st.options) {
                const mark = stepId === 'm4' ? '' : o.id === pick?.id ? ' ← pick' : '';
                console.log(`  ${o.id}: ${o.label.en}${mark}`);
            }
            console.log(`reachableGenresNote: ${result.plan?.reachableGenresNote?.slice(0, 220)}…`);
            if (stepId === 'm4') {
                console.log(`questionMode: ${result.plan?.questionMode}`);
            }
            break;
        } catch (error) {
            if (stepIndex === 0 && attempts < 4) continue;
            throw error;
        }
    }
}

console.log('\n=== PICKS ===');
console.log(JSON.stringify(picks, null, 2));
console.log('\n=== STORY ===');
console.log(plannerState.interviewStory?.en ?? '(none)');
