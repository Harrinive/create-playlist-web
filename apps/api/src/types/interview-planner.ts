import { z } from 'zod';

export const openingContextSchema = z.object({
    intent: z.enum(['open', 'vibe']).default('open'),
    reference: z.string().min(1).optional(),
    constraints: z.array(z.string()).optional()
});

export type OpeningContext = z.infer<typeof openingContextSchema>;

/** LLM sometimes sends "none" on early turns — coerce to unset. */
export const lastQuestionModeSchema = z.preprocess(
    (val) => {
        if (val == null || val === 'none' || val === '') return undefined;
        if (val === 'avoid' || val === 'discriminant' || val === 'skip') return val;
        return undefined;
    },
    z.enum(['avoid', 'discriminant', 'skip']).optional()
);

export const interviewStorySchema = z.object({
    en: z.string().min(1),
    zh: z.string().min(1)
});

export const m4ModeSchema = z.enum([
    'avoid',
    'discriminant-1a',
    'discriminant-1b',
    'discriminant-1c'
]);

export type M4Mode = z.infer<typeof m4ModeSchema>;

export const interviewPlannerStateSchema = z.object({
    version: z.literal(1),
    hypotheses: z.array(z.string()).default([]),
    reachableGenresNote: z.string().optional(),
    interviewStory: interviewStorySchema.optional(),
    deliveryGenreNote: z.string().optional(),
    coverageRisk: z.boolean().default(false),
    m1RegionId: z.string().optional(),
    m1SceneId: z.string().optional(),
    needsGrooveGrain: z.boolean().optional(),
    needsClarification: z.boolean().optional(),
    lastQuestionMode: lastQuestionModeSchema,
    inferredM5Draft: z.string().optional(),
    openingContext: openingContextSchema.optional(),
    /** Resolved step ids for this interview session (may grow after M3). */
    stepIds: z.array(z.string()).optional(),
    /** M4 turn mode — avoid multi-select or discriminant single-select */
    m4Mode: m4ModeSchema.optional(),
    eligibleTrapCount: z.number().optional(),
    impliedAvoids: z.array(z.string()).optional(),
    eligibleTrapIds: z.array(z.string()).optional(),
    discriminantAxis: z.string().optional()
});

export type InterviewPlannerState = z.infer<typeof interviewPlannerStateSchema>;

export function emptyPlannerState(openingContext?: OpeningContext): InterviewPlannerState {
    return {
        version: 1,
        hypotheses: [],
        coverageRisk: false,
        openingContext: openingContext ?? { intent: 'open' }
    };
}

export function parsePlannerState(raw: unknown): InterviewPlannerState | null {
    const parsed = interviewPlannerStateSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
}
