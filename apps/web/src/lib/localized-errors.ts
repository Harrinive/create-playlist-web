import type { Locale } from './locale';

type Copy = { en: string; zh: string };

function pick(locale: Locale, copy: Copy): string {
    return locale === 'zh' ? copy.zh : copy.en;
}

const API_ERROR_MAP: Record<string, Copy> = {
    'Not authenticated': { en: 'Connect Spotify to continue.', zh: '请先连接 Spotify。' },
    'Invalid interview answers': {
        en: 'Something went wrong with your picks — try the interview again.',
        zh: '选择数据有问题 — 请重新完成访谈。'
    },
    'Invalid interview request': {
        en: 'Something went wrong loading the interview — try again.',
        zh: '访谈加载出错 — 请重试。'
    },
    'Invalid prompt request': {
        en: 'Something went wrong generating the prompt — try again.',
        zh: '提示词生成出错 — 请重试。'
    },
    'Invalid verify payload': {
        en: 'Something went wrong matching songs — try again.',
        zh: '歌曲匹配出错 — 请重试。'
    },
    'Invalid publish payload': {
        en: 'Something went wrong saving the playlist — try again.',
        zh: '歌单保存出错 — 请重试。'
    },
    'Model not available on this server': {
        en: 'That model isn\u2019t available — pick another on delivery.',
        zh: '该模型不可用 — 请在交付页选择其他模型。'
    },
    'LLM not configured': {
        en: 'Generation isn\u2019t available right now.',
        zh: '当前无法生成。'
    },
    'Interview LLM not configured': {
        en: 'Interview isn\u2019t available right now.',
        zh: '访谈暂时不可用。'
    },
    'Interview generation failed': {
        en: 'Couldn\u2019t load the next question — try again.',
        zh: '下一题加载失败 — 请重试。'
    },
    'Prompt generation failed': {
        en: 'Couldn\u2019t write the prompt — try again.',
        zh: '提示词生成失败 — 请重试。'
    },
    'Publish failed': { en: 'Couldn\u2019t save the playlist to Spotify — try again.', zh: '无法保存到 Spotify — 请重试。' },
    'Curate failed': { en: 'Couldn\u2019t build your tracklist — try again.', zh: '曲目生成失败 — 请重试。' },
    'Verify failed': { en: 'Couldn\u2019t match enough songs on Spotify — try again.', zh: 'Spotify 匹配失败 — 请重试。' },
    rate_limited: { en: 'Too many tries — wait a moment and try again.', zh: '尝试次数过多 — 请稍后再试。' },
    'API not configured': {
        en: 'This feature isn\u2019t available right now.',
        zh: '该功能暂时不可用。'
    },
    cooldown_conflict: {
        en: 'Too few songs left after skipping recent playlist repeats.',
        zh: '跳过近期重复歌曲后，剩余曲目过少。'
    }
};

const LLM_NOT_CONFIGURED_PREFIX =
    'LLM not configured on this server — set OPENAI_API_KEY or ANTHROPIC_API_KEY on the API';

const GENERIC_FALLBACK: Record<'interview' | 'prompt' | 'build', Copy> = {
    interview: {
        en: 'Interview couldn\u2019t load. Try again in a moment.',
        zh: '访谈加载失败。请稍后再试。'
    },
    prompt: {
        en: 'Couldn\u2019t generate the prompt. Try again or start a new interview.',
        zh: '无法生成提示词。请重试或重新开始访谈。'
    },
    build: {
        en: 'Something went wrong — try again.',
        zh: '出了点问题 — 请重试。'
    }
};

export type BuildErrorKey =
    | 'connectionFailed'
    | 'devHostMismatch'
    | 'curationModelUnavailable'
    | 'llmNotConfigured'
    | 'curateFailed'
    | 'verifyFailed'
    | 'publishFailed'
    | 'buildFailed'
    | 'apiUnreachable'
    | 'rateLimited'
    | 'repeatConflict'
    | 'spotifyAllowlist';

