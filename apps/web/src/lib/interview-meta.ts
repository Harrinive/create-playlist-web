import type { Locale } from './locale';
import type { InterviewOption } from './types';

export type InterviewStep =
    | {
          id: 'm1' | 'm2' | 'm3' | 'm5';
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

/** Fixed interview order (m4 avoid is last). */
export const INTERVIEW_STEP_IDS = ['m1', 'm2', 'm3', 'm5', 'm4'] as const;
export const INTERVIEW_STEP_COUNT = INTERVIEW_STEP_IDS.length;

export const WIZARD_LABELS: Record<
    Locale,
    {
        continue: string;
        chooseDelivery: string;
        question: (n: number, dim: string) => string;
        pleaseWait: string;
        preparingQuestion: string;
        changeConfirm: string;
        done: string;
        refreshQuestion: string;
        refreshingQuestion: string;
        apiUnavailable: string;
    }
> = {
    en: {
        continue: 'Continue',
        chooseDelivery: 'Choose delivery',
        question: (n, dim) => `Question ${n} · ${dim}`,
        pleaseWait: 'Please wait…',
        preparingQuestion: 'Preparing your next question',
        changeConfirm:
            'Change this answer? Everything below will be cleared and you will answer those questions again.',
        done: 'Done',
        refreshQuestion: 'New question',
        refreshingQuestion: 'Finding another question…',
        apiUnavailable: 'Interview needs the API — check PUBLIC_API_URL and LLM keys on the server.'
    },
    zh: {
        continue: '继续',
        chooseDelivery: '选择交付方式',
        question: (n, dim) => `第 ${n} 题 · ${dim}`,
        pleaseWait: '请稍候…',
        preparingQuestion: '正在准备下一题',
        changeConfirm: '更改此答案？下方所有问题将被清除，你需要重新回答。',
        done: '完成',
        refreshQuestion: '换一题',
        refreshingQuestion: '正在换一题…',
        apiUnavailable: '访谈需要 API — 请检查 PUBLIC_API_URL 及服务器上的 LLM 密钥。'
    }
};
