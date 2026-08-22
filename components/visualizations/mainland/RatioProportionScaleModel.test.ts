import assert from "node:assert/strict";
import test from "node:test";

import {
  RATIO_PROPORTION_SCALE_LAB_ID,
  RATIO_PROPORTION_SCALE_MODES,
  RATIO_PROPORTION_SCALE_MODEL_CONTRACT,
  RatioProportionScaleDomainError,
  buildRatioProportionScaleState,
  resetRatioProportionScaleInput,
  type ExactRatioRational,
  type RatioProportionScaleInput,
} from "./RatioProportionScaleModel";

const LAB_ID = "pep-primary-p6-lower-ratio-proportion-scale" as const;

const defaultInput: RatioProportionScaleInput = {
  actualUnit: "m",
  drawingLength: 5,
  drawingUnit: "cm",
  labId: LAB_ID,
  mode: "equivalent-ratios",
  ratioA: 2,
  ratioB: 3,
  scaleFactor: 4,
};

function build(overrides: Partial<RatioProportionScaleInput> = {}) {
  return buildRatioProportionScaleState({ ...defaultInput, ...overrides });
}

function rational(numerator: number, denominator = 1): ExactRatioRational {
  const divisor = gcd(Math.abs(numerator), denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  return {
    denominator: reducedDenominator,
    numerator: reducedNumerator,
    text: `${reducedNumerator}/${reducedDenominator}`,
  };
}

function gcd(left: number, right: number) {
  let a = left;
  let b = right;
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function multiply(
  left: ExactRatioRational,
  right: ExactRatioRational,
) {
  return rational(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

function equal(left: ExactRatioRational, right: ExactRatioRational) {
  return (
    left.numerator * right.denominator ===
    right.numerator * left.denominator
  );
}

test("G06 owns one exact Lab ID and four explicit mathematical modes", () => {
  assert.equal(RATIO_PROPORTION_SCALE_LAB_ID, LAB_ID);
  assert.deepEqual(RATIO_PROPORTION_SCALE_MODES, [
    "equivalent-ratios",
    "direct-proportion",
    "inverse-proportion",
    "scale-drawing",
  ]);
  assert.deepEqual(RATIO_PROPORTION_SCALE_MODEL_CONTRACT, {
    family: "ratio-proportion-scale",
    version: "ratio-proportion-scale-v1",
  });
});

test("equivalent ratios expose both ratios, the requested factor, and reconstructible cross products", () => {
  const state = build({
    mode: "equivalent-ratios",
    ratioA: 2,
    ratioB: 3,
    scaleFactor: 4,
  });
  assert.deepEqual(state.controls, {
    "drawing-length": 5,
    "ratio-a": 2,
    "ratio-b": 3,
    "scale-factor": 4,
    units: { actual: "m", drawing: "cm" },
  });
  assert.deepEqual(state.visibleReceipt, {
    crossProducts: {
      firstASecondB: rational(24),
      firstBSecondA: rational(24),
    },
    firstRatio: {
      antecedent: rational(2),
      consequent: rational(3),
      text: "2/1:3/1",
    },
    kind: "equivalent-ratios",
    scaleFactor: rational(4),
    secondRatio: {
      antecedent: rational(8),
      consequent: rational(12),
      text: "8/1:12/1",
    },
  });
});

test("direct proportion exposes one exact constant k for both ordered pairs", () => {
  const state = build({
    mode: "direct-proportion",
    ratioA: 3,
    ratioB: 5,
    scaleFactor: 7,
  });
  assert.equal(state.visibleReceipt.kind, "direct-proportion");
  if (state.visibleReceipt.kind !== "direct-proportion") return;
  assert.deepEqual(state.visibleReceipt.firstPair, {
    dependent: rational(5),
    independent: rational(3),
  });
  assert.deepEqual(state.visibleReceipt.secondPair, {
    dependent: rational(35),
    independent: rational(21),
  });
  assert.deepEqual(state.visibleReceipt.scaleFactor, rational(7));
  assert.deepEqual(state.visibleReceipt.constantK, {
    first: rational(5, 3),
    second: rational(5, 3),
  });
  assert.deepEqual(state.visibleReceipt.crossProducts, {
    firstDependentSecondIndependent: rational(105),
    firstIndependentSecondDependent: rational(105),
  });
});

test("inverse proportion exposes reciprocal scaling and one exact product k", () => {
  const state = build({
    mode: "inverse-proportion",
    ratioA: 4,
    ratioB: 9,
    scaleFactor: 6,
  });
  assert.equal(state.visibleReceipt.kind, "inverse-proportion");
  if (state.visibleReceipt.kind !== "inverse-proportion") return;
  assert.deepEqual(state.visibleReceipt.firstPair, {
    first: rational(4),
    second: rational(9),
  });
  assert.deepEqual(state.visibleReceipt.secondPair, {
    first: rational(24),
    second: rational(3, 2),
  });
  assert.deepEqual(state.visibleReceipt.scaleFactor, rational(6));
  assert.deepEqual(state.visibleReceipt.constantProductK, {
    first: rational(36),
    second: rational(36),
  });
});

test("scale drawing converts explicit units and reconstructs the actual dimension", () => {
  const state = build({
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    mode: "scale-drawing",
    scaleFactor: 100,
  });
  assert.equal(state.visibleReceipt.kind, "scale-drawing");
  if (state.visibleReceipt.kind !== "scale-drawing") return;
  assert.deepEqual(state.visibleReceipt, {
    actualDimension: { length: rational(5), unit: "m" },
    actualInDrawingUnits: { length: rational(500), unit: "cm" },
    drawingDimension: { length: rational(5), unit: "cm" },
    kind: "scale-drawing",
    reconstructionInDrawingUnits: rational(500),
    scaleFactor: rational(100),
    scaleRatio: {
      actual: rational(100),
      drawing: rational(1),
    },
    unitConversion: {
      actualUnitInMillimetres: rational(1_000),
      drawingUnitInMillimetres: rational(10),
    },
  });
});

test("every invariant is mode-scoped tri-state and N/A never masquerades as green", () => {
  const invariantForMode = {
    "direct-proportion": "direct-proportion-constant",
    "equivalent-ratios": "equivalent-ratio-cross-products",
    "inverse-proportion": "inverse-proportion-product",
    "scale-drawing": "scale-drawing-unit-conversion",
  } as const;
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    const state = build({ mode });
    assert.equal(state.invariants.length, 4);
    for (const receipt of state.invariants) {
      if (receipt.id === invariantForMode[mode]) {
        assert.deepEqual(receipt, {
          applicable: true,
          holds: true,
          id: invariantForMode[mode],
          status: "pass",
        });
      } else {
        assert.equal(receipt.applicable, false);
        assert.equal(receipt.holds, null);
        assert.equal(receipt.status, "not-applicable");
      }
    }
  }
});

test("an independent oracle reconstructs the bounded ratio and proportion matrices", () => {
  let checked = 0;
  for (const mode of [
    "equivalent-ratios",
    "direct-proportion",
    "inverse-proportion",
  ] as const) {
    for (const ratioA of [1, 2, 7, 31]) {
      for (const ratioB of [1, 3, 11, 29]) {
        for (const scaleFactor of [1, 2, 5, 13]) {
          const state = build({ mode, ratioA, ratioB, scaleFactor });
          const receipt = state.visibleReceipt;
          assert.equal(receipt.kind, mode);
          if (receipt.kind === "equivalent-ratios") {
            assert(equal(receipt.secondRatio.antecedent, multiply(receipt.firstRatio.antecedent, receipt.scaleFactor)));
            assert(equal(receipt.secondRatio.consequent, multiply(receipt.firstRatio.consequent, receipt.scaleFactor)));
            assert(equal(receipt.crossProducts.firstASecondB, receipt.crossProducts.firstBSecondA));
          } else if (receipt.kind === "direct-proportion") {
            assert(equal(receipt.secondPair.independent, multiply(receipt.firstPair.independent, receipt.scaleFactor)));
            assert(equal(receipt.secondPair.dependent, multiply(receipt.firstPair.dependent, receipt.scaleFactor)));
            assert(equal(receipt.constantK.first, receipt.constantK.second));
            assert(equal(receipt.crossProducts.firstDependentSecondIndependent, receipt.crossProducts.firstIndependentSecondDependent));
          } else if (receipt.kind === "inverse-proportion") {
            assert(equal(receipt.secondPair.first, multiply(receipt.firstPair.first, receipt.scaleFactor)));
            assert(equal(receipt.constantProductK.first, receipt.constantProductK.second));
            assert(equal(multiply(receipt.secondPair.first, receipt.secondPair.second), receipt.constantProductK.second));
          }
          checked += 1;
        }
      }
    }
  }
  assert.equal(checked, 192);
});

test("an independent unit oracle reconstructs every bounded scale-drawing conversion", () => {
  const millimetres = { cm: 10, km: 1_000_000, m: 1_000, mm: 1 } as const;
  let checked = 0;
  for (const drawingUnit of ["mm", "cm", "m", "km"] as const) {
    for (const actualUnit of ["mm", "cm", "m", "km"] as const) {
      for (const drawingLength of [1, 3, 25]) {
        for (const scaleFactor of [1, 10, 250]) {
          const state = build({
            actualUnit,
            drawingLength,
            drawingUnit,
            mode: "scale-drawing",
            scaleFactor,
          });
          const receipt = state.visibleReceipt;
          assert.equal(receipt.kind, "scale-drawing");
          if (receipt.kind !== "scale-drawing") continue;
          const expected = rational(
            drawingLength * scaleFactor * millimetres[drawingUnit],
            millimetres[actualUnit],
          );
          assert.deepEqual(receipt.actualDimension.length, expected);
          assert(equal(receipt.reconstructionInDrawingUnits, rational(drawingLength * scaleFactor)));
          checked += 1;
        }
      }
    }
  }
  assert.equal(checked, 144);
});

test("per-mode resets are deterministic, frozen, positive, and model-valid", () => {
  for (const mode of RATIO_PROPORTION_SCALE_MODES) {
    const first = resetRatioProportionScaleInput(mode);
    const second = resetRatioProportionScaleInput(mode);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.equal(first.labId, LAB_ID);
    assert.equal(first.mode, mode);
    assert(first.ratioA > 0);
    assert(first.ratioB > 0);
    assert(first.scaleFactor > 0);
    assert(first.drawingLength > 0);
    assert(Object.isFrozen(first));
    assert.doesNotThrow(() => buildRatioProportionScaleState(first));
  }
});

test("state is deeply frozen, input-preserving, and JSON-safe", () => {
  const input = { ...defaultInput };
  const state = buildRatioProportionScaleState(input);
  input.ratioA = 999;
  input.scaleFactor = 999;
  assert.equal(state.input.ratioA, defaultInput.ratioA);
  assert.equal(state.input.scaleFactor, defaultInput.scaleFactor);
  assert(Object.isFrozen(state));
  assert(Object.isFrozen(state.input));
  assert(Object.isFrozen(state.controls));
  assert(Object.isFrozen(state.controls.units));
  assert(Object.isFrozen(state.visibleReceipt));
  assert(Object.isFrozen(state.invariants));
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(state)));
});

test("zero, noninteger, nonfinite, unsafe, invalid identity, mode, and units fail closed", () => {
  for (const key of [
    "ratioA",
    "ratioB",
    "scaleFactor",
    "drawingLength",
  ] as const) {
    for (const value of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      assert.throws(
        () => build({ [key]: value }),
        RatioProportionScaleDomainError,
      );
    }
  }
  assert.throws(
    () => build({ labId: "wrong-lab" as typeof LAB_ID }),
    (error: unknown) =>
      error instanceof RatioProportionScaleDomainError &&
      error.code === "INVALID_LAB_ID",
  );
  assert.throws(
    () => build({ mode: "no-mode" as "equivalent-ratios" }),
    (error: unknown) =>
      error instanceof RatioProportionScaleDomainError &&
      error.code === "INVALID_MODE",
  );
  assert.throws(
    () => build({ drawingUnit: "inch" as "cm" }),
    (error: unknown) =>
      error instanceof RatioProportionScaleDomainError &&
      error.code === "INVALID_UNIT",
  );
});

test("legacy fixed-factor, two-control, mode-less input cannot self-certify G06", () => {
  const requested = build({
    mode: "equivalent-ratios",
    ratioA: 5,
    ratioB: 8,
    scaleFactor: 3,
  });
  assert.equal(requested.visibleReceipt.kind, "equivalent-ratios");
  if (requested.visibleReceipt.kind === "equivalent-ratios") {
    assert.deepEqual(requested.visibleReceipt.secondRatio.antecedent, rational(15));
    assert.notDeepEqual(requested.visibleReceipt.secondRatio.antecedent, rational(10));
  }

  const legacyTwoControlInput = {
    labId: LAB_ID,
    ratioA: 5,
    ratioB: 8,
  } as unknown as RatioProportionScaleInput;
  assert.throws(
    () => buildRatioProportionScaleState(legacyTwoControlInput),
    RatioProportionScaleDomainError,
  );
});
