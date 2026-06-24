# llm-router (Node / TypeScript)

Multi-provider LLM gateway for Cursor, OpenAI, and Anthropic — mirrors toolbox **llm-router** (Python).

## Related package (Python)

| | Node (this package) | Python (sibling) |
|--|---------------------|------------------|
| **Repo** | `Harrinive/create-playlist-web` | `Harrinive/toolbox` |
| **Path** | `apps/api/src/llm-router/` | `packages/llm-router/` |
| **Import** | `import { completeChat, parseModel } from '../llm-router/index.js'` | `from llm_router import create_chat_client, parse_model` |
| **Used by** | Vibelist API (`create-playlist-api`) | Cycloud, batch jobs |

Keep **model strings**, env var names, and provider behavior aligned when changing either package. This folder is structured for later extraction to `packages/llm-router` in this repo or to toolbox as an npm package.

## Model strings

Same as Python — see [toolbox `packages/llm-router/README.md`](https://github.com/Harrinive/toolbox/blob/main/packages/llm-router/README.md).

```text
cursor:composer-2.5
openai:gpt-5.4-mini
anthropic:claude-haiku-4-5
anthropic:claude-sonnet-4-6
composer-2.5              # auto-detect cursor
```

## Usage

```typescript
import { completeChat, parseModel, isProviderConfigured } from './llm-router/index.js';

const text = await completeChat(env, [
    { role: 'system', content: '…' },
    { role: 'user', content: '…' }
], { model: 'cursor:composer-2.5' });
```

App-specific model roster (which models appear in interview / delivery pickers) lives in `../model-catalog.ts` — not in this module.

## Environment

| Variable | Provider |
|----------|----------|
| `CURSOR_API_KEY` | Cursor |
| `CURSOR_LLM_RUNTIME` | `local` (dev) or `cloud` (Fly) |
| `CURSOR_CLOUD_REPO` | Cursor cloud — required when runtime is cloud |
| `CURSOR_CLOUD_REF` | Git ref for cloud repo (default `main`) |
| `CURSOR_LOCAL_CWD` | Cursor local — optional cwd |
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
