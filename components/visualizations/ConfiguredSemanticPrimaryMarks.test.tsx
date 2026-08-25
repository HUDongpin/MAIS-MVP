import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { visualizationThemeForTheme } from "./visualizationTheme";
import * as primaryMarksModule from "./ConfiguredSemanticPrimaryMarks";
import {
  buildAttributeComparisonState,
  buildAreaPerimeterState,
  buildCalendarModelState,
  buildCategoricalDataState,
  buildClockTimeState,
  buildCombinatoricsState,
  buildConfiguredSemanticPrimaryState,
  buildDecimalNumberLineState,
  buildDecimalPlaceValueState,
  buildDecimalProductAreaState,
  buildDivisionRemainderArrayState,
  buildEqualGroupsArrayState,
  buildFactorArrayState,
  buildFractionEquivalenceState,
  buildFractionOperationsState,
  buildLargeWholeNumberLineState,
  buildLineChartState,
  buildMassUnitConversionState,
  buildMeasurementEstimationState,
  buildMeasurementModelState,
  buildMoneyModelState,
  buildMultiPlaceValueState,
  buildPercentModelState,
  buildPolygonAreaState,
  buildPrimaryBarChartState,
  buildProportionalFunctionState,
  buildRandomVariableDistributionState,
  buildRatioProportionState,
  buildRawDataSummaryState,
  buildSeededProbabilityExperimentState,
  buildSignedRealNumberLineState,
  buildSmallWholeNumberLineState,
  buildVolumeLayersState,
  ConfiguredSemanticPrimaryMarks,
  CONFIGURED_SEMANTIC_PRIMARY_MARKS_SOURCE,
  configuredSemanticPrimaryControlContracts,
  getConfiguredSemanticPrimaryControlContract,
  configuredSemanticPrimaryInvariant,
  configuredSemanticPrimaryFamilies,
  configuredSemanticPrimaryControlRequirements,
  configuredSemanticPrimaryLayout,
  configuredSemanticPrimaryStateBuilders,
  type SemanticPrimaryBuildInput
} from "./ConfiguredSemanticPrimaryMarks";

const input: SemanticPrimaryBuildInput = { comparison: 4, mode: 2, value: 7, variant: "audit-contract" };
const close = (actual: number, expected: number, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

type GeometryPoint = { x: number; y: number };
type GeometryRect = { height: number; left: number; top: number; width: number };

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
}

function openingTagsByVizName(markup: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...markup.matchAll(new RegExp(`<[^>]+data-viz-name="${escapedName}"[^>]*>`, "g"))].map((match) => match[0]);
}

function textElementByVizName(markup: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markup.match(new RegExp(`(<text[^>]+data-viz-name="${escapedName}"[^>]*>)([^<]*)</text>`));
  assert.ok(match, `missing ${name} text`);
  return { tag: match[1], text: match[2] };
}

function expanded(rect: GeometryRect, padding: number): GeometryRect {
  return {
    height: rect.height + padding * 2,
    left: rect.left - padding,
    top: rect.top - padding,
    width: rect.width + padding * 2
  };
}

function pointIntersectsRect(point: GeometryPoint, radius: number, rect: GeometryRect) {
  const nearestX = Math.max(rect.left, Math.min(point.x, rect.left + rect.width));
  const nearestY = Math.max(rect.top, Math.min(point.y, rect.top + rect.height));
  return Math.hypot(point.x - nearestX, point.y - nearestY) < radius;
}

