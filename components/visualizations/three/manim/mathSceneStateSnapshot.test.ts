import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathSceneHistorySummary } from "./mathSceneHistory";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import type { MathSceneSpec } from "./mathSceneTypes";

type MathSceneStateSnapshot = {
  activeStep: string;
  authoringMode: string;
  cameraMode: string;
  cameraShotId: string;
  cameraShotCount: number;
  checkpointCount: number;
  checkpointKeys: string[];
  elapsedSeconds: number;
  familyId: string;
  formulaTokenCount: number;
  frameIndex: number;
  historyCurrentLabel: string;
  historyDroppedUndoCount: number;
  historyMaxUndoEntries: number;
  historyRedoCount: number;
  historyRevision: number;
  historyUndoCount: number;
  latestCheckpointKey: string;
  objectCount: number;
  objectFamilyRootIds: string[];
  playbackState: string;
  objectIds: string[];
  objectIdentitySummary: string;
  objectRootIds: string[];
  sceneId: string;
  sceneSignature: string;
  selectedFamilyId: string;
  selectedParameterId: string;
  selectedSceneId: string;
  semanticBindingCount: number;
  signature: string;
  snapshotVersion: "mais-manim-state-snapshot/v1";
  sourceContract: typeof expectedStateSnapshotSourceContract;
  summary: string;
  timelineStepCount: number;
};

type MathSceneStateSnapshotModule = {
  SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT: typeof expectedStateSnapshotSourceContract;
  buildMathSceneStateSnapshot: (input: {
    activeStep: string;
    authoringMode: string;
    cameraMode: string;
    cameraShotId: string;
    checkpointKeys?: string[];
    elapsedSeconds: number;
    frameIndex: number;
    historySummary: MathSceneHistorySummary;
    playbackState: string;
    objectGraphIdentity?: {
      familyRootIds: string[];
      objectIds: string[];
      rootIds: string[];
    };
    scene: MathSceneSpec;
    sceneSignature: string;
    selectedFamilyId: string;
    selectedParameterId: string;
    selectedSceneId: string;
  }) => MathSceneStateSnapshot;
  sceneStateSnapshotDataAttributes: (snapshot: MathSceneStateSnapshot) => Record<string, string>;
  serializeMathSceneStateSnapshot: (snapshot: MathSceneStateSnapshot) => string;
};

const snapshotModulePath = "components/visualizations/three/manim/mathSceneStateSnapshot.ts";
const expectedStateSnapshotSourceContract =
  "Scene state snapshot: save_state/restore serializes mobjects, camera, timeline, checkpoints, and history for replay" as const;

function buildFunctionGraphSpec() {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph",
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
      templateId: "function-graph",
      value: 6
    }
  });

  if (!spec) throw new Error("expected function graph MAIS Manim spec");
  return spec;
}

async function importSnapshotModule() {
  assert.ok(fs.existsSync(snapshotModulePath), "MAIS Manim should provide a pure scene state snapshot module");
  return (await import("./mathSceneStateSnapshot")) as MathSceneStateSnapshotModule;
}

