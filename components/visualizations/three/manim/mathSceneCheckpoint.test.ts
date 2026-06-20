import assert from "node:assert/strict";
import test from "node:test";
import {
  createCheckpointStore,
  listCheckpointKeys,
  restoreCheckpoint,
  saveCheckpoint
} from "./mathSceneCheckpoint";

const initialState = {
  cameraShot: "overview",
  elapsedSeconds: 0,
  sceneId: "scene",
  trackerValues: { timeline: 0 }
};

test("saves and restores immutable scene checkpoints", () => {
  const store = saveCheckpoint(createCheckpointStore<typeof initialState>(), "start", initialState);
  const restored = restoreCheckpoint(store, "start");

  assert.deepEqual(restored?.state, initialState);
  assert.notEqual(restored?.state, initialState);
  assert.deepEqual(listCheckpointKeys(store), ["start"]);
});

test("restoring an earlier checkpoint invalidates later checkpoints", () => {
  const withStart = saveCheckpoint(createCheckpointStore<typeof initialState>(), "start", initialState);
  const withMiddle = saveCheckpoint(withStart, "middle", {
    ...initialState,
    elapsedSeconds: 4,
    trackerValues: { timeline: 4 }
  });
  const restored = restoreCheckpoint(withMiddle, "start", { invalidateLater: true });

  assert.deepEqual(restored?.state, initialState);
  assert.deepEqual(listCheckpointKeys(restored!.store), ["start"]);
});

test("checkpoint labels are normalized from comment-style snippets", () => {
  const store = saveCheckpoint(createCheckpointStore<typeof initialState>(), "# reveal tangent line\nplay(...)", initialState);

  assert.deepEqual(listCheckpointKeys(store), ["reveal tangent line"]);
});
