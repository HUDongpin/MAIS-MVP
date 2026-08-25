import assert from "node:assert/strict";
import test from "node:test";

import {
  angleGeometryState,
  baseTenState,
  coordinateTransformState,
  fractionState,
  probabilityState,
  trigState
} from "@/components/visualizations/configuredVisualizationLabModel";
import { formatNumber, roundedRelation } from "@/lib/math";

/**
 * Behavioural proof for the configured template model.
 *
 * Every other test in this directory reads ConfiguredVisualizationLab.tsx as
 * text and asserts that a literal is present. That can prove a line exists; it
 * cannot prove the mathematics is right, which is how a "reflection" that moved
 * points on its own mirror line, a "dilation" that moved its own centre, and a
 * place-value model capped at 99 all shipped. These tests execute the model and
 * assert the defining property of each transformation, so a regression fails
 * here rather than in front of a student.
 *
 * Slider bounds mirror explicitThreeDTemplateSliderBounds; they are restated as
 * literals so that widening a bound without revisiting its model is a failure.
 */

const sliderRange = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, index) => min + index);

test("reflection fixes every point on its mirror line, at every slider position", () => {
  // Both sliders are swept. The vertical dial is the one that used to corrupt
  // this transformation, and at comparison = 5 its contribution is zero — a
  // test that pins only that column cannot see the defect at all.
  for (const value of sliderRange(0, 10)) {
    for (const comparison of sliderRange(0, 10)) {
      const state = coordinateTransformState(value, comparison, 1);
      const mirrorX = state.reflectionLineX;

      for (const [index, source] of state.source.entries()) {
        const image = state.transformed[index];
        assert.equal(
          image.y,
          source.y,
          `value ${value}, comparison ${comparison}: a reflection in a vertical line must not move y`
        );
        assert.equal(
          formatNumber(2 * mirrorX - source.x, 6),
          formatNumber(image.x, 6),
          `value ${value}, comparison ${comparison}: x' must equal 2L - x`
        );
      }

      // The defining property: every point of the mirror line is its own image.
      for (const y of [-3, -0.75, 0, 0.9, 2.5]) {
        const onLine = { x: mirrorX, y };
        const image = state.transformPoint(onLine);
        assert.equal(
          formatNumber(image.x, 6),
          formatNumber(onLine.x, 6),
          `value ${value}, comparison ${comparison}: a point on x = ${mirrorX} must not move in x`
        );
        assert.equal(
          formatNumber(image.y, 6),
          formatNumber(onLine.y, 6),
          `value ${value}, comparison ${comparison}: a point on x = ${mirrorX} must not move in y`
        );
      }

      // Reflecting twice is the identity.
      for (const source of state.source) {
        const back = state.transformPoint(state.transformPoint(source));
        assert.equal(formatNumber(back.x, 6), formatNumber(source.x, 6), "double reflection must restore x");
        assert.equal(formatNumber(back.y, 6), formatNumber(source.y, 6), "double reflection must restore y");
      }
    }
  }
});

test("dilation fixes its centre and scales both coordinates by the same factor", () => {
  for (const value of sliderRange(0, 10)) {
    for (const comparison of sliderRange(0, 10)) {
      const state = coordinateTransformState(value, comparison, 2);
      const k = state.dilationScale;

      assert.ok(k > 0, `value ${value}: scale factor must be positive`);

      // The defining property: the centre is fixed. This is what the vertical
      // shift used to break, and it is invisible at comparison = 5.
      const centre = state.transformPoint({ x: 0, y: 0 });
      assert.equal(formatNumber(centre.x, 6), "0", `comparison ${comparison}: the centre must not move in x`);
      assert.equal(formatNumber(centre.y, 6), "0", `comparison ${comparison}: the centre must not move in y`);

      for (const [index, source] of state.source.entries()) {
        const image = state.transformed[index];
        assert.equal(
          formatNumber(source.x * k, 6),
          formatNumber(image.x, 6),
          `value ${value}, comparison ${comparison}: x must scale by exactly k`
        );
        assert.equal(
          formatNumber(source.y * k, 6),
          formatNumber(image.y, 6),
          `value ${value}, comparison ${comparison}: y must scale by exactly k — a vertical shift here is not a dilation`
        );
      }
    }
  }

  // k = 1 must be reachable and must be the identity, not a translation.
  const identity = coordinateTransformState(3, 0, 2);
  assert.equal(identity.dilationScale, 1, "k = 1 must be reachable on the slider");
  assert.deepEqual(
    identity.transformed,
    identity.source.map((point) => ({ x: point.x, y: point.y })),
    "at k = 1 the dilation must fix every point"
  );
});

test("every coordinate-transform slider position is a distinct state", () => {
  const shifts = sliderRange(0, 10).map((comparison) => coordinateTransformState(5, comparison, 0).dy);
  assert.equal(new Set(shifts).size, shifts.length, "vertical shift has duplicate slider positions");

  const scales = sliderRange(0, 10).map((value) => coordinateTransformState(value, 5, 2).dilationScale);
  assert.equal(new Set(scales).size, scales.length, "scale factor has duplicate slider positions");
});

