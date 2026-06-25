import type { InterviewAnswers } from '../../types/interview.js';

/** Build scene anchor block for M2/M3 draft prompts — keeps options in prior scene world. */
export function buildSceneAnchorBlock(
    prior: Partial<InterviewAnswers>,
    includeM2 = false
): string {
    const lines = ['## Prior answers (mandatory — stay consistent)'];

    if (prior.m1?.label) {
        lines.push(`M1 chosen (EN): ${prior.m1.label.trim()}`);
        lines.push(`M1 chosen (ZH): ${prior.m1.label.trim()}`);
    }

    if (includeM2 && prior.m2?.label) {
        lines.push(`M2 chosen (EN): ${prior.m2.label.trim()}`);
        lines.push(`M2 chosen (ZH): ${prior.m2.label.trim()}`);
    }

    if (includeM2) {
        lines.push(
            'M3 rule: next question and options must stay **consistent with all prior answers** — same scene story, no reset.'
        );
    } else {
        lines.push(
            'M2 rule: next question and options must stay **consistent with M1** — same place, props, and atmosphere the user already chose.'
        );
    }

    return lines.length > 1 ? lines.join('\n') : '';
}
