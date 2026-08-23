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
// Compute Engine 0.118.1 effectively uses about 21 decimal digits at its
// runtime default even though its type-level documentation advertises a much
// higher default. Pin a bounded request-scoped precision so close radicals do
// not acquire a contradictory renderer sign.
const MAIS_CAS_DECIMAL_PRECISION = 100;

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
const EXACT_ORDER_REWRITE_DEPTH = 8;
const EXACT_FINITE_PROOF_DEPTH = 64;

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

  // CE 0.118.1 can eagerly rationalize a direct quotient such as
  // (q - sqrt(2)) / sqrt(2) into a numerically and symbolically corrupted
  // canonical form. Writing a/b as a*(1/b) before boxing is exact, keeps the
  // reciprocal grouped, and avoids that rewrite. Revalidate after expansion
  // so the original MathJSON resource limits still guard the CAS boundary.
  const normalized = validateMathJson(
    normalizeSafeDivisions(validated.value),
    { allowedOperators: MAIS_CAS_ALLOWED_OPERATORS },
  );
  if (!normalized.ok) return normalized;

  try {
    const expression = engine.box(
      normalized.value as MathJsonExpression,
    );
    if (!expression.isValid) return invalidExpression();
    return { ok: true, value: expression };
  } catch {
    return casFailure("Compute Engine could not box the MathJSON expression.");
  }
}

function normalizeSafeDivisions(value: unknown): unknown {
  if (Array.isArray(value)) {
    const normalized = value.map(normalizeSafeDivisions);
    if (
      normalized.length === 3 &&
      normalized[0] === "Divide" &&
      normalized[1] !== 1
    ) {
      return ["Multiply", normalized[1], ["Divide", 1, normalized[2]]];
    }
    return normalized;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        normalizeSafeDivisions(child),
      ]),
    );
  }
  return value;
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

interface ExactNumericDisplay {
  readonly decimal: string | null;
  readonly approx: number | null;
}

function exactNumericDisplayWithEngine(
  engine: ComputeEngine,
  exact: ComputeExpression,
): ExactNumericDisplay {
  try {
    const numeric = exact.N();
    const hasFiniteRealDecimal =
      numeric.isFinite === true &&
      numeric.isReal === true;
    if (!hasFiniteRealDecimal) return { decimal: null, approx: null };

    const realApproximation = numeric.re;
    const exactOrder = exactOrderFromZero(engine, exact);
    const numericOrder = exactOrderFromZero(engine, numeric);
    const decimalSignIsConsistent = ordersDoNotContradict(
      exactOrder,
      numericOrder,
    );
    const approximationSignIsConsistent = ordersDoNotContradict(
      exactOrder,
      numberOrder(realApproximation),
    );
    const isExactZero = exactOrder === "equal";
    const hasSafeApproximation =
      Number.isFinite(realApproximation) &&
      (realApproximation !== 0 || isExactZero) &&
      approximationSignIsConsistent;

    return {
      decimal: decimalSignIsConsistent ? numeric.toString() : null,
      approx: hasSafeApproximation ? realApproximation : null,
    };
  } catch {
    // The exact MathJSON and LaTeX remain valid even when CE cannot form a
    // numerical display (for example a close-radical 0/0 cancellation at the
    // bounded session precision). Never discard or corrupt the exact value.
    return { decimal: null, approx: null };
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

    const display = exactNumericDisplayWithEngine(engine, exact);

    return {
      ok: true,
      value: {
        schemaVersion: 1,
        mathJson: mathJson.value,
        latex: exact.latex,
        decimal: display.decimal,
        approx: display.approx,
      },
    };
  } catch {
    return casFailure("Compute Engine could not create the exact value DTO.");
  }
}

