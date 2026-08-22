import assert from "node:assert/strict";
import test from "node:test";

import {
  FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT,
  FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR,
  FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
  FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION,
  FractionOperationsDivisorDomainError,
  auditFractionOperationsDivisorTransition,
  createFractionOperationsAcceptedActionReceipt,
  createFractionOperationsRejectedActionReceipt,
  planFractionOperationsDivisorTransition,
  type FractionOperationsDomainRequest,
  type FractionOperationsDomainState,
  type FractionOperationsEvaluatedOperation,
  type FractionOperationsMode,
} from "./FractionOperationsControlDomain";

const state = (
  overrides: Partial<FractionOperationsDomainState> = {},
): FractionOperationsDomainState => ({
  mode: "add",
  evaluatedOperation: "add",
  leftNumerator: 1,
  leftDenominator: 2,
  rightNumerator: 0,
  rightDenominator: 3,
  ...overrides,
});

const controller = (
  mode: FractionOperationsMode,
  evaluatedOperation: FractionOperationsEvaluatedOperation,
): FractionOperationsDomainRequest => ({
  kind: "controller",
  mode,
  evaluatedOperation,
});

const assertDomainError = (
  action: () => unknown,
  code: FractionOperationsDivisorDomainError["code"],
) => {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof FractionOperationsDivisorDomainError);
    assert.equal(error.code, code);
    return true;
  });
};

const assertDeepFrozen = (value: unknown): void => {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
};

test("publishes the exact versioned divisor domain descriptor without a global numerator clamp", () => {
  assert.equal(
    FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
    "fraction-operations-divisor-nonzero-v1",
  );
  assert.equal(FRACTION_OPERATIONS_DIVISOR_DOMAIN_VERSION, 1);
  assert.deepEqual(FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR, {
    domainId: "fraction-operations-divisor-nonzero-v1",
    domainVersion: 1,
    kind: "projected",
    controllerInputs: ["mode", "evaluated-operation"],
    affectedControlIds: ["right-numerator"],
    projection: "exclude-zero",
    projectionReason: "division-divisor-cannot-be-zero",
    denominatorBounds: {
      "left-denominator": { minimum: 1, maximum: 24, step: 1 },
      "right-denominator": { minimum: 1, maximum: 24, step: 1 },
    },
    unresolvedDomains: ["signed-physical-interpretation", "proper-area-model"],
  });
  assert.equal("numeratorBounds" in FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR, false);
  assertDeepFrozen(FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR);
});

test("entering divide is the sole declared raw 0 to 1 dependency projection", () => {
  const plan = planFractionOperationsDivisorTransition(
    state({ rightNumerator: 0 }),
    controller("divide", "divide"),
  );

  assert.deepEqual(plan.requested, state({
    mode: "divide",
    evaluatedOperation: "divide",
    rightNumerator: 0,
  }));
  assert.deepEqual(plan.expected, state({
    mode: "divide",
    evaluatedOperation: "divide",
    rightNumerator: 1,
  }));
  assert.deepEqual(plan.projections, [{
    domainId: "fraction-operations-divisor-nonzero-v1",
    affectedControlId: "right-numerator",
    before: 0,
    after: 1,
    projection: "exclude-zero",
    reason: "division-divisor-cannot-be-zero",
    controllerInputs: {
      mode: "divide",
      evaluatedOperation: "divide",
    },
  }]);
  assertDeepFrozen(plan);
  assert.doesNotThrow(() => JSON.stringify(plan));
});

test("an estimate controller evaluated as divide uses the same exact projection", () => {
  const plan = planFractionOperationsDivisorTransition(
    state(),
    controller("estimate", "divide"),
  );

  assert.equal(plan.requested.mode, "estimate");
  assert.equal(plan.requested.evaluatedOperation, "divide");
  assert.equal(plan.requested.rightNumerator, 0);
  assert.equal(plan.expected.rightNumerator, 1);
  assert.equal(plan.projections.length, 1);
});

test("projected divisor state persists across later mode changes and never resurrects zero", () => {
  const enteredDivide = planFractionOperationsDivisorTransition(
    state({ rightNumerator: 0 }),
    controller("divide", "divide"),
  );
  const leftDivide = planFractionOperationsDivisorTransition(
    enteredDivide.expected,
    controller("add", "add"),
  );
  const reenteredDivide = planFractionOperationsDivisorTransition(
    leftDivide.expected,
    controller("divide", "divide"),
  );

  assert.equal(enteredDivide.expected.rightNumerator, 1);
  assert.equal(leftDivide.expected.rightNumerator, 1);
  assert.equal(reenteredDivide.expected.rightNumerator, 1);
  assert.deepEqual(leftDivide.projections, []);
  assert.deepEqual(reenteredDivide.projections, []);
});

