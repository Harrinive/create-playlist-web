import type { LlmStepDraft, TurnPlan } from './shared.js';
import { Q1_REGION_IDS } from './prompts.js';

/** Kinetic/crowd social-heat register — must appear in at least one user-facing chip. */
export const KINETIC_LABEL =
    /\b(crowd|packed|pack|crush|dance|club|party|bar|floor|bodies|neon spill|moving|speakers|gym|parade|block party|festival field|dance floor|kitchen party|bass in|thumping|stomp|dj|mosh|sweat|jumping|everyone moving|shoulders brushing|shoulders in motion|laughing)\b/i;

export const KINETIC_LABEL_ZH =
    /舞池|人群|挤满|派对|俱乐部|蹦|跳动|音乐节|健身房|游行|人群在动|肩碰肩|满屋子|都在动/;

/** Low social-heat / solo-enclosed register. */
export const INTIMATE_LABEL =
    /\b(one chair|cooling tea|empty museum|after guests|2 a\.m\.|solo|alone|empty room|lamp still|quiet desk|just you|only you|desk lamp|table for one|bag at my feet|for one|after[- ]hours)\b/i;

export const INTIMATE_LABEL_ZH =
    /一把椅子|茶正凉|空荡|只有你|独自|安静|灯还亮|客人走后|两点|空房间|空屋子|台灯|一张桌|一个人|独自等/;

export const KINETIC_REGION_IDS = ['kinetic-high', 'rhythm-social', 'edge-charged'] as const;

const KINETIC_REGION_SET = new Set<string>(KINETIC_REGION_IDS);
const INTIMATE_REGION_ID = 'intimate-still';

const KINETIC_REPAIR = {
    labelEn: 'Packed room, shoulders in motion',
    labelZh: '满屋子人，肩膀都在动'
} as const;

const INTIMATE_REPAIR = {
    labelEn: 'One chair, cooling tea',
    labelZh: '一把椅子，茶正凉着'
} as const;

export function labelReadsKinetic(labelEn: string, labelZh: string): boolean {
    return KINETIC_LABEL.test(labelEn) || KINETIC_LABEL_ZH.test(labelZh);
}

export function labelReadsIntimate(labelEn: string, labelZh: string): boolean {
    return INTIMATE_LABEL.test(labelEn) || INTIMATE_LABEL_ZH.test(labelZh);
}

function minDistinctRegions(optionCount: number): number {
    return Math.min(Math.max(3, Math.ceil(optionCount / 2)), Q1_REGION_IDS.length);
}

/**
 * M1 Q1 coverage checklist — label-backed social heat + slot consistency.
 * Setting-family spread is prompt guidance only (regex bucketing was too brittle).
 */
export function verifyQ1Coverage(draft: LlmStepDraft, plan: TurnPlan): string[] {
    const failures: string[] = [];
    const options = draft.options;
    if (options.length < 4) return failures;

    const hasKineticChip = options.some((o) => labelReadsKinetic(o.labelEn, o.labelZh));
    if (!hasKineticChip) {
        failures.push(
            'Q1 missing kinetic/crowd option in labels — include ≥1 chip with body energy or crowd register (club, dance floor, party peak, parade, etc.)'
        );
    }

    const hasIntimateChip = options.some((o) => labelReadsIntimate(o.labelEn, o.labelZh));
    if (!hasIntimateChip) {
        failures.push(
            'Q1 missing intimate-still option in labels — include ≥1 solo/low-heat chip (one chair, empty room, lamp still, etc.)'
        );
    }

    const slots = plan.optionSlots ?? {};
    const slotKeys = Object.keys(slots);
    if (slotKeys.length > 0) {
        const coveredRegions = new Set<string>();
        for (const opt of options) {
            const regionId = slots[opt.id]?.regionId;
            if (regionId) coveredRegions.add(regionId);
        }

        const minRegions = minDistinctRegions(options.length);
        if (coveredRegions.size < minRegions) {
            failures.push(
                `Q1 only ${coveredRegions.size} distinct regions in optionSlots — need ≥${minRegions}`
            );
        }

        for (const opt of options) {
            const regionId = slots[opt.id]?.regionId;
            if (!regionId) continue;

            const kineticTagged = KINETIC_REGION_SET.has(regionId);
            const readsKinetic = labelReadsKinetic(opt.labelEn, opt.labelZh);

            if (kineticTagged && !readsKinetic) {
                failures.push(
                    `Q1 option "${opt.id}" tagged ${regionId} but label lacks kinetic/crowd register — rewrite chip or retag regionId`
                );
            }
        }
    }

    return failures;
}

/** Last-resort deterministic repair so M1 can ship after verify exhaustion. */
export function repairQ1CoverageDraft(draft: LlmStepDraft, plan: TurnPlan): LlmStepDraft {
    if (draft.options.length < 4) return draft;

    const options = draft.options.map((o) => ({ ...o }));

    if (!options.some((o) => labelReadsKinetic(o.labelEn, o.labelZh))) {
        const idx =
            options.findIndex((o) => {
                const rid = plan.optionSlots?.[o.id]?.regionId;
                return rid !== undefined && KINETIC_REGION_SET.has(rid);
            }) ?? -1;
        const target = idx >= 0 ? idx : options.length - 1;
        options[target] = { ...options[target], ...KINETIC_REPAIR };
    }

    if (!options.some((o) => labelReadsIntimate(o.labelEn, o.labelZh))) {
        const idx = options.findIndex(
            (o) => plan.optionSlots?.[o.id]?.regionId === INTIMATE_REGION_ID
        );
        const target = idx >= 0 ? idx : 0;
        options[target] = { ...options[target], ...INTIMATE_REPAIR };
    }

    for (let i = 0; i < options.length; i += 1) {
        const regionId = plan.optionSlots?.[options[i]!.id]?.regionId;
        if (
            regionId &&
            KINETIC_REGION_SET.has(regionId) &&
            !labelReadsKinetic(options[i]!.labelEn, options[i]!.labelZh)
        ) {
            options[i] = { ...options[i]!, ...KINETIC_REPAIR };
        }
    }

    return { ...draft, options };
}