function toCanonicalExactValueDtoWithEngine(
  engine: ComputeEngine,
  input: unknown,
): KernelResult<ExactValueDto> {
  const boxed = boxValidated(engine, input);
  if (!boxed.ok) return boxed;

  try {
    const exact = boxed.value;
    const mathJson = serializeExpression(exact);
    if (!mathJson.ok) return mathJson;

    const display = exactNumericDisplayWithEngine(engine, exact);

    return {
      ok: true,
      value: {
        schemaVersion: 1,
        mathJson: mathJson.value,
        latex: exact.latex,
        decimal: display.decimal,
        approx: display.approx,
      },
    };
  } catch {
    return casFailure(
      "Compute Engine could not create the canonical exact value DTO.",
    );
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

function numberOrder(value: number): ExactOrderComparison | null {
  if (!Number.isFinite(value)) return null;
  if (value < 0) return "less";
  if (value > 0) return "greater";
  return "equal";
}

function ordersDoNotContradict(
  exact: ExactOrderComparison,
  displayed: ExactOrderComparison | null,
): boolean {
  return exact === "unknown" || displayed === null || exact === displayed;
}

function exactOrderFromZero(
  engine: ComputeEngine,
  expression: ComputeExpression,
): ExactOrderComparison {
  if (expression.isReal !== true) return "unknown";
  return compareExactOrderExpressions(
    engine,
    expression,
    engine.box(0 as MathJsonExpression),
  );
}

function structuralOrderFromZero(
  engine: ComputeEngine,
  expression: ComputeExpression,
  depth: number,
): ExactOrderComparison | null {
  if (depth >= EXACT_ORDER_REWRITE_DEPTH) return null;
  const zero = engine.box(0 as MathJsonExpression);

  if (isFunction(expression, "Negate") && expression.nops === 1) {
    return reverseOrder(
      compareExactOrderExpressions(engine, expression.op1, zero, depth + 1),
    );
  }

  if (isFunction(expression, "Abs") && expression.nops === 1) {
    const operand = compareExactOrderExpressions(
      engine,
      expression.op1,
      zero,
      depth + 1,
    );
    if (operand === "equal") return "equal";
    if (operand === "less" || operand === "greater") return "greater";
    return "unknown";
  }

  if (isFunction(expression, "Multiply") && expression.nops >= 2) {
    let negativeFactors = 0;
    for (const factor of expression.ops) {
      const order = compareExactOrderExpressions(
        engine,
        factor,
        zero,
        depth + 1,
      );
      if (order === "unknown") return "unknown";
      if (order === "equal") return "equal";
      if (order === "less") negativeFactors += 1;
    }
    return negativeFactors % 2 === 0 ? "greater" : "less";
  }

  if (isFunction(expression, "Divide") && expression.nops === 2) {
    const numerator = compareExactOrderExpressions(
      engine,
      expression.op1,
      zero,
      depth + 1,
    );
    const denominator = compareExactOrderExpressions(
      engine,
      expression.op2,
      zero,
      depth + 1,
    );
    if (denominator === "equal" || denominator === "unknown") return "unknown";
    if (numerator === "equal") return "equal";
    if (numerator === "unknown") return "unknown";
    return numerator === denominator ? "greater" : "less";
  }

  if (isFunction(expression, "Power") && expression.nops === 2) {
    const exponent = expression.op2.toMathJson({ fractionalDigits: "auto" });
    if (
      typeof exponent !== "number" ||
      !Number.isSafeInteger(exponent) ||
      exponent === 0
    ) {
      return null;
    }
    const base = compareExactOrderExpressions(
      engine,
      expression.op1,
      zero,
      depth + 1,
    );
    if (base === "unknown") return "unknown";
    if (base === "equal") return exponent > 0 ? "equal" : "unknown";
    if (Math.abs(exponent) % 2 === 0) return "greater";
    return base;
  }

  return null;
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
    const structural = structuralOrderFromZero(engine, left, depth);
    if (structural !== null) return structural;
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

function isFiniteRealExactMathJsonWithEngine(
  engine: ComputeEngine,
  input: unknown,
): KernelResult<boolean> {
  const boxed = boxValidated(engine, input);
  if (!boxed.ok) return boxed;

  try {
    return {
      ok: true,
      value: isProvablyFiniteRealExpression(engine, boxed.value),
    };
  } catch {
    return casFailure(
      "Compute Engine could not classify the exact constant as finite and real.",
    );
  }
}

function isProvablyFiniteRealExpression(
  engine: ComputeEngine,
  expression: ComputeExpression,
  depth = 0,
): boolean {
  if (
    depth > EXACT_FINITE_PROOF_DEPTH ||
    expression.unknowns.length !== 0 ||
    expression.isReal !== true ||
    expression.isFinite === false
  ) {
    return false;
  }
  if (expression.isFinite === true) return true;

  const finiteOperands = (): boolean => {
    if (!isFunction(expression)) return false;
    return expression.ops.every((operand: ComputeExpression) =>
      isProvablyFiniteRealExpression(engine, operand, depth + 1));
  };

  if (
    (isFunction(expression, "Add") && expression.nops >= 2) ||
    (isFunction(expression, "Subtract") && expression.nops === 2) ||
    (isFunction(expression, "Multiply") && expression.nops >= 2) ||
    (isFunction(expression, "Negate") && expression.nops === 1) ||
    (isFunction(expression, "Abs") && expression.nops === 1) ||
    (isFunction(expression, "Square") && expression.nops === 1)
  ) {
    return finiteOperands();
  }

  if (isFunction(expression, "Divide") && expression.nops === 2) {
    if (!finiteOperands()) return false;
    const denominatorOrder = compareExactOrderExpressions(
      engine,
      expression.op2,
      engine.box(0 as MathJsonExpression),
    );
    return denominatorOrder === "less" || denominatorOrder === "greater";
  }

  if (isFunction(expression, "Power") && expression.nops === 2) {
    const exponent = expression.op2.toMathJson({ fractionalDigits: "auto" });
    if (
      typeof exponent !== "number" ||
      !Number.isSafeInteger(exponent) ||
      !isProvablyFiniteRealExpression(engine, expression.op1, depth + 1)
    ) {
      return false;
    }
    if (exponent >= 0) return true;
    const baseOrder = compareExactOrderExpressions(
      engine,
      expression.op1,
      engine.box(0 as MathJsonExpression),
    );
    return baseOrder === "less" || baseOrder === "greater";
  }

  const root = rootExpression(expression);
  if (root !== null) {
    if (!isProvablyFiniteRealExpression(engine, root.radicand, depth + 1)) {
      return false;
    }
    if (root.degree % 2 === 1) return true;
    const radicandOrder = compareExactOrderExpressions(
      engine,
      root.radicand,
      engine.box(0 as MathJsonExpression),
    );
    return radicandOrder === "equal" || radicandOrder === "greater";
  }

  return false;
}

/**
 * MAIS-owned, request-scoped CAS facade. Its private engine can be reused by a
 * solver during one request without exposing Compute Engine vendor types.
 */
export class CasSession {
  readonly #engine: ComputeEngine;

  constructor() {
    this.#engine = new ComputeEngine({ precision: MAIS_CAS_DECIMAL_PRECISION });
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

  toCanonicalExactValueDto(input: unknown): KernelResult<ExactValueDto> {
    return toCanonicalExactValueDtoWithEngine(this.#engine, input);
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

  isFiniteRealExactMathJson(input: unknown): KernelResult<boolean> {
    return isFiniteRealExactMathJsonWithEngine(this.#engine, input);
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

export function toCanonicalExactValueDto(
  input: unknown,
): KernelResult<ExactValueDto> {
  return new CasSession().toCanonicalExactValueDto(input);
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

export function isFiniteRealExactMathJson(
  input: unknown,
): KernelResult<boolean> {
  return new CasSession().isFiniteRealExactMathJson(input);
}
