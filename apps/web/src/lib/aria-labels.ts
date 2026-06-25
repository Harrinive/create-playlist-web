import siteConfig from '../data/site-config';
import type { Locale } from './locale';

export function applyAriaLabels(locale: Locale): void {
    document.querySelectorAll<HTMLElement>('[data-aria-en][data-aria-zh]').forEach((el) => {
        const label = locale === 'zh' ? el.dataset.ariaZh : el.dataset.ariaEn;
        if (label) el.setAttribute('aria-label', label);
    });

    const logo = document.querySelector<HTMLElement>('.sidebar__title');
    if (logo && !logo.dataset.ariaEn) {
        logo.setAttribute('aria-label', locale === 'zh' ? siteConfig.title.zh : siteConfig.title.en);
    }
}
