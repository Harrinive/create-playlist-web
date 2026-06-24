import { z } from 'zod';
import type { InterviewAnswers } from '../../types/interview.js';
import { interviewStepMeta } from '../../types/interview-step.js';

export const llmOptionSchema = z.object({
    id: z.string().min(1),
    labelEn: z.string().min(1),
    labelZh: z.string().min(1)
});

export const llmStepSchema = z.object({
    stemEn: z.string().min(1),
    stemZh: z.string().min(1),
    hintEn: z.string().optional(),
    hintZh: z.string().optional(),
    options: z.array(llmOptionSchema).min(3)
});

export type LlmStepDraft = z.infer<typeof llmStepSchema>;

export const turnPlanSchema = z.object({
    gaps: z.array(z.string()),
    hypotheses: z.array(z.string()).min(3),
    axis: z.string().min(1),
    sceneBeat: z.string().min(1),
    lateralHook: z.boolean(),
    filterDrops: z.array(z.string()).default([]),
    q1RegionsToCover: z.array(z.string()).optional(),
    stemGuidance: z.string().min(1),
    optionGuidance: z.string().min(1)
});

export type TurnPlan = z.infer<typeof turnPlanSchema>;

export const verifyResultSchema = z.object({
    passed: z.boolean(),
    failures: z.array(z.string()).default([])
});

export type VerifyResult = z.infer<typeof verifyResultSchema>;

export type InterviewTurnContext = {
    stepIndex: number;
    priorAnswers: Partial<InterviewAnswers>;
    rejectedStems: string[];
    refresh: boolean;
};

export function extractJson(raw: string): unknown {
    const trimmed = raw.trim();
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const body = fenceMatch ? fenceMatch[1].trim() : trimmed;
    return JSON.parse(body);
}

export function formatPriorAnswers(prior: Partial<InterviewAnswers>): string {
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

export function dimensionGuidance(stepIndex: number): string {
    const meta = interviewStepMeta(stepIndex);
    if (!meta) return 'Unknown step';
    const guides: Record<string, string> = {
        m1: 'M1 Scene — where does the music start? Immersive place/time image. Partition hypothesis space across intimate · social-mid · kinetic-high · focus-flow · bittersweet-mid regions.',
        m2: 'M2 Emotion — what should the music mainly feel like? Advance scene; never caption the last pick.',
        m3: 'M3 Energy / tempo — how fast should the pace be? Filter from prior scene + emotion.',
        m5: 'M5 Sonic texture (felt-first) — space, weight, density; not instrument shopping.',
        m4: 'M4 Hard avoids — multi-select negatives. Include "none" for open/surprise me. Skip obvious false positives.'
    };
    return `${meta.id.toUpperCase()} (${meta.dimension.en}): ${guides[meta.id] ?? ''} Target ${meta.optionMin}–${meta.optionMax} options.`;
}

export function rejectedStemsBlock(rejectedStems: string[]): string {
    if (rejectedStems.length === 0) return '';
    return `\nRejected stems (invent something clearly different):\n${rejectedStems.map((s) => `- ${s}`).join('\n')}`;
}
