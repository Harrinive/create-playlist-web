import { z } from 'zod';
import type { Env } from '../config.js';
import { completeChat } from '../llm-router/index.js';
import type { InterviewAnswers } from '../types/interview.js';
import {
    type BilingualInterviewStep,
    interviewStepMeta
} from '../types/interview-step.js';

const llmOptionSchema = z.object({
    id: z.string().min(1),
    labelEn: z.string().min(1),
    labelZh: z.string().min(1)
});

const llmStepSchema = z.object({
    stemEn: z.string().min(1),
    stemZh: z.string().min(1),
    hintEn: z.string().optional(),
    hintZh: z.string().optional(),
    options: z.array(llmOptionSchema).min(3)
});

export type GenerateInterviewStepInput = {
    stepIndex: number;
    priorAnswers: Partial<InterviewAnswers>;
    rejectedStems: string[];
    refresh: boolean;
};

const SYSTEM_PROMPT = `You are a music mood interviewer for a playlist app. Invent fresh scene-first questions — never copy example menus from training.

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

function formatPriorAnswers(prior: Partial<InterviewAnswers>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(prior)) {
        if (!value) continue;
        if (Array.isArray(value)) {
            const labels = value.map((o) => o.label).join('; ');
            lines.push(`${key}: ${labels}`);
        } else {
            lines.push(`${key}: ${value.label}`);
        }
    }
    return lines.length > 0 ? lines.join('\n') : '(none yet — this is the opening question)';
}

function dimensionGuidance(stepIndex: number): string {
    const meta = interviewStepMeta(stepIndex);
    if (!meta) return 'Unknown step';
    const guides: Record<string, string> = {
        m1: 'M1 Scene — where does the music start? Immersive place/time image. Partition hypothesis space.',
        m2: 'M2 Emotion — what should the music mainly feel like?',
        m3: 'M3 Energy / tempo — how fast should the pace be?',
        m5: 'M5 Sonic texture (felt-first) — space, weight, density; not instrument shopping.',
        m4: 'M4 Hard avoids — multi-select negatives. Include "none" for open/surprise me.'
    };
    return `${meta.id.toUpperCase()} (${meta.dimension.en}): ${guides[meta.id] ?? ''} Provide ${meta.optionMin}–${meta.optionMax} options.`;
}

function extractJson(raw: string): unknown {
    const trimmed = raw.trim();
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const body = fenceMatch ? fenceMatch[1].trim() : trimmed;
    return JSON.parse(body);
}

function toBilingualStep(stepIndex: number, parsed: z.infer<typeof llmStepSchema>): BilingualInterviewStep {
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

export async function generateInterviewStep(
    env: Env,
    input: GenerateInterviewStepInput,
    model?: string
): Promise<BilingualInterviewStep> {
    const meta = interviewStepMeta(input.stepIndex);
    if (!meta) {
        throw new Error(`Invalid step index ${input.stepIndex}`);
    }

    const rejectedBlock =
        input.rejectedStems.length > 0
            ? `\nRejected stems (invent something clearly different):\n${input.rejectedStems.map((s) => `- ${s}`).join('\n')}`
            : '';

    const userPrompt = `Question ${input.stepIndex + 1} of 5 — ${dimensionGuidance(input.stepIndex)}
${input.refresh ? 'This is a REFRESH — user rejected the previous stem; invent a new scene on the same dimension.' : ''}

Prior answers:
${formatPriorAnswers(input.priorAnswers)}
${rejectedBlock}

Return JSON only.`;

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: SYSTEM_PROMPT },
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
