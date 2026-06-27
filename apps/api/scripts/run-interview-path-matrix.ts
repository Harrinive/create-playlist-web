/**
 * Run all fixed interview paths (M1→M4 each) and report pass/fail.
 * Usage: npx tsx scripts/run-interview-path-matrix.ts
 */
import type { Env } from '../src/config.js';
import { loadEnv } from '../src/config.js';
import { generateInterviewStep } from '../src/llm/interview.js';
import { resolveInterviewDefaultModel, normalizeInterviewModelId } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';
import { emptyPlannerState } from '../src/types/interview-planner.js';
import type { InterviewPlannerState } from '../src/types/interview-planner.js';
import { verifyDeterministic } from '../src/llm/interview/verify-deterministic.js';
import { partitionDeterministicFailures } from '../src/llm/interview/verify-severity.js';
import { stepMetaForId } from '../src/llm/interview/resolve-step.js';
import { INTERVIEW_PATHS } from './interview-paths.js';

const stepOrder = ['m1', 'm2', 'm3', 'm4'] as const;

type StepResult = {
    stepId: string;
    ok: boolean;
    hardFailures: string[];
    softFailures: string[];
    optionCount: number;
    stemPreview: string;
};

type PathResult = {
    pathId: string;
    ok: boolean;
    steps: StepResult[];
    error?: string;
};

async function runPath(
    env: Env,
    model: string,
    pathId: string,
    priorAnswersTemplate: Partial<InterviewAnswers>,
    plannerSeed: InterviewPlannerState
): Promise<PathResult> {
    const priorAnswers: Partial<InterviewAnswers> = {};
    let plannerState = plannerSeed;
    const steps: StepResult[] = [];

    try {
        for (const stepId of stepOrder) {
            const stepIndex = stepOrder.indexOf(stepId);
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

            plannerState = result.plannerState;
            const meta = stepMetaForId(stepId, plannerState);
            const draft = {
                stemEn: result.step.stem.en,
                stemZh: result.step.stem.zh,
                options: result.step.options.map((o) => ({
                    id: o.id,
                    labelEn: o.label.en,
                    labelZh: o.label.zh
                }))
            };

            const priorLabels = [
                priorAnswers.m1?.label,
                stepId === 'm3' || stepId === 'm4' ? priorAnswers.m2?.label : undefined
            ].filter((l): l is string => Boolean(l?.trim()));

            const det = verifyDeterministic({
                stepId,
                plan: result.plan!,
                draft,
                optionMin: meta.optionMin,
                optionMax: meta.optionMax,
                priorLabels,
                priorAnswers,
                planner: plannerState
            });

            const { hard, soft } = partitionDeterministicFailures(det.failures);
            steps.push({
                stepId,
                ok: hard.length === 0,
                hardFailures: hard,
                softFailures: soft,
                optionCount: result.step.options.length,
                stemPreview: result.step.stem.en.slice(0, 72)
            });

            const pick = priorAnswersTemplate[stepId as keyof InterviewAnswers];
            if (pick && stepId !== 'm4') {
                priorAnswers[stepId as keyof InterviewAnswers] = pick;
            }
        }

        return { pathId, ok: steps.every((s) => s.ok), steps };
    } catch (error) {
        return {
            pathId,
            ok: false,
            steps,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

async function main() {
    const env = loadEnv();
    const modelArg = process.argv[2];
    const models = modelArg
        ? [modelArg]
        : ['openai:gpt-5.4-mini', 'anthropic:claude-haiku-4-5'];

    let totalFail = 0;

    for (const candidate of models) {
        const useModel = normalizeInterviewModelId(env, candidate) ?? candidate;
        if (!useModel.includes(':')) {
            console.error(`Unknown model: ${candidate}`);
            totalFail += 1;
            continue;
        }

        console.error(`\n======== Interview path matrix — model: ${useModel} ========\n`);

        const results: PathResult[] = [];
        for (const path of INTERVIEW_PATHS) {
            console.error(`Running path: ${path.id}…`);
            const plannerState = { ...emptyPlannerState(), ...path.planner };
            results.push(await runPath(env, useModel, path.id, path.priorAnswers, plannerState));
        }

        let failCount = 0;
        for (const r of results) {
            const status = r.ok ? 'PASS' : 'FAIL';
            if (!r.ok) failCount += 1;
            console.log(`\n[${status}] ${r.pathId}`);
            if (r.error) console.log(`  ERROR: ${r.error}`);
            for (const s of r.steps) {
                const mark = s.ok ? 'ok' : 'HARD';
                console.log(`  ${s.stepId} (${mark}, ${s.optionCount} opts): ${s.stemPreview}`);
                for (const f of s.hardFailures) console.log(`    HARD: ${f}`);
                for (const f of s.softFailures.slice(0, 2)) console.log(`    soft: ${f}`);
            }
        }

        console.log(
            `\n=== ${useModel}: ${results.length - failCount}/${results.length} paths pass (no hard det failures) ===`
        );
        totalFail += failCount;
    }

    process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
