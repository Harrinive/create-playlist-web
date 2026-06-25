/**
 * Re-export canonical roster from the API package (same monorepo checkout).
 * Edit models in `apps/api/src/model-catalog.ts`.
 */
export {
    MODEL_CATALOG,
    curationCatalogEntries,
    interviewCatalogEntries,
    type LlmProvider,
    type ModelCatalogEntry
} from '../../../api/src/model-catalog.ts';

import { curationCatalogEntries, interviewCatalogEntries } from '../../../api/src/model-catalog.ts';

export const CATALOG_INTERVIEW_MODELS = interviewCatalogEntries().map((entry) => ({
    id: entry.id,
    labelEn: entry.labelEn,
    labelZh: entry.labelZh
}));

export const CATALOG_CURATE_MODELS = curationCatalogEntries().map((entry) => ({
    id: entry.id,
    labelEn: entry.curationLabelEn,
    labelZh: entry.curationLabelZh
}));
