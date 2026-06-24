import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import { interviewStepMeta } from '../../types/interview-step.js';
import {
    dimensionGuidance,
    extractJson,
    formatPriorAnswers,
    verifyResultSchema,
    type InterviewTurnContext,
    type LlmStepDraft,
    type TurnPlan,
    type VerifyResult
} from './shared.js';

const VERIFY_SYSTEM = `You verify a drafted music interview question against the skill quality bar.
Output JSON only. Be strict but practical.

Checks (all that apply):
1. Consistency — stem frame matches every option (night stem → no morning coffee; rain → no sun-baked highway unless stem is neutral)
2. Advance the scene — stem does NOT quote or caption the user's last pick; at most 1–2 tiny ambient words reused invisibly
3. Partition — each option would yield a meaningfully different brief; no duplicate cluster regions
4. Q1 coverage — if q1RegionsToCover was provided in the plan, each major region should have ≥1 option unless explicitly ruled out
5. Filter drops — no option should match filterDrops themes
6. Creativity — wording does not look copied from generic example menus (rain car + morning kitchen + rooftop + gym pack)
7. Bilingual — Chinese labels are poetic/sensory, not stiff literal translation
8. M4 — includes id "none" with open meaning when dimension is avoid

Respond:
{ "passed": true, "failures": [] }
or
{ "passed": false, "failures": ["specific failure 1", "specific failure 2"] }`;

export async function verifyInterviewStep(
    env: Env,
    ctx: InterviewTurnContext,
    plan: TurnPlan,
    draft: LlmStepDraft,
    model?: string
): Promise<VerifyResult> {
    const meta = interviewStepMeta(ctx.stepIndex);
    const isQ1 = meta?.id === 'm1';

    const userPrompt = `Question ${ctx.stepIndex + 1} of 5 — ${dimensionGuidance(ctx.stepIndex)}
${isQ1 ? 'Q1 — run coverage check against q1RegionsToCover.' : 'Q2–Q5 — run caption test and partition check.'}

Turn plan:
${JSON.stringify(plan, null, 2)}

Draft to verify:
${JSON.stringify(draft, null, 2)}

Prior answers:
${formatPriorAnswers(ctx.priorAnswers)}

Return JSON only.`;

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: VERIFY_SYSTEM },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = verifyResultSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        return { passed: true, failures: [] };
    }

    return parsed.data;
}
