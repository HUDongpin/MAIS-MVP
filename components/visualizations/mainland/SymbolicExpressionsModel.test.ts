import assert from "node:assert/strict";
import test from "node:test";
import {
  SYMBOLIC_EXPRESSIONS_CURRICULUM,
  SYMBOLIC_EXPRESSIONS_DOMAIN,
  SYMBOLIC_EXPRESSIONS_LAB_IDS,
  SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
  SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT,
  SYMBOLIC_EXPRESSIONS_MODES,
  SYMBOLIC_EXPRESSIONS_RESET_INPUTS,
  SymbolicExpressionsDomainError,
  buildAlgebraicFractionEquivalenceReceipt,
  buildPolynomialIdentityReceipt,
  buildSymbolicExpressionsModel,
  buildSymbolicExpressionsResetModel,
  type AlgebraicFractionInput,
  type ExactRational,
  type PolynomialState,
  type SymbolicExpressionsInput,
  type SymbolicExpressionsModel,
} from "./SymbolicExpressionsModel";

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

function rational(numerator: number, denominator = 1) {
  return { numerator, denominator };
}

function polynomial(
  model: SymbolicExpressionsModel,
): PolynomialState {
  assert.equal(model.result.kind, "polynomial", model.stateKey);
  if (model.result.kind !== "polynomial") throw new Error("unreachable");
  return model.result.polynomial;
}

function invariant(model: SymbolicExpressionsModel, id: string) {
  const receipt = model.invariantReceipts.find(
    (candidate) => candidate.id === id,
  );
  assert.ok(receipt, `${model.stateKey}: missing invariant ${id}`);
  assert.equal(receipt.applicable, true, `${model.stateKey}: ${id}`);
  assert.equal(receipt.status, "passed", `${model.stateKey}: ${id}`);
  assert.equal(receipt.holds, true, `${model.stateKey}: ${id}`);
  return receipt;
}

const EXPECTED_INVARIANT_APPLICABILITY = {
  "bnu-junior-s1-upper-algebraic-expressions:collect-like-terms": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "bnu-junior-s1-upper-algebraic-expressions:add": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "bnu-junior-s1-upper-algebraic-expressions:subtract": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "bnu-junior-s2-lower-algebraic-fractions-equations:fraction-simplify": [
    "algebraic-fraction-domain",
    "algebraic-fraction-equivalence",
  ],
  "bnu-junior-s2-lower-algebraic-fractions-equations:solve": [
    "algebraic-fraction-domain",
    "equation-substitution-residual",
  ],
  "hjb-junior-s1-upper-algebraic-fractions:fraction-simplify": [
    "algebraic-fraction-domain",
    "algebraic-fraction-equivalence",
  ],
  "hjb-junior-s1-upper-polynomial-add-subtract:collect-like-terms": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "hjb-junior-s1-upper-polynomial-add-subtract:add": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "hjb-junior-s1-upper-polynomial-add-subtract:subtract": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "hjb-primary-p6-lower-simple-algebraic-expressions:substitute": [
    "equation-substitution-residual",
  ],
  "hjb-primary-p6-lower-simple-algebraic-expressions:collect-like-terms": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "pep-junior-s1-upper-expressions-linear-equations:collect-like-terms": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "pep-junior-s1-upper-expressions-linear-equations:solve": [
    "equation-substitution-residual",
  ],
  "pep-junior-s2-upper-polynomials-fractions:expand": [
    "polynomial-expansion",
  ],
  "pep-junior-s2-upper-polynomials-fractions:factor": [
    "polynomial-expansion",
  ],
  "pep-junior-s2-upper-polynomials-fractions:fraction-simplify": [
    "algebraic-fraction-domain",
    "algebraic-fraction-equivalence",
  ],
} as const;

function modelForApplicability(
  labId: (typeof SYMBOLIC_EXPRESSIONS_LAB_IDS)[number],
  mode: (typeof SYMBOLIC_EXPRESSIONS_MODES)[number],
) {
  if (mode === "collect-like-terms") {
    return buildSymbolicExpressionsModel({
      labId,
      mode,
      terms: [
        { coefficient: 5, degree: 1 },
        { coefficient: -4, degree: 1 },
      ],
    });
  }
  if (mode === "add" || mode === "subtract") {
    return buildSymbolicExpressionsModel({
      labId,
      left: [2, 1],
      mode,
      right: [-1, 2],
    });
  }
  if (mode === "substitute") {
    return buildSymbolicExpressionsModel({
      labId,
      mode,
      polynomial: [-2, 3],
      value: rational(4),
    });
  }
  if (mode === "expand") {
    return buildSymbolicExpressionsModel({
      factors: [[-2, 1], [3, 1]],
      labId,
      mode,
    });
  }
  if (mode === "factor") {
    return buildSymbolicExpressionsModel({
      factor: [-2, 1],
      labId,
      mode,
      polynomial: [-6, 1, 1],
    });
  }
  if (mode === "fraction-simplify") {
    return buildSymbolicExpressionsModel({
      cancelFactors: [[-1, 1]],
      fraction: {
        denominator: [-1, 1],
        numerator: [-1, 0, 1],
      },
      labId,
      mode,
    });
  }
  return buildSymbolicExpressionsModel({
    candidate: rational(3),
    equation:
      labId === BNU_FRACTIONS
        ? {
            left: { denominator: [-1, 1], numerator: [2] },
            right: { denominator: [1], numerator: [1] },
          }
        : {
            left: { denominator: [1], numerator: [1, 2] },
            right: { denominator: [1], numerator: [7] },
          },
    labId,
    mode: "solve",
  });
}

