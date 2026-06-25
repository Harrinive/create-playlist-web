export const MOTION_MS = 320;

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function appearOnMount(
    el: Element | Element[] | NodeListOf<Element> | null | undefined
): void {
    if (!el) return;
    const nodes = el instanceof NodeList ? Array.from(el) : Array.isArray(el) ? el : [el];
    for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        node.classList.remove('appear-on-mount', 'panel-swap-target');
        void node.offsetWidth;
        node.classList.add('appear-on-mount');
    }
}

export function staggerAppear(
    container: Element,
    selector: string,
    staggerMs = 48
): void {
    container.querySelectorAll(selector).forEach((node, index) => {
        if (!(node instanceof HTMLElement)) return;
        node.style.setProperty('--appear-delay', `${index * staggerMs}ms`);
        appearOnMount(node);
    });
}

export function fadeOut(el: HTMLElement): Promise<void> {
    if (prefersReducedMotion()) {
        el.remove();
        return Promise.resolve();
    }

    el.classList.add('is-fading-out');
    return new Promise((resolve) => {
        window.setTimeout(() => {
            el.remove();
            resolve();
        }, MOTION_MS);
    });
}

export function crossFadePanels(show: HTMLElement, hide: HTMLElement[]): void {
    const visibleHide = hide.filter((panel) => !panel.hidden);
    if (prefersReducedMotion()) {
        visibleHide.forEach((panel) => {
            panel.hidden = true;
            panel.classList.remove('is-fading-out');
        });
        show.hidden = false;
        appearOnMount(show);
        return;
    }

    visibleHide.forEach((panel) => panel.classList.add('is-fading-out'));

    window.setTimeout(() => {
        visibleHide.forEach((panel) => {
            panel.hidden = true;
            panel.classList.remove('is-fading-out');
        });
        show.hidden = false;
        appearOnMount(show);
    }, MOTION_MS);
}

export function revealPanel(show: HTMLElement, hide: HTMLElement[] = []): void {
    crossFadePanels(show, hide);
}
