import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMathCheckpointPastePlan,
  type MathCheckpointPastePlan
} from "./mathCheckpointPastePlan";
import {
  buildSceneFileWriterSegmentPlan,
  type MathSceneFileWriterSegmentPlan,
  type MathSceneFileWriterSegmentPlanInput
} from "./mathSceneFileWriterSegments";

type MathCheckpointPasteFileWriterBridgePlan = {
  checkpointKey: string;
  checkpointRecordRequested: boolean;
  closeInsertPipe: boolean;
  fileWriterTempRecordRequested: boolean;
  insertFilePath: string;
  insertIndex: number | null;
  openInsertPipe: boolean;
  ready: boolean;
  sceneId: string;
  segmentActionSummary: string;
  segmentCount: number;
  sourceContract: string;
  summary: string;
  version: "mais-manim-checkpoint-paste-file-writer-bridge/v1";
};

type MathCheckpointPasteFileWriterBridgeModule = {
  SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT: string;
  buildCheckpointPasteFileWriterBridgePlan: (input: {
    checkpointPastePlan: MathCheckpointPastePlan | null;
    segmentPlan: MathSceneFileWriterSegmentPlan;
  }) => MathCheckpointPasteFileWriterBridgePlan;
  checkpointPasteFileWriterBridgeDataAttributes: (plan: MathCheckpointPasteFileWriterBridgePlan) => Record<string, string>;
  checkpointPasteFileWriterSegmentInput: (
    input: MathSceneFileWriterSegmentPlanInput & { checkpointPastePlan?: MathCheckpointPastePlan | null }
  ) => MathSceneFileWriterSegmentPlanInput;
  serializeCheckpointPasteFileWriterBridgePlan: (plan: MathCheckpointPasteFileWriterBridgePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathCheckpointPasteFileWriterBridge.ts";
const expectedSourceContract =
  "Scene.checkpoint_paste(record=True) -> SceneFileWriter.temp_record begin_insert/end_insert insert segment";

async function importBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure checkpoint_paste/FileWriter bridge module");
  return (await import("./mathCheckpointPasteFileWriterBridge")) as MathCheckpointPasteFileWriterBridgeModule;
}

test("checkpointPasteFileWriterSegmentInput routes checkpoint_paste record=True into temp_record insert segments", async () => {
  const {
    SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
    buildCheckpointPasteFileWriterBridgePlan,
    checkpointPasteFileWriterSegmentInput
  } = await importBridgeModule();
  const checkpointPastePlan = buildMathCheckpointPastePlan({
    record: true,
    sceneId: "mais-manim-function-graph",
    snippet: "# slope handoff\nself.play(curve.animate.set_color(YELLOW))"
  });
  const segmentInput = checkpointPasteFileWriterSegmentInput({
    checkpointPastePlan,
    existingInsertIndexes: [0, 1],
    movieFileExtension: ".mp4",
    numPlays: 3,
    outputSlug: "mais-manim-function-graph-fnv1a-demo",
    sceneId: "mais-manim-function-graph",
    subdivideOutput: true,
    writeToMovie: true
  });
  const segmentPlan = buildSceneFileWriterSegmentPlan(segmentInput);
  const bridgePlan = buildCheckpointPasteFileWriterBridgePlan({
    checkpointPastePlan,
    segmentPlan
  });

  assert.equal(SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(segmentInput.requestTempRecord, true);
  assert.equal(segmentPlan.tempRecordRequested, true);
  assert.equal(segmentPlan.insertIndex, 2);
  assert.equal(segmentPlan.insertFilePath, "inserts/mais-manim-function-graph-fnv1a-demo_2.mp4");
  assert.deepEqual(
    segmentPlan.rows.slice(-2).map((row) => `${row.action}:${row.status}:${row.finalFilePath}`),
    [
      "begin_insert:open-pipe:inserts/mais-manim-function-graph-fnv1a-demo_2.mp4",
      "end_insert:close-pipe:inserts/mais-manim-function-graph-fnv1a-demo_2.mp4"
    ]
  );
  assert.equal(bridgePlan.version, "mais-manim-checkpoint-paste-file-writer-bridge/v1");
  assert.equal(bridgePlan.sourceContract, SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT);
  assert.equal(bridgePlan.checkpointKey, "slope handoff");
  assert.equal(bridgePlan.checkpointRecordRequested, true);
  assert.equal(bridgePlan.fileWriterTempRecordRequested, true);
  assert.equal(bridgePlan.openInsertPipe, true);
  assert.equal(bridgePlan.closeInsertPipe, true);
  assert.equal(bridgePlan.insertIndex, 2);
  assert.equal(bridgePlan.insertFilePath, "inserts/mais-manim-function-graph-fnv1a-demo_2.mp4");
  assert.equal(bridgePlan.segmentCount, 5);
  assert.equal(bridgePlan.ready, true);
  assert.equal(
    bridgePlan.summary,
    "checkpoint-file-writer-bridge:mais-manim-function-graph:key=slope handoff:record=true:tempRecord=true:insert=2:ready=true"
  );
});

test("checkpointPasteFileWriterSegmentInput leaves non-record checkpoint pastes without insert pipes", async () => {
  const {
    buildCheckpointPasteFileWriterBridgePlan,
    checkpointPasteFileWriterSegmentInput
  } = await importBridgeModule();
  const checkpointPastePlan = buildMathCheckpointPastePlan({
    record: false,
    sceneId: "mais-manim-function-graph",
    snippet: "# inspect point\nself.wait()"
  });
  const segmentPlan = buildSceneFileWriterSegmentPlan(checkpointPasteFileWriterSegmentInput({
    checkpointPastePlan,
    existingInsertIndexes: [0],
    numPlays: 1,
    outputSlug: "plain-paste",
    sceneId: "mais-manim-function-graph",
    subdivideOutput: true,
    writeToMovie: true
  }));
  const bridgePlan = buildCheckpointPasteFileWriterBridgePlan({
    checkpointPastePlan,
    segmentPlan
  });

  assert.equal(segmentPlan.tempRecordRequested, false);
  assert.equal(segmentPlan.insertIndex, null);
  assert.equal(segmentPlan.insertFilePath, "");
  assert.equal(segmentPlan.segmentCount, 3);
  assert.equal(bridgePlan.checkpointRecordRequested, false);
  assert.equal(bridgePlan.fileWriterTempRecordRequested, false);
  assert.equal(bridgePlan.openInsertPipe, false);
  assert.equal(bridgePlan.closeInsertPipe, false);
  assert.equal(bridgePlan.ready, true);
});

test("checkpointPasteFileWriterBridgeDataAttributes and serialization expose stable QA evidence", async () => {
  const {
    SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
    buildCheckpointPasteFileWriterBridgePlan,
    checkpointPasteFileWriterBridgeDataAttributes,
    checkpointPasteFileWriterSegmentInput,
    serializeCheckpointPasteFileWriterBridgePlan
  } = await importBridgeModule();
  const checkpointPastePlan = buildMathCheckpointPastePlan({
    record: true,
    sceneId: "bridge-</script>-scene",
    snippet: "# browser contract\nself.play(dot.animate.shift(RIGHT))"
  });
  const segmentPlan = buildSceneFileWriterSegmentPlan(checkpointPasteFileWriterSegmentInput({
    checkpointPastePlan,
    existingInsertIndexes: [],
    outputSlug: "bridge-</script>-scene",
    numPlays: 0,
    sceneId: "bridge-</script>-scene",
    subdivideOutput: true,
    writeToMovie: true
  }));
  const plan = buildCheckpointPasteFileWriterBridgePlan({
    checkpointPastePlan,
    segmentPlan
  });

  assert.deepEqual(checkpointPasteFileWriterBridgeDataAttributes(plan), {
    "data-viz-manim-checkpoint-file-writer-close-insert-pipe": "true",
    "data-viz-manim-checkpoint-file-writer-insert-index": "0",
    "data-viz-manim-checkpoint-file-writer-insert-path": "inserts/bridge-</script>-scene_0.webm",
    "data-viz-manim-checkpoint-file-writer-key": "browser contract",
    "data-viz-manim-checkpoint-file-writer-open-insert-pipe": "true",
    "data-viz-manim-checkpoint-file-writer-ready": "true",
    "data-viz-manim-checkpoint-file-writer-record": "true",
    "data-viz-manim-checkpoint-file-writer-scene-id": "bridge-</script>-scene",
    "data-viz-manim-checkpoint-file-writer-segment-action-summary":
      "begin:skipped;begin_animation:open-pipe;end_animation:close-pipe;begin_insert:open-pipe;end_insert:close-pipe",
    "data-viz-manim-checkpoint-file-writer-segment-count": "5",
    "data-viz-manim-checkpoint-file-writer-source-contract": SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
    "data-viz-manim-checkpoint-file-writer-summary":
      "checkpoint-file-writer-bridge:bridge-</script>-scene:key=browser contract:record=true:tempRecord=true:insert=0:ready=true",
    "data-viz-manim-checkpoint-file-writer-temp-record": "true"
  });
  assert.ok(!serializeCheckpointPasteFileWriterBridgePlan(plan).includes("</script>"));
  assert.ok(serializeCheckpointPasteFileWriterBridgePlan(plan).includes("\\u003c/script>"));
});
