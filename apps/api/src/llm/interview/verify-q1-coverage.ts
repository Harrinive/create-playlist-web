import type { LlmStepDraft, TurnPlan } from './shared.js';
import { Q1_REGION_IDS } from './prompts.js';

/** Kinetic/crowd social-heat register — must appear in at least one user-facing chip. */
export const KINETIC_LABEL =
    /\b(crowd|packed|dance|club|party|bar|floor|bodies|neon spill|moving|speakers|gym|parade|block party|festival field|dance floor|kitchen party|bass in|thumping|stomp|dj|mosh|sweat|jumping|everyone moving|shoulders brushing)\b/i;

export const KINETIC_LABEL_ZH =
    /舞池|人群|挤满|派对|俱乐部|蹦|跳动|派对|音乐节|健身房|游行|派对高峰|人群在动|肩碰肩/;

/** Low social-heat / solo-enclosed register. */
export const INTIMATE_LABEL =
    /\b(one chair|cooling tea|empty museum|after guests|2 a\.m\.|solo|alone|empty room|lamp still|quiet desk|just you|only you)\b/i;

export const INTIMATE_LABEL_ZH = /一把椅子|茶正凉|空荡|只有你|独自|安静|灯还亮|客人走后|两点|空房间/;

export const KINETIC_REGION_IDS = ['kinetic-high', 'rhythm-social', 'edge-charged'] as const;

const KINETIC_REGION_SET = new Set<string>(KINETIC_REGION_IDS);
const INTIMATE_REGION_ID = 'intimate-still';

/** Setting-type buckets — options must span more than one quiet-domestic lane. */
const SETTING_TYPES: Array<{ id: string; re: RegExp }> = [
    {
        id: 'domestic',
        re: /\b(kitchen|bed|bedroom|chair|tea|porch|sofa|counter|laundry|apartment|desk|table|厨房|床|椅|茶|桌)\b/i
    },
    {
        id: 'transit',
        re: /\b(platform|station|train|subway|bus|airport|gate|ticket|rail|月台|地铁|站台|铁轨|末班)\b/i
    },
    {
        id: 'commercial',
        re: /\b(hotel|lobby|reception|convenience|store|aisle|酒店|大堂|便利店)\b/i
    },
    {
        id: 'venue',
        re: /\b(warehouse|club|bar|booth|dance floor|stage|basement|舞池|卡座|酒吧|俱乐部)\b/i
    },
    {
        id: 'outdoors',
        re: /\b(parking|street|alley|fairground|market|lantern|field|festival|停车|集市|灯笼|户外|街上)\b/i
    },
    {
        id: 'workplace',
        re: /\b(workbench|studio|office|workshop|工作台|工作室|办公室)\b/i
    }
];

export function labelReadsKinetic(labelEn: string, labelZh: string): boolean {
    return KINETIC_LABEL.test(labelEn) || KINETIC_LABEL_ZH.test(labelZh);
}

export function labelReadsIntimate(labelEn: string, labelZh: string): boolean {
    return INTIMATE_LABEL.test(labelEn) || INTIMATE_LABEL_ZH.test(labelZh);
}

function settingTypesInOptions(options: LlmStepDraft['options']): Set<string> {
    const hits = new Set<string>();
    for (const opt of options) {
        const blob = `${opt.labelEn} ${opt.labelZh}`;
        for (const st of SETTING_TYPES) {
            if (st.re.test(blob)) hits.add(st.id);
        }
    }
    return hits;
}

function minDistinctRegions(optionCount: number): number {
    return Math.min(Math.max(3, Math.ceil(optionCount / 2)), Q1_REGION_IDS.length);
}

function minSettingTypes(optionCount: number): number {
    if (optionCount >= 5) return 3;
    if (optionCount >= 4) return 2;
    return 1;
}

/**
 * M1 Q1 coverage checklist — every item must pass when option count is 4–6.
 * Checks user-facing labels, not planner tags alone.
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

    const settingTypes = settingTypesInOptions(options);
    const minSettings = minSettingTypes(options.length);
    if (settingTypes.size < minSettings) {
        failures.push(
            `Q1 setting-type spread too narrow — ${settingTypes.size} types, need ≥${minSettings} distinct place families (home, transit, venue, outdoors, …)`
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
            const intimateTagged = regionId === INTIMATE_REGION_ID;
            const readsKinetic = labelReadsKinetic(opt.labelEn, opt.labelZh);
            const readsIntimate = labelReadsIntimate(opt.labelEn, opt.labelZh);

            if (kineticTagged && !readsKinetic) {
                failures.push(
                    `Q1 option "${opt.id}" tagged ${regionId} but label lacks kinetic/crowd register — rewrite chip or retag regionId`
                );
            }
            if (intimateTagged && readsKinetic) {
                failures.push(
                    `Q1 option "${opt.id}" tagged intimate-still but label reads kinetic/crowd — rewrite chip or retag regionId`
                );
            }
            if (intimateTagged && !readsIntimate && !kineticTagged) {
                failures.push(
                    `Q1 option "${opt.id}" tagged intimate-still but label lacks solo/low-heat register`
                );
            }
        }
    }

    return failures;
}
