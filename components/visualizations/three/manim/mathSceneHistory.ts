export const SCENE_HISTORY_SOURCE_CONTRACT =
  "Scene.save_state/restore: undo_stack redo_stack max_num_saved_states mobjects_match" as const;

export const SCENE_HISTORY_BRANCH_POLICY =
  "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels" as const;

export type MathSceneHistoryEntry<TState> = {
  label: string;
  revision: number;
  state: TState;
};

export type MathSceneHistoryStore<TState> = {
  branchInvalidatedRedoCount: number;
  branchInvalidatedRedoLabels: string[];
  current: MathSceneHistoryEntry<TState>;
  droppedUndoCount: number;
  maxUndoEntries: number;
  redoStack: MathSceneHistoryEntry<TState>[];
  revision: number;
  sourceContract: typeof SCENE_HISTORY_SOURCE_CONTRACT;
  undoStack: MathSceneHistoryEntry<TState>[];
};

export type MathSceneHistorySummary = {
  branchInvalidatedRedoCount?: number;
  branchInvalidatedRedoLabels?: string;
  branchPolicy?: string;
  canRedo: boolean;
  canUndo: boolean;
  currentLabel: string;
  droppedUndoCount: number;
  maxUndoEntries: number;
  redoCount: number;
  revision: number;
  sourceContract?: typeof SCENE_HISTORY_SOURCE_CONTRACT;
  undoCount: number;
};

export type MathSceneHistoryEntryManifest = {
  label: string;
  revision: number;
  stateSignature: string;
};

export type MathSceneHistoryManifest = {
  branchInvalidatedRedoCount: number;
  branchInvalidatedRedoLabels: string[];
  branchPolicy: typeof SCENE_HISTORY_BRANCH_POLICY;
  canRedo: boolean;
  canUndo: boolean;
  current: MathSceneHistoryEntryManifest;
  droppedUndoCount: number;
  maxUndoEntries: number;
  redoCount: number;
  redoStack: MathSceneHistoryEntryManifest[];
  revision: number;
  sourceContract: typeof SCENE_HISTORY_SOURCE_CONTRACT;
  summary: string;
  undoCount: number;
  undoStack: MathSceneHistoryEntryManifest[];
  version: "mais-manim-history/v1";
};

export type MathSceneHistoryResult<TState> = {
  changed: boolean;
  entry: MathSceneHistoryEntry<TState>;
  state: TState;
  store: MathSceneHistoryStore<TState>;
};

export type MathSceneHistoryPushOptions = {
  label?: string;
  maxUndoEntries?: number;
};

function cloneState<TState>(state: TState): TState {
  return JSON.parse(JSON.stringify(state)) as TState;
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(stableValue);
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

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `history-state-${hash.toString(16).padStart(8, "0")}`;
}

function stateSignature(state: unknown) {
  if (state && typeof state === "object" && typeof (state as { signature?: unknown }).signature === "string") {
    return (state as { signature: string }).signature;
  }

  return hashStableJson(stableSerialize(state));
}

function statesMatch(left: unknown, right: unknown) {
  return stableSerialize(left) === stableSerialize(right);
}

function cloneEntry<TState>(entry: MathSceneHistoryEntry<TState>): MathSceneHistoryEntry<TState> {
  return {
    label: entry.label,
    revision: entry.revision,
    state: cloneState(entry.state)
  };
}

function normalizeHistoryLabel(label: string | undefined) {
  const firstLine = (label ?? "state").split("\n")[0]?.trim() ?? "state";
  const withoutComment = firstLine.replace(/^#+\s*/, "").trim();
  return withoutComment || "state";
}

function normalizeMaxUndoEntries(value: number | undefined) {
  if (value === undefined) return 50;
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.floor(value));
}

function capUndoStack<TState>(entries: MathSceneHistoryEntry<TState>[], maxUndoEntries: number) {
  if (entries.length <= maxUndoEntries) return entries;
  return entries.slice(entries.length - maxUndoEntries);
}

function droppedUndoEntryCount(totalEntries: number, maxUndoEntries: number) {
  return Math.max(0, totalEntries - maxUndoEntries);
}

