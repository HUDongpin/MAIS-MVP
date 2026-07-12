export type SceneCheckpoint<TState> = {
  key: string;
  order: number;
  state: TState;
};

export type SceneCheckpointStore<TState> = {
  checkpoints: SceneCheckpoint<TState>[];
};

export const SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT =
  "CheckpointManager: normalized checkpoint keys store scene state; restore can invalidate later checkpoints" as const;

export type SceneCheckpointStoreManifest = {
  canRestore: boolean;
  checkpointCount: number;
  invalidatedCount: number;
  invalidatedKeys: string[];
  invalidateLater: boolean;
  keys: string[];
  latestKey: string;
  latestStateSignature: string;
  nextOrder: number;
  requestedKey: string;
  retainedKeysAfterRestore: string[];
  restoreAction: "idle" | "missing-checkpoint" | "restore-and-invalidate-later" | "restore-without-invalidating";
  restoredOrder: number | null;
  restoredStateSignature: string;
  sourceContract: typeof SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT;
  stateSignatureSummary: string;
  summary: string;
  version: "mais-manim-checkpoint-store/v1";
};

export type SceneCheckpointStoreManifestOptions = {
  invalidateLater?: boolean;
  restoreKey?: string | null;
};

function cloneState<TState>(state: TState): TState {
  return JSON.parse(JSON.stringify(state)) as TState;
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

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `checkpoint-state-${hash.toString(16).padStart(8, "0")}`;
}

function stateSignature(state: unknown) {
  if (state && typeof state === "object" && typeof (state as { signature?: unknown }).signature === "string") {
    return (state as { signature: string }).signature;
  }

  return hashStableJson(stableSerialize(state));
}

