import assert from "node:assert/strict";
import test from "node:test";

import {
  SYMBOLIC_EXPRESSIONS_LAB_IDS,
  SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
  SYMBOLIC_EXPRESSIONS_RESET_INPUTS,
  buildSymbolicExpressionsModel,
  type SymbolicExpressionsInput,
  type SymbolicExpressionsLabId,
  type SymbolicExpressionsMode,
} from "./SymbolicExpressionsModel";
import {
  SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT,
  SymbolicExpressionsControlDomainError,
  auditSymbolicExpressionsControlTransition,
  buildSymbolicExpressionsScenarioInput,
  createSymbolicExpressionsControlDomainState,
  planSymbolicExpressionsControlTransition,
  symbolicExpressionsControlDescriptorFor,
  type SymbolicExpressionsControlDomainState,
  type SymbolicExpressionsScenarioControlId,
} from "./SymbolicExpressionsControlDomain";

const BNU_EXPRESSIONS =
  "bnu-junior-s1-upper-algebraic-expressions" as const;
const BNU_FRACTIONS =
  "bnu-junior-s2-lower-algebraic-fractions-equations" as const;
const HJB_FRACTIONS = "hjb-junior-s1-upper-algebraic-fractions" as const;
const HJB_POLYNOMIALS =
  "hjb-junior-s1-upper-polynomial-add-subtract" as const;
const HJB_SIMPLE =
  "hjb-primary-p6-lower-simple-algebraic-expressions" as const;
const PEP_EQUATIONS =
  "pep-junior-s1-upper-expressions-linear-equations" as const;
const PEP_POLYNOMIALS =
  "pep-junior-s2-upper-polynomials-fractions" as const;

function assertDeepFrozen(value: unknown, path = "root"): void {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${path} is mutable`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${path}.${key}`);
  }
}

function assertJsonSafe(value: unknown): void {
  const encoded = JSON.stringify(value);
  assert.doesNotMatch(encoded, /NaN|Infinity|undefined/u);
  assert.deepEqual(JSON.parse(encoded), value);
}

function assertDomainError(
  callback: () => unknown,
  code: SymbolicExpressionsControlDomainError["code"],
): void {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof SymbolicExpressionsControlDomainError &&
      error.code === code,
  );
}

function withMode(
  state: SymbolicExpressionsControlDomainState,
  mode: SymbolicExpressionsMode,
) {
  return planSymbolicExpressionsControlTransition(state, {
    controllerId: "mode",
    kind: "controller",
    value: mode,
  });
}

function withControl(
  state: SymbolicExpressionsControlDomainState,
  controlId: SymbolicExpressionsScenarioControlId,
  value: number,
) {
  return planSymbolicExpressionsControlTransition(state, {
    controlId,
    kind: "control",
    value,
  });
}

test("declares a versioned exact-seven topic-aware symbolic scenario domain", () => {
  assert.deepEqual(SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT, {
    id: "symbolic-expressions-scenarios-v1",
    labIds: SYMBOLIC_EXPRESSIONS_LAB_IDS,
    modeAllowlists: SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
    version: 1,
  });
  assertDeepFrozen(SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT);

  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    for (const mode of SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]) {
      const descriptor = symbolicExpressionsControlDescriptorFor(labId, mode);
      assert.equal(descriptor.labId, labId);
      assert.equal(descriptor.mode, mode);
      assert.deepEqual(descriptor.requiredControls, descriptor.visibleControls);
      assert.deepEqual(
        descriptor.controls.map(({ controlId }) => controlId),
        descriptor.visibleControls,
      );
      assert.ok(descriptor.controls.length >= 4, `${labId}:${mode}`);
      assert.ok(descriptor.controls.every(({ step }) => step === 1));
      assertDeepFrozen(descriptor);
    }
  }

  assertDomainError(
    () => symbolicExpressionsControlDescriptorFor(HJB_FRACTIONS, "add"),
    "MODE_NOT_ALLOWED",
  );
  assertDomainError(
    () =>
      symbolicExpressionsControlDescriptorFor(
        "unknown" as SymbolicExpressionsLabId,
        "solve",
      ),
    "INVALID_LAB_ID",
  );
});

