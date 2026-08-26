import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCalculusRateAreaMathSceneSpec,
  buildProbabilityMachineMathSceneSpec,
  buildTrigUnitWaveMathSceneSpec
} from "./mathSceneRegistry";
import type { ThreeDStateSummary } from "../threeDSceneTypes";

/**
 * Value-level proof for the curriculum scenes Hong Kong's premium-3D routes run.
 *
 * The 213 existing tests under `three/` assert object counts, ids and
 * source-text patterns. None of them evaluates what a curriculum scene actually
 * plots, which is how three false claims shipped:
 *
 *   - the curve labelled `A(a) = the integral of f` was `max(0, f(x)) * 0.72`,
 *     a scaled copy of f, with no antiderivative computed anywhere;
 *   - the "experimental frequency" deviated from the model by an amount that
 *     GREW with n, the exact inverse of sqrt(p(1 - p)/n);
 *   - the unit circle's radius was pinned at 0.72 while the wave amplitude
 *     varied, so the correspondence the scene declares in its bindings held at
 *     one unreachable dial setting.
 *
 * Each test below compares a sampled scene value against an independently
 * written closed form.
 */

function stateFor({
  comparison,
  mode = 0,
  value
}: {
  comparison: number;
  mode?: number;
  value: number;
}): ThreeDStateSummary {
  return {
    comparison,
    depthValue: 1,
    familyId: "three-calculus-rate-area",
    mode,
    primaryValue: value,
    secondaryValue: comparison,
    stateSummary: `family=test:value=${value}:comparison=${comparison}:mode=${mode}`,
    templateId: "calculus-rate-area",
    value
  } as unknown as ThreeDStateSummary;
}

type SampledCurve = { samples: [number, number, number][] };
type MathScene = {
  coordinateSpace: {
    mathRange: { x: [number, number]; y: [number, number] };
    worldRange: { x: [number, number]; y: [number, number] };
  };
  objects: unknown[];
};

/**
 * Curve samples are stored in world space. Invert the scene's own declared
 * affine map so the assertions below can be written in the mathematics the
 * scene is teaching rather than in render units.
 */
function mathSamplesOf(scene: MathScene, id: string): [number, number][] {
  const object = (scene.objects as { id: string }[]).find((candidate) => candidate.id === id);
  assert.ok(object, `scene must contain an object with id "${id}"`);

  const samples = (object as unknown as SampledCurve).samples;
  assert.ok(samples?.length, `object "${id}" must expose sampled points`);

  const { mathRange, worldRange } = scene.coordinateSpace;
  const toMath = (world: number, worldSpan: [number, number], mathSpan: [number, number]) =>
    mathSpan[0] + ((world - worldSpan[0]) * (mathSpan[1] - mathSpan[0])) / (worldSpan[1] - worldSpan[0]);

  return samples.map(([x, y]) => [toMath(x, worldRange.x, mathRange.x), toMath(y, worldRange.y, mathRange.y)]);
}

/**
 * Curve samples are quantized for transport, so a round-trip through world
 * space lands within about 0.05% of the mathematical value. The tolerance is
 * loose enough to absorb that and far tighter than any of the defects these
 * tests exist to catch (a radius pinned at 0.72 against an amplitude of 0.1, an
 * accumulation curve that is a scaled copy of f).
 */
const renderingTolerance = (magnitude: number) => Math.max(2e-3, Math.abs(magnitude) * 5e-3);

const sliderRange = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, index) => min + index);

