import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMobjectAlignToLayoutPlan,
  buildMobjectArrangeLayoutPlan,
  buildMobjectNextToLayoutPlan,
  buildMobjectToCornerLayoutPlan,
  buildMobjectToEdgeLayoutPlan,
  MOBJECT_LAYOUT_SOURCE_CONTRACT,
  mobjectLayoutDataAttributes,
  serializeMobjectLayoutPlan,
  summarizeMobjectLayoutPlan
} from "./mathMobjectLayout";
import type { MathObjectGraph, RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";

function node(id: string, min: Vec3, max: Vec3): RuntimeMathObjectNode {
  const center: Vec3 = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2
  ];

  return {
    boundingBox: { center, kind: "finite", max, min },
    childIds: [],
    colorRole: "function",
    conceptId: `${id}-concept`,
    id,
    renderState: { from: min, kind: "vector", to: max },
    spec: { colorRole: "function", conceptId: `${id}-concept`, from: min, id, to: max, type: "vector" },
    type: "vector"
  };
}

function graph(): MathObjectGraph {
  return {
    byId: {
      a: node("a", [0, 0, 0], [1, 1, 0]),
      b: node("b", [0, 0, 0], [2, 0, 0]),
      c: node("c", [0, 0, 0], [0.5, 1, 0])
    },
    rootIds: ["a", "b", "c"]
  };
}

function familyGraph(): MathObjectGraph {
  return {
    byId: {
      parent: {
        boundingBox: { kind: "empty" },
        childIds: ["child"],
        colorRole: "function",
        conceptId: "parent-concept",
        id: "parent",
        renderState: { kind: "empty" },
        spec: { type: "axis3d", id: "parent", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }, conceptId: "parent-concept" },
        type: "axis3d"
      },
      child: {
        boundingBox: { kind: "empty" },
        childIds: [],
        colorRole: "function",
        conceptId: "child-concept",
        id: "child",
        parentId: "parent",
        renderState: { kind: "polyline", points: [[0, 0, 0], [2, 1, 0]] },
        spec: { type: "parametricCurve", id: "child", samples: [], colorRole: "function", conceptId: "child-concept" },
        type: "parametricCurve"
      },
      solo: node("solo", [0, 0, 0], [1, 1, 0])
    },
    rootIds: ["parent", "solo"]
  };
}

function rounded(points: Vec3[]) {
  return points.map((point) => point.map((value) => Number(value.toFixed(3))));
}

test("arranges Mobjects by critical-point spacing like Manim Mobject.arrange", () => {
  const plan = buildMobjectArrangeLayoutPlan(graph(), ["a", "b", "c"], {
    buff: 0.25,
    center: false,
    direction: [1, 0, 0]
  });

  assert.equal(plan.layoutKind, "arrange");
  assert.equal(plan.objectCount, 3);
  assert.equal(plan.sourceContract, MOBJECT_LAYOUT_SOURCE_CONTRACT);
  assert.equal(plan.missingObjectCount, 0);
  assert.deepEqual(plan.objectIds, ["a", "b", "c"]);
  assert.deepEqual(rounded(plan.rows.map((row) => row.targetCenter)), [
    [0.5, 0.5, 0],
    [2.25, 0.5, 0],
    [3.75, 0.5, 0]
  ]);
  assert.deepEqual(rounded(plan.rows.map((row) => row.delta)), [
    [0, 0, 0],
    [1.25, 0.5, 0],
    [3.5, 0, 0]
  ]);
  assert.equal(
    summarizeMobjectLayoutPlan(plan),
    "mobject-layout:arrange:objects=3:missing=0:buff=0.250:center=false:direction=1.000,0.000,0.000"
  );
});

test("arranges parent Mobjects by descendant get_all_points family bounds", () => {
  const plan = buildMobjectArrangeLayoutPlan(familyGraph(), ["parent", "solo"], {
    buff: 0.25,
    center: false,
    direction: [1, 0, 0]
  });

  assert.match(MOBJECT_LAYOUT_SOURCE_CONTRACT, /get_all_points/);
  assert.deepEqual(plan.rows[0].sourceCenter, [1, 0.5, 0]);
  assert.deepEqual(plan.rows[0].sourceMax, [2, 1, 0]);
  assert.deepEqual(plan.rows[0].sourceMin, [0, 0, 0]);
  assert.deepEqual(plan.rows[1].delta, [2.25, 0, 0]);
  assert.deepEqual(plan.rows[1].targetCenter, [2.75, 0.5, 0]);
  assert.deepEqual(plan.groupBoundingBox, {
    center: [1.625, 0.5, 0],
    kind: "finite",
    max: [3.25, 1, 0],
    min: [0, 0, 0]
  });
});

