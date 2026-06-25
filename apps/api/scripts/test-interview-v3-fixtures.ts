/**
 * Tier B fixture checks (deterministic verify only — no LLM).
 * Usage: cd apps/api && npx tsx scripts/test-interview-v3-fixtures.ts
 */
import { verifyDeterministic } from '../src/llm/interview/verify-deterministic.js';
import type { LlmStepDraft, TurnPlan } from '../src/llm/interview/shared.js';

const fixtures: Array<{ name: string; stepId: string; plan: TurnPlan; draft: LlmStepDraft }> = [
    {
        name: 'porch wistful M2',
        stepId: 'm2',
        plan: {
            gaps: ['m2'],
            hypotheses: ['indie folk', 'cool jazz'],
            axis: 'emotion in scene',
            sceneBeat: 'porch rain cooling',
            lateralHook: false,
            filterDrops: [],
            stemGuidance: 'porch dripping',
            optionGuidance: 'felt moments',
            questionMode: 'SceneFeeling',
            optionSlots: {
                'not-going-in': { emotionSlot: 'wistful', function: 'validate' },
                tomorrow: { emotionSlot: 'hopeful', function: 'challenge' },
                gutter: { emotionSlot: 'detached', function: 'validate' },
                still: { emotionSlot: 'calm', function: 'neutral' }
            },
            plannedOptionIds: ['not-going-in', 'tomorrow', 'gutter', 'still']
        },
        draft: {
            stemEn: 'The porch is still dripping — what is true for you right now?',
            stemZh: '门廊还在滴水——此刻什么是真的？',
            options: [
                {
                    id: 'not-going-in',
                    labelEn: 'Rain on the steps — not going back in yet',
                    labelZh: '台阶上的雨——还不打算回去'
                },
                {
                    id: 'tomorrow',
                    labelEn: 'Towel on the railing, already thinking about tomorrow',
                    labelZh: '毛巾搭在栏杆上，已经在想明天'
                },
                {
                    id: 'gutter',
                    labelEn: 'Everything past the gutter looks far away',
                    labelZh: '排水沟那头的世界都很远'
                },
                {
                    id: 'still',
                    labelEn: 'Chair creak, nothing else moving',
                    labelZh: '椅子轻响，别的都不动'
                }
            ]
        }
    }
];

let failed = 0;
for (const fx of fixtures) {
    const result = verifyDeterministic({
        stepId: fx.stepId,
        plan: fx.plan,
        draft: fx.draft,
        optionMin: 4,
        optionMax: 6
    });
    if (result.passed) {
        console.log(`PASS  ${fx.name}`);
    } else {
        failed += 1;
        console.log(`FAIL  ${fx.name}`);
        for (const f of result.failures) console.log(`      - ${f}`);
    }
}

process.exit(failed > 0 ? 1 : 0);
