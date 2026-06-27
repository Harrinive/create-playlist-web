export { Q1_COVERAGE_REGIONS, Q1_REGION_IDS } from './q1-regions.js';
export { joinSections } from './join.js';

export {
    formatPriorAnswers,
    rejectedStemsBlock,
    priorContextBlock,
    freshInterviewBlock,
    refreshLine,
    planChecklistBlock,
    buildReviseUserPrompt
} from './fragments.js';

export {
    dimensionGuidance,
    turnLabel,
    isQ1Step,
    isM4Step,
    isM5Step
} from './dimension.js';

export {
    q1CoverageBlock,
    q1PlanContextBlock,
    q1DraftContextBlock,
    q1VerifyContextBlock,
    m4PlainRejectBlock,
    m4AvoidGlossBlock,
    m4ExampleBlock,
    m5FeltAxesBlock,
    sceneFeelingBlock,
    storyM1Block,
    concreteM2Block,
    concreteM3Block,
    logicalDecisionBlock,
    clearDiscriminantBlock,
    storyM2Block,
    storyM3Block
} from './blocks.js';

export { planSystemPrompt, buildPlanUserPrompt } from './plan.js';

export {
    draftSystemPrompt,
    buildDraftUserPrompt,
    reviseCopySystemPrompt,
    type DraftPromptContext
} from './draft-system.js';

export {
    logicVerifySystemPrompt,
    copyVerifySystemPrompt,
    verifySystemPrompt,
    buildLogicVerifyUserPrompt,
    buildCopyVerifyUserPrompt,
    buildVerifyUserPrompt
} from './verify-system.js';

export { fastSystemPrompt, buildFastUserPrompt } from './fast-system.js';

export { storySystemPrompt, buildStoryUserPrompt } from './story-prompts.js';

export {
    BILINGUAL_COPY_RULES,
    CHINESE_LOCALIZATION_RULES,
    buildSceneCopyRules,
    buildM4AvoidCopyRules,
    buildM4DiscriminantCopyRules
} from './sections/bilingual.js';
