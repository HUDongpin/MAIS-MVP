import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  CANCEL,
  CHECK_X,
  CONTROLS,
  GEO,
  SAMPLES,
  SVG,
  TICKETS,
  TRY,
  X_HI,
  X_LO,
  ariaLabel,
  axisLine,
  axisOfSymmetry,
  checkLine,
  coincidence,
  completingClause,
  curve,
  expandedForm,
  factoredForm,
  formNotes,
  geometricClosed,
  geometricSum,
  num,
  plotBounds,
  px,
  py,
  quadAt,
  rootSentence,
  steps,
  ticketRevenue,
  tryItOptions,
  vertexForm,
  vertexY,
  workedExample
} from "./ca-g10-ch04-quadratic-structure";

const SLUG = "ca-g10-ch04-quadratic-structure";
/** Exactly the standard list in the chapter brief for us-ca-math-s4-chapter-04. */
const BRIEF_STANDARDS = ["A-SSE.1", "A-SSE.2", "A-SSE.3", "A-SSE.4"];
/**
 * The subset this opener actually develops. A-SSE.4 ("derive and use the formula
 * for a finite geometric series") is deliberately NOT here: the opener previews
 * the cancellation that makes the formula work but never derives or uses it, and
 * the contract forbids re-teaching the lessons that follow. The chapter's third
 * lesson carries that standard.
 */
