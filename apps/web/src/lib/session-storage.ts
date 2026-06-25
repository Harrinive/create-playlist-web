/** sessionStorage.setItem that returns false instead of throwing (e.g. QuotaExceededError). */
export function safeSessionSet(key: string, value: string): boolean {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

export function safeSessionRemove(key: string): void {
    try {
        sessionStorage.removeItem(key);
    } catch {
        // ignore
    }
}

export function safeSessionGet(key: string): string | null {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}
