import { joinSections } from './join.js';
import { buildBilingualCopyRules } from './sections/bilingual.js';
import { creativityRules, musicPatternBan, twoLayerRule } from './sections/bans.js';
import { draftOutputSchema } from './sections/schemas.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import { freshInterviewBlock, priorContextBlock, refreshLine } from './fragments.js';
import { turnLabel } from './dimension.js';
import { buildFastTurnBlocks } from '../fast-turn-config.js';
import { noGlossOutputBlock } from './sections/gloss-rules.js';

export function fastSystemPrompt(): string {
    return joinSections(
        'Music mood interviewer — fast mode, one shot (v4 story-native).',
        twoLayerRule,
        creativityRules,
        musicPatternBan,
        '- M1: 4–6 scene film-stills; MUST span intimate ↔ kinetic social heat AND setting type — at least one kinetic-high, rhythm-social, or edge-charged option when count ≥5; no six quiet-hush or post-social still variants',
        '- M1 stems: place-neutral threshold + pick-a-still invitation — options are different places, so stem must not lock one interior most options ignore',
        '- M2: concrete moment in M1 scene; BGM test; stem must ask/frame — never copy an option chip verbatim',
        '- M3: night-chapter beat in same world; no tempo/body/production vocabulary',
        '- M4: sonic reject question + plain trap-cluster labels + id "none"',
        '- Bilingual EN + ZH; option ids lowercase kebab-case',
        noGlossOutputBlock,
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
    verifyFailures: string[] = []
): string {
    const meta = stepId;
    const optionHint =
        stepId === 'm1'
            ? 'Provide exactly 4–6 options.'
            : stepId === 'm4'
              ? 'Provide 3–5 reject traps plus id "none" (4–6 total).'
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
        ...buildFastTurnBlocks(meta, priorAnswers),
        failureBlock,
        optionHint,
        'Return JSON only.'
    );
}
