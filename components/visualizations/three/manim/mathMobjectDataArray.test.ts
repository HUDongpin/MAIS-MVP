import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MOBJECT_DATA_ARRAY_SOURCE_CONTRACT,
  buildMobjectDataTable,
  mobjectDataTableDataAttributes,
  serializeMobjectDataTable,
  summarizeMobjectDataTable
} from "./mathMobjectDataArray";
import type { MathObjectGraph } from "./mathSceneRuntimeState";

const objectGraph: MathObjectGraph = {
  byId: {
    axes: {
      boundingBox: { kind: "empty" },
      childIds: ["curve"],
      conceptId: "coordinate-frame",
      id: "axes",
      renderState: {
        kind: "axes",
        xAxisPoints: [[-1, 0, 0], [1, 0, 0]],
        yAxisPoints: [[0, -1, 0], [0, 1, 0]],
        zAxisPoints: [[0, 0, -1], [0, 0, 1]]
      },
      spec: { type: "axis3d", id: "axes", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }, conceptId: "coordinate-frame" },
      type: "axis3d"
    },
    curve: {
      boundingBox: { kind: "finite", center: [0.5, 0.5, 0], max: [1, 1, 0], min: [0, 0, 0] },
      childIds: [],
      colorRole: "attention",
      conceptId: "function-rule",
      id: "curve",
      parentId: "axes",
      renderState: {
        kind: "polyline",
        points: [
          [0, 0, 0],
          [1, 1, 0],
          [Number.NaN, 0, 0]
        ],
        style: {
          antiAliasWidth: 1,
          baseNormal: [0, 0, 1],
          fillOpacity: 0.2,
          fillRole: "area",
          jointAngleDegrees: 0,
          strokeZoomBehavior: "screen-space",
          strokeOpacity: 0.5,
          strokeRole: "attention",
          strokeWidth: 4
        }
      },
      spec: { type: "parametricCurve", id: "curve", samples: [], colorRole: "attention", conceptId: "function-rule" },
      type: "parametricCurve"
    },
    probe: {
      boundingBox: { kind: "finite", center: [2, 3, 0], max: [2, 3, 0], min: [2, 3, 0] },
      childIds: [],
      colorRole: "probe",
      conceptId: "current-point",
      id: "probe",
      renderState: { kind: "point", position: [2, 3, 0] },
      spec: { type: "movingPoint", id: "probe", pathObjectId: "curve", colorRole: "probe", conceptId: "current-point" },
      type: "movingPoint"
    },
    vector: {
      boundingBox: { kind: "finite", center: [0, 0.5, 0], max: [0, 1, 0], min: [0, 0, 0] },
      childIds: [],
      colorRole: "vector",
      conceptId: "direction",
      id: "vector",
      renderState: {
        from: [0, 0, 0],
        kind: "vector",
        style: {
          antiAliasWidth: 1,
          baseNormal: [0, 0, 1],
          fillOpacity: 0,
          fillRole: "reference",
          jointAngleDegrees: 0,
          strokeZoomBehavior: "screen-space",
          strokeOpacity: 1,
          strokeRole: "vector",
          strokeWidth: 5
        },
        to: [0, 1, 0]
      },
      spec: { type: "vector", id: "vector", from: [0, 0, 0], to: [0, 1, 0], colorRole: "vector", conceptId: "direction" },
      type: "vector"
    }
  },
  rootIds: ["axes", "probe", "vector"]
};

test("builds a deterministic Manim-style data table from runtime Mobjects", () => {
  const table = buildMobjectDataTable(objectGraph);

  assert.equal(table.rowCount, 4);
  assert.equal(table.sourceContract, MOBJECT_DATA_ARRAY_SOURCE_CONTRACT);
  assert.match(MOBJECT_DATA_ARRAY_SOURCE_CONTRACT, /Mobject\.data/);
  assert.match(MOBJECT_DATA_ARRAY_SOURCE_CONTRACT, /point/);
  assert.match(MOBJECT_DATA_ARRAY_SOURCE_CONTRACT, /rgba/);
  assert.equal(table.pointCount, 12);
  assert.equal(table.finitePointCount, 11);
  assert.equal(table.rgbaCount, 12);
  assert.match(table.signature, /^mobject-data-[0-9a-f]{8}$/);
  assert.equal(table.objectIds, "axes,curve,probe,vector");
  assert.equal(table.semanticRoleCount, 4);
  assert.deepEqual(table.rows.map((row) => row.objectId), ["axes", "curve", "probe", "vector"]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "curve")?.points[2], [0, 0, 0]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "curve")?.rgba[0], [1, 0.28, 0.44, 0.5]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "probe")?.rgba[0], [0.98, 0.76, 0.17, 1]);
  assert.equal(summarizeMobjectDataTable(table), "mobject-data:rows=4:points=12:finite=11:rgba=12:roles=attention,probe,reference,vector");
});

