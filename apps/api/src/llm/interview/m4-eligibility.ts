import type { InterviewAnswers } from '../../types/interview.js';
import type { InterviewPlannerState } from '../../types/interview-planner.js';

export type M4Mode = 'avoid' | 'discriminant-1a' | 'discriminant-1b' | 'discriminant-1c';

export type M4Context = {
    prior: Partial<InterviewAnswers>;
    planner?: InterviewPlannerState | null;
    blob: string;
    m1RegionId: string;
    intimate: boolean;
    calm: boolean;
    kinetic: boolean;
    melancholy: boolean;
    edgeCharged: boolean;
    kineticSocialRegion: boolean;
    postParty: boolean;
    m3StillOrDrift: boolean;
};

export type TrapCluster = {
    id: string;
    /** Match option id or label text */
    matchPattern: RegExp;
    dropWhen: (ctx: M4Context) => boolean;
    /** When true, keep even if dropWhen would drop (false-positive override) */
    keepWhen?: (ctx: M4Context) => boolean;
    impliedAvoidEn: string;
    labelEnTemplate: string;
    labelZhTemplate: string;
};

export type EligibleTrapResult = {
    eligible: TrapCluster[];
    dropped: TrapCluster[];
    impliedAvoids: string[];
    eligibleIds: string[];
    droppedIds: string[];
};

const KINETIC_REGION_IDS = ['kinetic-high', 'rhythm-social'] as const;

function labelBlob(prior: Partial<InterviewAnswers>): string {
    const parts: string[] = [];
    for (const value of Object.values(prior)) {
        if (!value) continue;
        if (Array.isArray(value)) parts.push(...value.map((o) => o.label));
        else parts.push(value.label);
    }
    return parts.join(' ').toLowerCase();
}

function hasAny(blob: string, needles: string[]): boolean {
    return needles.some((n) => blob.includes(n));
}

export function buildM4Context(
    prior: Partial<InterviewAnswers>,
    planner?: InterviewPlannerState | null
): M4Context {
    const blob = labelBlob(prior);
    const m1RegionId = planner?.m1RegionId ?? '';

    const intimate = hasAny(blob, [
        'solo',
        'alone',
        'quiet',
        'intimate',
        'still',
        'sleep',
        'late',
        'rain',
        'hallway',
        'kitchen',
        '独处',
        '安静',
        '亲密',
        '雨'
    ]);
    const calm = hasAny(blob, [
        'calm',
        'peaceful',
        'tender',
        'wistful',
        'slow',
        'drift',
        '平静',
        '温柔',
        '怅然',
        '慢'
    ]);
    const kinetic = hasAny(blob, [
        'party',
        'crowd',
        'club',
        'gym',
        'dance',
        'high energy',
        'forward',
        'neon',
        'street',
        'doorway',
        'shoulder',
        'corner',
        'spill',
        'warehouse',
        'orbit',
        'bass',
        'groove',
        'sway',
        'dancefloor',
        'dance floor',
        'red light',
        '派对',
        '人群',
        '夜店',
        '高能量',
        '霓虹',
        '街'
    ]);
    const melancholy = hasAny(blob, ['melanchol', 'sad', 'wistful', 'lonely', '怅', '孤独', '伤感']);
    const edgeCharged =
        m1RegionId === 'edge-charged' ||
        m1RegionId === 'restless-charged' ||
        hasAny(blob, ['basement', 'parking lot', 'after show', '地下', '停车场']);
    const kineticSocialRegion =
        m1RegionId === 'kinetic-high' ||
        m1RegionId === 'rhythm-social' ||
        (KINETIC_REGION_IDS as readonly string[]).includes(m1RegionId);
    const postParty = hasAny(blob, ['cake', 'candle', 'party', '蛋糕', '蜡烛']);
    const m3StillOrDrift =
        hasAny(blob, ['still', 'drift', 'slow', '静', '慢', '漂浮']) ||
        m1RegionId === 'intimate-still';

    return {
        prior,
        planner,
        blob,
        m1RegionId,
        intimate,
        calm,
        kinetic,
        melancholy,
        edgeCharged,
        kineticSocialRegion,
        postParty,
        m3StillOrDrift
    };
}

