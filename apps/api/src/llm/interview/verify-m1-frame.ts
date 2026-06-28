import type { LlmStepDraft, TurnPlan } from './shared.js';

/** Stem invites pick-a-still / place choice — not a single-world caption. */
const THRESHOLD_INVITE =
    /\b(pick (a |the )?still|pick one|which still|where are you|step into|choose (a |the )?still|which (place|world|scene) (are you|do you)|选一处|你此刻|哪一处|走进哪|选哪一处)\b/i;

const PLACE_WORLDS: Array<{ id: string; re: RegExp }> = [
    {
        id: 'transit',
        re: /\b(platform|station|train|subway|bus|airport|gate|ticket|mezzanine|escalator|月台|地铁|站台)\b/i
    },
    {
        id: 'vehicle',
        re: /\b(car|highway|dashboard|windshield|wipers|parked|driver|公路|车|玻璃|雨刷)\b/i
    },
    {
        id: 'domestic',
        re: /\b(kitchen|bed|bedroom|table|porch|sofa|counter|laundry|apartment|厨房|床|桌)\b/i
    },
    {
        id: 'venue',
        re: /\b(warehouse|club|bar|doorway|neon|dance floor|stage|basement|舞池|门口|霓虹)\b/i
    },
    {
        id: 'workplace',
        re: /\b(workbench|studio|office|desk|chisel|wood shavings|workshop|工作台|木屑|凿)\b/i
    },
    {
        id: 'outdoors',
        re: /\b(parking|street|alley|lot|concrete stairs|landing|handrail|停车|楼梯|走廊)\b/i
    },
    {
        id: 'retail',
        re: /\b(store|aisle|convenience|shelf|fluorescent|便利店|货架)\b/i
    }
];

function worldsInText(text: string): Set<string> {
    const hits = new Set<string>();
    for (const world of PLACE_WORLDS) {
        if (world.re.test(text)) hits.add(world.id);
    }
    return hits;
}

/** M1: stem must be threshold-invite when options partition distinct place/world clusters. */
export function verifyM1PlacePartition(draft: LlmStepDraft, plan: TurnPlan): string[] {
    const failures: string[] = [];
    const stemBlob = `${draft.stemEn} ${draft.stemZh}`;

    if (plan.optionRole === 'moment-in-scene') {
        failures.push(
            'M1 optionRole must be place-partition — each option is a distinct place/world, not a moment'
        );
    }

    const optionWorlds = new Set<string>();
    for (const opt of draft.options) {
        for (const id of worldsInText(`${opt.labelEn} ${opt.labelZh}`)) {
            optionWorlds.add(id);
        }
    }

    if (optionWorlds.size < 2) return failures;

    if (THRESHOLD_INVITE.test(stemBlob)) return failures;

    const stemWorlds = worldsInText(stemBlob);
    if (stemWorlds.size === 1) {
        const stemWorld = [...stemWorlds][0]!;
        const hasOutside = [...optionWorlds].some((w) => w !== stemWorld);
        if (hasOutside) {
            failures.push(
                'M1 stem locks one place/world but options partition other worlds — use threshold-invite stem (pick-a-still ask)'
            );
        }
        return failures;
    }

    if (stemWorlds.size >= 1) {
        const orphanCount = draft.options.filter((opt) => {
            const ow = worldsInText(`${opt.labelEn} ${opt.labelZh}`);
            return ow.size > 0 && ![...ow].some((w) => stemWorlds.has(w));
        }).length;
        if (orphanCount >= 2) {
            failures.push(
                'M1 options span worlds not framed by threshold stem — use pick-a-still ask, not one-place caption'
            );
        }
    }

    return failures;
}