const BUILD_ERRORS: Record<BuildErrorKey, Copy | ((vars: Record<string, string>) => Copy)> = {
    connectionFailed: (vars) => ({
        en: `Spotify sign-in failed: ${vars.error ?? 'try again'}`,
        zh: `Spotify 连接失败：${vars.error ?? '请重试'}`
    }),
    devHostMismatch: {
        en: 'For Spotify sign-in on your computer, open http://127.0.0.1:4321 instead of localhost.',
        zh: '本地开发时，请用 http://127.0.0.1:4321 打开本站（不要用 localhost），以便 Spotify 登录正常。'
    },
    curationModelUnavailable: {
        en: 'That model isn\u2019t available — choose another on delivery.',
        zh: '该模型不可用 — 请在交付页选择其他模型。'
    },
    llmNotConfigured: {
        en: 'Track generation isn\u2019t set up on this server yet.',
        zh: '服务器尚未配置曲目生成。'
    },
    curateFailed: { en: 'Couldn\u2019t build your tracklist — try again.', zh: '曲目生成失败 — 请重试。' },
    verifyFailed: { en: 'Couldn\u2019t match enough songs on Spotify — try again.', zh: 'Spotify 匹配失败 — 请重试。' },
    publishFailed: { en: 'Couldn\u2019t save the playlist to Spotify — try again.', zh: '无法保存到 Spotify — 请重试。' },
    buildFailed: { en: 'Something went wrong — try again.', zh: '出了点问题 — 请重试。' },
    apiUnreachable: {
        en: 'Can\u2019t reach the server — check your connection and try again.',
        zh: '无法连接服务器 — 请检查网络后重试。'
    },
    rateLimited: {
        en: 'Too many tries — wait a moment and try again.',
        zh: '尝试次数过多 — 请稍后再试。'
    },
    repeatConflict: {
        en: 'Too few songs left after skipping recent playlist repeats. Try regenerating.',
        zh: '跳过近期重复歌曲后剩余过少。请重新生成。'
    },
    spotifyAllowlist: {
        en: 'Spotify sign-in didn\u2019t work. If this app is in Development mode, ask the site owner to add your account to the allowlist.',
        zh: 'Spotify 连接失败。若应用处于开发模式，请联系站点管理员将你的账号加入允许列表。'
    }
};

const OAUTH_ERROR_MAP: Record<string, Copy> = {
    access_denied: {
        en: 'Sign-in was declined — you may need to be on the app allowlist',
        zh: '授权被拒绝 — 你可能需要被加入应用允许列表'
    },
    auth_failed: { en: 'Sign-in didn\u2019t work — try again', zh: '授权失败 — 请重试' },
    missing_code: { en: 'Sign-in was interrupted — try again', zh: '授权未完成 — 请重试' },
    invalid_state: { en: 'Sign-in expired — try again', zh: '授权已过期 — 请重试' },
    expired_state: { en: 'Sign-in expired — try again', zh: '授权已过期 — 请重试' }
};

export function localizeOAuthError(code: string, locale: Locale): string {
    const mapped = OAUTH_ERROR_MAP[code];
    if (mapped) return pick(locale, mapped);
    return code;
}

export function localizeApiError(
    message: string,
    locale: Locale,
    surface: 'interview' | 'prompt' | 'build' = 'build'
): string {
    const trimmed = message.trim();
    if (!trimmed) return pick(locale, GENERIC_FALLBACK[surface]);

    const exact = API_ERROR_MAP[trimmed];
    if (exact) return pick(locale, exact);

    if (trimmed.startsWith(LLM_NOT_CONFIGURED_PREFIX)) {
        return pick(locale, BUILD_ERRORS.llmNotConfigured as Copy);
    }

    if (trimmed === 'Curation model unavailable on this server') {
        return pick(locale, BUILD_ERRORS.curationModelUnavailable as Copy);
    }

    if (trimmed.startsWith('Connection failed:')) {
        const code = trimmed.slice('Connection failed:'.length).trim();
        return localizeBuildError('connectionFailed', locale, { error: localizeOAuthError(code, locale) });
    }

    if (trimmed.startsWith('Interview verify failed')) {
        const detail = trimmed.replace(/^Interview verify failed after \d+ attempts:\s*/i, '');
        return locale === 'zh'
            ? `题目校验未通过：${detail.slice(0, 240)}`
            : 'The next question didn\u2019t pass checks — try again.';
    }

    if (trimmed.startsWith('Interview plan returned invalid JSON')) {
        return locale === 'zh' ? '访谈规划出错，请重试。' : 'Something went wrong planning the interview — try again.';
    }

    if (trimmed.startsWith('Interview draft returned invalid JSON')) {
        return locale === 'zh' ? '题目生成出错，请重试。' : 'Something went wrong writing the question — try again.';
    }

    if (locale === 'zh') return pick(locale, GENERIC_FALLBACK[surface]);
    return trimmed;
}

export function localizeBuildError(
    key: BuildErrorKey,
    locale: Locale,
    vars: Record<string, string> = {}
): string {
    const entry = BUILD_ERRORS[key];
    const copy = typeof entry === 'function' ? entry(vars) : entry;
    return pick(locale, copy);
}
