import { isInterviewComplete } from './interview-draft';
import { hasInterviewProgress, readInterviewDraft } from './interview-progress';
import { readBuildResult, readPromptReady, type LastDelivery } from './last-delivery';
import { readStoredInterviewAnswers } from './session-answers';

export type HomeProgressActions = {
    interviewLabel: 'start' | 'continue';
    showStartOver: boolean;
    lastOutput: { href: string; kind: LastDelivery } | null;
};

export function getHomeProgressActions(): HomeProgressActions {
    const draft = readInterviewDraft();
    const inProgress = hasInterviewProgress();
    const midInterview = inProgress && !isInterviewComplete(draft);
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
        showStartOver: midInterview,
        lastOutput
    };
}
