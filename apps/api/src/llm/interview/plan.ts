import type { Env } from '../../config.js';
import { completeChat } from '../../llm-router/index.js';
import {
    dimensionGuidance,
    extractJson,
    formatPriorAnswers,
    rejectedStemsBlock,
    turnPlanSchema,
    type InterviewTurnContext,
    type TurnPlan
} from './shared.js';
import { buildFilterHints } from './filter.js';

const PLAN_SYSTEM = `You are the private planning phase of a music mood interviewer (Step 1 skill algorithm).
Run the per-turn checklist BEFORE any question is shown. Output JSON only — this plan is never shown to the user.

Per-turn algorithm (run in order):
1. Gap check — which M1–M5 dimensions are still empty this turn? (fixed order: m1 scene, m2 emotion, m3 energy, m5 sound, m4 avoid)
2. Scene beat — picture 10 seconds of film: light, temperature, one object, one sound, social distance. One NEW detail; never caption the user's last pick.
3. Hypotheses — list 6–10 broad cluster regions still plausible (intimate-still, social-mid, kinetic-high, focus-flow, bittersweet-mid, etc.). Q1: nearly full space; later turns: shrunk by prior answers.
4. Pick axis — single axis that splits the most remaining clusters this turn. Match the funnel slot dimension.
5. Draft guidance — stemGuidance + optionGuidance for the draft step. Q1: each option must map to a distinct hypothesis region (partition, not decorate). Q2–Q4: advance scene on new axis.

Rules:
- At least one turn per interview should use a lateral hook (color, film mood, texture, memory, object) — set lateralHook true when this turn should.
- Q1: list q1RegionsToCover (major regions that need ≥1 option unless ruled out by prior answers).
- filterDrops: option themes to EXCLUDE (from contextual filtering).
- Never copy example menus from training docs.

Respond with JSON only:
{
  "gaps": ["m1"],
  "hypotheses": ["intimate-still", "social-mid", "kinetic-high"],
  "axis": "scene x social heat x body energy",
  "sceneBeat": "private 10s film beat — one new sensory detail",
  "lateralHook": false,
  "filterDrops": ["gym-pop motivation", "club drop energy"],
  "q1RegionsToCover": ["intimate-low", "social-mid", "kinetic-high", "focus-flow", "bittersweet-mid"],
  "stemGuidance": "neutral or locked frame; do not echo last user pick",
  "optionGuidance": "6–8 immersive scenes each ruling in a different region"
}`;

export async function planInterviewTurn(
    env: Env,
    ctx: InterviewTurnContext,
    model?: string
): Promise<TurnPlan> {
    const filterHints = buildFilterHints(ctx.stepIndex, ctx.priorAnswers);
    const filterBlock =
        filterHints.length > 0
            ? `\nDeterministic filter hints (apply in filterDrops / optionGuidance):\n${filterHints.map((h) => `- ${h}`).join('\n')}`
            : '';

    const userPrompt = `Question ${ctx.stepIndex + 1} of 5 — ${dimensionGuidance(ctx.stepIndex)}
${ctx.refresh ? 'REFRESH: user rejected the previous stem on this dimension — plan a clearly different scene on the same axis.' : ''}

Prior answers:
${formatPriorAnswers(ctx.priorAnswers)}
${rejectedStemsBlock(ctx.rejectedStems)}
${filterBlock}

Return JSON only.`;

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: PLAN_SYSTEM },
            { role: 'user', content: userPrompt }
        ],
        { model }
    );

    const parsed = turnPlanSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        throw new Error(`Interview plan returned invalid JSON: ${parsed.error.message}`);
    }

    const mergedDrops = [...new Set([...parsed.data.filterDrops, ...filterHints])];
    return { ...parsed.data, filterDrops: mergedDrops };
}
