import { joinSections } from './join.js';
import { buildBilingualCopyRules } from './sections/bilingual.js';
import { verifyOutputSchema } from './sections/schemas.js';
import type { InterviewAnswers } from '../../../types/interview.js';
import { formatPriorAnswers } from './fragments.js';
import { turnLabel } from './dimension.js';
import { m4AvoidGlossBlock, q1VerifyContextBlock } from './blocks.js';
import { musicPatternBan } from './sections/bans.js';
import { stemGlossRules, optionGlossRules, concreteStoryRules } from './sections/gloss-rules.js';

export function logicVerifySystemPrompt(): string {
    return joinSections(
        'Verify interview LOGIC only (v4 slim). Output JSON only.',
        musicPatternBan,
        '## Checks (same principles as draft)',
        `1. **Stem-option coherence** — stem sets the scene/question; every option belongs in that frame (no orphan beats or mismatched register)
2. **Advance scene** — stem does not caption user's last pick
3. **Story/BGM test** — each option feels like different background music (M2/M3)
4. **Concrete objects/events** on every M2/M3 chip — not mood poetry; no option gloss on M2/M3
5. **Scene continuity** — M2/M3 consistent with all prior answers; same world, no reset
6. **Stem gloss** — omit on M1–M3 unless stem is genuinely obscure (default: omit)
7. **Option gloss** — only when chip is vague (M1 OK); gloss adds concrete info, not mood re-description
8. **Q1** — 4–6 options; distinct scenes; span social heat AND setting type; no overlapping beats
9. **M2 register spread** — when kinetic genres survive, options partition distinct moments across social heat — not 3+ crowd-mood variants
10. **M4** — includes "none"; poetic non-none gloss decodes DISTINCT reject clusters (trap names, not mood-stack paraphrase); no duplicate trap clusters; drop already-implied avoids
11. **Filter drops** — no option matches filterDrops`,
        stemGlossRules,
        optionGlossRules,
        concreteStoryRules,
        verifyOutputSchema
    );
}

export function copyVerifySystemPrompt(): string {
    return joinSections(
        'Verify bilingual COPY only (M4 gloss focus). Output JSON only.',
        buildBilingualCopyRules(),
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
    logicVerifyIntro: string
): string {
    const focus =
        stepId === 'm1'
            ? q1VerifyContextBlock()
            : stepId === 'm4'
              ? `## M4 focus\n${m4AvoidGlossBlock()}`
              : logicVerifyIntro;

    return joinSections(
        turnLabel(stepIndex, stepId),
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
    copyVerifyIntro: string
): string {
    return joinSections(
        turnLabel(stepIndex, stepId),
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
