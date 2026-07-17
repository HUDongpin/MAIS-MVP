import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import {
  buildMathSceneRunLifecyclePlan,
  type MathSceneRunLifecyclePlan
} from "./mathSceneRunLifecycle";
import {
  buildScenePlaybackPlan,
  type ScenePlaybackPlan
} from "./mathScenePlayback";
import {
  buildScenePlaybackFileWriterBridgePlan,
  type MathScenePlaybackFileWriterBridgePlan
} from "./mathScenePlaybackFileWriterBridge";
import {
  buildSceneFileWriterCombinePlan,
  type MathSceneFileWriterCombinePlan
} from "./mathSceneFileWriterCombinePlan";
import type { MathSceneSpec } from "./mathSceneTypes";

type MathSceneRunFileWriterFinishStatus =
  | "combine-not-ready"
  | "ready-to-finish"
  | "waiting-for-tear-down";

type MathSceneRunFileWriterFinishBridgePlan = {
  combineAction: MathSceneFileWriterCombinePlan["action"];
  concatManifestPath: string;
  finalMoviePath: string;
  finishCallOrderSummary: string;
  finishReady: boolean;
  finishRequired: boolean;
  finishStatus: MathSceneRunFileWriterFinishStatus;
  partialMovieCount: number;
  sceneId: string;
  sourceContract: string;
  summary: string;
  tearDownActionSummary: string;
  tearDownReady: boolean;
  version: "mais-manim-scene-run-file-writer-finish-bridge/v1";
};

