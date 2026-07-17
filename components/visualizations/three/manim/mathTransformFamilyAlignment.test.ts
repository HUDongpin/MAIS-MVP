import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildTransformFamilyAlignment,
  TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
  TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT,
  serializeTransformFamilyAlignmentPlan,
  summarizeTransformFamilyAlignment,
  transformFamilyAlignmentDataAttributes
} from "./mathTransformFamilyAlignment";
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
      childIds: ["source-curve", "source-probe"],
      conceptId: "quadratic-family",
      id: "source-group",
      type: "axis3d"
    }),
    "source-curve": node({
      conceptId: "function-rule",
      id: "source-curve",
      parentId: "source-group",
      renderState: { kind: "polyline", points: [[0, 0, 0], [1, 1, 0]] },
      type: "parametricCurve"
    }),
    "source-probe": node({
      conceptId: "probe-point",
      id: "source-probe",
      parentId: "source-group",
      renderState: { kind: "point", position: [0, 0, 0] },
      type: "movingPoint"
    })
  },
  rootIds: ["source-group"]
};

const targetGraph: MathObjectGraph = {
  byId: {
    "target-group": node({
      childIds: ["target-curve", "target-tangent"],
      conceptId: "quadratic-family",
      id: "target-group",
      type: "axis3d"
    }),
    "target-curve": node({
      conceptId: "function-rule",
      id: "target-curve",
      parentId: "target-group",
      renderState: { kind: "polyline", points: [[0, 0, 0], [1, 2, 0]] },
      type: "parametricCurve"
    }),
    "target-tangent": node({
      conceptId: "tangent-line",
      id: "target-tangent",
      parentId: "target-group",
      renderState: { kind: "vector", from: [0, 0, 0], to: [1, 1, 0] },
      type: "vector"
    })
  },
  rootIds: ["target-group"]
};

test("aligns transform families by concept and type while preserving source object identity", () => {
  const alignment = buildTransformFamilyAlignment(sourceGraph, "source-group", targetGraph, "target-group");
  const summary = summarizeTransformFamilyAlignment(alignment);

  assert.equal(alignment.sourceRootId, "source-group");
  assert.equal(alignment.targetRootId, "target-group");
  assert.equal(alignment.entries.length, 4);
  assert.deepEqual(
    alignment.entries.map((entry) => [entry.kind, entry.sourceId, entry.targetId, entry.interpolationObjectId]),
    [
      ["matched", "source-group", "target-group", "source-group"],
      ["matched", "source-curve", "target-curve", "source-curve"],
      ["exiting", "source-probe", undefined, "source-probe"],
      ["entering", undefined, "target-tangent", "target-tangent"]
    ]
  );
  assert.equal(summary.matchedCount, 2);
  assert.equal(summary.enteringCount, 1);
  assert.equal(summary.exitingCount, 1);
  assert.equal(summary.typeMismatchCount, 0);
  assert.equal(summary.maxDepth, 1);
});

test("maps transform family alignment to source-grounded browser QA attributes", () => {
  const alignment = buildTransformFamilyAlignment(sourceGraph, "source-group", targetGraph, "target-group");
  const summary = summarizeTransformFamilyAlignment(alignment);
  const serialized = serializeTransformFamilyAlignmentPlan(alignment);

  assert.deepEqual(transformFamilyAlignmentDataAttributes(alignment), {
    "data-viz-manim-transform-family-alignment-entering-count": "1",
    "data-viz-manim-transform-family-alignment-entry-count": "4",
    "data-viz-manim-transform-family-alignment-exiting-count": "1",
    "data-viz-manim-transform-family-alignment-family-pair-sequence": "source-group->target-group|source-curve->target-curve",
    "data-viz-manim-transform-family-alignment-family-zip-complete-count": "4",
    "data-viz-manim-transform-family-alignment-family-zip-incomplete-count": "0",
    "data-viz-manim-transform-family-alignment-family-zip-policy": TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    "data-viz-manim-transform-family-alignment-family-zip-sequence":
      "source-group|source-group|target-group;source-curve|source-curve|target-curve;source-probe|source-probe|ghost-target:source-probe;target-tangent|ghost-source:target-tangent|target-tangent",
    "data-viz-manim-transform-family-alignment-family-zip-tuple-count": "4",
    "data-viz-manim-transform-family-alignment-matched-count": "2",
    "data-viz-manim-transform-family-alignment-max-depth": "1",
    "data-viz-manim-transform-family-alignment-point-count-policy": "align-point-counts-before-interpolate",
    "data-viz-manim-transform-family-alignment-source-contract": TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT,
    "data-viz-manim-transform-family-alignment-source-root-id": "source-group",
    "data-viz-manim-transform-family-alignment-summary": "transform-family-align:source=source-group:target=target-group:entries=4:matched=2:entering=1:exiting=1:typeMismatch=0:maxDepth=1",
    "data-viz-manim-transform-family-alignment-target-root-id": "target-group",
    "data-viz-manim-transform-family-alignment-type-mismatch-count": "0"
  });
  assert.deepEqual(summary, {
    enteringCount: 1,
    exitingCount: 1,
    matchedCount: 2,
    maxDepth: 1,
    typeMismatchCount: 0
  });
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), alignment);
  assert.equal(
    TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT,
    "Transform.begin -> Mobject.align_data_and_family -> Transform.get_all_families_zipped(mobject, starting_mobject, target_copy) before interpolate_mobject"
  );
});

test("keeps type mismatches inspectable instead of silently pairing incompatible render data", () => {
  const source: MathObjectGraph = {
    byId: {
      source: node({
        conceptId: "orientation",
        id: "source",
        renderState: { kind: "vector", from: [0, 0, 0], to: [1, 0, 0] },
        type: "vector"
      })
    },
    rootIds: ["source"]
  };
  const target: MathObjectGraph = {
    byId: {
      target: node({
        conceptId: "orientation",
        id: "target",
        renderState: { kind: "polyline", points: [[0, 0, 0], [1, 1, 0]] },
        type: "parametricCurve"
      })
    },
    rootIds: ["target"]
  };
  const alignment = buildTransformFamilyAlignment(source, "source", target, "target");

  assert.equal(alignment.entries.length, 1);
  assert.equal(alignment.entries[0].kind, "typeMismatch");
  assert.equal(alignment.entries[0].sourceType, "vector");
  assert.equal(alignment.entries[0].targetType, "parametricCurve");
  assert.equal(summarizeTransformFamilyAlignment(alignment).typeMismatchCount, 1);
});

test("alignment reports missing roots as enter/exit entries without throwing", () => {
  const missingTarget = buildTransformFamilyAlignment(sourceGraph, "source-probe", targetGraph, "missing-target");
  const missingSource = buildTransformFamilyAlignment(sourceGraph, "missing-source", targetGraph, "target-tangent");

  assert.deepEqual(missingTarget.entries.map((entry) => entry.kind), ["exiting"]);
  assert.equal(missingTarget.entries[0].sourceId, "source-probe");
  assert.deepEqual(missingSource.entries.map((entry) => entry.kind), ["entering"]);
  assert.equal(missingSource.entries[0].targetId, "target-tangent");
});

test("TransformFamilyAlignment stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathTransformFamilyAlignment.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT/);
  assert.match(source, /TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY/);
  assert.match(source, /get_all_families_zipped/);
  assert.match(source, /serializeTransformFamilyAlignmentPlan/);
});