function segmentIntersectsRect(start: GeometryPoint, end: GeometryPoint, rect: GeometryRect) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  let minimum = 0;
  let maximum = 1;
  const boundaries: Array<[number, number]> = [
    [-deltaX, start.x - rect.left],
    [deltaX, rect.left + rect.width - start.x],
    [-deltaY, start.y - rect.top],
    [deltaY, rect.top + rect.height - start.y]
  ];
  for (const [direction, distance] of boundaries) {
    if (direction === 0) {
      if (distance < 0) return false;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return true;
}

function renderPrimary(family: string, overrides: Partial<SemanticPrimaryBuildInput> = {}) {
  const props = { ...input, ...overrides };
  return renderToStaticMarkup(createElement(ConfiguredSemanticPrimaryMarks, {
    accent: "#06b6d4",
    comparison: props.comparison,
    family,
    mode: props.mode,
    value: props.value,
    variant: props.variant,
    vizTheme: visualizationThemeForTheme("light")
  }));
}

function visiblePrimaryMarkup(family: string, overrides: Partial<SemanticPrimaryBuildInput> = {}) {
  return renderPrimary(family, overrides).replace(/\sdata-viz-[\w-]+="[^"]*"/g, "");
}

test("small whole-number line preserves exact start plus signed step equals end", () => {
  const state = buildSmallWholeNumberLineState(input);
  assert.equal(state.start + state.step, state.end);
  assert.ok(state.start >= 0 && state.end <= 20);
});

test("large whole-number line includes the promised endpoint and preserves its jump", () => {
  const state = buildLargeWholeNumberLineState({ ...input, variant: "ten-thousand-domain" });
  assert.equal(state.domainMax, 10_000);
  assert.equal(state.tickValues.at(-1), 10_000);
  assert.equal(state.start + state.step, state.end);
});

test("signed real-number line keeps zero stable and both endpoints in its signed domain", () => {
  const state = buildSignedRealNumberLineState({ ...input, mode: 1 });
  assert.ok(state.tickValues.includes(0));
  assert.ok(state.end >= state.domainMin && state.end <= state.domainMax);
  assert.equal(state.start + state.step, state.end);
});

test("decimal number line uses exact hundredth arithmetic", () => {
  const state = buildDecimalNumberLineState({ comparison: 3, mode: 0, value: 6.2, variant: "tenths-hundredths" });
  assert.equal(Math.round((state.start + state.step) * 100), Math.round(state.end * 100));
  assert.ok(state.tickValues.includes(0.1));
});

test("multi-place-value total equals the sum of every visible contribution", () => {
  const state = buildMultiPlaceValueState(input);
  assert.equal(state.total, input.value);
  assert.equal(state.digits.reduce((sum, digit) => sum + digit.contribution, 0), state.total);
  assert.equal(state.comparisonTotal, input.comparison);
  assert.equal(state.comparisonDigits.reduce((sum, digit) => sum + digit.contribution, 0), state.comparisonTotal);
  assert.equal(state.comparisonRelation, ">");
  assert.deepEqual(state.digits.map(({ place }) => place), [10_000, 1000, 100, 10, 1]);
});

test("tens-and-ones place value is an exact two-place model with age-appropriate controls", () => {
  const contract = getConfiguredSemanticPrimaryControlContract("multi-place-value", "tens-ones");
  assert.deepEqual(
    contract.numericControls.map(({ initial, max, min, role }) => ({ initial, max, min, role })),
    [
      { initial: 42, max: 99, min: 0, role: "number-a" },
      { initial: 37, max: 99, min: 0, role: "number-b" }
    ]
  );

  const state = buildMultiPlaceValueState({
    comparison: 37,
    mode: 0,
    value: 42,
    variant: "tens-ones"
  });
  assert.deepEqual(state.digits.map(({ place }) => place), [10, 1]);
  assert.deepEqual(state.digits.map(({ digit }) => digit), [4, 2]);
  assert.deepEqual(state.comparisonDigits.map(({ digit }) => digit), [3, 7]);
  assert.equal(state.total, 10 * state.digits[0].digit + state.digits[1].digit);
  assert.equal(
    state.comparisonTotal,
    10 * state.comparisonDigits[0].digit + state.comparisonDigits[1].digit
  );

  const markup = renderPrimary("multi-place-value", {
    comparison: 37,
    mode: 0,
    value: 42,
    variant: "tens-ones"
  });
  assert.equal((markup.match(/data-viz-name="place value A column"/g) ?? []).length, 2);
  assert.equal((markup.match(/data-viz-name="place value B column"/g) ?? []).length, 2);
  assert.match(markup, /data-viz-place-count="2"/);

  const ordinary = buildMultiPlaceValueState({
    comparison: 12_054,
    mode: 0,
    value: 12_345,
    variant: "ones-to-ten-thousands"
  });
  assert.deepEqual(ordinary.digits.map(({ place }) => place), [10_000, 1000, 100, 10, 1]);
});

test("decimal place-value ones, tenths, and hundredths sum exactly in hundredths", () => {
  const state = buildDecimalPlaceValueState({ comparison: 4, mode: 8, value: 3.48, variant: "ones-tenths-hundredths" });
  assert.equal(state.total, 3.48);
  assert.equal(Math.round(state.digits.reduce((sum, digit) => sum + digit.contribution, 0) * 100), Math.round(state.total * 100));
  assert.equal(state.comparisonTotal, 4);
  assert.equal(Math.round(state.comparisonDigits.reduce((sum, digit) => sum + digit.contribution, 0) * 100), Math.round(state.comparisonTotal * 100));
  assert.equal(state.comparisonRelation, "<");
  assert.deepEqual(state.digits.map(({ place }) => place), [1, 0.1, 0.01]);
});

test("place-value SSR shows both controlled numbers and their comparison", () => {
  const markup = renderPrimary("multi-place-value", { comparison: 321, value: 456 });
  assert.equal((markup.match(/data-viz-name="place value A column"/g) ?? []).length, 5);
  assert.equal((markup.match(/data-viz-name="place value B column"/g) ?? []).length, 5);
  assert.match(markup, /data-viz-comparison-relation="&gt;"/);
  assert.match(markup, />A</);
  assert.match(markup, />B</);
});

test("equal-groups array cell count is rows times columns", () => {
  const state = buildEqualGroupsArrayState(input);
  assert.equal(state.product, state.rows * state.columns);
});

test("P2 equal-groups reset shows four groups of five as repeated addition and Total 20", () => {
  const contract = configuredSemanticPrimaryControlContracts["equal-groups-array"];
  assert.deepEqual(contract.numericControls.map(({ initial }) => initial), [4, 5]);
  const state = buildEqualGroupsArrayState({ ...input, comparison: 5, value: 4 });
  assert.deepEqual({ columns: state.columns, rows: state.rows, total: state.product }, { columns: 5, rows: 4, total: 20 });

  const markup = renderPrimary("equal-groups-array", { comparison: 5, value: 4 });
  assert.equal((markup.match(/data-viz-name="array item"/g) ?? []).length, 20);
  assert.match(markup, /data-viz-name="equal groups repeated addition"[^>]*>5 \+ 5 \+ 5 \+ 5 = 20<\/text>/);
  assert.match(markup, /data-viz-name="equal groups total"[^>]*>Total: 20<\/text>/);
  assert.doesNotMatch(markup, /\bArea\b|square units?/i);
});

test("equal-groups reasoning stays in a dedicated gutter at every control corner", () => {
  for (const value of [1, 10]) {
    for (const comparison of [1, 10]) {
      const markup = renderPrimary("equal-groups-array", { comparison, value });
      const outline = markup.match(
        /data-viz-name="array outline" x="([^"]+)" y="[^"]+" width="([^"]+)"/
      );
      const repeatedAddition = markup.match(
        /data-viz-name="equal groups repeated addition"[^>]*x="([^"]+)"/
      );
      const total = markup.match(/data-viz-name="equal groups total"[^>]*x="([^"]+)"/);
      assert.ok(outline && repeatedAddition && total, `missing equal-groups layout evidence for ${value}x${comparison}`);
      const outlineRight = Number(outline[1]) + Number(outline[2]);
      const repeatedAdditionLeft = Number(repeatedAddition[1]);
      const totalLeft = Number(total[1]);
      assert.ok(
        repeatedAdditionLeft >= outlineRight + 16,
        `repeated addition overlaps the array for ${value}x${comparison}`
      );
      assert.ok(totalLeft >= outlineRight + 16, `total overlaps the array for ${value}x${comparison}`);
    }
  }
});

test("division-remainder array always satisfies dividend equals quotient times divisor plus remainder", () => {
  const state = buildDivisionRemainderArrayState(input);
  assert.equal(state.dividend, (state.quotient ?? -1) * state.columns + (state.remainder ?? -1));
  assert.ok((state.remainder ?? state.columns) >= 0 && (state.remainder ?? state.columns) < state.columns);
});

test("division representation mode never changes the visible dividend or divisor", () => {
  const modes = [0, 1, 2, 3].map((mode) => buildDivisionRemainderArrayState({ ...input, mode }));
  assert.deepEqual(modes.map(({ dividend }) => dividend), [7, 7, 7, 7]);
  assert.deepEqual(modes.map(({ columns }) => columns), [4, 4, 4, 4]);
});

test("factor array enumerates only exact factor pairs", () => {
  const state = buildFactorArrayState(input);
  assert.ok(state.factorPairs?.length);
  for (const [left, right] of state.factorPairs ?? []) assert.equal(left * right, state.product);
  assert.equal(state.rows * state.columns, state.product);
});

