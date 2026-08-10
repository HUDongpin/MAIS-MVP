import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lesson = (slug) => readFileSync(
  path.join(ROOT, "components", "lesson", "ccss", "lessons", `${slug}.tsx`),
  "utf8",
);

function mustInclude(source, fragment, disposition) {
  assert.ok(
    source.includes(fragment),
    `${disposition}: expected source contract ${JSON.stringify(fragment)}`,
  );
}

function mustExclude(source, fragment, disposition) {
  assert.ok(
    !source.includes(fragment),
    `${disposition}: stale defect contract ${JSON.stringify(fragment)} returned`,
  );
}

test("triangle sine-area derivation states the ratio before solving for height", () => {
  const source = lesson("triangle-area-sine");
  mustInclude(source, "sin C = h/b", "sine is opposite over hypotenuse");
  mustInclude(source, "opposite ÷ hypotenuse", "the verbal ratio agrees with sin C = h/b");
  mustExclude(source, "height is the opposite side over hypotenuse b", "height is not itself described as a ratio");
});

test("complex-conjugate work parenthesizes every reachable negative squared base", () => {
  const source = lesson("complex-conjugates");
  mustInclude(source, "function squaredTerm", "squared bases use one sign-aware formatter");
  mustInclude(source, 'value < 0 ? "(" + value + ")"', "negative bases receive parentheses before the exponent");
  mustInclude(source, 'value={squaredTerm(a) + " + " + squaredTerm(b) + " = " + prod}', "the product row consumes the formatter for both bases");
});

test("experimental probability is undefined and unplotted before the first trial", () => {
  const source = lesson("probability-basics");
  mustInclude(source, "const exp = total > 0 ? heads / total : null", "zero trials do not acquire a fabricated probability");
  mustInclude(source, "{exp !== null && (", "the scale marker is hidden until an experiment exists");
  mustInclude(source, "undefined until the first flip", "the zero-trial state names the undefined relative frequency");
  mustInclude(source, "½ as likely as not", "the midpoint scale label uses meaningful probability language");
  mustExclude(source, "½ even", "the midpoint scale label is not an incomplete phrase");
  mustExclude(source, "total > 0 ? heads / total : 0.5", "the theoretical value is not substituted for missing experimental data");
});

test("distance lesson distinguishes coincident, axis-aligned, and right-triangle states", () => {
  const source = lesson("distance-formula");
  mustInclude(source, "const pointsCoincide = dx === 0 && dy === 0", "coincident points have an explicit state");
  mustInclude(source, "const axisAligned = !pointsCoincide && (dx === 0 || dy === 0)", "one-zero-gap segments have an explicit state");
  mustInclude(source, "no right triangle or hypotenuse is formed", "axis-aligned segments are not presented as nondegenerate triangles");
  mustInclude(source, "no triangle or hypotenuse is formed", "coincident points are not presented as triangles");
  mustInclude(source, "pointsCoincide ?", "student-facing copy branches on the coincident state");
  mustInclude(source, ": axisAligned ?", "student-facing copy branches on the axis-aligned state");
});

test("triangular-prism diagram visibly marks the triangle altitude perpendicular to its base", () => {
  const source = lesson("area-volume-surface");
  mustInclude(source, "triangle altitude h is perpendicular to base b", "the figure caption states the triangle-height relationship");
  mustInclude(source, '<line x1="90" y1="50" x2="90" y2="130"', "the triangle altitude is drawn to the base");
  mustInclude(source, '<polyline points="90,120 100,120 100,130"', "a right-angle marker makes perpendicularity visible");
});

test("cube cross-section preset names the one shape it actually draws", () => {
  const source = lesson("solids-cross-sections");
  mustInclude(source, '{ name: "Cube, six-face slice", result: "hexagon", shape: "hex" }', "the six-face cube preset and hexagonal rendering agree");
  mustExclude(source, 'result: "rectangle / hexagon"', "one selected preset does not claim two different displayed results");
});