type MathSceneRunFileWriterFinishBridgeModule = {
  SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT: string;
  buildSceneRunFileWriterFinishBridgePlan: (input: {
    fileWriterCombinePlan: MathSceneFileWriterCombinePlan;
    sceneRunLifecycle: MathSceneRunLifecyclePlan;
  }) => MathSceneRunFileWriterFinishBridgePlan;
  sceneRunFileWriterFinishBridgeDataAttributes: (plan: MathSceneRunFileWriterFinishBridgePlan) => Record<string, string>;
  serializeSceneRunFileWriterFinishBridgePlan: (plan: MathSceneRunFileWriterFinishBridgePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneRunFileWriterFinishBridge.ts";
const expectedSourceContract =
  "Scene.run tear_down gates SceneFileWriter.finish; file-writer combine is executable only after tear_down is active";

function buildFunctionGraphSpec(): MathSceneSpec {
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

function playbackPlan(scene: MathSceneSpec): ScenePlaybackPlan {
  return buildScenePlaybackPlan(scene.timeline, { fps: 4 });
}

function playbackBridge(scene: MathSceneSpec, outputSlug = "mais-manim-function-graph-fnv1a-demo"): MathScenePlaybackFileWriterBridgePlan {
  return buildScenePlaybackFileWriterBridgePlan({
    movieFileExtension: ".mp4",
    outputSlug,
    playbackPlan: playbackPlan(scene),
    sceneId: scene.sceneId,
    subdivideOutput: true,
    writeToMovie: true
  });
}

function combinePlan(scene: MathSceneSpec, fileWriterReady = true, outputSlug = "mais-manim-function-graph-fnv1a-demo"): MathSceneFileWriterCombinePlan {
  return buildSceneFileWriterCombinePlan({
    fileWriterReady,
    movieFileExtension: ".mp4",
    outputSlug,
    playbackBridge: playbackBridge(scene, outputSlug),
    sceneId: scene.sceneId,
    subdivideOutput: true,
    writeToMovie: true
  });
}

function sceneRun(scene: MathSceneSpec, tearDownRequested: boolean): MathSceneRunLifecyclePlan {
  return buildMathSceneRunLifecyclePlan({
    elapsedSeconds: 999,
    interactEnabled: true,
    scene,
    sceneSignature: "fnv1a-scene",
    tearDownRequested
  });
}

async function importBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.run/FileWriter.finish bridge module");
  return (await import("./mathSceneRunFileWriterFinishBridge")) as MathSceneRunFileWriterFinishBridgeModule;
}

test("Scene.run/FileWriter.finish bridge defers combine until tear_down is active", async () => {
  const {
    SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT,
    buildSceneRunFileWriterFinishBridgePlan
  } = await importBridgeModule();
  const scene = buildFunctionGraphSpec();
  const plan = buildSceneRunFileWriterFinishBridgePlan({
    fileWriterCombinePlan: combinePlan(scene, true),
    sceneRunLifecycle: sceneRun(scene, false)
  });

  assert.equal(SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-scene-run-file-writer-finish-bridge/v1");
  assert.equal(plan.sceneId, scene.sceneId);
  assert.equal(plan.tearDownReady, false);
  assert.equal(plan.tearDownActionSummary, "pending");
  assert.equal(plan.combineAction, "concat-partials");
  assert.equal(plan.partialMovieCount, scene.timeline.length);
  assert.equal(plan.finishRequired, false);
  assert.equal(plan.finishReady, false);
  assert.equal(plan.finishStatus, "waiting-for-tear-down");
  assert.equal(plan.finishCallOrderSummary, "setup>construct>play>interact>finish-deferred");
  assert.equal(plan.finalMoviePath, "mais-manim-function-graph-fnv1a-demo.mp4");
  assert.equal(plan.concatManifestPath, "mais-manim-function-graph-fnv1a-demo/partial-movies.txt");
  assert.equal(
    plan.summary,
    "scene-run-file-writer-finish:mais-manim-function-graph:teardown=false:combine=concat-partials:status=waiting-for-tear-down:ready=false"
  );
});

test("Scene.run/FileWriter.finish bridge becomes ready when tear_down and combine evidence are both ready", async () => {
  const { buildSceneRunFileWriterFinishBridgePlan } = await importBridgeModule();
  const scene = buildFunctionGraphSpec();
  const plan = buildSceneRunFileWriterFinishBridgePlan({
    fileWriterCombinePlan: combinePlan(scene, true),
    sceneRunLifecycle: sceneRun(scene, true)
  });

  assert.equal(plan.tearDownReady, true);
  assert.equal(plan.tearDownActionSummary, "tear_down>scene_file_writer_finish");
  assert.equal(plan.finishRequired, true);
  assert.equal(plan.finishReady, true);
  assert.equal(plan.finishStatus, "ready-to-finish");
  assert.equal(plan.finishCallOrderSummary, "setup>construct>play>interact>tear_down>scene_file_writer.finish");
  assert.equal(
    plan.summary,
    "scene-run-file-writer-finish:mais-manim-function-graph:teardown=true:combine=concat-partials:status=ready-to-finish:ready=true"
  );
});

test("Scene.run/FileWriter.finish bridge flags tear_down when combine evidence is not ready", async () => {
  const { buildSceneRunFileWriterFinishBridgePlan } = await importBridgeModule();
  const scene = buildFunctionGraphSpec();
  const plan = buildSceneRunFileWriterFinishBridgePlan({
    fileWriterCombinePlan: combinePlan(scene, false),
    sceneRunLifecycle: sceneRun(scene, true)
  });

  assert.equal(plan.tearDownReady, true);
  assert.equal(plan.finishRequired, true);
  assert.equal(plan.finishReady, false);
  assert.equal(plan.finishStatus, "combine-not-ready");
  assert.equal(plan.finishCallOrderSummary, "setup>construct>play>interact>tear_down>scene_file_writer.finish-blocked");
});

test("Scene.run/FileWriter.finish bridge exposes stable browser QA data and safe JSON", async () => {
  const {
    SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT,
    buildSceneRunFileWriterFinishBridgePlan,
    sceneRunFileWriterFinishBridgeDataAttributes,
    serializeSceneRunFileWriterFinishBridgePlan
  } = await importBridgeModule();
  const scene = buildFunctionGraphSpec();
  const plan = buildSceneRunFileWriterFinishBridgePlan({
    fileWriterCombinePlan: combinePlan(scene, true, "finish-</script>-demo"),
    sceneRunLifecycle: sceneRun(scene, true)
  });

  assert.deepEqual(sceneRunFileWriterFinishBridgeDataAttributes(plan), {
    "data-viz-manim-scene-run-file-writer-finish-call-order": "setup>construct>play>interact>tear_down>scene_file_writer.finish",
    "data-viz-manim-scene-run-file-writer-finish-combine-action": "concat-partials",
    "data-viz-manim-scene-run-file-writer-finish-concat-manifest-path": "finish-</script>-demo/partial-movies.txt",
    "data-viz-manim-scene-run-file-writer-finish-final-path": "finish-</script>-demo.mp4",
    "data-viz-manim-scene-run-file-writer-finish-partial-count": String(scene.timeline.length),
    "data-viz-manim-scene-run-file-writer-finish-ready": "true",
    "data-viz-manim-scene-run-file-writer-finish-required": "true",
    "data-viz-manim-scene-run-file-writer-finish-scene-id": scene.sceneId,
    "data-viz-manim-scene-run-file-writer-finish-source-contract": SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT,
    "data-viz-manim-scene-run-file-writer-finish-status": "ready-to-finish",
    "data-viz-manim-scene-run-file-writer-finish-summary":
      "scene-run-file-writer-finish:mais-manim-function-graph:teardown=true:combine=concat-partials:status=ready-to-finish:ready=true",
    "data-viz-manim-scene-run-file-writer-finish-teardown-actions": "tear_down>scene_file_writer_finish",
    "data-viz-manim-scene-run-file-writer-finish-teardown-ready": "true"
  });
  assert.ok(!serializeSceneRunFileWriterFinishBridgePlan(plan).includes("</script>"));
  assert.ok(serializeSceneRunFileWriterFinishBridgePlan(plan).includes("\\u003c/script>"));
});