test("recenters arranged groups around the origin when center is enabled", () => {
  const plan = buildMobjectArrangeLayoutPlan(graph(), ["a", "b", "c"], {
    buff: 0.25,
    center: true,
    direction: [1, 0, 0]
  });

  assert.deepEqual(plan.groupCenterBeforeCentering, [2, 0.5, 0]);
  assert.deepEqual(plan.centeringDelta, [-2, -0.5, 0]);
  assert.deepEqual(rounded(plan.rows.map((row) => row.targetCenter)), [
    [-1.5, 0, 0],
    [0.25, 0, 0],
    [1.75, 0, 0]
  ]);
  assert.deepEqual(plan.groupBoundingBox, {
    center: [0, 0, 0],
    kind: "finite",
    max: [2, 0.5, 0],
    min: [-2, -0.5, 0]
  });
});

test("records missing objects without poisoning finite layout rows", () => {
  const plan = buildMobjectArrangeLayoutPlan(graph(), ["a", "missing", "c"], {
    buff: 0.1,
    center: false,
    direction: [0, 1, 0]
  });

  assert.deepEqual(plan.objectIds, ["a", "c"]);
  assert.deepEqual(plan.missingObjectIds, ["missing"]);
  assert.equal(plan.missingObjectCount, 1);
  assert.equal(plan.rows.length, 2);
  assert.ok(plan.rows.every((row) => row.targetCenter.every(Number.isFinite)));
});

test("aligns one Mobject edge to another Mobject edge like Manim Mobject.align_to", () => {
  const plan = buildMobjectAlignToLayoutPlan(graph(), {
    direction: [1, 0, 0],
    objectId: "a",
    targetObjectId: "b"
  });

  assert.equal(plan.layoutKind, "alignTo");
  assert.equal(plan.objectCount, 1);
  assert.equal(plan.missingObjectCount, 0);
  assert.deepEqual(plan.objectIds, ["a"]);
  assert.equal(plan.alignTargetId, "b");
  assert.deepEqual(plan.direction, [1, 0, 0]);
  assert.deepEqual(plan.alignedAxes, "x");
  assert.deepEqual(plan.rows[0].sourceCenter, [0.5, 0.5, 0]);
  assert.deepEqual(plan.rows[0].targetCenter, [1.5, 0.5, 0]);
  assert.deepEqual(plan.rows[0].delta, [1, 0, 0]);
  assert.deepEqual(plan.groupBoundingBox, {
    center: [1.5, 0.5, 0],
    kind: "finite",
    max: [2, 1, 0],
    min: [1, 0, 0]
  });
  assert.equal(
    summarizeMobjectLayoutPlan(plan),
    "mobject-layout:alignTo:objects=1:missing=0:buff=0.000:center=false:direction=1.000,0.000,0.000"
  );
});

test("aligns to an explicit point across multiple axes and records missing alignment targets", () => {
  const aligned = buildMobjectAlignToLayoutPlan(graph(), {
    direction: [1, 1, 0],
    objectId: "a",
    targetPoint: [4, 3, 0]
  });

  assert.equal(aligned.alignTargetId, "point");
  assert.equal(aligned.alignedAxes, "x,y");
  assert.deepEqual(aligned.rows[0].delta, [3, 2, 0]);
  assert.deepEqual(aligned.rows[0].targetCenter, [3.5, 2.5, 0]);
  assert.deepEqual(aligned.rows[0].targetMax, [4, 3, 0]);

  const missing = buildMobjectAlignToLayoutPlan(graph(), {
    direction: [0, -1, 0],
    objectId: "missing-source",
    targetObjectId: "missing-target"
  });

  assert.equal(missing.objectCount, 0);
  assert.equal(missing.missingObjectCount, 2);
  assert.deepEqual(missing.missingObjectIds, ["missing-source", "missing-target"]);
  assert.equal(missing.alignTargetId, "missing-target");
  assert.equal(missing.alignedAxes, "y");
  assert.equal(missing.rows.length, 0);
});

