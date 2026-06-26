import { describe, expect, it } from 'vitest';
import {
    FLOW_HOW_IT_WORKS,
    FLOW_STEP_KICKERS,
    flowStepKicker
} from './flow-steps';

describe('flow-steps', () => {
    it('defines steps 1–3 for home and page kickers', () => {
        expect(FLOW_STEP_KICKERS[1].en).toBe('Step 1');
        expect(FLOW_STEP_KICKERS[2].zh).toBe('步骤 2');
        expect(FLOW_STEP_KICKERS[3].en).toBe('Step 3');
    });

    it('how-it-works uses matching step numbers', () => {
        expect(FLOW_HOW_IT_WORKS.map((item) => item.step)).toEqual([1, 2, 3]);
    });

    it('flowStepKicker respects locale', () => {
        expect(flowStepKicker(2, 'en')).toBe('Step 2');
        expect(flowStepKicker(2, 'zh')).toBe('步骤 2');
    });
});
