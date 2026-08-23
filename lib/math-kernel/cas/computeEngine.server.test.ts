import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import { MATH_JSON_LIMITS } from "../shared/mathjson";
import {
  CasSession,
  boxMathJson,
  compareExactOrder,
  compareExactMathJson,
  exactMathJsonEqual,
  isReadableExactMathJson,
  simplifyMathJson,
  toExactValueDto,
} from "./computeEngine.server";
import type { ExactComparison } from "../shared/types";
import type { ExactOrderComparison } from "../shared/types";

const SQRT_TWO = ["Sqrt", 2] as const;
const Q_ABOVE_SQRT_TWO = [
  "Rational",
  { num: "1414213562373095048801688724209698078569671875376948073177" },
  { num: "1e+57" },
] as const;
const TEN_TO_FIFTY = ["Power", 10, 50] as const;
const SQRT_JUST_ABOVE_TEN_TO_FIFTY = [
  "Sqrt",
  ["Add", ["Power", 10, 100], 1],
] as const;
const SQRT_TEN_TO_HUNDRED = ["Sqrt", ["Power", 10, 100]] as const;

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a successful kernel result.");
  return result.value;
}

test("boxes one third into canonical, JSON-safe MathJSON", () => {
  const result = boxMathJson(["Divide", 1, 3]);

  assert.deepEqual(unwrap(result), ["Rational", 1, 3]);
  assert.deepEqual(JSON.parse(JSON.stringify(unwrap(result))), [
    "Rational",
    1,
    3,
  ]);
});

test("simplifies an application-constructed expression without parsing source text", () => {
  const result = simplifyMathJson([
    "Add",
    ["Multiply", 2, "x"],
    ["Negate", "x"],
  ]);

  assert.equal(unwrap(result), "x");
});

test("converts one third to an exact DTO with LaTeX and finite approximations", () => {
  const dto = unwrap(toExactValueDto(["Rational", 1, 3]));

  assert.equal(dto.schemaVersion, 1);
  assert.deepEqual(dto.mathJson, ["Rational", 1, 3]);
  assert.equal(dto.latex, "\\frac{1}{3}");
  assert.match(dto.decimal ?? "", /^0\.333333/);
  assert.ok(dto.approx !== null);
  assert.ok(Math.abs((dto.approx ?? 0) - 1 / 3) < 1e-15);
  assert.deepEqual(JSON.parse(JSON.stringify(dto)), dto);
});

test("preserves sqrt(3) exactly while exposing a finite renderer approximation", () => {
  const dto = unwrap(toExactValueDto(["Sqrt", 3]));

  assert.deepEqual(dto.mathJson, ["Sqrt", 3]);
  assert.equal(dto.latex, "\\sqrt{3}");
  assert.match(dto.decimal ?? "", /^1\.7320508075/);
  assert.ok(dto.approx !== null);
  assert.ok(Math.abs((dto.approx ?? 0) - Math.sqrt(3)) < 1e-15);
});

test("uses null decimal and approximation for symbolic or non-finite values", () => {
  for (const input of ["x", "NaN", "PositiveInfinity"] as const) {
    const dto = unwrap(toExactValueDto(input));
    assert.equal(dto.decimal, null);
    assert.equal(dto.approx, null);
  }
});

test("checks exact equality without exposing Compute Engine expressions", () => {
  assert.equal(
    unwrap(exactMathJsonEqual(["Divide", 1, 3], ["Rational", 1, 3])),
    true,
  );
  assert.equal(
    unwrap(exactMathJsonEqual(["Rational", 1, 3], ["Rational", 1, 2])),
    false,
  );
});

test("compares exact expressions without turning symbolic uncertainty into inequality", () => {
  const identity: ExactComparison = unwrap(compareExactMathJson(
    ["Power", ["Add", "x", 1], 2],
    ["Add", ["Power", "x", 2], ["Multiply", 2, "x"], 1],
  ));
  assert.equal(identity, "equal");
  assert.equal(
    unwrap(compareExactMathJson(["Rational", 1, 3], ["Rational", 1, 2])),
    "not-equal",
  );
  assert.equal(unwrap(compareExactMathJson("x", 2)), "unknown");

  const legacy = exactMathJsonEqual("x", 2);
  assert.equal(legacy.ok, false);
  if (legacy.ok) return;
  assert.equal(
    legacy.error.code,
    KERNEL_ERROR_CODES.indeterminateSymbolicResult,
  );
});