function normalizeCheckpointKey(key: string) {
  const firstLine = key.split("\n")[0]?.trim() ?? "checkpoint";
  const withoutComment = firstLine.replace(/^#+\s*/, "").trim();
  return withoutComment || "checkpoint";
}

export function createCheckpointStore<TState>(): SceneCheckpointStore<TState> {
  return { checkpoints: [] };
}

export function saveCheckpoint<TState>(
  store: SceneCheckpointStore<TState>,
  key: string,
  state: TState
): SceneCheckpointStore<TState> {
  const normalizedKey = normalizeCheckpointKey(key);
  const existingIndex = store.checkpoints.findIndex((checkpoint) => checkpoint.key === normalizedKey);
  const retained = existingIndex >= 0
    ? store.checkpoints.slice(0, existingIndex)
    : store.checkpoints;

  return {
    checkpoints: [
      ...retained,
      {
        key: normalizedKey,
        order: retained.length,
        state: cloneState(state)
      }
    ]
  };
}

export function restoreCheckpoint<TState>(
  store: SceneCheckpointStore<TState>,
  key: string,
  options: { invalidateLater?: boolean } = {}
): { state: TState; store: SceneCheckpointStore<TState> } | null {
  const normalizedKey = normalizeCheckpointKey(key);
  const index = store.checkpoints.findIndex((checkpoint) => checkpoint.key === normalizedKey);
  if (index < 0) return null;

  return {
    state: cloneState(store.checkpoints[index].state),
    store: options.invalidateLater
      ? { checkpoints: store.checkpoints.slice(0, index + 1) }
      : store
  };
}

export function listCheckpointKeys<TState>(store: SceneCheckpointStore<TState>) {
  return store.checkpoints.map((checkpoint) => checkpoint.key);
}

function buildCheckpointStoreSummary(manifest: Omit<SceneCheckpointStoreManifest, "summary" | "version">) {
  return [
    `checkpointStore:count=${manifest.checkpointCount}`,
    `latest=${manifest.latestKey}`,
    `requested=${manifest.requestedKey}`,
    `restore=${String(manifest.canRestore)}`,
    `invalidate=${String(manifest.invalidateLater)}`,
    `invalidated=${manifest.invalidatedCount}`,
    `next=${manifest.nextOrder}`
  ].join(":");
}

function checkpointRestoreAction({
  canRestore,
  checkpointCount,
  invalidateLater,
  requestedKey
}: Pick<SceneCheckpointStoreManifest, "canRestore" | "checkpointCount" | "invalidateLater" | "requestedKey">): SceneCheckpointStoreManifest["restoreAction"] {
  if (canRestore && invalidateLater) return "restore-and-invalidate-later";
  if (canRestore) return "restore-without-invalidating";
  return checkpointCount > 0 || requestedKey !== "none" ? "missing-checkpoint" : "idle";
}

// Manim source contract:
// - CheckpointManager stores ordered scene states by normalized key.
// - first checkpoint_paste run saves state; later runs restore that checkpoint
//   before replaying the snippet.
// - restoring with invalidateLater mirrors the Manim behavior where later
//   checkpoints are discarded after reverting to an earlier key.
export function buildSceneCheckpointStoreManifest<TState>(
  store: SceneCheckpointStore<TState>,
  options: SceneCheckpointStoreManifestOptions = {}
): SceneCheckpointStoreManifest {
  const keys = listCheckpointKeys(store);
  const latestKey = keys.at(-1) ?? "none";
  const requestedKey = options.restoreKey === null
    ? "none"
    : normalizeCheckpointKey(options.restoreKey ?? latestKey);
  const restoredIndex = store.checkpoints.findIndex((checkpoint) => checkpoint.key === requestedKey);
  const canRestore = restoredIndex >= 0;
  const invalidateLater = options.invalidateLater === true;
  const invalidatedCount = canRestore && invalidateLater
    ? Math.max(0, store.checkpoints.length - restoredIndex - 1)
    : 0;
  const invalidatedKeys = canRestore && invalidateLater
    ? keys.slice(restoredIndex + 1)
    : [];
  const retainedKeysAfterRestore = canRestore
    ? keys.slice(0, invalidateLater ? restoredIndex + 1 : keys.length)
    : [];
  const stateSignatures = store.checkpoints.map((checkpoint) => stateSignature(checkpoint.state));
  const latestStateSignature = stateSignatures.at(-1) ?? "none";
  const restoredStateSignature = canRestore ? stateSignatures[restoredIndex] ?? "none" : "none";
  const stateSignatureSummary = store.checkpoints
    .map((checkpoint, index) => `${checkpoint.key}=${stateSignatures[index]}`)
    .join(",") || "none";
  const baseManifest = {
    canRestore,
    checkpointCount: store.checkpoints.length,
    invalidatedCount,
    invalidatedKeys,
    invalidateLater,
    keys,
    latestKey,
    latestStateSignature,
    nextOrder: store.checkpoints.length,
    requestedKey,
    retainedKeysAfterRestore,
    restoreAction: checkpointRestoreAction({
      canRestore,
      checkpointCount: store.checkpoints.length,
      invalidateLater,
      requestedKey
    }),
    restoredOrder: canRestore ? store.checkpoints[restoredIndex].order : null,
    restoredStateSignature,
    sourceContract: SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT,
    stateSignatureSummary
  };

  return {
    ...baseManifest,
    summary: buildCheckpointStoreSummary(baseManifest),
    version: "mais-manim-checkpoint-store/v1"
  };
}

export function sceneCheckpointStoreDataAttributes(manifest: SceneCheckpointStoreManifest): Record<string, string> {
  return {
    "data-viz-manim-checkpoint-store-can-restore": String(manifest.canRestore),
    "data-viz-manim-checkpoint-store-count": String(manifest.checkpointCount),
    "data-viz-manim-checkpoint-store-invalidated-count": String(manifest.invalidatedCount),
    "data-viz-manim-checkpoint-store-invalidated-keys": manifest.invalidatedKeys.join(",") || "none",
    "data-viz-manim-checkpoint-store-invalidate-later": String(manifest.invalidateLater),
    "data-viz-manim-checkpoint-store-keys": manifest.keys.join(",") || "none",
    "data-viz-manim-checkpoint-store-latest-key": manifest.latestKey,
    "data-viz-manim-checkpoint-store-latest-state-signature": manifest.latestStateSignature,
    "data-viz-manim-checkpoint-store-next-order": String(manifest.nextOrder),
    "data-viz-manim-checkpoint-store-requested-key": manifest.requestedKey,
    "data-viz-manim-checkpoint-store-retained-keys-after-restore": manifest.retainedKeysAfterRestore.join(",") || "none",
    "data-viz-manim-checkpoint-store-restore-action": manifest.restoreAction,
    "data-viz-manim-checkpoint-store-restored-order": manifest.restoredOrder === null ? "none" : String(manifest.restoredOrder),
    "data-viz-manim-checkpoint-store-restored-state-signature": manifest.restoredStateSignature,
    "data-viz-manim-checkpoint-store-source-contract": manifest.sourceContract,
    "data-viz-manim-checkpoint-store-state-signature-summary": manifest.stateSignatureSummary,
    "data-viz-manim-checkpoint-store-summary": manifest.summary
  };
}

export function serializeSceneCheckpointStoreManifest(manifest: SceneCheckpointStoreManifest) {
  return stableSerialize(manifest);
}
