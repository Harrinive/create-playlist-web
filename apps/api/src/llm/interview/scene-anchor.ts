import type { InterviewAnswers } from '../../types/interview.js';

export type SceneAnchorContext = {
    m1StemEn?: string;
    m1StemZh?: string;
    m1LabelEn: string;
    m1LabelZh: string;
    m2LabelEn?: string;
    m2LabelZh?: string;
};

/** Build scene anchor block for M2/M3 draft prompts — keeps options in M1 world. */
export function buildSceneAnchorBlock(
    prior: Partial<InterviewAnswers>,
    includeM2 = false
): string {
    if (!prior.m1?.label) return '';

    const m1En = prior.m1.label.trim();
    const m1Zh = m1En;

    const lines = [
        '## Scene anchor (mandatory — stay in this world)',
        `M1 chosen (EN): ${m1En}`,
        `M1 chosen (ZH): ${m1Zh}`
    ];

    if (includeM2 && prior.m2?.label) {
        lines.push(`M2 chosen (EN): ${prior.m2.label.trim()}`);
        lines.push(`M2 chosen (ZH): ${prior.m2.label.trim()}`);
        lines.push(
            'M3 rule: ask what the **body** is doing in this same scene — not tempo labels (Low energy, Upbeat).'
        );
    } else {
        lines.push(
            'M2 rule: advance ONE beat from M1; options = sensory micro-moments in this place — not abstract mood chips (Calm, Restless, Hold me here).'
        );
    }

    return lines.join('\n');
}
