import siteConfig from '../data/site-config';
import type { Locale } from './locale';

type PageTitle = { en: string; zh: string };

export const PAGE_TITLES: Record<string, PageTitle> = {
    '/': { en: siteConfig.title.en, zh: siteConfig.title.zh },
    '/interview': { en: 'Interview', zh: '访谈' },
    '/delivery': { en: 'Choose delivery', zh: '选择交付方式' },
    '/prompt': { en: 'Your prompt', zh: '你的提示词' },
    '/build': { en: 'Build on Spotify', zh: '在 Spotify 上创建' }
};

export function documentTitle(pathname: string, locale: Locale): string {
    const normalized = pathname.replace(/\/$/, '') || '/';
    const page = PAGE_TITLES[normalized] ?? PAGE_TITLES['/'];
    const segment = locale === 'zh' ? page.zh : page.en;
    const siteName = locale === 'zh' ? siteConfig.title.zh : siteConfig.title.en;
    if (normalized === '/') return segment;
    return `${segment} | ${siteName}`;
}

export function documentDescription(locale: Locale): string {
    return locale === 'zh' ? siteConfig.description.zh : siteConfig.description.en;
}