test("scenario descriptors expose finite learner controls instead of raw polynomial JSON", () => {
  const expectations = [
    [
      BNU_EXPRESSIONS,
      "collect-like-terms",
      ["coefficient-a", "coefficient-b", "coefficient-c", "constant-a"],
    ],
    [
      HJB_POLYNOMIALS,
      "subtract",
      [
        "constant-a",
        "coefficient-a",
        "coefficient-b",
        "constant-b",
        "coefficient-c",
        "coefficient-d",
      ],
    ],
    [
      HJB_SIMPLE,
      "substitute",
      [
        "constant-a",
        "coefficient-a",
        "coefficient-b",
        "value-numerator",
        "value-denominator",
      ],
    ],
    [
      HJB_FRACTIONS,
      "fraction-simplify",
      [
        "constant-a",
        "coefficient-a",
        "excluded-root",
        "domain-numerator",
        "domain-denominator",
      ],
    ],
    [
      BNU_FRACTIONS,
      "solve",
      [
        "constant-a",
        "coefficient-a",
        "constant-b",
        "excluded-root",
        "candidate-numerator",
        "candidate-denominator",
      ],
    ],
    [
      PEP_EQUATIONS,
      "solve",
      [
        "constant-a",
        "coefficient-a",
        "constant-b",
        "candidate-numerator",
        "candidate-denominator",
      ],
    ],
  ] as const;

  for (const [labId, mode, controls] of expectations) {
    const descriptor = symbolicExpressionsControlDescriptorFor(labId, mode);
    assert.deepEqual(descriptor.visibleControls, controls);
    assert.doesNotMatch(
      JSON.stringify(descriptor),
      /json|array|polynomial-vector|raw-input/u,
    );
  }
});

test("every topic reset is reconstructed exactly from finite scenario parameters", () => {
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    const first = createSymbolicExpressionsControlDomainState(labId);
    const second = createSymbolicExpressionsControlDomainState(labId);
    const input = buildSymbolicExpressionsScenarioInput(first);
    assert.deepEqual(input, SYMBOLIC_EXPRESSIONS_RESET_INPUTS[labId], labId);
    assert.deepEqual(first, second, labId);
    assert.notEqual(first, second, labId);
    assert.doesNotThrow(() => buildSymbolicExpressionsModel(input));
    assertDeepFrozen(first);
    assertJsonSafe(first);
  }
});

test("all reviewed modes build an exact model from their bounded scenario surface", () => {
  let observed = 0;
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    const reset = createSymbolicExpressionsControlDomainState(labId);
    for (const mode of SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]) {
      const transition = withMode(reset, mode);
      const input = buildSymbolicExpressionsScenarioInput(transition.expected);
      const model = buildSymbolicExpressionsModel(input);
      assert.equal(model.labId, labId);
      assert.equal(model.mode, mode);
      for (const receipt of model.invariantReceipts) {
        assert.notEqual(
          receipt.status,
          "failed",
          `${labId}:${mode}:${receipt.id}`,
        );
        if (receipt.status === "passed") {
          assert.equal(receipt.applicable, true);
          assert.equal(receipt.holds, true);
        } else {
          assert.equal(receipt.status, "not-applicable");
          assert.equal(receipt.applicable, false);
          assert.equal(receipt.holds, null);
        }
      }
      observed += 1;
    }
  }
  assert.equal(observed, 16);
});

test("mode controllers explicitly project fraction exclusions and persist without resurrection", () => {
  const initial = createSymbolicExpressionsControlDomainState(PEP_POLYNOMIALS);
  const carriedConflict = {
    ...initial,
    domainDenominator: 1,
    domainNumerator: 2,
    excludedRoot: 2,
  } as SymbolicExpressionsControlDomainState;
  const fraction = withMode(carriedConflict, "fraction-simplify");

  assert.equal(fraction.requested.domainNumerator, 2);
  assert.equal(fraction.expected.domainNumerator, 3);
  assert.deepEqual(fraction.projections, [
    {
      affectedControlId: "domain-numerator",
      from: 2,
      projection: "replace-excluded-value",
      reason: "domain-value-cannot-equal-cancelled-factor-root",
      to: 3,
    },
  ]);

  const expanded = withMode(fraction.expected, "expand").expected;
  const fractionAgain = withMode(expanded, "fraction-simplify").expected;
  assert.equal(expanded.domainNumerator, 3);
  assert.equal(fractionAgain.domainNumerator, 3);
});

