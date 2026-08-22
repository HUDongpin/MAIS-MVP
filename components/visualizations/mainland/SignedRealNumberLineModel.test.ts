import assert from "node:assert/strict";
import test from "node:test";
import {
  SIGNED_REAL_NUMBER_LINE_DOMAIN,
  SIGNED_REAL_NUMBER_LINE_EXACT_MODES,
  SIGNED_REAL_NUMBER_LINE_LAB_IDS,
  SIGNED_REAL_NUMBER_LINE_MODES,
  SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT,
  SIGNED_REAL_NUMBER_LINE_RESET_INPUT,
  SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES,
  SignedRealNumberLineDomainError,
  buildSignedRealNumberLineModel,
  buildSignedRealNumberLineResetModel,
  getSignedRealNumberLineTopicProfile,
  type ExactRationalInput,
  type QuadraticSurdInput,
  type SignedRealNumberLineInput,
  type SignedRealNumberLineModel,
} from "./SignedRealNumberLineModel";

const DEFAULT_LAB_ID = "bnu-junior-s1-upper-rational-numbers" as const;

function rational(numerator: number, denominator = 1): ExactRationalInput {
  return { kind: "rational", numerator, denominator };
}

function invariant(model: SignedRealNumberLineModel, id: string) {
  const receipt = model.invariantReceipts.find(
    (candidate) => candidate.id === id,
  );
  assert.ok(receipt, `${model.stateKey}: missing invariant ${id}`);
  assert.equal(receipt.passed, true, `${model.stateKey}: ${id}`);
  return receipt;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

function expectedRational(numerator: number, denominator: number) {
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  const normalizedNumerator = sign * (numerator / divisor);
  return {
    numerator: Object.is(normalizedNumerator, -0) ? 0 : normalizedNumerator,
    denominator: Math.abs(denominator / divisor),
  };
}

function compareRationals(
  left: { numerator: number; denominator: number },
  right: { numerator: number; denominator: number },
) {
  return Math.sign(
    left.numerator * right.denominator -
      right.numerator * left.denominator,
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
  code: SignedRealNumberLineDomainError["code"],
) {
  assert.throws(
    () => buildSignedRealNumberLineModel(input as SignedRealNumberLineInput),
    (error: unknown) =>
      error instanceof SignedRealNumberLineDomainError && error.code === code,
  );
}

test("G03 contract pins the exact six lab IDs, six modes, and a deterministic reset", () => {
  assert.deepEqual(SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT, {
    family: "signed-real-number-line",
    groupId: "G03",
    version: "signed-real-number-line-v1",
  });
  assert.deepEqual(SIGNED_REAL_NUMBER_LINE_LAB_IDS, [
    "bnu-junior-s1-upper-rational-numbers",
    "bnu-junior-s2-upper-real-numbers",
    "hjb-junior-s2-upper-quadratic-radicals",
    "hjb-junior-s2-upper-real-numbers",
    "hjb-primary-p6-lower-rational-numbers",
    "pep-junior-s1-upper-rational-numbers",
  ]);
  assert.deepEqual(SIGNED_REAL_NUMBER_LINE_MODES, [
    "locate",
    "compare",
    "add",
    "subtract",
    "absolute-value",
    "radical",
  ]);
  assert.deepEqual(SIGNED_REAL_NUMBER_LINE_RESET_INPUT, {
    labId: DEFAULT_LAB_ID,
    mode: "locate",
    precision: 2,
    value: rational(-3, 2),
  });

  const first = buildSignedRealNumberLineResetModel();
  const second = buildSignedRealNumberLineResetModel();
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.equal(first.point.symbolic, "-3/2");
  assert.equal(first.approximation.text, "-1.50");
  assert.match(first.stateKey, /^signed-real-number-line-v1\|/u);
});

test("rational points normalize signs, expose origin distance, and preserve zero canonically", () => {
  const positive = buildSignedRealNumberLineModel({
    labId: DEFAULT_LAB_ID,
    mode: "locate",
    precision: 3,
    value: rational(-6, -8),
  });
  assert.deepEqual(positive.point, {
    kind: "rational",
    numerator: 3,
    denominator: 4,
    symbolic: "3/4",
  });
  assert.deepEqual(positive.origin, {
    kind: "rational",
    numerator: 0,
    denominator: 1,
    symbolic: "0",
  });
  assert.equal(positive.side, "positive");
  assert.equal(positive.sign, 1);
  assert.deepEqual(positive.absoluteValueDistance.exact, positive.point);
  assert.equal(positive.approximation.text, "0.750");
  assert.deepEqual(positive.approximation.errorBound, {
    numerator: 0,
    denominator: 1,
  });

  const negative = buildSignedRealNumberLineModel({
    labId: DEFAULT_LAB_ID,
    mode: "absolute-value",
    precision: 2,
    value: rational(7, -3),
  });
  assert.equal(negative.point.symbolic, "-7/3");
  assert.equal(negative.sign, -1);
  assert.equal(negative.side, "negative");
  assert.deepEqual(negative.absoluteValueDistance.exact, {
    kind: "rational",
    numerator: 7,
    denominator: 3,
    symbolic: "7/3",
  });
  assert.equal(negative.approximation.text, "-2.33");
  assert.equal(negative.point.kind, "rational");
  if (negative.point.kind !== "rational") throw new Error("unreachable");
  assert.equal(
    compareRationals(negative.approximation.interval.lower, negative.point),
    -1,
  );
  assert.equal(
    compareRationals(negative.point, negative.approximation.interval.upper),
    -1,
  );

  const zero = buildSignedRealNumberLineModel({
    labId: DEFAULT_LAB_ID,
    mode: "locate",
    precision: 4,
    value: rational(0, -9),
  });
  assert.equal(zero.point.symbolic, "0");
  assert.equal(zero.sign, 0);
  assert.equal(zero.side, "origin");
  assert.deepEqual(zero.absoluteValueDistance.exact, zero.origin);
  assert.equal(zero.approximation.unscaled, 0);
  assert.equal(Object.is(zero.approximation.unscaled, -0), false);
  invariant(zero, "absolute-value-distance");
  invariant(zero, "signed-origin-stability");
});

test("bounded exhaustive rational points stay normalized and inside their exact decimal receipts", () => {
  let observed = 0;
  for (let numerator = -40; numerator <= 40; numerator += 1) {
    for (let denominator = -16; denominator <= 16; denominator += 1) {
      if (denominator === 0) continue;
      const precision = (Math.abs(numerator) + Math.abs(denominator)) % 5;
      const model = buildSignedRealNumberLineModel({
        labId: DEFAULT_LAB_ID,
        mode: numerator % 2 === 0 ? "locate" : "absolute-value",
        precision,
        value: rational(numerator, denominator),
      });
      assert.equal(model.point.kind, "rational", model.stateKey);
      if (model.point.kind !== "rational") throw new Error("unreachable");
      assert.ok(model.point.denominator > 0, model.stateKey);
      assert.equal(
        gcd(model.point.numerator, model.point.denominator),
        1,
        model.stateKey,
      );
      assert.ok(
        compareRationals(model.approximation.interval.lower, model.point) <= 0,
        model.stateKey,
      );
      assert.ok(
        compareRationals(model.point, model.approximation.interval.upper) <= 0,
        model.stateKey,
      );
      assert.ok(
        model.approximation.exactAbsoluteError,
        `${model.stateKey}: missing exact rational error`,
      );
      assert.ok(
        compareRationals(
          model.approximation.exactAbsoluteError,
          model.approximation.errorBound,
        ) <= 0,
        model.stateKey,
      );
      assert.ok(model.invariantReceipts.every(({ status }) => status !== "fail"));
      assertJsonSafe(model);
      observed += 1;
    }
  }
  assert.equal(observed, 2592);
});

test("rational comparison is exact by cross-product across signs and dense bounded inputs", () => {
  let observed = 0;
  for (let leftNumerator = -10; leftNumerator <= 10; leftNumerator += 1) {
    for (let leftDenominator = 1; leftDenominator <= 6; leftDenominator += 1) {
      for (
        let rightNumerator = -9;
        rightNumerator <= 9;
        rightNumerator += 1
      ) {
        for (
          let rightDenominator = 1;
          rightDenominator <= 5;
          rightDenominator += 1
        ) {
          const model = buildSignedRealNumberLineModel({
            labId: DEFAULT_LAB_ID,
            mode: "compare",
            precision: 3,
            left: rational(leftNumerator, leftDenominator),
            right: rational(rightNumerator, rightDenominator),
          });
          const expected = Math.sign(
            leftNumerator * rightDenominator -
              rightNumerator * leftDenominator,
          );
          assert.equal(model.comparison?.result, expected, model.stateKey);
          assert.equal(
            model.comparison?.exactReceipt.strategy,
            "rational-cross-product",
            model.stateKey,
          );
          invariant(model, "exact-cross-product");
          observed += 1;
        }
      }
    }
  }
  assert.equal(observed, 11_970);
});

test("irrational square roots carry rigorous signed decimal bounds at every precision", () => {
  for (const sign of [-1, 1] as const) {
    for (
      let precision = 0;
      precision <= SIGNED_REAL_NUMBER_LINE_DOMAIN.maxPrecision;
      precision += 1
    ) {
      const model = buildSignedRealNumberLineModel({
        labId: "hjb-junior-s2-upper-real-numbers",
        mode: "radical",
        precision,
        value: { kind: "radical", index: 2, radicand: 2, sign },
      });
      assert.equal(model.point.kind, "radical");
      if (model.point.kind !== "radical") throw new Error("unreachable");
      assert.equal(model.point.sign, sign);
      assert.equal(model.point.symbolic, sign < 0 ? "-√(2)" : "√(2)");
      assert.equal(model.approximation.powerReceipt?.index, 2);
      const receipt = model.approximation.powerReceipt;
      assert.ok(receipt);
      const lowerPower = BigInt(receipt.lowerPower);
      const targetPower = BigInt(receipt.scaledRadicand);
      const nextPower = BigInt(receipt.nextPower);
      assert.ok(lowerPower < targetPower, model.stateKey);
      assert.ok(targetPower < nextPower, model.stateKey);
      assert.deepEqual(model.approximation.errorBound, {
        numerator: 1,
        denominator: 10 ** precision,
      });
      assert.equal(
        model.absoluteValueDistance.exact.symbolic,
        "√(2)",
      );
      invariant(model, "radical-square-error");
      invariant(model, "absolute-value-distance");
      invariant(model, "signed-origin-stability");
    }
  }
});

test("bounded radical sweep proves floor powers, exact perfect roots, signs, and odd negative radicands", () => {
  let observed = 0;
  for (let index = 2; index <= 5; index += 1) {
    for (let radicand = 0; radicand <= 64; radicand += 1) {
      for (const sign of [-1, 1] as const) {
        for (let precision = 0; precision <= 3; precision += 1) {
          const model = buildSignedRealNumberLineModel({
            labId: "bnu-junior-s2-upper-real-numbers",
            mode: "locate",
            precision,
            value: { kind: "radical", index, radicand, sign },
          });
          const exactMagnitude = Math.round(radicand ** (1 / index));
          const isPerfectPower = exactMagnitude ** index === radicand;
          const receipt = model.approximation.powerReceipt;
          if (isPerfectPower) {
            assert.equal(model.point.kind, "rational", model.stateKey);
            assert.equal(receipt, null, model.stateKey);
          } else {
            assert.ok(receipt, model.stateKey);
            const lowerPower = BigInt(receipt.lowerPower);
            const targetPower = BigInt(receipt.scaledRadicand);
            const nextPower = BigInt(receipt.nextPower);
            assert.ok(lowerPower <= targetPower, model.stateKey);
            assert.ok(targetPower < nextPower, model.stateKey);
          }
          assert.equal(model.sign, radicand === 0 ? 0 : sign, model.stateKey);
          assert.equal(
            model.absoluteValueDistance.exact.kind,
            isPerfectPower ? "rational" : "radical",
            model.stateKey,
          );
          assert.ok(
            model.invariantReceipts.every(({ status }) => status !== "fail"),
          );
          observed += 1;
        }
      }
    }
  }

  for (let radicand = 1; radicand <= 31; radicand += 1) {
    const negativeCubeRoot = buildSignedRealNumberLineModel({
      labId: "hjb-junior-s2-upper-real-numbers",
      mode: "locate",
      precision: 4,
      value: { kind: "radical", index: 3, radicand: -radicand, sign: 1 },
    });
    const cubeRoot = Math.round(radicand ** (1 / 3));
    if (cubeRoot ** 3 === radicand) {
      assert.equal(negativeCubeRoot.point.kind, "rational");
      assert.equal(negativeCubeRoot.point.symbolic, String(-cubeRoot));
    } else {
      assert.equal(negativeCubeRoot.point.kind, "radical");
      if (negativeCubeRoot.point.kind !== "radical")
        throw new Error("unreachable");
      assert.equal(negativeCubeRoot.point.radicand, radicand);
      assert.equal(negativeCubeRoot.point.sign, -1);
    }
    assert.equal(negativeCubeRoot.sign, -1);
  }
  assert.equal(observed, 2080);
});

test("mixed rational and radical comparison remains algebraically exact, including negatives and equal powers", () => {
  const inputs = [
    {
      left: { kind: "radical", index: 2, radicand: 2, sign: 1 } as const,
      right: rational(7, 5),
      expected: 1,
      strategy: "rational-radical-power",
    },
    {
      left: { kind: "radical", index: 2, radicand: 2, sign: -1 } as const,
      right: rational(-7, 5),
      expected: -1,
      strategy: "rational-radical-power",
    },
    {
      left: { kind: "radical", index: 2, radicand: 4, sign: 1 } as const,
      right: { kind: "radical", index: 3, radicand: 8, sign: 1 } as const,
      expected: 0,
      strategy: "rational-cross-product",
    },
    {
      left: rational(0),
      right: { kind: "radical", index: 5, radicand: 0, sign: -1 } as const,
      expected: 0,
      strategy: "rational-cross-product",
    },
  ];

  for (const item of inputs) {
    const model = buildSignedRealNumberLineModel({
      labId: "bnu-junior-s2-upper-real-numbers",
      mode: "compare",
      precision: 5,
      left: item.left,
      right: item.right,
    });
    assert.equal(model.comparison?.result, item.expected, model.stateKey);
    assert.equal(
      model.comparison?.exactReceipt.strategy,
      item.strategy,
      model.stateKey,
    );
    invariant(model, "exact-cross-product");
  }
});

test("add and subtract expose exact signed start, input step, signed step, and endpoint receipts exhaustively", () => {
  let observed = 0;
  for (const mode of ["add", "subtract"] as const) {
    for (let startNumerator = -8; startNumerator <= 8; startNumerator += 1) {
      for (let startDenominator = 1; startDenominator <= 4; startDenominator += 1) {
        for (let stepNumerator = -7; stepNumerator <= 7; stepNumerator += 1) {
          for (let stepDenominator = 1; stepDenominator <= 4; stepDenominator += 1) {
            const model = buildSignedRealNumberLineModel({
              labId: "pep-junior-s1-upper-rational-numbers",
              mode,
              precision: 3,
              start: rational(startNumerator, startDenominator),
              step: rational(stepNumerator, stepDenominator),
            });
            const operation = model.operation;
            assert.ok(operation, model.stateKey);
            const signedStepNumerator =
              mode === "add" ? stepNumerator : -stepNumerator;
            const expected = expectedRational(
              startNumerator * stepDenominator +
                signedStepNumerator * startDenominator,
              startDenominator * stepDenominator,
            );
            assert.deepEqual(
              {
                numerator: operation.endpoint.numerator,
                denominator: operation.endpoint.denominator,
              },
              expected,
              model.stateKey,
            );
            assert.equal(
              operation.signedStep.numerator,
              expectedRational(signedStepNumerator, stepDenominator).numerator,
              model.stateKey,
            );
            assert.deepEqual(model.point, operation.endpoint, model.stateKey);
            invariant(model, "additive-endpoint");
            observed += 1;
          }
        }
      }
    }
  }
  assert.equal(observed, 8160);
});

test("model output is deterministic, deeply frozen, JSON round-trippable, and contains no BigInt or negative zero", () => {
  const input: SignedRealNumberLineInput = {
    labId: "hjb-junior-s2-upper-real-numbers",
    mode: "compare",
    precision: 6,
    left: { kind: "radical", index: 2, radicand: 2, sign: -1 },
    right: rational(-14142, 10000),
  };
  const first = buildSignedRealNumberLineModel(input);
  const second = buildSignedRealNumberLineModel(input);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.equal(first.stateKey, second.stateKey);
  assertDeepFrozen(first);
  assertJsonSafe(first);
  const encoded = JSON.stringify(first);
  assert.doesNotMatch(encoded, /NaN|Infinity|undefined/u);
  assert.deepEqual(JSON.parse(encoded), first);
  assert.throws(
    () => {
      (first.invariantReceipts as unknown[]).push({});
    },
    TypeError,
  );
});

test("all invalid IDs, modes, numeric boundaries, rational denominators, radicals, and mode payloads fail closed", () => {
  const base = {
    labId: DEFAULT_LAB_ID,
    mode: "locate",
    precision: 2,
    value: rational(1, 2),
  };
  const realBase = {
    ...base,
    labId: "bnu-junior-s2-upper-real-numbers" as const,
  };
  assertDomainError({ ...base, labId: "unknown-lab" }, "INVALID_LAB_ID");
  assertDomainError({ ...base, mode: "not-a-mode" }, "INVALID_MODE");
  assertDomainError(
    { ...base, value: rational(Number.NaN, 2) },
    "NON_FINITE_NUMBER",
  );
  assertDomainError(
    { ...base, value: rational(Number.POSITIVE_INFINITY, 2) },
    "NON_FINITE_NUMBER",
  );
  assertDomainError(
    { ...base, value: rational(Number.MAX_SAFE_INTEGER + 1, 2) },
    "NON_SAFE_INTEGER",
  );
  assertDomainError(
    {
      ...base,
      value: rational(
        SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger + 1,
        2,
      ),
    },
    "COMPONENT_OUT_OF_DOMAIN",
  );
  assertDomainError({ ...base, value: rational(1, 0) }, "ZERO_DENOMINATOR");
  assertDomainError(
    { ...realBase, value: { kind: "decimal", numerator: 1, denominator: 2 } },
    "INVALID_NUMBER_KIND",
  );
  assertDomainError(
    {
      ...realBase,
      value: {
        kind: "radical",
        index: 2,
        radicand: -2,
        sign: 1,
      },
    },
    "EVEN_ROOT_OF_NEGATIVE",
  );
  assertDomainError(
    {
      ...realBase,
      value: { kind: "radical", index: 1, radicand: 2, sign: 1 },
    },
    "INVALID_RADICAL_INDEX",
  );
  assertDomainError(
    {
      ...realBase,
      value: {
        kind: "radical",
        index: SIGNED_REAL_NUMBER_LINE_DOMAIN.maxRadicalIndex + 1,
        radicand: 2,
        sign: 1,
      },
    },
    "INVALID_RADICAL_INDEX",
  );
  assertDomainError(
    {
      ...realBase,
      value: {
        kind: "radical",
        index: 3,
        radicand: SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger + 1,
        sign: 1,
      },
    },
    "COMPONENT_OUT_OF_DOMAIN",
  );
  assertDomainError(
    {
      ...realBase,
      value: { kind: "radical", index: 2.5, radicand: 2, sign: 1 },
    },
    "NON_SAFE_INTEGER",
  );
  assertDomainError(
    {
      ...realBase,
      value: { kind: "radical", index: 2, radicand: 2, sign: 0 },
    },
    "INVALID_RADICAL_SIGN",
  );
  assertDomainError({ ...base, precision: -1 }, "INVALID_PRECISION");
  assertDomainError(
    {
      ...base,
      precision: SIGNED_REAL_NUMBER_LINE_DOMAIN.maxPrecision + 1,
    },
    "INVALID_PRECISION",
  );
  assertDomainError(
    { ...base, precision: 1.5 },
    "NON_SAFE_INTEGER",
  );
  assertDomainError(
    {
      labId: "bnu-junior-s2-upper-real-numbers",
      mode: "compare",
      precision: 2,
      left: rational(1, 2),
    },
    "MISSING_MODE_INPUT",
  );
  assertDomainError(
    {
      labId: DEFAULT_LAB_ID,
      mode: "add",
      precision: 2,
      start: { kind: "radical", index: 2, radicand: 2, sign: 1 },
      step: rational(1, 2),
    },
    "MODE_KIND_MISMATCH",
  );
  assertDomainError(
    {
      labId: "bnu-junior-s2-upper-real-numbers",
      mode: "radical",
      precision: 2,
      value: rational(2),
    },
    "MODE_KIND_MISMATCH",
  );
});

function surd(
  radicand: number,
  coefficientNumerator = 1,
  coefficientDenominator = 1,
): QuadraticSurdInput {
  return {
    kind: "quadratic-surd",
    coefficient: rational(coefficientNumerator, coefficientDenominator),
    radicand,
  };
}

test("G03 topic profiles pin exact curriculum-specific mode allowlists and resets", () => {
  assert.deepEqual(SIGNED_REAL_NUMBER_LINE_EXACT_MODES, [
    "locate",
    "compare",
    "add",
    "subtract",
    "multiply",
    "divide",
    "opposite",
    "absolute-value",
    "radical",
    "classify",
    "square-root",
    "cube-root",
    "estimate",
    "simplify",
    "radical-add",
    "radical-subtract",
    "radical-multiply",
    "radical-divide",
    "estimate-check",
  ]);

  const rationalIds = [
    "bnu-junior-s1-upper-rational-numbers",
    "hjb-primary-p6-lower-rational-numbers",
    "pep-junior-s1-upper-rational-numbers",
  ] as const;
  const realIds = [
    "bnu-junior-s2-upper-real-numbers",
    "hjb-junior-s2-upper-real-numbers",
  ] as const;
  const radicalId = "hjb-junior-s2-upper-quadratic-radicals" as const;

  for (const labId of rationalIds) {
    const profile = getSignedRealNumberLineTopicProfile(labId);
    assert.equal(profile.kind, "rational");
    assert.deepEqual(profile.allowedModes, [
      "locate",
      "compare",
      "add",
      "subtract",
      "multiply",
      "divide",
      "opposite",
      "absolute-value",
    ]);
    assert.equal(buildSignedRealNumberLineResetModel(labId).state.labId, labId);
    assert.equal(buildSignedRealNumberLineResetModel(labId).point.symbolic, "-3/2");
  }
  for (const labId of realIds) {
    const profile = getSignedRealNumberLineTopicProfile(labId);
    assert.equal(profile.kind, "real");
    assert.deepEqual(profile.allowedModes, [
      "locate",
      "compare",
      "absolute-value",
      "radical",
      "classify",
      "square-root",
      "cube-root",
      "estimate",
    ]);
    assert.equal(buildSignedRealNumberLineResetModel(labId).state.labId, labId);
    assert.equal(buildSignedRealNumberLineResetModel(labId).point.symbolic, "√(2)");
  }
  const radicalProfile = getSignedRealNumberLineTopicProfile(radicalId);
  assert.equal(radicalProfile.kind, "quadratic-radical");
  assert.deepEqual(radicalProfile.allowedModes, [
    "simplify",
    "radical-add",
    "radical-subtract",
    "radical-multiply",
    "radical-divide",
    "estimate-check",
  ]);
  const radicalReset = buildSignedRealNumberLineResetModel(radicalId);
  assert.equal(radicalReset.radicalOperation?.result.symbolic, "2√3");
  assert.deepEqual(Object.keys(SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES).sort(), [
    ...SIGNED_REAL_NUMBER_LINE_LAB_IDS,
  ].sort());

  assertDomainError(
    {
      labId: rationalIds[0],
      mode: "radical",
      precision: 2,
      value: { kind: "radical", index: 2, radicand: 2, sign: 1 },
    },
    "MODE_NOT_ALLOWED_FOR_TOPIC",
  );
  assertDomainError(
    {
      labId: realIds[0],
      mode: "multiply",
      precision: 2,
      left: rational(2),
      right: rational(3),
    },
    "MODE_NOT_ALLOWED_FOR_TOPIC",
  );
  assertDomainError(
    {
      labId: radicalId,
      mode: "locate",
      precision: 2,
      value: rational(2),
    },
    "MODE_NOT_ALLOWED_FOR_TOPIC",
  );
});

test("rational topics expose exact four operations, opposite, and absolute value", () => {
  const labId = "pep-junior-s1-upper-rational-numbers" as const;
  const cases = [
    {
      input: {
        labId,
        mode: "add",
        precision: 3,
        start: rational(-3, 4),
        step: rational(5, 6),
      },
      symbolic: "1/12",
      operation: "add",
    },
    {
      input: {
        labId,
        mode: "subtract",
        precision: 3,
        start: rational(-3, 4),
        step: rational(5, 6),
      },
      symbolic: "-19/12",
      operation: "subtract",
    },
    {
      input: {
        labId,
        mode: "multiply",
        precision: 3,
        left: rational(-3, 4),
        right: rational(5, 6),
      },
      symbolic: "-5/8",
      operation: "multiply",
    },
    {
      input: {
        labId,
        mode: "divide",
        precision: 3,
        left: rational(-3, 4),
        right: rational(5, 6),
      },
      symbolic: "-9/10",
      operation: "divide",
    },
  ] as const;
  for (const item of cases) {
    const model = buildSignedRealNumberLineModel(item.input);
    assert.equal(model.point.symbolic, item.symbolic);
    assert.equal(model.rationalOperation?.kind, item.operation);
    assert.equal(model.rationalOperation?.result.symbolic, item.symbolic);
    assert.equal(model.rationalOperation?.reconstructionPassed, true);
  }

  const opposite = buildSignedRealNumberLineModel({
    labId,
    mode: "opposite",
    precision: 2,
    value: rational(-7, 3),
  });
  assert.equal(opposite.point.symbolic, "7/3");
  assert.equal(opposite.rationalOperation?.kind, "opposite");

  const absolute = buildSignedRealNumberLineModel({
    labId,
    mode: "absolute-value",
    precision: 2,
    value: rational(-7, 3),
  });
  assert.equal(absolute.absoluteValueDistance.exact.symbolic, "7/3");
  assertDomainError(
    {
      labId,
      mode: "divide",
      precision: 2,
      left: rational(1, 2),
      right: rational(0),
    },
    "DIVISION_BY_ZERO",
  );
});

test("bounded exhaustive rational multiplication and division reconstruct exact reduced results", () => {
  const labId = "bnu-junior-s1-upper-rational-numbers" as const;
  let observed = 0;
  for (const mode of ["multiply", "divide"] as const) {
    for (let leftNumerator = -12; leftNumerator <= 12; leftNumerator += 1) {
      for (let leftDenominator = 1; leftDenominator <= 6; leftDenominator += 1) {
        for (let rightNumerator = -12; rightNumerator <= 12; rightNumerator += 1) {
          if (mode === "divide" && rightNumerator === 0) continue;
          for (let rightDenominator = 1; rightDenominator <= 6; rightDenominator += 1) {
            const model = buildSignedRealNumberLineModel({
              labId,
              mode,
              precision: 4,
              left: rational(leftNumerator, leftDenominator),
              right: rational(rightNumerator, rightDenominator),
            });
            const expected =
              mode === "multiply"
                ? expectedRational(
                    leftNumerator * rightNumerator,
                    leftDenominator * rightDenominator,
                  )
                : expectedRational(
                    leftNumerator * rightDenominator,
                    leftDenominator * rightNumerator,
                  );
            assert.deepEqual(
              {
                numerator: model.point.kind === "rational" ? model.point.numerator : null,
                denominator:
                  model.point.kind === "rational" ? model.point.denominator : null,
              },
              expected,
              model.stateKey,
            );
            assert.equal(model.rationalOperation?.reconstructionPassed, true);
            assert.ok(model.invariantReceipts.every(({ status }) => status !== "fail"));
            observed += 1;
          }
        }
      }
    }
  }
  assert.equal(observed, 44_100);
});

test("real-number topics classify exact values and construct square/cube roots with certified estimates", () => {
  const labId = "hjb-junior-s2-upper-real-numbers" as const;
  const rationalClass = buildSignedRealNumberLineModel({
    labId,
    mode: "classify",
    precision: 3,
    value: rational(-6, 3),
  });
  assert.deepEqual(rationalClass.realConcept?.classification, [
    "integer",
    "rational",
    "real",
  ]);

  const irrationalClass = buildSignedRealNumberLineModel({
    labId,
    mode: "classify",
    precision: 4,
    value: { kind: "radical", index: 2, radicand: 2, sign: 1 },
  });
  assert.deepEqual(irrationalClass.realConcept?.classification, [
    "irrational",
    "real",
  ]);

  const squareFour = buildSignedRealNumberLineModel({
    labId,
    mode: "square-root",
    precision: 3,
    radicand: 4,
  });
  assert.equal(squareFour.point.kind, "rational");
  assert.equal(squareFour.point.symbolic, "2");
  assert.equal(squareFour.realConcept?.root?.exact, true);

  const squareTwo = buildSignedRealNumberLineModel({
    labId,
    mode: "square-root",
    precision: 5,
    radicand: 2,
  });
  assert.equal(squareTwo.point.symbolic, "√(2)");
  assert.equal(squareTwo.realConcept?.root?.exact, false);
  assert.equal(squareTwo.approximation.errorBound.denominator, 100_000);

  const cubeNegative = buildSignedRealNumberLineModel({
    labId,
    mode: "cube-root",
    precision: 2,
    radicand: -8,
  });
  assert.equal(cubeNegative.point.symbolic, "-2");
  assert.equal(cubeNegative.realConcept?.root?.exact, true);

  assertDomainError(
    { labId, mode: "square-root", precision: 2, radicand: -1 },
    "EVEN_ROOT_OF_NEGATIVE",
  );
});

test("bounded exhaustive real roots distinguish exact values from certified irrational estimates", () => {
  const labId = "bnu-junior-s2-upper-real-numbers" as const;
  let observed = 0;
  for (const mode of ["square-root", "cube-root"] as const) {
    const minimum = mode === "square-root" ? 0 : -400;
    for (let radicand = minimum; radicand <= 400; radicand += 1) {
      const model = buildSignedRealNumberLineModel({
        labId,
        mode,
        precision: 5,
        radicand,
      });
      const index = mode === "square-root" ? 2 : 3;
      const magnitude = Math.round(Math.abs(radicand) ** (1 / index));
      const exact = magnitude ** index === Math.abs(radicand);
      assert.equal(model.realConcept?.root?.exact, exact, model.stateKey);
      assert.equal(model.realConcept?.root?.defined, true, model.stateKey);
      if (exact) {
        assert.equal(model.point.kind, "rational", model.stateKey);
      } else {
        assert.equal(model.point.kind, "radical", model.stateKey);
        assert.equal(model.approximation.powerReceipt?.exact, false, model.stateKey);
        assert.deepEqual(
          model.approximation.errorBound,
          { numerator: 1, denominator: 100_000 },
          model.stateKey,
        );
      }
      assert.ok(model.invariantReceipts.every(({ status }) => status !== "fail"));
      observed += 1;
    }
  }
  assert.equal(observed, 1_202);
});

test("quadratic radicals simplify canonically and operate with exact coefficients", () => {
  const labId = "hjb-junior-s2-upper-quadratic-radicals" as const;
  const simplify = (value: QuadraticSurdInput) =>
    buildSignedRealNumberLineModel({
      labId,
      mode: "simplify",
      precision: 4,
      value,
    });

  assert.equal(simplify(surd(4)).radicalOperation?.result.symbolic, "2");
  assert.equal(simplify(surd(12)).radicalOperation?.result.symbolic, "2√3");

  const like = buildSignedRealNumberLineModel({
    labId,
    mode: "radical-add",
    precision: 3,
    left: surd(3, 2),
    right: surd(3, 5),
  });
  assert.equal(like.radicalOperation?.combinable, true);
  assert.equal(like.radicalOperation?.result.symbolic, "7√3");

  const unlike = buildSignedRealNumberLineModel({
    labId,
    mode: "radical-add",
    precision: 3,
    left: surd(2),
    right: surd(3),
  });
  assert.equal(unlike.radicalOperation?.combinable, false);
  assert.equal(unlike.radicalOperation?.result.symbolic, "√2 + √3");

  const product = buildSignedRealNumberLineModel({
    labId,
    mode: "radical-multiply",
    precision: 3,
    left: surd(8),
    right: surd(18),
  });
  assert.equal(product.radicalOperation?.result.symbolic, "12");

  const quotient = buildSignedRealNumberLineModel({
    labId,
    mode: "radical-divide",
    precision: 3,
    left: surd(12),
    right: surd(3),
  });
  assert.equal(quotient.radicalOperation?.result.symbolic, "2");
  assert.equal(quotient.radicalOperation?.reconstructionPassed, true);

  const estimate = buildSignedRealNumberLineModel({
    labId,
    mode: "estimate-check",
    precision: 4,
    value: surd(3, 2),
  });
  assert.equal(estimate.point.symbolic, "2√3");
  assert.equal(estimate.approximation.text, "3.4641");
  assert.deepEqual(estimate.approximation.errorBound, {
    numerator: 1,
    denominator: 10_000,
  });
  assert.equal(estimate.radicalOperation?.defined, true);

  assertDomainError(
    {
      labId,
      mode: "simplify",
      precision: 3,
      value: surd(-2),
    },
    "EVEN_ROOT_OF_NEGATIVE",
  );
  assertDomainError(
    {
      labId,
      mode: "radical-divide",
      precision: 3,
      left: surd(2),
      right: surd(7, 0),
    },
    "DIVISION_BY_ZERO",
  );
});

test("quadratic radical exhaustive canonicalization is square-free, deterministic, and exact", () => {
  const labId = "hjb-junior-s2-upper-quadratic-radicals" as const;
  let observed = 0;
  for (let radicand = 0; radicand <= 400; radicand += 1) {
    for (const coefficient of [-3, -1, 0, 1, 2] as const) {
      const input = {
        labId,
        mode: "simplify" as const,
        precision: 4,
        value: surd(radicand, coefficient),
      };
      const first = buildSignedRealNumberLineModel(input);
      const second = buildSignedRealNumberLineModel(input);
      const result = first.radicalOperation?.result;
      assert.ok(result);
      assert.equal(result.kind, "quadratic-surd");
      if (result.kind !== "quadratic-surd") throw new Error("unreachable");
      for (let square = 2; square * square <= result.radicand; square += 1) {
        assert.notEqual(result.radicand % (square * square), 0, first.stateKey);
      }
      const sourceNumerator = BigInt(coefficient);
      const sourceDenominator = BigInt(1);
      const resultNumerator = BigInt(result.coefficient.numerator);
      const resultDenominator = BigInt(result.coefficient.denominator);
      assert.equal(
        resultNumerator *
          resultNumerator *
          BigInt(result.radicand) *
          sourceDenominator *
          sourceDenominator,
        sourceNumerator *
          sourceNumerator *
          BigInt(radicand) *
          resultDenominator *
          resultDenominator,
        first.stateKey,
      );
      assert.equal(first.radicalOperation?.reconstructionPassed, true);
      assert.deepEqual(first, second);
      assertDeepFrozen(first);
      assertJsonSafe(first);
      observed += 1;
    }
  }
  assert.equal(observed, 2005);
});

test("invariants use tri-state receipts: not-applicable is never represented as a pass", () => {
  const model = buildSignedRealNumberLineModel({
    labId: DEFAULT_LAB_ID,
    mode: "locate",
    precision: 2,
    value: rational(1, 2),
  });
  const comparison = model.invariantReceipts.find(
    ({ id }) => id === "exact-cross-product",
  );
  assert.deepEqual(comparison, {
    id: "exact-cross-product",
    applicable: false,
    status: "not-applicable",
    expected: "not-applicable",
    observed: "not-applicable",
    passed: null,
  });
  assert.ok(model.invariantReceipts.some(({ status }) => status === "pass"));
  assert.ok(model.invariantReceipts.every(({ status }) => status !== "fail"));
});
