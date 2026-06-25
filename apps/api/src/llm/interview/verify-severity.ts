/** Split deterministic verify failures — soft ones ship best-effort after retry exhaustion. */
export function partitionDeterministicFailures(failures: string[]): {
    hard: string[];
    soft: string[];
} {
    const hard: string[] = [];
    const soft: string[] = [];

    for (const failure of failures) {
        if (isHardDeterministicFailure(failure)) {
            hard.push(failure);
        } else {
            soft.push(failure);
        }
    }

    return { hard, soft };
}

function isHardDeterministicFailure(failure: string): boolean {
    const hard =
        /option count \d+ outside/i.test(failure) ||
        /missing planned option id/i.test(failure) ||
        /optionSlots key .* missing/i.test(failure) ||
        /M4 missing id "none"/i.test(failure) ||
        /M4 poetic option .* missing gloss/i.test(failure) ||
        /LogicalDecision missing option id "you-decide"/i.test(failure) ||
        /LogicalDecision option .* missing gloss/i.test(failure) ||
        /stemEn matches survey/i.test(failure) ||
        /Q1 missing kinetic/i.test(failure) ||
        /Q1 missing non-domestic/i.test(failure) ||
        /Q1 missing region "/i.test(failure) ||
        /Q1 only \d+ distinct regions/i.test(failure) ||
        /rejectCluster collision/i.test(failure) ||
        /M4 option id .* mood-template too-/i.test(failure);

    return hard;
}
