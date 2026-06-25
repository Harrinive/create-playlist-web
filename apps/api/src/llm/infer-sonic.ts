import type { Env } from '../config.js';
import { z } from 'zod';
import { completeChat } from '../llm-router/index.js';
import { resolveInterviewDefaultModel } from './interview-models.js';
import { extractJson } from './interview/shared.js';
import type { InterviewAnswers } from '../types/interview.js';
import type { InterviewPlannerState } from '../types/interview-planner.js';

export type InferredM5 = {
    id: string;
    label: string;
    labelEn: string;
    prose: string;
};

const inferSchema = z.object({
    id: z.string().min(1),
    labelEn: z.string().min(1),
    labelZh: z.string().min(1),
    inferredM5Prose: z.string().min(1)
});

const SYSTEM_PROMPT = `You infer a synthetic M5 sonic palette from interview answers — never shown as a user question.

Output JSON only:
{
  "id": "kebab-case slug",
  "labelEn": "English felt sonic floor (one line)",
  "labelZh": "Chinese felt sonic floor (独立撰写，非翻译)",
  "inferredM5Prose": "2-3 sentences: shared sonic floor when hypotheses plural; concrete timbre/space cues"
}

Rules:
- When hypotheses are plural, describe a broad shared room — not one subgenre
- Felt-first: close/far, weight, density, warmth — not instrument menus
- Honor M4 avoids literally
- English prose in inferredM5Prose`;

function formatAnswersForInfer(answers: Partial<InterviewAnswers>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(answers)) {
        if (!value) continue;
        if (Array.isArray(value)) {
            lines.push(`${key}: ${value.map((o) => o.label).join('; ')}`);
        } else {
            lines.push(`${key}: ${value.label}`);
        }
    }
    return lines.join('\n');
}

export async function inferSonic(
    env: Env,
    answers: Partial<InterviewAnswers> & { m1: InterviewAnswers['m1']; m2: InterviewAnswers['m2']; m3: InterviewAnswers['m3']; m4: InterviewAnswers['m4'] },
    plannerState?: InterviewPlannerState | null,
    model?: string
): Promise<InferredM5> {
    if (answers.m5?.id) {
        return {
            id: answers.m5.id,
            label: answers.m5.label,
            labelEn: answers.m5.label,
            prose: answers.m5.label
        };
    }

    const resolvedModel = model ?? resolveInterviewDefaultModel(env);
    if (!resolvedModel) {
        throw new Error('No interview model configured for sonic inference');
    }

    const hypotheses = plannerState?.hypotheses?.length
        ? plannerState.hypotheses.join(', ')
        : 'not specified';
    const draft = plannerState?.inferredM5Draft ?? '';

    const userPrompt = `Infer synthetic M5 sonic palette.

## Answers
${formatAnswersForInfer(answers)}

## Planner
hypotheses: ${hypotheses}
coverageRisk: ${plannerState?.coverageRisk ?? false}
inferredM5Draft: ${draft || '(none)'}

Return JSON only.`;

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ],
        { model: resolvedModel }
    );

    const parsed = inferSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Sonic inference returned invalid JSON: ${parsed.error.message}`);
    }

    return {
        id: parsed.data.id,
        label: parsed.data.labelEn,
        labelEn: parsed.data.labelEn,
        prose: parsed.data.inferredM5Prose
    };
}

export function answersWithInferredM5(
    answers: InterviewAnswers,
    inferred: InferredM5
): InterviewAnswers {
    if (answers.m5?.id) return answers;
    return {
        ...answers,
        m5: { id: inferred.id, label: inferred.labelEn }
    };
}