test("fractional solve mode projects an excluded carried candidate and a degenerate equation only on mode entry", () => {
  const initial = createSymbolicExpressionsControlDomainState(BNU_FRACTIONS);
  const fraction = withMode(initial, "fraction-simplify").expected;
  const degenerate = {
    ...fraction,
    candidateDenominator: 1,
    candidateNumerator: 1,
    coefficientA: 1,
    constantB: 1,
    excludedRoot: 1,
  } as SymbolicExpressionsControlDomainState;
  const solve = withMode(degenerate, "solve");

  assert.deepEqual(solve.projections, [
    {
      affectedControlId: "coefficient-a",
      from: 1,
      projection: "replace-degenerate-value",
      reason: "fractional-linear-equation-needs-a-unique-slope",
      to: 2,
    },
    {
      affectedControlId: "candidate-numerator",
      from: 1,
      projection: "replace-excluded-value",
      reason: "solve-candidate-cannot-equal-denominator-root",
      to: 2,
    },
  ]);
  assert.doesNotThrow(() =>
    buildSymbolicExpressionsModel(
      buildSymbolicExpressionsScenarioInput(solve.expected),
    ),
  );

  const away = withMode(solve.expected, "fraction-simplify").expected;
  const back = withMode(away, "solve").expected;
  assert.equal(back.coefficientA, 2);
  assert.equal(back.candidateNumerator, 2);
  assert.deepEqual(withMode(back, "solve").projections, []);
});

test("fractional solve mode projects a carried equation whose algebraic root is excluded", () => {
  const fraction = withMode(
    createSymbolicExpressionsControlDomainState(BNU_FRACTIONS),
    "fraction-simplify",
  ).expected;
  const carried = {
    ...fraction,
    coefficientA: 2,
    constantA: -2,
    constantB: 1,
    excludedRoot: 1,
  } as SymbolicExpressionsControlDomainState;
  const solve = withMode(carried, "solve");
  assert.deepEqual(solve.projections, [
    {
      affectedControlId: "constant-a",
      from: -2,
      projection: "replace-degenerate-value",
      reason: "fractional-linear-solution-must-respect-domain",
      to: -1,
    },
  ]);
  assert.doesNotThrow(() =>
    buildSymbolicExpressionsModel(
      buildSymbolicExpressionsScenarioInput(solve.expected),
    ),
  );
});

test("direct hidden, noninteger, nonfinite, out-of-range, exclusion, and degenerate requests fail closed", () => {
  const fraction = createSymbolicExpressionsControlDomainState(HJB_FRACTIONS);
  const solve = createSymbolicExpressionsControlDomainState(BNU_FRACTIONS);
  const collect = createSymbolicExpressionsControlDomainState(BNU_EXPRESSIONS);

  assertDomainError(
    () => withControl(collect, "candidate-numerator", 2),
    "CONTROL_NOT_VISIBLE",
  );
  assertDomainError(
    () => withControl(collect, "coefficient-a", 1.5),
    "INVALID_CONTROL_VALUE",
  );
  assertDomainError(
    () => withControl(collect, "coefficient-a", Number.NaN),
    "INVALID_CONTROL_VALUE",
  );
  assertDomainError(
    () => withControl(collect, "coefficient-a", 13),
    "DIRECT_CONTROL_OUT_OF_RANGE",
  );
  assertDomainError(
    () => withControl(fraction, "domain-numerator", 1),
    "MODEL_REJECTED_STATE",
  );
  assertDomainError(
    () => withControl(fraction, "domain-denominator", 0),
    "DIRECT_CONTROL_OUT_OF_RANGE",
  );
  assertDomainError(
    () => withControl(solve, "candidate-numerator", 1),
    "MODEL_REJECTED_STATE",
  );
  assertDomainError(
    () => withControl(solve, "coefficient-a", 1),
    "MODEL_REJECTED_STATE",
  );
});

test("linear solve rejects zero slope and rational denominators stay nonzero", () => {
  const solve = createSymbolicExpressionsControlDomainState(PEP_EQUATIONS);
  assertDomainError(
    () => withControl(solve, "coefficient-a", 0),
    "MODEL_REJECTED_STATE",
  );
  assertDomainError(
    () => withControl(solve, "candidate-denominator", 0),
    "DIRECT_CONTROL_OUT_OF_RANGE",
  );
});

