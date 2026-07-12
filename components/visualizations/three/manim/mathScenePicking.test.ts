import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT, type MobjectBoundingBoxTable } from "./mathMobjectBoundingBox";
import type { MathSceneRenderGroups } from "./mathSceneGraph";
import type { Vec3 } from "./mathSceneTypes";

type MathScenePickResult = {
  buff: number;
  conceptId: string;
  distanceToCenter: number;
  group: "scene" | "foreground" | "fixedInFrame";
  objectId: string;
  renderIndex: number;
  searchOrderIndex: number;
  sourceContract: string;
  summary: string;
};

type MathScenePickingModule = {
  SCENE_PICKING_SOURCE_CONTRACT: string;
  pointToSceneMobject: (input: {
    boundingBoxes: MobjectBoundingBoxTable;
    buff?: number;
    point: Vec3;
    renderGroups: MathSceneRenderGroups;
    searchSetIds?: string[];
  }) => MathScenePickResult | null;
  scenePickDataAttributes: (result: MathScenePickResult | null) => Record<string, string>;
  serializeScenePickResult: (result: MathScenePickResult | null) => string;
};

const modulePath = "components/visualizations/three/manim/mathScenePicking.ts";

const boundingBoxes: MobjectBoundingBoxTable = {
  emptyCount: 1,
  finiteCount: 3,
  objectIds: "back-curve,front-probe,fixed-label,empty-guide",
  rowCount: 4,
  rows: [
    {
      center: [1, 1, 0],
      conceptId: "background-relation",
      finite: true,
      kind: "finite",
      max: [2, 2, 0],
      min: [0, 0, 0],
      objectId: "back-curve",
      size: [2, 2, 0],
      type: "parametricCurve"
    },
    {
      center: [1, 1, 0],
      conceptId: "current-point",
      finite: true,
      kind: "finite",
      max: [1.1, 1.1, 0],
      min: [0.9, 0.9, 0],
      objectId: "front-probe",
      size: [0.2, 0.2, 0],
      type: "movingPoint"
    },
    {
      center: [1, 1, 0],
      conceptId: "fixed-formula-label",
      finite: true,
      kind: "finite",
      max: [1.05, 1.05, 0],
      min: [0.95, 0.95, 0],
      objectId: "fixed-label",
      size: [0.1, 0.1, 0],
      type: "vector"
    },
    {
      center: [0, 0, 0],
      conceptId: "empty-guide",
      finite: false,
      kind: "empty",
      max: [0, 0, 0],
      min: [0, 0, 0],
      objectId: "empty-guide",
      size: [0, 0, 0],
      type: "axis3d"
    }
  ],
  signature: "mobject-bounds-test",
  sourceContract: MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT
};

const renderGroups: MathSceneRenderGroups = {
  all: ["back-curve", "front-probe", "fixed-label", "empty-guide"],
  fixedInFrame: ["fixed-label"],
  foreground: ["front-probe"],
  scene: ["back-curve", "empty-guide"]
};

async function importScenePickingModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.point_to_mobject picking module");
  return await import("./mathScenePicking") as MathScenePickingModule;
}

test("pointToSceneMobject returns the topmost rendered Mobject touching a point", async () => {
  const { pointToSceneMobject, SCENE_PICKING_SOURCE_CONTRACT } = await importScenePickingModule();
  const picked = pointToSceneMobject({
    boundingBoxes,
    point: [1, 1, 0],
    renderGroups
  });

  assert.ok(picked);
  assert.equal(picked.objectId, "fixed-label");
  assert.equal(picked.conceptId, "fixed-formula-label");
  assert.equal(picked.group, "fixedInFrame");
  assert.equal(picked.renderIndex, 2);
  assert.equal(picked.searchOrderIndex, 0);
  assert.equal(picked.sourceContract, SCENE_PICKING_SOURCE_CONTRACT);
  assert.equal(picked.summary, "pick:hit:fixed-label:group=fixedInFrame:renderIndex=2:buff=0");
});

test("pointToSceneMobject honors Manim search_set order before reversing for top-layer picking", async () => {
  const { pointToSceneMobject } = await importScenePickingModule();
  const picked = pointToSceneMobject({
    boundingBoxes,
    point: [1, 1, 0],
    renderGroups,
    searchSetIds: ["back-curve", "front-probe"]
  });

  assert.ok(picked);
  assert.equal(picked.objectId, "front-probe");
  assert.equal(picked.group, "foreground");
  assert.equal(picked.renderIndex, 1);
  assert.equal(picked.searchOrderIndex, 0);
});