/** Trap cluster registry — skill § M4 avoid list */
export const TRAP_CLUSTERS: TrapCluster[] = [
    {
        id: 'gym-hype',
        matchPattern:
            /\b(gym|workout|hype|motivational|self-help|健身|运动)\b|gym-hype|workout-playlist/i,
        dropWhen: (ctx) =>
            (ctx.intimate || ctx.calm || ctx.m3StillOrDrift) &&
            !ctx.kineticSocialRegion &&
            !ctx.kinetic,
        impliedAvoidEn: 'workout hype and gym motivation playlists',
        labelEnTemplate: 'Skip gym hype and workout playlists',
        labelZhTemplate: '避开健身打鸡血和运动歌单'
    },
    {
        id: 'peak-club-banger',
        matchPattern:
            /\b(club|edm|party|banger|drop|house party|crowded|夜店|派对|蹦迪)\b|peak-club|club-banger/i,
        dropWhen: (ctx) =>
            ((ctx.intimate || ctx.calm || ctx.m3StillOrDrift) && !ctx.kinetic) ||
            ctx.postParty,
        impliedAvoidEn: 'peak club bangers and EDM drop energy',
        labelEnTemplate: 'Avoid peak-club bangers and EDM drops',
        labelZhTemplate: '别选夜店顶嗨和轰炸式下坠'
    },
    {
        id: 'aggressive-distortion',
        matchPattern:
            /\b(aggressive|angry|distortion|loud|metal|scream|激进|愤怒|失真)\b|aggressive/i,
        dropWhen: (ctx) => (ctx.calm || ctx.m3StillOrDrift) && !ctx.edgeCharged,
        impliedAvoidEn: 'aggressive distortion and angry loud energy',
        labelEnTemplate: 'Skip aggressive distortion and loud metal crunch',
        labelZhTemplate: '不要激进失真和金属硬响'
    },
    {
        id: 'elevator-muzak',
        matchPattern:
            /\b(elevator|muzak|hold music|corporate|background|电梯|背景乐)\b|elevator-muzak/i,
        dropWhen: (ctx) =>
            ctx.kineticSocialRegion ||
            ctx.kinetic ||
            (ctx.melancholy && !ctx.kinetic),
        impliedAvoidEn: 'corporate elevator muzak and hold music',
        labelEnTemplate: 'Skip elevator muzak and hold music',
        labelZhTemplate: '别选电梯音乐和客服等待音'
    },
    {
        id: 'coffee-shop-template',
        matchPattern:
            /\b(coffee[- ]shop|acoustic clich|café|cafe|acoustic template|咖啡馆|木吉他)\b|coffee-shop/i,
        dropWhen: (ctx) => ctx.kineticSocialRegion || ctx.kinetic,
        impliedAvoidEn: 'coffee-shop acoustic templates',
        labelEnTemplate: 'Skip coffee-shop acoustic templates',
        labelZhTemplate: '避开咖啡馆木吉他模板'
    },
    {
        id: 'lo-fi-study',
        matchPattern:
            /\b(lo[- ]?fi|study beats|study loop|focus-work|复习|学习循环)\b|lo-fi-study/i,
        dropWhen: (ctx) => ctx.kineticSocialRegion || ctx.kinetic,
        impliedAvoidEn: 'generic lo-fi study loops',
        labelEnTemplate: 'Avoid generic lo-fi study loops',
        labelZhTemplate: '不要通用复习背景循环'
    },
    {
        id: 'grief-dirge',
        matchPattern: /\b(grief|dirge|funeral|mourning|挽歌|悲)\b|grief-dirge/i,
        dropWhen: (ctx) => ctx.kineticSocialRegion || ctx.kinetic,
        impliedAvoidEn: 'grief dirges and funeral pacing',
        labelEnTemplate: 'Skip grief dirges and funeral pacing',
        labelZhTemplate: '避开丧葬挽歌式慢歌'
    },
    {
        id: 'sad-acoustic-cliche',
        matchPattern:
            /\b(sad[- ]acoustic|coffee shop sadness|acoustic clich|伤感木吉他)\b|sad-acoustic/i,
        dropWhen: (ctx) => ctx.kineticSocialRegion || (ctx.kinetic && !ctx.melancholy),
        keepWhen: (ctx) => ctx.melancholy && !ctx.kineticSocialRegion,
        impliedAvoidEn: 'sad-acoustic cliché playlists',
        labelEnTemplate: 'Skip sad-acoustic cliché playlists',
        labelZhTemplate: '不要伤感木吉他套路歌单'
    },
    {
        id: 'trailer-swell',
        matchPattern: /\b(trailer|swell|cinematic|epic|预告|大片)\b|trailer-swell/i,
        dropWhen: (ctx) => ctx.m3StillOrDrift && ctx.calm && !ctx.kinetic,
        impliedAvoidEn: 'overly cinematic trailer swells',
        labelEnTemplate: 'Avoid overly cinematic trailer swells',
        labelZhTemplate: '别听预告片式大起势'
    },
    {
        id: 'algorithm-rabbit-hole',
        matchPattern:
            /\b(algorithm|rabbit hole|discover weekly|usual mix|算法|熟悉推荐)\b|algorithm-rabbit/i,
        dropWhen: () => false,
        impliedAvoidEn: 'algorithm comfort-zone rabbit holes',
        labelEnTemplate: 'Skip the algorithm rabbit hole and Discover Weekly rut',
        labelZhTemplate: '别掉进算法推荐老路'
    },
    {
        id: 'hyperpop-sheen',
        matchPattern: /\b(hyperpop|hyper-pop|glossy pop|sheen| glossy|超流行| glossy)\b|hyperpop/i,
        dropWhen: (ctx) => ctx.intimate && ctx.calm && !ctx.kinetic,
        impliedAvoidEn: 'glossy hyperpop sheen',
        labelEnTemplate: 'Avoid glossy hyperpop sheen',
        labelZhTemplate: '别听 hyperpop 那种闪亮光泽'
    },
    {
        id: 'glossy-motivational',
        matchPattern: /\b(motivational|self-help|inspirational|励志|鸡汤)\b|glossy-motivational/i,
        dropWhen: (ctx) => (ctx.calm || ctx.melancholy) && !ctx.kinetic,
        impliedAvoidEn: 'motivational self-help energy',
        labelEnTemplate: 'Skip motivational self-help and glossy pep talk',
        labelZhTemplate: '不要励志鸡汤和打鸡血喊话'
    }
];

