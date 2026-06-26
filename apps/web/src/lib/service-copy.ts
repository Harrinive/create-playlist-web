import type { Locale } from './locale';

type Copy = { en: string; zh: string };

function pick(locale: Locale, copy: Copy): string {
    return locale === 'zh' ? copy.zh : copy.en;
}

/** Shown when PUBLIC_API_URL is missing or the feature is unavailable. */
export const SERVICE_UNAVAILABLE_COPY = {
    prompt: {
        en: 'Prompt generation isn\u2019t available right now. Try again later or choose another delivery option.',
        zh: '暂时无法生成提示词。请稍后再试，或选择其他交付方式。'
    },
    build: {
        en: 'Tracklist generation isn\u2019t available right now. Try the Spotify prompt instead.',
        zh: '暂时无法生成曲目。你可以改用 Spotify 提示词。'
    }
} as const satisfies Record<string, Copy>;

export function serviceUnavailableText(key: keyof typeof SERVICE_UNAVAILABLE_COPY, locale: Locale): string {
    return pick(locale, SERVICE_UNAVAILABLE_COPY[key]);
}
