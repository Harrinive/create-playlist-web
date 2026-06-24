/**
 * Canonical LLM model roster — edit here when flagship models change.
 * Consumed by interview (Step 1) and curation (Step 2.2.3) pickers on the API.
 * Web dev previews import this file via `apps/web/src/data/model-catalog.ts`.
 */

export type LlmProvider = 'openai' | 'anthropic' | 'cursor';

export type ModelCatalogEntry = {
    id: string;
    provider: LlmProvider;
    /** Shown in sidebar interview model dropdown */
    interview: boolean;
    /** Shown on /delivery curation buttons */
    curation: boolean;
    labelEn: string;
    labelZh: string;
    curationLabelEn: string;
    curationLabelZh: string;
};

/** Single roster — filter by `interview` / `curation` flags per stage. */
export const MODEL_CATALOG: ModelCatalogEntry[] = [
    {
        id: 'cursor:composer-2.5',
        provider: 'cursor',
        interview: false,
        curation: true,
        labelEn: 'Composer 2.5',
        labelZh: 'Composer 2.5',
        curationLabelEn: 'Generate tracklist by Composer 2.5',
        curationLabelZh: '用 Composer 2.5 生成曲目列表'
    },
    {
        id: 'openai:gpt-5.4-mini',
        provider: 'openai',
        interview: true,
        curation: true,
        labelEn: 'GPT-5.4 mini',
        labelZh: 'GPT-5.4 mini',
        curationLabelEn: 'Generate tracklist by GPT-5.4 mini',
        curationLabelZh: '用 GPT-5.4 mini 生成曲目列表'
    },
    {
        id: 'anthropic:claude-haiku-4-5',
        provider: 'anthropic',
        interview: true,
        curation: true,
        labelEn: 'Claude Haiku 4.5',
        labelZh: 'Claude Haiku 4.5',
        curationLabelEn: 'Generate tracklist by Claude Haiku 4.5',
        curationLabelZh: '用 Claude Haiku 4.5 生成曲目列表'
    },
    {
        id: 'anthropic:claude-sonnet-4-6',
        provider: 'anthropic',
        interview: true,
        curation: true,
        labelEn: 'Claude Sonnet 4.6',
        labelZh: 'Claude Sonnet 4.6',
        curationLabelEn: 'Generate tracklist by Claude Sonnet 4.6',
        curationLabelZh: '用 Claude Sonnet 4.6 生成曲目列表'
    }
];

export function interviewCatalogEntries(): ModelCatalogEntry[] {
    return MODEL_CATALOG.filter((entry) => entry.interview);
}

export function curationCatalogEntries(): ModelCatalogEntry[] {
    return MODEL_CATALOG.filter((entry) => entry.curation);
}
