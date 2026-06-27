export const draftOutputSchema = `{
  "stemEn": "...",
  "stemZh": "...",
  "hintEn": "optional — omit when stem already asks; mechanics or missing axis only",
  "hintZh": "optional — omit when stem already asks; mechanics or missing axis only",
  "options": [{ "id": "slug", "labelEn": "...", "labelZh": "..." }]
}`;

export const planOutputSchema = `{
  "gaps": ["m2"],
  "reachableGenresNote": "prose: what music flavors are still reachable after reading prior answers; what is ruled out",
  "hypotheses": ["indie folk intimate", "trip-hop dusk", "social dance warmth"],
  "plannedOptionCount": 4,
  "axis": "mood in scene | night chapter | scene partition",
  "sceneBeat": "private 10s film beat",
  "lateralHook": false,
  "filterDrops": ["gym-pop motivation"],
  "q1RegionsToCover": ["intimate-still", "kinetic-high"],
  "stemGuidance": "...",
  "optionGuidance": "...",
  "questionMode": "SceneFeeling",
  "plannedOptionIds": ["slug-a", "slug-b"],
  "optionSlots": { "slug-a": { "regionId": "bittersweet-mid" } },
  "coverageRisk": false,
  "needsGrooveGrain": false,
  "needsClarification": false,
  "inferredM5Draft": "optional"
}`;

export const verifyOutputSchema = `{ "passed": true, "failures": [] }
or { "passed": false, "failures": ["specific fix 1"] }`;

export const storyOutputSchema = `{
  "storyEn": "exactly 3 sentences — scene, mood, night chapter",
  "storyZh": "正好三句 — 场景、心情、夜晚段落"
}`;
