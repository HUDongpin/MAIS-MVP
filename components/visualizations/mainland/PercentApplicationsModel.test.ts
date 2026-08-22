import assert from "node:assert/strict";
import test from "node:test";

import {
  PERCENT_APPLICATIONS_LAB_IDS,
  PERCENT_APPLICATIONS_MODES,
  PercentApplicationsDomainError,
  buildPercentApplicationsState,
  type PercentApplicationsInput,
} from "./PercentApplicationsModel";

const defaultInput: PercentApplicationsInput = {
  amount: 36,
  base: 240,
  inverseDirection: "increase",
  labId: "bnu-primary-p6-upper-percentage-applications",
  mode: "find-part",
  newValue: 120,
  rateBasisPoints: 1_500,
};

function build(overrides: Partial<PercentApplicationsInput> = {}) {
  return buildPercentApplicationsState({ ...defaultInput, ...overrides });
}

function rational(numerator: number, denominator: number) {
  return { denominator, numerator, text: `${numerator}/${denominator}` };
}

test("the G05 model owns exactly two Mainland percentage-application Labs and seven modes", () => {
  assert.deepEqual(PERCENT_APPLICATIONS_LAB_IDS, [
    "bnu-primary-p6-upper-percentage-applications",
    "pep-primary-p6-upper-percent-fractions",
  ]);
  assert.deepEqual(PERCENT_APPLICATIONS_MODES, [
    "convert",
    "find-part",
    "find-whole",
    "increase",
    "decrease",
    "discount",
    "inverse",
  ]);
});

test("12.5 percent is one exact rate across fraction, decimal, and percent representations", () => {
  const state = build({ mode: "convert", rateBasisPoints: 1_250 });

  assert.deepEqual(state.rate.fraction, rational(1, 8));
  assert.deepEqual(state.rate.decimal, rational(1, 8));
  assert.equal(state.rate.percentText, "12.5%");
  assert.deepEqual(state.visibleReceipt, {
    decimal: rational(1, 8),
    fraction: rational(1, 8),
    kind: "conversion",
    percentText: "12.5%",
  });
});

test("conversion, forward applications, and increases preserve percentages above 100%", () => {
  const conversion = build({ mode: "convert", rateBasisPoints: 12_500 });
  assert.deepEqual(conversion.rate.fraction, rational(5, 4));
  assert.equal(conversion.rate.percentText, "125%");

  const part = build({ base: 200, mode: "find-part", rateBasisPoints: 12_500 });
  assert.deepEqual(part.visibleReceipt.kind === "find-part" && part.visibleReceipt.part, rational(250, 1));

  const increase = build({ base: 80, mode: "increase", rateBasisPoints: 12_500 });
  assert.deepEqual(
    increase.visibleReceipt.kind === "percent-change" && increase.visibleReceipt.newValue,
    rational(180, 1),
  );
});

test("find-part and find-whole are exact forward and inverse percent relationships", () => {
  const part = build({ base: 240, mode: "find-part", rateBasisPoints: 1_500 });
  assert.deepEqual(part.visibleReceipt, {
    base: rational(240, 1),
    kind: "find-part",
    part: rational(36, 1),
    rate: rational(3, 20),
    reconstruction: rational(36, 1),
  });

  const whole = build({ amount: 36, mode: "find-whole", rateBasisPoints: 1_500 });
  assert.deepEqual(whole.visibleReceipt, {
    kind: "find-whole",
    knownPart: rational(36, 1),
    rate: rational(3, 20),
    reconstruction: rational(36, 1),
    whole: rational(240, 1),
  });
});

test("increase and decrease expose original, absolute change, multiplier, and new value", () => {
  const increase = build({ base: 80, mode: "increase", rateBasisPoints: 2_500 });
  assert.deepEqual(increase.visibleReceipt, {
    absoluteChange: rational(20, 1),
    direction: "increase",
    kind: "percent-change",
    multiplier: rational(5, 4),
    newValue: rational(100, 1),
    original: rational(80, 1),
    reconstruction: rational(100, 1),
  });

  const decrease = build({ base: 80, mode: "decrease", rateBasisPoints: 2_500 });
  assert.deepEqual(decrease.visibleReceipt, {
    absoluteChange: rational(20, 1),
    direction: "decrease",
    kind: "percent-change",
    multiplier: rational(3, 4),
    newValue: rational(60, 1),
    original: rational(80, 1),
    reconstruction: rational(60, 1),
  });
});

