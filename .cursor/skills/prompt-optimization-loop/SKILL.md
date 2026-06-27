---
name: prompt-optimization-loop-playlist
description: >-
  Repo pointer for interview prompt tuning on create-playlist-web. Loads the
  global prompt-optimization-loop skill plus playlist-specific harness paths
  and canon. Use when optimizing apps/api interview prompts in this repository.
---

# Prompt optimization loop — create-playlist-web

**Read the global skill first:** `~/.cursor/skills/prompt-optimization-loop/SKILL.md`

This file adds **repo-specific** paths and context for the Vibelist interview pipeline.

## Canon (grader sources)

| Doc | Purpose |
|-----|---------|
| `docs/INTERVIEW-STRATEGY.md` | Primary interview rules (story-native M1–M3, adaptive M4) |
| `docs/INTERVIEW-M4-AVOID.md` | M4 trap eligibility, avoid vs discriminant modes |
| `~/.cursor/skills/create-playlist/` | Product skill (Step 1 interview spec) |

## Prompt tree

`apps/api/src/llm/interview/prompts/` — plan, draft, verify, blocks, sections, turn-config

Key code validators (mechanical enforcement, not prompt prose):

- `apps/api/src/llm/interview/verify-deterministic.ts`
- `apps/api/src/llm/interview/verify-severity.ts`
- `apps/api/src/llm/interview/m4-eligibility.ts`

## Harness scripts

| Script | Use |
|--------|-----|
| `apps/api/scripts/orchestrate-step.ts` | One step + custom prior answers JSON |
| `apps/api/scripts/orchestrate-flow.ts` | Full chain with auto-pick |
| `apps/api/scripts/orchestrate-to-step.ts` | Run to target step with explicit picks |
| `apps/api/scripts/test-m4-scenarios.ts` | Batch M4 scenarios (avoid + discriminant paths) |
| `apps/api/scripts/test-interview-step.ts` | Single step smoke test |

```bash
cd apps/api && npx tsx scripts/orchestrate-step.ts m2 '{"m1":{"id":"…","label":"…"}}'
cd apps/api && npx tsx scripts/test-m4-scenarios.ts
cd apps/api && npm run test:verify
```

## Suggested loops for this repo

**Sequential (Q1→M4):** orchestrate-step with answer history; grader against `INTERVIEW-STRATEGY.md`; editor touches plan + draft + verify prompts.

**Batch (M4):** test-m4-scenarios (5 presets); grader reviews cross-cutting register/trap failures; editor applies general M4 principles (not per-scenario wording).

## Prior sessions (reference)

- [Q1–Q5 editor/grader loop](7e911a47-3f5f-47e0-96d7-8d743cd29f0c)
- [Principle-based refactor pass](6af90d82-6066-45b7-a8d7-cb2f1e57854f)
- [M4 batch scenario loop](489301f8-9c75-4916-bb54-57741003792a)