test("places one Mobject next to another Mobject critical point like Manim Mobject.next_to", () => {
  const plan = buildMobjectNextToLayoutPlan(graph(), {
    buff: 0.25,
    direction: [1, 0, 0],
    objectId: "a",
    targetObjectId: "b"
  });

  assert.equal(plan.layoutKind, "nextTo");
  assert.equal(plan.objectCount, 1);
  assert.equal(plan.missingObjectCount, 0);
  assert.equal(plan.nextTargetId, "b");
  assert.equal(plan.gap, 0.25);
  assert.deepEqual(plan.direction, [1, 0, 0]);
  assert.deepEqual(plan.rows[0].sourceCenter, [0.5, 0.5, 0]);
  assert.deepEqual(plan.rows[0].delta, [2.25, -0.5, 0]);
  assert.deepEqual(plan.rows[0].targetCenter, [2.75, 0, 0]);
  assert.deepEqual(plan.groupBoundingBox, {
    center: [2.75, 0, 0],
    kind: "finite",
    max: [3.25, 0.5, 0],
    min: [2.25, -0.5, 0]
  });
  assert.equal(
    summarizeMobjectLayoutPlan(plan),
    "mobject-layout:nextTo:objects=1:missing=0:buff=0.250:center=false:direction=1.000,0.000,0.000"
  );
});

test("normalizes diagonal next_to direction and records missing next_to targets", () => {
  const diagonal = buildMobjectNextToLayoutPlan(graph(), {
    buff: 0.5,
    direction: [1, 1, 0],
    objectId: "c",
    targetObjectId: "b"
  });

  assert.equal(diagonal.nextTargetId, "b");
  assert.deepEqual(rounded([diagonal.direction]), [[0.707, 0.707, 0]]);
  assert.deepEqual(rounded([diagonal.rows[0].delta]), [[2.354, 0.354, 0]]);
  assert.deepEqual(rounded([diagonal.rows[0].targetCenter]), [[2.604, 0.854, 0]]);

  const missing = buildMobjectNextToLayoutPlan(graph(), {
    direction: [-1, 0, 0],
    objectId: "missing-source",
    targetObjectId: "missing-target"
  });

  assert.equal(missing.objectCount, 0);
  assert.equal(missing.missingObjectCount, 2);
  assert.deepEqual(missing.missingObjectIds, ["missing-source", "missing-target"]);
  assert.equal(missing.nextTargetId, "missing-target");
  assert.equal(missing.rows.length, 0);
});

test("exposes deterministic Mobject layout data attributes and JSON payload", () => {
  const plan = buildMobjectArrangeLayoutPlan(graph(), ["a", "b", "c"], {
    buff: 0.25,
    center: true,
    direction: [1, 0, 0]
  });
  const attributes = mobjectLayoutDataAttributes(plan);

  assert.deepEqual(attributes, {
    "data-viz-mobject-layout-buff": "0.250",
    "data-viz-mobject-layout-centering-delta": "-2.000,-0.500,0.000",
    "data-viz-mobject-layout-direction": "1.000,0.000,0.000",
    "data-viz-mobject-layout-group-center": "0.000,0.000,0.000",
    "data-viz-mobject-layout-group-size": "4.000,1.000,0.000",
    "data-viz-mobject-layout-kind": "arrange",
    "data-viz-mobject-layout-missing-count": "0",
    "data-viz-mobject-layout-missing-ids": "none",
    "data-viz-mobject-layout-object-count": "3",
    "data-viz-mobject-layout-object-ids": "a,b,c",
    "data-viz-mobject-layout-signature": plan.signature,
    "data-viz-mobject-layout-source-contract": MOBJECT_LAYOUT_SOURCE_CONTRACT,
    "data-viz-mobject-layout-summary": "mobject-layout:arrange:objects=3:missing=0:buff=0.250:center=true:direction=1.000,0.000,0.000",
    "data-viz-mobject-layout-target-centers": "a=-1.500,0.000,0.000|b=0.250,0.000,0.000|c=1.750,0.000,0.000"
  });
  assert.match(plan.signature, /^mobject-layout-[0-9a-f]{8}$/);
  assert.match(serializeMobjectLayoutPlan(plan), /"layoutKind":"arrange"/);
});