test("pointToSceneMobject uses buff for finite hit areas and ignores empty boxes", async () => {
  const { pointToSceneMobject } = await importScenePickingModule();
  const nearEdgeMiss = pointToSceneMobject({
    boundingBoxes,
    buff: 0.05,
    point: [2.1, 1, 0],
    renderGroups
  });
  const nearEdgeHit = pointToSceneMobject({
    boundingBoxes,
    buff: 0.15,
    point: [2.1, 1, 0],
    renderGroups
  });

  assert.equal(nearEdgeMiss, null);
  assert.ok(nearEdgeHit);
  assert.equal(nearEdgeHit.objectId, "back-curve");
  assert.equal(nearEdgeHit.summary, "pick:hit:back-curve:group=scene:renderIndex=0:buff=0.15");
});

test("scenePickDataAttributes maps picking results to stable browser QA evidence", async () => {
  const { pointToSceneMobject, SCENE_PICKING_SOURCE_CONTRACT, scenePickDataAttributes } = await importScenePickingModule();
  const picked = pointToSceneMobject({
    boundingBoxes,
    point: [1, 1, 0],
    renderGroups
  });

  assert.deepEqual(scenePickDataAttributes(picked), {
    "data-viz-manim-pick-buff": "0",
    "data-viz-manim-pick-concept-id": "fixed-formula-label",
    "data-viz-manim-pick-distance-to-center": "0.000",
    "data-viz-manim-pick-group": "fixedInFrame",
    "data-viz-manim-pick-hit": "true",
    "data-viz-manim-pick-object-id": "fixed-label",
    "data-viz-manim-pick-render-index": "2",
    "data-viz-manim-pick-search-order-index": "0",
    "data-viz-manim-pick-source-contract": SCENE_PICKING_SOURCE_CONTRACT,
    "data-viz-manim-pick-summary": "pick:hit:fixed-label:group=fixedInFrame:renderIndex=2:buff=0"
  });
  assert.deepEqual(scenePickDataAttributes(null), {
    "data-viz-manim-pick-buff": "0",
    "data-viz-manim-pick-concept-id": "none",
    "data-viz-manim-pick-distance-to-center": "0.000",
    "data-viz-manim-pick-group": "none",
    "data-viz-manim-pick-hit": "false",
    "data-viz-manim-pick-object-id": "none",
    "data-viz-manim-pick-render-index": "-1",
    "data-viz-manim-pick-search-order-index": "-1",
    "data-viz-manim-pick-source-contract": SCENE_PICKING_SOURCE_CONTRACT,
    "data-viz-manim-pick-summary": "pick:miss"
  });
});

test("serializeScenePickResult emits stable script-safe hit and miss JSON", async () => {
  const { pointToSceneMobject, SCENE_PICKING_SOURCE_CONTRACT, serializeScenePickResult } = await importScenePickingModule();
  const picked = pointToSceneMobject({
    boundingBoxes,
    point: [1, 1, 0],
    renderGroups
  });
  const hitJson = serializeScenePickResult(picked);
  const missJson = serializeScenePickResult(null);

  assert.doesNotMatch(hitJson, /</);
  assert.equal(missJson, "null");
  assert.deepEqual(JSON.parse(hitJson), {
    buff: 0,
    conceptId: "fixed-formula-label",
    distanceToCenter: 0,
    group: "fixedInFrame",
    objectId: "fixed-label",
    renderIndex: 2,
    searchOrderIndex: 0,
    sourceContract: SCENE_PICKING_SOURCE_CONTRACT,
    summary: "pick:hit:fixed-label:group=fixedInFrame:renderIndex=2:buff=0"
  });
});

test("Scene picking stays pure and documents the point_to_mobject source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathScenePicking.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /pointToSceneMobject/);
  assert.match(source, /SCENE_PICKING_SOURCE_CONTRACT/);
  assert.match(source, /scenePickDataAttributes/);
  assert.match(source, /serializeScenePickResult/);
  assert.match(source, /stableSerialize/);
  assert.match(source, /point_to_mobject/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
