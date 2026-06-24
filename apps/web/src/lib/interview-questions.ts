import type { BilingualInterviewStep } from './interview-i18n';
import { toDisplayInterviewStep } from './interview-i18n';
import type { Locale } from './locale';
import type { InterviewOption } from './types';

export type InterviewStep =
    | {
          id: 'm1' | 'm2' | 'm3' | 'm5';
          dimension: string;
          stem: string;
          stemEn?: string;
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
          hint?: string;
          hintEn?: string;
          multi: true;
          options: InterviewOption[];
      };

const BILINGUAL_STEPS: BilingualInterviewStep[] = [
    {
        id: 'm1',
        dimension: { en: 'Scene', zh: '场景' },
        stem: {
            en: 'Night has just fallen — where does the music start?',
            zh: '夜色刚落下——音乐从哪里开始？'
        },
        hint: {
            en: 'Pick the image that matches your moment.',
            zh: '选一个最贴近此刻的画面。'
        },
        multi: false,
        options: [
            {
                id: 'hallway',
                label: { en: 'Quiet hallway, keys just set down', zh: '安静走廊，钥匙刚放下' }
            },
            {
                id: 'rain-car',
                label: { en: 'Back seat, rain on the windows', zh: '后座，雨点打窗' }
            },
            {
                id: 'kitchen',
                label: { en: 'Small kitchen, alone, late', zh: '小厨房，深夜独处' }
            },
            {
                id: 'city-window',
                label: { en: 'Window open, city hum below', zh: '开窗，城市低鸣' }
            },
            {
                id: 'highway',
                label: { en: 'Road still rolling under you', zh: '路还在脚下滚动' }
            }
        ]
    },
    {
        id: 'm2',
        dimension: { en: 'Emotion', zh: '情绪' },
        stem: {
            en: 'What should this music mainly feel like?',
            zh: '你希望音乐主要是什么感觉？'
        },
        multi: false,
        options: [
            {
                id: 'wistful',
                label: { en: 'Wistful, a little unfinished', zh: '怅然，有点未完结' }
            },
            { id: 'calm', label: { en: 'Calm but not empty', zh: '平静但不空' } },
            {
                id: 'hopeful',
                label: { en: 'Quietly hopeful underneath', zh: '底下藏着隐约的希望' }
            },
            {
                id: 'restless',
                label: { en: 'Restless, needs to move', zh: '不安分，需要动起来' }
            },
            {
                id: 'warm',
                label: { en: 'Warm and unhurried', zh: '温暖，不赶时间' }
            }
        ]
    },
    {
        id: 'm3',
        dimension: { en: 'Energy', zh: '能量' },
        stem: { en: 'How fast should the pace be?', zh: '节奏应该多快？' },
        multi: false,
        options: [
            {
                id: 'very-slow',
                label: { en: 'Very slow, barely moving', zh: '很慢，几乎不动' }
            },
            { id: 'slow', label: { en: 'Slow and steady', zh: '慢而稳' } },
            { id: 'medium', label: { en: 'Medium, walking pace', zh: '中等，像走路' } },
            {
                id: 'upbeat',
                label: { en: 'Upbeat but not frantic', zh: '轻快但不疯' }
            },
            {
                id: 'high',
                label: { en: 'High energy, forward push', zh: '高能量，向前推' }
            }
        ]
    },
    {
        id: 'm5',
        dimension: { en: 'Sound', zh: '质感' },
        stem: {
            en: 'What should you hear in the texture?',
            zh: '你希望在质感里听到什么？'
        },
        multi: false,
        options: [
            {
                id: 'acoustic',
                label: {
                    en: 'Close acoustic guitar or fingerpicked strings',
                    zh: '近距木吉他或拨弦'
                }
            },
            {
                id: 'piano',
                label: { en: 'Sparse piano, lots of room', zh: '稀疏钢琴，留白多' }
            },
            {
                id: 'synth',
                label: { en: 'Soft synth pads, wide space', zh: '软合成器，空间宽' }
            },
            {
                id: 'groove',
                label: { en: 'Warm bass, tight groove', zh: '暖低音，紧节奏' }
            },
            {
                id: 'vocals',
                label: {
                    en: 'Distant vocals, intimate not belted',
                    zh: '远处人声，亲密不喊'
                }
            }
        ]
    },
    {
        id: 'm4',
        dimension: { en: 'Avoid', zh: '避开' },
        stem: { en: "Hard no's — skip anything like:", zh: '硬性不要——跳过这类：' },
        hint: { en: 'Select all that apply.', zh: '可多选。' },
        multi: true,
        options: [
            {
                id: 'edm',
                label: { en: 'EDM drops and club energy', zh: 'EDM drop 和夜店感' }
            },
            {
                id: 'gym-pop',
                label: { en: 'Aggressive gym-pop motivation', zh: '激进健身 pop' }
            },
            {
                id: 'distorted',
                label: { en: 'Loud distorted guitars', zh: '失真吉他太响' }
            },
            { id: 'radio', label: { en: 'Slick radio polish', zh: '过于 slick 的电台味' } },
            {
                id: 'none',
                label: { en: "None of these — I'm open", zh: '都可以' }
            }
        ]
    }
];

export function getInterviewSteps(locale: Locale): InterviewStep[] {
    return BILINGUAL_STEPS.map((step) => toDisplayInterviewStep(step, locale) as InterviewStep);
}

/** Fixed interview order (m4 avoid is last). */
export const INTERVIEW_STEP_IDS = ['m1', 'm2', 'm3', 'm5', 'm4'] as const;
export const INTERVIEW_STEP_COUNT = INTERVIEW_STEP_IDS.length;

export const INTERVIEW_BY_LOCALE = {
    en: getInterviewSteps('en'),
    zh: getInterviewSteps('zh')
};

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
        refreshingQuestion: 'Finding another question…'
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
        refreshingQuestion: '正在换一题…'
    }
};
