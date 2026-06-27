import type { InterviewAnswers } from '../../../types/interview.js';
import { joinSections } from './join.js';

export function formatPriorAnswers(prior: Partial<InterviewAnswers>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(prior)) {
        if (!value) continue;
        if (Array.isArray(value)) {
            lines.push(`${key}: ${value.map((o) => o.label).join('; ')}`);
        } else {
            lines.push(`${key}: ${value.label}`);
        }
    }
    return lines.length > 0 ? lines.join('\n') : '(none yet — opening question)';
}

export function rejectedStemsBlock(rejectedStems: string[]): string {
    if (rejectedStems.length === 0) return '';
    return `## Rejected stems\nInvent something clearly different — new setting family and sensory anchor, not a paraphrase:\n${rejectedStems.map((s) => `- ${s}`).join('\n')}`;
}

export function priorContextBlock(prior: Partial<InterviewAnswers>, rejectedStems: string[]): string {
    const parts = [`## Prior answers\n${formatPriorAnswers(prior)}`];
    const rejected = rejectedStemsBlock(rejectedStems);
    if (rejected) parts.push(rejected);
    return parts.join('\n\n');
}

export function freshInterviewBlock(prior: Partial<InterviewAnswers>): string {
    const empty = Object.values(prior).every((v) => !v);
    if (!empty) return '';
    return `## Fresh interview
No prior answers — invent a novel stem and options from scratch.
**M1:** rotate opening world family and sensory anchor — do not default to the same weather-at-window motif every interview.
Do not reuse wording from prompt examples or prior interviews; every scene, prop, and beat must be newly composed.`;
}

export function refreshLine(refresh: boolean, tone: 'plan' | 'draft' | 'fast'): string {
    if (!refresh) return '';
    const messages = {
        plan: 'REFRESH: user rejected the previous stem — plan a clearly different scene on the same axis.',
        draft: 'REFRESH — invent a new stem on the same dimension.',
        fast: 'REFRESH — invent a new scene on the same dimension.'
    };
    return messages[tone];
}

export const planChecklistBlock = `## Your checklist (mandatory — run before planning)
1. Re-read all prior answers above.
2. **reachableGenresNote:** affirm what music flavors/genres **stay reachable** — not only what is ruled out. Derive reachability from **M1 social heat + Q1 regionId** (optionSlots.regionId), not domestic setting nouns alone (kitchen, porch, rain ≠ indie-folk lock-in). Separate distinct registers (e.g. peak-club kinetic vs social-dance warmth) when both could survive.
3. **Kinetic/social Q1 regions:** when M1 regionId is kinetic-high or rhythm-social, affirm social house/dance warmth stays reachable unless M2–M3 answers explicitly ruled it out — do not collapse to folk/ambient from scene props alone.
4. List 2–8 short hypotheses still consistent with answers.
5. Should this question split remaining flavors? If one coherent playlist is obvious, still ask but keep options story-distinct.
6. Choose plannedOptionCount between 2 and 6 (Q1: 4–6). Design that many story options — NOT genre menus.
7. **M2 register spread:** when kinetic genres remain reachable, plan options that span social heat — not five copies of the same energy level.
8. Do not split house vs techno (or similar) in user copy if users cannot feel the difference.
9. **M1 only:** pick one opening world family for the stem (transit, venue, outdoors, domestic, workplace, etc.) — weather optional garnish, not the default sensory lead.`;

export function buildReviseUserPrompt(
    priorAnswers: Partial<InterviewAnswers>,
    rejectedStems: string[],
    planJson: string,
    draftJson: string,
    failures: string[]
): string {
    return joinSections(
        'Revise this interview question. Verification failed:',
        failures.map((f) => `- ${f}`).join('\n'),
        `## Turn plan\n${planJson}`,
        `## Current draft\n${draftJson}`,
        priorContextBlock(priorAnswers, rejectedStems),
        'Fix all failures. Keep the same dimension and option ids. Return revised JSON only.'
    );
}
