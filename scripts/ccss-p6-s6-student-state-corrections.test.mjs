import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function lesson(slug) {
  return readFileSync(
    path.join(ROOT, "components", "lesson", "ccss", "lessons", `${slug}.tsx`),
    "utf8",
  );
}

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

test("scientific notation parenthesizes a negative exponent operand", () => {
  const source = lesson("scientific-notation");
  mustInclude(source, "function exponentOperand", "negative exponents use an explicit operand formatter");
  mustInclude(
    source,
    'const productExponentWork = `${integerText(e1)} + ${exponentOperand(e2)}`;',
    "the displayed exponent sum formats its second operand",
  );
  mustInclude(source, "<sup>{productExponentWork}</sup>", "the formatted sum reaches the multiplication work");
  mustInclude(source, "product&apos;s exponent is {productExponentWork} = {productExponent}.", "the formatted sum reaches the explanation");
  mustExclude(source, "<sup>{e1}+{e2}</sup>", "compact plus-negative output is absent");
  mustExclude(source, "product&apos;s exponent is {e1} + {e2}", "spaced plus-negative output is absent");
});

test("addition rule gives overlap zero its own exact-addition message", () => {
  const source = lesson("addition-rule");
  mustInclude(source, "const additionComparison = pab === 0", "zero overlap has an explicit state branch");
  mustInclude(source, "No overlap, so direct addition gives the exact union probability.", "zero overlap is described truthfully");
  mustInclude(source, "({additionComparison})", "the state-aware message reaches the figure");
  mustInclude(source, "If the events overlap,", "the introduction qualifies when direct addition double-counts");
  mustExclude(source, "You can&apos;t just add", "the introduction does not forbid exact addition for mutually exclusive events");
  mustExclude(source, "(naively adding would give {naive} — too big by {r2(pab / 100)})", "zero overlap cannot reuse the stale too-big-by-zero sentence");
});

test("decimal arithmetic heading follows the selected operation", () => {
  const source = lesson("decimal-arithmetic");
  mustInclude(source, 'add: "Addition: line up the decimal points"', "addition has a matching heading");
  mustInclude(source, 'sub: "Subtraction: line up the decimal points"', "subtraction has a matching heading");
  mustInclude(source, 'mul: "Multiplication: count decimal places"', "multiplication has a matching heading");
  mustInclude(source, 'div: "Division: shift, then divide"', "division has a matching heading");
  mustInclude(source, "<h2>{OPERATION_HEADING[op]}</h2>", "the selected operation drives the heading");
  mustExclude(source, "<h2>Division: shift, then divide</h2>", "the heading is no longer statically division-only");
});

test("four-quadrant plane distinguishes both axes and allows the origin", () => {
  const source = lesson("four-quadrant-plane");
  mustExclude(source, "if (nx === 0 && ny === 0) return;", "an origin click is not discarded");
  mustInclude(source, 'if (p.x === 0 && p.y === 0) return "at the origin, on both axes and in no quadrant";', "the origin is named separately");
  mustInclude(source, 'if (p.y === 0) return "on the x-axis and in no quadrant";', "the x-axis state is named correctly");
  mustInclude(source, 'if (p.x === 0) return "on the y-axis and in no quadrant";', "the y-axis state is named correctly");
  mustInclude(source, 'aria-label={`Point (${p.x}, ${p.y}) is ${location}`}', "the precise location reaches assistive copy");
  mustInclude(source, "is <strong>{location}</strong>.", "the precise location reaches visible copy");
  mustInclude(source, "<h2>Nonzero signs identify quadrants</h2>", "quadrant sign copy excludes zero coordinates");
  mustInclude(source, "Points on either axis are in no quadrant.", "axis and quadrant membership are explicitly separated");
});

test("exponential no-cross copy does not erase the true x-zero ordering", () => {
  const source = lesson("exponential-vs-linear");
  const m = 8;
  const b = 1.5;
  assert.ok(Math.pow(b, 0) > m * 0, "the exponential is above the line at x = 0");
  assert.ok(
    Array.from({ length: 6 }, (_, index) => index + 1).every((x) => Math.pow(b, x) <= m * x),
    "the selected reachable state has no displayed integer overtake from x = 1 through x = 6",
  );
  mustInclude(source, "At <strong>x = 0</strong>, the exponential starts above the line.", "the no-cross branch states the x-zero ordering");
  mustInclude(source, "At each displayed integer from x = 1 through x = {XMAX}, it does not exceed the line", "the bounded comparison is limited to what the branch establishes");
  mustExclude(source, "Within this window the line is still ahead", "the whole-window falsehood is absent");
});

test("periodic model copy discloses that phase is fixed", () => {
  const source = lesson("periodic-models");
  mustInclude(source, "<h2>Three dials shape this sine curve</h2>", "the heading describes the displayed family");
  mustInclude(source, "fixes the phase shift at zero", "the missing fourth control is disclosed");
  mustInclude(source, "A fourth control for phase shift would be needed", "arbitrary horizontal translation is not implied");
  mustExclude(source, "<h2>Three dials, any wave</h2>", "three fixed-phase controls are not called any wave");
});

test("figure symmetry qualifies the rectangle claim", () => {
  const source = lesson("figure-symmetry");
  mustInclude(source, "a non-square rectangle has exactly 2 lines of symmetry and rotational", "the two-line claim excludes squares");
  mustInclude(source, "symmetry of order 2", "the qualified rectangle keeps its rotation fact");
  mustExclude(source, "a rectangle has just 2 lines of symmetry", "squares are not swept into the two-line claim");
});

test("matrix determinant work parenthesizes negative factors", () => {
  const source = lesson("matrix-equations");
  mustInclude(source, "function factorText", "determinant factors use a formatter");
  mustInclude(source, 'return value < 0 ? `(${text})` : text;', "negative factors receive explicit parentheses");
  mustInclude(source, "det A = {factorText(a)}·{factorText(d)} − {factorText(b)}·{factorText(c)}", "every determinant factor is formatted");
  mustExclude(source, "det A = {a}·{d} − {b}·{c}", "raw signed determinant factors are absent");
});

test("row-column work parenthesizes negative factors", () => {
  const source = lesson("matrices");
  mustInclude(source, "function factorText", "row-column factors use a formatter");
  mustInclude(source, 'return value < 0 ? `(${text})` : text;', "negative row-column factors receive explicit parentheses");
  mustInclude(source, "the top-left is {factorText(A[0][0])}·{factorText(B[0][0])}", "the first product formats both factors");
  mustInclude(source, "+ {factorText(A[0][1])}·{factorText(B[1][0])}", "the second product formats both factors");
  mustExclude(source, "the top-left is {A[0][0]}·{B[0][0]}", "raw row-column factors are absent");
  mustInclude(source, 'aria-label={o === "scale" ? "Scale A" : o === "add" ? "Add A and B" : "Multiply A by B"}', "operation choices have stable accessible names");
  mustInclude(source, 'op === "scale" ? (', "the explanation branches for scalar multiplication");
  mustInclude(source, 'op === "add" ? (', "the explanation branches for matrix addition");
  mustInclude(source, "disabled={v <= MATRIX_ENTRY_MIN}", "matrix entry decreases stop at a declared boundary");
  mustInclude(source, "disabled={v >= MATRIX_ENTRY_MAX}", "matrix entry increases stop at a declared boundary");
});
