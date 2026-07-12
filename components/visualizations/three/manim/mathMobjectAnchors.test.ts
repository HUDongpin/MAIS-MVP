import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMobjectAnchorEvidence,
  mobjectAnchorEvidenceDataAttributes,
  mobjectAnchorPoint,
  mobjectAnchorPointForNode,
  mobjectCriticalPoint,
  MOBJECT_ANCHOR_SOURCE_CONTRACT,
  serializeMobjectAnchorEvidence,
  summarizeMobjectAnchors,
  type MobjectAnchorEvidence
} from "./mathMobjectAnchors";
import type { MathObjectGraph, RuntimeBoundingBox, RuntimeMathObjectNode } from "./mathSceneRuntimeState";

const box: RuntimeBoundingBox = {
  center: [1, 2, 0.5],
  kind: "finite",
  max: [3, 5, 2],
  min: [-1, -1, -1]
};

test("computes Manim-style critical points from bounding-box direction vectors", () => {
  assert.deepEqual(mobjectCriticalPoint(box, [0, 0, 0]), [1, 2, 0.5]);
  assert.deepEqual(mobjectCriticalPoint(box, [1, 1, 0]), [3, 5, 0.5]);
  assert.deepEqual(mobjectCriticalPoint(box, [-1, -1, -1]), [-1, -1, -1]);
});

test("resolves named Mobject anchors for label and indication placement", () => {
  assert.deepEqual(mobjectAnchorPoint(box, "center"), [1, 2, 0.5]);
  assert.deepEqual(mobjectAnchorPoint(box, "top"), [1, 5, 0.5]);
  assert.deepEqual(mobjectAnchorPoint(box, "right"), [3, 2, 0.5]);
  assert.deepEqual(mobjectAnchorPoint(box, "upperRight"), [3, 5, 0.5]);
  assert.deepEqual(mobjectAnchorPoint(box, "lowerLeft"), [-1, -1, 0.5]);
  assert.equal(
    summarizeMobjectAnchors(box, ["center", "upperRight", "back"]),
    "center=(1.000,2.000,0.500);upperRight=(3.000,5.000,0.500);back=(1.000,2.000,-1.000)"
  );
});

test("falls back to finite origin anchors for empty bounding boxes", () => {
  const empty: RuntimeBoundingBox = { kind: "empty" };

  assert.deepEqual(mobjectCriticalPoint(empty, [1, 1, 1]), [0, 0, 0]);
  assert.deepEqual(mobjectAnchorPoint(empty, "upperRight"), [0, 0, 0]);
});

test("resolves anchors from render-state points when stored Mobject bounds are empty", () => {
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

  assert.deepEqual(mobjectAnchorPointForNode(axesNode, "center"), [0, 1, 0]);
  assert.deepEqual(mobjectAnchorPointForNode(axesNode, "upperRight"), [2, 3, 0]);
  assert.deepEqual(mobjectAnchorPointForNode(axesNode, "back"), [0, 1, -4]);
});

test("summarizes Mobject critical-point anchors for browser QA", () => {
  const graph = {
    byId: {
      axes: {
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
      },
      point: {
        boundingBox: { center: [1, 2, 3], kind: "finite", max: [1, 2, 3], min: [1, 2, 3] },
        childIds: [],
        conceptId: "probe",
        id: "point",
        renderState: { kind: "point", position: [1, 2, 3] },
        spec: { type: "movingPoint", id: "point", pathObjectId: "axes", colorRole: "probe", conceptId: "probe" },
        type: "movingPoint"
      }
    },
    rootIds: ["axes", "point"]
  } satisfies MathObjectGraph;
  const evidence = buildMobjectAnchorEvidence(graph, ["center", "top", "back"]);
  const attributes = mobjectAnchorEvidenceDataAttributes(evidence);

  assert.equal(evidence.objectCount, 2);
  assert.equal(evidence.anchorNameCount, 3);
  assert.equal(evidence.anchorPointCount, 6);
  assert.equal(evidence.finiteAnchorPointCount, 6);
  assert.equal(evidence.emptyBoundingBoxCount, 0);
  assert.equal(evidence.anchorNames, "back,center,top");
  assert.equal(evidence.objectIds, "axes,point");
  assert.equal(evidence.sourceContract, MOBJECT_ANCHOR_SOURCE_CONTRACT);
  assert.equal(
    evidence.summary,
    "mobject-anchors:objects=2:anchors=3:points=6:finite=6:empty=0:names=back,center,top:ids=axes,point"
  );
  assert.equal(attributes["data-viz-mobject-anchor-object-count"], "2");
  assert.equal(attributes["data-viz-mobject-anchor-name-count"], "3");
  assert.equal(attributes["data-viz-mobject-anchor-point-count"], "6");
  assert.equal(attributes["data-viz-mobject-anchor-finite-point-count"], "6");
  assert.equal(attributes["data-viz-mobject-anchor-empty-bounding-box-count"], "0");
  assert.equal(attributes["data-viz-mobject-anchor-source-contract"], MOBJECT_ANCHOR_SOURCE_CONTRACT);
});

test("summarizes parent Mobject anchors from descendant get_all_points bounding boxes", () => {
  const graph = {
    byId: {
      parent: {
        boundingBox: { kind: "empty" },
        childIds: ["child"],
        conceptId: "parent",
        id: "parent",
        renderState: { kind: "empty" },
        spec: { type: "axis3d", id: "parent", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }, conceptId: "parent" },
        type: "axis3d"
      },
      child: {
        boundingBox: { kind: "empty" },
        childIds: [],
        conceptId: "child",
        id: "child",
        parentId: "parent",
        renderState: { kind: "polyline", points: [[-2, 1, 0], [3, 4, 0]] },
        spec: { type: "parametricCurve", id: "child", samples: [], colorRole: "function", conceptId: "child" },
        type: "parametricCurve"
      }
    },
    rootIds: ["parent"]
  } satisfies MathObjectGraph;
  const evidence = buildMobjectAnchorEvidence(graph, ["center", "upperRight"]);

  assert.equal(evidence.objectCount, 2);
  assert.equal(evidence.emptyBoundingBoxCount, 0);
  assert.equal(evidence.finiteAnchorPointCount, 4);
  assert.equal(
    evidence.summary,
    "mobject-anchors:objects=2:anchors=2:points=4:finite=4:empty=0:names=center,upperRight:ids=child,parent"
  );
});

test("serializes Mobject critical-point anchor evidence for browser QA without unsafe script characters", () => {
  const evidence: MobjectAnchorEvidence = {
    anchorNameCount: 1,
    anchorNames: "center<script>",
    anchorPointCount: 1,
    emptyBoundingBoxCount: 0,
    finiteAnchorPointCount: 1,
    objectCount: 1,
    objectIds: "curve<script>",
    sourceContract: MOBJECT_ANCHOR_SOURCE_CONTRACT,
    summary: "mobject-anchors:<script>"
  };
  const json = serializeMobjectAnchorEvidence(evidence);
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.summary, "mobject-anchors:<script>");
  assert.equal(parsed.objectIds, "curve<script>");
  assert.equal(parsed.anchorNames, "center<script>");
  assert.equal(parsed.sourceContract, MOBJECT_ANCHOR_SOURCE_CONTRACT);
  assert.equal(serializeMobjectAnchorEvidence(JSON.parse(JSON.stringify(evidence)) as typeof evidence), json);
});

test("MobjectAnchors stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectAnchors.ts", "utf8");

  assert.match(source, /mobjectCriticalPoint/);
  assert.match(source, /mobjectAnchorPoint/);
  assert.match(source, /serializeMobjectAnchorEvidence/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