test("serializes Manim-style point and rgba data arrays with a stable signature", () => {
  const table = buildMobjectDataTable(objectGraph);
  const serialized = serializeMobjectDataTable(table);
  const parsed = JSON.parse(serialized) as typeof table;

  assert.equal(serializeMobjectDataTable(JSON.parse(JSON.stringify(table)) as typeof table), serialized);
  assert.equal(parsed.signature, table.signature);
  assert.equal(parsed.objectIds, "axes,curve,probe,vector");
  assert.deepEqual(parsed.rows.find((row) => row.objectId === "curve")?.points[2], [0, 0, 0]);
  assert.deepEqual(parsed.rows.find((row) => row.objectId === "curve")?.rgba[0], [1, 0.28, 0.44, 0.5]);
});

test("combines VMobject stroke opacity with Mobject uniform opacity in rgba data", () => {
  const graph: MathObjectGraph = {
    byId: {
      curve: {
        boundingBox: { kind: "finite", center: [0.5, 0, 0], max: [1, 0, 0], min: [0, 0, 0] },
        childIds: [],
        colorRole: "attention",
        conceptId: "transparent-curve",
        id: "curve",
        renderState: {
          kind: "polyline",
          points: [[0, 0, 0], [1, 0, 0]],
          style: {
            antiAliasWidth: 1,
            baseNormal: [0, 0, 1],
            fillOpacity: 0,
            fillRole: "reference",
            jointAngleDegrees: 0,
            strokeZoomBehavior: "screen-space",
            strokeOpacity: 0.4,
            strokeRole: "attention",
            strokeWidth: 4
          }
        },
        spec: { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 0, 0]], colorRole: "attention", conceptId: "transparent-curve" },
        type: "parametricCurve",
        uniforms: {
          clippingPlanes: [],
          fixedInFrame: false,
          opacity: 0.5,
          shadeIn3D: false
        }
      },
      probe: {
        boundingBox: { kind: "finite", center: [0, 1, 0], max: [0, 1, 0], min: [0, 1, 0] },
        childIds: [],
        colorRole: "probe",
        conceptId: "transparent-probe",
        id: "probe",
        renderState: { kind: "point", position: [0, 1, 0] },
        spec: { type: "movingPoint", id: "probe", pathObjectId: "curve", colorRole: "probe", conceptId: "transparent-probe" },
        type: "movingPoint",
        uniforms: {
          clippingPlanes: [],
          fixedInFrame: false,
          opacity: 0.25,
          shadeIn3D: false
        }
      }
    },
    rootIds: ["curve", "probe"]
  };

  const table = buildMobjectDataTable(graph);

  assert.deepEqual(table.rows.find((row) => row.objectId === "curve")?.rgba[0], [1, 0.28, 0.44, 0.2]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "probe")?.rgba[0], [0.98, 0.76, 0.17, 0.25]);
});

test("exposes Mobject data-table counts as stable browser QA data attributes", () => {
  const table = buildMobjectDataTable(objectGraph);

  assert.deepEqual(mobjectDataTableDataAttributes(table), {
    "data-viz-mobject-data-array-finite-point-count": "11",
    "data-viz-mobject-data-array-object-ids": "axes,curve,probe,vector",
    "data-viz-mobject-data-array-point-count": "12",
    "data-viz-mobject-data-array-rgba-count": "12",
    "data-viz-mobject-data-array-role-count": "4",
    "data-viz-mobject-data-array-row-count": "4",
    "data-viz-mobject-data-array-signature": table.signature,
    "data-viz-mobject-data-array-source-contract": MOBJECT_DATA_ARRAY_SOURCE_CONTRACT,
    "data-viz-mobject-data-array-summary": "mobject-data:rows=4:points=12:finite=11:rgba=12:roles=attention,probe,reference,vector"
  });
});

test("Mobject data arrays stay pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectDataArray.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildMobjectDataTable/);
  assert.match(source, /MOBJECT_DATA_ARRAY_SOURCE_CONTRACT/);
  assert.match(source, /mobjectDataTableDataAttributes/);
  assert.match(source, /serializeMobjectDataTable/);
});
