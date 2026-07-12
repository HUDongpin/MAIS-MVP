import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
  TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
  TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT,
  buildTransformPathFunctionCatalog,
  pathAlongArc,
  transformPathFunctionCatalogDataAttributes,
  resolveTransformPathFunction,
  serializeTransformPathFunctionCatalog,
  straightPath,
  summarizeTransformPathFunctionCatalog,
  summarizeTransformPathSpec
} from "./mathPathFunctions";
import {
  buildMathObjectTransformPlan,
  interpolateMathObjectTransform
} from "./mathObjectTransform";
import type { MathObjectSpec, Vec3 } from "./mathSceneTypes";

function roundedVec3(point: Vec3): Vec3 {
  return point.map((value) => {
    const rounded = Number(value.toFixed(6));
    return Object.is(rounded, -0) ? 0 : rounded;
  }) as Vec3;
}

test("straightPath clamps progress and sanitizes non-finite input", () => {
  assert.deepEqual(straightPath([0, 0, 0], [2, 4, 6], 0.25), [0.5, 1, 1.5]);
  assert.deepEqual(straightPath([0, 0, 0], [2, 4, 6], 2), [2, 4, 6]);
  assert.deepEqual(straightPath([Number.NaN, 1, 2], [2, Number.POSITIVE_INFINITY, 8], 0.5), [1, 0.5, 5]);
});

test("pathAlongArc follows a signed circular arc in the xy plane", () => {
  const quarterArc = pathAlongArc(Math.PI / 2);

  assert.deepEqual(roundedVec3(quarterArc([1, 0, 0], [0, 1, 0], 0)), [1, 0, 0]);
  assert.deepEqual(roundedVec3(quarterArc([1, 0, 0], [0, 1, 0], 0.5)), [0.707107, 0.707107, 0]);
  assert.deepEqual(roundedVec3(quarterArc([1, 0, 0], [0, 1, 0], 1)), [0, 1, 0]);
});

test("pathAlongArc falls back to straight interpolation for degenerate arcs", () => {
  const zeroArc = pathAlongArc(0);
  const samePointArc = pathAlongArc(Math.PI / 2);

  assert.deepEqual(zeroArc([0, 0, 0], [2, 0, 0], 0.5), [1, 0, 0]);
  assert.deepEqual(samePointArc([1, 1, 1], [1, 1, 1], 0.5), [1, 1, 1]);
});

test("resolves transform path specs for object-level transforms", () => {
  const source: MathObjectSpec = {
    type: "vector",
    id: "source-vector",
    conceptId: "rotation-path",
    colorRole: "parameter",
    from: [1, 0, 0],
    to: [2, 0, 0]
  };
  const target: MathObjectSpec = {
    type: "vector",
    id: "target-vector",
    conceptId: "rotation-path",
    colorRole: "parameter",
    from: [0, 1, 0],
    to: [0, 2, 0]
  };

  const pathFunction = resolveTransformPathFunction({ type: "arc", angleRadians: Math.PI / 2 });
  const frame = interpolateMathObjectTransform(
    buildMathObjectTransformPlan(source, target, { pathFunction }),
    0.5
  );

  assert.equal(frame.renderState.kind, "vector");
  if (frame.renderState.kind !== "vector") throw new Error("expected vector frame");
  assert.deepEqual(roundedVec3(frame.renderState.from), [0.707107, 0.707107, 0]);
  assert.deepEqual(roundedVec3(frame.renderState.to), [1.414214, 1.414214, 0]);
  assert.equal(summarizeTransformPathSpec({ type: "arc", angleRadians: Math.PI / 2 }), "arc(1.5708rad,z+)");
  assert.equal(summarizeTransformPathSpec({ type: "straight" }), "straight");
});

