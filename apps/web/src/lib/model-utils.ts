/** Compare model roster order and ids (interview + curate catalogs). */
export function sameModelIds<T extends { id: string }>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((model, index) => model.id === b[index]?.id);
}