function isTrapDropped(cluster: TrapCluster, ctx: M4Context): boolean {
    if (cluster.keepWhen?.(ctx)) return false;
    return cluster.dropWhen(ctx);
}

export function computeEligibleTraps(
    prior: Partial<InterviewAnswers>,
    planner?: InterviewPlannerState | null
): EligibleTrapResult {
    const ctx = buildM4Context(prior, planner);
    const eligible: TrapCluster[] = [];
    const dropped: TrapCluster[] = [];

    for (const cluster of TRAP_CLUSTERS) {
        if (isTrapDropped(cluster, ctx)) {
            dropped.push(cluster);
        } else {
            eligible.push(cluster);
        }
    }

    const impliedAvoids = dropped.map((c) => c.impliedAvoidEn);

    return {
        eligible,
        dropped,
        impliedAvoids,
        eligibleIds: eligible.map((c) => c.id),
        droppedIds: dropped.map((c) => c.id)
    };
}

export function countEligibleTraps(
    prior: Partial<InterviewAnswers>,
    planner?: InterviewPlannerState | null
): number {
    return computeEligibleTraps(prior, planner).eligible.length;
}

/** Match draft option id/label against a dropped trap cluster */
export function optionMatchesTrapCluster(
    optionId: string,
    labelEn: string,
    labelZh: string,
    cluster: TrapCluster
): boolean {
    if (optionId === cluster.id) return true;
    const assigned = trapClusterById(optionId);
    if (assigned && assigned.id !== cluster.id) return false;

    const hay = `${optionId} ${labelEn} ${labelZh}`.toLowerCase();
    if (hay.includes(cluster.id.replace(/-/g, ' ')) || hay.includes(cluster.id)) {
        return true;
    }
    return cluster.matchPattern.test(hay);
}

