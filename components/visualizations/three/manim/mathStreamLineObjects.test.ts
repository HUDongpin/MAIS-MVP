import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import {
  buildAnimatedStreamLinePayloadFrames,
  buildSceneStreamLines,
  buildStreamLineEvidenceForScene,
  buildStreamLineObjectSpecs,
  expandSceneStreamLineObjects,
  serializeStreamLinePayload,
  streamLineDataAttributes,
  STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT,
  streamLineRuntimeObjectId,
  STREAM_LINE_SOURCE_CONTRACT,
  summarizeSceneStreamLines
} from "./mathStreamLineObjects";
import type { MathSceneSpec } from "./mathSceneTypes";

function streamLineScene(): MathSceneSpec {
  return {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0], fov: 48 }],
    coordinateSpace: {
      mathRange: { x: [0, 2], y: [0, 2], z: [-1, 1] },
      worldRange: { x: [0, 4], y: [0, 4], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      { type: "axis3d", id: "axes", range: { x: [0, 2], y: [0, 2], z: [-1, 1] }, conceptId: "coordinate-frame" }
    ],
    sceneId: "stream-line-runtime-scene",
    streamLines: [
      {
        bounds: { x: [0, 2], y: [0, 2], z: [-1, 1] },
        colorRole: "trace",
        conceptId: "constant-flow",
        coordinateMode: "math",
        cycleSeconds: 4,
        dt: 0.5,
        id: "flow-lines",
        phaseOffsetStep: 0.125,
        stepCount: 3,
        system: { type: "constantVelocity", velocity: [1, 0, 0] },
        visibleProgress: 0.25,
        xRange: [0, 0.5],
        xSteps: 2,
        yRange: [0, 1],
        ySteps: 2,
        z: 0
      }
    ],
    timeline: []
  };
}