export function createSceneHistoryStore<TState>(
  initialState: TState,
  options: { label?: string } = {}
): MathSceneHistoryStore<TState> {
  return {
    branchInvalidatedRedoCount: 0,
    branchInvalidatedRedoLabels: [],
    current: {
      label: normalizeHistoryLabel(options.label ?? "initial"),
      revision: 0,
      state: cloneState(initialState)
    },
    droppedUndoCount: 0,
    maxUndoEntries: 50,
    redoStack: [],
    revision: 0,
    sourceContract: SCENE_HISTORY_SOURCE_CONTRACT,
    undoStack: []
  };
}

export function pushSceneHistory<TState>(
  store: MathSceneHistoryStore<TState>,
  nextState: TState,
  options: MathSceneHistoryPushOptions = {}
): MathSceneHistoryStore<TState> {
  // Source contract: Manim Scene.save_state() skips adjacent snapshots when
  // mobjects_match reports no change, clears redo_stack, appends to undo_stack,
  // then caps undo history with max_num_saved_states.
  if (statesMatch(store.current.state, nextState)) return store;

  const nextRevision = store.revision + 1;
  const maxUndoEntries = normalizeMaxUndoEntries(options.maxUndoEntries ?? store.maxUndoEntries);
  const uncappedUndoStack = [...store.undoStack.map(cloneEntry), cloneEntry(store.current)];
  const undoStack = capUndoStack(uncappedUndoStack, maxUndoEntries);
  const invalidatedRedoLabels = store.redoStack.map((entry) => entry.label);

  return {
    branchInvalidatedRedoCount: invalidatedRedoLabels.length,
    branchInvalidatedRedoLabels: invalidatedRedoLabels,
    current: {
      label: normalizeHistoryLabel(options.label),
      revision: nextRevision,
      state: cloneState(nextState)
    },
    droppedUndoCount: store.droppedUndoCount + droppedUndoEntryCount(uncappedUndoStack.length, maxUndoEntries),
    maxUndoEntries,
    redoStack: [],
    revision: nextRevision,
    sourceContract: SCENE_HISTORY_SOURCE_CONTRACT,
    undoStack
  };
}

export function undoSceneHistory<TState>(store: MathSceneHistoryStore<TState>): MathSceneHistoryResult<TState> {
  const previous = store.undoStack.at(-1);
  if (!previous) {
    return {
      changed: false,
      entry: cloneEntry(store.current),
      state: cloneState(store.current.state),
      store
    };
  }

  const nextRevision = store.revision + 1;
  const current = {
    ...cloneEntry(previous),
    revision: nextRevision
  };
  const nextStore = {
    branchInvalidatedRedoCount: 0,
    branchInvalidatedRedoLabels: [],
    current,
    droppedUndoCount: store.droppedUndoCount,
    maxUndoEntries: store.maxUndoEntries,
    redoStack: [cloneEntry(store.current), ...store.redoStack.map(cloneEntry)],
    revision: nextRevision,
    sourceContract: SCENE_HISTORY_SOURCE_CONTRACT,
    undoStack: store.undoStack.slice(0, -1).map(cloneEntry)
  };

  return {
    changed: true,
    entry: cloneEntry(current),
    state: cloneState(current.state),
    store: nextStore
  };
}

export function redoSceneHistory<TState>(store: MathSceneHistoryStore<TState>): MathSceneHistoryResult<TState> {
  const next = store.redoStack[0];
  if (!next) {
    return {
      changed: false,
      entry: cloneEntry(store.current),
      state: cloneState(store.current.state),
      store
    };
  }

  const nextRevision = store.revision + 1;
  const current = {
    ...cloneEntry(next),
    revision: nextRevision
  };
  const nextStore = {
    branchInvalidatedRedoCount: 0,
    branchInvalidatedRedoLabels: [],
    current,
    droppedUndoCount: store.droppedUndoCount,
    maxUndoEntries: store.maxUndoEntries,
    redoStack: store.redoStack.slice(1).map(cloneEntry),
    revision: nextRevision,
    sourceContract: SCENE_HISTORY_SOURCE_CONTRACT,
    undoStack: [...store.undoStack.map(cloneEntry), cloneEntry(store.current)]
  };

  return {
    changed: true,
    entry: cloneEntry(current),
    state: cloneState(current.state),
    store: nextStore
  };
}

