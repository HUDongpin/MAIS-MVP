import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MOBJECT_FAMILY_SOURCE_CONTRACT,
  buildMobjectFamilyIndex,
  mobjectConceptFamilyIds,
  mobjectFamilyIds,
  mobjectFamilyMembersWithRenderData,
  mobjectFamilySummaryDataAttributes,
  serializeMobjectFamilyIndex,
  summarizeMobjectFamilies
} from "./mathMobjectFamily";
import {
  MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT,
  buildMobjectFamilyCachePlan,
  mobjectFamilyCacheDataAttributes,
  serializeMobjectFamilyCachePlan,
  summarizeMobjectFamilyCachePlan,
  type MobjectFamilyCachePlan
} from "./mathMobjectFamilyCache";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState, type MathObjectGraph, type RuntimeMathObjectNode, type RuntimeRenderState } from "./mathSceneRuntimeState";
import { applyMathUpdaters } from "./mathUpdaterRegistry";

const functionGraphSpec = buildMathSceneSpecForThreeDFamily({
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

function node(id: string, parentId?: string): RuntimeMathObjectNode {
  return {
    boundingBox: { kind: "empty" },
    childIds: [],
    conceptId: id,
    id,
    parentId,
    renderState: { kind: "empty" },
    spec: {
      id,
      range: { x: [0, 1], y: [0, 1], z: [0, 1] },
      type: "axis3d"
    },
    type: "axis3d"
  };
}

function graph(nodes: RuntimeMathObjectNode[]): MathObjectGraph {
  return {
    byId: Object.fromEntries(nodes.map((entry) => [entry.id, entry])),
    rootIds: nodes.filter((entry) => !entry.parentId).map((entry) => entry.id)
  };
}

test("builds a Manim-style mobject family index from the runtime object graph", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = applyMathUpdaters(functionGraphSpec, buildMathSceneRuntimeState(functionGraphSpec, 3.5));
  const index = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const summary = summarizeMobjectFamilies(index);

  assert.equal(index.sourceContract, MOBJECT_FAMILY_SOURCE_CONTRACT);
  assert.match(MOBJECT_FAMILY_SOURCE_CONTRACT, /submobjects/);
  assert.match(MOBJECT_FAMILY_SOURCE_CONTRACT, /parents/);
  assert.match(MOBJECT_FAMILY_SOURCE_CONTRACT, /get_family/);
  assert.match(MOBJECT_FAMILY_SOURCE_CONTRACT, /family_members_with_points/);
  assert.deepEqual(index.topLevelIds, ["axes", "function-curve"]);
  assert.deepEqual(mobjectFamilyIds(index, "function-curve"), ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(mobjectFamilyIds(index, "moving-probe"), ["moving-probe", "probe-trace"]);
  assert.deepEqual(mobjectConceptFamilyIds(index, "probe-point"), ["moving-probe"]);
  assert.deepEqual(mobjectFamilyMembersWithRenderData(index, "function-curve"), ["function-curve", "moving-probe", "probe-trace"]);
  assert.equal(index.byId["probe-trace"].depth, 2);
  assert.deepEqual(summary, {
    cycleCount: 0,
    familyMemberCount: 4,
    maxDepth: 2,
    orphanCount: 0,
    rootCount: 2
  });
  assert.deepEqual(mobjectFamilySummaryDataAttributes(summary), {
    "data-viz-mobject-family-cycle-count": "0",
    "data-viz-mobject-family-max-depth": "2",
    "data-viz-mobject-family-member-count": "4",
    "data-viz-mobject-family-orphan-count": "0",
    "data-viz-mobject-family-root-count": "2"
  });
});

test("keeps malformed parent links inspectable instead of corrupting family traversal", () => {
  const root = node("root");
  const child = node("child", "root");
  const orphan = node("orphan", "missing-parent");
  root.childIds = ["child"];

  const graph: MathObjectGraph = {
    byId: { child, orphan, root },
    rootIds: ["root", "child", "orphan"]
  };
  const index = buildMobjectFamilyIndex(graph);

  assert.deepEqual(index.topLevelIds, ["orphan", "root"]);
  assert.deepEqual(index.orphanIds, ["orphan"]);
  assert.deepEqual(mobjectFamilyIds(index, "root"), ["root", "child"]);
  assert.deepEqual(mobjectFamilyIds(index, "orphan"), ["orphan"]);
});

test("serializes Mobject family traversal evidence for browser QA without unsafe script characters", () => {
  const root = node("root<script>");
  const child = node("child", "root<script>");
  root.childIds = ["child"];
  const index = buildMobjectFamilyIndex(graph([root, child]));
  const json = serializeMobjectFamilyIndex(index);
  const parsed = JSON.parse(json) as typeof index;

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.sourceContract, MOBJECT_FAMILY_SOURCE_CONTRACT);
  assert.deepEqual(parsed.topLevelIds, ["root<script>"]);
  assert.deepEqual(parsed.byId["root<script>"].familyIds, ["root<script>", "child"]);
  assert.equal(serializeMobjectFamilyIndex(JSON.parse(JSON.stringify(index)) as typeof index), json);
});

test("plans a cold Mobject family-cache miss when no previous family index exists", () => {
  const root = node("root");
  const child = node("child", "root");
  root.childIds = ["child"];
  const nextGraph = graph([root, child]);
  const plan = buildMobjectFamilyCachePlan({ nextGraph });

  assert.equal(plan.cacheStatus, "cold-miss");
  assert.equal(plan.familyCacheReusable, false);
  assert.equal(plan.reusedFamilyCount, 0);
  assert.equal(plan.recomputedFamilyCount, 2);
  assert.deepEqual(plan.recomputedFamilyIds, ["child", "root"]);
  assert.equal(summarizeMobjectFamilyCachePlan(plan), "status=cold-miss;reusable=false;familyDirty=2;dataDirty=0;reused=0;recomputed=2");
});

test("reuses cached Mobject family traversal when only render data changes", () => {
  const root = node("root");
  const child = node("child", "root");
  root.childIds = ["child"];
  const previousGraph = graph([root, child]);
  const previousIndex = buildMobjectFamilyIndex(previousGraph);
  const changedRenderState: RuntimeRenderState = {
    kind: "polyline",
    points: [
      [0, 0, 0],
      [1, 1, 0]
    ]
  };
  const nextRoot = node("root", undefined);
  const nextChild = node("child", "root");
  nextRoot.childIds = ["child"];
  nextChild.renderState = changedRenderState;
  const nextGraph = graph([nextRoot, nextChild]);
  const plan = buildMobjectFamilyCachePlan({ nextGraph, previousGraph, previousIndex });

  assert.equal(plan.cacheStatus, "cache-hit");
  assert.equal(plan.familyCacheReusable, true);
  assert.equal(plan.familyDirtyCount, 0);
  assert.equal(plan.dataDirtyCount, 1);
  assert.deepEqual(plan.reusedFamilyIds, ["child", "root"]);
  assert.deepEqual(plan.recomputedFamilyIds, []);
  assert.equal(summarizeMobjectFamilyCachePlan(plan), "status=cache-hit;reusable=true;familyDirty=0;dataDirty=1;reused=2;recomputed=0");
});

test("forces Mobject family-cache recompute when family topology changes", () => {
  const root = node("root");
  const child = node("child", "root");
  root.childIds = ["child"];
  const previousGraph = graph([root, child]);
  const previousIndex = buildMobjectFamilyIndex(previousGraph);
  const nextRoot = node("root");
  const nextChild = node("child", "root");
  const trace = node("trace", "child");
  nextRoot.childIds = ["child"];
  nextChild.childIds = ["trace"];
  const nextGraph = graph([nextRoot, nextChild, trace]);
  const plan = buildMobjectFamilyCachePlan({ nextGraph, previousGraph, previousIndex });

  assert.equal(plan.cacheStatus, "family-dirty");
  assert.equal(plan.familyCacheReusable, false);
  assert.equal(plan.familyDirtyCount, 2);
  assert.deepEqual(plan.recomputedFamilyIds, ["child", "root", "trace"]);
  assert.deepEqual(plan.reusedFamilyIds, []);
  assert.equal(summarizeMobjectFamilyCachePlan(plan), "status=family-dirty;reusable=false;familyDirty=2;dataDirty=0;reused=0;recomputed=3");
});

test("recomputes only the dirty Mobject family branch while reusing unchanged siblings", () => {
  const previousA = node("a");
  const previousAChild = node("a-child", "a");
  const previousB = node("b");
  const previousBChild = node("b-child", "b");
  previousA.childIds = ["a-child"];
  previousB.childIds = ["b-child"];
  const previousGraph = graph([previousA, previousAChild, previousB, previousBChild]);
  const previousIndex = buildMobjectFamilyIndex(previousGraph);

  const nextA = node("a");
  const nextAChild = node("a-child", "a");
  const nextTrace = node("trace", "a-child");
  const nextB = node("b");
  const nextBChild = node("b-child", "b");
  nextA.childIds = ["a-child"];
  nextAChild.childIds = ["trace"];
  nextB.childIds = ["b-child"];
  const nextGraph = graph([nextA, nextAChild, nextTrace, nextB, nextBChild]);
  const plan = buildMobjectFamilyCachePlan({ nextGraph, previousGraph, previousIndex });

  assert.equal(plan.cacheStatus, "family-dirty");
  assert.equal(plan.familyCacheReusable, false);
  assert.equal(plan.familyDirtyCount, 2);
  assert.deepEqual(plan.recomputedFamilyIds, ["a", "a-child", "trace"]);
  assert.deepEqual(plan.reusedFamilyIds, ["b", "b-child"]);
  assert.equal(summarizeMobjectFamilyCachePlan(plan), "status=family-dirty;reusable=false;familyDirty=2;dataDirty=0;reused=2;recomputed=3");
});

test("serializes Mobject family-cache evidence for browser QA without unsafe script characters", () => {
  const plan: MobjectFamilyCachePlan = {
    cacheStatus: "family-dirty",
    dataDirtyCount: 1,
    familyCacheReusable: false,
    familyDirtyCount: 1,
    recomputedFamilyCount: 1,
    recomputedFamilyIds: ["curve<script>"],
    reusedFamilyCount: 0,
    reusedFamilyIds: [],
    sourceContract: MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT
  };
  const json = serializeMobjectFamilyCachePlan(plan);
  const parsed = JSON.parse(json) as MobjectFamilyCachePlan;

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.sourceContract, MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT);
  assert.deepEqual(parsed.recomputedFamilyIds, ["curve<script>"]);
  assert.equal(parsed.cacheStatus, "family-dirty");
  assert.equal(serializeMobjectFamilyCachePlan(JSON.parse(JSON.stringify(plan)) as typeof plan), json);
});

