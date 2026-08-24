import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAnalyticKernelDemoScene,
  buildGeometryKernelDemoScene,
} from "../../../components/visualizations/three/manim/mathKernelDemoScenes";
import { buildFormulaLayerState } from "../../../components/visualizations/three/manim/mathFormulaLayer";
import { buildMathSceneTeachingQualityEvidence } from "../../../components/visualizations/three/manim/mathSceneTeachingQuality";
import { buildTexColorizedFormula } from "../../../components/visualizations/three/manim/mathTexColorizedFormula";
import type { MathSceneSpec } from "../../../components/visualizations/three/manim/mathSceneTypes";
import {
  buildMathKernelDemoPayload,
  exactDemoIntersectionForSlopeQuarter,
} from "./mathKernelDemo.server";

function assertAllFormulaTokensColorized(scene: MathSceneSpec): void {
  const layer = buildFormulaLayerState(scene);
  for (const formula of layer.formulas) {
    const colorized = buildTexColorizedFormula(formula);
    assert.equal(colorized.coloredTokenCount, formula.tokens.length);
    assert.equal(colorized.uncoloredTokenCount, 0);
    assert.deepEqual(colorized.uncoloredTokenIds, []);
  }
}

test("the server demo payload is JSON safe and derives both scenes from exact DTOs", () => {
  const payload = buildMathKernelDemoPayload();
  assert.equal(payload.ok, true);
  if (!payload.ok) return;
  assert.deepEqual(JSON.parse(JSON.stringify(payload.value)), payload.value);
  assert.equal(payload.value.geometry.solution.answer.mathJson !== null, true);
  assert.equal(payload.value.geometry.renderEdgeLength, 2);
  assert.equal(payload.value.analytic.solution.intervalLatex, "[3,\\ 4]");
  assert.equal(payload.value.analytic.initialSlopeQuarter, 0);
  assert.equal(payload.value.analytic.exactIntersection.kind, "secant");

  const cached = buildMathKernelDemoPayload();
  assert.equal(cached.ok, true);
  if (cached.ok) assert.equal(cached.value, payload.value);
});

test("the real server payload produces honest formula bindings in every locale", () => {
  const payload = buildMathKernelDemoPayload();
  assert.equal(payload.ok, true);
  if (!payload.ok) return;
  const exact = payload.value.analytic.exactIntersection;
  const points = exact.points.map((point) => point.map((coordinate) => coordinate.approx));
  assert.equal(points.flat().every((coordinate) => typeof coordinate === "number"), true);
  const chordLengthSquared = exact.chordLengthSquared.approx;
  assert.equal(typeof chordLengthSquared, "number");
  if (
    points.some((point) => point.some((coordinate) => typeof coordinate !== "number")) ||
    typeof chordLengthSquared !== "number"
  ) {
    return;
  }

  for (const locale of ["en", "zh-CN", "zh-HK"] as const) {
    const geometry = buildGeometryKernelDemoScene({
      solution: payload.value.geometry.solution,
      topology: payload.value.geometry.topology,
      vectors: [{
        id: "A1C",
        from: "A1",
        to: "C",
        conceptId: "geometry-line-plane-angle",
      }],
      planes: [{
        id: "base",
        pointGrid: [["A", "B"], ["D", "C"]],
        conceptId: "geometry-line-plane-angle",
      }],
      renderEdgeLength: payload.value.geometry.renderEdgeLength,
      locale,
    });
    assert.equal(geometry.ok, true);
    if (!geometry.ok) continue;

    const analytic = buildAnalyticKernelDemoScene({
      solution: payload.value.analytic.solution,
      conic: payload.value.analytic.conic,
      segments: [{
        id: "focal-chord",
        from: points[0] as [number, number],
        to: points[1] as [number, number],
      }],
      inverseSlope: payload.value.analytic.initialSlopeQuarter / 4,
      chordLengthSquared,
      locale,
    });
    assert.equal(analytic.ok, true);
    if (!analytic.ok) continue;

    assert.equal(
      geometry.value.formulas[0].latex,
      `\\sin\\theta=${payload.value.geometry.solution.answer.latex}`,
    );
    assert.equal(
      analytic.value.formulas[0].latex,
      `L\\in${payload.value.analytic.solution.intervalLatex}`,
    );
    assert.deepEqual(
      geometry.value.bindings.map((binding) => binding.objectId),
      ["geometry-vector-A1C", "geometry-plane-base"],
    );
    assert.deepEqual(
      analytic.value.bindings.map((binding) => binding.objectId),
      ["analytic-segment-focal-chord"],
    );
    for (const scene of [geometry.value, analytic.value]) {
      assertAllFormulaTokensColorized(scene);
      assert.equal(
        buildMathSceneTeachingQualityEvidence(scene).readyForA18Review,
        true,
      );
    }
  }
});

test("the constrained exact endpoint accepts only quarter-step demo slopes", () => {
  const exactIntersection = exactDemoIntersectionForSlopeQuarter(0);
  assert.equal(exactIntersection.ok, true);
  if (exactIntersection.ok && exactIntersection.value.kind === "secant") {
    assert.equal(exactIntersection.value.chordLengthSquared.mathJson, 9);
  }

  for (const invalid of [0.5, 9, -9, "0", null]) {
    const rejected = exactDemoIntersectionForSlopeQuarter(invalid);
    assert.equal(rejected.ok, false);
    if (!rejected.ok) assert.equal(rejected.error.code, "INVALID_INPUT");
  }
});

test("nonzero quarter steps stay exact and serializable", () => {
  const result = exactDemoIntersectionForSlopeQuarter(1);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.kind, "secant");
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), result.value);

  const cached = exactDemoIntersectionForSlopeQuarter(1);
  assert.equal(cached.ok, true);
  if (cached.ok) assert.equal(cached.value, result.value);
});

test("the exact endpoint includes both allowed boundary slopes", () => {
  for (const slopeQuarter of [-8, 8]) {
    const result = exactDemoIntersectionForSlopeQuarter(slopeQuarter);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.kind, "secant");
  }
});
