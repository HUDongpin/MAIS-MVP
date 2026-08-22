import assert from "node:assert/strict";
import test from "node:test";
import {
  EQUATION_INEQUALITY_SYSTEM_COMPOSITE_STRANDS,
  EQUATION_INEQUALITY_SYSTEM_DOMAIN,
  EQUATION_INEQUALITY_SYSTEM_LAB_IDS,
  EQUATION_INEQUALITY_SYSTEM_MODE_ALLOWLIST,
  EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT,
  EQUATION_INEQUALITY_SYSTEM_MODES,
  EQUATION_INEQUALITY_SYSTEM_RESET_INPUTS,
  EquationInequalitySystemDomainError,
  buildEquationInequalitySystemModel,
  buildEquationInequalitySystemResetModel,
  defaultEquationInequalitySystemInputFor,
  type EquationBalanceStep,
  type EquationInequalitySystemInput,
  type EquationInequalitySystemModel,
  type ExactRational,
  type ExactScalarInput,
  type InequalitySystemIntersection,
  type LinearEquationSnapshot,
  type LinearForm,
  type LinearSystemEquation,
} from "./EquationInequalitySystemModel";

const BNU_INEQUALITY_LAB =
  "bnu-junior-s2-lower-inequalities-systems" as const;
const BNU_SYSTEM_LAB = "bnu-junior-s2-upper-linear-systems" as const;
const PEP_MIXED_LAB =
  "pep-junior-s1-lower-equations-inequalities-data" as const;
const PEP_DECIMAL_EQUATION_LAB =
  "pep-primary-p5-upper-decimals-equations" as const;

const ZERO: ExactRational = { denominator: 1, numerator: 0, text: "0" };

function decimal(unscaled: number, scale: number): ExactScalarInput {
  return { kind: "decimal", scale, unscaled };
}