test("factor-pair labels clear the rendered array at every control corner", () => {
  for (const value of [1, 10]) {
    for (const comparison of [1, 10]) {
      const markup = renderPrimary("factor-array", { comparison, value });
      const outline = markup.match(
        /data-viz-name="array outline" x="[^"]+" y="([^"]+)" width="[^"]+" height="([^"]+)"/
      );
      const label = markup.match(/data-viz-name="factor pair label" x="[^"]+" y="([^"]+)"/);
      assert.ok(outline && label, `missing factor layout evidence for ${value}x${comparison}`);
      const outlineBottom = Number(outline[1]) + Number(outline[2]);
      const labelTop = Number(label[1]) - 12;
      assert.ok(labelTop >= outlineBottom + 4, `factor label overlaps array for ${value}x${comparison}`);
    }
  }
});

test("decimal product area uses tenths partitions and exact hundredths", () => {
  const state = buildDecimalProductAreaState(input);
  assert.equal(Math.round(state.product * state.scale), state.rows * state.columns);
  assert.equal(state.scale, 100);
});

test("volume layers use the full visible L/W bounds and exact L×W×H cube count", () => {
  const state = buildVolumeLayersState(input);
  assert.equal(state.volume, state.length * state.width * state.height);
  assert.ok(state.length > 0 && state.width > 0 && state.height > 0);
  assert.equal(state.height, Math.abs(state.length - state.width) + 1);
  const explicit = buildVolumeLayersState({ ...input, comparison: 10, height: 9, value: 10 });
  assert.equal(explicit.length, 10);
  assert.equal(explicit.width, 10);
  assert.equal(explicit.height, 9);
  assert.equal(explicit.heightSource, "explicit-visible-control");
  assert.equal(explicit.volume, 900);
});

test("volume mode changes only the visible layers-versus-solid representation", () => {
  const layers = buildVolumeLayersState({ ...input, height: 3, mode: 0 });
  const solid = buildVolumeLayersState({ ...input, height: 3, mode: 1 });
  assert.equal(layers.displayMode, "layers");
  assert.equal(solid.displayMode, "solid");
  assert.deepEqual(
    { height: layers.height, length: layers.length, volume: layers.volume, width: layers.width },
    { height: solid.height, length: solid.length, volume: solid.volume, width: solid.width }
  );
  assert.notEqual(
    renderPrimary("volume-layers", { height: 3, mode: 0 }),
    renderPrimary("volume-layers", { height: 3, mode: 1 })
  );
});

test("area-perimeter rectangle derives cover and boundary from the same dimensions", () => {
  const state = buildAreaPerimeterState(input);
  assert.equal(state.area, state.base * state.height);
  assert.equal(state.perimeter, 2 * (state.base + state.height));
});

test("polygon area is generated from its shown base, height, and shape formula", () => {
  const parallelogram = buildPolygonAreaState({ ...input, mode: 0 });
  const triangle = buildPolygonAreaState({ ...input, mode: 1 });
  const trapezoid = buildPolygonAreaState({ ...input, mode: 2 });
  assert.equal(parallelogram.shape, "parallelogram");
  assert.equal(parallelogram.area, parallelogram.base * parallelogram.height);
  assert.equal(triangle.area, triangle.base * triangle.height / 2);
  assert.equal(trapezoid.area, (trapezoid.base + (trapezoid.topBase ?? 0)) * trapezoid.height / 2);
});

test("every rendered trapezoid has the exact base, top-base, height, and shoelace area declared by state", () => {
  for (let base = 2; base <= 10; base += 1) {
    for (const height of [1, 4, 8]) {
      const state = buildPolygonAreaState({ ...input, comparison: height, mode: 2, value: base });
      const markup = renderPrimary("polygon-area", { comparison: height, mode: 2, value: base });
      const polygon = markup.match(/data-viz-name="polygon area shape"[^>]*points="([^"]+)"/);
      assert.ok(polygon, `missing rendered trapezoid for base=${base}, height=${height}`);
      const points = polygon[1].split(/\s+/).map((entry) => {
        const [x, y] = entry.split(",").map(Number);
        return { x, y };
      });
      assert.equal(points.length, 4);
      const bottomBasePixels = Math.abs(points[1].x - points[0].x);
      const topBasePixels = Math.abs(points[2].x - points[3].x);
      const heightPixels = Math.abs(points[0].y - points[3].y);
      const shoelacePixels = Math.abs(points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0)) / 2;

      assert.equal(bottomBasePixels, state.base * 22);
      assert.equal(topBasePixels, (state.topBase ?? 0) * 22);
      assert.equal(heightPixels, state.height * 18);
      assert.equal(shoelacePixels / (22 * 18), state.area);
    }
  }
});

test("polygon height labels remain outside the filled polygon", () => {
  for (const comparison of [1, 8]) {
    const markup = renderPrimary("polygon-area", { comparison, value: 10 });
    const polygon = markup.match(/data-viz-name="polygon area shape"[^>]*points="([^"]+)"/);
    const label = markup.match(/data-viz-name="polygon height label" x="([^"]+)"/);
    assert.ok(polygon && label, `missing polygon label evidence at height=${comparison}`);
    const right = Math.max(...polygon[1].split(/\s+/).map((point) => Number(point.split(",")[0])));
    assert.ok(Number(label[1]) >= right + 10, `height label remains inside polygon at height=${comparison}`);
  }
});

test("fraction equivalence preserves the exact cross product", () => {
  const state = buildFractionEquivalenceState(input);
  assert.equal(state.numerator * state.resultDenominator, state.resultNumerator * state.denominator);
});

test("generic proper-fraction equivalence reset exposes the exact 4/6 = 8/12 pair", () => {
  const contract = configuredSemanticPrimaryControlContracts["fraction-equivalence"];
  assert.deepEqual(contract.numericControls.map(({ initial }) => initial), [4, 6]);
  const state = buildFractionEquivalenceState({ ...input, comparison: 6, value: 4 });
  assert.deepEqual(
    {
      denominator: state.denominator,
      numerator: state.numerator,
      resultDenominator: state.resultDenominator,
      resultNumerator: state.resultNumerator
    },
    { denominator: 6, numerator: 4, resultDenominator: 12, resultNumerator: 8 }
  );
  const markup = renderPrimary("fraction-equivalence", { comparison: 6, value: 4 });
  assert.match(markup, /data-viz-numerator="4"/);
  assert.match(markup, /data-viz-denominator="6"/);
  assert.match(markup, /data-viz-equivalent-numerator="8"/);
  assert.match(markup, /data-viz-equivalent-denominator="12"/);
  assert.match(markup, /data-viz-equivalent-pair="4\/6=8\/12"/);
});

test("HK P3 raw denominator-minus-one and dynamic numerator cover zero, whole, reset, and every mode", () => {
  const boundaries = [
    { comparison: 0, value: 1, expected: [0, 2, 0, 4] },
    { comparison: 1, value: 1, expected: [1, 2, 2, 4] },
    { comparison: 2, value: 1, expected: [2, 2, 4, 4] },
    { comparison: 4, value: 5, expected: [4, 6, 8, 12] },
    { comparison: 10, value: 9, expected: [10, 10, 20, 20] }
  ] as const;
  for (const mode of [0, 1, 2]) {
    for (const boundary of boundaries) {
      const state = buildFractionEquivalenceState({
        ...input,
        comparison: boundary.comparison,
        mode,
        value: boundary.value,
        variant: "p3-fractions-intro"
      });
      assert.deepEqual(
        [state.numerator, state.denominator, state.resultNumerator, state.resultDenominator],
        boundary.expected
      );
      assert.ok(Number.isFinite(state.numerator));
      assert.ok(Number.isFinite(state.denominator));
      assert.equal(state.displayMode, (["fraction", "equivalent", "compare"] as const)[mode]);
    }
  }

  const nonFinite = buildFractionEquivalenceState({
    ...input,
    comparison: Number.POSITIVE_INFINITY,
    value: Number.NaN,
    variant: "p3-fractions-intro"
  });
  assert.deepEqual(
    [nonFinite.numerator, nonFinite.denominator, nonFinite.resultNumerator, nonFinite.resultDenominator],
    [0, 2, 0, 4]
  );

  const fractionMarkup = renderPrimary("fraction-equivalence", {
    comparison: 4,
    mode: 0,
    value: 5,
    variant: "p3-fractions-intro"
  });
  const equivalentMarkup = renderPrimary("fraction-equivalence", {
    comparison: 4,
    mode: 1,
    value: 5,
    variant: "p3-fractions-intro"
  });
  const compareMarkup = renderPrimary("fraction-equivalence", {
    comparison: 4,
    mode: 2,
    value: 5,
    variant: "p3-fractions-intro"
  });
  assert.match(fractionMarkup, /data-viz-fraction-display-mode="fraction"/);
  assert.match(fractionMarkup, /data-viz-fraction-layer-mode="fraction"/);
  assert.match(equivalentMarkup, /data-viz-fraction-display-mode="equivalent"/);
  assert.match(equivalentMarkup, /data-viz-fraction-layer-mode="equivalent"/);
  assert.match(compareMarkup, /data-viz-fraction-display-mode="compare"/);
  assert.match(compareMarkup, /data-viz-fraction-layer-mode="compare"/);
  for (const markup of [fractionMarkup, equivalentMarkup, compareMarkup]) {
    assert.doesNotMatch(markup, /<g opacity=/u);
  }
  assert.match(fractionMarkup, /data-viz-bar-emphasis="active"/u);
  assert.match(fractionMarkup, /data-viz-bar-emphasis="reference"/u);
  assert.match(equivalentMarkup, /data-viz-bar-emphasis="reference"/u);
  assert.match(equivalentMarkup, /data-viz-bar-emphasis="active"/u);
  assert.match(
    compareMarkup,
    /data-viz-name="whole bar" data-viz-numerator="4" data-viz-denominator="6" data-viz-value="0\.6666666666666666"/
  );
  assert.match(
    compareMarkup,
    /data-viz-name="equivalent bar" data-viz-numerator="8" data-viz-denominator="12" data-viz-value="0\.6666666666666666"/
  );
  assert.notEqual(fractionMarkup, equivalentMarkup);
  assert.notEqual(equivalentMarkup, compareMarkup);
});

