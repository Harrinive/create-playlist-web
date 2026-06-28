---
name: prompt-editing-playlist
description: >-
  Repo pointer for interview prompt tuning on create-playlist-web. Loads
  grader-editor-loop and prompt-editing plus playlist-specific runner scripts
  and canon. Use when optimizing apps/api interview prompts in this repository.
---

# Prompt editing — create-playlist-web

**Load order:**

1. `~/.cursor/skills/grader-editor-loop/SKILL.md` — process
2. `~/.cursor/skills/prompt-editing/SKILL.md` — prompt-editing principles

This file adds **repo-specific** paths for the Vibelist interview pipeline.

## Canon (grader sources)

| Doc | Purpose |
|-----|---------|
| `docs/INTERVIEW-STRATEGY.md` | Primary interview rules (story-native M1–M3, adaptive M4) |
| `docs/INTERVIEW-M4-AVOID.md` | M4 trap eligibility, avoid vs discriminant modes |
| `~/.cursor/skills/create-playlist/` | Product skill (Step 1 interview spec) |

## Prompt tree (editor artifacts)

`apps/api/src/llm/interview/prompts/` — plan, draft, verify, blocks, sections, turn-config

Mechanical validators (code, not prompt prose):

- `apps/api/src/llm/interview/verify-deterministic.ts`
- `apps/api/src/llm/interview/verify-severity.ts`
- `apps/api/src/llm/interview/m4-eligibility.ts`

## Runner scripts

| Script | Use |
|--------|-----|
| `apps/api/scripts/orchestrate-step.ts` | One step + custom prior answers JSON |
| `apps/api/scripts/orchestrate-flow.ts` | Full chain with auto-pick |
| `apps/api/scripts/orchestrate-to-step.ts` | Run to target step with explicit picks |
| `apps/api/scripts/orchestrate-path.ts` | Full chain for a fixed story path |
| `apps/api/scripts/run-interview-path-matrix.ts` | All paths M1→M4 regression matrix (both models if no arg) |
| `apps/api/scripts/interview-paths.ts` | Fixed path presets (incl. deep-prog-house) |
| `apps/api/scripts/test-m4-scenarios.ts` | Batch M4 scenarios (avoid + discriminant paths) |
| `apps/api/scripts/test-curate-prose.ts` | Curate listen arc + playlist metadata — deterministic grade + report for Grader subagent |
| `apps/api/scripts/test-interview-step.ts` | Single step smoke test |

```bash
cd apps/api && npx tsx scripts/run-interview-path-matrix.ts
cd apps/api && npx tsx scripts/run-interview-path-matrix.ts openai:gpt-5.4-mini
cd apps/api && npx tsx scripts/run-interview-path-matrix.ts anthropic:claude-haiku-4-5
cd apps/api && npx tsx scripts/orchestrate-path.ts deep-prog-house
cd apps/api && npx tsx scripts/test-m4-scenarios.ts
cd apps/api && npm run test:verify
```

## Suggested loops for this repo

**Sequential (Q1→M4):** orchestrate-step with answer history; grader against `INTERVIEW-STRATEGY.md`; editor touches plan + draft + verify prompts.

**Batch (M4):** test-m4-scenarios (5 presets); grader reviews cross-cutting register/trap failures; editor applies general M4 principles (not per-scenario wording).

**Curate prose (listen arc + metadata):** `test-curate-prose.ts` calls `curateTracklist()` on ≥2 divergent briefs, runs deterministic `gradeCurateProse()`, writes report to `.curate-prose/`. Grader subagent grades **generated output** in that report against `docs/PLAYLIST-METADATA.md` — not the prompt text. Editor adjusts `curate-prompt.ts` on FAIL themes only.

## Context-dependent validation (interview)

Per `prompt-editing` principle F: each **question and option** depends on the prompt **and** prior interview answers (M1→M3 history, planner state). Validate with **≥2 divergent story paths** — e.g. post-party aftermath vs crowded kitchen / house-electronic — not only the path that triggered the failure. Use `run-interview-path-matrix.ts` or `orchestrate-path.ts` with different presets; track pass rate per path.

## Prior sessions (reference)

- [Q1–Q5 editor/grader loop](7e911a47-3f5f-47e0-96d7-8d743cd29f0c)
- [Principle-based refactor pass](6af90d82-6066-45b7-a8d7-cb2f1e57854f)
- [M4 batch scenario loop](489301f8-9c75-4916-bb54-57741003792a)