function rational(numerator: number, denominator: number): ExactScalarInput {
  return { kind: "rational", denominator, numerator };
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function exact(numerator: number, denominator = 1): ExactRational {
  assert.notEqual(denominator, 0);
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  const normalizedNumerator = (sign * numerator) / divisor;
  const normalizedDenominator = Math.abs(denominator / divisor);
  return {
    denominator: normalizedDenominator,
    numerator: Object.is(normalizedNumerator, -0) ? 0 : normalizedNumerator,
    text:
      normalizedDenominator === 1
        ? String(Object.is(normalizedNumerator, -0) ? 0 : normalizedNumerator)
        : `${Object.is(normalizedNumerator, -0) ? 0 : normalizedNumerator}/${normalizedDenominator}`,
  };
}

function add(left: ExactRational, right: ExactRational): ExactRational {
  return exact(
    left.numerator * right.denominator +
      right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function subtract(left: ExactRational, right: ExactRational): ExactRational {
  return exact(
    left.numerator * right.denominator -
      right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function multiply(left: ExactRational, right: ExactRational): ExactRational {
  return exact(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

function divide(left: ExactRational, right: ExactRational): ExactRational {
  assert.notEqual(right.numerator, 0);
  return exact(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

function negate(value: ExactRational): ExactRational {
  return exact(-value.numerator, value.denominator);
}

function compare(left: ExactRational, right: ExactRational): -1 | 0 | 1 {
  return Math.sign(
    left.numerator * right.denominator -
      right.numerator * left.denominator,
  ) as -1 | 0 | 1;
}

function assertRational(
  actual: ExactRational,
  expected: { numerator: number; denominator?: number },
  message?: string,
) {
  assert.deepEqual(
    actual,
    exact(expected.numerator, expected.denominator ?? 1),
    message,
  );
}

function invariant(model: EquationInequalitySystemModel, id: string) {
  const receipt = model.invariantReceipts.find(
    (candidate) => candidate.id === id,
  );
  assert.ok(receipt, `${model.stateKey}: missing invariant ${id}`);
  assert.equal(receipt.status, "passed", `${model.stateKey}: ${id} status`);
  assert.equal(receipt.applicable, true, `${model.stateKey}: ${id} applicability`);
  assert.equal(receipt.holds, true, `${model.stateKey}: ${id} holds`);
  assert.equal(receipt.passed, true, `${model.stateKey}: ${id}`);
  assert.equal(receipt.exact, true, `${model.stateKey}: ${id} exactness`);
  assert.equal(
    receipt.receiptId,
    `${receipt.scope}:${receipt.owner}:${receipt.id}`,
    `${model.stateKey}: ${id} stable receipt identity`,
  );
  return receipt;
}

function intersectionContainsForTest(
  intersection: InequalitySystemIntersection,
  value: ExactRational,
) {
  if (intersection.kind === "all-real") return true;
  if (intersection.kind === "empty") return false;
  if (intersection.lower) {
    const lowerComparison = compare(value, intersection.lower.value);
    if (
      lowerComparison < 0 ||
      (lowerComparison === 0 && !intersection.lower.closed)
    ) {
      return false;
    }
  }
  if (intersection.upper) {
    const upperComparison = compare(value, intersection.upper.value);
    if (
      upperComparison > 0 ||
      (upperComparison === 0 && !intersection.upper.closed)
    ) {
      return false;
    }
  }
  return true;
}

function integerConstraintHolds(
  coefficient: number,
  relation: "<" | "<=" | ">" | ">=",
  bound: number,
  value: ExactRational,
) {
  const left = multiply(exact(coefficient), value);
  const comparison = compare(left, exact(bound));
  if (relation === "<") return comparison < 0;
  if (relation === "<=") return comparison <= 0;
  if (relation === ">") return comparison > 0;
  return comparison >= 0;
}

function assertDomainError(
  input: unknown,
  code: EquationInequalitySystemDomainError["code"],
) {
  assert.throws(
    () =>
      buildEquationInequalitySystemModel(
        input as EquationInequalitySystemInput,
      ),
    (error: unknown) => {
      assert.ok(error instanceof EquationInequalitySystemDomainError);
      assert.equal(error.code, code);
      return true;
    },
  );
}

function assertEveryNumberIsExactJson(value: unknown, path = "root") {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, path);
    assert.equal(Number.isSafeInteger(value), true, path);
    assert.equal(Object.is(value, -0), false, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertEveryNumberIsExactJson(item, `${path}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      assertEveryNumberIsExactJson(child, `${path}.${key}`);
    }
  }
}

function assertDeepFrozen(value: unknown, seen = new Set<object>()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

function transformLinearForm(
  form: LinearForm,
  step: EquationBalanceStep,
): LinearForm {
  if (step.operation === "subtract-linear-term") {
    return {
      coefficient: subtract(form.coefficient, step.operand),
      constant: form.constant,
    };
  }
  if (step.operation === "subtract-constant") {
    return {
      coefficient: form.coefficient,
      constant: subtract(form.constant, step.operand),
    };
  }
  return {
    coefficient: divide(form.coefficient, step.operand),
    constant: divide(form.constant, step.operand),
  };
}

function assertBalanceStepReconstructs(step: EquationBalanceStep) {
  assert.deepEqual(step.after.left, transformLinearForm(step.before.left, step));
  assert.deepEqual(
    step.after.right,
    transformLinearForm(step.before.right, step),
  );
  assert.equal(step.appliedEqually, true);
}

function equationSnapshot(
  leftCoefficient: number,
  leftConstant: number,
  rightCoefficient: number,
  rightConstant: number,
): LinearEquationSnapshot {
  return {
    left: {
      coefficient: exact(leftCoefficient),
      constant: exact(leftConstant),
    },
    right: {
      coefficient: exact(rightCoefficient),
      constant: exact(rightConstant),
    },
  };
}

test("G08 contract freezes the exact four-ID partition and curriculum-derived strand allowlists", () => {
  assert.deepEqual(EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT, {
    family: "algebra-solver-suite",
    groupId: "G08",
    version: "equation-inequality-system-v1",
  });
  assert.deepEqual(EQUATION_INEQUALITY_SYSTEM_LAB_IDS, [
    BNU_INEQUALITY_LAB,
    BNU_SYSTEM_LAB,
    PEP_MIXED_LAB,
    PEP_DECIMAL_EQUATION_LAB,
  ]);
  assert.deepEqual(EQUATION_INEQUALITY_SYSTEM_MODES, [
    "equation",
    "decimal-operation",
    "inequality",
    "inequality-system",
    "substitution",
    "elimination",
    "graph-intersection",
    "data",
  ]);
  assert.deepEqual(EQUATION_INEQUALITY_SYSTEM_MODE_ALLOWLIST, {
    [BNU_INEQUALITY_LAB]: ["inequality", "inequality-system"],
    [BNU_SYSTEM_LAB]: [
      "substitution",
      "elimination",
      "graph-intersection",
    ],
    [PEP_MIXED_LAB]: [
      "inequality",
      "inequality-system",
      "substitution",
      "elimination",
      "graph-intersection",
      "data",
    ],
    [PEP_DECIMAL_EQUATION_LAB]: ["equation", "decimal-operation"],
  });
  assert.deepEqual(EQUATION_INEQUALITY_SYSTEM_COMPOSITE_STRANDS[PEP_MIXED_LAB], [
    "linear-system",
    "inequality",
    "data",
  ]);
  assert.deepEqual(
    EQUATION_INEQUALITY_SYSTEM_COMPOSITE_STRANDS[PEP_DECIMAL_EQUATION_LAB],
    ["decimal-arithmetic", "equation"],
  );
  assertDeepFrozen(EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT);
  assertDeepFrozen(EQUATION_INEQUALITY_SYSTEM_LAB_IDS);
  assertDeepFrozen(EQUATION_INEQUALITY_SYSTEM_MODE_ALLOWLIST);
  assertDeepFrozen(EQUATION_INEQUALITY_SYSTEM_COMPOSITE_STRANDS);
});

test("every allowed lab/mode pair has a deterministic frozen default that rebuilds the same serialized state", () => {
  let defaultCount = 0;
  for (const labId of EQUATION_INEQUALITY_SYSTEM_LAB_IDS) {
    for (const mode of EQUATION_INEQUALITY_SYSTEM_MODE_ALLOWLIST[labId]) {
      const firstInput = defaultEquationInequalitySystemInputFor(labId, mode);
      const secondInput = defaultEquationInequalitySystemInputFor(labId, mode);
      assert.deepEqual(firstInput, secondInput);
      assert.equal(firstInput.labId, labId);
      assert.equal(firstInput.mode, mode);
      assertDeepFrozen(firstInput);
      const firstModel = buildEquationInequalitySystemModel(firstInput);
      const secondModel = buildEquationInequalitySystemModel(secondInput);
      assert.equal(firstModel.stateKey, secondModel.stateKey);
      assert.deepEqual(firstModel.state, secondModel.state);
      defaultCount += 1;
    }
  }
  assert.equal(defaultCount, 13);
  for (const labId of EQUATION_INEQUALITY_SYSTEM_LAB_IDS) {
    assertDeepFrozen(EQUATION_INEQUALITY_SYSTEM_RESET_INPUTS[labId]);
    const reset = buildEquationInequalitySystemResetModel(labId);
    const direct = buildEquationInequalitySystemModel(
      EQUATION_INEQUALITY_SYSTEM_RESET_INPUTS[labId],
    );
    assert.equal(reset.stateKey, direct.stateKey);
    assert.deepEqual(reset.state, direct.state);
  }
});

test("scaled-decimal equation balance solves 0.3x + 0.2 = 1.1 exactly and every balance step reconstructs", () => {
  const model = buildEquationInequalitySystemModel({
    labId: PEP_DECIMAL_EQUATION_LAB,
    mode: "equation",
    left: {
      coefficient: decimal(3, 1),
      constant: decimal(2, 1),
    },
    right: {
      coefficient: 0,
      constant: decimal(11, 1),
    },
  });
  assert.equal(model.mode, "equation");
  if (model.mode !== "equation") throw new Error("expected equation model");

  assert.equal(model.equation.classification, "unique");
  assertRational(model.equation.effectiveCoefficient, {
    numerator: 3,
    denominator: 10,
  });
  assertRational(model.equation.effectiveConstant, {
    numerator: 9,
    denominator: 10,
  });
  assert.ok(model.equation.solution);
  assertRational(model.equation.solution, { numerator: 3 });
  assert.deepEqual(model.equation.balance.initial, {
    left: {
      coefficient: exact(3, 10),
      constant: exact(1, 5),
    },
    right: {
      coefficient: exact(0),
      constant: exact(11, 10),
    },
  });
  assert.equal(model.equation.balance.steps.length, 3);
  model.equation.balance.steps.forEach(assertBalanceStepReconstructs);
  assert.deepEqual(model.equation.balance.final, {
    left: { coefficient: exact(1), constant: exact(0) },
    right: { coefficient: exact(0), constant: exact(3) },
  });
  assert.ok(model.equation.solutionResidual);
  assertRational(model.equation.solutionResidual.leftValue, { numerator: 11, denominator: 10 });
  assertRational(model.equation.solutionResidual.rightValue, { numerator: 11, denominator: 10 });
  assert.deepEqual(model.equation.solutionResidual.signedResidual, ZERO);
  assert.equal(model.equation.solutionResidual.passed, true);
  assert.deepEqual(model.equation.decimalExactness, {
    commonScale: 1,
    powerOfTen: 10,
    scaledEquation: {
      leftCoefficient: 3,
      leftConstant: 2,
      rightCoefficient: 0,
      rightConstant: 11,
    },
    reconstructs: true,
  });
  invariant(model, "equation-balance");
  invariant(model, "equation-substitution-residual");
  invariant(model, "decimal-scaled-integer-exactness");
});

test("degenerate one-variable equations explicitly classify infinite and no-solution boundaries", () => {
  const infinite = buildEquationInequalitySystemModel({
    labId: PEP_DECIMAL_EQUATION_LAB,
    mode: "equation",
    left: { coefficient: 1, constant: 1 },
    right: { coefficient: 1, constant: 1 },
  });
  const none = buildEquationInequalitySystemModel({
    labId: PEP_DECIMAL_EQUATION_LAB,
    mode: "equation",
    left: { coefficient: 1, constant: 1 },
    right: { coefficient: 1, constant: 2 },
  });
  assert.equal(infinite.mode, "equation");
  assert.equal(none.mode, "equation");
  if (infinite.mode !== "equation" || none.mode !== "equation") {
    throw new Error("expected equation models");
  }
  assert.equal(infinite.equation.classification, "infinite");
  assert.equal(infinite.equation.solution, null);
  assert.equal(infinite.equation.solutionResidual, null);
  assert.equal(infinite.equation.classificationReceipt.reducedStatement, "0 = 0");
  assert.equal(none.equation.classification, "none");
  assert.equal(none.equation.solution, null);
  assert.equal(none.equation.solutionResidual, null);
  assert.equal(none.equation.classificationReceipt.reducedStatement, "0 = 1");
  invariant(infinite, "equation-balance");
  invariant(none, "equation-balance");
});

test("strict and inclusive inequalities expose exact boundary openness, ray direction, and negative-division reversal", () => {
  const cases = [
    {
      input: {
        labId: BNU_INEQUALITY_LAB,
        mode: "inequality" as const,
        left: { coefficient: -2, constant: 5 },
        relation: "<" as const,
        right: { coefficient: 0, constant: 13 },
      },
      boundary: -4,
      relation: ">" as const,
      direction: "right" as const,
      closed: false,
      reversed: true,
    },
    {
      input: {
        labId: BNU_INEQUALITY_LAB,
        mode: "inequality" as const,
        left: { coefficient: -3, constant: 0 },
        relation: ">" as const,
        right: { coefficient: 0, constant: 9 },
      },
      boundary: -3,
      relation: "<" as const,
      direction: "left" as const,
      closed: false,
      reversed: true,
    },
    {
      input: {
        labId: BNU_INEQUALITY_LAB,
        mode: "inequality" as const,
        left: { coefficient: 4, constant: -1 },
        relation: ">=" as const,
        right: { coefficient: 0, constant: 15 },
      },
      boundary: 4,
      relation: ">=" as const,
      direction: "right" as const,
      closed: true,
      reversed: false,
    },
  ];

  for (const item of cases) {
    const model = buildEquationInequalitySystemModel(item.input);
    assert.equal(model.mode, "inequality");
    if (model.mode !== "inequality") throw new Error("expected inequality");
    assert.equal(model.inequality.classification, "ray");
    assert.ok(model.inequality.solutionSet.kind === "ray");
    if (model.inequality.solutionSet.kind !== "ray") {
      throw new Error("expected ray");
    }
    assertRational(model.inequality.solutionSet.boundary, {
      numerator: item.boundary,
    });
    assert.equal(model.inequality.solutionSet.relation, item.relation);
    assert.equal(model.inequality.solutionSet.direction, item.direction);
    assert.equal(model.inequality.solutionSet.endpointClosed, item.closed);
    assert.ok(model.inequality.solveTransformation);
    assert.equal(
      model.inequality.solveTransformation.signReversed,
      item.reversed,
    );
    assert.equal(
      model.inequality.solveTransformation.relationAfter,
      item.relation,
    );
    assert.equal(
      model.inequality.solveTransformation.factorSign,
      item.reversed ? "negative" : "positive",
    );
    assert.equal(model.inequality.probeChecks.length, 3);
    assert.equal(
      model.inequality.probeChecks.every(
        ({ matchesSolutionSet }) => matchesSolutionSet,
      ),
      true,
    );
    const endpointProbe = model.inequality.probeChecks.find(({ role }) =>
      role === "boundary",
    );
    assert.ok(endpointProbe);
    assert.equal(endpointProbe.originalHolds, item.closed);
    assert.equal(endpointProbe.solutionSetContains, item.closed);
    invariant(model, "inequality-endpoint-openness");
    invariant(model, "inequality-sign-reversal");
  }
});

test("negative multiplication and division operation receipts flip exactly once and reconstruct every transformed coefficient", () => {
  for (const operation of ["multiply", "divide"] as const) {
    const model = buildEquationInequalitySystemModel({
      labId: BNU_INEQUALITY_LAB,
      mode: "inequality",
      left: { coefficient: 1, constant: -2 },
      operationStep: { factor: -3, operation },
      relation: "<=" as const,
      right: { coefficient: 0, constant: 4 },
    });
    assert.equal(model.mode, "inequality");
    if (model.mode !== "inequality") throw new Error("expected inequality");
    const proof = model.inequality.operationProof;
    assert.ok(proof);
    assert.equal(proof.operation, operation);
    assert.equal(proof.relationBefore, "<=");
    assert.equal(proof.relationAfter, ">=");
    assert.equal(proof.signReversed, true);
    assert.equal(proof.reconstructionPassed, true);

    const reconstruct = (after: ExactRational) =>
      operation === "multiply"
        ? divide(after, proof.factor)
        : multiply(after, proof.factor);
    assert.deepEqual(
      reconstruct(proof.after.left.coefficient),
      proof.before.left.coefficient,
    );
    assert.deepEqual(
      reconstruct(proof.after.left.constant),
      proof.before.left.constant,
    );
    assert.deepEqual(
      reconstruct(proof.after.right.coefficient),
      proof.before.right.coefficient,
    );
    assert.deepEqual(
      reconstruct(proof.after.right.constant),
      proof.before.right.constant,
    );
  }
});

test("degenerate inequalities classify all-real or empty instead of inventing an endpoint", () => {
  const allReal = buildEquationInequalitySystemModel({
    labId: BNU_INEQUALITY_LAB,
    mode: "inequality",
    left: { coefficient: 1, constant: 1 },
    relation: "<=" as const,
    right: { coefficient: 1, constant: 2 },
  });
  const empty = buildEquationInequalitySystemModel({
    labId: BNU_INEQUALITY_LAB,
    mode: "inequality",
    left: { coefficient: 1, constant: 2 },
    relation: "<" as const,
    right: { coefficient: 1, constant: 2 },
  });
  assert.equal(allReal.mode, "inequality");
  assert.equal(empty.mode, "inequality");
  if (allReal.mode !== "inequality" || empty.mode !== "inequality") {
    throw new Error("expected inequalities");
  }
  assert.equal(allReal.inequality.classification, "all-real");
  assert.deepEqual(allReal.inequality.solutionSet, { kind: "all-real" });
  assert.equal(allReal.inequality.solveTransformation, null);
  assert.equal(empty.inequality.classification, "empty");
  assert.deepEqual(empty.inequality.solutionSet, {
    kind: "empty",
    reason: "constant-statement-false",
  });
  assert.equal(empty.inequality.solveTransformation, null);
});

test("non-terminating rational coefficients stay exact outside the decimal-only equation strand and Unicode relations canonicalize", () => {
  const inequality = buildEquationInequalitySystemModel({
    labId: BNU_INEQUALITY_LAB,
    mode: "inequality",
    left: { coefficient: rational(1, 3), constant: 0 },
    relation: "≤",
    right: { coefficient: 0, constant: rational(2, 3) },
  });
  assert.equal(inequality.mode, "inequality");
  if (inequality.mode !== "inequality") throw new Error("expected inequality");
  assert.equal(inequality.inequality.solutionSet.kind, "ray");
  if (inequality.inequality.solutionSet.kind !== "ray") {
    throw new Error("expected ray");
  }
  assert.equal(inequality.inequality.solutionSet.relation, "<=");
  assert.equal(inequality.inequality.solutionSet.endpointClosed, true);
  assertRational(inequality.inequality.solutionSet.boundary, { numerator: 2 });

  const data = buildEquationInequalitySystemModel({
    dataset: [rational(1, 3), rational(2, 3)],
    labId: PEP_MIXED_LAB,
    mode: "data",
  });
  assert.equal(data.mode, "data");
  if (data.mode !== "data") throw new Error("expected data");
  assertRational(data.data.sum, { numerator: 1 });
  assertRational(data.data.mean, { numerator: 1, denominator: 2 });

  assertDomainError(
    {
      labId: PEP_DECIMAL_EQUATION_LAB,
      left: { coefficient: rational(1, 3), constant: 0 },
      mode: "equation",
      right: { coefficient: 0, constant: 1 },
    },
    "NON_TERMINATING_DECIMAL_COEFFICIENT",
  );
});

test("one-variable inequality systems preserve open/closed intersections and classify an open-touch contradiction", () => {
  const bounded = buildEquationInequalitySystemModel({
    labId: BNU_INEQUALITY_LAB,
    mode: "inequality-system",
    constraints: [
      {
        left: { coefficient: 1, constant: 0 },
        relation: ">" as const,
        right: { coefficient: 0, constant: -2 },
      },
      {
        left: { coefficient: 1, constant: 0 },
        relation: "<=" as const,
        right: { coefficient: 0, constant: 3 },
      },
    ],
  });
  assert.equal(bounded.mode, "inequality-system");
  if (bounded.mode !== "inequality-system") {
    throw new Error("expected inequality system");
  }
  assert.equal(bounded.inequalitySystem.intersection.kind, "interval");
  if (bounded.inequalitySystem.intersection.kind !== "interval") {
    throw new Error("expected interval");
  }
  assert.deepEqual(bounded.inequalitySystem.intersection.lower, {
    closed: false,
    sourceConstraintIndexes: [0],
    value: exact(-2),
  });
  assert.deepEqual(bounded.inequalitySystem.intersection.upper, {
    closed: true,
    sourceConstraintIndexes: [1],
    value: exact(3),
  });

  const contradiction = buildEquationInequalitySystemModel({
    labId: BNU_INEQUALITY_LAB,
    mode: "inequality-system",
    constraints: [
      {
        left: { coefficient: 1, constant: 0 },
        relation: "<" as const,
        right: { coefficient: 0, constant: 1 },
      },
      {
        left: { coefficient: 1, constant: 0 },
        relation: ">=" as const,
        right: { coefficient: 0, constant: 1 },
      },
    ],
  });
  assert.equal(contradiction.mode, "inequality-system");
  if (contradiction.mode !== "inequality-system") {
    throw new Error("expected inequality system");
  }
  assert.deepEqual(contradiction.inequalitySystem.intersection, {
    kind: "empty",
    reason: "open-touch",
  });
  invariant(bounded, "inequality-system-intersection");
  invariant(contradiction, "inequality-system-intersection");
});

const UNIQUE_SYSTEM_EQUATIONS: readonly [
  LinearSystemEquation,
  LinearSystemEquation,
] = [
  { constant: 6, xCoefficient: 1, yCoefficient: 1 },
  { constant: 2, xCoefficient: 1, yCoefficient: -1 },
];

test("linear systems expose exact intersection, elimination, substitution, and two independent zero residuals", () => {
  for (const mode of [
    "substitution",
    "elimination",
    "graph-intersection",
  ] as const) {
    const model = buildEquationInequalitySystemModel({
      equations: UNIQUE_SYSTEM_EQUATIONS,
      labId: BNU_SYSTEM_LAB,
      mode,
    });
    assert.ok(
      model.mode === "substitution" ||
        model.mode === "elimination" ||
        model.mode === "graph-intersection",
    );
    if (
      model.mode !== "substitution" &&
      model.mode !== "elimination" &&
      model.mode !== "graph-intersection"
    ) {
      throw new Error("expected linear system");
    }
    assert.equal(model.system.classification, "unique");
    assertRational(model.system.determinant, { numerator: -2 });
    assert.deepEqual(model.system.intersection, {
      exact: true,
      kind: "exact-rational",
      x: exact(4),
      y: exact(2),
    });
    assert.ok(model.system.solutionResiduals);
    assert.deepEqual(
      [
        model.system.solutionResiduals.first.signedResidual,
        model.system.solutionResiduals.second.signedResidual,
      ],
      [ZERO, ZERO],
    );
    assert.equal(model.system.solutionResiduals.first.passed, true);
    assert.equal(model.system.solutionResiduals.second.passed, true);
    assert.ok(model.system.methodReceipts);

    const elimination = model.system.methodReceipts.elimination;
    assert.equal(elimination.eliminatedVariable, "x");
    assert.deepEqual(
      elimination.combinedEquation.xCoefficient,
      ZERO,
    );
    assert.deepEqual(
      elimination.combinedEquation.yCoefficient,
      add(
        elimination.scaledEquations.first.yCoefficient,
        elimination.scaledEquations.second.yCoefficient,
      ),
    );
    assert.deepEqual(
      elimination.combinedEquation.constant,
      add(
        elimination.scaledEquations.first.constant,
        elimination.scaledEquations.second.constant,
      ),
    );
    assertRational(elimination.solvedValue, { numerator: 2 });
    assert.deepEqual(elimination.reconstructedPoint, {
      x: exact(4),
      y: exact(2),
    });

    const substitution = model.system.methodReceipts.substitution;
    assert.equal(substitution.subject, "x");
    assert.deepEqual(
      substitution.reconstructedPoint,
      { x: exact(4), y: exact(2) },
    );
    const expressionAtOther = add(
      substitution.expression.constant,
      multiply(
        substitution.expression.otherCoefficient,
        substitution.otherValue,
      ),
    );
    assert.deepEqual(expressionAtOther, substitution.subjectValue);
    assert.deepEqual(
      multiply(
        substitution.substitutedEquation.coefficient,
        substitution.otherValue,
      ),
      substitution.substitutedEquation.constant,
    );
    invariant(model, "line-intersection");
    invariant(model, "linear-system-dual-residual");
  }
});

test("candidate residuals keep the two equations separate and reject a one-coordinate perturbation", () => {
  const model = buildEquationInequalitySystemModel({
    candidate: { x: 4, y: 3 },
    equations: UNIQUE_SYSTEM_EQUATIONS,
    labId: BNU_SYSTEM_LAB,
    mode: "substitution",
  });
  assert.equal(model.mode, "substitution");
  if (model.mode !== "substitution") throw new Error("expected system");
  assert.ok(model.system.candidateCheck);
  assertRational(model.system.candidateCheck.residuals.first.signedResidual, {
    numerator: 1,
  });
  assertRational(model.system.candidateCheck.residuals.second.signedResidual, {
    numerator: -1,
  });
  assert.equal(model.system.candidateCheck.satisfiesBoth, false);
  assert.equal(model.system.solutionResiduals?.first.passed, true);
  assert.equal(model.system.solutionResiduals?.second.passed, true);
});

test("parallel, coincident, universal, and contradictory systems are classified without a fake point", () => {
  const none = buildEquationInequalitySystemModel({
    equations: [
      { constant: 2, xCoefficient: 1, yCoefficient: 1 },
      { constant: 5, xCoefficient: 2, yCoefficient: 2 },
    ],
    labId: BNU_SYSTEM_LAB,
    mode: "graph-intersection",
  });
  const infinite = buildEquationInequalitySystemModel({
    equations: [
      { constant: 2, xCoefficient: 1, yCoefficient: 1 },
      { constant: 4, xCoefficient: 2, yCoefficient: 2 },
    ],
    labId: BNU_SYSTEM_LAB,
    mode: "elimination",
  });
  const contradictoryZeroRow = buildEquationInequalitySystemModel({
    equations: [
      { constant: 1, xCoefficient: 0, yCoefficient: 0 },
      { constant: 0, xCoefficient: 0, yCoefficient: 0 },
    ],
    labId: BNU_SYSTEM_LAB,
    mode: "substitution",
  });
  const universal = buildEquationInequalitySystemModel({
    equations: [
      { constant: 0, xCoefficient: 0, yCoefficient: 0 },
      { constant: 0, xCoefficient: 0, yCoefficient: 0 },
    ],
    labId: BNU_SYSTEM_LAB,
    mode: "substitution",
  });
  for (const [model, classification, reason] of [
    [none, "none", "parallel-distinct"],
    [infinite, "infinite", "coincident"],
    [contradictoryZeroRow, "none", "contradictory-zero-row"],
    [universal, "infinite", "universal-system"],
  ] as const) {
    assert.ok(
      model.mode === "substitution" ||
        model.mode === "elimination" ||
        model.mode === "graph-intersection",
    );
    if (
      model.mode !== "substitution" &&
      model.mode !== "elimination" &&
      model.mode !== "graph-intersection"
    ) {
      throw new Error("expected system");
    }
    assert.equal(model.system.classification, classification);
    assert.equal(model.system.classificationReceipt.reason, reason);
    assert.equal(model.system.intersection, null);
    assert.equal(model.system.solutionResiduals, null);
    assert.equal(model.system.methodReceipts, null);
  }
});

test("a near-parallel decimal system remains a unique exact rational intersection, never an epsilon approximation", () => {
  const model = buildEquationInequalitySystemModel({
    equations: [
      { constant: 2, xCoefficient: 1, yCoefficient: 1 },
      {
        constant: decimal(20_001, 4),
        xCoefficient: 1,
        yCoefficient: decimal(10_001, 4),
      },
    ],
    labId: BNU_SYSTEM_LAB,
    mode: "graph-intersection",
  });
  assert.equal(model.mode, "graph-intersection");
  if (model.mode !== "graph-intersection") throw new Error("expected system");
  assert.equal(model.system.classification, "unique");
  assertRational(model.system.determinant, {
    numerator: 1,
    denominator: 10_000,
  });
  assert.deepEqual(model.system.intersection, {
    exact: true,
    kind: "exact-rational",
    x: exact(1),
    y: exact(1),
  });
  assert.equal("approximation" in model.system.intersection, false);
  assert.doesNotMatch(JSON.stringify(model), /epsilon|approximate/iu);
});

test("PEP P5 decimal multiply/divide mode delegates to the exact G02 child and keeps reconstruction receipts", () => {
  const multiplyModel = buildEquationInequalitySystemModel({
    labId: PEP_DECIMAL_EQUATION_LAB,
    left: { scale: 1, unscaled: 24 },
    mode: "decimal-operation",
    operation: "multiply",
    precision: 2,
    right: { scale: 0, unscaled: 3 },
  });
  assert.equal(multiplyModel.mode, "decimal-operation");
  if (multiplyModel.mode !== "decimal-operation") {
    throw new Error("expected decimal operation");
  }
  assert.equal(multiplyModel.decimalOperation.delegatedFamily, "decimal-arithmetic");
  assert.equal(multiplyModel.decimalOperation.operation, "multiply");
  assertRational(multiplyModel.decimalOperation.exactResult, {
    numerator: 36,
    denominator: 5,
  });
  assert.equal(
    multiplyModel.decimalOperation.reconstruction.kind,
    "scaled-product",
  );
  assert.equal(multiplyModel.decimalOperation.reconstruction.passed, true);
  assert.equal(
    multiplyModel.decimalOperation.childModel.invariants.every(
      ({ holds }) => holds,
    ),
    true,
  );

  const divideModel = buildEquationInequalitySystemModel({
    labId: PEP_DECIMAL_EQUATION_LAB,
    left: { scale: 1, unscaled: 72 },
    mode: "decimal-operation",
    operation: "divide",
    precision: 2,
    right: { scale: 0, unscaled: 3 },
  });
  assert.equal(divideModel.mode, "decimal-operation");
  if (divideModel.mode !== "decimal-operation") {
    throw new Error("expected decimal operation");
  }
  assertRational(divideModel.decimalOperation.exactResult, {
    numerator: 12,
    denominator: 5,
  });
  assert.equal(
    divideModel.decimalOperation.reconstruction.kind,
    "division-identity",
  );
  assert.equal(divideModel.decimalOperation.reconstruction.passed, true);
  invariant(multiplyModel, "decimal-arithmetic-delegation");
  invariant(divideModel, "decimal-arithmetic-delegation");
});

test("PEP S1 data strand exposes dataset, exact count/sum/mean, and frequency reconstruction", () => {
  const model = buildEquationInequalitySystemModel({
    dataset: [5, 7, 7, 9],
    labId: PEP_MIXED_LAB,
    mode: "data",
  });
  assert.equal(model.mode, "data");
  if (model.mode !== "data") throw new Error("expected data model");
  assert.equal(model.data.count, 4);
  assertRational(model.data.sum, { numerator: 28 });
  assertRational(model.data.mean, { numerator: 7 });
  assertRational(model.data.median, { numerator: 7 });
  assertRational(model.data.range, { numerator: 4 });
  assert.deepEqual(model.data.sortedValues, [exact(5), exact(7), exact(7), exact(9)]);
  assert.deepEqual(model.data.frequencies, [
    { count: 1, value: exact(5) },
    { count: 2, value: exact(7) },
    { count: 1, value: exact(9) },
  ]);
  assert.deepEqual(
    multiply(model.data.mean, exact(model.data.count)),
    model.data.sum,
  );
  assert.equal(model.data.reconstruction.passed, true);
  invariant(model, "data-count-sum-mean");
  invariant(model, "data-summary-exactness");
});

test("even-sized exact data derives median and range from the same sorted visible dataset", () => {
  const model = buildEquationInequalitySystemModel({
    dataset: [rational(1, 3), 2, 1, rational(2, 3)],
    labId: PEP_MIXED_LAB,
    mode: "data",
  });
  assert.equal(model.mode, "data");
  if (model.mode !== "data") throw new Error("expected data");
  assert.deepEqual(model.data.sortedValues, [
    exact(1, 3),
    exact(2, 3),
    exact(1),
    exact(2),
  ]);
  assertRational(model.data.median, { numerator: 5, denominator: 6 });
  assertRational(model.data.range, { numerator: 5, denominator: 3 });
  assert.deepEqual(model.data.reconstruction.medianSourceIndexes, [1, 2]);
  assert.deepEqual(model.data.reconstruction.rangeEndpoints, {
    maximum: exact(2),
    minimum: exact(1, 3),
  });
  assert.deepEqual(model.data.reconstruction.residual, ZERO);
});

test("unknown IDs/modes, cross-strand leakage, invalid coefficients, and zero transform factors fail closed", () => {
  const equationBase = {
    labId: PEP_DECIMAL_EQUATION_LAB,
    left: { coefficient: 1, constant: 0 },
    mode: "equation",
    right: { coefficient: 0, constant: 1 },
  } as const;
  assertDomainError(
    { ...equationBase, labId: "unknown-lab" },
    "INVALID_LAB_ID",
  );
  assertDomainError(
    { ...equationBase, mode: "default" },
    "INVALID_MODE",
  );
  assertDomainError(
    { ...equationBase, labId: BNU_SYSTEM_LAB },
    "MODE_NOT_ALLOWED",
  );
  assertDomainError(
    { ...equationBase, left: { coefficient: 0.3, constant: 0 } },
    "NON_INTEGER_COEFFICIENT",
  );
  assertDomainError(
    {
      ...equationBase,
      left: { coefficient: Number.NaN, constant: 0 },
    },
    "NON_FINITE_COEFFICIENT",
  );
  assertDomainError(
    {
      ...equationBase,
      left: { coefficient: Number.MAX_SAFE_INTEGER, constant: 0 },
    },
    "COEFFICIENT_OUT_OF_DOMAIN",
  );
  assertDomainError(
    {
      ...equationBase,
      left: {
        coefficient: rational(1, 0),
        constant: 0,
      },
    },
    "ZERO_DENOMINATOR",
  );
  assertDomainError(
    {
      ...equationBase,
      left: {
        coefficient: decimal(1, EQUATION_INEQUALITY_SYSTEM_DOMAIN.maxDecimalScale + 1),
        constant: 0,
      },
    },
    "INVALID_DECIMAL_SCALE",
  );
  assertDomainError(
    {
      labId: BNU_INEQUALITY_LAB,
      left: { coefficient: 1, constant: 0 },
      mode: "inequality",
      operationStep: { factor: 0, operation: "multiply" },
      relation: "<",
      right: { coefficient: 0, constant: 1 },
    },
    "ZERO_OPERATION_FACTOR",
  );
  assertDomainError(
    {
      dataset: [1, 2, 3],
      labId: BNU_INEQUALITY_LAB,
      mode: "data",
    },
    "MODE_NOT_ALLOWED",
  );
  assertDomainError(
    { dataset: [], labId: PEP_MIXED_LAB, mode: "data" },
    "EMPTY_DATASET",
  );
  assertDomainError(
    {
      labId: PEP_DECIMAL_EQUATION_LAB,
      left: { scale: 0, unscaled: 3 },
      mode: "decimal-operation",
      operation: "divide",
      precision: 2,
      right: { scale: 1, unscaled: 0 },
    },
    "DIVISION_BY_ZERO",
  );
});

test("bounded exhaustive equations, inequalities, and systems preserve exact classifications and residuals", () => {
  const values = [-1, 0, 1] as const;
  const relations = ["<", "<=", ">", ">="] as const;
  let equationCases = 0;
  let inequalityCases = 0;
  let systemCases = 0;

  for (const a of values) {
    for (const b of values) {
      for (const c of values) {
        for (const d of values) {
          const model = buildEquationInequalitySystemModel({
            labId: PEP_DECIMAL_EQUATION_LAB,
            left: { coefficient: a, constant: b },
            mode: "equation",
            right: { coefficient: c, constant: d },
          });
          assert.equal(model.mode, "equation");
          if (model.mode !== "equation") throw new Error("expected equation");
          const coefficient = a - c;
          const constant = d - b;
          const expected =
            coefficient !== 0 ? "unique" : constant === 0 ? "infinite" : "none";
          assert.equal(model.equation.classification, expected, model.stateKey);
          if (expected === "unique") {
            assert.ok(model.equation.solutionResidual);
            assert.deepEqual(
              model.equation.solutionResidual.signedResidual,
              ZERO,
              model.stateKey,
            );
          }
          equationCases += 1;
        }
      }
    }
  }

  for (let coefficient = -2; coefficient <= 2; coefficient += 1) {
    for (let bound = -2; bound <= 2; bound += 1) {
      for (const relation of relations) {
        const model = buildEquationInequalitySystemModel({
          labId: BNU_INEQUALITY_LAB,
          left: { coefficient, constant: 0 },
          mode: "inequality",
          relation,
          right: { coefficient: 0, constant: bound },
        });
        assert.equal(model.mode, "inequality");
        if (model.mode !== "inequality") throw new Error("expected inequality");
        if (coefficient === 0) {
          const truth =
            relation === "<"
              ? 0 < bound
              : relation === "<="
                ? 0 <= bound
                : relation === ">"
                  ? 0 > bound
                  : 0 >= bound;
          assert.equal(
            model.inequality.classification,
            truth ? "all-real" : "empty",
            model.stateKey,
          );
        } else {
          assert.equal(model.inequality.classification, "ray", model.stateKey);
          if (model.inequality.solutionSet.kind !== "ray") {
            throw new Error("expected ray");
          }
          assertRational(
            model.inequality.solutionSet.boundary,
            exact(bound, coefficient),
            model.stateKey,
          );
          assert.equal(
            model.inequality.solveTransformation?.signReversed,
            coefficient < 0,
            model.stateKey,
          );
          assert.equal(
            model.inequality.solutionSet.endpointClosed,
            relation === "<=" || relation === ">=",
            model.stateKey,
          );
        }
        inequalityCases += 1;
      }
    }
  }

  for (const a1 of values) {
    for (const b1 of values) {
      for (const c1 of values) {
        for (const a2 of values) {
          for (const b2 of values) {
            for (const c2 of values) {
              const model = buildEquationInequalitySystemModel({
                equations: [
                  { constant: c1, xCoefficient: a1, yCoefficient: b1 },
                  { constant: c2, xCoefficient: a2, yCoefficient: b2 },
                ],
                labId: BNU_SYSTEM_LAB,
                mode: "elimination",
              });
              assert.equal(model.mode, "elimination");
              if (model.mode !== "elimination") throw new Error("expected system");
              const determinant = a1 * b2 - a2 * b1;
              const contradictoryZeroRow =
                (a1 === 0 && b1 === 0 && c1 !== 0) ||
                (a2 === 0 && b2 === 0 && c2 !== 0);
              const xNumerator = c1 * b2 - c2 * b1;
              const yNumerator = a1 * c2 - a2 * c1;
              const expected =
                determinant !== 0
                  ? "unique"
                  : contradictoryZeroRow || xNumerator !== 0 || yNumerator !== 0
                    ? "none"
                    : "infinite";
              assert.equal(model.system.classification, expected, model.stateKey);
              if (expected === "unique") {
                assert.ok(model.system.solutionResiduals);
                assert.deepEqual(
                  model.system.solutionResiduals.first.signedResidual,
                  ZERO,
                  model.stateKey,
                );
                assert.deepEqual(
                  model.system.solutionResiduals.second.signedResidual,
                  ZERO,
                  model.stateKey,
                );
              } else {
                assert.equal(model.system.intersection, null, model.stateKey);
              }
              systemCases += 1;
            }
          }
        }
      }
    }
  }

  assert.equal(equationCases, 81);
  assert.equal(inequalityCases, 100);
  assert.equal(systemCases, 729);
});

test("every strand is deterministic, input-pure, deeply frozen, JSON-round-trippable, and free of approximate numbers", () => {
  const inputs: EquationInequalitySystemInput[] = [
    {
      labId: PEP_DECIMAL_EQUATION_LAB,
      left: { coefficient: decimal(3, 1), constant: decimal(2, 1) },
      mode: "equation",
      right: { coefficient: 0, constant: decimal(11, 1) },
    },
    {
      labId: PEP_DECIMAL_EQUATION_LAB,
      left: { scale: 1, unscaled: 24 },
      mode: "decimal-operation",
      operation: "multiply",
      precision: 2,
      right: { scale: 0, unscaled: 3 },
    },
    {
      labId: BNU_INEQUALITY_LAB,
      left: { coefficient: -2, constant: 5 },
      mode: "inequality",
      relation: "<",
      right: { coefficient: 0, constant: 13 },
    },
    {
      constraints: [
        {
          left: { coefficient: 1, constant: 0 },
          relation: ">",
          right: { coefficient: 0, constant: -2 },
        },
        {
          left: { coefficient: 1, constant: 0 },
          relation: "<=",
          right: { coefficient: 0, constant: 3 },
        },
      ],
      labId: BNU_INEQUALITY_LAB,
      mode: "inequality-system",
    },
    {
      equations: UNIQUE_SYSTEM_EQUATIONS,
      labId: BNU_SYSTEM_LAB,
      mode: "elimination",
    },
    { dataset: [5, 7, 7, 9], labId: PEP_MIXED_LAB, mode: "data" },
  ];

  for (const input of inputs) {
    const inputBefore = JSON.parse(JSON.stringify(input)) as unknown;
    const first = buildEquationInequalitySystemModel(input);
    const second = buildEquationInequalitySystemModel(input);
    assert.deepEqual(input, inputBefore);
    assert.deepEqual(first, second);
    assert.equal(first.stateKey, second.stateKey);
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
    assert.doesNotMatch(JSON.stringify(first), /NaN|Infinity/);
    assertEveryNumberIsExactJson(first);
    assertDeepFrozen(first);
  }

  const frozen = buildEquationInequalitySystemModel(inputs[3]!);
  assert.equal(frozen.mode, "inequality-system");
  if (frozen.mode !== "inequality-system") throw new Error("expected system");
  assert.throws(() => {
    if (frozen.inequalitySystem.intersection.kind === "interval") {
      frozen.inequalitySystem.intersection.lower!.closed = true;
    }
  }, TypeError);
});

test("invariant receipts use a discriminated passed/not-applicable contract and stable scoped identities", () => {
  const infiniteEquation = buildEquationInequalitySystemModel({
    labId: PEP_DECIMAL_EQUATION_LAB,
    left: { coefficient: 1, constant: 2 },
    mode: "equation",
    right: { coefficient: 1, constant: 2 },
  });
  const degenerateInequality = buildEquationInequalitySystemModel({
    labId: BNU_INEQUALITY_LAB,
    left: { coefficient: 0, constant: 0 },
    mode: "inequality",
    relation: "<=",
    right: { coefficient: 0, constant: 1 },
  });
  const coincidentSystem = buildEquationInequalitySystemModel({
    equations: [
      { constant: 2, xCoefficient: 1, yCoefficient: 1 },
      { constant: 4, xCoefficient: 2, yCoefficient: 2 },
    ],
    labId: BNU_SYSTEM_LAB,
    mode: "graph-intersection",
  });
  const inequalitySystem = buildEquationInequalitySystemModel({
    constraints: [
      {
        left: { coefficient: 1, constant: 0 },
        relation: ">=",
        right: { coefficient: 0, constant: 0 },
      },
      {
        left: { coefficient: 0, constant: 0 },
        relation: "<=",
        right: { coefficient: 0, constant: 1 },
      },
    ],
    labId: BNU_INEQUALITY_LAB,
    mode: "inequality-system",
  });

  const defaultModels = EQUATION_INEQUALITY_SYSTEM_LAB_IDS.flatMap((labId) =>
    EQUATION_INEQUALITY_SYSTEM_MODE_ALLOWLIST[labId].map((mode) =>
      buildEquationInequalitySystemModel(
        defaultEquationInequalitySystemInputFor(labId, mode),
      ),
    ),
  );
  const models = [
    ...defaultModels,
    infiniteEquation,
    degenerateInequality,
    coincidentSystem,
    inequalitySystem,
  ];
  for (const model of models) {
    const receiptIds = model.invariantReceipts.map(
      (receipt) => receipt.receiptId,
    );
    assert.equal(
      new Set(receiptIds).size,
      receiptIds.length,
      `${model.stateKey}: receipt identities must be unique`,
    );
    for (const receipt of model.invariantReceipts) {
      assert.equal(
        receipt.receiptId,
        `${receipt.scope}:${receipt.owner}:${receipt.id}`,
      );
      if (receipt.status === "passed") {
        assert.equal(receipt.applicable, true);
        assert.equal(receipt.holds, true);
        assert.equal(receipt.passed, true);
      } else if (receipt.status === "not-applicable") {
        assert.equal(receipt.applicable, false);
        assert.equal(receipt.holds, null);
        assert.equal(receipt.passed, false);
      } else {
        assert.fail("A failed internal invariant must fail closed before a model is returned.");
      }
    }
  }

  assert.deepEqual(
    infiniteEquation.invariantReceipts.find(
      ({ id }) => id === "equation-substitution-residual",
    ),
    {
      applicable: false,
      exact: true,
      expected: "not-applicable",
      holds: null,
      id: "equation-substitution-residual",
      observed: "not-applicable",
      owner: "equation",
      passed: false,
      receiptId:
        "equation:equation:equation-substitution-residual",
      residual: null,
      scope: "equation",
      status: "not-applicable",
    },
  );
  assert.deepEqual(
    inequalitySystem.invariantReceipts.map(({ owner }) => owner),
    [
      "constraint:0",
      "constraint:0",
      "constraint:1",
      "constraint:1",
      "intersection",
    ],
  );
});

test("inequality-system audit independently reconstructs membership, open-touch, and endpoint source ownership", () => {
  const bounded = buildEquationInequalitySystemModel({
    constraints: [
      {
        left: { coefficient: 1, constant: 0 },
        relation: ">",
        right: { coefficient: 0, constant: 1 },
      },
      {
        left: { coefficient: 1, constant: 0 },
        relation: "<=",
        right: { coefficient: 0, constant: 4 },
      },
    ],
    labId: BNU_INEQUALITY_LAB,
    mode: "inequality-system",
  });
  assert.equal(bounded.mode, "inequality-system");
  if (bounded.mode !== "inequality-system") throw new Error("expected system");
  assert.equal(bounded.inequalitySystem.intersectionAudit.passed, true);
  assert.equal(
    bounded.inequalitySystem.intersectionAudit.membershipPassed,
    true,
  );
  assert.equal(
    bounded.inequalitySystem.intersectionAudit.openTouchPassed,
    true,
  );
  assert.equal(
    bounded.inequalitySystem.intersectionAudit.sourceIndexesPassed,
    true,
  );
  assert.deepEqual(
    bounded.inequalitySystem.intersectionAudit.expectedLowerSourceConstraintIndexes,
    [0],
  );
  assert.deepEqual(
    bounded.inequalitySystem.intersectionAudit.expectedUpperSourceConstraintIndexes,
    [1],
  );
  assert.ok(
    bounded.inequalitySystem.intersectionAudit.membershipChecks.length >= 7,
  );
  assert.equal(
    bounded.inequalitySystem.intersectionAudit.membershipChecks.every(
      ({ passed }) => passed,
    ),
    true,
  );

  const openTouch = buildEquationInequalitySystemModel({
    constraints: [
      {
        left: { coefficient: 1, constant: 0 },
        relation: ">",
        right: { coefficient: 0, constant: 2 },
      },
      {
        left: { coefficient: 1, constant: 0 },
        relation: "<=",
        right: { coefficient: 0, constant: 2 },
      },
    ],
    labId: BNU_INEQUALITY_LAB,
    mode: "inequality-system",
  });
  assert.equal(openTouch.mode, "inequality-system");
  if (openTouch.mode !== "inequality-system") {
    throw new Error("expected system");
  }
  assert.deepEqual(openTouch.inequalitySystem.intersection, {
    kind: "empty",
    reason: "open-touch",
  });
  assert.equal(openTouch.inequalitySystem.intersectionAudit.expectedKind, "empty");
  assert.equal(
    openTouch.inequalitySystem.intersectionAudit.expectedEmptyReason,
    "open-touch",
  );
  assert.deepEqual(
    openTouch.inequalitySystem.intersectionAudit
      .expectedLowerSourceConstraintIndexes,
    [0],
  );
  assert.deepEqual(
    openTouch.inequalitySystem.intersectionAudit
      .expectedUpperSourceConstraintIndexes,
    [1],
  );
  assert.equal(openTouch.inequalitySystem.intersectionAudit.openTouchPassed, true);
  assert.equal(openTouch.inequalitySystem.intersectionAudit.passed, true);
});

test("formal exhaustive inequality-system oracle matches both original constraints for every rational probe", () => {
  const coefficients = [-2, -1, 0, 1, 2] as const;
  const bounds = [-2, -1, 0, 1, 2] as const;
  const relations = ["<", "<=", ">", ">="] as const;
  const constraints = coefficients.flatMap((coefficient) =>
    bounds.flatMap((bound) =>
      relations.map((relation) => ({ coefficient, bound, relation })),
    ),
  );
  let pairCount = 0;
  let membershipCount = 0;

  for (const first of constraints) {
    for (const second of constraints) {
      const model = buildEquationInequalitySystemModel({
        constraints: [
          {
            left: { coefficient: first.coefficient, constant: 0 },
            relation: first.relation,
            right: { coefficient: 0, constant: first.bound },
          },
          {
            left: { coefficient: second.coefficient, constant: 0 },
            relation: second.relation,
            right: { coefficient: 0, constant: second.bound },
          },
        ],
        labId: BNU_INEQUALITY_LAB,
        mode: "inequality-system",
      });
      assert.equal(model.mode, "inequality-system");
      if (model.mode !== "inequality-system") {
        throw new Error("expected inequality system");
      }
      assert.equal(model.inequalitySystem.intersectionAudit.passed, true);
      for (let numerator = -20; numerator <= 20; numerator += 1) {
        const probe = exact(numerator, 2);
        const expected =
          integerConstraintHolds(
            first.coefficient,
            first.relation,
            first.bound,
            probe,
          ) &&
          integerConstraintHolds(
            second.coefficient,
            second.relation,
            second.bound,
            probe,
          );
        assert.equal(
          intersectionContainsForTest(
            model.inequalitySystem.intersection,
            probe,
          ),
          expected,
          model.stateKey,
        );
        membershipCount += 1;
      }
      pairCount += 1;
    }
  }

  assert.equal(pairCount, 10_000);
  assert.equal(membershipCount, 410_000);
});

test("wrong equation and system candidates retain independent nonzero residual evidence", () => {
  const equation = buildEquationInequalitySystemModel({
    candidate: 2,
    labId: PEP_DECIMAL_EQUATION_LAB,
    left: { coefficient: 2, constant: 1 },
    mode: "equation",
    right: { coefficient: 0, constant: 7 },
  });
  assert.equal(equation.mode, "equation");
  if (equation.mode !== "equation") throw new Error("expected equation");
  assert.deepEqual(equation.equation.solution, exact(3));
  assert.deepEqual(equation.equation.candidateResidual?.signedResidual, exact(-2));
  assert.equal(equation.equation.candidateResidual?.passed, false);

  for (const mode of [
    "substitution",
    "elimination",
    "graph-intersection",
  ] as const) {
    const system = buildEquationInequalitySystemModel({
      candidate: { x: 4, y: 3 },
      equations: UNIQUE_SYSTEM_EQUATIONS,
      labId: BNU_SYSTEM_LAB,
      mode,
    });
    if (!("system" in system)) throw new Error("expected linear system");
    assert.ok(system.system.candidateCheck);
    assert.equal(system.system.candidateCheck.satisfiesBoth, false);
    assert.deepEqual(
      system.system.candidateCheck.residuals.first.signedResidual,
      exact(1),
    );
    assert.deepEqual(
      system.system.candidateCheck.residuals.second.signedResidual,
      exact(-1),
    );
    assert.deepEqual(system.system.intersection?.x, exact(4));
    assert.deepEqual(system.system.intersection?.y, exact(2));
  }
});

test("all four inequality relations reconstruct endpoint openness and reverse exactly once for a negative divisor", () => {
  const cases = [
    { relation: "<", expected: ">", closed: false },
    { relation: "<=", expected: ">=", closed: true },
    { relation: ">", expected: "<", closed: false },
    { relation: ">=", expected: "<=", closed: true },
  ] as const;
  for (const item of cases) {
    const model = buildEquationInequalitySystemModel({
      labId: BNU_INEQUALITY_LAB,
      left: { coefficient: -2, constant: 0 },
      mode: "inequality",
      operationStep: { factor: -2, operation: "divide" },
      relation: item.relation,
      right: { coefficient: 0, constant: 4 },
    });
    assert.equal(model.mode, "inequality");
    if (model.mode !== "inequality") throw new Error("expected inequality");
    assert.equal(model.inequality.solutionSet.kind, "ray");
    if (model.inequality.solutionSet.kind !== "ray") {
      throw new Error("expected ray");
    }
    assert.equal(model.inequality.solutionSet.relation, item.expected);
    assert.equal(model.inequality.solutionSet.endpointClosed, item.closed);
    assert.equal(model.inequality.solveTransformation?.signReversed, true);
    assert.equal(model.inequality.operationProof?.signReversed, true);
    assert.equal(
      model.inequality.solveTransformation?.relationAfter,
      item.expected,
    );
    assert.equal(
      model.inequality.operationProof?.relationAfter,
      item.expected,
    );
    invariant(model, "inequality-endpoint-openness");
    invariant(model, "inequality-sign-reversal");
  }
});

test("substitution, elimination, and graph modes reconstruct unique dual residuals and preserve nonunique classifications", () => {
  for (const mode of [
    "substitution",
    "elimination",
    "graph-intersection",
  ] as const) {
    const unique = buildEquationInequalitySystemModel({
      equations: UNIQUE_SYSTEM_EQUATIONS,
      labId: BNU_SYSTEM_LAB,
      mode,
    });
    if (!("system" in unique)) throw new Error("expected linear system");
    assert.ok(unique.system.methodReceipts);
    assert.deepEqual(
      unique.system.methodReceipts.elimination.reconstructedPoint,
      { x: exact(4), y: exact(2) },
    );
    assert.deepEqual(
      unique.system.methodReceipts.substitution.reconstructedPoint,
      { x: exact(4), y: exact(2) },
    );
    assert.deepEqual(unique.system.solutionResiduals?.first.signedResidual, ZERO);
    assert.deepEqual(unique.system.solutionResiduals?.second.signedResidual, ZERO);
    invariant(unique, "line-intersection");
    invariant(unique, "linear-system-dual-residual");

    const parallel = buildEquationInequalitySystemModel({
      equations: [
        { constant: 2, xCoefficient: 1, yCoefficient: 1 },
        { constant: 5, xCoefficient: 2, yCoefficient: 2 },
      ],
      labId: BNU_SYSTEM_LAB,
      mode,
    });
    if (!("system" in parallel)) throw new Error("expected linear system");
    assert.equal(parallel.system.classification, "none");
    assert.equal(parallel.system.classificationReceipt.reason, "parallel-distinct");
    assert.equal(parallel.system.intersection, null);
    assert.equal(parallel.system.methodReceipts, null);

    const coincident = buildEquationInequalitySystemModel({
      equations: [
        { constant: 2, xCoefficient: 1, yCoefficient: 1 },
        { constant: 4, xCoefficient: 2, yCoefficient: 2 },
      ],
      labId: BNU_SYSTEM_LAB,
      mode,
    });
    if (!("system" in coincident)) throw new Error("expected linear system");
    assert.equal(coincident.system.classification, "infinite");
    assert.equal(coincident.system.classificationReceipt.reason, "coincident");
    assert.equal(coincident.system.intersection, null);
    assert.equal(coincident.system.methodReceipts, null);
  }
});

test("data frequencies reconstruct the exact rational dataset as a multiset", () => {
  const model = buildEquationInequalitySystemModel({
    dataset: [rational(1, 2), 2, rational(1, 2), -1, 2, 2],
    labId: PEP_MIXED_LAB,
    mode: "data",
  });
  assert.equal(model.mode, "data");
  if (model.mode !== "data") throw new Error("expected data");
  const reconstructed = model.data.frequencies.flatMap(({ count, value }) =>
    Array.from({ length: count }, () => value),
  );
  assert.deepEqual(reconstructed, model.data.sortedValues);
  assert.deepEqual(model.data.frequencies, [
    { count: 1, value: exact(-1) },
    { count: 2, value: exact(1, 2) },
    { count: 3, value: exact(2) },
  ]);
  assert.deepEqual(model.data.sum, exact(6));
  assert.deepEqual(model.data.mean, exact(1));
  invariant(model, "data-count-sum-mean");
  invariant(model, "data-summary-exactness");
});

test("decimal operations expose an exact scaled/unscaled reconstruction receipt", () => {
  const multiplyModel = buildEquationInequalitySystemModel({
    labId: PEP_DECIMAL_EQUATION_LAB,
    left: { scale: 1, unscaled: 24 },
    mode: "decimal-operation",
    operation: "multiply",
    precision: 2,
    right: { scale: 0, unscaled: 3 },
  });
  const divideModel = buildEquationInequalitySystemModel({
    labId: PEP_DECIMAL_EQUATION_LAB,
    left: { scale: 1, unscaled: 75 },
    mode: "decimal-operation",
    operation: "divide",
    precision: 2,
    right: { scale: 1, unscaled: 5 },
  });
  for (const model of [multiplyModel, divideModel]) {
    assert.equal(model.mode, "decimal-operation");
    if (model.mode !== "decimal-operation") {
      throw new Error("expected decimal operation");
    }
    const receipt = model.decimalOperation.scaledIntegerReceipt;
    assert.equal(receipt.passed, true);
    assert.deepEqual(receipt.observedResult, model.decimalOperation.exactResult);
    assert.deepEqual(receipt.reconstructedResult, receipt.observedResult);
    assert.deepEqual(receipt.left.exact, exact(receipt.left.unscaled, 10 ** receipt.left.scale));
    assert.deepEqual(receipt.right.exact, exact(receipt.right.unscaled, 10 ** receipt.right.scale));
  }
  if (
    multiplyModel.mode !== "decimal-operation" ||
    divideModel.mode !== "decimal-operation"
  ) {
    throw new Error("expected decimal operation models");
  }
  assert.deepEqual(
    multiplyModel.decimalOperation.scaledIntegerReceipt.reconstructedResult,
    exact(36, 5),
  );
  assert.deepEqual(
    divideModel.decimalOperation.scaledIntegerReceipt.reconstructedResult,
    exact(15),
  );
});

test("the four curriculum resets are pinned by an independent exact table", () => {
  const expectedResets = {
    [BNU_INEQUALITY_LAB]: {
      labId: BNU_INEQUALITY_LAB,
      left: { coefficient: -2, constant: 5 },
      mode: "inequality",
      relation: "<",
      right: { coefficient: 0, constant: 13 },
    },
    [BNU_SYSTEM_LAB]: {
      equations: [
        { constant: 6, xCoefficient: 1, yCoefficient: 1 },
        { constant: 2, xCoefficient: 1, yCoefficient: -1 },
      ],
      labId: BNU_SYSTEM_LAB,
      mode: "elimination",
    },
    [PEP_MIXED_LAB]: {
      dataset: [5, 7, 7, 9],
      labId: PEP_MIXED_LAB,
      mode: "data",
    },
    [PEP_DECIMAL_EQUATION_LAB]: {
      labId: PEP_DECIMAL_EQUATION_LAB,
      left: {
        coefficient: { kind: "decimal", scale: 1, unscaled: 3 },
        constant: { kind: "decimal", scale: 1, unscaled: 2 },
      },
      mode: "equation",
      right: {
        coefficient: 0,
        constant: { kind: "decimal", scale: 1, unscaled: 11 },
      },
    },
  } as const;

  assert.deepEqual(EQUATION_INEQUALITY_SYSTEM_RESET_INPUTS, expectedResets);
  for (const labId of EQUATION_INEQUALITY_SYSTEM_LAB_IDS) {
    const reset = buildEquationInequalitySystemResetModel(labId);
    const expected = buildEquationInequalitySystemModel(
      expectedResets[labId],
    );
    assert.equal(reset.stateKey, expected.stateKey);
    assert.deepEqual(reset.state, expected.state);
  }
});
