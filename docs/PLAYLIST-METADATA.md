# Playlist prose — listen arc, name & description

**Status:** Implemented — metadata in curate pass (`apps/api/src/llm/curate.ts`, `curate-metadata.ts`); publish uses `pickPlaylistMetadata()`  
**Product canon:** `~/.cursor/skills/create-playlist/step-2-2-build-mcp.md` § Step 2.2.3, 2.2.6  
**Goal:** Name and description should match the listen arc — same supervisor voice, same brief, different jobs.

---

## Scope

At build time the user sees three prose artifacts derived from the compact brief:

| Output | Where | Job |
|--------|-------|-----|
| **Listen arc** | Curate → build preview & results | Explain how 26 tracks move — the supervisor’s arc note |
| **Playlist name** | Spotify publish | Title card — recognizable in a library grid |
| **Playlist description** | Spotify publish | Mini listen arc — scene + vibe that tells a story |

All three share one generation frame. The listen arc is the **reference implementation** today; name and description should follow its style, not interview chip wording or brief field templates.

---

## Shared generation frame

From the curate prompt (`curate.ts` + skill § 2.2.3):

> You are a music supervisor scoring a short scene. The brief below is the director’s note — treat it as law.

| Principle | Meaning |
|-----------|---------|
| **Brief-backed** | Derive from `STORY`, `ANCHOR`, `EMOTION`, `PACE`, `SONIC`, `FLOW`, `REJECT` — do not invent a new vibe or pull from track titles |
| **Felt, not labeled** | Write texture the listener would feel (*hollow hush*, *warm low*, *close breath*) — not mood adjectives as labels (*sad*, *chill*) or genre stacks (*indie folk acoustic*) |
| **Scene as film** | Ground prose in the user’s place and moment; the brief is a shot list, not a form |
| **Invent wording** | Distill the brief into fresh sentences — never paste `ANCHOR:` / `Feels X, built from Y` template keys |
| **Honor REJECT (silently)** | `REJECT` shapes what the vibe **is** — never what to skip in prose. No *keep clear of…*, *avoid…*, *please no…*, or *避开…* in name, description, or listen arc. Positive scene and texture only; rejects are enforced in track selection, not copy |
| **No catalog noise** | Prose is about the arc and scene — not artist names, track counts, or internal tags |

**Locale:** Listen arc is always bilingual (EN + 中文), composed **independently** — not translation. Name and description follow the user’s content locale at publish (`en` | `zh`); target native composition in the same curate pass, not post-hoc English templates + translate fallback.

---

## Listen arc (reference)

### How it is generated

Produced in **Step 2.2.3 / curate** alongside the proposed tracklist — same LLM call, same brief.

```text
## Sequence intent
### English
3–5 sentences …

### 中文
3–5 句 …
```

Prompt contract (`curate.ts`):

- **3–5 sentences** describing the listen arc for all 26 tracks
- Name **0–2 extra ordering dimensions** beyond energy when they matter (density, brightness, warmth, vocal presence) — only where transitions need them
- When multiple genre clusters are reachable, the arc must **name all clusters** — no silent collapse to one subgenre
- 中文: natural Simplified Chinese, independently composed — no 英译中腔调

Displayed in the UI as **Listen arc** / **聆听走向** (`build-copy.ts`).

### Voice (what good looks like)

Supervisor prose — cinematic but readable. Opens on the scene or the first sonic move; walks through how the list breathes.

**Good (from tests / canon):**

> The sequence opens in hollow hush after the last carriage leaves, then slowly gathers warmth — close breath and room around the strings before a soft lift toward the end.

> Gentle wave: warm opener → sparse fingerpick dip → soft lift home.

**Bad:**

| Problem | Example |
|---------|---------|
| Brief paste | *Feels wistful with a little unfinished feeling, slow and steady, built from close acoustic guitar…* |
| Genre menu | *Indie folk into singer-songwriter with some ambient* |
| Track inventory | *Starts with Bon Iver, then Phoebe Bridgers…* |
| Mood label only | *A sad, chill playlist that relaxes you.* |
| Explicit reject | *…nothing clubby or aggressive.* / *避开夜店感* |
| No arc | *26 great songs that match the brief.* |

