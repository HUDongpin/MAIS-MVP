import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT,
  buildMobjectBoundingBoxTable,
  mobjectBoundingBoxDataAttributes,
  serializeMobjectBoundingBoxTable,
  summarizeMobjectBoundingBoxTable
} from "./mathMobjectBoundingBox";
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
      colorRole: "function",
      conceptId: "function-rule",
      id: "curve",
      parentId: "axes",
      renderState: { kind: "polyline", points: [[0, 0, 0], [1, 1, 0]] },
      spec: { type: "parametricCurve", id: "curve", samples: [], colorRole: "function", conceptId: "function-rule" },
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
    }
  },
  rootIds: ["axes", "probe"]
};

test("builds a deterministic Manim-style Mobject bounding-box table", () => {
  const table = buildMobjectBoundingBoxTable(objectGraph);

  assert.equal(table.rowCount, 3);
  assert.equal(table.finiteCount, 3);
  assert.equal(table.emptyCount, 0);
  assert.equal(table.objectIds, "axes,curve,probe");
  assert.equal(table.sourceContract, MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT);
  assert.match(MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT, /get_bounding_box/);
  assert.match(MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT, /get_all_points/);
  assert.match(MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT, /_needs_new_bounding_box/);
  assert.match(table.signature, /^mobject-bounds-[0-9a-f]{8}$/);
  assert.deepEqual(table.rows.map((row) => row.objectId), ["axes", "curve", "probe"]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "curve")?.size, [1, 1, 0]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "probe")?.size, [0, 0, 0]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "axes")?.center, [0, 0, 0]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "axes")?.min, [-1, -1, -1]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "axes")?.max, [1, 1, 1]);
  assert.deepEqual(table.rows.find((row) => row.objectId === "axes")?.size, [2, 2, 2]);
  assert.equal(
    summarizeMobjectBoundingBoxTable(table),
    "mobject-bounds:rows=3:finite=3:empty=0:ids=axes,curve,probe"
  );
});

test("serializes Mobject bounding boxes with stable JSON and signatures", () => {
  const table = buildMobjectBoundingBoxTable(objectGraph);
  const serialized = serializeMobjectBoundingBoxTable(table);
  const parsed = JSON.parse(serialized) as typeof table;

  assert.equal(serializeMobjectBoundingBoxTable(JSON.parse(JSON.stringify(table)) as typeof table), serialized);
  assert.equal(parsed.signature, table.signature);
  assert.equal(parsed.objectIds, "axes,curve,probe");
  assert.deepEqual(parsed.rows.find((row) => row.objectId === "curve")?.min, [0, 0, 0]);
  assert.deepEqual(parsed.rows.find((row) => row.objectId === "curve")?.max, [1, 1, 0]);
});

test("computes parent Mobject bounding boxes from descendant get_all_points data", () => {
  const table = buildMobjectBoundingBoxTable({
    byId: {
      parent: {
        boundingBox: { kind: "empty" },
        childIds: ["child"],
        conceptId: "family-parent",
        id: "parent",
        renderState: { kind: "empty" },
        spec: { type: "axis3d", id: "parent", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] } },
        type: "axis3d"
      },
      child: {
        boundingBox: { kind: "empty" },
        childIds: [],
        conceptId: "family-child",
        id: "child",
        parentId: "parent",
        renderState: { kind: "polyline", points: [[-2, 1, 0], [3, 4, 0]] },
        spec: { type: "parametricCurve", id: "child", samples: [], colorRole: "function", conceptId: "family-child" },
        type: "parametricCurve"
      }
    },
    rootIds: ["parent"]
  });

  const parentRow = table.rows.find((row) => row.objectId === "parent");

  assert.equal(parentRow?.finite, true);
  assert.deepEqual(parentRow?.min, [-2, 1, 0]);
  assert.deepEqual(parentRow?.max, [3, 4, 0]);
  assert.deepEqual(parentRow?.center, [0.5, 2.5, 0]);
  assert.deepEqual(parentRow?.size, [5, 3, 0]);
});

test("maps Mobject bounding boxes to browser QA data attributes", () => {
  const table = buildMobjectBoundingBoxTable(objectGraph);

  assert.deepEqual(mobjectBoundingBoxDataAttributes(table), {
    "data-viz-mobject-bounding-box-count": "3",
    "data-viz-mobject-bounding-box-empty-count": "0",
    "data-viz-mobject-bounding-box-finite-count": "3",
    "data-viz-mobject-bounding-box-object-ids": "axes,curve,probe",
    "data-viz-mobject-bounding-box-signature": table.signature,
    "data-viz-mobject-bounding-box-source-contract": MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT,
    "data-viz-mobject-bounding-box-summary": "mobject-bounds:rows=3:finite=3:empty=0:ids=axes,curve,probe"
  });
});

test("Mobject bounding boxes stay pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectBoundingBox.ts", "utf8");

  assert.match(source, /buildMobjectBoundingBoxTable/);
  assert.match(source, /MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT/);
  assert.match(source, /serializeMobjectBoundingBoxTable/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