export function summarizeSceneHistory<TState>(store: MathSceneHistoryStore<TState>): MathSceneHistorySummary {
  return {
    branchInvalidatedRedoCount: store.branchInvalidatedRedoCount,
    branchInvalidatedRedoLabels: store.branchInvalidatedRedoLabels.join(",") || "none",
    branchPolicy: SCENE_HISTORY_BRANCH_POLICY,
    canRedo: store.redoStack.length > 0,
    canUndo: store.undoStack.length > 0,
    currentLabel: store.current.label,
    droppedUndoCount: store.droppedUndoCount,
    maxUndoEntries: store.maxUndoEntries,
    redoCount: store.redoStack.length,
    revision: store.revision,
    sourceContract: store.sourceContract,
    undoCount: store.undoStack.length
  };
}

export function sceneHistoryDataAttributes(summary: MathSceneHistorySummary): Record<string, string> {
  return {
    "data-viz-manim-history-can-redo": summary.canRedo ? "true" : "false",
    "data-viz-manim-history-can-undo": summary.canUndo ? "true" : "false",
    "data-viz-manim-history-branch-invalidated-redo-count": String(summary.branchInvalidatedRedoCount ?? 0),
    "data-viz-manim-history-branch-invalidated-redo-labels": summary.branchInvalidatedRedoLabels ?? "none",
    "data-viz-manim-history-branch-policy": summary.branchPolicy ?? SCENE_HISTORY_BRANCH_POLICY,
    "data-viz-manim-history-current-label": summary.currentLabel,
    "data-viz-manim-history-dropped-undo-count": String(summary.droppedUndoCount),
    "data-viz-manim-history-max-undo-entries": String(summary.maxUndoEntries),
    "data-viz-manim-history-redo-count": String(summary.redoCount),
    "data-viz-manim-history-revision": String(summary.revision),
    "data-viz-manim-history-source-contract": summary.sourceContract ?? SCENE_HISTORY_SOURCE_CONTRACT,
    "data-viz-manim-history-undo-count": String(summary.undoCount)
  };
}

function historyEntryManifest<TState>(entry: MathSceneHistoryEntry<TState>): MathSceneHistoryEntryManifest {
  return {
    label: entry.label,
    revision: entry.revision,
    stateSignature: stateSignature(entry.state)
  };
}

function buildHistoryManifestSummary(manifest: Omit<MathSceneHistoryManifest, "summary" | "version">) {
  return [
    `history:revision=${manifest.revision}`,
    `current=${manifest.current.label}`,
    `undo=${manifest.undoCount}`,
    `redo=${manifest.redoCount}`,
    `dropped=${manifest.droppedUndoCount}`,
    `canUndo=${String(manifest.canUndo)}`,
    `canRedo=${String(manifest.canRedo)}`
  ].join(":");
}

export function buildSceneHistoryManifest<TState>(store: MathSceneHistoryStore<TState>): MathSceneHistoryManifest {
  const baseManifest = {
    branchInvalidatedRedoCount: store.branchInvalidatedRedoCount,
    branchInvalidatedRedoLabels: [...store.branchInvalidatedRedoLabels],
    branchPolicy: SCENE_HISTORY_BRANCH_POLICY,
    canRedo: store.redoStack.length > 0,
    canUndo: store.undoStack.length > 0,
    current: historyEntryManifest(store.current),
    droppedUndoCount: store.droppedUndoCount,
    maxUndoEntries: store.maxUndoEntries,
    redoCount: store.redoStack.length,
    redoStack: store.redoStack.map(historyEntryManifest),
    revision: store.revision,
    sourceContract: store.sourceContract,
    undoCount: store.undoStack.length,
    undoStack: store.undoStack.map(historyEntryManifest)
  };

  return {
    ...baseManifest,
    summary: buildHistoryManifestSummary(baseManifest),
    version: "mais-manim-history/v1"
  };
}

export function serializeSceneHistoryManifest(manifest: MathSceneHistoryManifest) {
  return stableSerialize(manifest);
}
