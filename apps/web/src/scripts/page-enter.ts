import { staggerAppear } from '../lib/motion';

export function initPageEnter() {
    document.querySelectorAll('.content__main .chip-grid').forEach((grid) => {
        staggerAppear(grid, '.chip-option');
    });
}

document.addEventListener('astro:page-load', initPageEnter);

export {};
