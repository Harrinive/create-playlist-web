import { describe, expect, it } from 'vitest';
import { flowExitNavText } from './flow-nav-copy';

describe('flow-nav-copy', () => {
    it('localizes exit nav labels', () => {
        expect(flowExitNavText('backToDelivery', 'en')).toBe('Back to delivery');
        expect(flowExitNavText('home', 'zh')).toBe('首页');
    });
});