test("fraction operations return a reduced exact rational result", () => {
  for (const mode of [0, 1, 2, 3]) {
    const state = buildFractionOperationsState({ ...input, mode });
    const left = state.numerator / state.denominator;
    const right = (state.otherNumerator ?? 0) / (state.otherDenominator ?? 1);
    const expected = state.operation === "+" ? left + right : state.operation === "−" ? left - right : state.operation === "×" ? left * right : left / right;
    close(state.resultNumerator / state.resultDenominator, expected);
    assert.equal(Math.abs(greatestCommonDivisor(state.resultNumerator, state.resultDenominator)), 1);
  }
});

test("fraction operation mode changes only the operator while both operands stay stable", () => {
  const states = [0, 1, 2, 3].map((mode) => buildFractionOperationsState({ ...input, mode }));
  assert.deepEqual(states.map(({ operation }) => operation), ["+", "−", "×", "÷"]);
  assert.equal(new Set(states.map(({ numerator, denominator }) => `${numerator}/${denominator}`)).size, 1);
  assert.equal(new Set(states.map(({ otherNumerator, otherDenominator }) => `${otherNumerator}/${otherDenominator}`)).size, 1);
});

test("specialized fraction-operation variants cannot render a forbidden operator", () => {
  const addSubtract = [0, 1, 2, 3].map((mode) =>
    buildFractionOperationsState({ ...input, mode, variant: "fraction-add-subtract" }).operation
  );
  assert.deepEqual(addSubtract, ["+", "−", "+", "−"]);

  for (const mode of [0, 1, 2, 3]) {
    const multiply = buildFractionOperationsState({ ...input, mode, variant: "fraction-multiply" });
    const divide = buildFractionOperationsState({ ...input, mode, variant: "fraction-divide" });
    assert.equal(multiply.operation, "×");
    assert.equal(divide.operation, "÷");
    assert.match(multiply.formula, / × /u);
    assert.match(divide.formula, / ÷ /u);
    assert.deepEqual(configuredSemanticPrimaryInvariant(multiply).ids, [
      "fraction-denominator-nonzero",
      "fraction-exact-rational"
    ]);
    assert.deepEqual(configuredSemanticPrimaryInvariant(divide).ids, [
      "fraction-denominator-nonzero",
      "fraction-exact-rational"
    ]);
  }

  const markup = renderPrimary("fraction-operations", {
    mode: 3,
    variant: "fraction-divide"
  });
  assert.match(
    markup,
    /data-viz-invariant-ids="fraction-denominator-nonzero,fraction-exact-rational"/u
  );
  assert.match(markup, /data-viz-invariant-status="pass"/u);
  assert.match(
    markup,
    /data-viz-fraction-value-label="true" data-viz-label-placement="above-bar" x="92" y="122" text-anchor="start"/u
  );
});

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : greatestCommonDivisor(right, left % right);
}

test("ratio proportion preserves the multiplicative factor", () => {
  const state = buildRatioProportionState(input);
  assert.equal(state.scaledA, state.a * state.factor);
  assert.equal(state.scaledB, state.b * state.factor);
  assert.equal(state.a * state.scaledB, state.b * state.scaledA);
});

test("percent model keeps fraction, decimal, and percent synchronized", () => {
  const state = buildPercentModelState(input);
  close(state.decimal, state.part / state.whole);
  close(state.percent, state.decimal * 100, 0.05);
});

test("proportional function preserves y over x or x times y for every visible point", () => {
  const direct = buildProportionalFunctionState({ ...input, mode: 0 });
  const inverse = buildProportionalFunctionState({ ...input, mode: 1 });
  for (const point of direct.points) close(point.y / point.x, direct.constant);
  for (const point of inverse.points) close(point.x * point.y, inverse.constant);
});

