import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneFileWriterSegmentStatus = "close-pipe" | "open-pipe" | "skipped";

type MathSceneFileWriterSegmentRow = {
  action: "begin" | "begin_animation" | "begin_insert" | "end_animation" | "end_insert";
  finalFilePath: string;
  index: number | null;
  status: MathSceneFileWriterSegmentStatus;
  tempFilePath: string;
};

type MathSceneFileWriterSegmentPlan = {
  actionSummary: string;
  closePipeCount: number;
  finalFileSummary: string;
  insertFilePath: string;
  insertIndex: number | null;
  openPipeCount: number;
  partialMovieIndex: number;
  partialMovieIndexPadded: string;
  partialMoviePath: string;
  partialPathReady: boolean;
  rows: MathSceneFileWriterSegmentRow[];
  segmentCount: number;
  skippedCount: number;
  sourceContract: typeof expectedSegmentSourceContract;
  subdivideOutput: boolean;
  summary: string;
  tempRecordRequested: boolean;
  tempFileCount: number;
  writeToMovie: boolean;
};

type MathSceneFileWriterSegmentsModule = {
  SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT: typeof expectedSegmentSourceContract;
  buildSceneFileWriterSegmentPlan: (input: {
    existingInsertIndexes?: number[];
    movieFileExtension?: string;
    numPlays: number;
    outputSlug: string;
    requestTempRecord?: boolean;
    sceneId: string;
    subdivideOutput: boolean;
    writeToMovie: boolean;
  }) => MathSceneFileWriterSegmentPlan;
  sceneFileWriterSegmentDataAttributes: (plan: MathSceneFileWriterSegmentPlan) => Record<string, string>;
  serializeSceneFileWriterSegmentPlan: (plan: MathSceneFileWriterSegmentPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneFileWriterSegments.ts";
const expectedSegmentSourceContract =
  "SceneFileWriter segments: begin opens main pipe; begin_animation/end_animation open and close numbered partial movies; temp_record uses insert pipes" as const;

async function importSegmentsModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure SceneFileWriter segment planner");
  return await import("./mathSceneFileWriterSegments") as MathSceneFileWriterSegmentsModule;
}

test("buildSceneFileWriterSegmentPlan opens one main movie pipe when output is not subdivided", async () => {
  const { SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT, buildSceneFileWriterSegmentPlan } = await importSegmentsModule();
  const plan = buildSceneFileWriterSegmentPlan({
    numPlays: 7,
    outputSlug: "mais-manim-function-graph-writer-1234abcd",
    sceneId: "mais-manim-function-graph",
    subdivideOutput: false,
    writeToMovie: true
  });

  assert.equal(plan.writeToMovie, true);
  assert.equal(SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT, expectedSegmentSourceContract);
  assert.equal(plan.sourceContract, SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT);
  assert.equal(plan.subdivideOutput, false);
  assert.equal(plan.partialMovieIndex, 7);
  assert.equal(plan.partialMovieIndexPadded, "00007");
  assert.equal(plan.partialMoviePath, "mais-manim-function-graph-writer-1234abcd/00007.webm");
  assert.equal(plan.partialPathReady, true);
  assert.equal(plan.actionSummary, "begin:open-pipe;begin_animation:skipped;end_animation:skipped");
  assert.equal(plan.finalFileSummary, "mais-manim-function-graph-writer-1234abcd.webm");
  assert.equal(plan.openPipeCount, 1);
  assert.equal(plan.closePipeCount, 0);
  assert.equal(plan.skippedCount, 2);
  assert.equal(plan.tempFileCount, 1);
  assert.deepEqual(plan.rows.map((row) => `${row.action}:${row.status}:${row.finalFilePath}`), [
    "begin:open-pipe:mais-manim-function-graph-writer-1234abcd.webm",
    "begin_animation:skipped:",
    "end_animation:skipped:"
  ]);
  assert.equal(plan.rows[0].tempFilePath, "mais-manim-function-graph-writer-1234abcd_temp.webm");
  assert.equal(plan.summary, "file-writer-segments:mais-manim-function-graph:open=1:close=0:partial=false:insert=none");
});

test("buildSceneFileWriterSegmentPlan opens and closes numbered partial movie segments", async () => {
  const { SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT, buildSceneFileWriterSegmentPlan } = await importSegmentsModule();
  const plan = buildSceneFileWriterSegmentPlan({
    movieFileExtension: ".mp4",
    numPlays: 42,
    outputSlug: "lesson-vector-field",
    sceneId: "vector-field",
    subdivideOutput: true,
    writeToMovie: true
  });

  assert.equal(plan.sourceContract, SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT);
  assert.equal(plan.partialMovieIndex, 42);
  assert.equal(plan.partialMovieIndexPadded, "00042");
  assert.equal(plan.partialMoviePath, "lesson-vector-field/00042.mp4");
  assert.equal(plan.partialPathReady, true);
  assert.equal(plan.actionSummary, "begin:skipped;begin_animation:open-pipe;end_animation:close-pipe");
  assert.equal(plan.finalFileSummary, "lesson-vector-field/00042.mp4");
  assert.equal(plan.openPipeCount, 1);
  assert.equal(plan.closePipeCount, 1);
  assert.equal(plan.skippedCount, 1);
  assert.equal(plan.tempFileCount, 2);
  assert.deepEqual(plan.rows.map((row) => `${row.action}:${row.status}:${row.finalFilePath}`), [
    "begin:skipped:",
    "begin_animation:open-pipe:lesson-vector-field/00042.mp4",
    "end_animation:close-pipe:lesson-vector-field/00042.mp4"
  ]);
  assert.equal(plan.rows[1].tempFilePath, "lesson-vector-field/00042_temp.mp4");
  assert.equal(plan.summary, "file-writer-segments:vector-field:open=1:close=1:partial=true:insert=none");
});

test("buildSceneFileWriterSegmentPlan reserves the first unused insert recording path", async () => {
  const { SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT, buildSceneFileWriterSegmentPlan } = await importSegmentsModule();
  const plan = buildSceneFileWriterSegmentPlan({
    existingInsertIndexes: [0, 1, 3],
    movieFileExtension: ".mp4",
    numPlays: 2,
    outputSlug: "camera-demo",
    requestTempRecord: true,
    sceneId: "camera-demo",
    subdivideOutput: false,
    writeToMovie: false
  });

  assert.equal(plan.sourceContract, SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT);
  assert.equal(plan.tempRecordRequested, true);
  assert.equal(plan.writeToMovie, false);
  assert.equal(plan.insertIndex, 2);
  assert.equal(plan.insertFilePath, "inserts/camera-demo_2.mp4");
  assert.equal(
    plan.actionSummary,
    "begin:skipped;begin_animation:skipped;end_animation:skipped;begin_insert:open-pipe;end_insert:close-pipe"
  );
  assert.equal(plan.finalFileSummary, "inserts/camera-demo_2.mp4");
  assert.equal(plan.openPipeCount, 1);
  assert.equal(plan.closePipeCount, 1);
  assert.equal(plan.skippedCount, 3);
  assert.equal(plan.tempFileCount, 2);
  assert.deepEqual(plan.rows.map((row) => `${row.action}:${row.status}:${row.finalFilePath}`), [
    "begin:skipped:",
    "begin_animation:skipped:",
    "end_animation:skipped:",
    "begin_insert:open-pipe:inserts/camera-demo_2.mp4",
    "end_insert:close-pipe:inserts/camera-demo_2.mp4"
  ]);
  assert.equal(plan.summary, "file-writer-segments:camera-demo:open=1:close=1:partial=false:insert=2");
});

test("sceneFileWriterSegmentDataAttributes exposes stable browser QA evidence", async () => {
  const { SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT, buildSceneFileWriterSegmentPlan, sceneFileWriterSegmentDataAttributes } =
    await importSegmentsModule();
  const plan = buildSceneFileWriterSegmentPlan({
    existingInsertIndexes: [0],
    numPlays: 3,
    outputSlug: "insert-demo",
    requestTempRecord: true,
    sceneId: "insert-demo",
    subdivideOutput: true,
    writeToMovie: true
  });

  assert.deepEqual(sceneFileWriterSegmentDataAttributes(plan), {
    "data-viz-manim-file-writer-segment-action-summary":
      "begin:skipped;begin_animation:open-pipe;end_animation:close-pipe;begin_insert:open-pipe;end_insert:close-pipe",
    "data-viz-manim-file-writer-segment-close-count": "2",
    "data-viz-manim-file-writer-segment-count": "5",
    "data-viz-manim-file-writer-segment-final-file-summary": "insert-demo/00003.webm|inserts/insert-demo_1.webm",
    "data-viz-manim-file-writer-segment-insert-index": "1",
    "data-viz-manim-file-writer-segment-insert-path": "inserts/insert-demo_1.webm",
    "data-viz-manim-file-writer-segment-open-count": "2",
    "data-viz-manim-file-writer-segment-partial-index": "3",
    "data-viz-manim-file-writer-segment-partial-index-padded": "00003",
    "data-viz-manim-file-writer-segment-partial-path": "insert-demo/00003.webm",
    "data-viz-manim-file-writer-segment-partial-path-ready": "true",
    "data-viz-manim-file-writer-segment-skipped-count": "1",
    "data-viz-manim-file-writer-segment-source-contract": SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT,
    "data-viz-manim-file-writer-segment-subdivide-output": "true",
    "data-viz-manim-file-writer-segment-summary": "file-writer-segments:insert-demo:open=2:close=2:partial=true:insert=1",
    "data-viz-manim-file-writer-segment-temp-file-count": "4",
    "data-viz-manim-file-writer-segment-temp-record": "true",
    "data-viz-manim-file-writer-segment-write-to-movie": "true"
  });
});

test("serializeSceneFileWriterSegmentPlan emits deterministic safe JSON for browser QA", async () => {
  const { buildSceneFileWriterSegmentPlan, serializeSceneFileWriterSegmentPlan } = await importSegmentsModule();
  const plan = buildSceneFileWriterSegmentPlan({
    existingInsertIndexes: [0],
    movieFileExtension: "mp4",
    numPlays: 4,
    outputSlug: "segment-</script>-demo",
    requestTempRecord: true,
    sceneId: "segment-demo",
    subdivideOutput: true,
    writeToMovie: true
  });

  const serialized = serializeSceneFileWriterSegmentPlan(plan);
  const reparsed = JSON.parse(serialized) as MathSceneFileWriterSegmentPlan;

  assert.equal(
    serializeSceneFileWriterSegmentPlan(JSON.parse(JSON.stringify(plan)) as MathSceneFileWriterSegmentPlan),
    serialized
  );
  assert.equal(reparsed.summary, plan.summary);
  assert.equal(reparsed.rows[1].finalFilePath, "segment-</script>-demo/00004.mp4");
  assert.equal(reparsed.insertFilePath, "inserts/segment-</script>-demo_1.mp4");
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("SceneFileWriter segment planner stays pure and documents source contracts", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneFileWriterSegments.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /begin_animation/);
  assert.match(source, /end_animation/);
  assert.match(source, /begin_insert/);
  assert.match(source, /get_next_partial_movie_path/);
  assert.match(source, /SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT/);
  assert.match(source, /serializeSceneFileWriterSegmentPlan/);
  assert.match(source, /stableSerialize/);
  assert.match(source, /temp_record/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window|document|fs|child_process|ffmpeg|AudioSegment/);
});