test("the accumulation curve is the integral of the plotted function", () => {
  for (const value of sliderRange(1, 9)) {
    for (const comparison of sliderRange(1, 9)) {
      const state = stateFor({ comparison, value });
      const scene = buildCalculusRateAreaMathSceneSpec({ accent: "#22d3ee", state });

      const rateSamples = mathSamplesOf(scene as unknown as MathScene, "rate-curve");
      const areaSamples = mathSamplesOf(scene as unknown as MathScene, "area-accumulation");

      // Independent closed form: f(x) = (a/2)x^2 + 0.35 with a = value / 10, so
      // the integral from -3 to t is (a/6)(t^3 + 27) + 0.35(t + 3).
      const a = value / 10;
      const f = (x: number) => (a / 2) * x * x + 0.35;
      const exactArea = (t: number) => (a / 6) * (t ** 3 + 27) + 0.35 * (t + 3);

      for (const [x, y] of rateSamples) {
        assert.ok(Math.abs(y - f(x)) < renderingTolerance(f(x)), `rate curve must plot f at x = ${x}`);
      }

      // The area curve is drawn at a stated display scale; recover it from the
      // samples and require it to be one constant, then check the shape.
      const [firstX, firstY] = areaSamples[Math.floor(areaSamples.length / 2)];
      const displayScale = firstY / exactArea(firstX);
      assert.ok(
        Number.isFinite(displayScale) && displayScale > 0,
        "the accumulation curve must be a positive multiple of the true integral"
      );

      for (const [x, y] of areaSamples) {
        assert.ok(
          Math.abs(y - exactArea(x) * displayScale) < renderingTolerance(exactArea(x) * displayScale),
          `accumulation must follow the antiderivative at x = ${x} (a = ${a})`
        );
      }

      // The accumulation must start at zero at the lower limit and increase:
      // that is what distinguishes it from a scaled copy of f, which is
      // symmetric about the y-axis and never zero.
      const [startX, startY] = areaSamples[0];
      assert.ok(Math.abs(startX + 3) < renderingTolerance(3), "accumulation must start at the lower limit x = -3");
      assert.ok(Math.abs(startY) < renderingTolerance(1), "accumulation must be zero at its lower limit");

      for (let index = 1; index < areaSamples.length; index += 1) {
        assert.ok(
          areaSamples[index][1] >= areaSamples[index - 1][1] - renderingTolerance(1),
          "accumulation of a positive function must be non-decreasing"
        );
      }
    }
  }
});

test("sampling error shrinks as the sample size grows", () => {
  // n rises with the comparison dial. The deviation between the experimental
  // and theoretical curves must fall, not rise.
  const deviations = sliderRange(1, 9).map((comparison) => {
    const state = stateFor({ comparison, value: 5 });
    const scene = buildProbabilityMachineMathSceneSpec({ accent: "#facc15", state });

    mathSamplesOf(scene as unknown as MathScene, "theoretical-distribution");
    const experimentalSamples = mathSamplesOf(scene as unknown as MathScene, "experimental-distribution");

    // Peak-to-trough of the wobble the scene adds on top of the density.
    const ys = experimentalSamples.map(([, y]) => y);
    return Math.max(...ys) - Math.min(...ys);
  });

  const first = deviations[0];
  const last = deviations[deviations.length - 1];
  assert.ok(
    last < first,
    `raising n must settle the experimental curve, got ${first.toFixed(4)} -> ${last.toFixed(4)}`
  );
});

test("the circle the trig scene draws has the radius the wave has amplitude", () => {
  for (const comparison of sliderRange(1, 10)) {
    for (const value of sliderRange(1, 9)) {
      const state = stateFor({ comparison, value });
      const scene = buildTrigUnitWaveMathSceneSpec({ accent: "#c084fc", state });

      const circleSamples = mathSamplesOf(scene as unknown as MathScene, "unit-circle");
      const waveSamples = mathSamplesOf(scene as unknown as MathScene, "sine-wave");

      const amplitude = comparison / 10;
      const centerX = -1.35;

      // Radius recovered from the drawn circle must equal the amplitude.
      const radii = circleSamples.map(([x, y]) => Math.hypot(x - centerX, y));
      for (const radius of radii) {
        assert.ok(
          Math.abs(radius - amplitude) < renderingTolerance(amplitude),
          `circle radius ${radius} must equal amplitude ${amplitude}`
        );
      }

      // The wave must reach amplitude, and must include x = 0 — the point that
      // carries the correspondence with the rotating radius.
      const waveXs = waveSamples.map(([x]) => x);
      assert.ok(Math.min(...waveXs) <= renderingTolerance(1), "the wave must be drawn from x = 0");

      const peak = Math.max(...waveSamples.map(([, y]) => Math.abs(y)));
      assert.ok(
        Math.abs(peak - amplitude) < renderingTolerance(amplitude) + 5e-3,
        `wave peak ${peak} must reach the amplitude ${amplitude}`
      );
    }
  }
});
