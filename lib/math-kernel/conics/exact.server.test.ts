import assert from "node:assert/strict";
import { test } from "node:test";

import { CasSession } from "../cas/computeEngine.server";
import { KERNEL_ERROR_CODES } from "../shared/errors";
import type { MathJsonExpr } from "../shared/types";
import {
  circleExact,
  ellipseExact,
  exactConicToNumeric,
  hyperbolaExact,
  parabolaExact,
  toEquationExact,
  toEquationLatex,
} from "./exact.server";
import { toQuadratic2D } from "./model";

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

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a successful kernel result.");
  return result.value;
}

function expectError(
  result: { ok: true } | { ok: false; error: { code: string } },
  code: string,
): void {
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, code);
}

function exactEqual(
  session: CasSession,
  left: MathJsonExpr,
  right: MathJsonExpr,
): void {
  const comparison = unwrap(session.compareExactMathJson(left, right));
  assert.equal(comparison, "equal");
}

function captureAbnormalConsole<T>(operation: () => T): {
  readonly value: T;
  readonly messages: readonly string[];
} {
  const originalError = console.error;
  const originalWarn = console.warn;
  const messages: string[] = [];
  console.error = (...args: unknown[]) => {
    messages.push(`error: ${args.map(String).join(" ")}`);
  };
  console.warn = (...args: unknown[]) => {
    messages.push(`warn: ${args.map(String).join(" ")}`);
  };
  try {
    return { value: operation(), messages };
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
}

test("exact ellipse remains JSON-safe and derives exact focal relations", () => {
  const session = new CasSession();
  const ellipse = unwrap(
    ellipseExact(
      { a: 2, b: ["Sqrt", 3], center: [-1, 2] },
      session,
    ),
  );

  assert.equal(ellipse.majorAxis, "x");
  exactEqual(session, ["Power", ellipse.c, 2], [
    "Subtract",
    ["Power", ellipse.a, 2],
    ["Power", ellipse.b, 2],
  ]);
  exactEqual(session, ellipse.eccentricity, ["Rational", 1, 2]);
  exactEqual(session, ellipse.directrices[0].value, -5);
  exactEqual(session, ellipse.directrices[1].value, 3);

  const quadratic = toQuadratic2D(ellipse);
  exactEqual(session, quadratic.xy, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(ellipse)), ellipse);
});

test("exact hyperbola, parabola, and circle derive from canonical parameters", () => {
  const session = new CasSession();
  const hyperbola = unwrap(
    hyperbolaExact({ a: 2, b: ["Sqrt", 3], center: [-1, 2] }, session),
  );
  exactEqual(session, ["Power", hyperbola.c, 2], 7);
  exactEqual(session, hyperbola.directrices[0].value, [
    "Subtract",
    -1,
    ["Divide", 4, ["Sqrt", 7]],
  ]);

  const parabola = unwrap(parabolaExact({ p: 2 }, session));
  assert.deepEqual(parabola.focus, [1, 0]);
  assert.deepEqual(parabola.directrix, { axis: "x", value: -1 });

  const circle = unwrap(circleExact({ r: ["Sqrt", 5], center: [-2, 3] }, session));
  exactEqual(session, ["Power", circle.r, 2], 5);
});

test("equation DTO and LaTeX come from the same exact MathJSON", () => {
  const session = new CasSession();
  const model = unwrap(
    hyperbolaExact(
      { a: 2, b: ["Sqrt", 3], center: [-1, 2], orientation: "x" },
      session,
    ),
  );
  const equation = unwrap(toEquationExact(model, session));
  const latex = unwrap(toEquationLatex(model, session));

  exactEqual(session, equation.mathJson, [
    "Equal",
    [
      "Subtract",
      ["Divide", ["Power", ["Subtract", "x", -1], 2], 4],
      ["Divide", ["Power", ["Subtract", "y", 2], 2], 3],
    ],
    1,
  ]);
  assert.equal(latex, equation.latex);
  assert.match(latex, /x\+1/);
  assert.match(latex, /y-2/);
  assert.doesNotMatch(latex, /--/);
  assert.deepEqual(JSON.parse(JSON.stringify(equation)), equation);
});

test("origin and translated equations for all four conics are mathematically correct", () => {
  const session = new CasSession();
  const cases = [
    [
      unwrap(ellipseExact({ a: 2, b: 1 }, session)),
      ["Equal", ["Add", ["Divide", ["Power", "x", 2], 4], ["Power", "y", 2]], 1],
    ],
    [
      unwrap(hyperbolaExact({ a: 2, b: 1, orientation: "y" }, session)),
      ["Equal", ["Subtract", ["Divide", ["Power", "y", 2], 4], ["Power", "x", 2]], 1],
    ],
    [
      unwrap(parabolaExact({ p: -2, vertex: [1, -3], orientation: "y" }, session)),
      ["Equal", ["Power", ["Subtract", "x", 1], 2], ["Multiply", -4, ["Subtract", "y", -3]]],
    ],
    [
      unwrap(circleExact({ center: [-2, 3], r: 4 }, session)),
      ["Equal", ["Add", ["Power", ["Subtract", "x", -2], 2], ["Power", ["Subtract", "y", 3], 2]], 16],
    ],
  ] as const;

  for (const [model, expected] of cases) {
    exactEqual(session, unwrap(toEquationExact(model, session)).mathJson, expected);
  }
});

