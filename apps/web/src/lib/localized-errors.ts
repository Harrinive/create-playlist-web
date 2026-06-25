import type { Locale } from './locale';

type Copy = { en: string; zh: string };

function pick(locale: Locale, copy: Copy): string {
    return locale === 'zh' ? copy.zh : copy.en;
}

const API_ERROR_MAP: Record<string, Copy> = {
    'Not authenticated': { en: 'Not authenticated', zh: '未登录 Spotify' },
    'Invalid interview answers': { en: 'Invalid interview answers', zh: '访谈答案无效' },
    'Invalid interview request': { en: 'Invalid interview request', zh: '访谈请求无效' },
    'Invalid prompt request': { en: 'Invalid prompt request', zh: '提示词请求无效' },
    'Invalid verify payload': { en: 'Invalid verify payload', zh: '验证数据无效' },
    'Invalid publish payload': { en: 'Invalid publish payload', zh: '发布数据无效' },
    'Model not available on this server': {
        en: 'Model not available on this server',
        zh: '此服务器不可用该模型'
    },
    'LLM not configured': { en: 'LLM not configured', zh: '服务器未配置 LLM' },
    'Interview LLM not configured': {
        en: 'Interview LLM not configured',
        zh: '服务器未配置访谈 LLM'
    },
    'Interview generation failed': { en: 'Interview generation failed', zh: '访谈生成失败' },
    'Prompt generation failed': { en: 'Prompt generation failed', zh: '提示词生成失败' },
    'Publish failed': { en: 'Publish failed', zh: '发布失败' },
    'Curate failed': { en: 'Curate failed', zh: '曲目生成失败' },
    'Verify failed': { en: 'Verify failed', zh: '验证失败' }
};

const LLM_NOT_CONFIGURED_PREFIX =
    'LLM not configured on this server — set OPENAI_API_KEY or ANTHROPIC_API_KEY on the API';

const GENERIC_FALLBACK: Record<'interview' | 'prompt' | 'build', Copy> = {
    interview: {
        en: 'Interview could not load. Try again or check the API.',
        zh: '访谈加载失败。请重试或检查 API。'
    },
    prompt: {
        en: 'Could not generate the prompt. Try again or start a new interview.',
        zh: '无法生成提示词。请重试或重新开始访谈。'
    },
    build: {
        en: 'Build failed — try again.',
        zh: '创建失败 — 请重试。'
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
    | 'apiUnreachable';

const BUILD_ERRORS: Record<BuildErrorKey, Copy | ((vars: Record<string, string>) => Copy)> = {
    connectionFailed: (vars) => ({
        en: `Connection failed: ${vars.error ?? ''}`,
        zh: `连接失败：${vars.error ?? ''}`
    }),
    devHostMismatch: {
        en: 'Open this site at http://127.0.0.1:4321 (not localhost) so Spotify login can keep your session.',
        zh: '请使用 http://127.0.0.1:4321 打开本站（不要用 localhost），以便 Spotify 登录保持会话。'
    },
    curationModelUnavailable: {
        en: 'Curation model unavailable on this server',
        zh: '此服务器无可用策展模型'
    },
    llmNotConfigured: {
        en: LLM_NOT_CONFIGURED_PREFIX,
        zh: '服务器未配置 LLM — 请在 API 上设置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY'
    },
    curateFailed: { en: 'Curate failed', zh: '曲目生成失败' },
    verifyFailed: { en: 'Verify failed', zh: '验证失败' },
    publishFailed: { en: 'Publish failed', zh: '发布失败' },
    buildFailed: { en: 'Build failed — try again.', zh: '创建失败 — 请重试。' },
    apiUnreachable: {
        en: 'Could not reach the API. Is it running?',
        zh: '无法连接 API。服务是否在运行？'
    }
};

const OAUTH_ERROR_MAP: Record<string, Copy> = {
    access_denied: { en: 'access_denied', zh: '已拒绝授权' },
    auth_failed: { en: 'auth_failed', zh: '授权失败' },
    missing_code: { en: 'missing_code', zh: '缺少授权码' },
    invalid_state: { en: 'invalid_state', zh: '无效状态' },
    expired_state: { en: 'expired_state', zh: '状态已过期' }
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