### Arc shapes (invent wording — not a menu)

From skill § Ordering patterns — pick the shape that matches `FLOW`:

| Pattern | Shape | Fits when… |
|---------|--------|------------|
| **Slow ignition** | quiet → charged, no cliff | PACE brightens; night-drive / settle-in |
| **Gentle wave** | swell → dip → soft lift | M3 wave; emotional resolve |
| **Fade to still** | peak mid-list, exhale at end | wind-down, post-event |
| **Flat scene, rotating faces** | same temperature, new timbre | one sustained mood, variety without arc |
| **Bookends** | opener/closer echo ANCHOR; middle explores | strong M1 place/moment |
| **Plot twist** | palette break ~tracks 3–8, then integrate | left turns welcome |
| **Bridge crossing** | color A → bridge → color B, same mood | hybrid / DJ-set feel |

---

## Playlist name

Same supervisor lens; **title-card** job instead of arc walkthrough.

### Shape

One line. Evocative and specific — a scene fragment plus a sonic lean, or a single distilled image if the arc is flat.

```text
{Scene or moment image} — {Sonic / texture lean}
```

| Constraint | Limit |
|------------|-------|
| Spotify title | ≤ **100 characters** |
| Word count | ~2–8 words EN; compact 现代诗 fragment + sonic half for ZH |

The em dash is the usual split — scene left, felt sonic right — but both halves use **supervisor vocabulary** (as in listen arc cues: *hollow hush*, *warm low*, *charged synth build*), not interview chip text or brief field names.

### Good names

| Brief sketch | Name |
|--------------|------|
| Last train, hollow open, acoustic arc | *Empty platform — close breath and strings* |
| Rain car, wistful, slow acoustic | *Back seat, rain on glass — room around the strings* |
| Highway, restless, synth ignition | *Highway shoulder — charged synth build* |
| Sustained kitchen night, flat FLOW | *Late kitchen counter — sparse piano hush* |

### Bad names

| Problem | Example |
|---------|---------|
| Generic | *My Playlist*, *Night Mix*, *Vibelist #3* |
| Mood-only | *Wistful Feelings*, *Chill Vibes* |
| Genre stack | *Indie Folk Acoustic Chill* |
| Brief template | *Standing in a quiet hallway — close acoustic guitar or finger* |
| English leak in `zh` | *Standing in hallway — acoustic* |

### Chinese names

Same two-part logic. Scene half: short concrete fragment (现代诗 density, not a full sentence). Sonic half: plain texture phrase. Compose in curate — avoid calquing the English name.

---

## Playlist description

**Closest to the listen arc** — same supervisor voice, same storytelling move. Not a shelf blurb or a brief summary; a **short scene that shapes a vibe**.

Think: the listen arc with the track-by-track walk trimmed off. Opens on a image, lets the feeling gather, maybe one breath of sonic texture or arc shape — then stops. The reader should *feel* the room, not read a spec sheet.

### Shape

**2–4 sentences** (may match listen arc density when space allows). Hard cap **300 characters**.

Weave — do not checklist:

1. **Scene** — a moment from `STORY` / `ANCHOR` the user would recognize
2. **Vibe** — emotion and pace as lived experience (*unhurried*, *hollow hush*, *slowly gathers warmth*)
3. **Sonic atmosphere** — cue-level texture woven into the sentences (*close breath*, *room around the strings*), not a separate “built from X” clause
4. **Optional arc hint** — one phrase of movement when `FLOW` has shape (*then a soft lift*, *settles into still*)

`REJECT` informs tone and word choice only — never a closing avoid sentence.

### Good description (EN)

> Rain streaks the back-seat glass; the city blurs outside. The music stays unhurried and close — wistful, but not heavy — breathing through soft strings and room around each note, slowly gathering warmth before it fades.

> The sequence opens in hollow hush after the last carriage leaves, then slowly gathers warmth — close breath and room around the strings before a soft lift toward the end.

*(Second example: listen arc trimmed to fit Spotify — valid when under 300 chars.)*

### Bad description (EN)

