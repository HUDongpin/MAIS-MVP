import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { cube } from "../../lib/math-kernel/bodies";
import {
  ellipseNumeric,
  toConicRenderSpec,
} from "../../lib/math-kernel/conics/numeric";
import type { GeometrySolutionDto } from "../../lib/math-kernel/geometry/solutionTypes";
import type {
  ExactValueDto,
  KernelResult,
} from "../../lib/math-kernel/shared/types";
import type { AnalyticRangeSolutionDto } from "../../lib/math-kernel/analytic/types";
import {
  toMathSceneSpec,
  type MathKernelSceneInput,
} from "./three/manim/mathKernelSceneAdapter";
import {
  buildAnalyticKernelDemoScene,
  buildGeometryKernelDemoScene,
  MATH_KERNEL_DEMO_TEACHING,
} from "./three/manim/mathKernelDemoScenes";

function unwrap<T>(result: KernelResult<T>): T {
  if (result.ok) return result.value;
  throw new Error(`${result.error.code}: ${result.error.message}`);
}

function exact(
  mathJson: ExactValueDto["mathJson"],
  latex: string,
  approx: number | null,
): ExactValueDto {
  return {
    schemaVersion: 1,
    mathJson,
    latex,
    decimal: approx === null ? null : String(approx),
    approx,
  };
}

const teaching = {
  titleKey: "visualization.mathKernel.demo",
  explanationKeys: ["visualization.mathKernel.explain"],
  locale: "zh-CN" as const,
};

test("body topology becomes stable edge curves with one math-to-world transform", () => {
  const topology = unwrap(cube());
  const positions = {
    A: [0, 0, 0],
    B: [2, 0, 0],
    C: [2, 2, 0],
    D: [0, 2, 0],
    A1: [0, 0, 3],
    B1: [2, 0, 3],
    C1: [2, 2, 3],
    D1: [0, 2, 3],
  } as const;
  const before = JSON.stringify(positions);
  const formula = exact(["Power", "a", 3], "a^{3}", null);
  const scene = unwrap(toMathSceneSpec({
    kind: "body",
    model: topology,
    vertexPositions: positions,
    formula,
    teaching,
  }));

  const curves = scene.objects.filter((object) => object.type === "parametricCurve");
  assert.equal(curves.length, 12);
  assert.deepEqual(curves[0].samples, [[0, 0, 0], [2, 0, 0]]);
  assert.deepEqual(curves[1].samples, [[2, 0, 0], [2, 0, 2]]);
  assert.deepEqual(
    curves.find((curve) => curve.id === "body-edge-8")?.samples,
    [[0, 0, 0], [0, 3, 0]],
  );
  assert.equal(scene.formulas[0].latex, formula.latex);
  assert.equal(scene.familyId, "three-space-vectors-lines-planes");
  assert.equal(JSON.stringify(positions), before);
  assert.deepEqual(
    unwrap(toMathSceneSpec({
      kind: "body",
      model: topology,
      vertexPositions: positions,
      formula,
      teaching,
    })),
    scene,
  );
});

test("conic samples stay on the front XY plane and preserve exact equation LaTeX", () => {
  const ellipse = unwrap(ellipseNumeric({ a: 2, b: 1 }));
  const render = unwrap(toConicRenderSpec(ellipse, { sampleCount: 9 }));
  const equation = exact(
    ["Equal", ["Add", ["Divide", ["Square", "x"], 4], ["Square", "y"]], 1],
    "\\frac{x^2}{4}+y^2=1",
    null,
  );
  const scene = unwrap(toMathSceneSpec({
    kind: "conic",
    model: render,
    equation,
    teaching: { ...teaching, locale: "en" },
  }));

  const curve = scene.objects.find((object) => object.type === "parametricCurve");
  assert.ok(curve && curve.type === "parametricCurve");
  assert.equal(curve.samples.length, 9);
  assert.equal(curve.samples.every((point) => point[2] === 0), true);
  assert.deepEqual(curve.samples[0], [2, 0, 0]);
  assert.equal(scene.objects.some((object) => object.type === "movingPoint"), true);
  assert.equal(scene.formulas[0].latex, equation.latex);
  assert.equal(scene.familyId, "three-conic-sections-deep");
});