test("exact models convert to finite numeric render models without semantic drift", () => {
  const session = new CasSession();
  const exact = unwrap(
    ellipseExact({ a: 2, b: ["Sqrt", 3], center: [-1, 2] }, session),
  );
  const numeric = unwrap(exactConicToNumeric(exact, session));

  assert.equal(numeric.kind, "ellipse");
  assert.equal(numeric.majorAxis, "x");
  assert.ok(Math.abs(numeric.a - 2) < 1e-15);
  assert.ok(Math.abs(numeric.b - Math.sqrt(3)) < 1e-15);
  assert.deepEqual(numeric.center, [-1, 2]);
});

test("exact constructors reject unprovable symbolic domains rather than guessing", () => {
  expectError(
    ellipseExact({ a: "a", b: 2, majorAxis: "x" }),
    KERNEL_ERROR_CODES.indeterminateSymbolicResult,
  );
  expectError(
    ellipseExact({ a: "a", b: "b" }),
    KERNEL_ERROR_CODES.indeterminateSymbolicResult,
  );
  expectError(
    circleExact({ r: "r" }),
    KERNEL_ERROR_CODES.indeterminateSymbolicResult,
  );
  expectError(
    circleExact({ r: ["Root", -16, 4] }),
    KERNEL_ERROR_CODES.indeterminateSymbolicResult,
  );
});

test("conic positivity and ellipse axis order use exact sign proofs", () => {
  const negativeRadius = circleExact({
    r: ["Subtract", SQRT_TWO, Q_ABOVE_SQRT_TWO],
  });
  expectError(negativeRadius, KERNEL_ERROR_CODES.nonPositiveDimension);

  const positiveRadius = circleExact({
    r: ["Subtract", Q_ABOVE_SQRT_TWO, SQRT_TWO],
  });
  assert.equal(positiveRadius.ok, true);

  const adversarial = captureAbnormalConsole(() =>
    ellipseExact({ a: Q_ABOVE_SQRT_TWO, b: SQRT_TWO }),
  );
  assert.deepEqual(adversarial.messages, []);
  const ellipse = unwrap(adversarial.value);
  assert.equal(ellipse.majorAxis, "x");
});

test("exact ellipse preserves close radical semiaxes without CAS logging", () => {
  const session = new CasSession();
  const adversarial = captureAbnormalConsole(() =>
    ellipseExact(
      { a: SQRT_JUST_ABOVE_TEN_TO_FIFTY, b: TEN_TO_FIFTY },
      session,
    ),
  );

  assert.deepEqual(adversarial.messages, []);
  const ellipse = unwrap(adversarial.value);
  assert.equal(ellipse.majorAxis, "x");
  assert.deepEqual(
    ellipse.a,
    unwrap(session.boxMathJson(SQRT_JUST_ABOVE_TEN_TO_FIFTY)),
  );
});

test("exact construction does not require values to fit in a JavaScript number", () => {
  const session = new CasSession();
  const hugeEllipse = ellipseExact(
    { a: ["Power", 10, 400], b: 2 },
    session,
  );
  assert.equal(hugeEllipse.ok, true);
  if (!hugeEllipse.ok) return;
  assert.equal(hugeEllipse.value.majorAxis, "x");

  expectError(
    exactConicToNumeric(hugeEllipse.value, session),
    KERNEL_ERROR_CODES.exactToNumberFailed,
  );
  assert.equal(
    circleExact({ r: ["Power", 10, -400] }, session).ok,
    true,
  );
});

test("exact-to-numeric conversion inherits numeric derived-value safety", () => {
  const session = new CasSession();
  const exact = unwrap(circleExact({ r: ["Power", 10, 200] }, session));
  expectError(
    exactConicToNumeric(exact, session),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
});

test("exact constructors return stable errors for invalid constants and axes", () => {
  expectError(
    ellipseExact({ a: 0, b: 2 }),
    KERNEL_ERROR_CODES.nonPositiveDimension,
  );
  expectError(
    ellipseExact({ a: 2, b: 2 }),
    KERNEL_ERROR_CODES.degenerateConic,
  );
  expectError(
    hyperbolaExact({ a: 2, b: -1 }),
    KERNEL_ERROR_CODES.nonPositiveDimension,
  );
  expectError(
    parabolaExact({ p: 0 }),
    KERNEL_ERROR_CODES.zeroParabolaParameter,
  );
  expectError(
    hyperbolaExact({ a: 2, b: 1, orientation: "z" as "x" }),
    KERNEL_ERROR_CODES.invalidOrientation,
  );
  expectError(
    ellipseExact({ a: 2, b: 3, majorAxis: "x" }),
    KERNEL_ERROR_CODES.invalidMajorAxis,
  );
});
