import { z } from 'zod';
import type { InterviewAnswers } from '../../types/interview.js';

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

// Re-export prompt helpers for callers outside the interview pipeline.
export {
    BILINGUAL_COPY_RULES,
    CHINESE_LOCALIZATION_RULES,
    Q1_COVERAGE_REGIONS,
    Q1_REGION_IDS,
    dimensionGuidance,
    formatPriorAnswers,
    q1CoverageBlock,
    rejectedStemsBlock,
    turnLabel
} from './prompts.js';