test("exposes deterministic Mobject align_to data attributes and JSON payload", () => {
  const plan = buildMobjectAlignToLayoutPlan(graph(), {
    direction: [0, 1, 0],
    objectId: "b",
    targetObjectId: "a"
  });
  const attributes = mobjectLayoutDataAttributes(plan);

  assert.deepEqual(attributes, {
    "data-viz-mobject-layout-align-target-id": "a",
    "data-viz-mobject-layout-aligned-axes": "y",
    "data-viz-mobject-layout-buff": "0.000",
    "data-viz-mobject-layout-centering-delta": "0.000,0.000,0.000",
    "data-viz-mobject-layout-direction": "0.000,1.000,0.000",
    "data-viz-mobject-layout-group-center": "1.000,1.000,0.000",
    "data-viz-mobject-layout-group-size": "2.000,0.000,0.000",
    "data-viz-mobject-layout-kind": "alignTo",
    "data-viz-mobject-layout-missing-count": "0",
    "data-viz-mobject-layout-missing-ids": "none",
    "data-viz-mobject-layout-object-count": "1",
    "data-viz-mobject-layout-object-ids": "b",
    "data-viz-mobject-layout-signature": plan.signature,
    "data-viz-mobject-layout-source-contract": MOBJECT_LAYOUT_SOURCE_CONTRACT,
    "data-viz-mobject-layout-summary": "mobject-layout:alignTo:objects=1:missing=0:buff=0.000:center=false:direction=0.000,1.000,0.000",
    "data-viz-mobject-layout-target-centers": "b=1.000,1.000,0.000"
  });
  assert.match(plan.signature, /^mobject-layout-[0-9a-f]{8}$/);
  assert.match(serializeMobjectLayoutPlan(plan), /"layoutKind":"alignTo"/);
  assert.match(serializeMobjectLayoutPlan(plan), /"alignTargetId":"a"/);
});

test("exposes deterministic Mobject next_to data attributes and JSON payload", () => {
  const plan = buildMobjectNextToLayoutPlan(graph(), {
    buff: 0.25,
    direction: [1, 0, 0],
    objectId: "a",
    targetObjectId: "b"
  });
  const attributes = mobjectLayoutDataAttributes(plan);

  assert.deepEqual(attributes, {
    "data-viz-mobject-layout-buff": "0.250",
    "data-viz-mobject-layout-centering-delta": "0.000,0.000,0.000",
    "data-viz-mobject-layout-direction": "1.000,0.000,0.000",
    "data-viz-mobject-layout-group-center": "2.750,0.000,0.000",
    "data-viz-mobject-layout-group-size": "1.000,1.000,0.000",
    "data-viz-mobject-layout-kind": "nextTo",
    "data-viz-mobject-layout-missing-count": "0",
    "data-viz-mobject-layout-missing-ids": "none",
    "data-viz-mobject-layout-next-gap": "0.250",
    "data-viz-mobject-layout-next-target-id": "b",
    "data-viz-mobject-layout-object-count": "1",
    "data-viz-mobject-layout-object-ids": "a",
    "data-viz-mobject-layout-signature": plan.signature,
    "data-viz-mobject-layout-source-contract": MOBJECT_LAYOUT_SOURCE_CONTRACT,
    "data-viz-mobject-layout-summary": "mobject-layout:nextTo:objects=1:missing=0:buff=0.250:center=false:direction=1.000,0.000,0.000",
    "data-viz-mobject-layout-target-centers": "a=2.750,0.000,0.000"
  });
  assert.match(plan.signature, /^mobject-layout-[0-9a-f]{8}$/);
  assert.match(serializeMobjectLayoutPlan(plan), /"layoutKind":"nextTo"/);
  assert.match(serializeMobjectLayoutPlan(plan), /"nextTargetId":"b"/);
});

test("places a Mobject against a scene frame edge like Manim Mobject.to_edge", () => {
  const plan = buildMobjectToEdgeLayoutPlan(graph(), {
    buff: 0.5,
    direction: [0, 1, 0],
    frame: { max: [6, 6, 0], min: [-6, -6, 0] },
    objectId: "a"
  });

  assert.equal(plan.layoutKind, "toEdge");
  assert.equal(plan.objectCount, 1);
  assert.equal(plan.missingObjectCount, 0);
  assert.equal(plan.frameAnchor, "edge");
  assert.deepEqual(plan.direction, [0, 1, 0]);
  assert.deepEqual(plan.frameTargetPoint, [0, 5.5, 0]);
  assert.deepEqual(plan.rows[0].sourceCenter, [0.5, 0.5, 0]);
  assert.deepEqual(plan.rows[0].delta, [0, 4.5, 0]);
  assert.deepEqual(plan.rows[0].targetCenter, [0.5, 5, 0]);
  assert.deepEqual(plan.groupBoundingBox, {
    center: [0.5, 5, 0],
    kind: "finite",
    max: [1, 5.5, 0],
    min: [0, 4.5, 0]
  });
  assert.equal(
    summarizeMobjectLayoutPlan(plan),
    "mobject-layout:toEdge:objects=1:missing=0:buff=0.500:center=false:direction=0.000,1.000,0.000"
  );
});