test("builds a deterministic authoring state snapshot from scene/runtime metadata", async () => {
  const { SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT, buildMathSceneStateSnapshot, serializeMathSceneStateSnapshot } = await importSnapshotModule();
  const scene = buildFunctionGraphSpec();
  const snapshot = buildMathSceneStateSnapshot({
    activeStep: "revealCurve:function-curve",
    authoringMode: "run-from-beat",
    cameraMode: "guided",
    cameraShotId: "curve-detail",
    checkpointKeys: ["intro", "slope handoff"],
    elapsedSeconds: 2.34567,
    frameIndex: 42,
    historySummary: {
      canRedo: false,
      canUndo: true,
      currentLabel: "slope handoff",
      droppedUndoCount: 3,
      maxUndoEntries: 25,
      redoCount: 0,
      revision: 3,
      undoCount: 2
    },
    playbackState: "checkpoint",
    objectGraphIdentity: {
      familyRootIds: ["axes", "function-curve"],
      objectIds: ["axes", "function-curve", "moving-probe", "probe-trace"],
      rootIds: ["axes", "function-curve"]
    },
    scene,
    sceneSignature: "fnv1a-test",
    selectedFamilyId: "three-function-graph",
    selectedParameterId: "value",
    selectedSceneId: scene.sceneId
  });

  assert.equal(snapshot.snapshotVersion, "mais-manim-state-snapshot/v1");
  assert.equal(SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT, expectedStateSnapshotSourceContract);
  assert.equal(snapshot.sourceContract, SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT);
  assert.equal(snapshot.sceneId, "mais-manim-function-graph");
  assert.equal(snapshot.familyId, "three-function-graph");
  assert.equal(snapshot.sceneSignature, "fnv1a-test");
  assert.equal(snapshot.elapsedSeconds, 2.346);
  assert.equal(snapshot.frameIndex, 42);
  assert.equal(snapshot.activeStep, "revealCurve:function-curve");
  assert.equal(snapshot.cameraShotId, "curve-detail");
  assert.equal(snapshot.checkpointCount, 2);
  assert.deepEqual(snapshot.checkpointKeys, ["intro", "slope handoff"]);
  assert.equal(snapshot.latestCheckpointKey, "slope handoff");
  assert.equal(snapshot.historyRevision, 3);
  assert.equal(snapshot.historyUndoCount, 2);
  assert.equal(snapshot.historyRedoCount, 0);
  assert.equal(snapshot.historyCurrentLabel, "slope handoff");
  assert.equal(snapshot.historyDroppedUndoCount, 3);
  assert.equal(snapshot.historyMaxUndoEntries, 25);
  assert.equal(snapshot.objectCount, scene.objects.length);
  assert.deepEqual(snapshot.objectIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(snapshot.objectRootIds, ["axes", "function-curve"]);
  assert.deepEqual(snapshot.objectFamilyRootIds, ["axes", "function-curve"]);
  assert.equal(
    snapshot.objectIdentitySummary,
    "objects=axes,function-curve,moving-probe,probe-trace;roots=axes,function-curve;families=axes,function-curve"
  );
  assert.equal(snapshot.formulaTokenCount, scene.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0));
  assert.equal(snapshot.semanticBindingCount, scene.bindings.length);
  assert.equal(snapshot.timelineStepCount, scene.timeline.length);
  assert.equal(snapshot.cameraShotCount, scene.cameraShots.length);
  assert.match(snapshot.signature, /^snapshot-[0-9a-f]{8}$/);
  assert.equal(
    snapshot.summary,
    "snapshot:mais-manim-function-graph:revealCurve:function-curve:camera=curve-detail:elapsed=2.346:checkpoints=2:history=3"
  );

  const serialized = serializeMathSceneStateSnapshot(snapshot);
  assert.equal(serializeMathSceneStateSnapshot(JSON.parse(JSON.stringify(snapshot)) as MathSceneStateSnapshot), serialized);
  assert.equal(JSON.parse(serialized).sourceContract, SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("sanitizes invalid numeric values without losing state identity", async () => {
  const { SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT, buildMathSceneStateSnapshot } = await importSnapshotModule();
  const scene = buildFunctionGraphSpec();
  const snapshot = buildMathSceneStateSnapshot({
    activeStep: "",
    authoringMode: "",
    cameraMode: "",
    cameraShotId: "",
    checkpointKeys: [],
    elapsedSeconds: Number.NaN,
    frameIndex: Number.POSITIVE_INFINITY,
    historySummary: {
      canRedo: false,
      canUndo: false,
      currentLabel: "",
      droppedUndoCount: 0,
      maxUndoEntries: 50,
      redoCount: 0,
      revision: Number.NaN,
      undoCount: 0
    },
    playbackState: "",
    scene,
    sceneSignature: "",
    selectedFamilyId: "",
    selectedParameterId: "",
    selectedSceneId: ""
  });

  assert.equal(snapshot.sourceContract, SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT);
  assert.equal(snapshot.elapsedSeconds, 0);
  assert.equal(snapshot.frameIndex, 0);
  assert.equal(snapshot.activeStep, "none");
  assert.equal(snapshot.cameraShotId, "default");
  assert.equal(snapshot.latestCheckpointKey, "none");
  assert.equal(snapshot.historyRevision, 0);
  assert.equal(snapshot.historyCurrentLabel, "state");
  assert.equal(snapshot.historyDroppedUndoCount, 0);
  assert.equal(snapshot.historyMaxUndoEntries, 50);
  assert.equal(snapshot.selectedSceneId, scene.sceneId);
  assert.equal(snapshot.selectedFamilyId, scene.familyId);
  assert.equal(snapshot.selectedParameterId, "none");
  assert.deepEqual(snapshot.objectIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(snapshot.objectRootIds, ["axes", "function-curve"]);
  assert.deepEqual(snapshot.objectFamilyRootIds, ["axes", "function-curve"]);
  assert.equal(
    snapshot.objectIdentitySummary,
    "objects=axes,function-curve,moving-probe,probe-trace;roots=axes,function-curve;families=axes,function-curve"
  );
});

test("maps state snapshots to browser QA data attributes", async () => {
  const {
    SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT,
    buildMathSceneStateSnapshot,
    sceneStateSnapshotDataAttributes
  } = await importSnapshotModule();
  const scene = buildFunctionGraphSpec();
  const snapshot = buildMathSceneStateSnapshot({
    activeStep: "highlight:function",
    authoringMode: "playback",
    cameraMode: "guided",
    cameraShotId: "overview",
    checkpointKeys: ["intro"],
    elapsedSeconds: 1,
    frameIndex: 7,
    historySummary: {
      canRedo: false,
      canUndo: false,
      currentLabel: "initial",
      droppedUndoCount: 4,
      maxUndoEntries: 12,
      redoCount: 0,
      revision: 0,
      undoCount: 0
    },
    playbackState: "playing",
    scene,
    sceneSignature: "fnv1a-test",
    selectedFamilyId: "three-function-graph",
    selectedParameterId: "value",
    selectedSceneId: scene.sceneId
  });

  assert.deepEqual(sceneStateSnapshotDataAttributes(snapshot), {
    "data-viz-manim-state-snapshot-active-step": "highlight:function",
    "data-viz-manim-state-snapshot-camera-shot": "overview",
    "data-viz-manim-state-snapshot-checkpoint-count": "1",
    "data-viz-manim-state-snapshot-elapsed-seconds": "1.000",
    "data-viz-manim-state-snapshot-frame-index": "7",
    "data-viz-manim-state-snapshot-history-dropped-undo-count": "4",
    "data-viz-manim-state-snapshot-history-max-undo-entries": "12",
    "data-viz-manim-state-snapshot-history-revision": "0",
    "data-viz-manim-state-snapshot-family-root-ids": "axes,function-curve",
    "data-viz-manim-state-snapshot-object-identity-summary": "objects=axes,function-curve,moving-probe,probe-trace;roots=axes,function-curve;families=axes,function-curve",
    "data-viz-manim-state-snapshot-object-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-manim-state-snapshot-ready": "true",
    "data-viz-manim-state-snapshot-root-ids": "axes,function-curve",
    "data-viz-manim-state-snapshot-scene-id": scene.sceneId,
    "data-viz-manim-state-snapshot-signature": snapshot.signature,
    "data-viz-manim-state-snapshot-source-contract": SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT,
    "data-viz-manim-state-snapshot-summary": snapshot.summary
  });
});

test("keeps state snapshots pure and renderer independent", () => {
  assert.ok(fs.existsSync(snapshotModulePath), "state snapshots should live in a pure Manim math module");
  const source = fs.readFileSync(snapshotModulePath, "utf8");

  assert.match(source, /import type \{ MathSceneSpec \} from "\.\/mathSceneTypes"/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|MathSceneRuntime|ThreeDLabCanvas|window|document/);
  assert.match(source, /buildMathSceneStateSnapshot/);
  assert.match(source, /SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT/);
  assert.match(source, /sceneStateSnapshotDataAttributes/);
  assert.match(source, /serializeMathSceneStateSnapshot/);
});
