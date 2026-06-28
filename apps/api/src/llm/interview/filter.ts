import type { InterviewAnswers } from '../../types/interview.js';
import type { InterviewPlannerState } from '../../types/interview-planner.js';
import { buildM4Context, computeEligibleTraps } from './m4-eligibility.js';

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
    stepId: string,
    prior: Partial<InterviewAnswers>,
    planner?: InterviewPlannerState | null
): string[] {
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

    const m1Region = planner?.m1RegionId ?? '';
    const edgeCharged =
        m1Region === 'edge-charged' ||
        m1Region === 'restless-charged' ||
        hasAny(blob, ['basement', 'parking lot', 'after show', '地下', '停车场']);

    if (stepId === 'm3') {
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

    if (stepId === 'm2') {
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

    if (stepId === 'm1' && hasAny(blob, ['solo', 'sleep', 'intimate', '独处', '睡'])) {
        hints.push('Drop crowded house-party / club-door scene options unless opening widened the frame.');
    }

    const kineticSocialRegion =
        m1Region === 'kinetic-high' || m1Region === 'rhythm-social';
    const postParty = hasAny(blob, ['cake', 'candle', 'party', '蛋糕', '蜡烛']);

    if (stepId === 'm4') {
        const { droppedIds, eligibleIds } = computeEligibleTraps(prior, planner);
        for (const id of droppedIds) {
            hints.push(`DROP trap cluster: ${id}`);
        }
        hints.push(`Eligible trap clusters only: ${eligibleIds.join(', ')}`);

        if (kineticSocialRegion) {
            hints.push(
                'Kinetic/social Q1 region — house/dance warmth and peak-club energy stay reachable unless M2–M3 explicitly ruled them out; do not narrow to folk/ambient from setting nouns alone.'
            );
            hints.push(
                'Do NOT drop club/party/dance/house avoids — kinetic scene may still need those discriminant negatives.'
            );
            hints.push(
                'DO drop calm/acoustic/study/elevator traps — kinetic social scene already ruled them out.'
            );
        }
        if (postParty) {
            hints.push(
                'Drop celebration/party/confetti avoids — scene is already post-party aftermath.'
            );
            hints.push(
                'Drop crowded/busy/bodies-and-noise avoids — post-party aftermath already ruled out party density.'
            );
        }
        if (edgeCharged) {
            hints.push(
                'Do NOT drop aggressive / distortion / loud avoids — edge-charged or restless-charged scene may still need them.'
            );
        } else if (
            !kineticSocialRegion &&
            (buildM4Context(prior, planner).lowSocialHeat || m1Region === 'intimate-still')
        ) {
            hints.push('Drop gym / club / aggressive workout avoids — already implied by calm intimate scene.');
        }
        if (!kinetic && !edgeCharged) {
            hints.push(
                'Keep M4 avoids discriminating — each trap must be a plausible false positive for a remaining hypothesis, not an obvious reject already ruled out by prior picks.'
            );
        }
        hints.push(
            'Each trap must guard a different remaining hypothesis — name the accidental playlist it would wrongly pull toward.'
        );
    }

    return hints;
}
