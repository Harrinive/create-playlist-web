import type { LlmStepDraft } from './shared.js';

const META_STEM_GLOSS_BAN =
    /neutral scene|scene question|问音乐|最先像落|most like the user|Ask which feeling|crowd-moving moment|a scene question|场景提问|中性的场景|which moment feels most like/i;

const VAGUE_MOOD_CHIP_BAN =
    /\b(softens?|sparks?|surges?|hums?|shaking|lifted|unguarded|braver|playful|tender|charged|forgetting the floor|face lifted|room softens|air sparks|laughter spills|shoulders loosen|voices up|chest open)\b/i;

const META_OPTION_GLOSS_BAN =
    /warm,? open|charged,? playful|easygoing,? social|bigger,? braver|人群里那种|一起传开|涌成同一句|峰顶之后|松开了|往上亮/i;

export const M4_TRAP_LEXICON =
    /\b(elevator|trailer|hyperpop|hyper-pop|sad-acoustic|sad acoustic|grief|dirge|gym|lo-fi|lofi|muzak|motivational|club|acoustic cliché|acoustic cliche|coffee-shop|coffee shop|study beats|workout|hype|swell|banger|template song|playlist trap|karaoke|singalong|sing-along|skip|avoid)\b/i;

const CONCRETE_EN_WORDS =
    /\b(room|door|window|kitchen|plate|glass|cup|lamp|chair|table|coat|jacket|rain|steam|towel|step|steps|porch|hall|light|bottle|speaker|floor|wall|hand|phone|car|seat|street|bar|dish|sink|crowd|friend|voice|song|neon|ice|mirror|elevator|stairs|bed|pillow|clock|screen|text|bag|shoe|train|bus|menu|beer|wine|smoke|candle|book|pen|note|box|plant|tree|wind|sky|bridge|river|beach|sand|bench|park|path|sign|photo|frame|shirt|hat|ring|watch|fire|grill|stove|pan|pot|spoon|fork|knife|bowl|mug|key|keys|wallet|card|waiter|bartender|booth|stage|mic|drink|drinks|pile|railing|gutter|hallway|counter|fridge|oven|ashtray|lighter|match|curtain|blanket|sofa|couch|desk|shelf|shower|road|highway|alley|corner|building|roof|balcony|pool|dock|boat|station|platform|ticket|map|post|pole|bulb|switch|button|cord|rope|chain|lock|handle|mat|rug|wood|paper|envelope|letter|package|gift|flower|vase|mouth|ear|forehead|elbow|shoulder|palm|hair|muscle|breath|wheel|dark|phone|mouth|elbows|shoulders|bodies|body|leg|legs|knee|knees|forehead|strand|face|faces|glass|rim|toe|toes|crumb|phone|steering|wipers|hood|dashboard|fruit|bread|meat|fish|egg|rice|soup|salt|sugar|honey|oil|sauce|garlic|onion|tomato|potato|carrot|apple|orange|banana|grape|cherry|berry|melon|peach|pear|lemon|mint|basil|corn|bean|nut|flour|dough|toast|jam|cream|milk|yogurt|cake|pie|cookie|brownie|muffin|donut|bagel|pretzel|cracker|chip|popcorn|candy|chocolate|drum|guitar|piano|violin|trumpet|flute|saxophone|harp|organ|synth|keyboard|amplifier|headphone|microphone|cable|battery|charger|motor|engine|wheel|tire|pedal|handlebar|saddle|collar|leash|cage|nest|hive|cave|tunnel|mine|valley|canyon|cliff|peak|summit|ridge|plain|desert|forest|jungle|swamp|marsh|meadow|prairie|glacier|volcano|spring|stream|creek|waterfall|wave|tide|shore|coast|dune|oasis)\b/i;

const CONCRETE_ZH =
    /[灯杯门桌椅墙窗雨钥匙盘碗瓶烟街车房手袋鞋书笔纸箱花树风云山河海滩厨房阳台走廊台阶栏杆毛巾蒸汽人群朋友声音歌曲霓虹冰镜电梯楼梯床枕钟屏幕包袋火锅叉刀碗杯钥匙钱包卡片服务员吧台舞台麦克风饮料外套堆夹克]/;

const CONCRETE_ACTION_EN =
    /\b(stand|standing|sit|sitting|walk|walking|open|close|fold|refold|refolding|tap|tapping|watch|watching|wait|waiting|share|sharing|lean|leaning|drift|drifting|move|moving|hold|holding|stack|stacking|bounce|bouncing|write|writing|pass|passing|slide|sliding|lingering|settle|settling|smil|knees|deciding|lingers|rests|turns|spills|peels|stacked|folded|lingering)\b/i;

function hasConcreteAnchor(labelEn: string, labelZh: string): boolean {
    return (
        CONCRETE_EN_WORDS.test(labelEn) ||
        CONCRETE_ACTION_EN.test(labelEn) ||
        CONCRETE_ZH.test(labelZh)
    );
}

function sceneStepId(stepId: string): boolean {
    return stepId === 'm1' || stepId === 'm2' || stepId === 'm3' || stepId === 'm_clarify';
}

/** Deterministic gloss + concreteness checks (zero-gloss policy in prompts; code kept for future re-enable). */
export function verifyGlossAndConcreteness(
    stepId: string,
    draft: LlmStepDraft
): string[] {
    const failures: string[] = [];

    const stemGloss = `${draft.stemGlossEn ?? ''} ${draft.stemGlossZh ?? ''}`.trim();
    if (stemGloss && META_STEM_GLOSS_BAN.test(stemGloss)) {
        failures.push(`stemGloss meta-explains the question — omit stemGloss: ${stemGloss.slice(0, 80)}`);
    }

    if (sceneStepId(stepId) && (draft.stemGlossEn?.trim() || draft.stemGlossZh?.trim())) {
        failures.push('stemGloss not allowed on scene turns — omit stemGlossEn/stemGlossZh');
    }

    for (const opt of draft.options) {
        if (stepId === 'm2' || stepId === 'm3') {
            if (VAGUE_MOOD_CHIP_BAN.test(opt.labelEn)) {
                failures.push(
                    `vague mood-poetry chip on ${stepId} "${opt.id}" — use concrete objects/events: ${opt.labelEn}`
                );
            }
            if (!hasConcreteAnchor(opt.labelEn, opt.labelZh)) {
                failures.push(
                    `missing concrete object/event on ${stepId} option "${opt.id}" — name props, light, or action: ${opt.labelEn}`
                );
            }
        }

        if (sceneStepId(stepId) && (opt.glossEn?.trim() || opt.glossZh?.trim())) {
            failures.push(
                `${stepId.toUpperCase()} option "${opt.id}" must not use gloss — put the full beat in labelEn/labelZh`
            );
        }

        const gloss = `${opt.glossEn ?? ''} ${opt.glossZh ?? ''}`.trim();
        if (gloss && META_OPTION_GLOSS_BAN.test(gloss)) {
            failures.push(`option gloss repeats vague mood on "${opt.id}" — omit gloss`);
        }

        if (stepId === 'm4' && opt.id !== 'none' && gloss) {
            failures.push(
                `M4 option "${opt.id}" must not use gloss — put trap name in labelEn/labelZh`
            );
        }
    }

    return failures;
}
