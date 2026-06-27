import { z } from 'zod';
import type { Env } from '../config.js';
import { completeChat } from '../llm-router/index.js';
import { resolveInterviewDefaultModel } from './interview-models.js';
import { extractJson } from './interview/shared.js';
import type { InterviewPlannerState } from '../types/interview-planner.js';

export type PromptInterviewOption = {
    id: string;
    label: string;
    labelEn?: string;
};

export type PromptInterviewAnswers = {
    m1: PromptInterviewOption;
    m2: PromptInterviewOption;
    m3: PromptInterviewOption;
    m5?: PromptInterviewOption;
    m_clarify?: PromptInterviewOption;
    m4: PromptInterviewOption[];
};

const paragraphSchema = z.object({
    paragraph: z.string().min(1)
});

const SYSTEM_PROMPT = `You write Spotify Prompted Playlist prompts — one English paragraph for a user to paste into Spotify → Library → Create → Prompted Playlist.

Rules (mandatory):
- English only — translate any non-English interview answers into natural, idiomatic English
- 4–8 sentences forming one coherent paragraph — flowing prose, NOT a fill-in template, NOT bullet points, NOT labeled fields like "Scene:" or "Emotion:"
- ~500 characters when possible (Spotify beta limit); never exceed 800 characters
- Must include: scene or activity anchor (M1), primary emotional texture (M2), energy or tempo (M3), concrete sonic/timbre cues (M5 inferred), explicit avoid clause (M4 when present)
- When plural hypotheses are given, say the playlist is open to those clusters — not one genre lane only
- Preserve the user's evocative metaphors and sensory detail after translating — use their phrasing where it reads naturally in English
- Sonic cues must be concrete (instruments, texture, space) — not vague "good vibes"
- No filler ("perfect playlist", "vibes only", "curated for you")
- No bullets, YAML, genre: tags, or filter syntax
- Do not stack genre names unless the user named genres
- Do not mandate artist names unless user gave seeds

Return JSON only: { "paragraph": "..." }`;

const DIMENSION_LABELS: Record<string, string> = {
    m1: 'Scene / activity (M1)',
    m2: 'Emotional texture (M2)',
    m3: 'Energy / tempo (M3)',
    m5: 'Sonic texture (M5 inferred)',
    m4: 'Avoid (M4)'
};

function englishLine(option: PromptInterviewOption): string {
    const en = option.labelEn?.trim();
    if (en) return en;
    return option.label.trim();
}

function formatAnswersBlock(
    answers: PromptInterviewAnswers,
    plannerState?: InterviewPlannerState | null
): string {
    const lines = [
        `${DIMENSION_LABELS.m1}: ${englishLine(answers.m1)}`,
        `${DIMENSION_LABELS.m2}: ${englishLine(answers.m2)}`,
        `${DIMENSION_LABELS.m3}: ${englishLine(answers.m3)}`
    ];

    if (answers.m5) {
        lines.push(`${DIMENSION_LABELS.m5}: ${englishLine(answers.m5)}`);
    }

    if (answers.m_clarify) {
        lines.push(`Clarifying moment: ${englishLine(answers.m_clarify)}`);
    }

    const isDiscriminant = plannerState?.m4Mode?.startsWith('discriminant-');
    const avoids = isDiscriminant
        ? []
        : answers.m4
              .filter((item) => item.id !== 'none')
              .map((item) => englishLine(item));
    const implied = plannerState?.impliedAvoids ?? [];
    const allAvoids = [...avoids, ...implied];

    if (allAvoids.length > 0) {
        lines.push(`${DIMENSION_LABELS.m4}: ${allAvoids.join('; ')}`);
    } else if (isDiscriminant && answers.m4.length === 1 && answers.m4[0]?.id !== 'none') {
        lines.push(`M4 discriminant (${plannerState?.m4Mode}): ${englishLine(answers.m4[0])}`);
    } else {
        lines.push(`${DIMENSION_LABELS.m4}: none specified`);
    }

    return lines.join('\n');
}

function normalizeParagraph(text: string): string {
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.;!?])/g, '$1');
}

export async function generateSpotifyPrompt(
    env: Env,
    answers: PromptInterviewAnswers,
    plannerState?: InterviewPlannerState | null,
    model?: string
): Promise<string> {
    const resolvedModel = model ?? resolveInterviewDefaultModel(env);
    if (!resolvedModel) {
        throw new Error('No interview model configured on this server');
    }

    const storyBlock = plannerState?.interviewStory?.en
        ? `\nInterview story (prefer this for scene/mood/energy prose):\n${plannerState.interviewStory.en}`
        : '';
    const reachableBlock = plannerState?.reachableGenresNote
        ? `\nReachable genres (from interview): ${plannerState.reachableGenresNote}`
        : '';
    const hypothesesBlock =
        plannerState?.hypotheses?.length && plannerState.hypotheses.length > 1
            ? `\nHypotheses (keep playlist open to all): ${plannerState.hypotheses.join(', ')}`
            : '';

    const userPrompt = `Write one Spotify Prompted Playlist paragraph from these interview answers.

${formatAnswersBlock(answers, plannerState)}${storyBlock}${reachableBlock}${hypothesesBlock}

Weave the dimensions into natural sentences — not a checklist. Output JSON only.`;

    const raw = await completeChat(
        env,
        [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ],
        { model: resolvedModel }
    );

    const parsed = paragraphSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
        const fallback = raw.trim().replace(/^```[\s\S]*?\n|```$/g, '').trim();
        if (fallback.length > 0) {
            return normalizeParagraph(fallback);
        }
        throw new Error(`Prompt LLM returned invalid JSON: ${parsed.error.message}`);
    }

    return normalizeParagraph(parsed.data.paragraph);
}