test("hyperbola rendering samples the locus determined by its displayed foci", () => {
  const source = lesson("conic-sections");
  mustInclude(source, "const HYPERBOLA_B = Math.sqrt(HYPERBOLA_FOCUS_OFFSET ** 2 - HYPERBOLA_A ** 2)", "hyperbola parameters satisfy c squared equals a squared plus b squared");
  mustInclude(source, "function hyperbolaPath(branch: -1 | 1)", "both branches are generated from one locus equation");
  mustInclude(source, "Math.sqrt(1 + (yOffset * yOffset) / (HYPERBOLA_B * HYPERBOLA_B))", "sampled points satisfy x squared over a squared minus y squared over b squared equals one");
  mustInclude(source, "cx={HYPERBOLA_CENTER_X - HYPERBOLA_FOCUS_OFFSET}", "left focus follows the same parameters as the curve");
  mustInclude(source, "cx={HYPERBOLA_CENTER_X + HYPERBOLA_FOCUS_OFFSET}", "right focus follows the same parameters as the curve");
  mustExclude(source, "Q 100 95", "the arbitrary left quadratic Bezier is removed");
  mustExclude(source, "Q 140 95", "the arbitrary right quadratic Bezier is removed");
});

test("addition-rule diagram follows the reachable mutually exclusive state", () => {
  const source = lesson("addition-rule");
  mustInclude(source, "const eventsOverlap = pab > 0", "the diagram has an explicit overlap state");
  mustInclude(source, "const circleACenterX = eventsOverlap ? 95 : 62", "event A moves away when the intersection is empty");
  mustInclude(source, "const circleBCenterX = eventsOverlap ? 150 : 178", "event B moves away when the intersection is empty");
  mustInclude(source, "caption={eventsOverlap", "the figure caption follows the overlap state");
  mustInclude(source, "aria-label={eventsOverlap", "the diagram accessible name follows the overlap state");
  mustInclude(source, "{eventsOverlap && (", "the intersection label is conditional");
  mustExclude(source, 'aria-label="union of two events"', "the accessible name is not fixed across overlapping and disjoint states");
});

test("complex-number work parenthesizes every reachable negative operand", () => {
  const source = lesson("complex-numbers");
  mustInclude(source, "`(${p(a)}+${p(c)}) + (${p(b)}+${p(d)})i`", "addition formats a, b, c, and d");
  mustInclude(source, "`(${p(a)}−${p(c)}) + (${p(b)}−${p(d)})i`", "subtraction formats a, b, c, and d");
  mustInclude(source, "`(${p(a)}·${p(c)} − ${p(b)}·${p(d)}) + (${p(a)}·${p(d)} + ${p(b)}·${p(c)})i`", "multiplication formats both occurrences of every signed factor");
  mustExclude(source, "${b}·${p(d)}", "the first product cannot expose a bare negative b");
  mustExclude(source, "${b}·${p(c)}", "the second product cannot expose a bare negative b");
});

test("parabola equation and focus-directrix drawing share the axes origin", () => {
  const source = lesson("conic-sections");
  mustInclude(source, 'eq: "y = x²/(4p)"', "the parabola card uses unambiguous division by 4p");
  mustInclude(source, "const PARABOLA_VERTEX_X = PLOT_ORIGIN_X", "the parabola vertex lies on the vertical axis");
  mustInclude(source, "const PARABOLA_VERTEX_Y = PLOT_ORIGIN_Y", "the parabola vertex lies on the horizontal axis");
  mustInclude(source, "const PARABOLA_FOCUS_Y = PARABOLA_VERTEX_Y - PARABOLA_P", "the focus is p above the vertex");
  mustInclude(source, "const PARABOLA_DIRECTRIX_Y = PARABOLA_VERTEX_Y + PARABOLA_P", "the directrix is p below the vertex");
  mustInclude(source, "d={PARABOLA_PATH}", "the displayed parabola consumes the origin-aligned path");
  mustExclude(source, 'eq: "y = (1/4p)x²"', "the ambiguous reciprocal notation is absent");
  mustExclude(source, 'd="M 60 40 Q 120 190 180 40"', "the translated parabola path is absent");
});

test("matrix-equation figure caption follows determinant invertibility", () => {
  const source = lesson("matrix-equations");
  mustInclude(source, "const figureCaption = det !== 0", "the caption branches on determinant state");
  mustInclude(source, "A⁻¹ does not exist", "the singular caption rejects inverse multiplication");
  mustInclude(source, "<Figure caption={figureCaption}>", "the state-aware caption reaches the figure");
  mustExclude(source, '<Figure caption="Write the system as A·[x, y] = [e, f], then multiply by A⁻¹ to solve.">', "the inverse instruction is not unconditional");
});

test("standalone zero vector renders as a point without directional geometry", () => {
  const source = lesson("vectors");
  mustInclude(source, "caption={isZeroVector", "the vector figure caption follows the zero state");
  mustInclude(source, "{!isZeroVector ? (", "directional vector geometry is conditional");
  mustInclude(source, "The zero vector is a point, not an arrow", "the zero-state rendering contract is explicit");
  mustInclude(source, "zero vector", "the point is visibly identified");
  mustExclude(source, '<Figure caption="An arrow from the tail to the tip. Components are Δx and Δy; magnitude is the length.">', "the zero state does not retain an arrow caption");
});

