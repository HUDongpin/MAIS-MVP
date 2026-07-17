import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildScenePlaybackPlan, type ScenePlaybackPlan } from "./mathScenePlayback";
import {
  buildScenePlaybackFileWriterBridgePlan,
  type MathScenePlaybackFileWriterBridgePlan
} from "./mathScenePlaybackFileWriterBridge";
import type { AnimationStep } from "./mathSceneTypes";

type MathSceneFileWriterCombinePlan = {
  action: "concat-partials" | "single-pipe-finish" | "skip-movie";
  concatManifestPath: string;
  duplicatePartialCount: number;
  finalMoviePath: string;
  mismatchCount: number;
  ordered: boolean;
  partialIndexSequence: string;
  partialMovieCount: number;
  partialPathSummary: string;
  ready: boolean;
  sourceContract: string;
  summary: string;
  version: "mais-manim-file-writer-combine/v1";
};

type MathSceneFileWriterCombineModule = {
  SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT: string;
  buildSceneFileWriterCombinePlan: (input: {
    fileWriterReady?: boolean;
    movieFileExtension?: string;
    outputSlug: string;
    playbackBridge: MathScenePlaybackFileWriterBridgePlan;
    sceneId: string;
    subdivideOutput: boolean;
    writeToMovie: boolean;
  }) => MathSceneFileWriterCombinePlan;
  sceneFileWriterCombineDataAttributes: (plan: MathSceneFileWriterCombinePlan) => Record<string, string>;
  serializeSceneFileWriterCombinePlan: (plan: MathSceneFileWriterCombinePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneFileWriterCombinePlan.ts";
const expectedSourceContract =
  "SceneFileWriter.finish combines sorted partial movie files into the final movie when subdivide_output is enabled";

const timeline: AnimationStep[] = [
  { type: "revealCurve", objectId: "curve", duration: 1, easing: "linear" },
  { type: "wait", duration: 0.5 },
  { type: "cameraTo", shotId: "detail", duration: 1 }
];

function playbackPlan(): ScenePlaybackPlan {
  return buildScenePlaybackPlan(timeline, { fps: 4 });
}

function playbackBridge(outputSlug = "mais-manim-function-graph-fnv1a-demo") {
  return buildScenePlaybackFileWriterBridgePlan({
    movieFileExtension: ".mp4",
    outputSlug,
    playbackPlan: playbackPlan(),
    sceneId: "mais-manim-function-graph",
    subdivideOutput: true,
    writeToMovie: true
  });
}

async function importCombineModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure SceneFileWriter.finish combine planner");
  return (await import("./mathSceneFileWriterCombinePlan")) as MathSceneFileWriterCombineModule;
}

test("buildSceneFileWriterCombinePlan combines partial movies in Scene.play order", async () => {
  const {
    SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT,
    buildSceneFileWriterCombinePlan
  } = await importCombineModule();
  const plan = buildSceneFileWriterCombinePlan({
    fileWriterReady: true,
    movieFileExtension: ".mp4",
    outputSlug: "mais-manim-function-graph-fnv1a-demo",
    playbackBridge: playbackBridge(),
    sceneId: "mais-manim-function-graph",
    subdivideOutput: true,
    writeToMovie: true
  });

  assert.equal(SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-file-writer-combine/v1");
  assert.equal(plan.ready, true);
  assert.equal(plan.action, "concat-partials");
  assert.equal(plan.partialMovieCount, 3);
  assert.equal(plan.partialIndexSequence, "0=00000|1=00001|2=00002");
  assert.equal(plan.ordered, true);
  assert.equal(plan.duplicatePartialCount, 0);
  assert.equal(plan.mismatchCount, 0);
  assert.equal(
    plan.partialPathSummary,
    "mais-manim-function-graph-fnv1a-demo/00000.mp4|mais-manim-function-graph-fnv1a-demo/00001.mp4|mais-manim-function-graph-fnv1a-demo/00002.mp4"
  );
  assert.equal(plan.finalMoviePath, "mais-manim-function-graph-fnv1a-demo.mp4");
  assert.equal(plan.concatManifestPath, "mais-manim-function-graph-fnv1a-demo/partial-movies.txt");
  assert.equal(
    plan.summary,
    "file-writer-combine:mais-manim-function-graph:action=concat-partials:partials=3:ready=true"
  );
});

test("buildSceneFileWriterCombinePlan reports single-pipe and skipped finish modes", async () => {
  const { buildSceneFileWriterCombinePlan } = await importCombineModule();
  const bridge = playbackBridge("single-pipe-demo");
  const singlePipe = buildSceneFileWriterCombinePlan({
    fileWriterReady: true,
    outputSlug: "single-pipe-demo",
    playbackBridge: bridge,
    sceneId: "single-pipe-scene",
    subdivideOutput: false,
    writeToMovie: true
  });
  const skipped = buildSceneFileWriterCombinePlan({
    outputSlug: "skip-demo",
    playbackBridge: bridge,
    sceneId: "skip-scene",
    subdivideOutput: true,
    writeToMovie: false
  });

  assert.equal(singlePipe.action, "single-pipe-finish");
  assert.equal(singlePipe.ready, true);
  assert.equal(singlePipe.partialMovieCount, 0);
  assert.equal(singlePipe.partialPathSummary, "none");
  assert.equal(singlePipe.finalMoviePath, "single-pipe-demo.webm");
  assert.equal(singlePipe.concatManifestPath, "none");
  assert.equal(skipped.action, "skip-movie");
  assert.equal(skipped.ready, false);
  assert.equal(skipped.finalMoviePath, "");
});

test("sceneFileWriterCombineDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT,
    buildSceneFileWriterCombinePlan,
    sceneFileWriterCombineDataAttributes
  } = await importCombineModule();
  const plan = buildSceneFileWriterCombinePlan({
    fileWriterReady: true,
    movieFileExtension: ".mp4",
    outputSlug: "combine-demo",
    playbackBridge: playbackBridge("combine-demo"),
    sceneId: "combine-scene",
    subdivideOutput: true,
    writeToMovie: true
  });

  assert.deepEqual(sceneFileWriterCombineDataAttributes(plan), {
    "data-viz-manim-file-writer-combine-action": "concat-partials",
    "data-viz-manim-file-writer-combine-concat-manifest-path": "combine-demo/partial-movies.txt",
    "data-viz-manim-file-writer-combine-duplicate-partial-count": "0",
    "data-viz-manim-file-writer-combine-final-path": "combine-demo.mp4",
    "data-viz-manim-file-writer-combine-mismatch-count": "0",
    "data-viz-manim-file-writer-combine-ordered": "true",
    "data-viz-manim-file-writer-combine-partial-count": "3",
    "data-viz-manim-file-writer-combine-partial-index-sequence": "0=00000|1=00001|2=00002",
    "data-viz-manim-file-writer-combine-partial-path-summary": "combine-demo/00000.mp4|combine-demo/00001.mp4|combine-demo/00002.mp4",
    "data-viz-manim-file-writer-combine-ready": "true",
    "data-viz-manim-file-writer-combine-source-contract": SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT,
    "data-viz-manim-file-writer-combine-summary": "file-writer-combine:combine-scene:action=concat-partials:partials=3:ready=true"
  });
});

test("serializeSceneFileWriterCombinePlan emits deterministic script-safe JSON", async () => {
  const { buildSceneFileWriterCombinePlan, serializeSceneFileWriterCombinePlan } = await importCombineModule();
  const plan = buildSceneFileWriterCombinePlan({
    fileWriterReady: true,
    outputSlug: "combine-</script>-demo",
    playbackBridge: playbackBridge("combine-</script>-demo"),
    sceneId: "combine-scene",
    subdivideOutput: true,
    writeToMovie: true
  });
  const serialized = serializeSceneFileWriterCombinePlan(plan);

  assert.equal(
    serializeSceneFileWriterCombinePlan(JSON.parse(JSON.stringify(plan)) as MathSceneFileWriterCombinePlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<|<\/script>|undefined|NaN|Infinity/i);
  assert.equal(JSON.parse(serialized).summary, plan.summary);
});

test("SceneFileWriter combine planner stays pure and documents source contracts", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneFileWriterCombinePlan.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /SceneFileWriter\.finish/);
  assert.match(source, /subdivide_output/);
  assert.match(source, /partial movie/);
  assert.match(source, /SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT/);
  assert.match(source, /serializeSceneFileWriterCombinePlan/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window|document|fs|child_process|ffmpeg/);
});
