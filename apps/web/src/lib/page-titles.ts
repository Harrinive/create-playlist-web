import siteConfig from '../data/site-config';
import { FLOW_PAGE_HEADINGS } from './flow-steps';
import type { Locale } from './locale';

type PageTitle = { en: string; zh: string };

export const PAGE_TITLES: Record<string, PageTitle> = {
    '/': { en: siteConfig.title.en, zh: siteConfig.title.zh },
    '/interview': FLOW_PAGE_HEADINGS.interview,
    '/interview/fallback': { en: 'Interview pause', zh: '访谈暂停' },
    '/delivery': FLOW_PAGE_HEADINGS.delivery,
    '/prompt': FLOW_PAGE_HEADINGS.prompt,
    '/build': FLOW_PAGE_HEADINGS.buildFlow
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