test("direct zero is allowed outside divide but hard rejected in divide without fake projection", () => {
  const outsideDivide = planFractionOperationsDivisorTransition(
    state({ rightNumerator: 7 }),
    { kind: "control", controlId: "right-numerator", value: 0 },
  );
  assert.equal(outsideDivide.expected.rightNumerator, 0);
  assert.deepEqual(outsideDivide.projections, []);

  const enteredDivide = planFractionOperationsDivisorTransition(
    outsideDivide.expected,
    controller("divide", "divide"),
  );
  assert.equal(enteredDivide.expected.rightNumerator, 1);
  assert.equal(enteredDivide.projections.length, 1);

  assertDomainError(
    () => planFractionOperationsDivisorTransition(
      enteredDivide.expected,
      { kind: "control", controlId: "right-numerator", value: 0 },
    ),
    "DIRECT_DIVISOR_ZERO_REQUEST",
  );
});

test("both denominator controls accept every integer 1 through 24 and reject all invalid bounds", () => {
  for (const controlId of ["left-denominator", "right-denominator"] as const) {
    for (let value = 1; value <= 24; value += 1) {
      const plan = planFractionOperationsDivisorTransition(
        state(),
        { kind: "control", controlId, value },
      );
      assert.equal(plan.expected[controlId === "left-denominator" ? "leftDenominator" : "rightDenominator"], value);
      assert.deepEqual(plan.projections, []);
    }

    for (const value of [0, 25, 1.5]) {
      assertDomainError(
        () => planFractionOperationsDivisorTransition(
          state(),
          { kind: "control", controlId, value },
        ),
        value === 1.5 ? "INVALID_INTEGER" : "DENOMINATOR_OUT_OF_RANGE",
      );
    }
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      assertDomainError(
        () => planFractionOperationsDivisorTransition(
          state(),
          { kind: "control", controlId, value },
        ),
        "INVALID_INTEGER",
      );
    }
  }
});

test("controller transitions are exhaustive and project exactly the evaluated divide zero cases", () => {
  const ordinaryModes = [
    "equivalence",
    "compare",
    "add",
    "subtract",
    "multiply",
    "divide",
    "simplify",
  ] as const;
  const estimateOperations = ["add", "subtract", "multiply", "divide"] as const;
  const controllers: ReadonlyArray<readonly [FractionOperationsMode, FractionOperationsEvaluatedOperation]> = [
    ...ordinaryModes.map((mode) => [mode, mode] as const),
    ...estimateOperations.map((operation) => ["estimate", operation] as const),
  ];

  for (const [mode, evaluatedOperation] of controllers) {
    for (const rightNumerator of [-7, 0, 9]) {
      for (const denominator of [1, 24]) {
        const plan = planFractionOperationsDivisorTransition(
          state({
            rightNumerator,
            leftDenominator: denominator,
            rightDenominator: denominator,
          }),
          controller(mode, evaluatedOperation),
        );
        const shouldProject = evaluatedOperation === "divide" && rightNumerator === 0;
        assert.equal(plan.expected.rightNumerator, shouldProject ? 1 : rightNumerator);
        assert.equal(plan.projections.length, shouldProject ? 1 : 0);
        assert.equal(plan.expected.mode, mode);
        assert.equal(plan.expected.evaluatedOperation, evaluatedOperation);
      }
    }
  }

  assertDomainError(
    () => planFractionOperationsDivisorTransition(
      state(),
      controller("add", "subtract"),
    ),
    "INVALID_CONTROLLER",
  );
  assertDomainError(
    () => planFractionOperationsDivisorTransition(
      state(),
      controller("estimate", "simplify"),
    ),
    "INVALID_CONTROLLER",
  );
});

test("signed and improper numerators remain untouched outside the explicitly unresolved physical domains", () => {
  const signed = planFractionOperationsDivisorTransition(
    state({ leftNumerator: -31, rightNumerator: -17 }),
    { kind: "control", controlId: "left-numerator", value: -99 },
  );
  assert.equal(signed.expected.leftNumerator, -99);
  assert.equal(signed.expected.rightNumerator, -17);

  const improper = planFractionOperationsDivisorTransition(
    state({ leftDenominator: 2, rightDenominator: 3 }),
    { kind: "control", controlId: "right-numerator", value: 97 },
  );
  assert.equal(improper.expected.rightNumerator, 97);
  assert.deepEqual(improper.projections, []);
});

