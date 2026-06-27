/**
 * Generate M4 for preset story contexts (avoid + discriminant paths).
 * Usage: cd apps/api && npx tsx scripts/test-m4-scenarios.ts [scenarioId]
 */
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import { applyM4GateToPlanner, buildStepIds } from '../src/llm/interview/resolve-step.js';
import { computeEligibleTraps } from '../src/llm/interview/m4-eligibility.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { emptyPlannerState, type InterviewPlannerState } from '../src/types/interview-planner.js';

import { INTERVIEW_PATHS } from './interview-paths.js';

export type M4Scenario = {
    id: string;
    description: string;
    priorAnswers: Partial<InterviewAnswers>;
    planner: InterviewPlannerState;
};

function pathToM4Scenario(
    path: (typeof INTERVIEW_PATHS)[number]
): M4Scenario {
    return {
        id: path.id,
        description: path.description,
        priorAnswers: path.priorAnswers,
        planner: { ...emptyPlannerState(), ...path.planner }
    };
}

/** M4-only extras not in full path matrix. */
const M4_ONLY_SCENARIOS: M4Scenario[] = [
    {
        id: 'post-party-kitchen',
        description: 'Post-party kitchen aftermath (party traps dropped)',
        priorAnswers: {
            m1: { id: 'kitchen-after', label: 'Kitchen after the party, cake on the counter' },
            m2: { id: 'quiet-relief', label: 'Quiet relief, candle still lit' },
            m3: { id: 'stacking-plates', label: 'Stacking plates, chairs pushed back' }
        },
        planner: {
            version: 1,
            hypotheses: ['lo-fi unwind', 'soft indie', 'ambient'],
            coverageRisk: false,
            m1RegionId: 'social-mid',
            reachableGenresNote: 'soft indie unwind; peak club ruled out by aftermath'
        }
    },
    {
        id: 'edge-charged-basement',
        description: 'Basement after show edge-charged (aggressive avoids kept)',
        priorAnswers: {
            m1: { id: 'basement-lot', label: 'Basement parking lot after the show' },
            m2: { id: 'charged-buzz', label: 'Ears still ringing, charged buzz in the chest' },
            m3: { id: 'finding-car', label: 'Finding the car through scattered voices' }
        },
        planner: {
            version: 1,
            hypotheses: ['post-punk', 'industrial edge', 'dark electronic'],
            coverageRisk: true,
            needsGrooveGrain: true,
            m1RegionId: 'edge-charged',
            reachableGenresNote: 'post-punk and dark electronic; soft acoustic ruled out'
        }
    }
];

export const M4_SCENARIOS: M4Scenario[] = [
    ...INTERVIEW_PATHS.map(pathToM4Scenario),
    ...M4_ONLY_SCENARIOS
];

export async function runM4Scenario(
    scenario: M4Scenario,
    env = loadEnv(),
    model?: string
) {
    const resolvedModel = model ?? resolveInterviewDefaultModel(env);
    if (!resolvedModel) throw new Error('No interview model configured');

    let plannerState = applyM4GateToPlanner(
        { ...emptyPlannerState(), ...scenario.planner },
        scenario.priorAnswers
    );
    const stepIds = buildStepIds(plannerState);
    const stepIndex = stepIds.indexOf('m4');
    if (stepIndex < 0) throw new Error('m4 not in step sequence');

    const eligibility = computeEligibleTraps(scenario.priorAnswers, plannerState);

    const result = await generateInterviewStep(
        env,
        {
            stepIndex,
            priorAnswers: scenario.priorAnswers,
            rejectedStems: [],
            refresh: false,
            algorithmMode: 'full',
            plannerState
        },
        resolvedModel
    );

    return {
        scenarioId: scenario.id,
        description: scenario.description,
        gate: {
            m4Mode: plannerState.m4Mode,
            eligibleTrapCount: eligibility.eligible.length,
            eligibleTrapIds: eligibility.eligibleIds,
            droppedTrapIds: eligibility.droppedIds,
            impliedAvoids: eligibility.impliedAvoids
        },
        step: {
            id: result.step.id,
            dimension: result.step.dimension,
            multi: result.step.multi,
            stem: result.step.stem,
            options: result.step.options.map((o) => ({
                id: o.id,
                en: o.label.en,
                zh: o.label.zh
            }))
        },
        plan: {
            questionMode: result.plan?.questionMode,
            reachableGenresNote: result.plan?.reachableGenresNote,
            plannedOptionIds: result.plan?.plannedOptionIds,
            filterDrops: result.plan?.filterDrops?.slice(0, 12)
        }
    };
}

async function main() {
    const filter = process.argv[2];
    const scenarios = filter
        ? M4_SCENARIOS.filter((s) => s.id === filter)
        : M4_SCENARIOS;
    if (scenarios.length === 0) {
        console.error(`Unknown scenario: ${filter}`);
        process.exit(1);
    }

    const env = loadEnv();
    const model = resolveInterviewDefaultModel(env);
    if (!model) {
        console.error('No interview model configured');
        process.exit(1);
    }

    const results = [];
    for (const scenario of scenarios) {
        console.error(`Generating M4: ${scenario.id}...`);
        try {
            results.push(await runM4Scenario(scenario, env, model));
        } catch (error) {
            const eligibility = computeEligibleTraps(
                scenario.priorAnswers,
                applyM4GateToPlanner(
                    { ...emptyPlannerState(), ...scenario.planner },
                    scenario.priorAnswers
                )
            );
            results.push({
                scenarioId: scenario.id,
                description: scenario.description,
                error: error instanceof Error ? error.message : String(error),
                gate: {
                    m4Mode: applyM4GateToPlanner(
                        { ...emptyPlannerState(), ...scenario.planner },
                        scenario.priorAnswers
                    ).m4Mode,
                    eligibleTrapIds: eligibility.eligibleIds,
                    droppedTrapIds: eligibility.droppedIds
                }
            });
        }
    }
    console.log(JSON.stringify(results, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
