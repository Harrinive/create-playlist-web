import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import {
    type BilingualInterviewStep,
    interviewStepMeta
} from '../../types/interview-step.js';
import { draftInterviewStep, reviseInterviewStep } from './draft.js';
import { planInterviewTurn } from './plan.js';
import {
    dimensionGuidance,
    extractJson,
    formatPriorAnswers,
    llmStepSchema,
    rejectedStemsBlock,
    type InterviewTurnContext,
    type LlmStepDraft
} from './shared.js';
import { verifyInterviewStep } from './verify.js';

export type GenerateInterviewStepInput = InterviewTurnContext & {
    algorithmMode?: 'fast' | 'full';
};

const FAST_SYSTEM = `You are a music mood interviewer for a playlist app. Invent fresh scene-first questions — never copy example menus from training.

Rules:
- One immersive stem + distinct image-led options (~3–7 English words each)
- Advance the scene on a new axis each turn; do not echo the user's last pick in the stem
- Filter options silently from prior answers (time-of-day, mood, energy must stay consistent)
- Option ids: lowercase kebab-case English slugs (e.g. rain-car, warm-close)
- Always output BOTH English and Chinese for stem, hint (if any), and every option label
- Chinese: poetic, sensory, same vibe as English — not stiff literal translation
- Q1 (scene): 5–8 options partitioning different worlds
- Q2–Q4: 4–6 options
- M5 (sound): felt-first texture (close/far, weight, density) — not instrument gear menus
- M4 (avoid): multi-select negatives; MUST include id "none" with open/surprise-me meaning
- Do not include a manual "something else" option

Respond with JSON only (no markdown fences):
{
  "stemEn": "...",
  "stemZh": "...",
  "hintEn": "optional short hint",
  "hintZh": "optional",
  "options": [{ "id": "slug", "labelEn": "...", "labelZh": "..." }]
}`;

function toBilingualStep(stepIndex: number, parsed: LlmStepDraft): BilingualInterviewStep {
    const meta = interviewStepMeta(stepIndex);
    if (!meta) {
        throw new Error(`Invalid step index ${stepIndex}`);
    }

    let options = parsed.options.map((option) => ({
        id: option.id,
        label: { en: option.labelEn.trim(), zh: option.labelZh.trim() }
    }));

    if (meta.multi) {
        const hasNone = options.some((o) => o.id === 'none');
        if (!hasNone) {
            options = [
                ...options,
                {
                    id: 'none',
                    label: { en: "None of these — I'm open", zh: '都可以' }
                }
            ];
        }
    }

    const step: BilingualInterviewStep = {
        id: meta.id,
        dimension: { ...meta.dimension },
        stem: { en: parsed.stemEn.trim(), zh: parsed.stemZh.trim() },
        multi: meta.multi,
        options
    };

    if (parsed.hintEn?.trim() && parsed.hintZh?.trim()) {
        step.hint = { en: parsed.hintEn.trim(), zh: parsed.hintZh.trim() };
    }

    return step;
}

async function generateInterviewStepFast(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<BilingualInterviewStep> {
    const meta = interviewStepMeta(input.stepIndex);
    if (!meta) {
        throw new Error(`Invalid step index ${input.stepIndex}`);
    }

    const userPrompt = `Question ${input.stepIndex + 1} of 5 — ${dimensionGuidance(input.stepIndex)}
${input.refresh ? 'This is a REFRESH — user rejected the previous stem; invent a new scene on the same dimension.' : ''}

Prior answers:
${formatPriorAnswers(input.priorAnswers)}
${rejectedStemsBlock(input.rejectedStems)}

Return JSON only.`;

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: FAST_SYSTEM },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = llmStepSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Interview LLM returned invalid JSON: ${parsed.error.message}`);
    }

    return toBilingualStep(input.stepIndex, parsed.data);
}

async function generateInterviewStepFull(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<BilingualInterviewStep> {
    const meta = interviewStepMeta(input.stepIndex);
    if (!meta) {
        throw new Error(`Invalid step index ${input.stepIndex}`);
    }

    const plan = await planInterviewTurn(env, input, model);
    let draft = await draftInterviewStep(env, input, plan, model);

    const verification = await verifyInterviewStep(env, input, plan, draft, model);
    if (!verification.passed && verification.failures.length > 0) {
        draft = await reviseInterviewStep(env, input, plan, draft, verification.failures, model);
    }

    return toBilingualStep(input.stepIndex, draft);
}

export function resolveInterviewAlgorithmMode(
    env: Env,
    override?: 'fast' | 'full'
): 'fast' | 'full' {
    if (override === 'fast' || override === 'full') return override;
    const mode = env.INTERVIEW_ALGORITHM_MODE ?? 'full';
    return mode === 'fast' ? 'fast' : 'full';
}

export async function generateInterviewStep(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<BilingualInterviewStep> {
    const mode = resolveInterviewAlgorithmMode(env, input.algorithmMode);
    if (mode === 'fast') {
        return generateInterviewStepFast(env, input, model);
    }
    return generateInterviewStepFull(env, input, model);
}