test("places a Mobject against a scene frame corner like Manim Mobject.to_corner", () => {
  const plan = buildMobjectToCornerLayoutPlan(graph(), {
    buff: 0.5,
    direction: [1, 1, 0],
    frame: { max: [6, 6, 0], min: [-6, -6, 0] },
    objectId: "a"
  });

  assert.equal(plan.layoutKind, "toCorner");
  assert.equal(plan.objectCount, 1);
  assert.equal(plan.missingObjectCount, 0);
  assert.equal(plan.frameAnchor, "corner");
  assert.deepEqual(plan.direction, [1, 1, 0]);
  assert.deepEqual(plan.frameTargetPoint, [5.5, 5.5, 0]);
  assert.deepEqual(plan.rows[0].sourceCenter, [0.5, 0.5, 0]);
  assert.deepEqual(plan.rows[0].delta, [4.5, 4.5, 0]);
  assert.deepEqual(plan.rows[0].targetCenter, [5, 5, 0]);
  assert.deepEqual(plan.groupBoundingBox, {
    center: [5, 5, 0],
    kind: "finite",
    max: [5.5, 5.5, 0],
    min: [4.5, 4.5, 0]
  });

  const missing = buildMobjectToCornerLayoutPlan(graph(), {
    direction: [-1, -1, 0],
    frame: { max: [6, 6, 0], min: [-6, -6, 0] },
    objectId: "missing-source"
  });

  assert.equal(missing.objectCount, 0);
  assert.equal(missing.missingObjectCount, 1);
  assert.deepEqual(missing.missingObjectIds, ["missing-source"]);
  assert.equal(missing.rows.length, 0);
});

test("exposes deterministic Mobject frame layout data attributes and JSON payload", () => {
  const plan = buildMobjectToCornerLayoutPlan(graph(), {
    buff: 0.5,
    direction: [1, 1, 0],
    frame: { max: [6, 6, 0], min: [-6, -6, 0] },
    objectId: "a"
  });
  const attributes = mobjectLayoutDataAttributes(plan);

  assert.deepEqual(attributes, {
    "data-viz-mobject-layout-buff": "0.500",
    "data-viz-mobject-layout-centering-delta": "0.000,0.000,0.000",
    "data-viz-mobject-layout-direction": "1.000,1.000,0.000",
    "data-viz-mobject-layout-frame-anchor": "corner",
    "data-viz-mobject-layout-frame-bounds": "-6.000,-6.000,0.000..6.000,6.000,0.000",
    "data-viz-mobject-layout-frame-target": "5.500,5.500,0.000",
    "data-viz-mobject-layout-group-center": "5.000,5.000,0.000",
    "data-viz-mobject-layout-group-size": "1.000,1.000,0.000",
    "data-viz-mobject-layout-kind": "toCorner",
    "data-viz-mobject-layout-missing-count": "0",
    "data-viz-mobject-layout-missing-ids": "none",
    "data-viz-mobject-layout-object-count": "1",
    "data-viz-mobject-layout-object-ids": "a",
    "data-viz-mobject-layout-signature": plan.signature,
    "data-viz-mobject-layout-source-contract": MOBJECT_LAYOUT_SOURCE_CONTRACT,
    "data-viz-mobject-layout-summary": "mobject-layout:toCorner:objects=1:missing=0:buff=0.500:center=false:direction=1.000,1.000,0.000",
    "data-viz-mobject-layout-target-centers": "a=5.000,5.000,0.000"
  });
  assert.match(plan.signature, /^mobject-layout-[0-9a-f]{8}$/);
  assert.match(serializeMobjectLayoutPlan(plan), /"layoutKind":"toCorner"/);
  assert.match(serializeMobjectLayoutPlan(plan), /"frameTargetPoint":\[5\.5,5\.5,0\]/);
});

test("Mobject layout module stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectLayout.ts", "utf8");

  assert.match(source, /Mobject\.arrange/);
  assert.match(source, /Mobject\.align_to/);
  assert.match(source, /Mobject\.next_to/);
  assert.match(source, /Mobject\.to_edge/);
  assert.match(source, /Mobject\.to_corner/);
  assert.match(source, /MOBJECT_LAYOUT_SOURCE_CONTRACT/);
  assert.match(source, /critical point/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
