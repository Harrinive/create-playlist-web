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
        /M4 option .* must not use gloss/i.test(failure) ||
        /M4 option .* needs plain trap language/i.test(failure) ||
        /LogicalDecision missing option id "you-decide"/i.test(failure) ||
        /M1 option .* must not use gloss/i.test(failure) ||
        /stemEn matches survey/i.test(failure) ||
        /Q1 missing kinetic/i.test(failure) ||
        /Q1 missing non-domestic/i.test(failure) ||
        /Q1 missing region "/i.test(failure) ||
        /Q1 only \d+ distinct regions/i.test(failure) ||
        /rejectCluster collision/i.test(failure) ||
        /M4 option id .* mood-template too-/i.test(failure) ||
        /M4 discriminant must not include id "none"/i.test(failure) ||
        /M4 discriminant stem uses avoid/i.test(failure) ||
        /M4 discriminant option .* uses avoid label/i.test(failure) ||
        /M4 discriminant option .* reuses trap-cluster id/i.test(failure) ||
        /M4 option .* matches dropped trap cluster/i.test(failure) ||
        /M4 avoid needs >=3 non-none options/i.test(failure) ||
        /stemEn duplicates option/i.test(failure) ||
        /stemZh duplicates option/i.test(failure) ||
        /stem missing explicit ask/i.test(failure) ||
        /M4 avoid stemZh uses forbidden 变成/i.test(failure) ||
        /M4 discriminant labelZh: too many parallel/i.test(failure) ||
        /hint paraphrases stem ask/i.test(failure) ||
        /M4 hint restates sonic-reject ask/i.test(failure);

    return hard;
}
