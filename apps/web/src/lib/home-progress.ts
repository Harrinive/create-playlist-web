import { hasInterviewProgress } from './interview-progress';
import { readBuildResult, readPromptReady, type LastDelivery } from './last-delivery';
import { readStoredInterviewAnswers } from './session-answers';

export type HomeProgressActions = {
    interviewLabel: 'start' | 'continue';
    showStartOver: boolean;
    lastOutput: { href: string; kind: LastDelivery } | null;
};

export function getHomeProgressActions(): HomeProgressActions {
    const inProgress = hasInterviewProgress();
    const answers = readStoredInterviewAnswers();
    const buildSnapshot = readBuildResult();

    let lastOutput: HomeProgressActions['lastOutput'] = null;
    if (buildSnapshot) {
        lastOutput = { href: '/build', kind: 'build' };
    } else if (readPromptReady() && answers) {
        lastOutput = { href: '/prompt', kind: 'prompt' };
    }

    return {
        interviewLabel: inProgress ? 'continue' : 'start',
        showStartOver: inProgress,
        lastOutput
    };
}
