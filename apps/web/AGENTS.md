## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Locale (en / zh)

- **Static UI** — pair `<span data-locale="en">` / `<span data-locale="zh" hidden>` in Astro; `applyLocaleToDocument` swaps visibility at the fade midpoint.
- **Dynamic UI** — any JS `textContent` / `innerHTML` must relocalize on language change:
- Page scripts: `createLocaleScope(signal).onRelocalize((locale) => { … })` then `scope.runNow()`
  - Stateful modules (e.g. interview wizard): `onLocaleChange((locale) => { … }, signal)`
  - App-wide hooks: `onLocaleChange(handler)` (no signal)
- Do **not** listen for a `locale-changed` DOM event; use `onLocaleChange` from `src/lib/locale.ts`.
- Loading/progress widgets should expose `relocalize(locale)` if they animate with locale-specific copy.

### Locale principles (avoid fragile UI)

| Principle | Rule |
|-----------|------|
| **Structure vs copy** | Prefer paired `data-locale` spans over `textContent` when both languages are known at mount time. |
| **Inject then sync** | After injecting `[data-locale]` nodes, call `syncLocaleNodes(readLocale())` — not `applyLocaleToDocument` (which no-ops mid-crossfade). |
| **Don't remount on locale** | If a widget already uses `data-locale`, do not destroy/remount it on `onLocaleChange`; static swap handles language. Remount only on **state** changes (session, delivery, etc.). |
| **Dynamic copy needs a relocalizer** | `textContent` / locale-specific templates must register `onLocaleChange` or `createLocaleScope`; mount-time copy alone is not enough. |
| **Mid-crossfade timing** | Relocalizers run at fade midpoint (after `applyLocaleInstant`). New DOM injected in a relocalizer must call `syncLocaleNodes`, not full `applyLocaleToDocument`. |
