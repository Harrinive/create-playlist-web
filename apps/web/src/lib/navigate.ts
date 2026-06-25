import { navigate } from 'astro:transitions/client';

export function navigateTo(href: string): void {
    void navigate(href);
}