test("summarizes authored transform path-function intent for browser QA", () => {
  const catalog = buildTransformPathFunctionCatalog({
    plans: [
      { id: "curve-shift", objectId: "curve", targetObjectId: "curve-target" },
      {
        id: "vector-arc",
        objectId: "vector",
        path: { type: "arc", angleRadians: Math.PI / 2, axis: [0, 0, 1] },
        targetObjectId: "vector-target"
      },
      {
        id: "label-straight",
        objectId: "label",
        path: { type: "straight" },
        targetObjectId: "label-target"
      }
    ],
    sceneId: "path-function-test"
  });
  const attributes = transformPathFunctionCatalogDataAttributes(catalog);
  const serialized = serializeTransformPathFunctionCatalog(catalog);

  assert.equal(catalog.animationPlanCount, 3);
  assert.equal(catalog.authoredPathCount, 2);
  assert.equal(catalog.arcPathCount, 1);
  assert.equal(catalog.straightPathCount, 2);
  assert.equal(catalog.arcAngleRange, "1.5708..1.5708rad");
  assert.equal(catalog.arcAxisSummary, "vector=0.000,0.000,1.000");
  assert.equal(catalog.degenerateArcCount, 0);
  assert.equal(catalog.objectIds, "curve,vector,label");
  assert.equal(catalog.pathSummaries, "straight,arc(1.5708rad,z+),straight");
  assert.equal(
    summarizeTransformPathFunctionCatalog(catalog),
    "transformPaths:path-function-test:plans=3:authored=2:arc=1:straight=2:objects=curve,vector,label:paths=straight,arc(1.5708rad,z+),straight"
  );
  assert.equal(attributes["data-viz-manim-transform-path-plan-count"], "3");
  assert.equal(attributes["data-viz-manim-transform-path-authored-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-path-arc-count"], "1");
  assert.equal(attributes["data-viz-manim-transform-path-arc-angle-range"], "1.5708..1.5708rad");
  assert.equal(attributes["data-viz-manim-transform-path-arc-axis-summary"], "vector=0.000,0.000,1.000");
  assert.equal(attributes["data-viz-manim-transform-path-degenerate-arc-count"], "0");
  assert.equal(attributes["data-viz-manim-transform-path-straight-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-path-object-ids"], "curve,vector,label");
  assert.equal(attributes["data-viz-manim-transform-path-pointlike-field-policy"], TRANSFORM_PATH_POINTLIKE_FIELD_POLICY);
  assert.equal(attributes["data-viz-manim-transform-path-summaries"], "straight,arc(1.5708rad,z+),straight");
  assert.equal(attributes["data-viz-manim-transform-path-non-point-field-policy"], TRANSFORM_PATH_NON_POINT_FIELD_POLICY);
  assert.equal(attributes["data-viz-manim-transform-path-source-contract"], TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-transform-path-summary"], catalog.summary);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), catalog);
});

test("samples authored transform path functions at the midpoint for browser QA", () => {
  const catalog = buildTransformPathFunctionCatalog({
    plans: [
      {
        id: "vector-arc",
        objectId: "vector",
        path: { type: "arc", angleRadians: Math.PI / 2, axis: [0, 0, 1] },
        sampleFrom: [1, 0, 0],
        sampleTo: [0, 1, 0],
        targetObjectId: "vector-target"
      },
      {
        id: "label-straight",
        objectId: "label",
        path: { type: "straight" },
        sampleFrom: [0, 0, 0],
        sampleTo: [2, 0, 0],
        targetObjectId: "label-target"
      }
    ],
    sceneId: "sampled-path-test"
  });
  const attributes = transformPathFunctionCatalogDataAttributes(catalog);

  assert.equal(catalog.sampleAlpha, 0.5);
  assert.equal(catalog.sampledPathCount, 2);
  assert.equal(catalog.sampledMidpointSummary, "vector=0.707,0.707,0.000;label=1.000,0.000,0.000");
  assert.equal(catalog.midpointDeviationSummary, "vector=0.2929;label=0.0000");
  assert.equal(catalog.arcMidpointDeviationRange, "0.2929..0.2929");
  assert.equal(attributes["data-viz-manim-transform-path-sample-alpha"], "0.500");
  assert.equal(attributes["data-viz-manim-transform-path-sampled-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-path-sampled-midpoints"], catalog.sampledMidpointSummary);
  assert.equal(attributes["data-viz-manim-transform-path-midpoint-deviation-summary"], catalog.midpointDeviationSummary);
  assert.equal(attributes["data-viz-manim-transform-path-arc-midpoint-deviation-range"], "0.2929..0.2929");
});

test("reports degenerate authored arc paths before renderer interpolation", () => {
  const catalog = buildTransformPathFunctionCatalog({
    plans: [
      {
        id: "zero-arc",
        objectId: "probe",
        path: { type: "arc", angleRadians: 0, axis: [0, 0, 1] },
        targetObjectId: "probe-target"
      },
      {
        id: "bad-arc",
        objectId: "label",
        path: { type: "arc", angleRadians: Number.NaN, axis: [0, 0, -1] },
        targetObjectId: "label-target"
      }
    ],
    sceneId: "degenerate-path-test"
  });

  assert.equal(catalog.arcPathCount, 2);
  assert.equal(catalog.arcAngleRange, "0.0000..0.0000rad");
  assert.equal(catalog.arcAxisSummary, "probe=0.000,0.000,1.000;label=0.000,0.000,-1.000");
  assert.equal(catalog.degenerateArcCount, 2);
});

test("MAIS Manim source contract keeps path functions pure and imported by transforms", () => {
  const pathSource = fs.readFileSync("components/visualizations/three/manim/mathPathFunctions.ts", "utf8");
  const transformSource = fs.readFileSync("components/visualizations/three/manim/mathObjectTransform.ts", "utf8");

  assert.match(pathSource, /straightPath/);
  assert.match(pathSource, /pathAlongArc/);
  assert.match(pathSource, /resolveTransformPathFunction/);
  assert.match(pathSource, /TRANSFORM_PATH_POINTLIKE_FIELD_POLICY/);
  assert.match(pathSource, /TRANSFORM_PATH_NON_POINT_FIELD_POLICY/);
  assert.match(pathSource, /TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT/);
  assert.match(pathSource, /serializeTransformPathFunctionCatalog/);
  assert.equal(TRANSFORM_PATH_POINTLIKE_FIELD_POLICY, "pointlike-fields-use-path-function");
  assert.equal(TRANSFORM_PATH_NON_POINT_FIELD_POLICY, "non-point-data-linear-blend");
  assert.equal(
    TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT,
    "Mobject.interpolate(start,target,alpha,path_func): pointlike fields follow path functions while non-point data blends linearly"
  );
  assert.match(transformSource, /mathPathFunctions/);
  assert.doesNotMatch(pathSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
