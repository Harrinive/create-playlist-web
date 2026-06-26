import type { Locale } from './locale';

type Bilingual = { en: string; zh: string };

/** Links that leave the current step or return to a prior step in the flow. */
export const FLOW_EXIT_NAV = {
    home: { en: 'Home', zh: '首页' },
    backToInterview: { en: 'Back to interview', zh: '返回访谈' },
    backToDelivery: { en: 'Back to delivery', zh: '返回交付方式' },
    otherDelivery: { en: 'Other delivery', zh: '其他交付方式' }
} as const satisfies Record<string, Bilingual>;

/** Actions that reset or branch within the current step (not route navigation). */
export const FLOW_SESSION_ACTIONS = {
    startOver: { en: 'Start over', zh: '重新开始' }
} as const satisfies Record<string, Bilingual>;

export function flowExitNavText(key: keyof typeof FLOW_EXIT_NAV, locale: Locale): string {
    const copy = FLOW_EXIT_NAV[key];
    return locale === 'zh' ? copy.zh : copy.en;
}

export function flowSessionActionText(key: keyof typeof FLOW_SESSION_ACTIONS, locale: Locale): string {
    const copy = FLOW_SESSION_ACTIONS[key];
    return locale === 'zh' ? copy.zh : copy.en;
}
