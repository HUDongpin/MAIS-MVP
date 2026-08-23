import "server-only";

import { ComputeEngine } from "@cortex-js/compute-engine";
import type { MathJsonExpression } from "@cortex-js/compute-engine/math-json";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import { validateMathJson } from "../shared/mathjson";
import type {
  ExactComparison,
  ExactValueDto,
  KernelResult,
  MathJsonExpr,
} from "../shared/types";

const READABLE_MAX_NODES = 32;
const READABLE_MAX_LATEX_LENGTH = 120;

/**
 * Base-profile operators for MAIS exact arithmetic and relations. Advanced
 * calculus/solve operators are deliberately excluded; a future analytic.server
 * must expose them through its own constrained typed profile. Arbitrary-user
 * CAS is forbidden, so this app-constructed-only layer has no worker timeout.
 */
const MAIS_CAS_ALLOWED_OPERATORS: ReadonlySet<string> = new Set([
  "Abs",
  "Add",
  "And",
  "Divide",
  "Equal",
  "Greater",
  "GreaterEqual",
  "Less",
  "LessEqual",
  "Multiply",
  "Negate",
  "Not",
  "NotEqual",
  "Or",
  "Power",
  "Rational",
  "Root",
  "Sqrt",
  "Square",
  "Subtract",
]);

type ComputeExpression = ReturnType<ComputeEngine["box"]>;

function casFailure<T>(message: string): KernelResult<T> {
  return {
    ok: false,
    error: {
      code: KERNEL_ERROR_CODES.casOperationFailed,
      message,
    },
  };
}

function invalidExpression<T>(): KernelResult<T> {
  return {
    ok: false,
    error: {
      code: KERNEL_ERROR_CODES.casInvalidExpression,
      message: "Compute Engine rejected the MathJSON expression.",
    },
  };
}

function boxValidated(
  engine: ComputeEngine,
  input: unknown,
): KernelResult<ComputeExpression> {
  const validated = validateMathJson(input, {
    allowedOperators: MAIS_CAS_ALLOWED_OPERATORS,
  });
  if (!validated.ok) return validated;

  try {
    const expression = engine.box(
      validated.value as MathJsonExpression,
    );
    if (!expression.isValid) return invalidExpression();
    return { ok: true, value: expression };
  } catch {
    return casFailure("Compute Engine could not box the MathJSON expression.");
  }
}

function serializeExpression(
  expression: ComputeExpression,
): KernelResult<MathJsonExpr> {
  try {
    const serialized = expression.toMathJson({ fractionalDigits: "auto" });
    const validated = validateMathJson(serialized, {
      allowedOperators: MAIS_CAS_ALLOWED_OPERATORS,
    });
    if (!validated.ok) {
      return casFailure("Compute Engine produced invalid MathJSON output.");
    }
    return validated;
  } catch {
    return casFailure("Compute Engine could not serialize the expression.");
  }
}

function expressionNodeCount(value: MathJsonExpr): number {
  if (value === null || typeof value !== "object") return 1;
  if (Array.isArray(value)) {
    return 1 + value.reduce((total, child) => total + expressionNodeCount(child), 0);
  }
  return 1 + Object.values(value).reduce<number>(
    (total, child) => total + jsonNodeCount(child),
    0,
  );
}

function jsonNodeCount(value: unknown): number {
  if (!value || typeof value !== "object") return 1;
  if (Array.isArray(value)) {
    return 1 + value.reduce((total, child) => total + jsonNodeCount(child), 0);
  }
  return 1 + Object.values(value).reduce(
    (total, child) => total + jsonNodeCount(child),
    0,
  );
}

function boxMathJsonWithEngine(
  engine: ComputeEngine,
  input: unknown,
): KernelResult<MathJsonExpr> {
  const boxed = boxValidated(engine, input);
  if (!boxed.ok) return boxed;
  return serializeExpression(boxed.value);
}

function simplifyMathJsonWithEngine(
  engine: ComputeEngine,
  input: unknown,
): KernelResult<MathJsonExpr> {
  const boxed = boxValidated(engine, input);
  if (!boxed.ok) return boxed;

  try {
    return serializeExpression(boxed.value.simplify());
  } catch {
    return casFailure("Compute Engine could not simplify the expression.");
  }
}

function toExactValueDtoWithEngine(
  engine: ComputeEngine,
  input: unknown,
): KernelResult<ExactValueDto> {
  const boxed = boxValidated(engine, input);
  if (!boxed.ok) return boxed;

  try {
    const exact = boxed.value.simplify();
    const mathJson = serializeExpression(exact);
    if (!mathJson.ok) return mathJson;

    const numeric = exact.N();
    const hasFiniteRealDecimal =
      numeric.isFinite === true &&
      numeric.isReal === true;
    const realApproximation = numeric.re;
    const isExactZero = exact.isSame(0);
    const hasSafeApproximation =
      hasFiniteRealDecimal &&
      Number.isFinite(realApproximation) &&
      (realApproximation !== 0 || isExactZero);

    return {
      ok: true,
      value: {
        schemaVersion: 1,
        mathJson: mathJson.value,
        latex: exact.latex,
        decimal: hasFiniteRealDecimal ? numeric.toString() : null,
        approx: hasSafeApproximation ? realApproximation : null,
      },
    };
  } catch {
    return casFailure("Compute Engine could not create the exact value DTO.");
  }
}

