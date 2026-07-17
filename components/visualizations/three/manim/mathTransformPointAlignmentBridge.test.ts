import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildTransformFamilyAlignment } from "./mathTransformFamilyAlignment";
import type { MathObjectGraph, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";

function node({
  childIds = [],
  conceptId,
  id,
  parentId,
  renderState = { kind: "empty" },
  type = "vector"
}: {
  childIds?: string[];
  conceptId: string;
  id: string;
  parentId?: string;
  renderState?: RuntimeRenderState;
  type?: RuntimeMathObjectNode["type"];
}): RuntimeMathObjectNode {
  return {
    boundingBox: { kind: "empty" },
    childIds,
    conceptId,
    id,
    parentId,
    renderState,
    spec: {
      colorRole: "function",
      conceptId,
      from: [0, 0, 0],
      id,
      to: [1, 0, 0],
      type: "vector"
    },
    type
  };
}

const sourceGraph: MathObjectGraph = {
  byId: {
    "source-group": node({
      childIds: ["source-curve", "source-vector"],
      conceptId: "transform-family",
      id: "source-group",
      type: "axis3d"
    }),
    "source-curve": node({
      conceptId: "function-rule",
      id: "source-curve",
      parentId: "source-group",
      renderState: { kind: "polyline", points: [[0, 0, 0], [2, 0, 0]] },
      type: "parametricCurve"
    }),
    "source-vector": node({
      conceptId: "direction",
      id: "source-vector",
      parentId: "source-group",
      renderState: { kind: "vector", from: [0, 0, 0], to: [1, 0, 0] },
      type: "vector"
    })
  },
  rootIds: ["source-group"]
};

const targetGraph: MathObjectGraph = {
  byId: {
    "target-group": node({
      childIds: ["target-curve", "target-vector"],
      conceptId: "transform-family",
      id: "target-group",
      type: "axis3d"
    }),
    "target-curve": node({
      conceptId: "function-rule",
      id: "target-curve",
      parentId: "target-group",
      renderState: {
        kind: "polyline",
        points: [
          [0, 0, 0],
          [1, 1, 0],
          [2, 0, 0],
          [3, 1, 0]
        ]
      },
      type: "parametricCurve"
    }),
    "target-vector": node({
      conceptId: "direction",
      id: "target-vector",
      parentId: "target-group",
      renderState: { kind: "vector", from: [0, 0, 0], to: [2, 0, 0] },
      type: "vector"
    })
  },
  rootIds: ["target-group"]
};

function alignment() {
  return buildTransformFamilyAlignment(sourceGraph, "source-group", targetGraph, "target-group");
}

test("builds Manim-style point-count alignment rows for matched transform families", async () => {
  const {
    TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT,
    buildTransformPointAlignmentBridgePlan,
    summarizeTransformPointAlignmentBridgePlan
  } = await import("./mathTransformPointAlignmentBridge");

  const plan = buildTransformPointAlignmentBridgePlan(alignment());

  assert.equal(
    plan.sourceContract,
    "Mobject.align_data_and_family|align_points: align matched source/target render-data point counts before Transform.interpolate_mobject"
  );
  assert.equal(plan.sourceContract, TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.sourceRootId, "source-group");
  assert.equal(plan.targetRootId, "target-group");
  assert.equal(plan.matchedEntryCount, 3);
  assert.equal(plan.compatibleEntryCount, 3);
  assert.equal(plan.resampledEntryCount, 1);
  assert.equal(plan.totalAlignedPointCount, 6);
  assert.deepEqual(
    plan.rows.map((row) => [
      row.interpolationObjectId,
      row.sourceId,
      row.targetId,
      row.sourceKind,
      row.targetKind,
      row.sourcePointCount,
      row.targetPointCount,
      row.alignedPointCount,
      row.resampled
    ]),
    [
      ["source-group", "source-group", "target-group", "empty", "empty", 0, 0, 0, false],
      ["source-curve", "source-curve", "target-curve", "polyline", "polyline", 2, 4, 4, true],
      ["source-vector", "source-vector", "target-vector", "vector", "vector", 2, 2, 2, false]
    ]
  );
  const curveRow = plan.rows.find((row) => row.sourceId === "source-curve");
  assert.equal(curveRow?.alignmentPolicy, "vmobject-insert-n-curves");
  assert.equal(curveRow?.vmobjectAlignedCurveCount, 3);
  assert.equal(curveRow?.vmobjectSourceInsertNCurvesCount, 2);
  assert.equal(curveRow?.vmobjectTargetInsertNCurvesCount, 0);
  assert.match(curveRow?.vmobjectSourceContract ?? "", /VMobject\.insert_n_curves/);
  assert.equal(
    curveRow?.sourceAlignedPointPreview,
    "0.000,0.000,0.000|0.667,0.000,0.000|1.333,0.000,0.000|2.000,0.000,0.000"
  );
  assert.equal(
    curveRow?.targetAlignedPointPreview,
    "0.000,0.000,0.000|1.000,1.000,0.000|2.000,0.000,0.000|3.000,1.000,0.000"
  );
  assert.equal(
    curveRow?.alignedPointSignature,
    "source-curve->target-curve:aligned=4:source=0.000,0.000,0.000..2.000,0.000,0.000:target=0.000,0.000,0.000..3.000,1.000,0.000"
  );
  assert.equal(plan.summary, summarizeTransformPointAlignmentBridgePlan(plan));
  assert.equal(
    plan.summary,
    "transform-point-align:source=source-group:target=target-group:matched=3:compatible=3:resampled=1:points=6"
  );
});

test("serializes transform point alignment bridge evidence into stable QA attributes", async () => {
  const {
    buildTransformPointAlignmentBridgePlan,
    serializeTransformPointAlignmentBridgePlan,
    transformPointAlignmentBridgeDataAttributes
  } = await import("./mathTransformPointAlignmentBridge");

  const plan = buildTransformPointAlignmentBridgePlan(alignment());
  const attributes = transformPointAlignmentBridgeDataAttributes(plan);
  const serialized = serializeTransformPointAlignmentBridgePlan(plan);

  assert.equal(attributes["data-viz-manim-transform-point-alignment-source-root-id"], "source-group");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-target-root-id"], "target-group");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-matched-count"], "3");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-compatible-count"], "3");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-resampled-count"], "1");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-total-point-count"], "6");
  assert.equal(
    attributes["data-viz-manim-transform-point-alignment-policy-summary"],
    "direct-point-array=1;none=1;vmobject-insert-n-curves=1"
  );
  assert.equal(attributes["data-viz-manim-transform-point-alignment-vmobject-aligned-curve-count"], "3");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-vmobject-source-insert-n-curves-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-point-alignment-vmobject-target-insert-n-curves-count"], "0");
  assert.match(
    attributes["data-viz-manim-transform-point-alignment-vmobject-source-contract"],
    /VMobject\.insert_n_curves/
  );
  assert.equal(
    attributes["data-viz-manim-transform-point-alignment-row-summary"],
    "source-group->target-group:empty->empty:0->0=0;source-curve->target-curve:polyline->polyline:2->4=4;source-vector->target-vector:vector->vector:2->2=2"
  );
  assert.equal(attributes["data-viz-manim-transform-point-alignment-source-contract"], plan.sourceContract);
  assert.equal(attributes["data-viz-manim-transform-point-alignment-summary"], plan.summary);
  assert.match(serialized, /"interpolationObjectId":"source-curve"/);
  assert.match(serialized, /"alignmentPolicy":"vmobject-insert-n-curves"/);
  assert.match(serialized, /"vmobjectSourceInsertNCurvesCount":2/);
  assert.match(serialized, /"alignedPointSignature":"source-curve->target-curve:aligned=4/);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
});

test("documents the point-alignment bridge as pure transform-family evidence", () => {
  const source = fs.readFileSync(
    "components/visualizations/three/manim/mathTransformPointAlignmentBridge.ts",
    "utf8"
  );

  assert.match(source, /TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(source, /pointsForRuntimeRenderState/);
  assert.match(source, /alignSmoothVMobjectPathsForMorph/);
  assert.match(source, /VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
