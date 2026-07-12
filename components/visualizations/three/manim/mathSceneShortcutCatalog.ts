export type MathSceneInteractiveShortcutId =
  | "add"
  | "checkpoint_paste"
  | "play"
  | "redo"
  | "reload"
  | "remove"
  | "save_state"
  | "undo"
  | "wait";

type MathSceneShortcutGroup = "checkpoint" | "history" | "playback" | "scene-graph" | "state";

type MathSceneShortcutEntry = {
  group: MathSceneShortcutGroup;
  id: MathSceneInteractiveShortcutId;
  redrawsAfterCell: boolean;
};

export type MathSceneShortcutCatalog = {
  checkpointShortcutCount: number;
  historyShortcutCount: number;
  ids: MathSceneInteractiveShortcutId[];
  playbackShortcutCount: number;
  redrawAfterCellCount: number;
  reloadReady: boolean;
  sceneGraphShortcutCount: number;
  shortcutAuthoringPolicy: string;
  sourceContract: string;
  stateShortcutCount: number;
  summary: string;
  totalShortcutCount: number;
  version: "mais-manim-shortcut-catalog/v1";
};

export const SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT =
  "InteractiveSceneEmbed embedded authoring-shell shortcuts: play/wait/add/remove/save_state/undo/redo/checkpoint_paste/reload";

export const SCENE_SHORTCUT_AUTHORING_POLICY =
  "checkpoint-paste-post-cell-redraw-plus-reload-authoring-lifecycle-shortcuts";

const interactiveSceneShortcuts: MathSceneShortcutEntry[] = [
  { group: "playback", id: "play", redrawsAfterCell: false },
  { group: "playback", id: "wait", redrawsAfterCell: false },
  { group: "scene-graph", id: "add", redrawsAfterCell: false },
  { group: "scene-graph", id: "remove", redrawsAfterCell: false },
  { group: "state", id: "save_state", redrawsAfterCell: false },
  { group: "history", id: "undo", redrawsAfterCell: false },
  { group: "history", id: "redo", redrawsAfterCell: false },
  { group: "checkpoint", id: "checkpoint_paste", redrawsAfterCell: true },
  { group: "state", id: "reload", redrawsAfterCell: false }
];

function countGroup(group: MathSceneShortcutGroup) {
  return interactiveSceneShortcuts.filter((shortcut) => shortcut.group === group).length;
}

function buildSummary(catalog: Omit<MathSceneShortcutCatalog, "summary" | "version">) {
  return [
    `shortcuts:total=${catalog.totalShortcutCount}`,
    `playback=${catalog.playbackShortcutCount}`,
    `sceneGraph=${catalog.sceneGraphShortcutCount}`,
    `state=${catalog.stateShortcutCount}`,
    `history=${catalog.historyShortcutCount}`,
    `checkpoint=${catalog.checkpointShortcutCount}`,
    `redraw=${catalog.redrawAfterCellCount}`,
    `reload=${String(catalog.reloadReady)}`
  ].join(":");
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// Manim source contract:
// - InteractiveSceneEmbed injects embedded authoring-shell shortcuts:
//   play, wait, add, remove, save_state, undo, redo, checkpoint_paste, reload.
// - checkpoint_paste is the shortcut that participates in the post-cell redraw
//   loop after pasted code runs.
// - reload is exposed as an authoring lifecycle shortcut, not a renderer object.
export function buildSceneShortcutCatalog(): MathSceneShortcutCatalog {
  const ids = interactiveSceneShortcuts.map((shortcut) => shortcut.id);
  const baseCatalog = {
    checkpointShortcutCount: countGroup("checkpoint"),
    historyShortcutCount: countGroup("history"),
    ids,
    playbackShortcutCount: countGroup("playback"),
    redrawAfterCellCount: interactiveSceneShortcuts.filter((shortcut) => shortcut.redrawsAfterCell).length,
    reloadReady: ids.includes("reload"),
    sceneGraphShortcutCount: countGroup("scene-graph"),
    shortcutAuthoringPolicy: SCENE_SHORTCUT_AUTHORING_POLICY,
    sourceContract: SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT,
    stateShortcutCount: countGroup("state"),
    totalShortcutCount: ids.length
  };

  return {
    ...baseCatalog,
    summary: buildSummary(baseCatalog),
    version: "mais-manim-shortcut-catalog/v1"
  };
}

export function sceneShortcutCatalogDataAttributes(catalog: MathSceneShortcutCatalog): Record<string, string> {
  return {
    "data-viz-manim-shortcut-checkpoint-count": String(catalog.checkpointShortcutCount),
    "data-viz-manim-shortcut-count": String(catalog.totalShortcutCount),
    "data-viz-manim-shortcut-history-count": String(catalog.historyShortcutCount),
    "data-viz-manim-shortcut-ids": catalog.ids.join(",") || "none",
    "data-viz-manim-shortcut-playback-count": String(catalog.playbackShortcutCount),
    "data-viz-manim-shortcut-redraw-count": String(catalog.redrawAfterCellCount),
    "data-viz-manim-shortcut-reload-ready": String(catalog.reloadReady),
    "data-viz-manim-shortcut-scene-graph-count": String(catalog.sceneGraphShortcutCount),
    "data-viz-manim-shortcut-source-contract": catalog.sourceContract,
    "data-viz-manim-shortcut-state-count": String(catalog.stateShortcutCount),
    "data-viz-manim-shortcut-authoring-policy": catalog.shortcutAuthoringPolicy,
    "data-viz-manim-shortcut-summary": catalog.summary
  };
}

export function serializeSceneShortcutCatalog(catalog: MathSceneShortcutCatalog) {
  return stableSerialize(catalog);
}