test("geometry solutions consume already-transformed renderPoints without swapping axes again", () => {
  const solution: GeometrySolutionDto = {
    schemaVersion: 1,
    answer: exact(["Divide", 1, 3], "\\frac{1}{3}", 1 / 3),
    points: {
      A: [exact(0, "0", 0), exact(0, "0", 0), exact(0, "0", 0)],
      B: [exact(0, "0", 0), exact(0, "0", 0), exact(0, "0", 0)],
    },
    renderPoints: { A: [1, 2, 3], B: [4, 5, 6] },
    intermediates: [],
    provenance: {
      kernel: "geometry",
      operation: "cubeLinePlaneAngle",
      sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
    },
  };
  const scene = unwrap(toMathSceneSpec({
    kind: "geometry",
    model: solution,
    topology: { vertices: ["A", "B"], edges: [{ a: "A", b: "B" }] },
    vectors: [{ id: "direction", from: "A", to: "B", conceptId: "direction" }],
    teaching: { ...teaching, locale: "zh-HK" },
  }));

  const edge = scene.objects.find((object) => object.id === "geometry-edge-0");
  assert.ok(edge && edge.type === "parametricCurve");
  assert.deepEqual(edge.samples, [[1, 2, 3], [4, 5, 6]]);
  const vector = scene.objects.find((object) => object.id === "geometry-vector-direction");
  assert.ok(vector && vector.type === "vector");
  assert.deepEqual(vector.from, [1, 2, 3]);
  assert.deepEqual(vector.to, [4, 5, 6]);
  assert.equal(scene.formulas[0].latex, solution.answer.latex);
});

test("analytic range scenes preserve authoritative interval LaTeX and explicit render companions", () => {
  const ellipse = unwrap(ellipseNumeric({ a: 2, b: 1 }));
  const conic = unwrap(toConicRenderSpec(ellipse, { sampleCount: 7 }));
  const lower = exact(3, "3", 3);
  const upper = exact(4, "4", 4);
  const solution: AnalyticRangeSolutionDto = {
    schemaVersion: 1,
    metric: "chord-length",
    expression: exact("L", "L", null),
    interval: {
      lower: { kind: "finite", value: lower, closed: true, witnesses: [] },
      upper: { kind: "finite", value: upper, closed: true, witnesses: [] },
    },
    intervalLatex: "[3,\\ 4]",
    domain: {
      parameter: "m",
      parameterMeaning: "inverse-slope",
      discriminantConstraint: "D>0",
      denominatorExclusions: [],
      projectiveEndpoint: {
        line: "horizontal",
        included: true,
        hasRealGeometryWitness: true,
        note: "projective endpoint",
      },
    },
    proof: {
      profile: "centered-axis-aligned-even-rational-v1",
      checkedCriticalPoints: true,
      checkedDomainBoundaries: true,
      checkedPoles: true,
      checkedPositiveInfinity: true,
      checkedNegativeInfinity: true,
      exactNotSampled: true,
    },
    intermediates: [],
    provenance: {
      kernel: "analytic",
      operation: "rangeOverLineFamily",
      sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
    },
  };
  const scene = unwrap(toMathSceneSpec({
    kind: "analytic",
    model: solution,
    render: {
      conic,
      segments: [{ id: "focal-chord", from: [-2, 0], to: [2, 0] }],
    },
    teaching,
  }));

  assert.equal(scene.formulas[0].latex, solution.intervalLatex);
  const segment = scene.objects.find((object) => object.id === "analytic-segment-focal-chord");
  assert.ok(segment && segment.type === "parametricCurve");
  assert.deepEqual(segment.samples, [[-2, 0, 0], [2, 0, 0]]);
});