test("exposes Mobject family-cache diagnostics as stable browser data attributes", () => {
  const plan: MobjectFamilyCachePlan = {
    cacheStatus: "family-dirty",
    dataDirtyCount: 2,
    familyCacheReusable: false,
    familyDirtyCount: 1,
    recomputedFamilyCount: 3,
    recomputedFamilyIds: ["curve", "point", "trace"],
    reusedFamilyCount: 0,
    reusedFamilyIds: [],
    sourceContract: MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT
  };

  assert.deepEqual(mobjectFamilyCacheDataAttributes(plan), {
    "data-viz-mobject-family-cache-data-dirty-count": "2",
    "data-viz-mobject-family-cache-family-dirty-count": "1",
    "data-viz-mobject-family-cache-recomputed-count": "3",
    "data-viz-mobject-family-cache-recomputed-ids": "curve,point,trace",
    "data-viz-mobject-family-cache-reusable": "false",
    "data-viz-mobject-family-cache-reused-count": "0",
    "data-viz-mobject-family-cache-reused-ids": "none",
    "data-viz-mobject-family-cache-source-contract": MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT,
    "data-viz-mobject-family-cache-status": "family-dirty",
    "data-viz-mobject-family-cache-summary": "status=family-dirty;reusable=false;familyDirty=1;dataDirty=2;reused=0;recomputed=3"
  });
});

test("MathMobjectFamily stays pure and does not import renderer modules", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectFamily.ts", "utf8");
  const cacheSource = fs.readFileSync("components/visualizations/three/manim/mathMobjectFamilyCache.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /MOBJECT_FAMILY_SOURCE_CONTRACT/);
  assert.match(source, /serializeMobjectFamilyIndex/);
  assert.match(source, /stableSerialize/);
  assert.match(cacheSource, /MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT/);
  assert.match(cacheSource, /buildMobjectFamilyCachePlan/);
  assert.match(cacheSource, /mobjectFamilyCacheDataAttributes/);
  assert.match(cacheSource, /serializeMobjectFamilyCachePlan/);
  assert.match(cacheSource, /summarizeMobjectFamilyCachePlan/);
  assert.match(cacheSource, /stableSerialize/);
  assert.doesNotMatch(cacheSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
