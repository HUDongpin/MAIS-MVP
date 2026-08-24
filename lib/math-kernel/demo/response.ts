import type { ExactSecantIntersectionDto } from "../analytic/types";
import { validateMathJson } from "../shared/mathjson";
import type { ExactValueDto } from "../shared/types";

const MAX_DISPLAY_STRING_LENGTH = 16_384;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => (
    Object.prototype.hasOwnProperty.call(value, key)
  ));
}

function isBoundedString(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_DISPLAY_STRING_LENGTH;
}

function isExactValueDto(value: unknown): value is ExactValueDto {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ["schemaVersion", "mathJson", "latex", "decimal", "approx"]) ||
    value.schemaVersion !== 1 ||
    !isBoundedString(value.latex) ||
    !(value.decimal === null || isBoundedString(value.decimal)) ||
    !(
      value.approx === null ||
      (typeof value.approx === "number" && Number.isFinite(value.approx))
    )
  ) {
    return false;
  }
  return validateMathJson(value.mathJson).ok;
}

function isExactPoint(value: unknown): value is readonly [ExactValueDto, ExactValueDto] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isExactValueDto(value[0]) &&
    isExactValueDto(value[1])
  );
}

/**
 * Restore the one exact response shape consumed by the browser demo. This is
 * deliberately narrower than the public intersection union: the focal line
 * through the demo ellipse must always be a real secant.
 */
export function parseExactDemoIntersection(
  value: unknown,
): ExactSecantIntersectionDto | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "kind",
      "coefficients",
      "points",
      "chordLengthSquared",
    ]) ||
    value.schemaVersion !== 1 ||
    value.kind !== "secant" ||
    !isPlainRecord(value.coefficients) ||
    !hasExactKeys(value.coefficients, ["A", "B", "C", "discriminant"]) ||
    !isExactValueDto(value.coefficients.A) ||
    !isExactValueDto(value.coefficients.B) ||
    !isExactValueDto(value.coefficients.C) ||
    !isExactValueDto(value.coefficients.discriminant) ||
    !Array.isArray(value.points) ||
    value.points.length !== 2 ||
    !isExactPoint(value.points[0]) ||
    !isExactPoint(value.points[1]) ||
    !isExactValueDto(value.chordLengthSquared)
  ) {
    return null;
  }
  return value as unknown as ExactSecantIntersectionDto;
}

/** Verify both the public response shape and request/response correlation. */
export function parseExactDemoResponse(
  value: unknown,
  expectedSlopeQuarter: number,
): ExactSecantIntersectionDto | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ["ok", "slopeQuarter", "value"]) ||
    value.ok !== true ||
    value.slopeQuarter !== expectedSlopeQuarter
  ) {
    return null;
  }
  return parseExactDemoIntersection(value.value);
}
