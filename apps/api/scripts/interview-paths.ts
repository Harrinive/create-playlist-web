/**
 * Fixed interview story paths for regression — shared by orchestrate-path and M4 scenarios.
 */
import type { InterviewAnswers } from '../src/types/interview.js';
import type { InterviewPlannerState } from '../src/types/interview-planner.js';

export type InterviewPathPreset = {
    id: string;
    description: string;
    priorAnswers: Partial<InterviewAnswers>;
    planner?: Partial<InterviewPlannerState>;
};

/** Full M1→M3 story arcs for multi-path prompt regression. */
export const INTERVIEW_PATHS: InterviewPathPreset[] = [
    {
        id: 'deep-prog-house',
        description:
            'Warehouse floor → hypnotic groove → past-midnight build (deep / progressive house lane)',
        priorAnswers: {
            m1: {
                id: 'warehouse-floor',
                label: 'Warehouse floor, bodies in slow orbit under red light'
            },
            m2: {
                id: 'groove-orbit',
                label: 'Shoulders swaying together in the same slow orbit'
            },
            m3: {
                id: 'long-climb',
                label: 'Past midnight, bass climbing, the room not breaking yet'
            }
        },
        planner: {
            version: 1,
            hypotheses: ['deep house', 'progressive house', 'melodic techno warmth'],
            coverageRisk: false,
            m1RegionId: 'kinetic-high',
            reachableGenresNote:
                'deep and progressive house, melodic techno warmth; acoustic folk and sad indie ruled out'
        }
    },
    {
        id: 'intimate-still',
        description: 'Window table after guests — quiet inward lane',
        priorAnswers: {
            m1: { id: 'window-table', label: 'Empty table by the window after guests left' },
            m2: { id: 'last-glass', label: 'The last glass left alone on the table' },
            m3: { id: 'chairs-stacked', label: 'Chairs stacked against the wall, room emptied' }
        },
        planner: {
            version: 1,
            hypotheses: ['intimate indie folk', 'hushed singer-songwriter', 'soft ambient'],
            coverageRisk: false,
            m1RegionId: 'intimate-still',
            reachableGenresNote: 'intimate folk and ambient; peak club energy ruled out'
        }
    },
    {
        id: 'kinetic-neon',
        description: 'Neon doorway → crowd spills → peels for corner (kinetic-high club exit)',
        priorAnswers: {
            m1: { id: 'neon-doorway', label: 'Neon doorway, shoulders brushing fast' },
            m2: { id: 'crowd-spills', label: 'The door opens, crowd spills out' },
            m3: { id: 'peel-corner', label: 'One person peels off for the corner' }
        },
        planner: {
            version: 1,
            hypotheses: ['alt-r&b night', 'indie dance', 'electronic street'],
            coverageRisk: false,
            m1RegionId: 'kinetic-high',
            reachableGenresNote: 'alt-r&b and indie dance; acoustic folk ruled out'
        }
    },
    {
        id: 'car-rain-wistful',
        description: 'Car rain nostalgic drift (melancholy intimate)',
        priorAnswers: {
            m1: { id: 'car-rain', label: 'Car in the rain, windows fogged' },
            m2: { id: 'nostalgic', label: 'Nostalgic, watching wipers trace the glass' },
            m3: { id: 'drifting', label: 'Drifting slow, not going anywhere yet' }
        },
        planner: {
            version: 1,
            hypotheses: ['indie folk', 'sad indie', 'ambient drift'],
            coverageRisk: false,
            m1RegionId: 'intimate-still',
            reachableGenresNote: 'indie folk and ambient drift; club energy ruled out'
        }
    },
    {
        id: 'window-booth-glances',
        description: 'Window booth shared fries → glances → stay by window (social-mid low heat)',
        priorAnswers: {
            m1: { id: 'window-booth', label: 'Booth by the window, shared fries' },
            m2: { id: 'empty-plate', label: 'Empty plate, brighter window, quick glances' },
            m3: { id: 'stay-window', label: 'Stay by the bright window, trading one more look' }
        },
        planner: {
            version: 1,
            hypotheses: ['indie pop mood', 'mellow soul/R&B', 'lounge warmth'],
            coverageRisk: false,
            m1RegionId: 'social-mid',
            reachableGenresNote: 'mellow indie and soul; peak club and gym hype ruled out'
        }
    },
    {
        id: 'tight-discriminant',
        description: 'Kinetic Q1 but M2–M3 wind-down → discriminant-1b fallback',
        priorAnswers: {
            m1: { id: 'solo-bed', label: 'Solo in bed, quiet late night' },
            m2: { id: 'calm-tender', label: 'Calm peaceful tender wistful slow drift' },
            m3: { id: 'barely-moving', label: 'Still drifting, barely moving' }
        },
        planner: {
            version: 1,
            hypotheses: ['ambient', 'classical minimal'],
            coverageRisk: true,
            needsGrooveGrain: false,
            m1RegionId: 'kinetic-high',
            reachableGenresNote:
                'ambient minimal after wind-down; most hype/club traps ruled out by M2–M3 still drift'
        }
    }
];

export function findInterviewPath(id: string): InterviewPathPreset | undefined {
    return INTERVIEW_PATHS.find((p) => p.id === id);
}
