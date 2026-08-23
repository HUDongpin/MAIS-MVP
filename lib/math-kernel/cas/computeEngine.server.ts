import "server-only";

import { ComputeEngine } from "@cortex-js/compute-engine";
import type { MathJsonExpression } from "@cortex-js/compute-engine/math-json";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import { validateMathJson } from "../shared/mathjson";
import type {
  ExactValueDto,
  KernelResult,
  MathJsonExpr,
} from "../shared/types";

const READABLE_MAX_NODES = 32;
const READABLE_MAX_LATEX_LENGTH = 120;

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
  const validated = validateMathJson(input);
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
    const validated = validateMathJson(serialized);
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

export function boxMathJson(input: unknown): KernelResult<MathJsonExpr> {
  const engine = new ComputeEngine();
  const boxed = boxValidated(engine, input);
  if (!boxed.ok) return boxed;
  return serializeExpression(boxed.value);
}

export function simplifyMathJson(input: unknown): KernelResult<MathJsonExpr> {
  const engine = new ComputeEngine();
  const boxed = boxValidated(engine, input);
  if (!boxed.ok) return boxed;

  try {
    return serializeExpression(boxed.value.simplify());
  } catch {
    return casFailure("Compute Engine could not simplify the expression.");
  }
}

export function toExactValueDto(
  input: unknown,
): KernelResult<ExactValueDto> {
  const engine = new ComputeEngine();
  const boxed = boxValidated(engine, input);
  if (!boxed.ok) return boxed;

  try {
    const exact = boxed.value.simplify();
    const mathJson = serializeExpression(exact);
    if (!mathJson.ok) return mathJson;

    const numeric = exact.N();
    const hasFiniteRealApproximation =
      numeric.isFinite === true &&
      numeric.isReal === true &&
      Number.isFinite(numeric.re);

    return {
      ok: true,
      value: {
        schemaVersion: 1,
        mathJson: mathJson.value,
        latex: exact.latex,
        decimal: hasFiniteRealApproximation ? numeric.toString() : null,
        approx: hasFiniteRealApproximation ? numeric.re : null,
      },
    };
  } catch {
    return casFailure("Compute Engine could not create the exact value DTO.");
  }
}

export function exactMathJsonEqual(
  left: unknown,
  right: unknown,
): KernelResult<boolean> {
  const engine = new ComputeEngine();
  const boxedLeft = boxValidated(engine, left);
  if (!boxedLeft.ok) return boxedLeft;
  const boxedRight = boxValidated(engine, right);
  if (!boxedRight.ok) return boxedRight;

  try {
    return {
      ok: true,
      value: boxedLeft.value.simplify().isSame(boxedRight.value.simplify()),
    };
  } catch {
    return casFailure("Compute Engine could not compare the expressions.");
  }
}

export function isReadableExactMathJson(
  input: unknown,
): KernelResult<boolean> {
  const engine = new ComputeEngine();
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
