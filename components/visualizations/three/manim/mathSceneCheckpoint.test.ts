import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSceneCheckpointStoreManifest,
  createCheckpointStore,
  SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT,
  sceneCheckpointStoreDataAttributes,
  listCheckpointKeys,
  restoreCheckpoint,
  saveCheckpoint,
  serializeSceneCheckpointStoreManifest
} from "./mathSceneCheckpoint";

const initialState = {
  cameraShot: "overview",
  elapsedSeconds: 0,
  sceneId: "scene",
  trackerValues: { timeline: 0 }
};
const expectedCheckpointStoreSourceContract =
  "CheckpointManager: normalized checkpoint keys store scene state; restore can invalidate later checkpoints";

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

test("checkpoint store manifest reports restore and later-checkpoint invalidation readiness", () => {
  const withStart = saveCheckpoint(createCheckpointStore<typeof initialState>(), "start", initialState);
  const withMiddle = saveCheckpoint(withStart, "middle", {
    ...initialState,
    elapsedSeconds: 4,
    trackerValues: { timeline: 4 }
  });
  const manifest = buildSceneCheckpointStoreManifest(withMiddle, {
    invalidateLater: true,
    restoreKey: "start"
  });

  assert.equal(manifest.version, "mais-manim-checkpoint-store/v1");
  assert.equal(manifest.checkpointCount, 2);
  assert.deepEqual(manifest.keys, ["start", "middle"]);
  assert.equal(manifest.latestKey, "middle");
  assert.match(manifest.latestStateSignature, /^checkpoint-state-[0-9a-f]{8}$/);
  assert.equal(manifest.requestedKey, "start");
  assert.equal(manifest.canRestore, true);
  assert.equal(manifest.invalidateLater, true);
  assert.equal(manifest.invalidatedCount, 1);
  assert.deepEqual(manifest.invalidatedKeys, ["middle"]);
  assert.equal(manifest.nextOrder, 2);
  assert.deepEqual(manifest.retainedKeysAfterRestore, ["start"]);
  assert.equal(manifest.restoreAction, "restore-and-invalidate-later");
  assert.equal(manifest.restoredOrder, 0);
  assert.match(manifest.restoredStateSignature, /^checkpoint-state-[0-9a-f]{8}$/);
  assert.notEqual(manifest.latestStateSignature, manifest.restoredStateSignature);
  assert.match(
    manifest.stateSignatureSummary,
    /^start=checkpoint-state-[0-9a-f]{8},middle=checkpoint-state-[0-9a-f]{8}$/
  );
  assert.equal(SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT, expectedCheckpointStoreSourceContract);
  assert.equal(manifest.sourceContract, expectedCheckpointStoreSourceContract);
  assert.equal(
    manifest.summary,
    "checkpointStore:count=2:latest=middle:requested=start:restore=true:invalidate=true:invalidated=1:next=2"
  );
});

test("checkpoint store manifest stays idle without checkpoints and normalizes requested labels", () => {
  const manifest = buildSceneCheckpointStoreManifest(createCheckpointStore<typeof initialState>(), {
    invalidateLater: true,
    restoreKey: "# missing checkpoint\nplay(...)"
  });

  assert.equal(manifest.checkpointCount, 0);
  assert.deepEqual(manifest.keys, []);
  assert.equal(manifest.latestKey, "none");
  assert.equal(manifest.latestStateSignature, "none");
  assert.equal(manifest.requestedKey, "missing checkpoint");
  assert.equal(manifest.canRestore, false);
  assert.equal(manifest.invalidatedCount, 0);
  assert.deepEqual(manifest.invalidatedKeys, []);
  assert.equal(manifest.nextOrder, 0);
  assert.deepEqual(manifest.retainedKeysAfterRestore, []);
  assert.equal(manifest.restoreAction, "missing-checkpoint");
  assert.equal(manifest.restoredOrder, null);
  assert.equal(manifest.restoredStateSignature, "none");
  assert.equal(manifest.stateSignatureSummary, "none");
  assert.equal(
    manifest.summary,
    "checkpointStore:count=0:latest=none:requested=missing checkpoint:restore=false:invalidate=true:invalidated=0:next=0"
  );
});

test("checkpoint store manifest exposes stable browser QA data attributes", () => {
  const store = saveCheckpoint(
    saveCheckpoint(createCheckpointStore<typeof initialState>(), "start", initialState),
    "middle",
    { ...initialState, elapsedSeconds: 4, trackerValues: { timeline: 4 } }
  );
  const manifest = buildSceneCheckpointStoreManifest(store, {
    invalidateLater: true,
    restoreKey: "start"
  });

  assert.deepEqual(sceneCheckpointStoreDataAttributes(manifest), {
    "data-viz-manim-checkpoint-store-can-restore": "true",
    "data-viz-manim-checkpoint-store-count": "2",
    "data-viz-manim-checkpoint-store-invalidated-count": "1",
    "data-viz-manim-checkpoint-store-invalidated-keys": "middle",
    "data-viz-manim-checkpoint-store-invalidate-later": "true",
    "data-viz-manim-checkpoint-store-keys": "start,middle",
    "data-viz-manim-checkpoint-store-latest-key": "middle",
    "data-viz-manim-checkpoint-store-latest-state-signature": manifest.latestStateSignature,
    "data-viz-manim-checkpoint-store-next-order": "2",
    "data-viz-manim-checkpoint-store-requested-key": "start",
    "data-viz-manim-checkpoint-store-retained-keys-after-restore": "start",
    "data-viz-manim-checkpoint-store-restore-action": "restore-and-invalidate-later",
    "data-viz-manim-checkpoint-store-restored-order": "0",
    "data-viz-manim-checkpoint-store-restored-state-signature": manifest.restoredStateSignature,
    "data-viz-manim-checkpoint-store-source-contract": expectedCheckpointStoreSourceContract,
    "data-viz-manim-checkpoint-store-state-signature-summary": manifest.stateSignatureSummary,
    "data-viz-manim-checkpoint-store-summary": manifest.summary
  });
});

test("serializes checkpoint store manifest as escaped deterministic browser JSON", () => {
  const store = saveCheckpoint(createCheckpointStore<typeof initialState>(), "<script>start</script>", initialState);
  const manifest = buildSceneCheckpointStoreManifest(store, { restoreKey: "<script>start</script>" });
  const serialized = serializeSceneCheckpointStoreManifest(manifest);

  assert.doesNotMatch(serialized, /<script>/);
  assert.match(serialized, /\\u003cscript>start\\u003c\/script>/);
  assert.deepEqual(JSON.parse(serialized), manifest);
});
