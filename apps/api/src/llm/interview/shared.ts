import { z } from 'zod';
import type { InterviewAnswers } from '../../types/interview.js';
import { lastQuestionModeSchema } from '../../types/interview-planner.js';

export const llmOptionSchema = z.object({
    id: z.string().min(1),
    labelEn: z.string().min(1),
    labelZh: z.string().min(1),
    glossEn: z.string().min(1).optional(),
    glossZh: z.string().min(1).optional()
});

export const llmStepSchema = z.object({
    stemEn: z.string().min(1),
    stemZh: z.string().min(1),
    stemGlossEn: z.string().min(1).optional(),
    stemGlossZh: z.string().min(1).optional(),
    hintEn: z.string().optional(),
    hintZh: z.string().optional(),
    options: z.array(llmOptionSchema).min(2)
});

export type LlmStepDraft = z.infer<typeof llmStepSchema>;

export type QuestionMode = 'SceneFeeling' | 'LogicalDecision' | 'ClearDiscriminant';

const QUESTION_MODE_VALUES = [
    'SceneFeeling',
    'LogicalDecision',
    'ClearDiscriminant'
] as const satisfies readonly QuestionMode[];

/** LLMs often emit dimension names (Emotion) instead of planner enum — normalize before validate. */
const QUESTION_MODE_ALIASES: Record<string, QuestionMode> = {
    SceneFeeling: 'SceneFeeling',
    Scene: 'SceneFeeling',
    Feeling: 'SceneFeeling',
    Emotion: 'SceneFeeling',
    emotion: 'SceneFeeling',
    LogicalDecision: 'LogicalDecision',
    Decision: 'LogicalDecision',
    Logical: 'LogicalDecision',
    ClearDiscriminant: 'ClearDiscriminant',
    Discriminant: 'ClearDiscriminant',
    Avoid: 'ClearDiscriminant'
};

function normalizeQuestionMode(val: unknown): QuestionMode | undefined {
    if (typeof val !== 'string') return undefined;
    const key = val.trim();
    if ((QUESTION_MODE_VALUES as readonly string[]).includes(key)) {
        return key as QuestionMode;
    }
    return QUESTION_MODE_ALIASES[key];
}

export const questionModeSchema = z.preprocess(
    (val) => normalizeQuestionMode(val),
    z.enum(QUESTION_MODE_VALUES).optional().default('SceneFeeling')
);

export const optionSlotSchema = z.object({
    emotionSlot: z.string().min(1).optional(),
    tempoSlot: z.string().min(1).optional(),
    function: z.enum(['validate', 'challenge', 'neutral']).optional(),
    rejectCluster: z.string().min(1).optional(),
    regionId: z.string().min(1).optional()
});

export type OptionSlot = z.infer<typeof optionSlotSchema>;

function preprocessTurnPlan(val: unknown): unknown {
    if (typeof val !== 'object' || val === null) return val;
    const o = val as Record<string, unknown>;
    const plannedIds = o.plannedOptionIds;
    const idCount = Array.isArray(plannedIds) ? plannedIds.length : 0;

    return {
        ...o,
        gaps: Array.isArray(o.gaps) ? o.gaps : [],
        reachableGenresNote:
            typeof o.reachableGenresNote === 'string' && o.reachableGenresNote.trim()
                ? o.reachableGenresNote
                : 'Reachable genres still open based on prior answers.',
        hypotheses:
            Array.isArray(o.hypotheses) && o.hypotheses.length >= 2
                ? o.hypotheses
                : ['mixed', 'open'],
        plannedOptionCount:
            typeof o.plannedOptionCount === 'number'
                ? o.plannedOptionCount
                : idCount >= 2
                  ? Math.min(6, idCount)
                  : 4,
        filterDrops: Array.isArray(o.filterDrops) ? o.filterDrops : [],
        optionSlots: o.optionSlots && typeof o.optionSlots === 'object' ? o.optionSlots : {}
    };
}

export const turnPlanSchema = z.preprocess(
    preprocessTurnPlan,
    z.object({
    gaps: z.array(z.string()),
    reachableGenresNote: z.string().min(1),
    hypotheses: z.array(z.string()).min(2),
    plannedOptionCount: z.number().int().min(2).max(6),
    axis: z.string().min(1),
    sceneBeat: z.string().min(1),
    lateralHook: z.boolean(),
    filterDrops: z.array(z.string()).default([]),
    q1RegionsToCover: z.array(z.string()).optional(),
    stemGuidance: z.string().min(1),
    optionGuidance: z.string().min(1),
    questionMode: questionModeSchema.default('SceneFeeling'),
    optionSlots: z.record(z.string(), optionSlotSchema).default({}),
    plannedOptionIds: z.array(z.string()).min(2).max(6).optional(),
    m1SceneAnchor: z.string().optional(),
    coverageRisk: z.boolean().optional(),
    needsGrooveGrain: z.boolean().optional(),
    needsClarification: z.boolean().optional(),
    lastQuestionMode: lastQuestionModeSchema,
    inferredM5Draft: z.string().nullish(),
    m1RegionId: z.string().optional()
    })
);

export type TurnPlan = z.infer<typeof turnPlanSchema>;

export const verifyResultSchema = z.object({
    passed: z.boolean(),
    failures: z.array(z.string()).default([])
});

export type VerifyResult = z.infer<typeof verifyResultSchema>;

export type InterviewTurnContext = {
    stepIndex: number;
    stepId?: string;
    priorAnswers: Partial<InterviewAnswers>;
    rejectedStems: string[];
    refresh: boolean;
    plannerState?: import('../../types/interview-planner.js').InterviewPlannerState;
    openingContext?: import('../../types/interview-planner.js').OpeningContext;
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
