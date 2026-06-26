import type { Locale } from './locale';
import type { InterviewOption } from './types';

export type InterviewStep =
    | {
          id: 'm1' | 'm2' | 'm3' | 'm5' | 'm_clarify';
          dimension: string;
          stem: string;
          stemEn?: string;
          stemGloss?: string;
          stemGlossEn?: string;
          hint?: string;
          hintEn?: string;
          multi: false;
          options: InterviewOption[];
      }
    | {
          id: 'm4';
          dimension: string;
          stem: string;
          stemEn?: string;
          stemGloss?: string;
          stemGlossEn?: string;
          hint?: string;
          hintEn?: string;
          multi: true;
          options: InterviewOption[];
      };

/** v3 default order — no user m5. */
export const INTERVIEW_STEP_IDS = ['m1', 'm2', 'm3', 'm4'] as const;
export const INTERVIEW_STEP_COUNT = INTERVIEW_STEP_IDS.length;

/** Legacy sequence including user m5 (old sessions). */
export const LEGACY_INTERVIEW_STEP_IDS = ['m1', 'm2', 'm3', 'm5', 'm4'] as const;

export const WIZARD_LABELS: Record<
    Locale,
    {
        question: (n: number, dim: string) => string;
        pleaseWait: string;
        preparingQuestion: string;
        changeConfirm: string;
        done: string;
        refreshQuestion: string;
        refreshingQuestion: string;
        startOver: string;
        chooseDelivery: string;
        apiUnavailable: string;
        apiUnreachable: string;
        storageError: string;
        resumeUnavailable: string;
    }
> = {
    en: {
        question: (n, dim) => `Question ${n} · ${dim}`,
        pleaseWait: 'Please wait…',
        preparingQuestion: 'Preparing your next question',
        changeConfirm:
            'Change this answer? Everything below will be cleared and you will answer those questions again.',
        done: 'Done',
        refreshQuestion: 'New question',
        refreshingQuestion: 'Finding another question…',
        startOver: 'Start over',
        chooseDelivery: 'Choose delivery',
        apiUnavailable: 'Interview isn\u2019t available right now.',
        apiUnreachable: 'Can\u2019t reach the server — check your connection and try again.',
        storageError: 'We couldn\u2019t save your pick — try again or start over.',
        resumeUnavailable: 'Pick your answer again below, or start over.'
    },
    zh: {
        question: (n, dim) => `第 ${n} 题 · ${dim}`,
        pleaseWait: '请稍候…',
        preparingQuestion: '正在准备下一题',
        changeConfirm: '更改此答案？下方所有问题将被清除，你需要重新回答。',
        done: '完成',
        refreshQuestion: '换一题',
        refreshingQuestion: '正在换一题…',
        startOver: '重新开始',
        chooseDelivery: '选择交付方式',
        apiUnavailable: '访谈暂时不可用。',
        apiUnreachable: '无法连接服务器 — 请检查网络后重试。',
        storageError: '未能保存你的选择 — 请重试或重新开始。',
        resumeUnavailable: '请重新选择答案，或重新开始。'
    }
};
