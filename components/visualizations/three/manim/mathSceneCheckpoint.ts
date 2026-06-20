export type SceneCheckpoint<TState> = {
  key: string;
  order: number;
  state: TState;
};

export type SceneCheckpointStore<TState> = {
  checkpoints: SceneCheckpoint<TState>[];
};

function cloneState<TState>(state: TState): TState {
  return JSON.parse(JSON.stringify(state)) as TState;
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
