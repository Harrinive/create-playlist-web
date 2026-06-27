import { joinSections } from './join.js';
import {
    buildM4AvoidCopyRules,
    buildM4DiscriminantCopyRules,
    buildSceneCopyRules
} from './sections/bilingual.js';
import { verifyOutputSchema } from './sections/schemas.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import { formatPriorAnswers } from './fragments.js';
import { turnLabel } from './dimension.js';
import { m4PlainRejectBlock, q1VerifyContextBlock } from './blocks.js';
import { discriminantBlockForMode } from './sections/positive-discriminant.js';
import type { M4Mode } from '../m4-eligibility.js';
import { musicPatternBan } from './sections/bans.js';
import { noGlossOutputBlock, concreteStoryRules } from './sections/gloss-rules.js';

export function logicVerifySystemPrompt(): string {
    return joinSections(
        'Verify interview LOGIC only (v4 slim). Output JSON only.',
        'Apply only checks listed in the user message focus block for this step/mode — ignore inapplicable M4 avoid vs discriminant rules.',
        musicPatternBan,
        '## Checks (same principles as draft)',
        `1. **Stem-option coherence** — stem sets the scene/question; every option belongs in that frame (no orphan beats or mismatched register)
1b. **Stem ≠ chip** — stemEn/stemZh must not duplicate any option label verbatim (stem frames/asks; options are the picks)
2. **Advance scene** — stem does not caption user's last pick
3. **Story/BGM test** — each option feels like different background music (M2/M3)
4. **Concrete objects/events** on every M2/M3 chip — not mood poetry
5. **Scene continuity** — M2/M3 consistent with all prior answers; same world, no reset
6. **No gloss fields** — omit stemGlossEn/stemGlossZh and option glossEn/glossZh on all steps; full meaning in main labels
6b. **Stem vs hint** — omit hint when stem already asks; hint adds mechanics or missing axis only — never paraphrase the stem ask
7. **Q1** — 4–6 options; distinct scenes; span social heat AND setting type; stem rotates setting family (cozy-weather default anti-pattern); no overlapping beats
8. **M2 register spread** — when kinetic genres survive, options partition distinct moments across social heat — not 3+ crowd-mood variants
9. **M4 avoid only** — includes "none"; non-none labels use plain trap language; distinct trap clusters; drop already-implied avoids
9b. **M4 discriminant only** — NO "none"; positive felt pace/groove/space labels; NO Skip/Avoid trap wording; stem asks what fits
10. **Filter drops** — no option matches filterDrops`,
        noGlossOutputBlock,
        concreteStoryRules,
        verifyOutputSchema
    );
}

export function copyVerifySystemPrompt(stepId?: string, m4Mode?: M4Mode): string {
    let copyRules;
    if (stepId === 'm4' && m4Mode && m4Mode !== 'avoid') {
        copyRules = buildM4DiscriminantCopyRules();
    } else if (stepId === 'm4') {
        copyRules = buildM4AvoidCopyRules();
    } else {
        copyRules = buildSceneCopyRules();
    }

    return joinSections(
        'Verify bilingual COPY only. Output JSON only.',
        'Preserve the register for this step — do not rewrite M4 plain Skip/Avoid traps into imagist scene chips.',
        copyRules,
        verifyOutputSchema
    );
}

export function verifySystemPrompt(): string {
    return joinSections(logicVerifySystemPrompt(), copyVerifySystemPrompt());
}

export function buildLogicVerifyUserPrompt(
    stepIndex: number,
    stepId: string,
    priorAnswers: Partial<InterviewAnswers>,
    planJson: string,
    draftJson: string,
    logicVerifyIntro: string,
    m4Mode?: M4Mode,
    totalSteps = 5
): string {
    const focus =
        stepId === 'm1'
            ? q1VerifyContextBlock()
            : stepId === 'm4' && m4Mode && m4Mode !== 'avoid'
              ? `## M4 discriminant focus\n${discriminantBlockForMode(m4Mode)}`
              : stepId === 'm4'
                ? `## M4 avoid focus\n${m4PlainRejectBlock()}`
                : logicVerifyIntro;

    return joinSections(
        turnLabel(stepIndex, stepId, totalSteps, m4Mode),
        focus,
        `## Turn plan\n${planJson}`,
        `## Draft\n${draftJson}`,
        `## Prior answers\n${formatPriorAnswers(priorAnswers)}`,
        'Return JSON only.'
    );
}

export function buildCopyVerifyUserPrompt(
    stepIndex: number,
    stepId: string,
    priorAnswers: Partial<InterviewAnswers>,
    draftJson: string,
    copyVerifyIntro: string,
    m4Mode?: M4Mode,
    totalSteps = 5
): string {
    return joinSections(
        turnLabel(stepIndex, stepId, totalSteps, m4Mode),
        copyVerifyIntro,
        `## Draft\n${draftJson}`,
        `## Prior answers\n${formatPriorAnswers(priorAnswers)}`,
        'Return JSON only.'
    );
}

export function buildVerifyUserPrompt(
    stepIndex: number,
    priorAnswers: Partial<InterviewAnswers>,
    planJson: string,
    draftJson: string
): string {
    const stepId = 'm1';
    return buildLogicVerifyUserPrompt(
        stepIndex,
        stepId,
        priorAnswers,
        planJson,
        draftJson,
        'Standard logic verify.'
    );
}