test("audit receipts retain requested expected and observed states and expose drift fail closed", () => {
  const plan = planFractionOperationsDivisorTransition(
    state(),
    controller("divide", "divide"),
  );
  const exact = auditFractionOperationsDivisorTransition(plan, plan.expected);
  assert.equal(exact.matchesExpected, true);
  assert.deepEqual(exact.requested, plan.requested);
  assert.deepEqual(exact.expected, plan.expected);
  assert.deepEqual(exact.observed, plan.expected);
  assertDeepFrozen(exact);
  assert.doesNotThrow(() => JSON.stringify(exact));

  const drifted = auditFractionOperationsDivisorTransition(
    plan,
    { ...plan.expected, rightNumerator: 2 },
  );
  assert.equal(drifted.matchesExpected, false);
  assert.equal(drifted.requested.rightNumerator, 0);
  assert.equal(drifted.expected.rightNumerator, 1);
  assert.equal(drifted.observed.rightNumerator, 2);
});

test("invalid current states and control payloads fail before producing JSON receipts", () => {
  assertDomainError(
    () => planFractionOperationsDivisorTransition(
      state({ mode: "divide", evaluatedOperation: "divide", rightNumerator: 0 }),
      controller("add", "add"),
    ),
    "INVALID_STATE",
  );
  assertDomainError(
    () => planFractionOperationsDivisorTransition(
      state(),
      { kind: "control", controlId: "left-numerator", value: Number.NaN },
    ),
    "INVALID_INTEGER",
  );
  assertDomainError(
    () => planFractionOperationsDivisorTransition(
      state(),
      { kind: "control", controlId: "right-numerator", value: 1.25 },
    ),
    "INVALID_INTEGER",
  );
});

test("versioned action receipts discriminate fresh accepted and rejected requests", () => {
  assert.deepEqual(FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT, {
    domainId: "fraction-operations-divisor-nonzero-v1",
    id: "fraction-operations-action-receipt-v1",
    version: 1,
  });
  assert.equal(typeof createFractionOperationsAcceptedActionReceipt, "function");
  assert.equal(typeof createFractionOperationsRejectedActionReceipt, "function");
  const before = state({ rightNumerator: 0 });
  const plan = planFractionOperationsDivisorTransition(
    before,
    controller("estimate", "divide"),
  );
  const accepted = createFractionOperationsAcceptedActionReceipt({
    before,
    expected: plan.expected,
    observed: plan.expected,
    projections: plan.projections,
    request: plan.request,
    requested: plan.requested,
  });
  assert.deepEqual(accepted, {
    accepted: true,
    before,
    domainId: "fraction-operations-divisor-nonzero-v1",
    domainVersion: 1,
    expected: plan.expected,
    matchesExpected: true,
    observed: plan.expected,
    projections: plan.projections,
    rejection: null,
    request: plan.request,
    requested: plan.requested,
    requestedValidity: "requires-projection",
    status: "accepted",
    version: "fraction-operations-action-receipt-v1",
  });
  assertDeepFrozen(accepted);

  const divideState = plan.expected;
  const rejectedRequest = {
    controlId: "right-numerator",
    kind: "control",
    value: 0,
  } as const satisfies FractionOperationsDomainRequest;
  const rejected = createFractionOperationsRejectedActionReceipt({
    before: divideState,
    rejection: "DIRECT_DIVISOR_ZERO_REQUEST",
    request: rejectedRequest,
  });
  assert.deepEqual(rejected, {
    accepted: false,
    before: divideState,
    domainId: "fraction-operations-divisor-nonzero-v1",
    domainVersion: 1,
    expected: divideState,
    matchesExpected: true,
    observed: divideState,
    projections: [],
    rejection: "DIRECT_DIVISOR_ZERO_REQUEST",
    request: rejectedRequest,
    requested: { ...divideState, rightNumerator: 0 },
    requestedValidity: "rejected-invalid",
    status: "rejected",
    version: "fraction-operations-action-receipt-v1",
  });
  assertDeepFrozen(rejected);
  assert.notDeepEqual(rejected, accepted);
});

test("action receipt factories reject self-reported planner drift and unsupported rejection shapes", () => {
  const before = state({ rightNumerator: 0 });
  const dividePlan = planFractionOperationsDivisorTransition(
    before,
    controller("divide", "divide"),
  );
  assertDomainError(
    () => createFractionOperationsAcceptedActionReceipt({
      before,
      expected: dividePlan.expected,
      observed: dividePlan.expected,
      projections: [],
      request: dividePlan.request,
      requested: dividePlan.requested,
    }),
    "INVALID_STATE",
  );
  assertDomainError(
    () => createFractionOperationsAcceptedActionReceipt({
      before,
      expected: dividePlan.expected,
      observed: dividePlan.expected,
      projections: dividePlan.projections,
      request: controller("add", "add"),
      requested: dividePlan.requested,
    }),
    "INVALID_STATE",
  );
  assertDomainError(
    () => createFractionOperationsRejectedActionReceipt({
      before: state({ rightNumerator: 1 }),
      rejection: "DIRECT_DIVISOR_ZERO_REQUEST",
      request: {
        controlId: "right-numerator",
        kind: "control",
        value: 0,
      },
    }),
    "INVALID_STATE",
  );
});