test("proportional callout stays near its selected point and clears curves, axes, and every point across the full control domain", () => {
  type CalloutLayout = {
    anchor: GeometryPoint;
    box: GeometryRect;
    label: string;
  };
  const layoutBuilder = (primaryMarksModule as unknown as {
    buildProportionalCalloutLayout?: (state: ReturnType<typeof buildProportionalFunctionState>) => CalloutLayout;
  }).buildProportionalCalloutLayout;
  assert.ok(layoutBuilder, "missing pure proportional callout layout builder");

  const chart = { height: 154, left: 156, top: 118, width: 330 };
  const layoutPositions = new Set<string>();
  for (const mode of [0, 1]) {
    for (let value = 1; value <= 8; value += 1) {
      for (let comparison = 1; comparison <= 8; comparison += 1) {
        const state = buildProportionalFunctionState({ ...input, comparison, mode, value });
        const layout: CalloutLayout = layoutBuilder(state);
        const maximumY = Math.max(...state.points.map((point) => point.y), 1);
        const points = state.points.map((point) => ({
          x: chart.left + ((point.x - 1) / 7) * chart.width,
          y: chart.top + chart.height - (point.y / maximumY) * chart.height
        }));
        const selected = points[state.x - 1];
        close(layout.anchor.x, selected.x);
        close(layout.anchor.y, selected.y);
        assert.equal(layout.label, `(${state.x}, ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, useGrouping: false }).format(state.y)})`);
        assert.ok(layout.box.left >= configuredSemanticPrimaryLayout.contentLeft, `${state.proportion}/${value}/${comparison} callout left bound`);
        assert.ok(layout.box.left + layout.box.width <= configuredSemanticPrimaryLayout.contentRight, `${state.proportion}/${value}/${comparison} callout right bound`);
        assert.ok(layout.box.top >= configuredSemanticPrimaryLayout.contentTop, `${state.proportion}/${value}/${comparison} callout top bound`);
        assert.ok(layout.box.top + layout.box.height <= configuredSemanticPrimaryLayout.contentBottom, `${state.proportion}/${value}/${comparison} callout bottom bound`);
        const selectedGap = Math.hypot(
          selected.x - Math.max(layout.box.left, Math.min(selected.x, layout.box.left + layout.box.width)),
          selected.y - Math.max(layout.box.top, Math.min(selected.y, layout.box.top + layout.box.height))
        );
        assert.ok(selectedGap >= 18 && selectedGap <= 72, `${state.proportion}/${value}/${comparison} selected-point gap ${selectedGap}`);

        const pointClearanceBox = expanded(layout.box, 6);
        points.forEach((point, index) => {
          assert.equal(
            pointIntersectsRect(point, index === state.x - 1 ? 12 : 7, pointClearanceBox),
            false,
            `${state.proportion}/${value}/${comparison} callout hits point ${index + 1}`
          );
        });
        const strokeClearanceBox = expanded(layout.box, 9);
        for (let index = 1; index < points.length; index += 1) {
          assert.equal(
            segmentIntersectsRect(points[index - 1], points[index], strokeClearanceBox),
            false,
            `${state.proportion}/${value}/${comparison} callout hits curve segment ${index}`
          );
        }
        assert.equal(
          segmentIntersectsRect(
            { x: chart.left, y: chart.top + chart.height },
            { x: chart.left + chart.width, y: chart.top + chart.height },
            expanded(layout.box, 8)
          ),
          false,
          `${state.proportion}/${value}/${comparison} callout hits x axis`
        );
        assert.equal(
          segmentIntersectsRect(
            { x: chart.left, y: chart.top },
            { x: chart.left, y: chart.top + chart.height },
            expanded(layout.box, 8)
          ),
          false,
          `${state.proportion}/${value}/${comparison} callout hits y axis`
        );
        layoutPositions.add(`${layout.box.left},${layout.box.top}`);
      }
    }
  }
  assert.ok(layoutPositions.size > 2, "callout must move with the selected point rather than stay fixed");
});

test("proportional SSR binds the callout and leader to the selected point", () => {
  for (const mode of [0, 1]) {
    for (const value of [1, 8]) {
      const markup = renderPrimary("proportional-function", { comparison: 8, mode, value });
      const callout = openingTagsByVizName(markup, "selected proportion callout");
      const curve = openingTagsByVizName(markup, "proportion curve");
      const leader = openingTagsByVizName(markup, "selected proportion callout leader");
      const label = textElementByVizName(markup, "selected proportion coordinate");
      assert.equal(callout.length, 1);
      assert.equal(curve.length, 1);
      assert.equal(leader.length, 1);
      assert.equal(attribute(curve[0], "data-viz-overlap-ok"), "true");
      assert.equal(
        attribute(curve[0], "data-viz-overlap-owner"),
        attribute(callout[0], "data-viz-overlap-owner")
      );
      const overlapReason = attribute(curve[0], "data-viz-overlap-reason");
      assert.ok(overlapReason && overlapReason.length > 0);
      assert.equal(
        attribute(curve[0], "data-viz-overlap-reason"),
        attribute(callout[0], "data-viz-overlap-reason")
      );
      assert.equal(attribute(callout[0], "data-viz-selected-x"), String(value));
      assert.ok(Number(attribute(callout[0], "data-viz-callout-width")) > 0);
      assert.ok(Number(attribute(callout[0], "data-viz-callout-height")) > 0);
      assert.equal(attribute(leader[0], "x1"), attribute(callout[0], "data-viz-anchor-x"));
      assert.equal(attribute(leader[0], "y1"), attribute(callout[0], "data-viz-anchor-y"));
      assert.match(label.text, /^\(\d+, [\d.]+\)$/);
    }
  }
});

test("clock time uses six degrees per minute and continuous hour-hand motion", () => {
  const state = buildClockTimeState({ comparison: 30, mode: 0, value: 3, variant: "clock" });
  assert.equal(state.minuteAngle, 6 * state.minute);
  assert.equal(state.hourAngle, 30 * state.hour + 0.5 * state.minute);
  assert.equal(state.hourAngle, 105);
});

test("calendar state respects month length and exact elapsed-day transition", () => {
  const state = buildCalendarModelState({ comparison: 28, mode: 2, value: 2, variant: "calendar" });
  assert.equal(state.monthLength, 29);
  const start = Date.UTC(2024, state.month - 1, state.day);
  const end = Date.UTC(2024, state.endMonth - 1, state.endDay);
  assert.equal((end - start) / 86_400_000, state.elapsedDays);
});

test("calendar state preserves the destination year across a December rollover", () => {
  const state = buildCalendarModelState({ comparison: 31, mode: 0, value: 12, variant: "calendar" });
  assert.equal(state.endYear, 2025);
  const invariant = configuredSemanticPrimaryInvariant(state);
  assert.deepEqual(
    { holds: invariant.holds, left: invariant.left, right: invariant.right },
    { holds: true, left: 31, right: 31 }
  );
});

test("calendar overlap contracts are exact day-cell pairs, never a wrapper exemption", () => {
  const markup = renderPrimary("calendar-model", { comparison: 31, value: 1 });
  const state = buildCalendarModelState({ ...input, comparison: 31, value: 1 });
  const backgrounds = openingTagsByVizName(markup, "calendar day background");
  const labels = openingTagsByVizName(markup, "calendar day label");
  const selectedMarkers = openingTagsByVizName(markup, "calendar selected day marker");
  assert.equal(backgrounds.length, state.monthLength);
  assert.equal(labels.length, state.monthLength);
  assert.equal(selectedMarkers.length, 1);

  for (let day = 1; day <= state.monthLength; day += 1) {
    const background = backgrounds.find((tag) => attribute(tag, "data-viz-day") === String(day));
    const label = labels.find((tag) => attribute(tag, "data-viz-day") === String(day));
    assert.ok(background && label, `missing calendar overlap pair for day ${day}`);
    const owner = `calendar-day-${day}`;
    assert.equal(attribute(background, "data-viz-overlap-ok"), "true");
    assert.equal(attribute(label, "data-viz-overlap-ok"), "true");
    assert.equal(attribute(background, "data-viz-overlap-owner"), owner);
    assert.equal(attribute(label, "data-viz-overlap-owner"), owner);
    assert.ok(attribute(background, "data-viz-overlap-reason")?.trim());
    assert.ok(attribute(label, "data-viz-overlap-reason")?.trim());
  }

  const selectedOwner = `calendar-day-${state.day}`;
  assert.equal(attribute(selectedMarkers[0], "data-viz-overlap-owner"), selectedOwner);
  assert.ok(attribute(selectedMarkers[0], "data-viz-overlap-reason")?.trim());
  assert.equal(attribute(selectedMarkers[0], "data-viz-overlap-ok"), "true");
  const approvedTags = [...markup.matchAll(/<[^>]+data-viz-overlap-ok="true"[^>]*>/g)].map((match) => match[0]);
  assert.equal(approvedTags.length, state.monthLength * 2 + 1);
  assert.ok(approvedTags.every((tag) => /data-viz-name="calendar (?:day background|day label|selected day marker)"/.test(tag)));
  assert.equal(attribute(openingTagsByVizName(markup, "calendar month")[0], "data-viz-overlap-ok"), undefined);
});