const DEVELOPED_STANDARDS = ["A-SSE.1", "A-SSE.2", "A-SSE.3"];
const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
const sourceFile = ts.createSourceFile(`${SLUG}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

type Opening = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

function openings(tag: string): Opening[] {
  const found: Opening[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sourceFile) === tag) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function attribute(node: Opening, name: string): ts.JsxAttribute | undefined {
  const found = node.attributes.properties.find((prop) => ts.isJsxAttribute(prop) && prop.name.getText(sourceFile) === name);
  return found && ts.isJsxAttribute(found) ? found : undefined;
}

/** Reads an inline numeric attribute, including a negated literal such as min={-4}. */
function attributeNumber(node: Opening, name: string): number | null {
  const init = attribute(node, name)?.initializer;
  if (!init || !ts.isJsxExpression(init) || !init.expression) return null;
  const expression = init.expression;
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(expression.operand)) {
    return -Number(expression.operand.text);
  }
  return null;
}

function attributeIdentifier(node: Opening, name: string): string | null {
  const init = attribute(node, name)?.initializer;
  if (init && ts.isJsxExpression(init) && init.expression && ts.isIdentifier(init.expression)) return init.expression.text;
  return null;
}

function lineOf(node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

/** Negative zero is not a mathematical distinction, so normalize it before comparing. */
const noNegZero = (value: unknown) => (Object.is(value, -0) ? 0 : value);
function eq(actual: unknown, expected: unknown, message?: string) {
  assert.equal(noNegZero(actual), noNegZero(expected), message);
}

/**
 * The lesson prints a minus sign as U+2212. These two are written out here on
 * purpose: the test must never format a number by calling the same helper the
 * lesson formats it with, or a sign bug would agree with itself.
 */
const show = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `${n}`);
const readSigned = (text: string) => (text.startsWith("−") ? -Number(text.slice(1)) : Number(text));

function assertInside(label: string, x: number, y: number, margin: number) {
  assert.ok(x - margin >= 0 && x + margin <= SVG.w, `${label}: x=${x} (margin ${margin}) leaves the ${SVG.w}px viewBox`);
  assert.ok(y - margin >= 0 && y + margin <= SVG.h, `${label}: y=${y} (margin ${margin}) leaves the ${SVG.h}px viewBox`);
}

/* ---------- parse the rendered strings back into mathematics ---------- */

function parseFactor(text: string): number {
  if (text === "x") return 0;
  const m = /^\(x ([+−]) ([\d.]+)\)$/u.exec(text);
  assert.ok(m, `factor did not parse: ${text}`);
  return m[1] === "−" ? Number(m[2]) : -Number(m[2]);
}

function parseFactored(shown: string): number[] {
  if (shown.endsWith("²")) { const r = parseFactor(shown.slice(0, -1)); return [r, r]; }
  const roots: number[] = [];
  let rest = shown;
  while (rest.length > 0) {
    if (rest.startsWith("(")) {
      const end = rest.indexOf(")");
      assert.ok(end > 0, `factored form did not parse: ${shown}`);
      roots.push(parseFactor(rest.slice(0, end + 1)));
      rest = rest.slice(end + 1);
    } else {
      assert.ok(rest.startsWith("x"), `factored form did not parse: ${shown}`);
      roots.push(0);
      rest = rest.slice(1);
    }
  }
  return roots;
}

function parseExpanded(shown: string) {
  const m = /^x²(?: ([+−]) (\d*)x)?(?: ([+−]) ([\d.]+))?$/u.exec(shown);
  assert.ok(m, `standard form did not parse: ${shown}`);
  const b = m[1] === undefined ? 0 : (m[1] === "−" ? -1 : 1) * (m[2] === "" ? 1 : Number(m[2]));
  const c = m[3] === undefined ? 0 : (m[3] === "−" ? -1 : 1) * Number(m[4]);
  return { b, c };
}

function parseVertex(shown: string) {
  const m = /^(x|\(x ([+−]) ([\d.]+)\))²(?: ([+−]) ([\d.]+))?$/u.exec(shown);
  assert.ok(m, `vertex form did not parse: ${shown}`);
  const h = m[1] === "x" ? 0 : (m[2] === "−" ? Number(m[3]) : -Number(m[3]));
  const k = m[4] === undefined ? 0 : (m[4] === "−" ? -Number(m[5]) : Number(m[5]));
  return { h, k };
}

test("the scale functions map the declared plot corners exactly", () => {
  eq(px(X_LO), SVG.padX);
  eq(px(X_HI), SVG.w - SVG.padX);
  eq(px(0), SVG.w / 2);
  const bounds = { yMin: -16, yMax: 20 };
  eq(py(bounds.yMax, bounds), SVG.padTop);
  eq(py(bounds.yMin, bounds), SVG.h - SVG.padBottom);
  assert.deepEqual({ ...CONTROLS.p }, { min: -4, max: 4 });
  assert.deepEqual({ ...CONTROLS.q }, { min: -4, max: 4 });
  eq(CHECK_X, 5);
  assert.ok(CHECK_X > CONTROLS.p.max && CHECK_X > CONTROLS.q.max, "the check input must sit outside both roots so the value is never zero");
});

test("every reachable root pair keeps all three forms true and the drawing inside the viewBox", () => {
  let states = 0;
  let doubleRoots = 0;
  let coincidences = 0;
  let halfIntegerVertices = 0;
  for (let p = CONTROLS.p.min; p <= CONTROLS.p.max; p += 1) {
    for (let q = CONTROLS.q.min; q <= CONTROLS.q.max; q += 1) {
      states += 1;
      const where = `p=${p} q=${q}`;
      // Independent recomputation of the two claims the figure makes about the vertex.
      const h = (p + q) / 2;
      const k = p * q - h * h;
      eq(axisOfSymmetry(p, q), h, where);
      eq(vertexY(p, q), k, where);
      eq(k, -(((q - p) / 2) ** 2) + 0, `${where}: k must also equal −((q − p)/2)²`);
      eq(quadAt(p, q, p), 0, `${where}: p is a root`);
      eq(quadAt(p, q, q), 0, `${where}: q is a root`);
      eq(quadAt(p, q, 0), p * q, `${where}: the constant term is f(0)`);
      eq(quadAt(p, q, h), k, `${where}: the vertex height is f(h)`);
      if (p === q) doubleRoots += 1;
      if (!Number.isInteger(h)) halfIntegerVertices += 1;

      // The three rendered strings parse back to the same quadratic.
      const parsedRoots = parseFactored(factoredForm(p, q)).sort((a, b) => a - b);
      assert.deepEqual(parsedRoots, [Math.min(p, q), Math.max(p, q)], `${where}: factored form ${factoredForm(p, q)}`);
      const std = parseExpanded(expandedForm(p, q));
      eq(std.b, -(p + q) + 0, `${where}: x-coefficient of ${expandedForm(p, q)}`);
      eq(std.c, p * q + 0, `${where}: constant of ${expandedForm(p, q)}`);
      const vtx = parseVertex(vertexForm(p, q));
      eq(vtx.h, h + 0, `${where}: shift in ${vertexForm(p, q)}`);
      eq(vtx.k, k, `${where}: constant in ${vertexForm(p, q)}`);

      // Every form agrees with the product form at every half-integer input, and none dips below the vertex.
      for (let i = -12; i <= 12; i += 1) {
        const x = i / 2;
        const direct = (x - p) * (x - q);
        eq(quadAt(p, q, x), direct, `${where}: quadAt at x=${x}`);
        eq(x * x + std.b * x + std.c, direct, `${where}: standard form at x=${x}`);
        eq((x - vtx.h) ** 2 + vtx.k, direct, `${where}: vertex form at x=${x}`);
        assert.ok(direct >= k, `${where}: f(${x}) = ${direct} must not dip below the vertex ${k}`);
      }
      eq(quadAt(p, q, CHECK_X), (CHECK_X - p) * (CHECK_X - q), where);
      assert.ok(quadAt(p, q, CHECK_X) > 0, `${where}: the readout at x = ${CHECK_X} is always positive`);

      /* ----- every sentence the student actually reads, in this state ----- */

      // 1. The SVG accessible name.
      const label = ariaLabel(p, q);
      const labelParts = /^Graph of y = (.+)\. The parabola (.+), and its lowest point is the vertex at \((−?[\d.]+), (−?[\d.]+)\)\.$/u.exec(label);
      assert.ok(labelParts, `${where}: aria-label did not parse: ${label}`);
      eq(labelParts[1], expandedForm(p, q), `${where}: aria-label names the wrong function`);
      eq(labelParts[2], rootSentence(p, q), `${where}: aria-label names the wrong roots`);
      eq(readSigned(labelParts[3]), h, `${where}: aria-label vertex x`);
      eq(readSigned(labelParts[4]), k, `${where}: aria-label vertex y`);
      // "lowest point" is only honest because the drawn quadratic is monic, so it opens upward.
      for (let i = -24; i <= 24; i += 1) assert.ok((i / 4 - p) * (i / 4 - q) >= k, `${where}: nothing may sit below the claimed lowest point`);

      // 2. The one-test readout under the cards.
      const check = checkLine(p, q);
      const checkParts = /^same function, one test: at x = (\d+) the factored form (.+) gives \((\d+)\)\((\d+)\) = (\d+), and the standard and vertex forms give (\d+) as well\.$/u.exec(check);
      assert.ok(checkParts, `${where}: check line did not parse: ${check}`);
      eq(Number(checkParts[1]), CHECK_X, where);
      eq(checkParts[2], factoredForm(p, q), where);
      eq(Number(checkParts[3]), CHECK_X - p, `${where}: first difference in the check line`);
      eq(Number(checkParts[4]), CHECK_X - q, `${where}: second difference in the check line`);
      eq(Number(checkParts[5]), (CHECK_X - p) * (CHECK_X - q), `${where}: the product printed in the check line`);
      eq(Number(checkParts[6]), CHECK_X * CHECK_X + std.b * CHECK_X + std.c, `${where}: the standard form must give the same value`);
      eq(Number(checkParts[6]), (CHECK_X - vtx.h) ** 2 + vtx.k, `${where}: the vertex form must give the same value`);

      // 3. The three card notes.
      const notes = formNotes(p, q);
      eq(notes.factored, `A product is zero only when a factor is zero, so the graph ${rootSentence(p, q)}.`, where);
      assert.ok(notes.standard.includes(`x-coefficient ${show(-(p + q))} is the opposite of the sum of the roots`), `${where}: ${notes.standard}`);
      assert.ok(notes.standard.includes(`constant ${show(p * q)} is their product and equals f(0)`), `${where}: ${notes.standard}`);
      assert.ok(notes.vertex.includes(`smallest value is ${show(k)}`), `${where}: ${notes.vertex}`);
      assert.ok(notes.vertex.includes(`reached at x = ${show(h)}`), `${where}: ${notes.vertex}`);
      assert.ok(notes.vertex.includes("opens upward"), `${where}: the vertex note must say which way the parabola opens`);

      // 4. Degenerate states: two cards can render the identical string, and the lesson must say so.
      const cards = [factoredForm(p, q), expandedForm(p, q), vertexForm(p, q)];
      const collides = cards[0] === cards[1] || cards[0] === cards[2] || cards[1] === cards[2];
      const note = coincidence(p, q);
      eq(note === null, !collides, `${where}: cards ${cards.join(" | ")} vs note ${note}`);
      if (collides) {
        coincidences += 1;
        assert.ok(note && note.includes("show the same expression"), `${where}: ${note}`);
        if (p === q && p + q === 0) {
          assert.ok(note!.includes("all three cards"), `${where}: ${note}`);
          eq(cards[0], cards[1], where);
          eq(cards[1], cards[2], where);
        } else if (p === q) {
          assert.ok(note!.includes("factored card and the vertex card") && note!.includes(cards[0]), `${where}: ${note}`);
          eq(cards[0], cards[2], `${where}: a double root makes factored and vertex form identical`);
          assert.notEqual(cards[1], cards[2], where);
        } else {
          eq(p + q, 0, `${where}: the only other collision is opposite roots`);
          assert.ok(note!.includes("standard card and the vertex card") && note!.includes(cards[1]), `${where}: ${note}`);
          eq(cards[1], cards[2], `${where}: opposite roots make standard and vertex form identical`);
          assert.notEqual(cards[0], cards[2], where);
        }
      }

      // 5. The Math check must not claim a rewrite that rewrote nothing.
      const clause = completingClause(p, q);
      if (cards[1] === cards[2]) {
        assert.ok(!clause.includes("rewrites"), `${where}: nothing was rewritten, but the clause says so: ${clause}`);
        assert.ok(clause.includes("already complete"), `${where}: ${clause}`);
      } else {
        eq(clause, `Completing the square rewrites it as ${vertexForm(p, q)}`, where);
      }

      // Plot window and every painted element.
      const bounds = plotBounds(p, q);
      eq(bounds.yMin, k, `${where}: the plotted floor is the vertex`);
      eq(bounds.yMax, Math.max(quadAt(p, q, X_LO), quadAt(p, q, X_HI)), `${where}: an upward parabola peaks at a window edge`);
      assert.ok(bounds.yMax > 0 && bounds.yMin <= 0, `${where}: the x-axis must fall inside the plotted range`);
      const points = curve(p, q);
      eq(points.length, SAMPLES + 1, where);
      for (const point of points) {
        assert.ok(point.x >= X_LO && point.x <= X_HI, `${where}: sample x=${point.x}`);
        eq(point.y, quadAt(p, q, point.x), `${where}: sample at x=${point.x}`);
        assertInside(`${where} curve point x=${point.x}`, px(point.x), py(point.y, bounds), 1.25);
      }
      const yZero = py(0, bounds);
      assert.ok(yZero >= SVG.padTop && yZero <= SVG.h - SVG.padBottom, `${where}: x-axis at y=${yZero}`);
      assertInside(`${where} first root marker`, px(p), yZero, 6);
      assertInside(`${where} second root marker`, px(q), yZero, 6);
      assertInside(`${where} vertex marker`, px(h), py(k, bounds), 6);
      // The axis of symmetry is drawn as a full-height line, so it is visible even when the vertex sits on the x-axis.
      const axis = axisLine(p, q);
      eq(axis.x, px(h), `${where}: the axis of symmetry is drawn at the midpoint of the roots`);
      eq(axis.y2 - axis.y1, SVG.h - SVG.padTop - SVG.padBottom, `${where}: the axis segment must span the whole plot`);
      assert.ok(axis.y2 - axis.y1 > 0, `${where}: the axis segment must never collapse to a point`);
      assertInside(`${where} axis top`, axis.x, axis.y1, 1);
      assertInside(`${where} axis bottom`, axis.x, axis.y2, 1);
      if (p === q) {
        eq(py(k, bounds), yZero, `${where}: a double root puts the vertex on the x-axis`);
        eq(px(h), px(p), `${where}: and directly under both root markers`);
        assert.ok(note !== null, `${where}: the copy must acknowledge the collapsed state`);
      }
      assert.ok(yZero + 15 + 4 <= SVG.h, `${where}: tick labels sit 15px under the axis and must stay on the canvas`);
      for (const tick of [-4, -2, 2, 4]) assert.ok(px(tick) - 12 >= 0 && px(tick) + 12 <= SVG.w, `${where}: tick label ${tick}`);

      const sentence = rootSentence(p, q);
      if (p === q) eq(sentence, `touches the x-axis once, at x = ${show(p)}`, where);
      else {
        assert.ok(sentence.includes(`x = ${show(Math.min(p, q))}`) && sentence.includes(`x = ${show(Math.max(p, q))}`), `${where}: ${sentence}`);
        assert.ok(sentence.startsWith("crosses"), `${where}: ${sentence}`);
      }
    }
  }
  eq(states, 81);
  eq(doubleRoots, 9);
  // 9 double roots + 9 opposite pairs, sharing p = q = 0.
  eq(coincidences, 9 + 9 - 1);
  assert.ok(halfIntegerVertices > 0, "the grid must reach vertices that are not whole numbers");
  eq(num(-4), "−4");
  eq(num(0), "0");
  eq(num(2.5), "2.5");
  eq(factoredForm(0, 0), "x²");
  eq(factoredForm(0, 3), "x(x − 3)");
  eq(factoredForm(-2, 3), "(x + 2)(x − 3)");
  eq(expandedForm(-1, 3), "x² − 2x − 3");
  eq(expandedForm(-4, 4), "x² − 16");
  eq(expandedForm(0, 1), "x² − x");
  eq(vertexForm(-1, 3), "(x − 1)² − 4");
  eq(vertexForm(-4, 4), "x² − 16");
  eq(vertexForm(3, 3), "(x − 3)²");
  eq(checkLine(-1, 3), "same function, one test: at x = 5 the factored form (x + 1)(x − 3) gives (6)(2) = 12, and the standard and vertex forms give 12 as well.");
  assert.equal(coincidence(-1, 3), null);
});

test("the worked example recomputes independently from the three ticket constants", () => {
  assert.deepEqual({ ...TICKETS }, { price: 12, sold: 40, extra: 5 });
  const ex = workedExample();
  // No discount: R(0) = 12 x 40 = 480.
  eq(12 * 40, 480);
  eq(ex.c, 480);
  eq(ticketRevenue(0), 480);
  // Expand: (12 - d)(40 + 5d) = 480 + 60d - 40d - 5d^2 = -5d^2 + 20d + 480.
  eq(12 * 5, 60);
  eq(60 - 40, 20);
  eq(ex.a, -5);
  eq(ex.b, 20);
  for (let i = -40; i <= 56; i += 1) {
    const d = i / 4;
    eq(ticketRevenue(d), -5 * d * d + 20 * d + 480, `expansion at d=${d}`);
  }
  // Zeros: 12 - d = 0 gives d = 12; 40 + 5d = 0 gives d = -8.
  eq(ex.zeroHigh, 12);
  eq(-40 / 5, -8);
  eq(ex.zeroLow, -8);
  eq(ticketRevenue(12), 0);
  eq(ticketRevenue(-8), 0);
  // Factor -5 out of the d terms: 20 / -5 = -4; half of -4 is -2; (-2)^2 = 4.
  eq(20 / -5, -4);
  eq(ex.inner, -4);
  eq(-4 / 2, -2);
  eq(ex.half, -2);
  eq((-2) * (-2), 4);
  for (let i = -40; i <= 56; i += 1) {
    const d = i / 4;
    eq(d * d - 4 * d, (d - 2) ** 2 - 4, `completing the square at d=${d}`);
  }
  // Vertex form: -5(d - 2)^2 + 500, since 480 - (-5)(4) = 500.
  eq(480 - -5 * 4, 500);
  eq(ex.best, 2);
  eq(ex.max, 500);
  eq(ex.bestPrice, 10);
  eq(ex.bestSold, 50);
  eq(10 * 50, 500);
  eq(ticketRevenue(2), 500);
  for (let i = -40; i <= 56; i += 1) {
    const d = i / 4;
    eq(-5 * (d - 2) ** 2 + 500, ticketRevenue(d), `vertex form at d=${d}`);
  }
  // The maximum claim, checked by brute force rather than by the same algebra.
  let bestValue = -Infinity;
  let bestAt = Number.NaN;
  for (let i = 0; i <= 44000; i += 1) {
    const d = -10 + i / 2000;
    const revenue = ticketRevenue(d);
    if (revenue > bestValue) { bestValue = revenue; bestAt = d; }
  }
  assert.ok(bestValue <= 500 + 1e-9, `swept maximum ${bestValue} must not beat 500`);
  eq(bestAt, 2);
  // The midpoint of the two zeros gives the same discount.
  eq((12 + -8) / 2, 2);
});

test("each rendered worked-example step parses back and re-evaluates to the same revenue", () => {
  const list = steps();
  eq(list.length, 6);
  for (const step of list) {
    assert.ok(step.title.length > 0 && step.math.length > 0 && step.note.length > 0);
  }
  const revenue = (d: number) => (12 - d) * (40 + 5 * d);
  const grid = Array.from({ length: 97 }, (_, i) => (i - 40) / 4);

  // Step 2 is the factored form the whole example starts from.
  eq(list[1].math, "R(d) = (12 − d)(40 + 5d)");

  // Step 3: standard form. Parse the printed coefficients and re-evaluate.
  const s3 = /^R\(d\) = (−?\d+)d² ([+−]) (\d+)d ([+−]) (\d+)$/u.exec(list[2].math);
  assert.ok(s3, `step 3 did not parse: ${list[2].math}`);
  const a3 = readSigned(s3[1]);
  const b3 = (s3[2] === "−" ? -1 : 1) * Number(s3[3]);
  const c3 = (s3[4] === "−" ? -1 : 1) * Number(s3[5]);
  eq(a3, -5);
  eq(b3, 20);
  eq(c3, 480);
  for (const d of grid) eq(a3 * d * d + b3 * d + c3, revenue(d), `printed standard form at d=${d}`);

  // Step 4: the leading coefficient pulled out of the d terms only.
  const s4 = /^R\(d\) = (−?\d+)\(d² ([+−]) (\d+)d\) ([+−]) (\d+)$/u.exec(list[3].math);
  assert.ok(s4, `step 4 did not parse: ${list[3].math}`);
  const a4 = readSigned(s4[1]);
  const in4 = (s4[2] === "−" ? -1 : 1) * Number(s4[3]);
  const c4 = (s4[4] === "−" ? -1 : 1) * Number(s4[5]);
  for (const d of grid) eq(a4 * (d * d + in4 * d) + c4, revenue(d), `printed factored-out form at d=${d}`);

  // Step 5: the completed square, both sides parsed and compared as functions.
  const s5 = /^d² ([+−]) (\d+)d = \(d ([+−]) (\d+)\)² ([+−]) (\d+)$/u.exec(list[4].math);
  assert.ok(s5, `step 5 did not parse: ${list[4].math}`);
  const bIn = (s5[1] === "−" ? -1 : 1) * Number(s5[2]);
  const shift = (s5[3] === "−" ? 1 : -1) * Number(s5[4]);
  const drop = (s5[5] === "−" ? -1 : 1) * Number(s5[6]);
  eq(bIn, in4, "the square is completed on exactly the expression step 4 produced");
  for (const d of grid) eq(d * d + bIn * d, (d - shift) ** 2 + drop, `printed completed square at d=${d}`);

  // Step 6: the vertex form. This is the sign convention that flips relative to steps 4 and 5.
  const s6 = /^R\(d\) = (−?\d+)\(d ([+−]) (\d+)\)² ([+−]) (\d+)$/u.exec(list[5].math);
  assert.ok(s6, `step 6 did not parse: ${list[5].math}`);
  const a6 = readSigned(s6[1]);
  const h6 = (s6[2] === "−" ? 1 : -1) * Number(s6[3]);
  const k6 = (s6[4] === "−" ? -1 : 1) * Number(s6[5]);
  eq(a6, -5);
  eq(h6, 2, "the printed shift must be the discount that maximizes revenue, not its opposite");
  eq(k6, 500);
  for (const d of grid) eq(a6 * (d - h6) ** 2 + k6, revenue(d), `printed vertex form at d=${d}`);
  // And the printed vertex really is the maximum, swept independently of the algebra.
  for (let i = 0; i <= 44000; i += 1) assert.ok(revenue(-10 + i / 2000) <= k6 + 1e-9, "the printed maximum must not be beaten");
  assert.ok(list[5].note.includes("$500"), `step 6 must state the maximum: ${list[5].note}`);
  assert.ok(list[0].math.includes("12 − d") && list[0].math.includes("40 + 5d"), `step 1: ${list[0].math}`);
});

test("the Try it question is well posed: the zeros fix the axis of symmetry but not the function", () => {
  assert.deepEqual({ ...TRY }, { p: 3, q: -7 });
  const { options, correct } = tryItOptions();
  eq(options.length, 4);
  eq(new Set(options.map((o) => o.value)).size, 4, "all four choices must read differently");
  // g(x) = (x - 3)(x + 7) = x^2 + 4x - 21, so the axis of symmetry is x = -4/2 = -2.
  for (let i = -20; i <= 20; i += 1) {
    const x = i / 2;
    eq((x - 3) * (x + 7), x * x + 4 * x - 21, `expansion at x=${x}`);
  }
  eq(-4 / 2, -2);
  eq(options[correct].value, -2);
  // Every nonzero multiple has the same two zeros and the same axis of symmetry,
  // which is exactly what the repaired stem now claims.
  for (const a of [1, 2, -3, 0.5]) {
    eq(a * (3 - 3) * (3 + 7), 0, `a=${a}: x = 3 is still a zero`);
    eq(a * (-7 - 3) * (-7 + 7), 0, `a=${a}: x = -7 is still a zero`);
    for (let i = 1; i <= 20; i += 1) {
      const t = i / 2;
      eq(a * (-2 + t - 3) * (-2 + t + 7), a * (-2 - t - 3) * (-2 - t + 7), `a=${a}: symmetry about -2 at distance ${t}`);
    }
  }
  eq((-2 - 3) * (-2 + 7), -25);
  eq(vertexY(3, -7), -25);
  assert.deepEqual(options.map((o) => o.value), [-5, -2, 3, 5]);
  options.forEach((option, i) => eq(option.value === -2, i === correct, `option ${i} (x = ${option.value})`));
  // The x = -5 distractor: (-7 - 3)/2 is a signed half-difference, not a distance.
  eq((-7 - 3) / 2, -5);
  eq(Math.abs(3 - -7) / 2, 5);
  assert.ok(!/how far apart/u.test(options[0].why), `a negative number is not a distance: ${options[0].why}`);
  assert.ok(options[0].why.includes("half the signed gap"), options[0].why);
  assert.ok(options[0].why.includes("average"), options[0].why);
});

test("the roadmap's cancellation is a state the figure can actually reach", () => {
  assert.deepEqual({ ...CANCEL }, { p: -4, q: 4 });
  assert.ok(CANCEL.p >= CONTROLS.p.min && CANCEL.p <= CONTROLS.p.max, "the previewed root must be reachable");
  assert.ok(CANCEL.q >= CONTROLS.q.min && CANCEL.q <= CONTROLS.q.max, "the previewed root must be reachable");
  // (x + 4)(x - 4): the two cross terms are -4x and +4x, and they sum to zero.
  eq(-CANCEL.q + -CANCEL.p, 0);
  eq(expandedForm(CANCEL.p, CANCEL.q), "x² − 16");
  eq(factoredForm(CANCEL.p, CANCEL.q), "(x + 4)(x − 4)");
  for (let i = -12; i <= 12; i += 1) {
    const x = i / 2;
    eq((x + 4) * (x - 4), x * x - 16, `cancellation at x=${x}`);
  }
  // The same bookkeeping one size up: (r - 1)(1 + r + r^2) = r^3 - 1.
  for (const r of [-3, -2, 0, 2, 3, 4, 7]) eq((r - 1) * (1 + r + r * r), r ** 3 - 1, `identity at r=${r}`);
  assert.ok(source.includes("cross terms"), "the roadmap must point at the cancellation it claims");
});

test("the geometric-series preview carries its r is not 1 hypothesis", () => {
  assert.deepEqual({ ...GEO }, { r: 3, n: 3 });
  eq(1 + 3 + 9, 13);
  eq(geometricSum(3, 3), 13);
  eq(3 ** 3 - 1, 26);
  eq(26 / 2, 13);
  eq(geometricClosed(3, 3), 13);
  for (const r of [2, 3, 4, 5, 10]) {
    for (let n = 1; n <= 8; n += 1) eq(geometricSum(r, n), geometricClosed(r, n), `r=${r} n=${n}`);
  }
  // The boundary the formula does not cover, recorded rather than stepped around:
  // at r = 1 the divisor r - 1 is zero, so the closed form is 0/0 while the sum is n.
  assert.ok(Number.isNaN(geometricClosed(1, 3)), "a(r^n - 1)/(r - 1) is 0/0 at r = 1");
  assert.ok(Number.isNaN(geometricClosed(1, 8)), "and at every length");
  eq(geometricSum(1, 3), 3);
  eq(geometricSum(1, 8), 8);
  assert.ok(source.includes("r ≠ 1"), "wherever the lesson states the formula it must state the restriction");
});

test("lesson source honors the authoring contract", () => {
  assert.ok(source.startsWith('"use client";'), "file must start with the client directive");
  assert.doesNotMatch(source, /[　-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/u, "no CJK characters");
  for (const banned of ["Math.random", "fetch(", "localStorage", "sessionStorage", "dangerouslySetInnerHTML", "<form", "next/image", "Codex", "candidate", "S18", "QA"]) {
    assert.ok(!source.includes(banned), `source must not contain ${banned}`);
  }
  const lines = source.split("\n").length;
  assert.ok(lines >= 120 && lines <= 260, `lesson is ${lines} lines; the contract allows 120-260`);

  const cited = [...source.matchAll(/\b[A-Z]-[A-Z]{2,3}\.\d+\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of DEVELOPED_STANDARDS) assert.ok(mathCheck.includes(id), `Math check must cite ${id}`);
  assert.deepEqual([...new Set(cited)].sort(), DEVELOPED_STANDARDS);
  // A-SSE.4 is named by the brief but developed by the chapter's third lesson, not here.
  assert.ok(!source.includes("A-SSE.4"), "the opener must not cite a standard it never derives or uses");

  // The Try it stem must not deduce a function from its zeros.
  const stem = source.slice(source.indexOf("<h2>Try it</h2>"), source.indexOf("{tryIt.options.map"));
  assert.ok(!/, so g\(x\) =/u.test(stem), "roots do not determine the polynomial; the stem must not say they do");
  assert.ok(stem.includes("do not pin down the function"), "the stem must say what the zeros do and do not fix");

  const svgs = openings("svg");
  eq(svgs.length, 1);
  for (const svg of svgs) {
    assert.ok(attribute(svg, "viewBox"), `svg at line ${lineOf(svg)} needs a viewBox`);
    assert.ok(attribute(svg, "role"), `svg at line ${lineOf(svg)} needs role="img"`);
    assert.ok(attribute(svg, "aria-label"), `svg at line ${lineOf(svg)} needs an aria-label`);
  }

  const buttons = openings("button");
  // Two inside Stepper, the step disclosure, Start over, and the mapped Try it choice.
  eq(buttons.length, 5, "stepper pair, disclosure, reset and choice buttons expected");
  for (const button of buttons) {
    const init = attribute(button, "type")?.initializer;
    assert.ok(init && ts.isStringLiteral(init) && init.text === "button", `button at line ${lineOf(button)} needs type="button"`);
  }

  const steppers = openings("Stepper");
  eq(steppers.length, 2);
  for (const stepper of steppers) {
    const name = attributeIdentifier(stepper, "value");
    assert.ok(name === "p" || name === "q", `Stepper at line ${lineOf(stepper)} must bind a declared root control`);
    const declared = CONTROLS[name];
    eq(attributeNumber(stepper, "min"), declared.min, `${name} min`);
    eq(attributeNumber(stepper, "max"), declared.max, `${name} max`);
  }
  eq(openings("input").length, 0, "this lesson declares its controls as steppers only");

  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /<ol id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{choice === i\}/u);
  // The figure's displayed sentences must come from the exported builders the tests above walk.
  for (const call of ["aria-label={ariaLabel(p, q)}", "{checkLine(p, q)}", "const notes = formNotes(p, q)", "const same = coincidence(p, q)", "{completingClause(p, q)}", "const stepList = steps()"]) {
    assert.ok(source.includes(call), `the component must render through the tested builder: ${call}`);
  }
  for (const title of ["Reading an Expression&apos;s Parts", "Completing the Square", "Summing a Geometric Series"]) {
    assert.ok(source.includes(title), `the roadmap must name "${title}"`);
  }
});