export function optionMatchesAnyDroppedTrap(
    optionId: string,
    labelEn: string,
    labelZh: string,
    dropped: TrapCluster[]
): TrapCluster | undefined {
    if (optionId === 'none') return undefined;
    return dropped.find((c) => optionMatchesTrapCluster(optionId, labelEn, labelZh, c));
}

export type M4GateDecision = {
    m4Mode: M4Mode;
    lastQuestionMode: 'avoid' | 'discriminant';
    eligibleTrapCount: number;
    impliedAvoids: string[];
    eligibleTrapIds: string[];
    discriminantAxis?: string;
};

export function suggestDiscriminantKind(
    prior: Partial<InterviewAnswers>,
    planner?: InterviewPlannerState | null
): M4Mode {
    const ctx = buildM4Context(prior, planner);

    // 1b: timbre/groove splits hypotheses (skill Q4 priority when groove grain open)
    if (
        planner?.needsGrooveGrain &&
        (planner?.hypotheses?.length ?? 0) >= 2
    ) {
        return 'discriminant-1b';
    }

    // 1a: M3 energy still open (pace discriminates)
    if (
        planner?.coverageRisk &&
        !ctx.m3StillOrDrift &&
        !hasAny(ctx.blob, ['steady pulse', 'loose sway', 'grid', 'behind the beat'])
    ) {
        return 'discriminant-1a';
    }

    // 1b fallback: timbre splits when coverage risk + plural hypotheses
    if (
        planner?.coverageRisk &&
        (planner?.hypotheses?.length ?? 0) >= 2
    ) {
        return 'discriminant-1b';
    }

    // Default 1c: latent axis
    return 'discriminant-1c';
}

export function trapClusterById(id: string): TrapCluster | undefined {
    const normalized = id.replace(/^too-/i, '').trim();
    return TRAP_CLUSTERS.find((c) => c.id === id || c.id === normalized);
}

export function trapLabelTemplatesBlock(): string {
    return TRAP_CLUSTERS.map(
        (c) => `- ${c.id}: "${c.labelEnTemplate}" / "${c.labelZhTemplate}"`
    ).join('\n');
}

type TrapLabelDraft = {
    options: Array<{ id: string; labelEn: string; labelZh: string }>;
};

/** True when every non-none option uses registry labelEn/labelZh exactly. */
export function draftUsesCanonicalTrapLabels(draft: TrapLabelDraft): boolean {
    const nonNone = draft.options.filter((o) => o.id !== 'none');
    if (nonNone.length === 0) return false;
    for (const opt of nonNone) {
        const cluster = trapClusterById(opt.id);
        if (!cluster) return false;
        if (opt.labelEn.trim() !== cluster.labelEnTemplate) return false;
        if (opt.labelZh.trim() !== cluster.labelZhTemplate) return false;
    }
    return true;
}

export function resolveM4Gate(
    prior: Partial<InterviewAnswers>,
    planner?: InterviewPlannerState | null
): M4GateDecision {
    const { eligible, impliedAvoids, eligibleIds } = computeEligibleTraps(prior, planner);
    const eligibleTrapCount = eligible.length;

    if (eligibleTrapCount >= 4) {
        return {
            m4Mode: 'avoid',
            lastQuestionMode: 'avoid',
            eligibleTrapCount,
            impliedAvoids,
            eligibleTrapIds: eligibleIds
        };
    }

    const m4Mode = suggestDiscriminantKind(prior, planner);
    const discriminantAxis =
        m4Mode === 'discriminant-1a'
            ? 'pace'
            : m4Mode === 'discriminant-1b'
              ? 'groove'
              : 'space';

    return {
        m4Mode,
        lastQuestionMode: 'discriminant',
        eligibleTrapCount,
        impliedAvoids,
        eligibleTrapIds: eligibleIds,
        discriminantAxis
    };
}