test("angle model reaches the angles school geometry is built on", () => {
  const reachable = new Set(sliderRange(0, 12).map((value) => angleGeometryState(value, 0).angleA));

  for (const angle of [0, 30, 45, 60, 90, 120, 135, 150, 180]) {
    assert.ok(reachable.has(angle), `${angle} degrees must be reachable`);
  }
});

test("angle model reports complementary and supplementary pairs correctly", () => {
  const complementary = angleGeometryState(2, 4); // 30 + 60
  assert.equal(complementary.sum, 90);
  assert.equal(complementary.complementary, true);
  assert.equal(complementary.supplementary, false);

  const supplementary = angleGeometryState(3, 9); // 45 + 135
  assert.equal(supplementary.sum, 180);
  assert.equal(supplementary.supplementary, true);
  assert.equal(supplementary.complementary, false);

  const neither = angleGeometryState(1, 1); // 15 + 15
  assert.equal(neither.sum, 30);
  assert.equal(neither.complementary, false);
  assert.equal(neither.supplementary, false);
});

test("place-value model carries hundreds and reaches its topic's range", () => {
  const zero = baseTenState(0, 0);
  assert.equal(zero.total, 0);
  assert.equal(zero.zeroTotal, true);

  const max = baseTenState(99, 9);
  assert.equal(max.hundreds, 9);
  assert.equal(max.tens, 9);
  assert.equal(max.ones, 9);
  assert.equal(max.total, 999, "the model must reach three digits — its topics teach place value to 1000");

  // The digits must decompose the total exactly, at every reachable state.
  for (const value of sliderRange(0, 99)) {
    for (const comparison of sliderRange(0, 9)) {
      const state = baseTenState(value, comparison);
      assert.equal(
        state.hundreds * 100 + state.tens * 10 + state.ones,
        state.total,
        `value ${value}, comparison ${comparison}: digits must decompose the total`
      );
      assert.ok(state.hundreds >= 0 && state.hundreds <= 9, "hundreds digit out of range");
      assert.ok(state.tens >= 0 && state.tens <= 9, "tens digit out of range");
      assert.ok(state.ones >= 0 && state.ones <= 9, "ones digit out of range");
    }
  }

  assert.equal(baseTenState(34, 5).total, 345, "value 34 + ones 5 must read 345");
});

test("probability readouts never claim a rounded decimal equals an exact value", () => {
  for (const success of sliderRange(0, 9)) {
    for (const failure of sliderRange(0, 9)) {
      const state = probabilityState(success, failure);
      if (!state.probabilityDefined) continue;

      const decimal = formatNumber(state.probability, 2);
      const relation = roundedRelation(state.probability, decimal);

      if (relation === "=") {
        assert.equal(
          Number(decimal),
          state.probability,
          `${success}/${state.trials}: "=" must mean exact equality`
        );
      } else {
        assert.notEqual(
          Number(decimal),
          state.probability,
          `${success}/${state.trials}: "≈" must mean the display is rounded`
        );
      }
    }
  }

  // The case that shipped as a falsehood: P = 1/3 displayed as "= 0.33".
  const oneThird = probabilityState(1, 2);
  assert.equal(oneThird.trials, 3);
  assert.equal(roundedRelation(oneThird.probability, formatNumber(oneThird.probability, 2)), "≈");

  // An exact case must still read "=".
  const half = probabilityState(1, 1);
  assert.equal(roundedRelation(half.probability, formatNumber(half.probability, 2)), "=");
});

test("trig amplitudes are exact at the precision they are displayed", () => {
  for (const comparison of sliderRange(1, 10)) {
    const { amplitude } = trigState(1, comparison, 0);
    assert.equal(
      roundedRelation(amplitude, formatNumber(amplitude, 2)),
      "=",
      `comparison ${comparison}: the plotted amplitude must equal the amplitude shown`
    );
  }

  assert.equal(trigState(1, 10, 0).amplitude, 1, "A = 1 must be reachable");
  assert.equal(trigState(1, 1, 0).amplitude, 0.1);
});

test("fraction model keeps the numerator within the whole it draws", () => {
  for (const value of sliderRange(1, 9)) {
    for (const comparison of sliderRange(0, 9)) {
      const state = fractionState(value, comparison);
      assert.ok(
        state.numerator <= state.denominator,
        `value ${value}, comparison ${comparison}: the bar cannot shade more parts than it has`
      );
      assert.equal(
        state.value,
        state.numerator / state.denominator,
        "the reported value must be numerator ÷ denominator"
      );
      assert.equal(
        state.equivalentNumerator / state.equivalentDenominator,
        state.value,
        "the equivalent fraction must name the same number"
      );
    }
  }
});