test("adapter fails closed for incomplete coordinates and non-finite render data", () => {
  const topology = unwrap(cube());
  const incomplete: MathKernelSceneInput = {
    kind: "body",
    model: topology,
    vertexPositions: { A: [0, 0, 0] },
    formula: exact(1, "1", 1),
    teaching,
  };
  const missing = toMathSceneSpec(incomplete);
  assert.equal(missing.ok, false);

  const invalidConic = toMathSceneSpec({
    kind: "conic",
    model: {
      kind: "ellipse",
      sampleCount: 3,
      parameterRange: [0, 1],
      branches: [{
        id: "curve",
        closed: true,
        points: [[0, 0], [Number.NaN, 1], [1, 0]],
      }],
    },
    equation: exact(1, "1", 1),
    teaching,
  });
  assert.equal(invalidConic.ok, false);
  if (!invalidConic.ok) assert.equal(invalidConic.error.code, "NON_FINITE_INPUT");
});

test("adapter is client-safe and never recomputes formulas", () => {
  for (const file of [
    "mathKernelSceneAdapter.ts",
    "mathKernelDemoScenes.ts",
  ]) {
    const source = fs.readFileSync(
      `components/visualizations/three/manim/${file}`,
      "utf8",
    );
    assert.doesNotMatch(source, /\.server(?:["'])|compute-engine|server-only/);
    assert.doesNotMatch(source, /\beval\s*\(|new\s+Function|from\s+["']three|from\s+["']react/);
    assert.doesNotMatch(source, /toEquationLatex|linePlaneAngle|rangeOverLineFamily/);
  }
});

test("demo wrappers consume one kernel result safely in all three locales", () => {
  assert.deepEqual(Object.keys(MATH_KERNEL_DEMO_TEACHING), ["en", "zh-CN", "zh-HK"]);
  const geometry: GeometrySolutionDto = {
    schemaVersion: 1,
    answer: exact(["Sqrt", 3], "\\sqrt{3}", Math.sqrt(3)),
    points: {},
    renderPoints: { A: [0, 0, 0], B: [1, 1, 1] },
    intermediates: [],
    provenance: {
      kernel: "geometry",
      operation: "cubeLinePlaneAngle",
      sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
    },
  };
  const analytic: AnalyticRangeSolutionDto = {
    schemaVersion: 1,
    metric: "chord-length",
    expression: exact("L", "L", null),
    interval: {
      lower: { kind: "finite", value: exact(3, "3", 3), closed: true, witnesses: [] },
      upper: { kind: "finite", value: exact(4, "4", 4), closed: true, witnesses: [] },
    },
    intervalLatex: "[3,\\ 4]",
    domain: {
      parameter: "m",
      parameterMeaning: "inverse-slope",
      discriminantConstraint: "D>0",
      denominatorExclusions: [],
      projectiveEndpoint: {
        line: "horizontal",
        included: true,
        hasRealGeometryWitness: true,
        note: "projective endpoint",
      },
    },
    proof: {
      profile: "centered-axis-aligned-even-rational-v1",
      checkedCriticalPoints: true,
      checkedDomainBoundaries: true,
      checkedPoles: true,
      checkedPositiveInfinity: true,
      checkedNegativeInfinity: true,
      exactNotSampled: true,
    },
    intermediates: [],
    provenance: {
      kernel: "analytic",
      operation: "rangeOverLineFamily",
      sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
    },
  };
  const ellipse = unwrap(ellipseNumeric({ a: 2, b: 1 }));
  const conic = unwrap(toConicRenderSpec(ellipse, { sampleCount: 5 }));

  for (const locale of ["en", "zh-CN", "zh-HK"] as const) {
    const geometryScene = unwrap(buildGeometryKernelDemoScene({
      solution: geometry,
      topology: { vertices: ["A", "B"], edges: [{ a: "A", b: "B" }] },
      locale,
    }));
    const analyticScene = unwrap(buildAnalyticKernelDemoScene({
      solution: analytic,
      conic,
      segments: [{ id: "witness", from: [-2, 0], to: [2, 0] }],
      locale,
    }));
    assert.equal(geometryScene.formulas[0].latex, geometry.answer.latex);
    assert.equal(analyticScene.formulas[0].latex, analytic.intervalLatex);
    assert.equal(geometryScene.sceneId.endsWith(locale), true);
    assert.equal(analyticScene.sceneId.endsWith(locale), true);
  }
});
