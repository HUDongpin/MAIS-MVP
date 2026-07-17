import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MOBJECT_POINT_CLOUD_SOURCE_CONTRACT,
  buildMobjectPointCloudTable,
  mobjectPointCloudDataAttributes,
  serializeMobjectPointCloudTable,
  summarizeMobjectPointCloudTable
} from "./mathMobjectPointCloud";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { stepMathSceneFrame } from "./mathSceneFrameStepper";

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

function runtimeObjectGraph() {
  assert.ok(functionGraphSpec);
  return stepMathSceneFrame(functionGraphSpec, {
    deltaSeconds: 0,
    elapsedSeconds: 3.2,
    frameIndex: 0
  }).runtimeState.objectGraph;
}

test("builds Manim-style family_members_with_points and get_all_points rows", () => {
  const table = buildMobjectPointCloudTable(runtimeObjectGraph());

  assert.equal(table.sourceContract, MOBJECT_POINT_CLOUD_SOURCE_CONTRACT);
  assert.match(MOBJECT_POINT_CLOUD_SOURCE_CONTRACT, /family_members_with_points/);
  assert.match(MOBJECT_POINT_CLOUD_SOURCE_CONTRACT, /get_all_points/);
  assert.equal(table.familyCount, 2);
  assert.equal(table.familyWithPointsCount, 2);
  assert.equal(table.objectWithPointsCount, 4);
  assert.equal(table.emptyFamilyCount, 0);
  assert.equal(table.familyIds, "axes,function-curve");
  assert.equal(table.rows[0].rootId, "axes");
  assert.deepEqual(table.rows[0].memberIdsWithPoints, ["axes"]);
  assert.equal(table.rows[0].pointCount, 6);
  assert.equal(table.rows[1].rootId, "function-curve");
  assert.deepEqual(table.rows[1].memberIdsWithPoints, ["function-curve", "moving-probe", "probe-trace"]);
  assert.ok(table.rows[1].pointCount > table.rows[0].pointCount);
  assert.equal(table.rows[1].allPoints.length, table.rows[1].pointCount);
  assert.match(table.signature, /^mobject-points-[0-9a-f]{8}$/);
  assert.equal(
    summarizeMobjectPointCloudTable(table),
    `mobject-points:families=2:withPoints=2:objectsWithPoints=4:points=${table.pointCount}:ids=axes,function-curve`
  );
});

test("serializes a stable escaped family point-cloud payload", () => {
  const firstTable = buildMobjectPointCloudTable(runtimeObjectGraph());
  const secondTable = buildMobjectPointCloudTable(JSON.parse(JSON.stringify(runtimeObjectGraph())));
  const serialized = serializeMobjectPointCloudTable(firstTable);

  assert.equal(firstTable.signature, secondTable.signature);
  assert.equal(serialized, serializeMobjectPointCloudTable(secondTable));
  assert.doesNotMatch(serialized, /</);
  assert.match(serialized, /"rootId":"function-curve"/);
  assert.match(serialized, /"memberIdsWithPoints":\["function-curve","moving-probe","probe-trace"\]/);
});

test("emits browser data attributes for family point-cloud QA", () => {
  const attributes = mobjectPointCloudDataAttributes(buildMobjectPointCloudTable(runtimeObjectGraph()));

  assert.deepEqual(attributes, {
    "data-viz-mobject-point-cloud-empty-family-count": "0",
    "data-viz-mobject-point-cloud-family-count": "2",
    "data-viz-mobject-point-cloud-family-ids": "axes,function-curve",
    "data-viz-mobject-point-cloud-family-with-points-count": "2",
    "data-viz-mobject-point-cloud-object-with-points-count": "4",
    "data-viz-mobject-point-cloud-point-count": attributes["data-viz-mobject-point-cloud-point-count"],
    "data-viz-mobject-point-cloud-signature": attributes["data-viz-mobject-point-cloud-signature"],
    "data-viz-mobject-point-cloud-source-contract": MOBJECT_POINT_CLOUD_SOURCE_CONTRACT,
    "data-viz-mobject-point-cloud-summary": attributes["data-viz-mobject-point-cloud-summary"]
  });
  assert.match(attributes["data-viz-mobject-point-cloud-signature"], /^mobject-points-[0-9a-f]{8}$/);
  assert.match(attributes["data-viz-mobject-point-cloud-summary"], /^mobject-points:families=2:withPoints=2/);
});

test("Mobject point-cloud extraction stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectPointCloud.ts", "utf8");

  assert.match(source, /buildMobjectFamilyIndex/);
  assert.match(source, /MOBJECT_POINT_CLOUD_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
