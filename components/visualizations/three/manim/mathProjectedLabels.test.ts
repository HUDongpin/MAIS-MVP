import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildCameraFrameState } from "./mathCameraFrame";
import {
  buildProjectedLabelAnchor,
  buildProjectedLabelAnchorFromNode,
  buildProjectedLabelAnchorsFromRuntimeState,
  PROJECTED_LABEL_SOURCE_CONTRACT,
  projectedLabelAnchorDataAttributes,
  projectPointWithCameraFrame,
  serializeProjectedLabelAnchors,
  summarizeProjectedLabelAnchors,
  summarizeProjectedLabels
} from "./mathProjectedLabels";
import { buildMathSceneRuntimeState, type RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";

const cameraFrame = buildCameraFrameState({
  fov: 60,
  id: "front",
  position: [0, 0, 5],
  target: [0, 0, 0]
});

const viewport = { height: 600, width: 800 };

const curveSpec: MathObjectSpec = {
  colorRole: "function",
  conceptId: "quadratic-rule",
  id: "parabola",
  samples: [
    [-1, 1, 0],
    [0, 0, 0],
    [1, 1, 0]
  ],
  type: "parametricCurve"
};

const curveNode: RuntimeMathObjectNode = {
  boundingBox: { center: [0, 0.5, 0], kind: "finite", max: [1, 1, 0], min: [-1, 0, 0] },
  childIds: [],
  colorRole: "function",
  conceptId: "quadratic-rule",
  id: "parabola",
  renderState: { kind: "polyline", points: curveSpec.samples },
  spec: curveSpec,
  type: "parametricCurve"
};

function round2(value: number) {
  return Number(value.toFixed(2));
}

function roundedScreen(screen: [number, number]) {
  return [round2(screen[0]), round2(screen[1])];
}

test("projects the world origin to the center of the viewport", () => {
  const projection = projectPointWithCameraFrame(cameraFrame, [0, 0, 0], viewport);

  assert.equal(projection.visible, true);
  assert.equal(round2(projection.depth), 5);
  assert.deepEqual(roundedScreen(projection.screen), [400, 300]);
  assert.deepEqual(projection.ndc.map(round2), [0, 0, 0.2]);
});

test("projects right and up world offsets into screen coordinates", () => {
  const projection = projectPointWithCameraFrame(cameraFrame, [1, 1, 0], viewport);

  assert.equal(projection.visible, true);
  assert.ok(projection.screen[0] > 400);
  assert.ok(projection.screen[1] < 300);
  assert.deepEqual(roundedScreen(projection.screen), [503.92, 196.08]);
});

test("marks points behind the camera as not visible", () => {
  const projection = projectPointWithCameraFrame(cameraFrame, [0, 0, 10], viewport);

  assert.equal(projection.visible, false);
  assert.equal(round2(projection.depth), -5);
  assert.deepEqual(roundedScreen(projection.screen), [400, 300]);
});

test("builds a projected label anchor from a runtime Mobject bounding box", () => {
  const anchor = buildProjectedLabelAnchorFromNode(curveNode, {
    cameraFrame,
    text: "f(x)",
    viewport
  });

  assert.equal(anchor.id, "label:parabola");
  assert.equal(anchor.objectId, "parabola");
  assert.equal(anchor.conceptId, "quadratic-rule");
  assert.equal(anchor.colorRole, "function");
  assert.equal(anchor.placement, "projected-3d-anchor");
  assert.deepEqual(anchor.world, [0, 0.5, 0]);
  assert.equal(anchor.visible, true);
  assert.equal(anchor.ariaLabel, "f(x), projected label for quadratic-rule");
  assert.equal(summarizeProjectedLabels([anchor]), "labels=1:visible=1:ids=label:parabola");
});

test("builds projected label anchors from named Manim-style Mobject anchor points", () => {
  const anchor = buildProjectedLabelAnchorFromNode(curveNode, {
    anchorName: "upperRight",
    cameraFrame,
    text: "max corner",
    viewport
  });

  assert.equal(anchor.anchorName, "upperRight");
  assert.deepEqual(anchor.world, [1, 1, 0]);
  assert.deepEqual(roundedScreen(anchor.screen), [503.92, 196.08]);
});

test("projects labels from render-state-derived anchors when stored Mobject bounds are empty", () => {
  const axesNode: RuntimeMathObjectNode = {
    boundingBox: { kind: "empty" },
    childIds: [],
    conceptId: "coordinate-frame",
    id: "axes",
    renderState: {
      kind: "axes",
      xAxisPoints: [[-2, 0, 0], [2, 0, 0]],
      yAxisPoints: [[0, -1, 0], [0, 3, 0]],
      zAxisPoints: [[0, 0, -4], [0, 0, 4]]
    },
    spec: { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-1, 3], z: [-4, 4] }, conceptId: "coordinate-frame" },
    type: "axis3d"
  };
  const anchor = buildProjectedLabelAnchorFromNode(axesNode, {
    anchorName: "upperRight",
    cameraFrame,
    text: "axes",
    viewport
  });

  assert.equal(anchor.anchorName, "upperRight");
  assert.deepEqual(anchor.world, [2, 3, 0]);
  assert.equal(anchor.visible, false);
});

