import { hasInterviewProgress } from './interview-progress';
import { readBuildResult, readPromptReady, type LastDelivery } from './last-delivery';
import { readPendingBuild } from './pending-build';
import { readStoredInterviewAnswers } from './session-answers';

export type HomeLastOutputLabel = 'prompt' | 'result' | 'tracklist';

export type HomeProgressActions = {
    interviewLabel: 'start' | 'continue';
    showStartOver: boolean;
    lastOutput: { href: string; kind: LastDelivery; label: HomeLastOutputLabel } | null;
};

export function getHomeProgressActions(): HomeProgressActions {
    const inProgress = hasInterviewProgress();
    const answers = readStoredInterviewAnswers();
    const buildSnapshot = readBuildResult();
    const pendingBuild = readPendingBuild();

    let lastOutput: HomeProgressActions['lastOutput'] = null;
    if (buildSnapshot) {
        lastOutput = { href: '/build', kind: 'build', label: 'result' };
    } else if (pendingBuild && answers) {
        lastOutput = { href: '/build', kind: 'build', label: 'tracklist' };
    } else if (readPromptReady() && answers) {
        lastOutput = { href: '/prompt', kind: 'prompt', label: 'prompt' };
    }

    return {
        interviewLabel: inProgress ? 'continue' : 'start',
        showStartOver: inProgress,
        lastOutput
    };
}
