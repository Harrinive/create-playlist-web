import { joinSections } from './join.js';
import { buildBilingualCopyRules } from './sections/bilingual.js';
import { creativityRules, musicPatternBan, twoLayerRule } from './sections/bans.js';
import { draftOutputSchema } from './sections/schemas.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import type { InterviewPlannerState } from '../../../types/interview-planner.js';
import { freshInterviewBlock, priorContextBlock, refreshLine } from './fragments.js';
import { turnLabel } from './dimension.js';
import { buildFastTurnBlocks } from '../fast-turn-config.js';
import { noGlossOutputBlock } from './sections/gloss-rules.js';
import { stemHintOutputBlock } from './sections/hint-rules.js';

export function fastSystemPrompt(): string {
    return joinSections(
        'Music mood interviewer — fast mode, one shot (v4 story-native).',
        twoLayerRule,
        creativityRules,
        musicPatternBan,
        '- M1: 4–6 scene film-stills; MUST span intimate ↔ kinetic social heat AND setting type — at least one kinetic-high, rhythm-social, or edge-charged option when count ≥5; no six quiet-hush or post-social still variants',
        '- M1 stems: place-neutral threshold + pick-a-still invitation — options are different places; rotate opening world family each fresh interview; weather optional, not default',
        '- M2: concrete moment in M1 scene; BGM test; stem must ask/frame — never copy an option chip verbatim',
        '- M3: night-chapter beat in same world; no tempo/body/production vocabulary',
        '- M4 avoid: M3 prop in stem (film-still) + plain Skip/Avoid trap labels (no scene nouns in options) + id "none"; pick traps only from eligible roster',
        '- M4 discriminant: single-select felt motion/groove/space; NO "none"; stem stays scene, options stay plain felt',
        '- Bilingual EN + ZH; option ids lowercase kebab-case',
        noGlossOutputBlock,
        stemHintOutputBlock,
        buildBilingualCopyRules(),
        '## Output',
        draftOutputSchema
    );
}

export function buildFastUserPrompt(
    stepIndex: number,
    stepId: string,
    priorAnswers: Partial<InterviewAnswers>,
    rejectedStems: string[],
    refresh: boolean,
    totalSteps = 4,
    verifyFailures: string[] = [],
    planner?: InterviewPlannerState | null
): string {
    const meta = stepId;
    const isDiscriminant =
        stepId === 'm4' && planner?.m4Mode != null && planner.m4Mode !== 'avoid';
    const optionHint =
        stepId === 'm1'
            ? 'Provide exactly 4–6 options.'
            : stepId === 'm4'
              ? isDiscriminant
                  ? 'Provide 2–6 single-select felt options. NO id "none". Stem = scene prop; options = plain felt motion/groove/space — no trap-cluster ids.'
                  : 'Provide 3–5 reject traps plus id "none" (4–6 total). Only eligible trap clusters from filter hints. labelEn starts Skip/Avoid; options name traps only — no scene nouns.'
              : 'Provide 2–6 options.';

    const failureBlock =
        verifyFailures.length > 0
            ? joinSections(
                  '## Fix these verification failures',
                  verifyFailures.map((f) => `- ${f}`).join('\n')
              )
            : '';

    return joinSections(
        turnLabel(stepIndex, stepId, totalSteps),
        refreshLine(refresh, 'fast'),
        freshInterviewBlock(priorAnswers),
        priorContextBlock(priorAnswers, rejectedStems),
        ...buildFastTurnBlocks(meta, priorAnswers, planner),
        failureBlock,
        optionHint,
        'Return JSON only.'
    );
}
