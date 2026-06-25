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
        apiUnavailable: 'Interview needs the API — check PUBLIC_API_URL and LLM keys on the server.',
        apiUnreachable:
            'Could not reach the API. Start the server with `npm run dev` in apps/api (http://127.0.0.1:3001).',
        storageError: "Couldn't save your progress — try Start over or free browser storage.",
        resumeUnavailable:
            "Couldn't restore this answered question — re-select your answer below or use Start over."
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
        apiUnavailable: '访谈需要 API — 请检查 PUBLIC_API_URL 及服务器上的 LLM 密钥。',
        apiUnreachable:
            '无法连接 API。请在 apps/api 目录运行 `npm run dev` 启动服务（http://127.0.0.1:3001）。',
        storageError: '无法保存进度 — 请尝试「重新开始」或清理浏览器存储空间。',
        resumeUnavailable: '无法恢复此题 — 请重新选择答案，或使用「重新开始」。'
    }
};
