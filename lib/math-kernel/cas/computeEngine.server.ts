import "server-only";

import { ComputeEngine, isFunction } from "@cortex-js/compute-engine";
import type { MathJsonExpression } from "@cortex-js/compute-engine/math-json";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import { validateMathJson } from "../shared/mathjson";
import type {
  ExactComparison,
  ExactOrderComparison,
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
// This is a small proof profile for app-constructed arithmetic, not a general CAS.
const EXACT_ORDER_REWRITE_DEPTH = 4;

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

type DefiniteSign = "negative" | "zero" | "positive";

function definiteSign(expression: ComputeExpression): DefiniteSign | null {
  const sign = expression.sgn;
  return sign === "negative" || sign === "zero" || sign === "positive"
    ? sign
    : null;
}

function orderFromDifferenceSign(
  sign: DefiniteSign | null,
): ExactOrderComparison | null {
  if (sign === "negative") return "less";
  if (sign === "zero") return "equal";
  if (sign === "positive") return "greater";
  return null;
}

function reverseOrder(order: ExactOrderComparison): ExactOrderComparison {
  if (order === "less") return "greater";
  if (order === "greater") return "less";
  return order;
}

function exactBinaryExpression(
  engine: ComputeEngine,
  operator: "Subtract",
  left: ComputeExpression,
  right: ComputeExpression,
): ComputeExpression {
  return engine
    .box([
      operator,
      left.toMathJson({ fractionalDigits: "auto" }),
      right.toMathJson({ fractionalDigits: "auto" }),
    ] as MathJsonExpression)
    .simplify();
}

function exactSquareDifference(
  engine: ComputeEngine,
  left: ComputeExpression,
  right: ComputeExpression,
): ComputeExpression {
  return engine
    .box([
      "Subtract",
      ["Power", left.toMathJson({ fractionalDigits: "auto" }), 2],
      ["Power", right.toMathJson({ fractionalDigits: "auto" }), 2],
    ] as MathJsonExpression)
    .simplify();
}

function exactPower(
  engine: ComputeEngine,
  base: ComputeExpression,
  exponent: number,
): ComputeExpression {
  return engine.box([
    "Power",
    base.toMathJson({ fractionalDigits: "auto" }),
    exponent,
  ] as MathJsonExpression);
}

interface ExactRootView {
  readonly radicand: ComputeExpression;
  readonly degree: number;
}

function rootExpression(expression: ComputeExpression): ExactRootView | null {
  if (isFunction(expression, "Sqrt") && expression.nops === 1) {
    return { radicand: expression.op1, degree: 2 };
  }
  if (!isFunction(expression, "Root") || expression.nops !== 2) return null;

  const degree = expression.op2.toMathJson({ fractionalDigits: "auto" });
  if (
    typeof degree !== "number" ||
    !Number.isSafeInteger(degree) ||
    degree < 2
  ) {
    return null;
  }
  return { radicand: expression.op1, degree };
}

function exactRootPowerRadicand(
  expression: ComputeExpression,
): ComputeExpression | null {
  let base: ComputeExpression;
  let degree: number;
  if (isFunction(expression, "Square") && expression.nops === 1) {
    base = expression.op1;
    degree = 2;
  } else if (isFunction(expression, "Power") && expression.nops === 2) {
    const exponent = expression.op2.toMathJson({ fractionalDigits: "auto" });
    if (
      typeof exponent !== "number" ||
      !Number.isSafeInteger(exponent) ||
      exponent < 2
    ) {
      return null;
    }
    base = expression.op1;
    degree = exponent;
  } else {
    return null;
  }

  const root = rootExpression(base);
  return root?.degree === degree ? root.radicand : null;
}

function exactNegation(
  engine: ComputeEngine,
  expression: ComputeExpression,
): ComputeExpression {
  return engine
    .box([
      "Negate",
      expression.toMathJson({ fractionalDigits: "auto" }),
    ] as MathJsonExpression)
    .simplify();
}

function compareExplicitDifferenceFromZero(
  engine: ComputeEngine,
  expression: ComputeExpression,
  depth: number,
): ExactOrderComparison | null {
  if (isFunction(expression, "Subtract") && expression.nops === 2) {
    return compareExactOrderExpressions(
      engine,
      expression.op1,
      expression.op2,
      depth + 1,
    );
  }
  if (!isFunction(expression, "Add") || expression.nops !== 2) return null;

  const [first, second] = expression.ops;
  const firstSign = definiteSign(first);
  const secondSign = definiteSign(second);
  if (firstSign === "positive" && secondSign === "negative") {
    return compareExactOrderExpressions(
      engine,
      first,
      exactNegation(engine, second),
      depth + 1,
    );
  }
  if (firstSign === "negative" && secondSign === "positive") {
    return compareExactOrderExpressions(
      engine,
      second,
      exactNegation(engine, first),
      depth + 1,
    );
  }
  return null;
}

function rootDomainIsProvablyReal(
  engine: ComputeEngine,
  root: ExactRootView,
  depth: number,
): boolean {
  if (depth >= EXACT_ORDER_REWRITE_DEPTH) return false;
  const radicandOrder = compareExactOrderExpressions(
    engine,
    root.radicand,
    engine.box(0 as MathJsonExpression),
    depth + 1,
  );
  return root.degree % 2 === 0
    ? radicandOrder === "equal" || radicandOrder === "greater"
    : radicandOrder !== "unknown";
}

function compareExactOrderExpressions(
  engine: ComputeEngine,
  left: ComputeExpression,
  right: ComputeExpression,
  depth = 0,
): ExactOrderComparison {
  const leftRoot = rootExpression(left);
  const rightRoot = rootExpression(right);
  if (
    (leftRoot !== null && !rootDomainIsProvablyReal(engine, leftRoot, depth)) ||
    (rightRoot !== null && !rootDomainIsProvablyReal(engine, rightRoot, depth))
  ) {
    return "unknown";
  }
  if (left.isSame(right)) return "equal";

  if (depth < EXACT_ORDER_REWRITE_DEPTH) {
    const zero = engine.box(0 as MathJsonExpression);
    const reducedLeft = exactRootPowerRadicand(left);
    if (reducedLeft !== null) {
      const domain = compareExactOrderExpressions(
        engine,
        reducedLeft,
        zero,
        depth + 1,
      );
      if (domain === "equal" || domain === "greater") {
        return compareExactOrderExpressions(
          engine,
          reducedLeft,
          right,
          depth + 1,
        );
      }
    }
    const reducedRight = exactRootPowerRadicand(right);
    if (reducedRight !== null) {
      const domain = compareExactOrderExpressions(
        engine,
        reducedRight,
        zero,
        depth + 1,
      );
      if (domain === "equal" || domain === "greater") {
        return compareExactOrderExpressions(
          engine,
          left,
          reducedRight,
          depth + 1,
        );
      }
    }
  }

  const leftSign = definiteSign(left);
  const rightSign = definiteSign(right);

  if (depth < EXACT_ORDER_REWRITE_DEPTH) {
    const zero = engine.box(0 as MathJsonExpression);
    const leftRootDomain = leftRoot === null
      ? null
      : compareExactOrderExpressions(
          engine,
          leftRoot.radicand,
          zero,
          depth + 1,
        );
    const rightRootDomain = rightRoot === null
      ? null
      : compareExactOrderExpressions(
          engine,
          rightRoot.radicand,
          zero,
          depth + 1,
        );
    const leftRootIsReal =
      leftRootDomain === "equal" || leftRootDomain === "greater";
    const rightRootIsReal =
      rightRootDomain === "equal" || rightRootDomain === "greater";

    if (
      leftRoot !== null &&
      rightRoot !== null &&
      leftRootIsReal &&
      rightRootIsReal
    ) {
      if (leftRoot.degree === rightRoot.degree) {
        return compareExactOrderExpressions(
          engine,
          leftRoot.radicand,
          rightRoot.radicand,
          depth + 1,
        );
      }
      return compareExactOrderExpressions(
        engine,
        exactPower(engine, leftRoot.radicand, rightRoot.degree),
        exactPower(engine, rightRoot.radicand, leftRoot.degree),
        depth + 1,
      );
    }
    if (leftRoot !== null && leftRootIsReal && rightSign === "negative") {
      return "greater";
    }
    if (
      leftRoot !== null &&
      leftRootIsReal &&
      (rightSign === "positive" || rightSign === "zero")
    ) {
      return compareExactOrderExpressions(
        engine,
        leftRoot.radicand,
        exactPower(engine, right, leftRoot.degree),
        depth + 1,
      );
    }
    if (rightRoot !== null && rightRootIsReal && leftSign === "negative") {
      return "less";
    }
    if (
      rightRoot !== null &&
      rightRootIsReal &&
      (leftSign === "positive" || leftSign === "zero")
    ) {
      return compareExactOrderExpressions(
        engine,
        exactPower(engine, left, rightRoot.degree),
        rightRoot.radicand,
        depth + 1,
      );
    }
  }

  if (right.isSame(0) && depth < EXACT_ORDER_REWRITE_DEPTH) {
    const explicit = compareExplicitDifferenceFromZero(engine, left, depth);
    if (explicit !== null) return explicit;
  }
  if (left.isSame(0) && depth < EXACT_ORDER_REWRITE_DEPTH) {
    const explicit = compareExplicitDifferenceFromZero(engine, right, depth);
    if (explicit !== null) return reverseOrder(explicit);
  }

  if (leftSign === "zero") {
    if (rightSign === "zero") return "equal";
    if (rightSign === "positive") return "less";
    if (rightSign === "negative") return "greater";
  }
  if (rightSign === "zero") {
    if (leftSign === "positive") return "greater";
    if (leftSign === "negative") return "less";
  }
  if (leftSign === "positive" && rightSign === "negative") return "greater";
  if (leftSign === "negative" && rightSign === "positive") return "less";

  const difference = exactBinaryExpression(engine, "Subtract", left, right);
  const differenceSign = definiteSign(difference);
  if (differenceSign === "negative") return "less";
  if (differenceSign === "positive") return "greater";

  if (
    (leftSign === "positive" && rightSign === "positive") ||
    (leftSign === "negative" && rightSign === "negative")
  ) {
    const squareDifference = exactSquareDifference(engine, left, right);
    const squareOrder = orderFromDifferenceSign(
      definiteSign(squareDifference),
    );
    if (squareOrder === "less" || squareOrder === "greater") {
      return leftSign === "negative"
        ? reverseOrder(squareOrder)
        : squareOrder;
    }
  }

  // Canonical subtraction is commonly represented as a two-term Add. If its
  // terms have opposite definite signs, compare their positive magnitudes
  // using the same exact-sign strategy. This proves signs such as sqrt(2)-q
  // without numeric approximation or tolerance-based equality.
  if (depth < 2) {
    const explicit = compareExplicitDifferenceFromZero(
      engine,
      difference,
      depth,
    );
    if (explicit !== null) return explicit;
  }

  return "unknown";
}

function compareExactOrderWithEngine(
  engine: ComputeEngine,
  left: unknown,
  right: unknown,
): KernelResult<ExactOrderComparison> {
  const boxedLeft = boxValidated(engine, left);
  if (!boxedLeft.ok) return boxedLeft;
  const boxedRight = boxValidated(engine, right);
  if (!boxedRight.ok) return boxedRight;

  try {
    if (boxedLeft.value.isReal !== true || boxedRight.value.isReal !== true) {
      return { ok: true, value: "unknown" };
    }
    return {
      ok: true,
      value: compareExactOrderExpressions(
        engine,
        boxedLeft.value,
        boxedRight.value,
      ),
    };
  } catch {
    return casFailure("Compute Engine could not compare exact order.");
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

  compareExactOrder(
    left: unknown,
    right: unknown,
  ): KernelResult<ExactOrderComparison> {
    return compareExactOrderWithEngine(this.#engine, left, right);
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

export function compareExactOrder(
  left: unknown,
  right: unknown,
): KernelResult<ExactOrderComparison> {
  return new CasSession().compareExactOrder(left, right);
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