test("transition plans and audits preserve immutable requested/expected/observed evidence", () => {
  const current = createSymbolicExpressionsControlDomainState(HJB_SIMPLE);
  const before = structuredClone(current);
  const plan = withControl(current, "value-numerator", -5);
  assert.deepEqual(current, before);
  assert.equal(plan.requested.valueNumerator, -5);
  assert.equal(plan.expected.valueNumerator, -5);
  assert.deepEqual(plan.projections, []);

  const exact = auditSymbolicExpressionsControlTransition(
    plan,
    structuredClone(plan.expected),
  );
  assert.equal(exact.matchesExpected, true);
  assert.deepEqual(exact.drift, []);
  assertDeepFrozen(plan);
  assertDeepFrozen(exact);
  assertJsonSafe(plan);
  assertJsonSafe(exact);

  const drifted = auditSymbolicExpressionsControlTransition(plan, {
    ...plan.expected,
    valueNumerator: -4,
  });
  assert.equal(drifted.matchesExpected, false);
  assert.deepEqual(drifted.drift, [
    {
      expected: -5,
      key: "valueNumerator",
      observed: -4,
    },
  ]);
});

test("bounded direct scenarios remain model-valid and no direct request can masquerade as a projection", () => {
  const cases: Array<
    readonly [
      SymbolicExpressionsLabId,
      SymbolicExpressionsMode,
      SymbolicExpressionsScenarioControlId,
      readonly number[],
    ]
  > = [
    [BNU_EXPRESSIONS, "collect-like-terms", "coefficient-a", [-12, 0, 12]],
    [HJB_POLYNOMIALS, "add", "constant-b", [-24, 0, 24]],
    [HJB_SIMPLE, "substitute", "value-numerator", [-12, 0, 12]],
    [PEP_POLYNOMIALS, "expand", "constant-a", [-12, 0, 12]],
    [PEP_POLYNOMIALS, "factor", "constant-b", [-12, 0, 12]],
    [HJB_FRACTIONS, "fraction-simplify", "excluded-root", [-6, 0, 6]],
    [PEP_EQUATIONS, "solve", "candidate-numerator", [-12, 0, 12]],
  ];

  let observed = 0;
  for (const [labId, mode, controlId, values] of cases) {
    const active = withMode(
      createSymbolicExpressionsControlDomainState(labId),
      mode,
    ).expected;
    for (const value of values) {
      const plan = withControl(active, controlId, value);
      assert.deepEqual(plan.projections, []);
      assert.doesNotThrow(() =>
        buildSymbolicExpressionsModel(
          buildSymbolicExpressionsScenarioInput(plan.expected),
        ),
      );
      observed += 1;
    }
  }
  assert.equal(observed, 21);
});

test("the old fixed-factor two-control surface cannot satisfy the G07 domain", () => {
  const genericControls = new Set(["value", "comparison"]);
  let incompatibleModes = 0;
  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    for (const mode of SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId]) {
      const descriptor = symbolicExpressionsControlDescriptorFor(labId, mode);
      if (
        descriptor.requiredControls.some(
          (controlId) => !genericControls.has(controlId),
        )
      ) {
        incompatibleModes += 1;
      }
    }
  }
  assert.equal(incompatibleModes, 16);
  assert.notDeepEqual(
    symbolicExpressionsControlDescriptorFor(PEP_POLYNOMIALS, "expand")
      .requiredControls,
    symbolicExpressionsControlDescriptorFor(PEP_POLYNOMIALS, "factor")
      .requiredControls.map(() => "value"),
  );
});

test("invalid controller identities, mode leakage, and corrupt observed state fail closed", () => {
  const current = createSymbolicExpressionsControlDomainState(BNU_EXPRESSIONS);
  assertDomainError(
    () =>
      planSymbolicExpressionsControlTransition(current, {
        controllerId: "other" as "mode",
        kind: "controller",
        value: "add",
      }),
    "INVALID_CONTROLLER",
  );
  assertDomainError(
    () => withMode(current, "solve"),
    "MODE_NOT_ALLOWED",
  );

  const plan = withControl(current, "coefficient-a", 4);
  assertDomainError(
    () =>
      auditSymbolicExpressionsControlTransition(plan, {
        ...plan.expected,
        coefficientA: Number.POSITIVE_INFINITY,
      }),
    "INVALID_STATE",
  );
});

test("scenario input construction preserves its frozen state and never accepts arbitrary arrays", () => {
  const state = createSymbolicExpressionsControlDomainState(BNU_FRACTIONS);
  const before = structuredClone(state);
  const input = buildSymbolicExpressionsScenarioInput(state);
  assert.deepEqual(state, before);
  assert.equal(Array.isArray((state as unknown as { terms?: unknown }).terms), false);
  assert.equal(
    Array.isArray((state as unknown as { polynomial?: unknown }).polynomial),
    false,
  );
  assertDeepFrozen(input);
  assertJsonSafe(input);
  assert.doesNotThrow(() => buildSymbolicExpressionsModel(input as SymbolicExpressionsInput));
});
