import type { InterviewAnswers } from '../../types/interview.js';
import { INTERVIEW_STEP_SEQUENCE } from '../../types/interview-step.js';

function labelBlob(prior: Partial<InterviewAnswers>): string {
    const parts: string[] = [];
    for (const value of Object.values(prior)) {
        if (!value) continue;
        if (Array.isArray(value)) parts.push(...value.map((o) => o.label));
        else parts.push(value.label);
    }
    return parts.join(' ').toLowerCase();
}

function hasAny(blob: string, needles: string[]): boolean {
    return needles.some((n) => blob.includes(n));
}

/** Deterministic filter hints from skill § Contextual option filtering (heuristic). */
export function buildFilterHints(
    stepIndex: number,
    prior: Partial<InterviewAnswers>
): string[] {
    const meta = INTERVIEW_STEP_SEQUENCE[stepIndex];
    if (!meta) return [];

    const blob = labelBlob(prior);
    const hints: string[] = [];
    const intimate = hasAny(blob, [
        'solo',
        'alone',
        'quiet',
        'intimate',
        'still',
        'sleep',
        'late',
        'rain',
        'hallway',
        'kitchen',
        '独处',
        '安静',
        '亲密',
        '雨'
    ]);
    const calm = hasAny(blob, [
        'calm',
        'peaceful',
        'tender',
        'wistful',
        'slow',
        'drift',
        '平静',
        '温柔',
        '怅然',
        '慢'
    ]);
    const kinetic = hasAny(blob, [
        'party',
        'crowd',
        'club',
        'gym',
        'dance',
        'high energy',
        'forward',
        '派对',
        '人群',
        '夜店',
        '高能量'
    ]);
    const melancholy = hasAny(blob, ['melanchol', 'sad', 'wistful', 'lonely', '怅', '孤独', '伤感']);

    if (meta.id === 'm3') {
        if (intimate || calm) {
            hints.push('Drop restless / need-motion / high-forward-push energy options.');
        }
        if (kinetic) {
            hints.push('Drop very-slow / barely-moving / sleep-still energy options.');
        }
        if (calm || hasAny(blob, ['drift', '漂浮', '慢而稳'])) {
            hints.push('Drop driving-beat / frantic / gym-pop energy options.');
        }
    }

    if (meta.id === 'm2') {
        if (calm || intimate) {
            hints.push('Drop defiant / charged / hot-urgent emotion options.');
        }
        if (melancholy) {
            hints.push('Drop playful / light / bubbly emotion options.');
        }
        if (hasAny(blob, ['drift', 'slow', 'still', '慢', '静'])) {
            hints.push('Drop defiant / restless-charged emotion options.');
        }
    }

    if (meta.id === 'm1' && hasAny(blob, ['solo', 'sleep', 'intimate', '独处', '睡'])) {
        hints.push('Drop crowded house-party / club-door scene options unless opening widened the frame.');
    }

    if (meta.id === 'm4') {
        if (intimate || calm) {
            hints.push('Drop gym / club / aggressive workout avoids — already implied by calm intimate scene.');
        }
        if (!kinetic) {
            hints.push('Keep M4 avoids discriminating — drop options that are already ruled out by prior picks.');
        }
        hints.push(
            'If fewer than 4 non-obvious avoids remain after filtering, prefer softer / aesthetic avoids over redundant energy negatives.'
        );
    }

    return hints;
}