test("money denominations sum exactly to the displayed amount", () => {
  const state = buildMoneyModelState(input);
  assert.equal(state.denominationTotal, state.amountCents);
  assert.equal(state.denominations.reduce((sum, item) => sum + item.cents * item.count, 0), state.amountCents);
});

test("measurement model length equals count of visible unit intervals", () => {
  const state = buildMeasurementModelState(input);
  assert.equal(state.physicalLengthMm, (state.unitCount ?? 0) * (state.unitSizeMm ?? 0));
  const alternateUnit = buildMeasurementModelState({ ...input, mode: input.mode + 1 });
  assert.equal(alternateUnit.physicalLengthMm, state.physicalLengthMm);
  assert.notEqual(alternateUnit.unitCount, state.unitCount);
});

test("attribute comparison binds quantity, length, height, and mass to one exact A/B relation", () => {
  const modeContracts = [
    { attribute: "quantity", mark: "comparison quantity groups" },
    { attribute: "length", mark: "comparison length bars" },
    { attribute: "height", mark: "comparison height columns" },
    { attribute: "mass", mark: "comparison mass balance" }
  ] as const;

  for (const [mode, expected] of modeContracts.entries()) {
    const greater = buildAttributeComparisonState({ ...input, comparison: 4, mode, value: 7 });
    assert.equal(greater.attribute, expected.attribute);
    assert.equal(greater.first, 7);
    assert.equal(greater.second, 4);
    assert.equal(greater.relation, ">");
    assert.equal(greater.difference, 3);
    assert.equal(configuredSemanticPrimaryInvariant(greater).holds, true);

    const markup = renderPrimary("attribute-comparison", { comparison: 4, mode, value: 7 });
    assert.match(markup, new RegExp(`data-viz-comparison-attribute="${expected.attribute}"`));
    assert.match(markup, /data-viz-comparison-first="7"/);
    assert.match(markup, /data-viz-comparison-second="4"/);
    assert.match(markup, /data-viz-comparison-relation="&gt;"/);
    assert.match(markup, /data-viz-comparison-difference="3"/);
    assert.match(markup, new RegExp(`data-viz-name="${expected.mark}"`));
  }

  const equal = buildAttributeComparisonState({ ...input, comparison: 4, mode: 0, value: 4 });
  assert.equal(equal.relation, "=");
  assert.equal(equal.difference, 0);
  const less = buildAttributeComparisonState({ ...input, comparison: 8, mode: 0, value: 2 });
  assert.equal(less.relation, "<");
  assert.equal(less.difference, 6);
  assert.equal(new Set(modeContracts.map((_, mode) => visiblePrimaryMarkup("attribute-comparison", { comparison: 4, mode, value: 7 }))).size, 4);
});

test("measurement mode explicitly cycles mm, cm, and dm for one physical length", () => {
  const states = [0, 1, 2].map((mode) => buildMeasurementModelState({ ...input, mode }));
  assert.deepEqual(states.map(({ displayUnit }) => displayUnit), ["mm", "cm", "dm"]);
  assert.deepEqual(states.map(({ unitSizeMm }) => unitSizeMm), [1, 10, 100]);
  assert.equal(new Set(states.map(({ physicalLengthMm }) => physicalLengthMm)).size, 1);
  for (const state of states) close(state.physicalLengthMm ?? 0, (state.unitCount ?? 0) * (state.unitSizeMm ?? 0));
});

test("measurement terminal value and mm/cm/dm unit keep a scale-invariant viewBox gap at every endpoint", () => {
  for (const mode of [0, 1, 2]) {
    for (const value of [0, 12]) {
      for (const comparison of [0, 9]) {
        const markup = renderPrimary("measurement-model", { comparison, mode, value });
        const terminal = textElementByVizName(markup, "measurement terminal value");
        const unit = textElementByVizName(markup, "measurement display unit");
        const ruler = openingTagsByVizName(markup, "measurement ruler")[0];
        const terminalX = Number(attribute(terminal.tag, "x"));
        const terminalFontSize = Number(attribute(terminal.tag, "font-size"));
        const terminalRight = terminalX + terminal.text.length * terminalFontSize * 0.34;
        const unitX = Number(attribute(unit.tag, "x"));
        const unitFontSize = Number(attribute(unit.tag, "font-size"));
        const unitRight = unitX + unit.text.length * unitFontSize * 0.62;
        const rulerEnd = Number(attribute(ruler, "x2"));
        assert.equal(attribute(unit.tag, "text-anchor"), "start");
        assert.ok(unitX - terminalRight >= 8, `${value}/${comparison}/${unit.text}: terminal gap ${unitX - terminalRight}`);
        assert.ok(unitX - rulerEnd >= 16, `${value}/${comparison}/${unit.text}: interval gap ${unitX - rulerEnd}`);
        assert.ok(unitRight <= configuredSemanticPrimaryLayout.contentRight, `${value}/${comparison}/${unit.text}: unit leaves viewBox`);
      }
    }
  }
});

test("measurement estimation keeps estimate, measured value, and signed error distinct", () => {
  const state = buildMeasurementEstimationState(input);
  assert.equal(state.error, (state.estimate ?? 0) - (state.measured ?? 0));
});

test("mass conversion preserves one magnitude across grams, kilograms, and tonnes", () => {
  const state = buildMassUnitConversionState(input);
  close(state.grams, state.kilograms * 1000);
  close(state.grams, state.tonnes * 1_000_000);
});

test("mass representation mode preserves the same physical mass", () => {
  const states = [0, 1, 2].map((mode) => buildMassUnitConversionState({ ...input, mode }));
  assert.equal(new Set(states.map(({ grams }) => grams)).size, 1);
  assert.equal(states[0].grams, 7_004);
  assert.deepEqual(states.map(({ displayUnit }) => displayUnit), ["g", "kg", "t"]);
  assert.equal(new Set([0, 1, 2].map((mode) => renderPrimary("mass-unit-conversion", { mode }))).size, 3);
});

test("primary bar chart total and mean use only visible category counts", () => {
  const state = buildPrimaryBarChartState(input);
  assert.equal(state.total, state.categories?.reduce((sum, category) => sum + category.value, 0));
  close(state.mean, state.total / state.sample.length);
});

test("categorical data bar heights equal their labelled counts", () => {
  const state = buildCategoricalDataState(input);
  assert.deepEqual(state.categories?.map(({ value }) => value), state.sample);
  assert.equal(state.total, state.sample.reduce((sum, value) => sum + value, 0));
});

test("categorical third category is derived from the two visible counts, never from mode", () => {
  const states = [0, 1, 2, 7].map((mode) => buildCategoricalDataState({ ...input, mode }));
  assert.equal(new Set(states.map(({ sample }) => sample[2])).size, 1);
  assert.equal(states[0].sample[2], Math.round((states[0].sample[0] + states[0].sample[1]) / 2));
});