test("builds scene StreamLines from serializable dynamic-system specs", () => {
  const sets = buildSceneStreamLines(streamLineScene());
  const summary = summarizeSceneStreamLines(sets);
  const attributes = streamLineDataAttributes(summary);

  assert.equal(streamLineRuntimeObjectId("flow-lines", 3), "flow-lines:line-3");
  assert.equal(sets.length, 1);
  assert.equal(sets[0]?.streamLines.id, "flow-lines");
  assert.equal(sets[0]?.streamLines.lines.length, 4);
  assert.equal(sets[0]?.streamLines.lines[1].phaseOffset, 0.125);
  assert.equal(summary.streamLineSetCount, 1);
  assert.equal(summary.lineCount, 4);
  assert.equal(summary.completedLineCount, 4);
  assert.equal(summary.stoppedLineCount, 0);
  assert.equal(summary.totalPointCount, 16);
  assert.equal(summary.animatedWindowCount, 4);
  assert.equal(summary.wrappedWindowCount, 1);
  assert.equal(summary.framePlanSegmentCount, 5);
  assert.equal(summary.framePlanSourceContract, STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT);
  assert.equal(summary.framePlanVisibleLineCount, 4);
  assert.equal(summary.frameFiniteVisibleLengthCount, 4);
  assert.equal(summary.frameVisibleLengthRange, "0.375..0.375");
  assert.equal(
    summary.frameVisibleLengthSummary,
    "flow-lines:line-0=0.375;flow-lines:line-1=0.375;flow-lines:line-2=0.375;flow-lines:line-3=0.375"
  );
  assert.equal(
    summary.framePhaseOrder,
    "flow-lines:line-0,flow-lines:line-1,flow-lines:line-2,flow-lines:line-3"
  );
  assert.equal(summary.coordinateModeSummary, "math=1;world=0");
  assert.equal(summary.phaseOffsetRange, "0.000..0.375");
  assert.equal(summary.cycleSecondsSummary, "flow-lines=4.000s");
  assert.equal(summary.integrationStepSummary, "flow-lines:dt=0.500:steps=3");
  assert.equal(summary.revealWindowSummary, "flow-lines:cycle=4.000s:visible=0.250:phaseStep=0.125:wrap=true");
  assert.equal(summary.seedGridSummary, "flow-lines:2x2:x=[0.000,0.500]:y=[0.000,1.000]:z=0.000:mode=math");
  assert.equal(summary.systemSummary, "flow-lines:constantVelocity[1.000,0.000,0.000]");
  assert.equal(summary.visibleProgressSummary, "flow-lines=0.250");
  assert.equal(summary.sourceContract, STREAM_LINE_SOURCE_CONTRACT);
  assert.ok(summary.visiblePointCount > 0);
  assert.ok(summary.visiblePointCount < summary.totalPointCount);
  assert.equal(summary.objectCount, 4);
  assert.equal(summary.streamLineIds, "flow-lines");
  assert.equal(
    summary.summary,
    `streamLineSets=1;lines=4;completed=4;stopped=0;points=16;visible=${summary.visiblePointCount};objects=4;ids=flow-lines`
  );
  assert.equal(attributes["data-viz-manim-stream-line-set-count"], "1");
  assert.equal(attributes["data-viz-manim-stream-line-count"], "4");
  assert.equal(attributes["data-viz-manim-stream-line-completed-line-count"], "4");
  assert.equal(attributes["data-viz-manim-stream-line-stopped-line-count"], "0");
  assert.equal(attributes["data-viz-manim-stream-line-point-count"], "16");
  assert.equal(attributes["data-viz-manim-stream-line-animated-window-count"], "4");
  assert.equal(attributes["data-viz-manim-stream-line-wrapped-window-count"], "1");
  assert.equal(attributes["data-viz-manim-stream-line-frame-plan-segment-count"], "5");
  assert.equal(attributes["data-viz-manim-stream-line-frame-plan-source-contract"], STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-stream-line-frame-plan-visible-line-count"], "4");
  assert.equal(attributes["data-viz-manim-stream-line-frame-finite-visible-length-count"], "4");
  assert.equal(attributes["data-viz-manim-stream-line-frame-visible-length-range"], "0.375..0.375");
  assert.equal(attributes["data-viz-manim-stream-line-frame-visible-length-summary"], summary.frameVisibleLengthSummary);
  assert.equal(
    attributes["data-viz-manim-stream-line-frame-phase-order"],
    "flow-lines:line-0,flow-lines:line-1,flow-lines:line-2,flow-lines:line-3"
  );
  assert.equal(attributes["data-viz-manim-stream-line-coordinate-mode-summary"], "math=1;world=0");
  assert.equal(attributes["data-viz-manim-stream-line-phase-offset-range"], "0.000..0.375");
  assert.equal(attributes["data-viz-manim-stream-line-cycle-seconds-summary"], "flow-lines=4.000s");
  assert.equal(attributes["data-viz-manim-stream-line-integration-step-summary"], summary.integrationStepSummary);
  assert.equal(attributes["data-viz-manim-stream-line-reveal-window-summary"], summary.revealWindowSummary);
  assert.equal(attributes["data-viz-manim-stream-line-seed-grid-summary"], summary.seedGridSummary);
  assert.equal(attributes["data-viz-manim-stream-line-system-summary"], summary.systemSummary);
  assert.equal(attributes["data-viz-manim-stream-line-visible-progress-summary"], "flow-lines=0.250");
  assert.equal(attributes["data-viz-manim-stream-line-source-contract"], STREAM_LINE_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-stream-line-visible-point-count"], String(summary.visiblePointCount));
  assert.equal(attributes["data-viz-manim-stream-line-object-count"], "4");
  assert.equal(attributes["data-viz-manim-stream-line-summary"], summary.summary);
});

test("expands scene StreamLines into ordinary curve Mobjects before runtime graph construction", () => {
  const scene = streamLineScene();
  const expanded = expandSceneStreamLineObjects(scene);
  const objects = buildStreamLineObjectSpecs(scene);
  const runtimeState = buildMathSceneRuntimeState(scene, 0);

  assert.notEqual(expanded, scene);
  assert.equal(scene.objects.length, 1);
  assert.equal(objects.length, 4);
  assert.equal(objects[0]?.type, "parametricCurve");
  assert.equal(objects[0]?.id, "flow-lines:line-0");
  if (objects[0]?.type !== "parametricCurve") throw new Error("expected first stream line to be a curve");
  assert.deepEqual(objects[0].samples[1], [1, 0, 0]);
  assert.equal(expanded.objects.length, 5);
  assert.equal(expanded.diagnostics.expectedObjectCount, 5);
  assert.equal(runtimeState.objectGraph.byId["flow-lines:line-3"]?.type, "parametricCurve");
  assert.equal(runtimeState.sceneGraph.summary.sceneRenderableCount, 5);
});

test("samples animated StreamLine windows by runtime elapsed seconds", () => {
  const scene = streamLineScene();
  const fullObjects = buildStreamLineObjectSpecs(scene);
  const animatedObjects = buildStreamLineObjectSpecs(scene, { elapsedSeconds: 3 });
  const runtimeState = buildMathSceneRuntimeState(scene, 3);

  assert.equal(animatedObjects[0]?.type, "parametricCurve");
  if (animatedObjects[0]?.type !== "parametricCurve") throw new Error("expected first stream line to be a curve");
  assert.notDeepEqual(animatedObjects[0].samples, fullObjects[0]?.type === "parametricCurve" ? fullObjects[0].samples : []);
  assert.deepEqual(animatedObjects[0].samples.map((point) => point.map((value) => Number(value.toFixed(3)))), [
    [1.5, 0, 0],
    [2, 0, 0],
    [2.25, 0, 0]
  ]);
  const runtimeLine = runtimeState.objectGraph.byId["flow-lines:line-0"];
  assert.equal(runtimeLine?.renderState.kind, "polyline");
  if (runtimeLine?.renderState.kind !== "polyline") throw new Error("expected runtime stream line polyline");
  assert.deepEqual(runtimeLine.renderState.points.map((point) => point.map((value) => Number(value.toFixed(3)))), [
    [1.5, 0, 0],
    [2, 0, 0],
    [2.25, 0, 0]
  ]);
});

test("builds scene-level StreamLine evidence from pure scene specs", () => {
  const scene = streamLineScene();
  const evidence = buildStreamLineEvidenceForScene(scene, { elapsedSeconds: 3 });

  assert.equal(evidence.streamLineSetCount, 1);
  assert.equal(evidence.lineCount, 4);
  assert.equal(evidence.completedLineCount, 4);
  assert.equal(evidence.stoppedLineCount, 0);
  assert.equal(evidence.totalPointCount, 16);
  assert.equal(evidence.objectCount, 4);
  assert.equal(evidence.framePlanSegmentCount, 5);
  assert.equal(evidence.framePlanSourceContract, STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT);
  assert.equal(evidence.framePlanVisibleLineCount, 4);
  assert.equal(evidence.frameFiniteVisibleLengthCount, 4);
  assert.equal(evidence.frameVisibleLengthRange, "0.375..0.375");
  assert.equal(
    evidence.frameVisibleLengthSummary,
    "flow-lines:line-0=0.375;flow-lines:line-1=0.375;flow-lines:line-2=0.375;flow-lines:line-3=0.375"
  );
  assert.equal(evidence.framePhaseOrder, "flow-lines:line-2,flow-lines:line-3,flow-lines:line-0,flow-lines:line-1");
  assert.equal(evidence.sourceContract, STREAM_LINE_SOURCE_CONTRACT);
  assert.equal(evidence.streamLineIds, "flow-lines");
  assert.equal(evidence.integrationStepSummary, "flow-lines:dt=0.500:steps=3");
  assert.equal(evidence.revealWindowSummary, "flow-lines:cycle=4.000s:visible=0.250:phaseStep=0.125:wrap=true");
  assert.match(evidence.summary, /^streamLineSets=1;lines=4;completed=4;stopped=0;points=16;visible=\d+;objects=4;ids=flow-lines$/);
});

test("serializes StreamLine payloads for browser QA without unsafe script characters", () => {
  const baseScene = streamLineScene();
  const scene: MathSceneSpec = {
    ...baseScene,
    sceneId: "stream-line-payload-scene",
    streamLines: [
      {
        ...baseScene.streamLines![0]!,
        conceptId: "constant-flow<script>",
        id: "flow-lines<script>"
      }
    ]
  };
  const sets = buildSceneStreamLines(scene);
  const frames = buildAnimatedStreamLinePayloadFrames(sets, { elapsedSeconds: 3 });
  const json = serializeStreamLinePayload(sets, { elapsedSeconds: 3 });
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(frames.length, 4);
  assert.equal(frames[0].setId, "flow-lines<script>");
  assert.equal(frames[0].frame.lineId, "flow-lines<script>:line-0");
  assert.equal(parsed.version, "mais-manim-stream-line/v1");
  assert.equal(parsed.elapsedSeconds, 3);
  assert.equal(parsed.streamLineSetCount, 1);
  assert.equal(parsed.lineCount, 4);
  assert.equal(parsed.sourceContract, STREAM_LINE_SOURCE_CONTRACT);
  assert.equal(parsed.sets.length, 1);
  assert.equal(parsed.sets[0].spec.id, "flow-lines<script>");
  assert.equal(parsed.sets[0].spec.conceptId, "constant-flow<script>");
  assert.equal(parsed.sets[0].streamLines.lines.length, 4);
  assert.equal(parsed.sets[0].streamLines.lines[0].id, "flow-lines<script>:line-0");
  assert.equal(parsed.animatedFrames.length, 4);
  assert.equal(parsed.animatedFrames[0].frame.lineId, "flow-lines<script>:line-0");
  assert.ok(parsed.animatedFrames[0].frame.pointCount > 0);
});

test("StreamLine object bridge stays pure and is consumed by runtime state", () => {
  const bridgeSource = fs.readFileSync("components/visualizations/three/manim/mathStreamLineObjects.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeState.ts", "utf8");

  assert.doesNotMatch(bridgeSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(bridgeSource, /sampleStreamLineSeeds2D/);
  assert.match(bridgeSource, /STREAM_LINE_SOURCE_CONTRACT/);
  assert.match(bridgeSource, /buildStreamLines/);
  assert.match(bridgeSource, /buildAnimatedStreamLineFrame/);
  assert.match(bridgeSource, /serializeStreamLinePayload/);
  assert.match(runtimeSource, /expandSceneStreamLineObjects/);
});