function compareExactMathJsonWithEngine(
  engine: ComputeEngine,
  left: unknown,
  right: unknown,
): KernelResult<ExactComparison> {
  const boxedLeft = boxValidated(engine, left);
  if (!boxedLeft.ok) return boxedLeft;
  const boxedRight = boxValidated(engine, right);
  if (!boxedRight.ok) return boxedRight;

  try {
    const simplifiedLeft = boxedLeft.value.simplify();
    const simplifiedRight = boxedRight.value.simplify();
    if (simplifiedLeft.isSame(simplifiedRight)) {
      return { ok: true, value: "equal" };
    }

    const directEquality = simplifiedLeft.isEqual(simplifiedRight);
    if (directEquality === true) {
      return { ok: true, value: "equal" };
    }

    // A structurally zero simplified difference is positive exact proof. A
    // non-zero result must not be promoted to symbolic inequality.
    const difference = simplifiedLeft.sub(simplifiedRight).simplify();
    if (difference.isSame(0)) {
      return { ok: true, value: "equal" };
    }

    if (
      directEquality === false &&
      simplifiedLeft.unknowns.length === 0 &&
      simplifiedRight.unknowns.length === 0
    ) {
      return { ok: true, value: "not-equal" };
    }
    return { ok: true, value: "unknown" };
  } catch {
    return casFailure("Compute Engine could not compare the expressions.");
  }
}

function exactMathJsonEqualWithEngine(
  engine: ComputeEngine,
  left: unknown,
  right: unknown,
): KernelResult<boolean> {
  const comparison = compareExactMathJsonWithEngine(engine, left, right);
  if (!comparison.ok) return comparison;
  if (comparison.value === "equal") return { ok: true, value: true };
  if (comparison.value === "not-equal") return { ok: true, value: false };
  return {
    ok: false,
    error: {
      code: KERNEL_ERROR_CODES.indeterminateSymbolicResult,
      message: "The CAS could not prove whether the symbolic expressions are equal.",
    },
  };
}

function isReadableExactMathJsonWithEngine(
  engine: ComputeEngine,
  input: unknown,
): KernelResult<boolean> {
  const boxed = boxValidated(engine, input);
  if (!boxed.ok) return boxed;

  try {
    const exact = boxed.value.simplify();
    const mathJson = serializeExpression(exact);
    if (!mathJson.ok) return mathJson;
    const numeric = exact.N();

    return {
      ok: true,
      value:
        exact.unknowns.length === 0 &&
        numeric.isFinite === true &&
        numeric.isReal === true &&
        expressionNodeCount(mathJson.value) <= READABLE_MAX_NODES &&
        exact.latex.length <= READABLE_MAX_LATEX_LENGTH,
    };
  } catch {
    return casFailure("Compute Engine could not classify expression readability.");
  }
}

/**
 * MAIS-owned, request-scoped CAS facade. Its private engine can be reused by a
 * solver during one request without exposing Compute Engine vendor types.
 */
export class CasSession {
  readonly #engine: ComputeEngine;

  constructor() {
    this.#engine = new ComputeEngine();
  }

  boxMathJson(input: unknown): KernelResult<MathJsonExpr> {
    return boxMathJsonWithEngine(this.#engine, input);
  }

  simplifyMathJson(input: unknown): KernelResult<MathJsonExpr> {
    return simplifyMathJsonWithEngine(this.#engine, input);
  }

  toExactValueDto(input: unknown): KernelResult<ExactValueDto> {
    return toExactValueDtoWithEngine(this.#engine, input);
  }

  compareExactMathJson(
    left: unknown,
    right: unknown,
  ): KernelResult<ExactComparison> {
    return compareExactMathJsonWithEngine(this.#engine, left, right);
  }

  /** @deprecated Prefer compareExactMathJson() so uncertainty stays explicit. */
  exactMathJsonEqual(left: unknown, right: unknown): KernelResult<boolean> {
    return exactMathJsonEqualWithEngine(this.#engine, left, right);
  }

  isReadableExactMathJson(input: unknown): KernelResult<boolean> {
    return isReadableExactMathJsonWithEngine(this.#engine, input);
  }
}

export function boxMathJson(input: unknown): KernelResult<MathJsonExpr> {
  return new CasSession().boxMathJson(input);
}

export function simplifyMathJson(input: unknown): KernelResult<MathJsonExpr> {
  return new CasSession().simplifyMathJson(input);
}

export function toExactValueDto(input: unknown): KernelResult<ExactValueDto> {
  return new CasSession().toExactValueDto(input);
}

export function compareExactMathJson(
  left: unknown,
  right: unknown,
): KernelResult<ExactComparison> {
  return new CasSession().compareExactMathJson(left, right);
}

/** @deprecated Prefer compareExactMathJson() so uncertainty stays explicit. */
export function exactMathJsonEqual(
  left: unknown,
  right: unknown,
): KernelResult<boolean> {
  return new CasSession().exactMathJsonEqual(left, right);
}

export function isReadableExactMathJson(
  input: unknown,
): KernelResult<boolean> {
  return new CasSession().isReadableExactMathJson(input);
}
