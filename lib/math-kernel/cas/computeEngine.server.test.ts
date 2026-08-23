import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import { MATH_JSON_LIMITS } from "../shared/mathjson";
import {
  boxMathJson,
  exactMathJsonEqual,
  isReadableExactMathJson,
  simplifyMathJson,
  toExactValueDto,
} from "./computeEngine.server";

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