test("raw-data summary computes mean, median, and range from one displayed sample", () => {
  const state = buildRawDataSummaryState(input);
  close(state.mean, state.sample.reduce((sum, value) => sum + value, 0) / state.sample.length);
  const sorted = [...state.sample].sort((a, b) => a - b);
  assert.equal(state.median, sorted[Math.floor(sorted.length / 2)]);
  assert.equal(state.range, Math.max(...state.sample) - Math.min(...state.sample));
});

test("raw-data SSR aggregates duplicate observations into one frequency label", () => {
  const markup = renderToStaticMarkup(createElement(ConfiguredSemanticPrimaryMarks, {
    accent: "#06b6d4",
    comparison: 7,
    family: "raw-data-summary",
    mode: 0,
    value: 7,
    variant: "editable-observations",
    vizTheme: visualizationThemeForTheme("light")
  }));
  assert.match(markup, /data-viz-name="raw observation frequency"/);
  assert.match(markup, /data-viz-observed-count="2"/);
  assert.equal((markup.match(/>7 ×2<\/text>/g) ?? []).length, 1);
});

test("line chart points retain their ordered x-axis and visible values", () => {
  const state = buildLineChartState(input);
  assert.deepEqual(state.points.map(({ x }) => x), [1, 2, 3, 4]);
  assert.deepEqual(state.points.map(({ y }) => y), state.sample);
});

test("seeded probability is reproducible and successes plus failures equals trials", () => {
  const first = buildSeededProbabilityExperimentState(input);
  const second = buildSeededProbabilityExperimentState(input);
  assert.deepEqual(first.sequence, second.sequence);
  assert.equal(first.successes + first.failures, first.trials);
  assert.equal(first.successes, first.sequence.reduce((sum, outcome) => sum + outcome, 0));
});

test("seeded probability maps value to trials and comparison to success probability", () => {
  const experiment = { comparison: 0.3, mode: 0, value: 17, variant: "bernoulli-trials" };
  const first = buildSeededProbabilityExperimentState(experiment);
  const representationOnly = buildSeededProbabilityExperimentState({ ...experiment, mode: 1 });
  assert.equal(first.trials, 17);
  assert.equal(first.probability, 0.3);
  assert.equal(first.seed, representationOnly.seed);
  assert.deepEqual(first.sequence, representationOnly.sequence);
  assert.equal(first.displayMode, "experiment");
  assert.equal(representationOnly.displayMode, "theory");
  assert.notEqual(
    renderPrimary("seeded-probability-experiment", experiment),
    renderPrimary("seeded-probability-experiment", { ...experiment, mode: 1 })
  );
});

test("random-variable probabilities sum to one and moments come from displayed outcomes", () => {
  const state = buildRandomVariableDistributionState(input);
  close(state.probabilitySum, 1);
  close(state.expectedValue, state.outcomes.reduce((sum, outcome) => sum + outcome.value * outcome.probability, 0));
  close(state.variance, state.outcomes.reduce((sum, outcome) => sum + (outcome.value - state.expectedValue) ** 2 * outcome.probability, 0));
});

test("random-variable comparison selects binomial trial count and every outcome is rendered", () => {
  const state = buildRandomVariableDistributionState({ comparison: 5, mode: 0, value: 0.4, variant: "binomial" });
  assert.equal(state.trials, 5);
  assert.equal(state.successProbability, 0.4);
  assert.deepEqual(state.outcomes.map(({ value }) => value), [0, 1, 2, 3, 4, 5]);
  const markup = renderPrimary("random-variable-distribution", { comparison: 5, mode: 0, value: 0.4, variant: "binomial" });
  assert.equal((markup.match(/data-viz-name="random variable outcome"/g) ?? []).length, 6);
});

test("combinatorics counts equal nPr and nCr", () => {
  const state = buildCombinatoricsState(input);
  assert.equal(state.permutations, factorialForTest(state.n) / factorialForTest(state.n - state.r));
  assert.equal(state.combinations, state.permutations / factorialForTest(state.r));
});

test("combinatorics overlap contracts pair only each choice number with its own node circle", () => {
  for (const value of [2, 8]) {
    const markup = renderPrimary("combinatorics", { comparison: 2, value });
    const circles = openingTagsByVizName(markup, "counting choice node");
    const labels = openingTagsByVizName(markup, "counting choice number");
    const branches = openingTagsByVizName(markup, "counting choice branch");
    assert.equal(circles.length, value);
    assert.equal(labels.length, value);
    assert.equal(branches.length, value);
    for (let choice = 1; choice <= value; choice += 1) {
      const circle = circles.find((tag) => attribute(tag, "data-viz-choice") === String(choice));
      const label = labels.find((tag) => attribute(tag, "data-viz-choice") === String(choice));
      assert.ok(circle && label, `missing counting choice overlap pair ${choice}`);
      const owner = `counting-choice-${choice}`;
      assert.equal(attribute(circle, "data-viz-overlap-ok"), "true");
      assert.equal(attribute(label, "data-viz-overlap-ok"), "true");
      assert.equal(attribute(circle, "data-viz-overlap-owner"), owner);
      assert.equal(attribute(label, "data-viz-overlap-owner"), owner);
      assert.ok(attribute(circle, "data-viz-overlap-reason")?.trim());
      assert.ok(attribute(label, "data-viz-overlap-reason")?.trim());
    }
    assert.ok(branches.every((tag) => attribute(tag, "data-viz-overlap-ok") === undefined));
    const approvedTags = [...markup.matchAll(/<[^>]+data-viz-overlap-ok="true"[^>]*>/g)].map((match) => match[0]);
    assert.equal(approvedTags.length, value * 2);
    assert.ok(approvedTags.every((tag) => /data-viz-name="counting choice (?:node|number)"/.test(tag)));
  }
});

function factorialForTest(value: number) {
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
}

test("the family registry is complete, unique, and every builder returns its own family", () => {
  assert.equal(CONFIGURED_SEMANTIC_PRIMARY_MARKS_SOURCE.frozenAuditSha256, "eabf3d1cc09bebc4cf81fe040152c92def6e031b106def1b82088e223554a3ea");
  assert.equal(new Set(configuredSemanticPrimaryFamilies).size, 32);
  assert.deepEqual(Object.keys(configuredSemanticPrimaryStateBuilders), [...configuredSemanticPrimaryFamilies]);
  for (const family of configuredSemanticPrimaryFamilies) {
    const state = buildConfiguredSemanticPrimaryState(family, input);
    assert.equal(state?.family, family);
    assert.ok(state?.formula.length);
    assert.equal(state && configuredSemanticPrimaryInvariant(state).holds, true, `${family} invariant must hold`);
  }
  assert.equal(buildConfiguredSemanticPrimaryState("not-a-family", input), null);
  assert.equal(configuredSemanticPrimaryControlRequirements["fraction-operations"].modeCount, 4);
  assert.deepEqual(configuredSemanticPrimaryControlRequirements["volume-layers"].additionalNumericControls, ["height"]);
});