test("discount keeps the original base, discount amount, and sale price separate", () => {
  const state = build({ base: 250, mode: "discount", rateBasisPoints: 2_000 });
  assert.deepEqual(state.visibleReceipt, {
    discountAmount: rational(50, 1),
    discountRate: rational(1, 5),
    kind: "discount",
    originalPrice: rational(250, 1),
    reconstruction: rational(250, 1),
    salePrice: rational(200, 1),
  });
});

test("inverse mode reconstructs the original after either an increase or a decrease", () => {
  const increased = build({
    inverseDirection: "increase",
    mode: "inverse",
    newValue: 120,
    rateBasisPoints: 2_000,
  });
  assert.deepEqual(increased.visibleReceipt, {
    direction: "increase",
    forwardCheck: rational(120, 1),
    kind: "inverse",
    multiplier: rational(6, 5),
    observedNewValue: rational(120, 1),
    original: rational(100, 1),
  });

  const decreased = build({
    inverseDirection: "decrease",
    mode: "inverse",
    newValue: 80,
    rateBasisPoints: 2_000,
  });
  assert.deepEqual(decreased.visibleReceipt, {
    direction: "decrease",
    forwardCheck: rational(80, 1),
    kind: "inverse",
    multiplier: rational(4, 5),
    observedNewValue: rational(80, 1),
    original: rational(100, 1),
  });
});

test("zero-rate and non-invertible requests fail closed instead of emitting hidden infinities", () => {
  assert.throws(
    () => build({ mode: "find-whole", rateBasisPoints: 0 }),
    (error: unknown) =>
      error instanceof PercentApplicationsDomainError &&
      error.code === "ZERO_RATE",
  );
  assert.throws(
    () =>
      build({
        inverseDirection: "decrease",
        mode: "inverse",
        rateBasisPoints: 10_000,
      }),
    (error: unknown) =>
      error instanceof PercentApplicationsDomainError &&
      error.code === "NON_INVERTIBLE_RATE",
  );
  for (const mode of ["decrease", "discount"] as const) {
    assert.throws(
      () => build({ mode, rateBasisPoints: 10_001 }),
      (error: unknown) =>
        error instanceof PercentApplicationsDomainError &&
        error.code === "APPLICATION_RATE_OUT_OF_RANGE",
    );
  }
});

test("invariants are applicable tri-state receipts rather than N/A receipts marked as passes", () => {
  const discount = build({ mode: "discount" });
  const byId = new Map(discount.invariants.map((receipt) => [receipt.id, receipt]));

  assert.deepEqual(byId.get("fraction-decimal-percent-sync"), {
    applicable: true,
    holds: true,
    id: "fraction-decimal-percent-sync",
    status: "pass",
  });
  assert.deepEqual(byId.get("discount-base-consistency"), {
    applicable: true,
    holds: true,
    id: "discount-base-consistency",
    status: "pass",
  });
  assert.deepEqual(byId.get("percent-change-reconstruction"), {
    applicable: false,
    holds: null,
    id: "percent-change-reconstruction",
    status: "not-applicable",
  });
});

