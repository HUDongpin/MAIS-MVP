import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildScenePlaybackPlan, type ScenePlaybackPlan } from "./mathScenePlayback";
import type { AnimationStep } from "./mathSceneTypes";

type MathScenePlaybackFileWriterBridgeRow = {
  actionSummary: string;
  matchesPlayIndex: boolean;
  partialMovieIndex: number;
  partialMovieIndexPadded: string;
  partialMoviePath: string;
  playIndex: number;
  stepType: string;
};

type MathScenePlaybackFileWriterBridgePlan = {
  mismatchCount: number;
  partialIndexSequence: string;
  partialPathSummary: string;
  ready: boolean;
  rowCount: number;
  rows: MathScenePlaybackFileWriterBridgeRow[];
  sourceContract: string;
  summary: string;
  version: "mais-manim-playback-file-writer-bridge/v1";
};

type MathScenePlaybackFileWriterBridgeModule = {
  SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT: string;
  buildScenePlaybackFileWriterBridgePlan: (input: {
    movieFileExtension?: string;
    outputSlug: string;
    playbackPlan: ScenePlaybackPlan;
    sceneId: string;
    subdivideOutput: boolean;
    writeToMovie: boolean;
  }) => MathScenePlaybackFileWriterBridgePlan;
  scenePlaybackFileWriterBridgeDataAttributes: (plan: MathScenePlaybackFileWriterBridgePlan) => Record<string, string>;
  serializeScenePlaybackFileWriterBridgePlan: (plan: MathScenePlaybackFileWriterBridgePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathScenePlaybackFileWriterBridge.ts";
const expectedSourceContract =
  "Scene.play num_plays -> SceneFileWriter.get_next_partial_movie_path partial segment per playback beat";

async function importPlaybackFileWriterBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.play/FileWriter bridge module");
  return (await import("./mathScenePlaybackFileWriterBridge")) as MathScenePlaybackFileWriterBridgeModule;
}

const timeline: AnimationStep[] = [
  { type: "revealCurve", objectId: "curve", duration: 1, easing: "linear" },
  { type: "wait", duration: 0.5 },
  { type: "cameraTo", shotId: "detail", duration: 1 }
];

test("buildScenePlaybackFileWriterBridgePlan aligns playback playIndex with partial movie indexes", async () => {
  const {
    SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
    buildScenePlaybackFileWriterBridgePlan
  } = await importPlaybackFileWriterBridgeModule();
  const playbackPlan = buildScenePlaybackPlan(timeline, { fps: 4 });
  const plan = buildScenePlaybackFileWriterBridgePlan({
    movieFileExtension: ".mp4",
    outputSlug: "mais-manim-function-graph-fnv1a-demo",
    playbackPlan,
    sceneId: "mais-manim-function-graph",
    subdivideOutput: true,
    writeToMovie: true
  });

  assert.equal(plan.version, "mais-manim-playback-file-writer-bridge/v1");
  assert.equal(SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.ready, true);
  assert.equal(plan.rowCount, 3);
  assert.equal(plan.mismatchCount, 0);
  assert.equal(plan.partialIndexSequence, "0=00000|1=00001|2=00002");
  assert.equal(
    plan.partialPathSummary,
    "mais-manim-function-graph-fnv1a-demo/00000.mp4|mais-manim-function-graph-fnv1a-demo/00001.mp4|mais-manim-function-graph-fnv1a-demo/00002.mp4"
  );
  assert.deepEqual(plan.rows.map((row) => row.stepType), ["revealCurve", "wait", "cameraTo"]);
  assert.deepEqual(plan.rows.map((row) => row.partialMovieIndex), [0, 1, 2]);
  assert.deepEqual(plan.rows.map((row) => row.partialMovieIndexPadded), ["00000", "00001", "00002"]);
  assert.ok(plan.rows.every((row) => row.matchesPlayIndex));
  assert.ok(plan.rows.every((row) => row.actionSummary === "begin:skipped;begin_animation:open-pipe;end_animation:close-pipe"));
  assert.equal(
    plan.summary,
    "playback-file-writer-bridge:mais-manim-function-graph:plays=3:mismatch=0:ready=true"
  );
});

test("scenePlaybackFileWriterBridgeDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
    buildScenePlaybackFileWriterBridgePlan,
    scenePlaybackFileWriterBridgeDataAttributes
  } = await importPlaybackFileWriterBridgeModule();
  const plan = buildScenePlaybackFileWriterBridgePlan({
    outputSlug: "bridge-demo",
    playbackPlan: buildScenePlaybackPlan(timeline, { fps: 4 }),
    sceneId: "bridge-scene",
    subdivideOutput: true,
    writeToMovie: true
  });

  assert.deepEqual(scenePlaybackFileWriterBridgeDataAttributes(plan), {
    "data-viz-manim-playback-file-writer-bridge-mismatch-count": "0",
    "data-viz-manim-playback-file-writer-bridge-partial-index-sequence": "0=00000|1=00001|2=00002",
    "data-viz-manim-playback-file-writer-bridge-partial-path-summary":
      "bridge-demo/00000.webm|bridge-demo/00001.webm|bridge-demo/00002.webm",
    "data-viz-manim-playback-file-writer-bridge-ready": "true",
    "data-viz-manim-playback-file-writer-bridge-row-count": "3",
    "data-viz-manim-playback-file-writer-bridge-source-contract": SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
    "data-viz-manim-playback-file-writer-bridge-summary":
      "playback-file-writer-bridge:bridge-scene:plays=3:mismatch=0:ready=true"
  });
});

test("serializeScenePlaybackFileWriterBridgePlan emits deterministic safe JSON", async () => {
  const {
    buildScenePlaybackFileWriterBridgePlan,
    serializeScenePlaybackFileWriterBridgePlan
  } = await importPlaybackFileWriterBridgeModule();
  const plan = buildScenePlaybackFileWriterBridgePlan({
    outputSlug: "bridge-</script>-demo",
    playbackPlan: buildScenePlaybackPlan(timeline, { fps: 4 }),
    sceneId: "bridge-scene",
    subdivideOutput: true,
    writeToMovie: true
  });
  const serialized = serializeScenePlaybackFileWriterBridgePlan(plan);

  assert.equal(
    serializeScenePlaybackFileWriterBridgePlan(JSON.parse(JSON.stringify(plan)) as MathScenePlaybackFileWriterBridgePlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<|<\/script>|undefined|NaN|Infinity/i);
  assert.equal(JSON.parse(serialized).summary, plan.summary);
});

test("Scene playback/FileWriter bridge stays pure and documents source contracts", () => {
  assert.ok(fs.existsSync(modulePath), "mathScenePlaybackFileWriterBridge.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /Scene\.play/);
  assert.match(source, /num_plays/);
  assert.match(source, /get_next_partial_movie_path/);
  assert.match(source, /buildSceneFileWriterSegmentPlan/);
  assert.match(source, /SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT/);
  assert.match(source, /serializeScenePlaybackFileWriterBridgePlan/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window|document|fs|child_process|ffmpeg/);
});