test("all 32 Primary families expose honest value/comparison bounds and visible min/max state", () => {
  assert.deepEqual(Object.keys(configuredSemanticPrimaryControlContracts), [...configuredSemanticPrimaryFamilies]);
  for (const family of configuredSemanticPrimaryFamilies) {
    const contract = configuredSemanticPrimaryControlContracts[family];
    const [valueControl, comparisonControl, heightControl] = contract.numericControls;
    assert.equal(valueControl.id, "value", `${family} first numeric input`);
    assert.equal(comparisonControl.id, "comparison", `${family} second numeric input`);
    for (const control of contract.numericControls) {
      assert.ok(control.min <= control.initial && control.initial <= control.max, `${family}/${control.role} initial bounds`);
      assert.ok(control.step > 0, `${family}/${control.role} positive step`);
      assert.ok(control.label.en.length > 0 && control.label.zhHans.length > 0, `${family}/${control.role} localized label`);
    }
    const base: SemanticPrimaryBuildInput = {
      comparison: comparisonControl.initial,
      height: heightControl?.initial,
      mode: 0,
      value: valueControl.initial,
      variant: family === "large-whole-number-line" ? "hundreds-domain" : "control-contract"
    };
    const minValueState = buildConfiguredSemanticPrimaryState(family, { ...base, value: valueControl.min });
    const maxValueState = buildConfiguredSemanticPrimaryState(family, { ...base, value: valueControl.max });
    const minComparisonState = buildConfiguredSemanticPrimaryState(family, { ...base, comparison: comparisonControl.min });
    const maxComparisonState = buildConfiguredSemanticPrimaryState(family, { ...base, comparison: comparisonControl.max });
    assert.notDeepEqual(minValueState, maxValueState, `${family} value min/max must change math state`);
    assert.notDeepEqual(minComparisonState, maxComparisonState, `${family} comparison min/max must change math state`);
    assert.notEqual(
      visiblePrimaryMarkup(family, { ...base, value: valueControl.min }),
      visiblePrimaryMarkup(family, { ...base, value: valueControl.max }),
      `${family} value min/max must change visible SSR marks`
    );
    assert.notEqual(
      visiblePrimaryMarkup(family, { ...base, comparison: comparisonControl.min }),
      visiblePrimaryMarkup(family, { ...base, comparison: comparisonControl.max }),
      `${family} comparison min/max must change visible SSR marks`
    );
  }
});

test("every declared Primary mode id produces a distinct visible representation", () => {
  for (const family of configuredSemanticPrimaryFamilies) {
    const contract = configuredSemanticPrimaryControlContracts[family];
    assert.equal(configuredSemanticPrimaryControlRequirements[family].modeCount, contract.modes.length);
    assert.deepEqual(
      configuredSemanticPrimaryControlRequirements[family].additionalNumericControls,
      contract.numericControls.slice(2).map(({ id }) => id)
    );
    if (contract.modes.length === 0) continue;
    const [valueControl, comparisonControl, heightControl] = contract.numericControls;
    const renderedModes = contract.modes.map((_, mode) => visiblePrimaryMarkup(family, {
      comparison: comparisonControl.initial,
      height: heightControl?.initial,
      mode,
      value: valueControl.initial,
      variant: family === "large-whole-number-line" ? "hundreds-domain" : "mode-contract"
    }));
    assert.equal(new Set(renderedModes).size, contract.modes.length, `${family} declared modes must be visibly distinct`);
  }
});

test("representation mode never mutates hidden numeric state for place value, volume, clock, calendar, money, mass, or seeded trials", () => {
  const builders = [
    buildMultiPlaceValueState,
    buildDecimalPlaceValueState,
    buildVolumeLayersState,
    buildClockTimeState,
    buildCalendarModelState,
    buildMoneyModelState,
    buildMassUnitConversionState,
    buildSeededProbabilityExperimentState
  ];
  for (const builder of builders) {
    const first = builder({ ...input, mode: 0 });
    const second = builder({ ...input, mode: 1 });
    const numericState = (state: typeof first) => {
      const { displayMode: _displayMode, displayUnit: _displayUnit, formula: _formula, ...numeric } = state as typeof first & { displayMode?: string; displayUnit?: string };
      return numeric;
    };
    assert.deepEqual(numericState(first), numericState(second), `${first.family} must derive numeric state from visible values`);
  }
});

test("rendered marks expose family, variant, visible formula, and machine-readable state", () => {
  const markup = renderToStaticMarkup(createElement(ConfiguredSemanticPrimaryMarks, {
    accent: "#06b6d4",
    comparison: 4,
    family: "division-remainder-array",
    mode: 2,
    value: 7,
    variant: "quotient-remainder",
    vizTheme: visualizationThemeForTheme("dark")
  }));
  assert.match(markup, /data-viz-mark="true"/);
  assert.match(markup, /data-viz-semantic-family="division-remainder-array"/);
  assert.match(markup, /data-viz-semantic-variant="quotient-remainder"/);
  assert.match(markup, /data-viz-state-json=/);
  assert.match(markup, /data-viz-invariant-status="pass"/);
  assert.match(markup, /data-viz-dividend|data-viz-formula/);
  assert.match(markup, />7 = 1 × 4 \+ 3</);
});

test("the semantic formula uses non-intersecting rails instead of a background overlap", () => {
  const markup = renderPrimary("fraction-equivalence", { comparison: 0, mode: 0, value: 1 });
  const formula = markup.match(/(<g[^>]*data-viz-name="semantic formula"[^>]*>)([\s\S]*?)<\/g>/);
  assert.ok(formula, "missing semantic formula carrier");
  assert.equal(attribute(formula[1], "data-viz-overlap-ok"), undefined);
  assert.equal(formula[2].match(/data-viz-formula-rail="true"/g)?.length, 2);
  assert.equal(formula[2].includes("<rect"), false);
  assert.equal(formula[2].includes("data-viz-overlap-member"), false);
  assert.equal(formula[2].match(/data-viz-label="true"/g)?.length, 1);
});

test("all 32 families render SSR marks and localized word labels remain caller-injectable", () => {
  for (const family of configuredSemanticPrimaryFamilies) {
    const markup = renderToStaticMarkup(createElement(ConfiguredSemanticPrimaryMarks, {
      accent: "#06b6d4",
      comparison: 4,
      family,
      localizedStrings: {
        cubes: "立方單位",
        hundredths: "百分位",
        ones: "個位",
        tenths: "十分位",
        uniqueOutcomes: "不重複結果"
      },
      mode: 2,
      value: 7,
      variant: "audit-contract",
      vizTheme: visualizationThemeForTheme("light")
    }));
    assert.match(markup, new RegExp(`data-viz-semantic-family="${family}"`));
    assert.match(markup, /data-viz-state-json=/);
    assert.match(markup, /data-viz-name="semantic formula"/);
    if (family === "decimal-place-value") assert.doesNotMatch(markup, />ones<|>tenths<|>hundredths</);
    if (family === "combinatorics") assert.doesNotMatch(markup, /unique outcomes/);
  }
});

test("all visible semantic content stays between title clearance and bottom-summary clearance", () => {
  assert.ok(configuredSemanticPrimaryLayout.contentTop >= 104);
  assert.ok(configuredSemanticPrimaryLayout.contentBottom <= 282);
  assert.ok(configuredSemanticPrimaryLayout.formulaY >= configuredSemanticPrimaryLayout.contentBottom);
  assert.ok(configuredSemanticPrimaryLayout.formulaY <= 312);
});
