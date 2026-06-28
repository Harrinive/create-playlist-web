/** All deterministic verify failures block ship — no best-effort soft bucket. */
export function partitionDeterministicFailures(failures: string[]): {
    hard: string[];
    soft: string[];
} {
    return { hard: [...failures], soft: [] };
}