| Problem | Example |
|---------|---------|
| Explicit reject | *…Keeps clear of club energy and gym-pop hype.* / *Please avoid EDM drops.* |
| Template dump | *A playlist for standing in a quiet hallway. Feels calm but not empty, slow and steady, built from close acoustic guitar…* |
| Spec sheet | *Scene: rain car. Mood: wistful. Pace: slow. Sonic: acoustic.* |
| Step 2.1 prompt | *I'm looking for music that feels wistful. The pace should be very slow. Sonically, close acoustic… Please avoid club energy.* |
| Too vague | *Chill vibes for relaxing.* |
| Genre stack | *Indie, folk, acoustic, singer-songwriter, lo-fi.* |
| Track leakage | *Featuring Bon Iver, Phoebe Bridgers…* |

### Chinese description

Same storytelling move — natural 简体中文, independently composed. Shape the vibe; never *避开…* or *不要…* reject clauses.

**Good:**

> 雨点打在后座玻璃上，外面的城市化成一片模糊。音乐贴得很近，留一点怅然却不往下沉，在木吉他和弦的留白里慢慢暖起来，最后轻轻收住。

---

## How the three relate

```text
Brief (director's note)
        │
        ▼
   Curate pass
        │
        ├── Listen arc     … 3–5 sentences — full arc across 26 tracks
        ├── Name           … one line — distilled scene + sonic title card
        └── Description    … 2–4 sentences — mini listen arc; scene + vibe for Spotify
        │
        ▼
   Proposed tracklist (26 lines, listen order)
```

| | Listen arc | Name | Description |
|---|------------|------|-------------|
| **Length** | 3–5 sentences × 2 locales | ≤ 100 chars | ≤ 300 chars |
| **Focus** | Movement across the list | Recognizable title | Scene + vibe — story, not spec |
| **May include** | Arc shape, ordering dims, cluster names | Scene image + sonic lean | Arc hint, sonic atmosphere woven in |
| **Must not** | Track names, genre stacks; explicit reject clauses | Generic / mood-only titles | Brief field paste; *avoid / 避开* wording; Step 2.1 prompt shape |

All three should sound like the same supervisor wrote them in one sitting.

---

## Quality checklist

Score **brief fidelity first**, voice second (same bar as [INTERVIEW-PROMPT-STRATEGY.md](./INTERVIEW-PROMPT-STRATEGY.md) § Grader rubric).

### Blocking

1. Does it read like supervisor prose — not interview chips, not `Feels X, built from Y`?
2. Is the scene recognizable from the user’s story?
3. Are felt qualities used instead of mood labels or genre stacks?
4. No explicit reject wording (*avoid*, *keep clear of*, *避开*, *不要*) in any prose field?
5. Length within limits (arc 3–5 sentences; name ≤ 100; description ≤ 300)?
6. `zh` locale: no English brief leakage?

### Warnings

- Name and description disagree with the listen arc’s scene or temperature
- Description reads like a spec sheet or Step 2.1 prompt — not a story
- Explicit reject language anywhere in prose (*avoid*, *keep clear of*, *避开*, *不要*)
- 中文 reads like translation — rewrite independently

---

## Implementation

| Output | Today | Target |
|--------|-------|--------|
| Listen arc | LLM in `curateTracklist()` — `## Sequence intent` block | Done |
| Name + description | LLM in same curate pass — `## Playlist metadata`; deterministic validate + arc fallback | Done |

**Grade loop:** `cd apps/api && npx tsx scripts/test-curate-prose.ts` — generates via `curateTracklist()`, grades output with `gradeCurateProse()`. Grader subagent reads `.curate-prose/grade-*.md` against this doc (generated prose, not the prompt).

---

## Related

| Doc / file | Role |
|------------|------|
| `apps/api/src/llm/curate.ts` | Listen arc prompt + parser (reference) |
| `apps/api/src/brief.ts` | Current template name/description (to replace) |
| `apps/api/src/routes/build.ts` | Publish — consumes metadata + sequence intent |
| `~/.cursor/skills/create-playlist/step-2-2-build-mcp.md` | Product canon § 2.2.3, 2.2.6 |
| [INTERVIEW-STRATEGY.md](./INTERVIEW-STRATEGY.md) | Interview copy — **not** the voice source for these three |
