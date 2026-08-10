export type DisplayRelation = "=" | "≈";

const DISPLAY_EQUALITY_EPSILON_UNITS = 8;

/**
 * Select the relation that truthfully connects an unrounded mathematical value
 * to the number shown to the learner. A scale-relative machine-epsilon
 * tolerance with a unit-scale floor absorbs floating-point noise in the
 * enumerated lesson ranges (for example, sin(30°) = 0.5). This is a numeric
 * presentation rule, not a general symbolic-equality predicate.
 */
export function relationForDisplayedValue(
  exactValue: number,
  displayedValue: number | string,
): DisplayRelation {
  const displayedNumber = typeof displayedValue === "number"
    ? displayedValue
    : Number(displayedValue);

  if (!Number.isFinite(exactValue) || !Number.isFinite(displayedNumber)) {
    return "≈";
  }

  const tolerance = DISPLAY_EQUALITY_EPSILON_UNITS * Number.EPSILON * Math.max(
    1,
    Math.abs(exactValue),
    Math.abs(displayedNumber),
  );

  return Math.abs(exactValue - displayedNumber) <= tolerance
    ? "="
    : "≈";
}

export function spokenRelationForDisplayedValue(
  exactValue: number,
  displayedValue: number | string,
): "equals" | "is approximately" {
  return relationForDisplayedValue(exactValue, displayedValue) === "="
    ? "equals"
    : "is approximately";
}
