import type { Locale } from './locale';
import type { InterviewOption } from './types';

export type InterviewStep =
    | {
          id: 'm1' | 'm2' | 'm3' | 'm5';
          dimension: string;
          stem: string;
          hint?: string;
          multi: false;
          options: InterviewOption[];
      }
    | {
          id: 'm4';
          dimension: string;
          stem: string;
          hint?: string;
          multi: true;
          options: InterviewOption[];
      };

const STEPS: Record<Locale, InterviewStep[]> = {
    en: [
        {
            id: 'm1',
            dimension: 'Scene',
            stem: 'Night has just fallen — where does the music start?',
            hint: 'Pick the image that matches your moment.',
            multi: false,
            options: [
                { id: 'hallway', label: 'Quiet hallway, keys just set down' },
                { id: 'rain-car', label: 'Back seat, rain on the windows' },
                { id: 'kitchen', label: 'Small kitchen, alone, late' },
                { id: 'city-window', label: 'Window open, city hum below' },
                { id: 'highway', label: 'Road still rolling under you' }
            ]
        },
        {
            id: 'm2',
            dimension: 'Emotion',
            stem: 'What should this music mainly feel like?',
            multi: false,
            options: [
                { id: 'wistful', label: 'Wistful, a little unfinished' },
                { id: 'calm', label: 'Calm but not empty' },
                { id: 'hopeful', label: 'Quietly hopeful underneath' },
                { id: 'restless', label: 'Restless, needs to move' },
                { id: 'warm', label: 'Warm and unhurried' }
            ]
        },
        {
            id: 'm3',
            dimension: 'Energy',
            stem: 'How fast should the pace be?',
            multi: false,
            options: [
                { id: 'very-slow', label: 'Very slow, barely moving' },
                { id: 'slow', label: 'Slow and steady' },
                { id: 'medium', label: 'Medium, walking pace' },
                { id: 'upbeat', label: 'Upbeat but not frantic' },
                { id: 'high', label: 'High energy, forward push' }
            ]
        },
        {
            id: 'm5',
            dimension: 'Sound',
            stem: 'What should you hear in the texture?',
            multi: false,
            options: [
                { id: 'acoustic', label: 'Close acoustic guitar or fingerpicked strings' },
                { id: 'piano', label: 'Sparse piano, lots of room' },
                { id: 'synth', label: 'Soft synth pads, wide space' },
                { id: 'groove', label: 'Warm bass, tight groove' },
                { id: 'vocals', label: 'Distant vocals, intimate not belted' }
            ]
        },
        {
            id: 'm4',
            dimension: 'Avoid',
            stem: "Hard no's — skip anything like:",
            hint: 'Select all that apply.',
            multi: true,
            options: [
                { id: 'edm', label: 'EDM drops and club energy' },
                { id: 'gym-pop', label: 'Aggressive gym-pop motivation' },
                { id: 'distorted', label: 'Loud distorted guitars' },
                { id: 'radio', label: 'Slick radio polish' },
                { id: 'none', label: "None of these — I'm open" }
            ]
        }
    ],
    zh: [
        {
            id: 'm1',
            dimension: '场景',
            stem: '夜色刚落下——音乐从哪里开始？',
            hint: '选一个最贴近此刻的画面。',
            multi: false,
            options: [
                { id: 'hallway', label: '安静走廊，钥匙刚放下 (Quiet hallway, keys just set down)' },
                { id: 'rain-car', label: '后座，雨点打窗 (Back seat, rain on the windows)' },
                { id: 'kitchen', label: '小厨房，深夜独处 (Small kitchen, alone, late)' },
                { id: 'city-window', label: '开窗，城市低鸣 (Window open, city hum below)' },
                { id: 'highway', label: '路还在脚下滚动 (Road still rolling under you)' }
            ]
        },
        {
            id: 'm2',
            dimension: '情绪',
            stem: '你希望音乐主要是什么感觉？',
            multi: false,
            options: [
                { id: 'wistful', label: '怅然，有点未完结 (Wistful, a little unfinished)' },
                { id: 'calm', label: '平静但不空 (Calm but not empty)' },
                { id: 'hopeful', label: '底下有 quietly 的希望 (Quietly hopeful underneath)' },
                { id: 'restless', label: '不安分，需要动起来 (Restless, needs to move)' },
                { id: 'warm', label: '温暖，不赶时间 (Warm and unhurried)' }
            ]
        },
        {
            id: 'm3',
            dimension: '能量',
            stem: '节奏应该多快？',
            multi: false,
            options: [
                { id: 'very-slow', label: '很慢，几乎不动 (Very slow, barely moving)' },
                { id: 'slow', label: '慢而稳 (Slow and steady)' },
                { id: 'medium', label: '中等，像走路 (Medium, walking pace)' },
                { id: 'upbeat', label: '轻快但不疯 (Upbeat but not frantic)' },
                { id: 'high', label: '高能量，向前推 (High energy, forward push)' }
            ]
        },
        {
            id: 'm5',
            dimension: '质感',
            stem: '你希望在质感里听到什么？',
            multi: false,
            options: [
                { id: 'acoustic', label: '近距木吉他或拨弦 (Close acoustic guitar or fingerpicked strings)' },
                { id: 'piano', label: '稀疏钢琴，留白多 (Sparse piano, lots of room)' },
                { id: 'synth', label: '软合成器，空间宽 (Soft synth pads, wide space)' },
                { id: 'groove', label: '暖 bass，紧 groove (Warm bass, tight groove)' },
                { id: 'vocals', label: '远处人声，亲密不喊 (Distant vocals, intimate not belted)' }
            ]
        },
        {
            id: 'm4',
            dimension: '避开',
            stem: '硬性不要——跳过这类：',
            hint: '可多选。',
            multi: true,
            options: [
                { id: 'edm', label: 'EDM drop 和夜店感 (EDM drops and club energy)' },
                { id: 'gym-pop', label: '激进健身 pop (Aggressive gym-pop motivation)' },
                { id: 'distorted', label: '失真吉他太响 (Loud distorted guitars)' },
                { id: 'radio', label: '过于 slick 的电台味 (Slick radio polish)' },
                { id: 'none', label: '都可以 (None of these — I\'m open)' }
            ]
        }
    ]
};

export function getInterviewSteps(locale: Locale): InterviewStep[] {
    return STEPS[locale];
}

export const INTERVIEW_BY_LOCALE = STEPS;

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
