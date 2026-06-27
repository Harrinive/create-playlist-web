const abortByRoot = new WeakMap<HTMLElement, AbortController>();
const activeScopes = new Set<AbortController>();

export type PageScope = {
    signal: AbortSignal;
    /** True while this scope's controller is current for `root` and not aborted. */
    isActive(): boolean;
};

export function createPageScope(root: HTMLElement): PageScope {
    abortByRoot.get(root)?.abort();
    const controller = new AbortController();
    abortByRoot.set(root, controller);
    activeScopes.add(controller);
    controller.signal.addEventListener(
        'abort',
        () => {
            activeScopes.delete(controller);
        },
        { once: true }
    );

    return {
        signal: controller.signal,
        isActive() {
            return !controller.signal.aborted && abortByRoot.get(root) === controller;
        }
    };
}

/** Abort in-flight page work when navigating away (Astro view transitions). */
export function abortAllPageScopes() {
    for (const controller of activeScopes) {
        if (!controller.signal.aborted) controller.abort();
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('astro:before-swap', abortAllPageScopes);
}
