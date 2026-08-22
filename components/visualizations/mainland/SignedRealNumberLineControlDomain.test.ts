import assert from "node:assert/strict";
import test from "node:test";
import {
  SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT,
  SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_DESCRIPTORS,
  SignedRealNumberLineControlDomainError,
  createSignedRealNumberLineAcceptedActionReceipt,
  createSignedRealNumberLineControlState,
  createSignedRealNumberLineRejectedActionReceipt,
  getSignedRealNumberLineControlDomainDescriptor,
  observeSignedRealNumberLineControlTransition,
  planSignedRealNumberLineControlTransition,
  type SignedRealNumberLineControlState,
} from "./SignedRealNumberLineControlDomain";
import {
  SIGNED_REAL_NUMBER_LINE_LAB_IDS,
  SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES,
  type SignedRealNumberLineExactMode,
  type SignedRealNumberLineLabId,
} from "./SignedRealNumberLineModel";

function assertDeepFrozen(value: unknown, path = "root"): void {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${path} is mutable`);
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertDeepFrozen(child, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${path}.${key}`);
  }
}

function assertJsonSafe(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path} is not finite`);
    assert.equal(Object.is(value, -0), false, `${path} contains -0`);
    return;
  }
  assert.notEqual(typeof value, "bigint", `${path} contains BigInt`);
  assert.notEqual(typeof value, "undefined", `${path} contains undefined`);
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertJsonSafe(child, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      assertJsonSafe(child, `${path}.${key}`);
    }
  }
}

function assertControlError(
  callback: () => unknown,
  code: SignedRealNumberLineControlDomainError["code"],
) {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof SignedRealNumberLineControlDomainError &&
      error.code === code,
  );
}

test("G03 control-domain contract versions every exact topic and mode descriptor", () => {
  assert.deepEqual(SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_CONTRACT, {
    family: "signed-real-number-line",
    groupId: "G03",
    version: "signed-real-number-line-control-domain-v1",
  });
  assert.deepEqual(
    Object.keys(SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_DESCRIPTORS).sort(),
    [...SIGNED_REAL_NUMBER_LINE_LAB_IDS].sort(),
  );
  let descriptorCount = 0;
  for (const labId of SIGNED_REAL_NUMBER_LINE_LAB_IDS) {
    const modes = SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId].allowedModes;
    assert.deepEqual(
      Object.keys(SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_DESCRIPTORS[labId]).sort(),
      [...modes].sort(),
    );
    for (const mode of modes) {
      const descriptor = getSignedRealNumberLineControlDomainDescriptor(labId, mode);
      assert.equal(descriptor.labId, labId);
      assert.equal(descriptor.mode, mode);
      assert.match(descriptor.domainId, /^signed-real-number-line:[^:]+:[^:]+:v1$/u);
      assert.ok(descriptor.allowedNumberKinds.length > 0);
      assertDeepFrozen(descriptor);
      descriptorCount += 1;
    }
  }
  assert.equal(descriptorCount, 46);
  assertDeepFrozen(SIGNED_REAL_NUMBER_LINE_CONTROL_DOMAIN_DESCRIPTORS);
});

test("learner action receipts are discriminated, full-state, JSON-safe, and deeply frozen", () => {
  const request = {
    control: "value-radicand",
    kind: "control",
    value: 0,
  } as const;
  const before = {
    configuredState: "state:before",
    controlState: { sign: -1, valueRadicand: 5 },
    input: { labId: "bnu-junior-s2-upper-real-numbers", mode: "radical" },
    labId: "bnu-junior-s2-upper-real-numbers",
    mode: "radical",
    pendingRequest: null,
  } as const;
  const requested = {
    ...before,
    pendingRequest: request,
  } as const;
  const expected = {
    ...before,
    configuredState: "state:expected",
    controlState: { sign: 1, valueRadicand: 0 },
  } as const;
  const receipt = createSignedRealNumberLineAcceptedActionReceipt({
    before,
    expected,
    observed: expected,
    projections: [
      {
        affectedControl: "value-sign",
        expectedValue: 1,
        previousValue: -1,
        projection: "canonical-zero-sign",
        reason: "zero-has-no-negative-sign",
      },
    ],
    request,
    requested,
  });

  assert.equal(receipt.status, "accepted");
  assert.equal(receipt.rejection, null);
  assert.deepEqual(receipt.requested.pendingRequest, request);
  assert.deepEqual(receipt.observed, receipt.expected);
  assertDeepFrozen(receipt);
  assertJsonSafe(receipt);
  assert.deepEqual(JSON.parse(JSON.stringify(receipt)), receipt);
});

test("rejected learner action receipts preserve exact request and prove no state mutation", () => {
  const request = {
    control: "value-sign",
    kind: "control",
    value: -1,
  } as const;
  const before = {
    configuredState: "state:zero",
    controlState: { sign: 1, valueRadicand: 0 },
    input: { labId: "hjb-junior-s2-upper-real-numbers", mode: "radical" },
    labId: "hjb-junior-s2-upper-real-numbers",
    mode: "radical",
    pendingRequest: null,
  } as const;
  const receipt = createSignedRealNumberLineRejectedActionReceipt({
    before,
    rejection: "DIRECT_REQUEST_VIOLATES_DOMAIN",
    request,
    requested: { ...before, pendingRequest: request },
  });

  assert.equal(receipt.status, "rejected");
  assert.equal(receipt.rejection, "DIRECT_REQUEST_VIOLATES_DOMAIN");
  assert.deepEqual(receipt.expected, before);
  assert.deepEqual(receipt.observed, before);
  assert.deepEqual(receipt.projections, []);
  assertDeepFrozen(receipt);
  assertJsonSafe(receipt);

  assert.throws(
    () =>
      createSignedRealNumberLineAcceptedActionReceipt({
        before,
        expected: before,
        observed: { ...before, configuredState: "stale-observed-state" },
        projections: [],
        request,
        requested: { ...before, pendingRequest: request },
      }),
    /observed state does not exactly match expected/u,
  );
});

test("radicand zero atomically projects a negative sign to canonical positive and never resurrects it", () => {
  const labId = "bnu-junior-s2-upper-real-numbers" as const;
  const initial = createSignedRealNumberLineControlState(labId, "radical", {
    numberKind: "radical",
    valueSign: -1,
    valueRadicand: 5,
  });
  const zeroPlan = planSignedRealNumberLineControlTransition(initial, {
    control: "value-radicand",
    value: 0,
  });
  assert.equal(zeroPlan.requested.value, 0);
  assert.equal(zeroPlan.expected.valueRadicand, 0);
  assert.equal(zeroPlan.expected.valueSign, 1);
  assert.deepEqual(zeroPlan.projections, [
    {
      affectedControl: "value-sign",
      previousValue: -1,
      expectedValue: 1,
      projection: "canonical-zero-sign",
      reason: "zero-has-no-negative-sign",
    },
  ]);
  const zeroReceipt = observeSignedRealNumberLineControlTransition(
    zeroPlan,
    zeroPlan.expected,
  );
  assert.deepEqual(zeroReceipt.observed, zeroPlan.expected);
  assert.equal(zeroReceipt.status, "pass");

  const raisedPlan = planSignedRealNumberLineControlTransition(
    zeroReceipt.observed,
    { control: "value-radicand", value: 9 },
  );
  assert.equal(raisedPlan.expected.valueRadicand, 9);
  assert.equal(raisedPlan.expected.valueSign, 1);
  assert.deepEqual(raisedPlan.projections, []);
  const raisedReceipt = observeSignedRealNumberLineControlTransition(
    raisedPlan,
    raisedPlan.expected,
  );
  assert.equal(raisedReceipt.observed.valueSign, 1);
});

test("direct negative-sign-at-zero and all silent clamps fail closed", () => {
  const state = createSignedRealNumberLineControlState(
    "hjb-junior-s2-upper-real-numbers",
    "radical",
    { numberKind: "radical", valueSign: 1, valueRadicand: 0 },
  );
  assertControlError(
    () =>
      planSignedRealNumberLineControlTransition(state, {
        control: "value-sign",
        value: -1,
      }),
    "DIRECT_REQUEST_VIOLATES_DOMAIN",
  );
  assertControlError(
    () =>
      planSignedRealNumberLineControlTransition(state, {
        control: "value-radicand",
        value: 50_001,
      }),
    "CONTROL_VALUE_OUT_OF_DOMAIN",
  );
  assertControlError(
    () =>
      planSignedRealNumberLineControlTransition(state, {
        control: "value-radicand",
        value: 2.5,
      }),
    "CONTROL_VALUE_OUT_OF_DOMAIN",
  );
});

test("rational and quadratic-radical division enforce nonzero divisors without silent direct projection", () => {
  const rational = createSignedRealNumberLineControlState(
    "pep-junior-s1-upper-rational-numbers",
    "multiply",
    { rightRationalNumerator: 0 },
  );
  const rationalModePlan = planSignedRealNumberLineControlTransition(rational, {
    control: "mode",
    value: "divide",
  });
  assert.equal(rationalModePlan.expected.mode, "divide");
  assert.equal(rationalModePlan.expected.rightRationalNumerator, 1);
  assert.deepEqual(rationalModePlan.projections, [
    {
      affectedControl: "right-rational-numerator",
      previousValue: 0,
      expectedValue: 1,
      projection: "exclude-zero-divisor",
      reason: "division-requires-nonzero-rational-divisor",
    },
  ]);
  const rationalDivide = observeSignedRealNumberLineControlTransition(
    rationalModePlan,
    rationalModePlan.expected,
  ).observed;
  assertControlError(
    () =>
      planSignedRealNumberLineControlTransition(rationalDivide, {
        control: "right-rational-numerator",
        value: 0,
      }),
    "DIRECT_REQUEST_VIOLATES_DOMAIN",
  );

  const radical = createSignedRealNumberLineControlState(
    "hjb-junior-s2-upper-quadratic-radicals",
    "radical-multiply",
    {
      numberKind: "quadratic-surd",
      rightSurdCoefficientNumerator: 0,
      rightSurdRadicand: 0,
    },
  );
  const radicalModePlan = planSignedRealNumberLineControlTransition(radical, {
    control: "mode",
    value: "radical-divide",
  });
  assert.equal(radicalModePlan.expected.rightSurdCoefficientNumerator, 1);
  assert.equal(radicalModePlan.expected.rightSurdRadicand, 1);
  assert.equal(radicalModePlan.projections.length, 2);
  const radicalDivide = observeSignedRealNumberLineControlTransition(
    radicalModePlan,
    radicalModePlan.expected,
  ).observed;
  for (const request of [
    { control: "right-surd-coefficient-numerator", value: 0 },
    { control: "right-surd-radicand", value: 0 },
  ] as const) {
    assertControlError(
      () => planSignedRealNumberLineControlTransition(radicalDivide, request),
      "DIRECT_REQUEST_VIOLATES_DOMAIN",
    );
  }
});

test("mode and number-kind controllers are topic-aware and deterministic", () => {
  const real = createSignedRealNumberLineControlState(
    "bnu-junior-s2-upper-real-numbers",
    "locate",
    { numberKind: "rational" },
  );
  const radicalKindPlan = planSignedRealNumberLineControlTransition(real, {
    control: "number-kind",
    value: "radical",
  });
  assert.equal(radicalKindPlan.expected.numberKind, "radical");
  assert.equal(radicalKindPlan.expected.mode, "locate");

  const rootModePlan = planSignedRealNumberLineControlTransition(
    radicalKindPlan.expected,
    { control: "mode", value: "square-root" },
  );
  assert.equal(rootModePlan.expected.mode, "square-root");
  assert.equal(rootModePlan.expected.numberKind, "radical");

  assertControlError(
    () =>
      planSignedRealNumberLineControlTransition(real, {
        control: "mode",
        value: "multiply",
      }),
    "MODE_NOT_ALLOWED_FOR_TOPIC",
  );
  const rational = createSignedRealNumberLineControlState(
    "bnu-junior-s1-upper-rational-numbers",
    "locate",
  );
  assertControlError(
    () =>
      planSignedRealNumberLineControlTransition(rational, {
        control: "number-kind",
        value: "radical",
      }),
    "NUMBER_KIND_NOT_ALLOWED",
  );
});

test("requested, expected, and observed receipts reject undeclared DOM clamps", () => {
  const state = createSignedRealNumberLineControlState(
    "bnu-junior-s2-upper-real-numbers",
    "radical",
    { numberKind: "radical", valueSign: 1, valueRadicand: 7 },
  );
  const plan = planSignedRealNumberLineControlTransition(state, {
    control: "value-radicand",
    value: 9,
  });
  assertControlError(
    () =>
      observeSignedRealNumberLineControlTransition(plan, {
        ...plan.expected,
        valueRadicand: 8,
      }),
    "OBSERVED_STATE_MISMATCH",
  );
  const receipt = observeSignedRealNumberLineControlTransition(
    plan,
    plan.expected,
  );
  assert.equal(receipt.requested.control, "value-radicand");
  assert.equal(receipt.expected.valueRadicand, 9);
  assert.equal(receipt.observed.valueRadicand, 9);
  assert.equal(receipt.status, "pass");
  assertDeepFrozen(receipt);
  assertJsonSafe(receipt);
  assert.deepEqual(JSON.parse(JSON.stringify(receipt)), receipt);
});

test("bounded exhaustive zero-sign and mode transitions never resurrect hidden state", () => {
  let observed = 0;
  for (const labId of [
    "bnu-junior-s2-upper-real-numbers",
    "hjb-junior-s2-upper-real-numbers",
  ] as const) {
    for (const sign of [-1, 1] as const) {
      for (let radicand = 0; radicand <= 64; radicand += 1) {
        const initial = createSignedRealNumberLineControlState(labId, "radical", {
          numberKind: "radical",
          valueSign: radicand === 0 ? 1 : sign,
          valueRadicand: radicand,
        });
        const zeroPlan = planSignedRealNumberLineControlTransition(initial, {
          control: "value-radicand",
          value: 0,
        });
        const zero = observeSignedRealNumberLineControlTransition(
          zeroPlan,
          zeroPlan.expected,
        ).observed;
        assert.equal(zero.valueSign, 1);
        for (const target of [1, 7, 64] as const) {
          const raisedPlan = planSignedRealNumberLineControlTransition(zero, {
            control: "value-radicand",
            value: target,
          });
          const receipt = observeSignedRealNumberLineControlTransition(
            raisedPlan,
            raisedPlan.expected,
          );
          assert.equal(receipt.observed.valueSign, 1);
          assert.equal(receipt.observed.valueRadicand, target);
          assertDeepFrozen(receipt);
          assertJsonSafe(receipt);
          observed += 1;
        }
      }
    }
  }
  assert.equal(observed, 780);
});

test("all allowed topic-mode initial states are valid, frozen, and JSON-safe", () => {
  let observed = 0;
  for (const labId of SIGNED_REAL_NUMBER_LINE_LAB_IDS) {
    for (const mode of SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId]
      .allowedModes as readonly SignedRealNumberLineExactMode[]) {
      const state = createSignedRealNumberLineControlState(labId, mode);
      assert.equal(state.labId, labId);
      assert.equal(state.mode, mode);
      assertDeepFrozen(state);
      assertJsonSafe(state);
      observed += 1;
    }
  }
  assert.equal(observed, 46);
});

void (null as unknown as SignedRealNumberLineControlState);
void (null as unknown as SignedRealNumberLineLabId);
