import { applyAriaLabels } from '../lib/aria-labels';
import { readLocale } from '../lib/locale';
import { documentDescription, documentTitle } from '../lib/page-titles';

function syncPageMetadata() {
    const locale = readLocale();
    document.title = documentTitle(window.location.pathname, locale);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', documentDescription(locale));
    applyAriaLabels(locale);
}

document.addEventListener('astro:page-load', syncPageMetadata);
document.addEventListener('locale-changed', syncPageMetadata);

export {};