test("proves exact order through sign-safe squared comparison without decimal tolerance", () => {
  const greater: ExactOrderComparison = unwrap(
    compareExactOrder(Q_ABOVE_SQRT_TWO, SQRT_TWO),
  );
  assert.equal(greater, "greater");
  assert.equal(
    unwrap(compareExactOrder(SQRT_TWO, Q_ABOVE_SQRT_TWO)),
    "less",
  );
  assert.equal(
    unwrap(
      compareExactOrder(
        ["Subtract", SQRT_TWO, Q_ABOVE_SQRT_TWO],
        0,
      ),
    ),
    "less",
  );
  assert.equal(
    unwrap(
      compareExactOrder(
        ["Negate", Q_ABOVE_SQRT_TWO],
        ["Negate", SQRT_TWO],
      ),
    ),
    "less",
  );
});

test("compares a close radical through its exact radicand", () => {
  assert.equal(
    unwrap(compareExactOrder(SQRT_JUST_ABOVE_TEN_TO_FIFTY, TEN_TO_FIFTY)),
    "greater",
  );
  assert.equal(
    unwrap(compareExactOrder(TEN_TO_FIFTY, SQRT_JUST_ABOVE_TEN_TO_FIFTY)),
    "less",
  );
  assert.equal(
    unwrap(compareExactOrder(SQRT_TEN_TO_HUNDRED, TEN_TO_FIFTY)),
    "equal",
  );
  assert.equal(unwrap(compareExactOrder(["Sqrt", -1], 0)), "unknown");
  assert.equal(unwrap(compareExactOrder(0, ["Sqrt", -1])), "unknown");
});

test("exact order is explicit for equality, opposite signs, and symbolic uncertainty", () => {
  const session = new CasSession();
  assert.equal(session.compareExactOrder(2, 2).ok, true);
  assert.equal(unwrap(session.compareExactOrder(["Add", 1, 1], 2)), "equal");
  assert.equal(unwrap(session.compareExactOrder(3, -4)), "greater");
  assert.equal(unwrap(session.compareExactOrder(-3, 4)), "less");
  assert.equal(unwrap(session.compareExactOrder("x", 0)), "unknown");
});

test("separates decimal strings from safe JavaScript approximations", () => {
  for (const exponent of [400, -400] as const) {
    const dto = unwrap(toExactValueDto(["Power", 10, exponent]));
    assert.notEqual(dto.decimal, null);
    assert.equal(dto.approx, null);
  }

  const zero = unwrap(toExactValueDto(0));
  assert.equal(zero.decimal, "0");
  assert.equal(zero.approx, 0);
});

test("rejects operators outside the MAIS CAS allowlist", () => {
  const result = boxMathJson(["TotallyUnknownOperator", 1]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonInvalidShape);
});

test("keeps advanced Limit and Solve operators out of the base CAS session", () => {
  for (const input of [
    ["Limit", "x", "x", 0],
    ["Solve", ["Equal", "x", 1], "x"],
  ]) {
    const result = boxMathJson(input);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonInvalidShape);
  }
});

test("provides a reusable request-scoped session without exposing its engine", () => {
  const session = new CasSession();
  assert.equal(unwrap(session.simplifyMathJson(["Add", "x", 0])), "x");
  assert.equal(
    unwrap(session.compareExactMathJson(["Divide", 1, 3], ["Rational", 1, 3])),
    "equal",
  );
  assert.deepEqual(Object.keys(session), []);
  assert.equal("engine" in session, false);
  assert.equal(JSON.stringify(session), "{}");
});

test("classifies compact finite constants as readable and excludes symbols or infinities", () => {
  assert.equal(unwrap(isReadableExactMathJson(["Rational", 1, 3])), true);
  assert.equal(unwrap(isReadableExactMathJson(["Sqrt", 3])), true);
  assert.equal(unwrap(isReadableExactMathJson("x")), false);
  assert.equal(unwrap(isReadableExactMathJson("PositiveInfinity")), false);
});

test("applies MathJSON input limits before invoking the CAS", () => {
  let tooDeep: unknown = 1;
  for (let index = 0; index < MATH_JSON_LIMITS.maxDepth; index += 1) {
    tooDeep = ["Identity", tooDeep];
  }

  const result = boxMathJson(tooDeep);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonDepthLimit);
});

test("the Next server-only marker rejects direct import without react-server conditions", () => {
  const moduleUrl = new URL("./computeEngine.server.ts", import.meta.url).href;
  const child = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `import(${JSON.stringify(moduleUrl)})`,
    ],
    { encoding: "utf8" },
  );

  assert.notEqual(child.status, 0);
  assert.match(
    child.stderr,
    /cannot be imported from a Client Component|server-only/i,
  );
});