test("an independent exact oracle reconstructs every application mode over the bounded input grid", () => {
  let validStates = 0;
  for (const labId of PERCENT_APPLICATIONS_LAB_IDS) {
    for (const mode of PERCENT_APPLICATIONS_MODES) {
      for (const rateBasisPoints of [0, 1, 125, 1_500, 5_000, 9_999, 10_000]) {
        for (const quantity of [0, 1, 37, 100, 999]) {
          for (const inverseDirection of ["increase", "decrease"] as const) {
            if (mode === "find-whole" && rateBasisPoints === 0) continue;
            if (
              mode === "inverse" &&
              inverseDirection === "decrease" &&
              rateBasisPoints === 10_000
            ) {
              continue;
            }
            const input: PercentApplicationsInput = {
              amount: quantity,
              base: quantity,
              inverseDirection,
              labId,
              mode,
              newValue: quantity,
              rateBasisPoints,
            };
            const state = buildPercentApplicationsState(input);
            const rateNumerator = BigInt(rateBasisPoints);
            const rateDenominator = BigInt(10_000);

            assert.equal(state.rate.basisPoints, rateBasisPoints);
            assert.ok(state.invariants.every(({ holds }) => holds !== false));
            assert.deepEqual(state, buildPercentApplicationsState(input));
            assert.ok(Object.isFrozen(state));
            assert.doesNotThrow(() => JSON.stringify(state));

            switch (state.visibleReceipt.kind) {
              case "conversion":
                assert.equal(
                  BigInt(state.visibleReceipt.fraction.numerator) * rateDenominator,
                  rateNumerator * BigInt(state.visibleReceipt.fraction.denominator),
                );
                break;
              case "find-part":
                assert.equal(
                  BigInt(state.visibleReceipt.part.numerator) *
                    BigInt(state.visibleReceipt.base.denominator) *
                    rateDenominator,
                  BigInt(state.visibleReceipt.base.numerator) *
                    BigInt(state.visibleReceipt.part.denominator) *
                    rateNumerator,
                );
                break;
              case "find-whole":
                assert.equal(
                  BigInt(state.visibleReceipt.knownPart.numerator) *
                    BigInt(state.visibleReceipt.whole.denominator) *
                    rateDenominator,
                  BigInt(state.visibleReceipt.whole.numerator) *
                    BigInt(state.visibleReceipt.knownPart.denominator) *
                    rateNumerator,
                );
                break;
              case "percent-change": {
                const sign =
                  state.visibleReceipt.direction === "increase"
                    ? BigInt(1)
                    : -BigInt(1);
                assert.equal(
                  BigInt(state.visibleReceipt.newValue.numerator) *
                    BigInt(state.visibleReceipt.original.denominator) *
                    rateDenominator,
                  BigInt(state.visibleReceipt.original.numerator) *
                    BigInt(state.visibleReceipt.newValue.denominator) *
                    (rateDenominator + sign * rateNumerator),
                );
                break;
              }
              case "discount":
                assert.equal(
                  BigInt(state.visibleReceipt.originalPrice.numerator) *
                    BigInt(state.visibleReceipt.salePrice.denominator) *
                    BigInt(state.visibleReceipt.discountAmount.denominator),
                  BigInt(state.visibleReceipt.salePrice.numerator) *
                    BigInt(state.visibleReceipt.originalPrice.denominator) *
                    BigInt(state.visibleReceipt.discountAmount.denominator) +
                    BigInt(state.visibleReceipt.discountAmount.numerator) *
                      BigInt(state.visibleReceipt.originalPrice.denominator) *
                      BigInt(state.visibleReceipt.salePrice.denominator),
                );
                break;
              case "inverse": {
                const sign =
                  state.visibleReceipt.direction === "increase"
                    ? BigInt(1)
                    : -BigInt(1);
                assert.equal(
                  BigInt(state.visibleReceipt.observedNewValue.numerator) *
                    BigInt(state.visibleReceipt.original.denominator) *
                    rateDenominator,
                  BigInt(state.visibleReceipt.original.numerator) *
                    BigInt(state.visibleReceipt.observedNewValue.denominator) *
                    (rateDenominator + sign * rateNumerator),
                );
                break;
              }
            }
            validStates += 1;
          }
        }
      }
    }
  }
  assert.equal(validStates, 950);
});

test("invalid IDs, modes, non-integers, unsafe values, and rates outside the bounded exact domain are rejected", () => {
  const invalidRequests: Array<[Partial<PercentApplicationsInput>, string]> = [
    [{ labId: "not-a-lab" as PercentApplicationsInput["labId"] }, "INVALID_LAB_ID"],
    [{ mode: "not-a-mode" as PercentApplicationsInput["mode"] }, "INVALID_MODE"],
    [{ base: 1.5 }, "NON_INTEGER"],
    [{ amount: Number.MAX_SAFE_INTEGER }, "QUANTITY_OUT_OF_RANGE"],
    [{ rateBasisPoints: -1 }, "RATE_OUT_OF_RANGE"],
    [{ rateBasisPoints: 50_001 }, "RATE_OUT_OF_RANGE"],
  ];
  for (const [overrides, code] of invalidRequests) {
    assert.throws(
      () => build(overrides),
      (error: unknown) =>
        error instanceof PercentApplicationsDomainError && error.code === code,
    );
  }
});