test("builds projected anchors from runtime state and filters hidden labels", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ fov: 60, id: "front", position: [0, 0, 5], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      curveSpec,
      {
        colorRole: "point",
        conceptId: "offscreen-point",
        id: "behind-camera-point",
        pathObjectId: "parabola",
        type: "movingPoint"
      }
    ],
    sceneId: "projected-labels-test",
    timeline: [{ duration: 1, type: "wait" }]
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 0);
  runtimeState.objectGraph.byId["behind-camera-point"] = {
    ...runtimeState.objectGraph.byId["behind-camera-point"],
    boundingBox: { center: [0, 0, 10], kind: "finite", max: [0, 0, 10], min: [0, 0, 10] }
  };

  const anchors = buildProjectedLabelAnchorsFromRuntimeState(runtimeState, viewport, {
    anchorForObject: (node) => (node.id === "parabola" ? "top" : "center"),
    includeHidden: false,
    textForObject: (node) => node.id
  });

  assert.deepEqual(anchors.map((anchor) => anchor.objectId), ["parabola"]);
  assert.equal(anchors[0].text, "parabola");
  assert.equal(anchors[0].anchorName, "top");
  assert.deepEqual(anchors[0].world, [0, 1, 0]);
});

test("summarizes projected label anchor coverage for browser QA", () => {
  const visibleAnchor = buildProjectedLabelAnchorFromNode(curveNode, {
    anchorName: "upperRight",
    cameraFrame,
    text: "f(x)",
    viewport
  });
  const hiddenAnchor = buildProjectedLabelAnchor({
    cameraFrame,
    conceptId: "offscreen-point",
    id: "label:offscreen",
    objectId: "offscreen-point",
    text: "P",
    viewport,
    world: [0, 0, 10]
  });
  const summary = summarizeProjectedLabelAnchors([visibleAnchor, hiddenAnchor]);
  const attributes = projectedLabelAnchorDataAttributes(summary);

  assert.equal(summary.labelCount, 2);
  assert.equal(summary.visibleCount, 1);
  assert.equal(summary.hiddenCount, 1);
  assert.equal(summary.objectCount, 2);
  assert.equal(summary.objectIds, "parabola,offscreen-point");
  assert.equal(summary.conceptIds, "quadratic-rule,offscreen-point");
  assert.equal(summary.hiddenObjectIds, "offscreen-point");
  assert.equal(
    summary.sourceContract,
    "CameraFrame projection|fixed FormulaLayer overlay|projected spatial label anchors"
  );
  assert.equal(summary.sourceContract, PROJECTED_LABEL_SOURCE_CONTRACT);
  assert.equal(
    summary.summary,
    "projectedLabels=2:visible=1:hidden=1:objects=parabola,offscreen-point:concepts=quadratic-rule,offscreen-point:hiddenObjects=offscreen-point"
  );
  assert.equal(attributes["data-viz-manim-projected-label-count"], "2");
  assert.equal(attributes["data-viz-manim-projected-label-visible-count"], "1");
  assert.equal(attributes["data-viz-manim-projected-label-hidden-count"], "1");
  assert.equal(attributes["data-viz-manim-projected-label-object-count"], "2");
  assert.equal(attributes["data-viz-manim-projected-label-object-ids"], "parabola,offscreen-point");
  assert.equal(attributes["data-viz-manim-projected-label-concept-ids"], "quadratic-rule,offscreen-point");
  assert.equal(attributes["data-viz-manim-projected-label-hidden-object-ids"], "offscreen-point");
  assert.equal(attributes["data-viz-manim-projected-label-source-contract"], PROJECTED_LABEL_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-projected-label-summary"], summary.summary);
});

test("builds explicit projected anchors with finite fallback values", () => {
  const anchor = buildProjectedLabelAnchor({
    cameraFrame,
    conceptId: "bad-point",
    id: "manual-label",
    objectId: "bad-object",
    text: "P",
    viewport,
    world: [Number.NaN, Number.POSITIVE_INFINITY, 0]
  });

  assert.deepEqual(anchor.world, [0, 0, 0]);
  assert.deepEqual(roundedScreen(anchor.screen), [400, 300]);
  assert.equal(anchor.visible, true);
});

test("serializes projected label anchors as deterministic script-safe browser QA JSON", () => {
  const anchor = buildProjectedLabelAnchor({
    cameraFrame,
    conceptId: "quadratic<script>-rule",
    id: "label<script>:parabola",
    objectId: "parabola<script>",
    text: "f<script>(x)",
    viewport,
    world: [0, 0.5, 0]
  });
  const json = serializeProjectedLabelAnchors([anchor]);
  const parsed = JSON.parse(json) as ReturnType<typeof summarizeProjectedLabelAnchors> & {
    anchors: typeof anchor[];
  };

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.labelCount, 1);
  assert.equal(parsed.visibleCount, 1);
  assert.equal(parsed.objectIds, "parabola<script>");
  assert.equal(parsed.conceptIds, "quadratic<script>-rule");
  assert.equal(parsed.sourceContract, PROJECTED_LABEL_SOURCE_CONTRACT);
  assert.equal(parsed.anchors[0].id, "label<script>:parabola");
  assert.equal(parsed.anchors[0].objectId, "parabola<script>");
  assert.equal(parsed.anchors[0].text, "f<script>(x)");
  assert.deepEqual(parsed.anchors[0].world, [0, 0.5, 0]);
});

test("Projected labels stay pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathProjectedLabels.ts", "utf8");

  assert.match(source, /projectPointWithCameraFrame/);
  assert.match(source, /projected-3d-anchor/);
  assert.match(source, /mathMobjectAnchors/);
  assert.match(source, /serializeProjectedLabelAnchors/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