function assertZeroVector(values: readonly number[], label: string): void {
  assert.ok(values.length > 0, `${label}: residual vector is empty`);
  assert.ok(
    values.every((value) => value === 0 && !Object.is(value, -0)),
    `${label}: ${JSON.stringify(values)}`,
  );
}

function assertDeepFrozen(value: unknown, path = "root"): void {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${path} is mutable`);
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      assertDeepFrozen(child, `${path}[${index}]`),
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${path}.${key}`);
  }
}

function assertJsonSafe(value: unknown, path = "root"): void {
  if (typeof value === "bigint" || typeof value === "undefined") {
    assert.fail(`${path} is not JSON-safe`);
  }
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path} is not finite`);
    assert.equal(Object.is(value, -0), false, `${path} contains negative zero`);
    return;
  }
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

function assertDomainError(
  input: unknown,
  code: SymbolicExpressionsDomainError["code"],
): void {
  assert.throws(
    () => buildSymbolicExpressionsModel(input as SymbolicExpressionsInput),
    (error: unknown) =>
      error instanceof SymbolicExpressionsDomainError && error.code === code,
  );
}

function addVectors(
  left: readonly number[],
  right: readonly number[],
  rightSign: 1 | -1,
): number[] {
  const length = Math.max(left.length, right.length);
  return Array.from(
    { length },
    (_, degree) =>
      (left[degree] ?? 0) + rightSign * (right[degree] ?? 0),
  ).reduceRight<number[]>((result, coefficient) => {
    if (result.length === 0 && coefficient === 0) return result;
    result.unshift(coefficient);
    return result;
  }, []).length
    ? Array.from(
        { length },
        (_, degree) =>
          (left[degree] ?? 0) + rightSign * (right[degree] ?? 0),
      ).slice(
        0,
        Math.max(
          1,
          Array.from(
            { length },
            (_, degree) =>
              (left[degree] ?? 0) + rightSign * (right[degree] ?? 0),
          ).findLastIndex((value) => value !== 0) + 1,
        ),
      )
    : [0];
}

function canonicalLength(values: readonly number[]): number {
  const lastNonzero = values.findLastIndex((value) => value !== 0);
  return Math.max(1, lastNonzero + 1);
}

function multiplyVectors(
  left: readonly number[],
  right: readonly number[],
): number[] {
  const coefficients = Array(left.length + right.length - 1).fill(0) as number[];
  left.forEach((leftCoefficient, leftDegree) => {
    right.forEach((rightCoefficient, rightDegree) => {
      coefficients[leftDegree + rightDegree] +=
        leftCoefficient * rightCoefficient;
    });
  });
  while (coefficients.length > 1 && coefficients.at(-1) === 0) {
    coefficients.pop();
  }
  return coefficients;
}

function equalRational(
  actual: ExactRational,
  numerator: number,
  denominator = 1,
): void {
  const sign = denominator < 0 ? -1 : 1;
  let a = Math.abs(numerator);
  let b = Math.abs(denominator);
  while (b !== 0) [a, b] = [b, a % b];
  const divisor = a || 1;
  const normalizedNumerator =
    numerator === 0 ? 0 : sign * (numerator / divisor);
  assert.deepEqual(actual, {
    numerator: normalizedNumerator,
    denominator: Math.abs(denominator / divisor),
    text:
      Math.abs(denominator / divisor) === 1
        ? String(normalizedNumerator)
        : `${normalizedNumerator}/${Math.abs(denominator / divisor)}`,
  });
}

test("G07 contract pins the exact seven-ID curriculum partition and deterministic resets", () => {
  assert.deepEqual(SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT, {
    family: "symbolic-transform-suite",
    groupId: "G07",
    version: "symbolic-transform-suite-v1",
  });
  assert.deepEqual(SYMBOLIC_EXPRESSIONS_LAB_IDS, [
    BNU_EXPRESSIONS,
    BNU_FRACTIONS,
    HJB_FRACTIONS,
    HJB_POLYNOMIALS,
    HJB_SIMPLE,
    PEP_EQUATIONS,
    PEP_POLYNOMIALS,
  ]);
  assert.deepEqual(SYMBOLIC_EXPRESSIONS_MODES, [
    "collect-like-terms",
    "add",
    "subtract",
    "expand",
    "factor",
    "substitute",
    "fraction-simplify",
    "solve",
  ]);
  assert.deepEqual(SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST, {
    [BNU_EXPRESSIONS]: ["collect-like-terms", "add", "subtract"],
    [BNU_FRACTIONS]: ["fraction-simplify", "solve"],
    [HJB_FRACTIONS]: ["fraction-simplify"],
    [HJB_POLYNOMIALS]: ["collect-like-terms", "add", "subtract"],
    [HJB_SIMPLE]: ["substitute", "collect-like-terms"],
    [PEP_EQUATIONS]: ["collect-like-terms", "solve"],
    [PEP_POLYNOMIALS]: ["expand", "factor", "fraction-simplify"],
  });
  assert.equal(
    SYMBOLIC_EXPRESSIONS_CURRICULUM[BNU_FRACTIONS].unitTitleZhHans,
    "分式与分式方程",
  );
  assert.ok(
    SYMBOLIC_EXPRESSIONS_CURRICULUM[BNU_FRACTIONS].capabilityIds.includes(
      "original-equation-domain-check",
    ),
  );
  assert.ok(
    SYMBOLIC_EXPRESSIONS_CURRICULUM[PEP_EQUATIONS].capabilityIds.includes(
      "independent-linear-equation",
    ),
  );
  assert.equal(
    Object.keys(SYMBOLIC_EXPRESSIONS_RESET_INPUTS).length,
    SYMBOLIC_EXPRESSIONS_LAB_IDS.length,
  );

  for (const labId of SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    const first = buildSymbolicExpressionsResetModel(labId);
    const second = buildSymbolicExpressionsResetModel(labId);
    assert.deepEqual(first, second, labId);
    assert.notEqual(first, second, labId);
    assert.equal(first.labId, labId);
    assert.ok(
      SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId].includes(first.mode as never),
      `${labId}: reset mode is not curriculum-authorized`,
    );
    assert.ok(
      first.invariantReceipts.every(
        ({ status }) => status === "passed" || status === "not-applicable",
      ),
      labId,
    );
    assert.match(first.stateKey, /^symbolic-transform-suite-v1\|/u);
  }
});

test("all 16 topic-mode pairs expose exact tri-state invariant applicability and N/A never passes", () => {
  const pairs = Object.entries(SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST).flatMap(
    ([labId, modes]) => modes.map((mode) => `${labId}:${mode}`),
  );
  assert.equal(pairs.length, 16);
  assert.deepEqual(
    [...pairs].sort(),
    Object.keys(EXPECTED_INVARIANT_APPLICABILITY).sort(),
  );

  for (const pair of pairs) {
    const separator = pair.lastIndexOf(":");
    const labId = pair.slice(0, separator) as (typeof SYMBOLIC_EXPRESSIONS_LAB_IDS)[number];
    const mode = pair.slice(separator + 1) as (typeof SYMBOLIC_EXPRESSIONS_MODES)[number];
    const model = modelForApplicability(labId, mode);
    const receipts = model.invariantReceipts as unknown as Array<{
      applicable: boolean;
      holds: boolean | null;
      id: string;
      status: "failed" | "not-applicable" | "passed";
    }>;
    const applicable = new Set(
      EXPECTED_INVARIANT_APPLICABILITY[
        pair as keyof typeof EXPECTED_INVARIANT_APPLICABILITY
      ],
    );
    assert.equal(receipts.length, 6, pair);
    assert.equal(new Set(receipts.map(({ id }) => id)).size, 6, pair);
    for (const receipt of receipts) {
      if (applicable.has(receipt.id as never)) {
        assert.equal(receipt.applicable, true, `${pair}:${receipt.id}`);
        assert.equal(receipt.status, "passed", `${pair}:${receipt.id}`);
        assert.equal(receipt.holds, true, `${pair}:${receipt.id}`);
      } else {
        assert.equal(receipt.applicable, false, `${pair}:${receipt.id}`);
        assert.equal(receipt.status, "not-applicable", `${pair}:${receipt.id}`);
        assert.equal(receipt.holds, null, `${pair}:${receipt.id}`);
      }
    }
  }
});

test("collect-like-terms groups by degree, never by coefficient, and exposes uncapped tile counts", () => {
  const model = buildSymbolicExpressionsModel({
    labId: BNU_EXPRESSIONS,
    mode: "collect-like-terms",
    terms: [
      { coefficient: 3, degree: 1 },
      { coefficient: 5, degree: 2 },
      { coefficient: -7, degree: 1 },
      { coefficient: 137, degree: 0 },
    ],
  });
  assert.deepEqual(polynomial(model).coefficients, [137, -4, 5]);
  assert.deepEqual(
    model.work.kind === "collect-like-terms"
      ? model.work.groups.map(({ degree, coefficientSum, sourceIndices }) => ({
          degree,
          coefficientSum,
          sourceIndices,
        }))
      : null,
    [
      { degree: 2, coefficientSum: 5, sourceIndices: [1] },
      { degree: 1, coefficientSum: -4, sourceIndices: [0, 2] },
      { degree: 0, coefficientSum: 137, sourceIndices: [3] },
    ],
  );
  assert.equal(polynomial(model).tiles.totalCount, 146);
  assert.deepEqual(polynomial(model).tiles.groups, [
    { coefficient: 5, count: 5, degree: 2, sign: "positive" },
    { coefficient: -4, count: 4, degree: 1, sign: "negative" },
    { coefficient: 137, count: 137, degree: 0, sign: "positive" },
  ]);
  assert.deepEqual(
    polynomial(model).tiles.reconstructedCoefficients,
    polynomial(model).coefficients,
  );
  if (model.work.kind !== "collect-like-terms") throw new Error("unreachable");
  assertZeroVector(model.work.coefficientResidual, model.stateKey);
  invariant(model, "like-term-coefficient-conservation");
  invariant(model, "polynomial-visible-tiles");
});

test("bounded exhaustive like-term inputs conserve every coefficient and source term", () => {
  let observed = 0;
  for (let a = -4; a <= 4; a += 1) {
    for (let b = -4; b <= 4; b += 1) {
      for (let c = -3; c <= 3; c += 1) {
        const model = buildSymbolicExpressionsModel({
          labId: HJB_POLYNOMIALS,
          mode: "collect-like-terms",
          terms: [
            { coefficient: a, degree: 1 },
            { coefficient: b, degree: 2 },
            { coefficient: c, degree: 1 },
            { coefficient: -b, degree: 0 },
          ],
        });
        const expected = [-b, a + c, b].map((value) =>
          Object.is(value, -0) ? 0 : value,
        );
        assert.deepEqual(
          polynomial(model).coefficients,
          expected.findLastIndex((value) => value !== 0) < 0
            ? [0]
            : expected.slice(
                0,
                expected.findLastIndex((value) => value !== 0) + 1,
              ),
          model.stateKey,
        );
        if (model.work.kind !== "collect-like-terms") {
          throw new Error("unreachable");
        }
        assert.equal(
          model.work.groups.reduce(
            (count, group) => count + group.sourceIndices.length,
            0,
          ),
          4,
          model.stateKey,
        );
        assertZeroVector(model.work.coefficientResidual, model.stateKey);
        assert.equal(
          polynomial(model).tiles.totalCount,
          polynomial(model).coefficients.reduce(
            (total, coefficient) => total + Math.abs(coefficient),
            0,
          ),
          model.stateKey,
        );
        observed += 1;
      }
    }
  }
  assert.equal(observed, 567);
});

test("polynomial add/subtract receipts reconstruct every output coefficient, including the hard sign case", () => {
  const hard = buildSymbolicExpressionsModel({
    labId: HJB_POLYNOMIALS,
    mode: "subtract",
    left: [1, -2, 3],
    right: [-5, 4, 1],
  });
  assert.deepEqual(polynomial(hard).coefficients, [6, -6, 2]);
  if (hard.work.kind !== "binary-polynomial") throw new Error("unreachable");
  assert.equal(hard.work.operator, "-");
  assert.deepEqual(hard.work.signedRight.coefficients, [5, -4, -1]);
  assert.deepEqual(
    hard.work.columns.map(
      ({
        degree,
        leftCoefficient,
        rightCoefficient,
        effectiveRightCoefficient,
        resultCoefficient,
      }) => ({
        degree,
        leftCoefficient,
        rightCoefficient,
        effectiveRightCoefficient,
        resultCoefficient,
      }),
    ),
    [
      {
        degree: 0,
        leftCoefficient: 1,
        rightCoefficient: -5,
        effectiveRightCoefficient: 5,
        resultCoefficient: 6,
      },
      {
        degree: 1,
        leftCoefficient: -2,
        rightCoefficient: 4,
        effectiveRightCoefficient: -4,
        resultCoefficient: -6,
      },
      {
        degree: 2,
        leftCoefficient: 3,
        rightCoefficient: 1,
        effectiveRightCoefficient: -1,
        resultCoefficient: 2,
      },
    ],
  );
  assertZeroVector(hard.work.coefficientResidual, hard.stateKey);

  let observed = 0;
  for (const mode of ["add", "subtract"] as const) {
    for (let a = -3; a <= 3; a += 1) {
      for (let b = -2; b <= 2; b += 1) {
        for (let c = -2; c <= 2; c += 1) {
          const left = [a, b, c];
          const right = [c, -a];
          const model = buildSymbolicExpressionsModel({
            labId: BNU_EXPRESSIONS,
            mode,
            left,
            right,
          });
          assert.deepEqual(
            polynomial(model).coefficients,
            addVectors(left, right, mode === "add" ? 1 : -1),
            model.stateKey,
          );
          if (model.work.kind !== "binary-polynomial") {
            throw new Error("unreachable");
          }
          assertZeroVector(model.work.coefficientResidual, model.stateKey);
          assert.equal(
            model.work.columns.length,
            Math.max(canonicalLength(left), canonicalLength(right)),
          );
          observed += 1;
        }
      }
    }
  }
  assert.equal(observed, 350);
});

test("expand uses full convolution and coefficient residuals, so point coincidences cannot fake identities", () => {
  const square = buildSymbolicExpressionsModel({
    labId: PEP_POLYNOMIALS,
    mode: "expand",
    factors: [[-4, 1], [-4, 1]],
  });
  assert.deepEqual(polynomial(square).coefficients, [16, -8, 1]);
  if (square.work.kind !== "expansion") throw new Error("unreachable");
  assert.equal(square.work.products.length, 4);
  assert.deepEqual(
    square.work.coefficientSums.map(({ degree, coefficientSum }) => ({
      degree,
      coefficientSum,
    })),
    [
      { degree: 0, coefficientSum: 16 },
      { degree: 1, coefficientSum: -8 },
      { degree: 2, coefficientSum: 1 },
    ],
  );
  assertZeroVector(square.work.coefficientResidual, square.stateKey);
  invariant(square, "polynomial-expansion");

  const wrongAtZeroResidual = [0, -8, 0];
  assert.notDeepEqual(wrongAtZeroResidual, [0, 0, 0]);
  assert.equal(
    16,
    16,
    "x^2 + 16 and (x - 4)^2 coincide at x=0; coefficient proof is required",
  );

  let observed = 0;
  for (let a = -3; a <= 3; a += 1) {
    for (let b = -3; b <= 3; b += 1) {
      for (let c = -2; c <= 2; c += 1) {
        for (let d = -2; d <= 2; d += 1) {
          const left = [a, b];
          const right = [c, d];
          const model = buildSymbolicExpressionsModel({
            labId: PEP_POLYNOMIALS,
            mode: "expand",
            factors: [left, right],
          });
          assert.deepEqual(
            polynomial(model).coefficients,
            multiplyVectors(left, right),
            model.stateKey,
          );
          if (model.work.kind !== "expansion") throw new Error("unreachable");
          assertZeroVector(model.work.coefficientResidual, model.stateKey);
          assert.equal(
            model.work.products.length,
            canonicalLength(left) * canonicalLength(right),
            model.stateKey,
          );
          observed += 1;
        }
      }
    }
  }
  assert.equal(observed, 1225);
});

test("factor mode proves the exact quotient by expansion and rejects nonfactors", () => {
  const model = buildSymbolicExpressionsModel({
    labId: PEP_POLYNOMIALS,
    mode: "factor",
    polynomial: [-9, 0, 1],
    factor: [-3, 1],
  });
  assert.deepEqual(polynomial(model).coefficients, [-9, 0, 1]);
  if (model.work.kind !== "factorization") throw new Error("unreachable");
  assert.deepEqual(model.work.quotient.coefficients, [3, 1]);
  assert.deepEqual(model.work.expandedProduct.coefficients, [-9, 0, 1]);
  assert.deepEqual(model.work.divisionRemainder.coefficients, [0]);
  assertZeroVector(model.work.coefficientResidual, model.stateKey);
  invariant(model, "polynomial-expansion");

  assertDomainError(
    {
      labId: PEP_POLYNOMIALS,
      mode: "factor",
      polynomial: [-9, 0, 1],
      factor: [-4, 1],
    },
    "NON_EXACT_FACTOR",
  );
});

test("substitution uses canonical rationals and exact contribution/residual receipts", () => {
  const primary = buildSymbolicExpressionsModel({
    labId: HJB_SIMPLE,
    mode: "substitute",
    polynomial: [-2, 3],
    value: rational(4),
  });
  assert.equal(primary.result.kind, "rational");
  if (primary.result.kind !== "rational") throw new Error("unreachable");
  equalRational(primary.result.value, 10);
  if (primary.work.kind !== "substitution") throw new Error("unreachable");
  assert.match(primary.work.substitutedExpression, /\(3\)\*\(4\)\^1/u);
  equalRational(primary.work.residual, 0);

  const model = buildSymbolicExpressionsModel({
    labId: HJB_SIMPLE,
    mode: "substitute",
    polynomial: [1, -2, 3],
    value: rational(-3, 2),
  });
  assert.equal(model.result.kind, "rational");
  if (model.result.kind !== "rational") throw new Error("unreachable");
  equalRational(model.result.value, 43, 4);
  if (model.work.kind !== "substitution") throw new Error("unreachable");
  assert.deepEqual(
    model.work.contributions.map(({ degree, contribution }) => ({
      degree,
      contribution,
    })),
    [
      { degree: 0, contribution: { numerator: 1, denominator: 1, text: "1" } },
      { degree: 1, contribution: { numerator: 3, denominator: 1, text: "3" } },
      {
        degree: 2,
        contribution: { numerator: 27, denominator: 4, text: "27/4" },
      },
    ],
  );
  equalRational(model.work.residual, 0);
  invariant(model, "equation-substitution-residual");

  let observed = 0;
  for (let c0 = -4; c0 <= 4; c0 += 1) {
    for (let c1 = -3; c1 <= 3; c1 += 1) {
      for (let numerator = -5; numerator <= 5; numerator += 1) {
        for (let denominator = 1; denominator <= 4; denominator += 1) {
          const state = buildSymbolicExpressionsModel({
            labId: HJB_SIMPLE,
            mode: "substitute",
            polynomial: [c0, c1],
            value: rational(numerator, denominator),
          });
          assert.equal(state.result.kind, "rational");
          if (state.result.kind !== "rational") throw new Error("unreachable");
          equalRational(
            state.result.value,
            c0 * denominator + c1 * numerator,
            denominator,
          );
          if (state.work.kind !== "substitution") throw new Error("unreachable");
          equalRational(state.work.residual, 0);
          observed += 1;
        }
      }
    }
  }
  assert.equal(observed, 2772);
});

test("fraction simplification retains the original exclusion and proves equivalence by cross-polynomial residual", () => {
  const model = buildSymbolicExpressionsModel({
    labId: HJB_FRACTIONS,
    mode: "fraction-simplify",
    fraction: {
      numerator: [-1, 0, 1],
      denominator: [-1, 1],
    },
    cancelFactors: [[-1, 1]],
    domainValue: rational(2),
  });
  assert.equal(model.result.kind, "algebraic-fraction");
  if (model.result.kind !== "algebraic-fraction") {
    throw new Error("unreachable");
  }
  assert.deepEqual(model.result.fraction.numerator.coefficients, [1, 1]);
  assert.deepEqual(model.result.fraction.denominator.coefficients, [1]);
  if (model.work.kind !== "fraction-simplification") {
    throw new Error("unreachable");
  }
  assert.deepEqual(model.work.domain.rationalExclusions, [
    { numerator: 1, denominator: 1, text: "1" },
  ]);
  assert.equal(model.work.domain.retainedOriginalRestrictions, true);
  assert.deepEqual(
    model.work.domain.effectiveRationalExclusions,
    model.work.domain.rationalExclusions,
  );
  assert.equal(model.work.domain.condition, "x - 1 ≠ 0");
  assert.equal(model.work.domain.checkedValue?.allowed, true);
  assert.equal(model.work.cancelledFactors.length, 1);
  assert.deepEqual(
    model.work.cancelledFactors[0]?.factor.coefficients,
    [-1, 1],
  );
  assert.equal(model.work.equivalence.equivalent, true);
  assertZeroVector(
    model.work.equivalence.coefficientResidual,
    model.stateKey,
  );
  invariant(model, "algebraic-fraction-domain");
  invariant(model, "algebraic-fraction-equivalence");

  assertDomainError(
    {
      labId: HJB_FRACTIONS,
      mode: "fraction-simplify",
      fraction: {
        numerator: [-1, 0, 1],
        denominator: [-1, 1],
      },
      cancelFactors: [[-1, 1]],
      domainValue: rational(1),
    },
    "DOMAIN_VIOLATION",
  );
});

test("false term cancellation exposes a nonzero full coefficient residual", () => {
  const original: AlgebraicFractionInput = {
    numerator: [1, 1],
    denominator: [2, 1],
  };
  const proposed: AlgebraicFractionInput = {
    numerator: [1],
    denominator: [2],
  };
  const receipt = buildAlgebraicFractionEquivalenceReceipt(
    original,
    proposed,
  );
  assert.equal(receipt.equivalent, false);
  assert.deepEqual(receipt.leftCrossProduct.coefficients, [2, 2]);
  assert.deepEqual(receipt.rightCrossProduct.coefficients, [2, 1]);
  assert.deepEqual(receipt.coefficientResidual, [0, 1]);
  assertDeepFrozen(receipt);
  assertJsonSafe(receipt);
});

test("factor identities use full coefficient residuals rather than a shared root probe", () => {
  const receipt = buildPolynomialIdentityReceipt(
    [-9, 0, 1],
    [9, -6, 1],
  );
  assert.equal(receipt.equivalent, false);
  assert.deepEqual(receipt.coefficientResidual, [-18, 6]);
  assert.equal(
    3 ** 2 - 9,
    (3 - 3) ** 2,
    "the wrong square shares x=3 with x^2-9 and defeats a one-point probe",
  );
  assertDeepFrozen(receipt);
  assertJsonSafe(receipt);
});

test("bounded exact cancellations preserve the original domain and reconstruct both fractions", () => {
  let observed = 0;
  for (let excluded = -4; excluded <= 4; excluded += 1) {
    for (let numeratorSlope = -3; numeratorSlope <= 3; numeratorSlope += 1) {
      if (numeratorSlope === 0) continue;
      for (let denominatorSlope = -2; denominatorSlope <= 2; denominatorSlope += 1) {
        if (denominatorSlope === 0) continue;
        const common = [-excluded, 1];
        const numeratorQuotient = [2, numeratorSlope];
        const denominatorQuotient = [3, denominatorSlope];
        const model = buildSymbolicExpressionsModel({
          labId: PEP_POLYNOMIALS,
          mode: "fraction-simplify",
          fraction: {
            numerator: multiplyVectors(common, numeratorQuotient),
            denominator: multiplyVectors(common, denominatorQuotient),
          },
          cancelFactors: [common],
        });
        if (model.work.kind !== "fraction-simplification") {
          throw new Error("unreachable");
        }
        assert.equal(model.work.equivalence.equivalent, true, model.stateKey);
        assertZeroVector(
          model.work.equivalence.coefficientResidual,
          model.stateKey,
        );
        assert.ok(
          model.work.domain.rationalExclusions.some(
            ({ numerator, denominator }) =>
              numerator === excluded && denominator === 1,
          ),
          `${model.stateKey}: missing retained x=${excluded} exclusion`,
        );
        assert.equal(model.result.kind, "algebraic-fraction");
        if (model.result.kind !== "algebraic-fraction") {
          throw new Error("unreachable");
        }
        assert.deepEqual(
          model.result.fraction.numerator.coefficients,
          numeratorQuotient,
        );
        assert.deepEqual(
          model.result.fraction.denominator.coefficients,
          denominatorQuotient,
        );
        observed += 1;
      }
    }
  }
  assert.equal(observed, 216);
});

test("solve carries an independent original equation, exact solution, domain checks, and substitution residual", () => {
  const model = buildSymbolicExpressionsModel({
    labId: BNU_FRACTIONS,
    mode: "solve",
    equation: {
      left: { numerator: [2], denominator: [-1, 1] },
      right: { numerator: [1], denominator: [1] },
    },
    candidate: rational(3),
  });
  assert.equal(model.result.kind, "rational");
  if (model.result.kind !== "rational") throw new Error("unreachable");
  equalRational(model.result.value, 3);
  if (model.work.kind !== "equation-solve") throw new Error("unreachable");
  assert.equal(model.work.equationKind, "fractional-linear");
  assert.deepEqual(model.work.acceptedSolutions, [
    { numerator: 3, denominator: 1, text: "3" },
  ]);
  assert.deepEqual(
    model.work.crossEquation.residualPolynomial.coefficients,
    [3, -1],
  );
  equalRational(model.work.solution, 3);
  assert.equal(model.work.solutionCheck.domainValid, true);
  assert.equal(model.work.solutionCheck.isSolution, true);
  equalRational(model.work.solutionCheck.leftValue, 1);
  equalRational(model.work.solutionCheck.rightValue, 1);
  equalRational(model.work.solutionCheck.residual, 0);
  assert.equal(model.work.candidateCheck?.isSolution, true);
  invariant(model, "equation-substitution-residual");
  invariant(model, "algebraic-fraction-domain");

  assertDomainError(
    {
      labId: BNU_FRACTIONS,
      mode: "solve",
      equation: {
        left: { numerator: [2], denominator: [-1, 1] },
        right: { numerator: [1], denominator: [1] },
      },
      candidate: rational(1),
    },
    "DOMAIN_VIOLATION",
  );

  const wrongCandidate = buildSymbolicExpressionsModel({
    labId: BNU_FRACTIONS,
    mode: "solve",
    equation: {
      left: { numerator: [2], denominator: [-1, 1] },
      right: { numerator: [1], denominator: [1] },
    },
    candidate: rational(4),
  });
  if (wrongCandidate.work.kind !== "equation-solve") {
    throw new Error("unreachable");
  }
  assert.equal(wrongCandidate.work.candidateCheck?.domainValid, true);
  assert.equal(wrongCandidate.work.candidateCheck?.isSolution, false);
  equalRational(wrongCandidate.work.candidateCheck?.residual as ExactRational, -1, 3);
});

test("bounded linear and fractional-equation sweeps derive and verify exact rational solutions", () => {
  let observed = 0;
  for (let slope = -5; slope <= 5; slope += 1) {
    if (slope === 0) continue;
    for (let intercept = -6; intercept <= 6; intercept += 1) {
      for (let rightConstant = -3; rightConstant <= 3; rightConstant += 1) {
        const model = buildSymbolicExpressionsModel({
          labId: PEP_EQUATIONS,
          mode: "solve",
          equation: {
            left: { numerator: [intercept, slope], denominator: [1] },
            right: { numerator: [rightConstant], denominator: [1] },
          },
        });
        if (model.work.kind !== "equation-solve") {
          throw new Error("unreachable");
        }
        equalRational(
          model.work.solution,
          rightConstant - intercept,
          slope,
        );
        equalRational(model.work.solutionCheck.residual, 0);
        assert.equal(model.work.solutionCheck.isSolution, true);
        observed += 1;
      }
    }
  }

  for (let excluded = -3; excluded <= 3; excluded += 1) {
    for (let numerator = 1; numerator <= 5; numerator += 1) {
      for (let right = 1; right <= 4; right += 1) {
        const solutionNumerator = excluded * right + numerator;
        const model = buildSymbolicExpressionsModel({
          labId: BNU_FRACTIONS,
          mode: "solve",
          equation: {
            left: {
              numerator: [numerator],
              denominator: [-excluded, 1],
            },
            right: { numerator: [right], denominator: [1] },
          },
          candidate: rational(solutionNumerator, right),
        });
        if (model.work.kind !== "equation-solve") {
          throw new Error("unreachable");
        }
        equalRational(model.work.solution, solutionNumerator, right);
        equalRational(model.work.solutionCheck.residual, 0);
        assert.equal(model.work.candidateCheck?.isSolution, true);
        observed += 1;
      }
    }
  }
  assert.equal(observed, 1050);
});

test("outputs and exported contracts are deterministic, deeply frozen, JSON-safe, and mutation-proof", () => {
  const inputs: SymbolicExpressionsInput[] = [
    {
      labId: BNU_EXPRESSIONS,
      mode: "collect-like-terms",
      terms: [
        { coefficient: 3, degree: 1 },
        { coefficient: -5, degree: 0 },
        { coefficient: 2, degree: 1 },
      ],
    },
    {
      labId: HJB_SIMPLE,
      mode: "substitute",
      polynomial: [1, 2, 3],
      value: rational(-2, 3),
    },
    {
      labId: PEP_POLYNOMIALS,
      mode: "fraction-simplify",
      fraction: {
        numerator: [-1, 0, 1],
        denominator: [-1, 1],
      },
      cancelFactors: [[-1, 1]],
    },
  ];

  assertDeepFrozen(SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT);
  assertDeepFrozen(SYMBOLIC_EXPRESSIONS_LAB_IDS);
  assertDeepFrozen(SYMBOLIC_EXPRESSIONS_MODES);
  assertDeepFrozen(SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST);
  assertDeepFrozen(SYMBOLIC_EXPRESSIONS_CURRICULUM);
  assertDeepFrozen(SYMBOLIC_EXPRESSIONS_RESET_INPUTS);

  for (const input of inputs) {
    const first = buildSymbolicExpressionsModel(input);
    const second = buildSymbolicExpressionsModel(input);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.equal(first.stateKey, second.stateKey);
    assertDeepFrozen(first);
    assertJsonSafe(first);
    assert.ok(
      first.controls.every(
        ({ expected, observed, projection, requested }) =>
          projection === "identity" &&
          requested === expected &&
          expected === observed,
      ),
      first.stateKey,
    );
    assert.ok(
      first.invariantReceipts.every(
        ({ exact, residual }) => exact && residual !== undefined,
      ),
      first.stateKey,
    );
    const encoded = JSON.stringify(first);
    assert.doesNotMatch(encoded, /NaN|Infinity|undefined/u);
    assert.deepEqual(JSON.parse(encoded), first);
    assert.throws(
      () => {
        (first.invariantReceipts as unknown[]).push({});
      },
      TypeError,
    );
  }
});

test("unknown IDs/modes, mode leakage, zero denominators, domain violations, and unsafe integers fail closed", () => {
  const collect = {
    labId: BNU_EXPRESSIONS,
    mode: "collect-like-terms",
    terms: [{ coefficient: 1, degree: 1 }],
  };
  assertDomainError({ ...collect, labId: "unknown-lab" }, "INVALID_LAB_ID");
  assertDomainError({ ...collect, mode: "differentiate" }, "INVALID_MODE");
  assertDomainError(
    { ...collect, labId: HJB_FRACTIONS },
    "MODE_NOT_ALLOWED",
  );
  assertDomainError(
    {
      ...collect,
      terms: [{ coefficient: Number.MAX_SAFE_INTEGER + 1, degree: 1 }],
    },
    "NON_SAFE_INTEGER",
  );
  assertDomainError(
    {
      ...collect,
      terms: [{ coefficient: Number.NaN, degree: 1 }],
    },
    "NON_FINITE_INTEGER",
  );
  assertDomainError(
    {
      ...collect,
      terms: [{ coefficient: 1.5, degree: 1 }],
    },
    "NON_INTEGER",
  );
  assertDomainError(
    {
      ...collect,
      terms: [
        {
          coefficient: 1,
          degree: SYMBOLIC_EXPRESSIONS_DOMAIN.maxDegree + 1,
        },
      ],
    },
    "DEGREE_OUT_OF_DOMAIN",
  );
  assertDomainError(
    {
      labId: HJB_SIMPLE,
      mode: "substitute",
      polynomial: [1, 1],
      value: rational(1, 0),
    },
    "ZERO_RATIONAL_DENOMINATOR",
  );
  assertDomainError(
    {
      labId: HJB_FRACTIONS,
      mode: "fraction-simplify",
      fraction: { numerator: [1], denominator: [0] },
      cancelFactors: [],
    },
    "ZERO_POLYNOMIAL_DENOMINATOR",
  );
  assertDomainError(
    {
      labId: HJB_FRACTIONS,
      mode: "fraction-simplify",
      fraction: { numerator: [-1, 0, 1], denominator: [-1, 1] },
      cancelFactors: [],
    },
    "INVALID_FACTOR_COUNT",
  );
  assertDomainError(
    {
      labId: HJB_FRACTIONS,
      mode: "fraction-simplify",
      fraction: { numerator: [1, 1], denominator: [2, 1] },
      cancelFactors: [[1, 1]],
    },
    "NON_EXACT_CANCELLATION",
  );
  assertDomainError(
    {
      labId: PEP_POLYNOMIALS,
      mode: "expand",
      factors: [
        [SYMBOLIC_EXPRESSIONS_DOMAIN.maxAbsCoefficient, 1],
        [SYMBOLIC_EXPRESSIONS_DOMAIN.maxAbsCoefficient, 1],
      ],
    },
    "UNSAFE_RESULT",
  );
  assertDomainError(
    {
      labId: PEP_EQUATIONS,
      mode: "solve",
      equation: {
        left: { numerator: [1, 0, 1], denominator: [1] },
        right: { numerator: [0], denominator: [1] },
      },
    },
    "UNSUPPORTED_EQUATION_DEGREE",
  );
});
