import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import { interviewStepMeta } from '../../types/interview-step.js';
import {
    dimensionGuidance,
    extractJson,
    formatPriorAnswers,
    llmStepSchema,
    rejectedStemsBlock,
    type InterviewTurnContext,
    type LlmStepDraft,
    type TurnPlan
} from './shared.js';

const DRAFT_SYSTEM = `You are a music mood interviewer for a playlist app. Invent fresh scene-first questions — never copy example menus from training.

Rules:
- One immersive stem + distinct image-led options (~3–7 English words each)
- Advance the scene on a new axis each turn; do not echo the user's last pick in the stem
- Follow the provided turn plan (axis, scene beat, filter drops) exactly
- Option ids: lowercase kebab-case English slugs (e.g. rain-car, warm-close)
- Always output BOTH English and Chinese for stem, hint (if any), and every option label
- Chinese: poetic, sensory, same vibe as English — not stiff literal translation
- M5 (sound): felt-first texture (close/far, weight, density) — not instrument gear menus
- M4 (avoid): multi-select negatives; MUST include id "none" with open/surprise-me meaning
- Do not include a manual "something else" option
- Do NOT include options matching filterDrops themes

Respond with JSON only (no markdown fences):
{
  "stemEn": "...",
  "stemZh": "...",
  "hintEn": "optional short hint",
  "hintZh": "optional",
  "options": [{ "id": "slug", "labelEn": "...", "labelZh": "..." }]
}`;

export async function draftInterviewStep(
    env: Env,
    ctx: InterviewTurnContext,
    plan: TurnPlan,
    model?: string
): Promise<LlmStepDraft> {
    const meta = interviewStepMeta(ctx.stepIndex);
    const optionCount = meta ? `${meta.optionMin}–${meta.optionMax}` : '4–6';

    const userPrompt = `Question ${ctx.stepIndex + 1} of 5 — ${dimensionGuidance(ctx.stepIndex)}
${ctx.refresh ? 'REFRESH — invent a new stem on the same dimension.' : ''}

Turn plan (private — follow closely):
${JSON.stringify(plan, null, 2)}

Prior answers:
${formatPriorAnswers(ctx.priorAnswers)}
${rejectedStemsBlock(ctx.rejectedStems)}

Provide ${optionCount} options. Return JSON only.`;

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: DRAFT_SYSTEM },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = llmStepSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Interview draft returned invalid JSON: ${parsed.error.message}`);
    }

    return parsed.data;
}

export async function reviseInterviewStep(
    env: Env,
    ctx: InterviewTurnContext,
    plan: TurnPlan,
    draft: LlmStepDraft,
    failures: string[],
    model?: string
): Promise<LlmStepDraft> {
    const userPrompt = `Revise this interview question. Verification failed:
${failures.map((f) => `- ${f}`).join('\n')}

Turn plan:
${JSON.stringify(plan, null, 2)}

Current draft:
${JSON.stringify(draft, null, 2)}

Prior answers:
${formatPriorAnswers(ctx.priorAnswers)}
${rejectedStemsBlock(ctx.rejectedStems)}

Fix all failures. Keep the same dimension. Return revised JSON only.`;

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: DRAFT_SYSTEM },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = llmStepSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Interview revise returned invalid JSON: ${parsed.error.message}`);
    }

    return parsed.data;
}
