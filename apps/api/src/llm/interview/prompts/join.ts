export function joinSections(...sections: string[]): string {
    return sections.filter((s) => s.trim().length > 0).join('\n\n');
}