test("vector copy formats signed addends and treats zero-vector scaling as invariant", () => {
  const source = lesson("vector-operations");
  mustInclude(source, "function signedOperand", "vector component work uses a sign-aware operand formatter");
  mustInclude(source, "{integerText(u.x)} + {signedOperand(v.x)}", "negative x addends cannot render as plus-minus text");
  mustInclude(source, '{integerText(u.y)} +{" "}', "the y-component sum keeps an explicit addition operator");
  mustInclude(source, "{signedOperand(v.y)}⟩", "negative y addends consume the sign-aware formatter");
  mustInclude(source, "const uIsZero = u.x === 0 && u.y === 0", "zero-vector scaling has an explicit state");
  mustInclude(source, "const resIsZero = res.x === 0 && res.y === 0", "a zero result has an explicit visual state");
  mustInclude(source, "A zero vector is a point, not an arrow with an invented direction", "zero vectors render without a directional arrowhead");
  mustInclude(source, "its length remains 0 and it has no direction", "scaling zero does not claim a length or direction change");
  mustInclude(source, "A zero vector stays zero under every scalar and has no direction", "the general rule states the zero-vector exception");
  mustInclude(source, 'aria-label={o === "add" ? "Add vectors" : o === "sub" ? "Subtract vectors" : "Scale vector u"}', "operation buttons keep stable accessible names when k changes");
  mustInclude(source, '{op !== "scale" && <Stepper label="v x"', "add and subtract expose the second vector controls");
  mustInclude(source, '{op === "scale" && <Stepper label="k"', "scale exposes the scalar control");
  mustInclude(source, 'op === "add" ? "Add component by component" : op === "sub" ? "Subtract by adding the opposite" : "Scale every component"', "the explanation heading follows the selected operation");
  mustInclude(source, 'u − v = ⟨{integerText(u.x)} − {signedOperand(v.x)}', "the subtract state explains componentwise subtraction");
  mustInclude(source, "Multiplying by a", "the scale state explains scalar multiplication rather than vector addition");
  mustExclude(source, "{u.x}+{v.x}", "signed sums do not collapse to plus-minus glyph soup");
});

test("equation steps preserve exact fractions, label approximations, and name inverse negative moves", () => {
  const source = lesson("solve-equations-steps");
  mustInclude(source, "function linearExpression", "equation lines use a sign-aware expression formatter");
  mustInclude(source, "function inverseMove", "step reasons use a sign-aware inverse-operation formatter");
  mustInclude(source, "`${linearExpression(a, b)} = ${linearExpression(c, d)}`", "both sides of the original equation avoid plus-negative text");
  mustInclude(source, 'why: inverseMove(c, "x")', "negative x terms are moved by adding their opposites");
  mustInclude(source, "why: inverseMove(b)", "negative constants are moved by adding their opposites");
  mustInclude(source, 'c < 0 ? "addition property of equality" : "subtraction property of equality"', "the named equality property follows the actual move");
  mustInclude(source, "function reducedFractionText", "noninteger solutions are reduced exactly");
  mustInclude(source, "const xDisplayRelation = solvable ? relationForDisplayedValue(x, xDisplay)", "the decimal relation is derived from the exact value rather than assumed");
  mustInclude(source, "`x = ${exactX} ${xDisplayRelation} ${xDisplay} (${xDisplayRelation === \"=\" ? \"exact decimal\" : \"nearest hundredth\"})`", "the final line distinguishes an exact terminating decimal from a rounded approximation");
  mustInclude(source, "Each algebraic equality through x = {exactX}", "the reversibility claim ends at the exact solution");
  mustInclude(source, "The rounded decimal is a presentation approximation", "the rounded decimal is not described as an equation-preserving move");
  mustExclude(source, "`${a}x + ${b} = ${c}x + ${d}`", "the original line cannot show plus-negative terms");
  mustExclude(source, '? `x ${xIsInteger ? "=" : "≈"}', "an approximation cannot replace the exact solution line");
  mustExclude(source, "`subtract ${c}x from both sides`", "negative x coefficients are not described as subtract-negative");
  mustExclude(source, "`subtract ${b} from both sides`", "negative constants are not described as subtract-negative");
  mustExclude(source, "Subtracting {c}x from both sides", "the no-unique-solution copy also follows the sign-aware move");
});
