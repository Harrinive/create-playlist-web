import { interviewStepMeta } from '../../../types/interview-step.js';
import type { M4Mode } from '../m4-eligibility.js';

const DIMENSION_LINES: Record<string, string> = {
    m1: 'M1 Scene — user picks a place (film-still). Stem = one concrete sensory scene beat + invitation to enter the still. No music/soundtrack vocabulary in stems. 4–6 scene options spanning social heat AND setting type.',
    m2: 'M2 Mood — which moment in this M1 scene is most you? Story-native BGM test; options partition distinct concrete beats; register spread when kinetic genres survive.',
    m3: 'M3 Night chapter — where is tonight in the story? Story beat with objects/events — not tempo or energy labels.',
    m4: 'M4 Avoid — music-logical reject: advance M3 prop, ask what soundtrack must NOT sound like. Multi-select distinct playlist traps; include "none".',
    m_clarify: 'Optional clarify — film-still fork when coverageRisk.'
};

function m4DimensionLine(m4Mode?: M4Mode): string {
    if (m4Mode && m4Mode !== 'avoid') {
        return `M4 Discriminant (${m4Mode}) — positive felt fit: advance M3 prop, ask which groove/pace/space fits. Single-select plain felt labels; NO "none"; NO Skip/Avoid trap wording.`;
    }
    return DIMENSION_LINES.m4;
}

export function dimensionGuidance(
    stepIndex: number,
    stepId?: string,
    m4Mode?: M4Mode
): string {
    const meta = stepId ? { id: stepId } : interviewStepMeta(stepIndex);
    if (!meta) return 'Unknown step';
    const id = stepId ?? interviewStepMeta(stepIndex)?.id ?? 'm1';
    const line = id === 'm4' ? m4DimensionLine(m4Mode) : (DIMENSION_LINES[id] ?? '');
    const fullMeta = interviewStepMeta(stepIndex);
    const min = fullMeta?.optionMin ?? (id === 'm1' ? 4 : 2);
    const max = fullMeta?.optionMax ?? 6;
    const dimEn =
        fullMeta?.dimension.en ??
        (id === 'm_clarify' ? 'Moment' : String(id).toUpperCase());
    return `${String(id).toUpperCase()} (${dimEn}): ${line} Target ${min}–${max} options.`;
}

export function turnLabel(
    stepIndex: number,
    stepId?: string,
    totalSteps = 5,
    m4Mode?: M4Mode
): string {
    const id = stepId ?? interviewStepMeta(stepIndex)?.id ?? 'm1';
    return `Question ${stepIndex + 1} of ${totalSteps} — ${dimensionGuidance(stepIndex, id, m4Mode)}`;
}

export function isQ1Step(stepIndex: number): boolean {
    return interviewStepMeta(stepIndex)?.id === 'm1';
}

export function isM5Step(_stepIndex: number, stepId?: string): boolean {
    return stepId === 'm5';
}

export function isM4Step(stepIndex: number): boolean {
    return interviewStepMeta(stepIndex)?.id === 'm4';
}
