import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCalculusRateAreaMathSceneSpec,
  buildProbabilityMachineMathSceneSpec,
  buildTrigUnitWaveMathSceneSpec
} from "./three/manim/mathSceneRegistry";
import type { ThreeDStateSummary } from "./three/threeDSceneTypes";

/**
 * Value-level proof for the curriculum scenes Hong Kong's premium-3D routes run.
 *
 * The 213 existing tests under `three/` assert object counts, ids and
 * source-text patterns. None of them evaluates what a curriculum scene actually
 * plots, which is how three false claims shipped:
 *
 *   - the curve labelled `A(x₀) = the integral of f` was `max(0, f(x)) * 0.72`,
 *     a scaled copy of f, with no antiderivative computed anywhere;
 *   - the "experimental frequency" had a different baseline from the model
 *     and its deviation grew with n, so its curves could not converge;
 *   - the unit circle's radius varied with the wave amplitude while the
 *     formula still claimed the unscaled unit-circle coordinates.
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
  formulas: { latex: string }[];
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
 * tests exist to catch (a circle radius of 0.1, an accumulation curve drawn at
 * half its labelled integral value).
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
      // the integral from -3.6 to t is (a/6)(t^3 + 3.6^3) + 0.35(t + 3.6).
      const a = value / 10;
      const f = (x: number) => (a / 2) * x * x + 0.35;
      const exactArea = (t: number) => (a / 6) * (t ** 3 + 3.6 ** 3) + 0.35 * (t + 3.6);
      const expectedProbeX = (comparison - 5) / 1.25;

      assert.ok(Math.abs(areaSamples.at(-1)![0] - expectedProbeX) < renderingTolerance(1),
        `3D probe must reach the 2D control x=${expectedProbeX} at comparison ${comparison}`);
      assert.match(scene.formulas[0].latex, /x_0=/, "3D formula must identify the displayed probe x");
      assert.ok(scene.coordinateSpace.mathRange.x[0] <= expectedProbeX && scene.coordinateSpace.mathRange.x[1] >= expectedProbeX,
        "3D axis must contain every reachable probe position");

      for (const [x, y] of rateSamples) {
        assert.ok(Math.abs(y - f(x)) < renderingTolerance(f(x)), `rate curve must plot f at x = ${x}`);
      }

      for (const [x, y] of areaSamples) {
        assert.ok(
          Math.abs(y - exactArea(x)) < renderingTolerance(exactArea(x)),
          `accumulation must equal the unscaled integral at x = ${x} (a = ${a})`
        );
      }

      // The accumulation must start at zero at the lower limit and increase:
      // that is what distinguishes it from a scaled copy of f, which is
      // symmetric about the y-axis and never zero.
      const [startX, startY] = areaSamples[0];
      assert.ok(Math.abs(startX + 3.6) < renderingTolerance(3.6), "accumulation must start at the lower limit x = -3.6");
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

test("experimental distribution converges to the same theoretical curve as n grows", () => {
  const p = 0.18 + 5 / 12;
  const meanX = (p - 0.5) * 3.2;
  const spread = 1.25 - Math.abs(p - 0.5) * 1.1;
  const model = (x: number) => 0.36 + 1.62 * Math.exp(-((x - meanX) ** 2) / (2 * spread ** 2));

  const deviations = sliderRange(1, 9).map((comparison) => {
    const state = stateFor({ comparison, value: 5 });
    const scene = buildProbabilityMachineMathSceneSpec({ accent: "#facc15", state });
    assert.match(scene.formulas[0].latex, /illustrative/, "sampling variation must be labelled as illustrative");
    const theoreticalSamples = mathSamplesOf(scene as unknown as MathScene, "theoretical-distribution");
    const experimentalSamples = mathSamplesOf(scene as unknown as MathScene, "experimental-distribution");
    for (const [x, y] of theoreticalSamples) {
      assert.ok(Math.abs(y - model(x)) < renderingTolerance(model(x)), "theory must plot the stated model");
    }
    const n = Math.round(18 + Math.min(1.45, Math.max(0.95, 0.78 + comparison / 16)) * 28);
    const standardError = Math.sqrt((p * (1 - p)) / n);
    const gaps = experimentalSamples.map(([x, y]) => Math.abs(y - model(x)));
    assert.ok(Math.max(...gaps) <= standardError * 1.6 + renderingTolerance(1), "experimental gap must fit sampling error");
    return Math.max(...gaps);
  });

  const first = deviations[0];
  const last = deviations[deviations.length - 1];
  assert.ok(
    last < first,
    `raising n must settle the experimental curve, got ${first.toFixed(4)} -> ${last.toFixed(4)}`
  );
});

test("the trig scene keeps a unit circle and scales its y-coordinate for the wave", () => {
  for (const comparison of sliderRange(1, 10)) {
    for (const value of sliderRange(1, 9)) {
      const state = stateFor({ comparison, value });
      const scene = buildTrigUnitWaveMathSceneSpec({ accent: "#c084fc", state });

      const circleSamples = mathSamplesOf(scene as unknown as MathScene, "unit-circle");
      const waveSamples = mathSamplesOf(scene as unknown as MathScene, "sine-wave");

      const amplitude = comparison / 10;
      const centerX = -1.35;

      // The source is a genuine unit circle at every wave amplitude.
      const radii = circleSamples.map(([x, y]) => Math.hypot(x - centerX, y));
      for (const radius of radii) {
        assert.ok(
          Math.abs(radius - 1) < renderingTolerance(1),
          `unit-circle radius ${radius} must equal 1`
        );
      }

      // The wave must reach amplitude, and must include x = 0 — the point that
      // carries the correspondence with the rotating radius.
      const waveXs = waveSamples.map(([x]) => x);
      assert.ok(Math.min(...waveXs) <= renderingTolerance(1), "the wave must be drawn from x = 0");
      const theta = ((value - 1) / 8) * Math.PI * 2;
      assert.ok(
        Math.abs(waveSamples[0][1] - amplitude * Math.sin(theta)) < renderingTolerance(amplitude),
        "wave at x = 0 must scale the unit-circle tip by A"
      );
      assert.match(scene.formulas[0].latex, /\\mapsto/, "formula must disclose amplitude scaling");
      assert.match(scene.formulas[0].latex, /C=\(-1\.35,0\).*\\overrightarrow\{CP\}/, "formula must use circle-centred coordinates");

      const peak = Math.max(...waveSamples.map(([, y]) => Math.abs(y)));
      assert.ok(
        Math.abs(peak - amplitude) < renderingTolerance(amplitude) + 5e-3,
        `wave peak ${peak} must reach the amplitude ${amplitude}`
      );
    }
  }
});
