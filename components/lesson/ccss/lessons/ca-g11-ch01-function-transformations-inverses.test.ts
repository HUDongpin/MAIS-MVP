import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import Lesson, {
  CELL,
  HALF_LIFE,
  H_MAX,
  H_MIN,
  K_MAX,
  K_MIN,
  MAG_MAX,
  MAG_MIN,
  PAD,
  PARENTS,
  R,
  ROOM_TEMP,
  SIZE,
  START_GAP,
  START_TEMP,
  STEP,
  TARGET_TEMP,
  TRY_A,
  TRY_H,
  TRY_INPUTS,
  TRY_K,
  anchorOnMirror,
  anchorPoint,
  cocoaTemp,
  cocoaTime,
  curve,
  expandedNote,
  expandedText,
  figureLabel,
  forwardSteps,
  gInverseText,
  gText,
  inverseFeature,
  keyFeature,
  mirrorClaim,
  num,
  parentInfo,
  parentInverse,
  parentValue,
  polyline,
  powerCoefficientText,
  reciprocalText,
  sx,
  sy,
  transform,
  tryAnswerIndex,
  tryCandidates,
  tryG,
  undoSteps,
  untransform,
  workedExample,
  type ParentKey,
} from "./ca-g11-ch01-function-transformations-inverses";

const SLUG = "ca-g11-ch01-function-transformations-inverses";
const SOURCE = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
const BRIEF_STANDARDS = ["F-BF.1", "F-BF.2", "F-BF.3", "F-BF.4", "F-BF.5", "F-IF.7", "F-IF.8"];
const KEYS: ParentKey[] = ["line", "cube", "exp"];
const CLOSE = 1e-9;

/** Sample inputs used whenever a printed formula is read back and evaluated. */
const PROBES = [-6, -3.5, -1, -0.25, 0, 0.5, 2, 4.25, 6];

/**
 * Reads one of the lesson's printed formulas back as a JavaScript expression.
 * It knows only the notation a student sees on the card — no lesson builder is
 * consulted — so evaluating the result is an independent check of the algebra.
 */
function compile(display: string): (x: number) => number {
  let js = display.replace(/^g(?:⁻¹)?\(x\) = /u, "");
  js = js.replace(/−/gu, "-").replace(/·/gu, "*");
  // Implicit multiplication ("2x", "3(x - 1)"), resolved while ∛ and log₂ are still single glyphs.
  js = js.replace(/(\d)(?=[x(])/gu, "$1*");
  js = js.replace(/∛/gu, "Math.cbrt").replace(/log₂/gu, "Math.log2").replace(/Math\.cbrtx/gu, "Math.cbrt(x)");
  js = js.replace(/³/gu, "**3").replace(/²/gu, "**2").replace(/\^/gu, "**");
  // JS forbids a bare unary minus to the left of **, so make a leading sign an explicit factor.
  if (js.startsWith("-")) js = `(0 - 1)*${js.slice(1)}`;
  assert.doesNotMatch(js, /[^-+*/(). 0-9xMathcbrtlog2]/u, `unreadable notation in "${display}"`);
  return new Function("x", `"use strict"; return (${js});`) as unknown as (x: number) => number;
}

/** a·f(x − h) + k, written out here rather than imported, for both sides to be independent. */
function expectedValue(key: ParentKey, a: number, h: number, k: number, x: number): number {
  const inner = x - h;
  const parent = key === "line" ? inner : key === "cube" ? inner * inner * inner : Math.pow(2, inner);
  return a * parent + k;
}

function near(got: number, want: number, tolerance: number): boolean {
  return Math.abs(got - want) <= tolerance * Math.max(1, Math.abs(want));
}

/** Babel's JSXText cleaning: exactly the string React renders for a text child. */
function jsxTextValue(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/u);
  let lastFilled = -1;
  lines.forEach((line, i) => { if (/[^ \t]/u.test(line)) lastFilled = i; });
  let out = "";
  lines.forEach((line, i) => {
    let piece = i === 0 ? line : line.replace(/^[ \t]+/u, "");
    if (i !== lines.length - 1) piece = piece.replace(/[ \t]+$/u, "");
    if (!piece) return;
    out += i === lastFilled ? piece : `${piece} `;
  });
  return out;
}

/** Reads a display number back, including the true minus sign the lesson prints. */
function signed(text: string): number {
  return Number(text.replace("−", "-"));
}

/**
 * Independent semantics for one chip of the displayed chain. If the lesson's chain text
 * is honest, running these chips must reproduce the function itself.
 */
function applyStep(step: string, v: number): number {
  const add = /^add (\d+)$/u.exec(step);
  if (add) return v + Number(add[1]);
  const sub = /^subtract (\d+)$/u.exec(step);
  if (sub) return v - Number(sub[1]);
  const mul = /^multiply by (−?\d+)$/u.exec(step);
  if (mul) return v * signed(mul[1]);
  const div = /^divide by (−?\d+)$/u.exec(step);
  if (div) return v / signed(div[1]);
  if (step === "cube it") return v * v * v;
  if (step === "take the cube root") return Math.cbrt(v);
  if (step === "raise 2 to that power") return Math.pow(2, v);
  if (step === "take log base 2") return Math.log2(v);
  if (step === "flip the sign") return -v;
  if (step === "leave x alone") return v;
  throw new Error(`unknown step "${step}"`);
}

/** The opposite of each chip, written out independently of the lesson's builders. */
function opposite(step: string): string {
  const add = /^add (\d+)$/u.exec(step);
  if (add) return `subtract ${add[1]}`;
  const sub = /^subtract (\d+)$/u.exec(step);
  if (sub) return `add ${sub[1]}`;
  const mul = /^multiply by (−?\d+)$/u.exec(step);
  if (mul) return `divide by ${mul[1]}`;
  const div = /^divide by (−?\d+)$/u.exec(step);
  if (div) return `multiply by ${div[1]}`;
  if (step === "cube it") return "take the cube root";
  if (step === "take the cube root") return "cube it";
  if (step === "raise 2 to that power") return "take log base 2";
  if (step === "take log base 2") return "raise 2 to that power";
  if (step === "flip the sign") return "flip the sign";
  if (step === "leave x alone") return "leave x alone";
  throw new Error(`unknown step "${step}"`);
}

test("grid constants, scales and number formatting", () => {
  assert.deepEqual([R, CELL, PAD], [6, 22, 24]);
  assert.equal(SIZE, 2 * 6 * 22 + 2 * 24);
  assert.equal(SIZE, 312);
  assert.equal(STEP, 0.0625, "1/16 is exact in binary");
  assert.equal((2 * R) / STEP, 192);
  assert.equal(sx(-R), PAD);
  assert.equal(sx(R), SIZE - PAD);
  assert.equal(sy(R), PAD);
  assert.equal(sy(-R), SIZE - PAD);
  assert.equal(sx(0), SIZE / 2);
  assert.deepEqual([MAG_MIN, MAG_MAX, H_MIN, H_MAX, K_MIN, K_MAX], [1, 3, -3, 3, -3, 3]);

  assert.equal(num(4), "4");
  assert.equal(num(0), "0");
  assert.equal(num(-3), "−3");
  assert.equal(num(27.5), "27.5");
  assert.equal(num(-0.5), "−0.5");
  assert.equal(num(20.000000000000004), "20");
  assert.equal(reciprocalText(1), "1");
  assert.equal(reciprocalText(-1), "−1");
  assert.equal(reciprocalText(2), "1/2");
  assert.equal(reciprocalText(-3), "−1/3");
});

test("each parent and its inverse really undo one another", () => {
  assert.deepEqual(PARENTS.map((p) => p.key), KEYS);
  for (const key of KEYS) {
    assert.equal(parentValue(key, 0), key === "exp" ? 1 : 0);
    for (const t of [-2, -0.5, 0, 0.5, 1, 3]) {
      const y = parentValue(key, t);
      assert.ok(Math.abs(parentInverse(key, y) - t) < CLOSE, `${key} round trip at ${t}`);
    }
  }
  // Written out by hand: 2³ = 8, ∛8 = 2, 2⁴ = 16 and log₂16 = 4.
  assert.equal(parentValue("cube", 2), 8);
  assert.equal(parentInverse("cube", 8), 2);
  assert.equal(parentValue("cube", -3), -27);
  assert.equal(parentValue("exp", 4), 16);
  assert.equal(parentInverse("exp", 16), 4);
  assert.equal(parentInverse("exp", 1), 0);
});

test("every reachable control state keeps the figure and all four cards true", () => {
  let states = 0;
  for (const key of KEYS) {
    for (const flip of [false, true]) {
      for (let mag = MAG_MIN; mag <= MAG_MAX; mag += 1) {
        for (let h = H_MIN; h <= H_MAX; h += 1) {
          for (let k = K_MIN; k <= K_MAX; k += 1) {
            states += 1;
            const a = flip ? -mag : mag;
            const where = `${key} a=${a} h=${h} k=${k}`;
            assert.notEqual(a, 0, "a is never 0, so g is always invertible");

            // --- the marked point, computed independently of the lesson ---------
            const f0 = key === "exp" ? 1 : 0;
            const anchor = anchorPoint(key, a, h, k);
            assert.equal(anchor.x, h);
            assert.equal(anchor.y, a * f0 + k);
            assert.ok(Number.isInteger(anchor.y), `${where}: the marked output is a whole number`);
            assert.ok(Math.abs(anchor.x) <= R && Math.abs(anchor.y) <= R, `${where}: the marked point is on the grid`);
            assert.equal(transform(key, a, h, k, h), anchor.y, `${where}: g(h) is the marked output`);
            assert.equal(untransform(key, a, h, k, anchor.y), h, `${where}: the inverse sends it straight back`);
            // Marker circles of radius 6 stay inside the viewBox on both sides of y = x.
            for (const [cx, cy] of [[sx(anchor.x), sy(anchor.y)], [sx(anchor.y), sy(anchor.x)]]) {
              assert.ok(cx - 6 >= 0 && cx + 6 <= SIZE, `${where}: marker x`);
              assert.ok(cy - 6 >= 0 && cy + 6 <= SIZE, `${where}: marker y`);
            }

            // --- the drawn curve -------------------------------------------------
            const pts = curve(key, a, h, k);
            assert.ok(pts.length > 1, `${where}: the curve is drawn`);
            assert.ok(pts.some((p) => p.x === h), `${where}: the sample set contains x = h`);
            for (const [i, p] of pts.entries()) {
              assert.ok(p.x >= -R && p.x <= R, `${where}: sample x inside the window`);
              assert.ok(p.y >= -R && p.y <= R, `${where}: sample y inside the window`);
              assert.ok(sx(p.x) >= PAD && sx(p.x) <= SIZE - PAD, `${where}: pixel x inside the viewBox`);
              assert.ok(sy(p.y) >= PAD && sy(p.y) <= SIZE - PAD, `${where}: pixel y inside the viewBox`);
              // The mirrored copy is drawn from the same numbers, so it is inside too.
              assert.ok(sx(p.y) >= PAD && sx(p.y) <= SIZE - PAD, `${where}: mirrored pixel x`);
              assert.ok(sy(p.x) >= PAD && sy(p.x) <= SIZE - PAD, `${where}: mirrored pixel y`);
              // Independent evaluation of a·f(x − h) + k.
              const raw = key === "line" ? p.x - h : key === "cube" ? Math.pow(p.x - h, 3) : Math.pow(2, p.x - h);
              assert.ok(Math.abs(p.y - (a * raw + k)) < CLOSE, `${where}: plotted y equals a·f(x − h) + k`);
              // Every plotted input comes back from the inverse: the round trip the lesson claims.
              assert.ok(Math.abs(untransform(key, a, h, k, p.y) - p.x) < CLOSE, `${where}: round trip at x = ${p.x}`);
              if (i > 0) {
                assert.equal(p.x - pts[i - 1].x, STEP, `${where}: the polyline has no gap`);
                if (a > 0) assert.ok(p.y > pts[i - 1].y, `${where}: g increases`);
                else assert.ok(p.y < pts[i - 1].y, `${where}: g decreases`);
              }
            }
            // One-to-one: strict monotonicity over the drawn window means no output repeats.
            assert.equal(new Set(pts.map((p) => p.y)).size, pts.length, `${where}: no output is used twice`);

            // The inverse polyline is the same point list with the coordinates swapped.
            const mirrored = polyline(pts, true).split(" ");
            const forwardDrawn = polyline(pts, false).split(" ");
            assert.equal(mirrored.length, pts.length);
            assert.equal(forwardDrawn.length, pts.length);
            for (const [i, p] of pts.entries()) {
              assert.equal(forwardDrawn[i], `${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`);
              assert.equal(mirrored[i], `${sx(p.y).toFixed(2)},${sy(p.x).toFixed(2)}`);
            }

            // --- the two chains --------------------------------------------------
            const forward = forwardSteps(key, a, h, k);
            const undo = undoSteps(key, a, h, k);
            assert.ok(forward.length >= 1 && forward.length <= 4, `${where}: chain length`);
            assert.equal(undo.length, forward.length, `${where}: the undo has the same number of steps`);
            for (const [i, step] of forward.entries()) {
              assert.equal(undo[undo.length - 1 - i], opposite(step), `${where}: step ${i + 1} is undone last-first`);
            }
            for (const x of [h - 1, h, h + 1, -2, 2]) {
              const built = forward.reduce((v, step) => applyStep(step, v), x);
              assert.ok(Math.abs(built - transform(key, a, h, k, x)) < CLOSE, `${where}: the chain builds g at x = ${x}`);
              const back = undo.reduce((v, step) => applyStep(step, v), built);
              assert.ok(Math.abs(back - x) < CLOSE, `${where}: the undo chain returns x = ${x}`);
            }

            // --- the printed equations ------------------------------------------
            const g = gText(key, a, h, k);
            const gInv = gInverseText(key, a, h, k);
            assert.ok(g.startsWith("g(x) = "), `${where}: ${g}`);
            assert.ok(gInv.startsWith("g⁻¹(x) = "), `${where}: ${gInv}`);
            for (const text of [g, gInv]) {
              assert.doesNotMatch(text, /1·|·\(|\+ −|− −|\/1\b/u, `${where}: clumsy formatting in "${text}"`);
            }
            assert.equal(g.includes("³"), key === "cube", `${where}: only the cubic parent prints a cube`);
            assert.equal(g.includes("2^"), key === "exp", `${where}: only the exponential parent prints a power of 2`);
            assert.equal(gInv.includes("∛"), key === "cube", `${where}: only the cubic parent inverts with a cube root`);
            assert.equal(gInv.includes("log₂"), key === "exp", `${where}: only the exponential parent inverts with a log`);
            assert.equal(g.includes(`− ${Math.abs(h)}`) || h <= 0, true, `${where}: a right shift prints as x − h`);

            // Read the three printed formulas back and evaluate them. Nothing below calls a
            // lesson builder on both sides: the expected numbers come from expectedValue().
            const expanded = expandedText(key, a, h, k);
            const gFn = compile(g);
            const gInvFn = compile(gInv);
            const expandedFn = compile(expanded);
            for (const x of PROBES) {
              const want = expectedValue(key, a, h, k, x);
              assert.ok(near(gFn(x), want, 1e-9), `${where}: printed "${g}" gives ${gFn(x)} at x = ${x}, not ${want}`);
              assert.ok(near(expandedFn(x), want, 1e-9), `${where}: printed "${expanded}" gives ${expandedFn(x)} at x = ${x}, not ${want}`);
              assert.ok(near(gInvFn(want), x, 1e-7), `${where}: printed "${gInv}" sends ${want} to ${gInvFn(want)}, not ${x}`);
            }
            // Multiplying out only changes the spelling when there is a shift to distribute.
            assert.equal(expanded === g, h === 0, `${where}: "${expanded}" vs "${g}"`);
            assert.doesNotMatch(expanded, /1·|·\(|\+ −|− −|\/1\b/u, `${where}: clumsy formatting in "${expanded}"`);
            assert.equal(expanded.includes("x³"), key === "cube", `${where}: only the cubic expands to a cubic`);
            assert.equal(expanded.includes("2^x"), key === "exp", `${where}: only the exponential expands to a multiple of 2^x`);
            const note = expandedNote(key, h);
            assert.equal(note.includes("both spellings agree"), h === 0, `${where}: ${note}`);

            // --- the readouts and the accessible label ---------------------------
            const direction = a > 0 ? "increasing" : "decreasing";
            const label = figureLabel(key, a, h, k);
            assert.ok(label.includes(g) && label.includes(gInv), `${where}: the label states both equations`);
            assert.ok(label.includes(`Both are ${direction}`), `${where}: the label states the direction`);
            assert.ok(label.includes(`(${num(anchor.x)}, ${num(anchor.y)})`), `${where}: the label states the marked point`);
            assert.ok(label.includes(`(${num(anchor.y)}, ${num(anchor.x)})`), `${where}: the label states its mirror`);

            // --- the marked point: two dots, or one dot lying on y = x ----------
            // Recomputed here from the parent's own value at 0, not from anchorPoint.
            const sitsOnMirror = h === (key === "exp" ? a + k : k);
            assert.equal(sitsOnMirror, anchor.x === anchor.y, `${where}: the on-mirror test`);
            assert.equal(anchorOnMirror(key, a, h, k), sitsOnMirror, `${where}: anchorOnMirror`);
            const claim = mirrorClaim(key, a, h, k);
            if (sitsOnMirror) {
              assert.ok(!claim.includes("opposite sides"), `${where}: a point on y = x has no opposite sides: "${claim}"`);
              assert.ok(!claim.includes("pair"), `${where}: one point is not a pair: "${claim}"`);
              assert.ok(claim.includes(`(${num(anchor.x)}, ${num(anchor.x)})`), `${where}: ${claim}`);
              assert.ok(claim.includes("its own mirror image"), `${where}: ${claim}`);
              assert.ok(label.includes("its own mirror image"), `${where}: ${label}`);
              assert.equal(sx(anchor.x), sx(anchor.y), `${where}: both dots share a pixel`);
              assert.equal(sy(anchor.y), sy(anchor.x), `${where}: both dots share a pixel`);
            } else {
              assert.ok(claim.includes("opposite sides"), `${where}: ${claim}`);
              assert.ok(claim.includes(`(${num(anchor.x)}, ${num(anchor.y)}) and (${num(anchor.y)}, ${num(anchor.x)})`), `${where}: ${claim}`);
              assert.ok(!claim.includes("its own mirror image"), `${where}: ${claim}`);
              // Opposite sides really are opposite: one point is above y = x and the other below.
              assert.ok((anchor.y - anchor.x) * (anchor.x - anchor.y) < 0, `${where}: the two points straddle y = x`);
              assert.notEqual(sx(anchor.x), sx(anchor.y), `${where}: the two dots are drawn apart`);
            }
            // The parent curve is drawn a second time only when it is not the mirror line itself.
            assert.equal(label.includes("drawn only once"), key === "line", `${where}: ${label}`);
            assert.equal(label.includes("second dashed curve"), key !== "line", `${where}: ${label}`);
            const feature = keyFeature(key, a, h, k);
            const invFeature = inverseFeature(key, a, h, k);
            if (key === "line") {
              // A line's slope is a, and its inverse's slope is 1/a; their product is 1.
              const slope = (transform(key, a, h, k, 2) - transform(key, a, h, k, 0)) / 2;
              assert.equal(slope, a);
              const invSlope = (untransform(key, a, h, k, 2) - untransform(key, a, h, k, 0)) / 2;
              assert.ok(Math.abs(invSlope - 1 / a) < CLOSE);
              assert.ok(Math.abs(slope * invSlope - 1) < CLOSE);
              assert.ok(feature.includes(`slope ${num(a)}`), `${where}: ${feature}`);
              assert.ok(invFeature.includes(`slope ${reciprocalText(a)}`), `${where}: ${invFeature}`);
            }
            if (key === "exp") {
              // The asymptote claim: g stays on one side of y = k and creeps toward it.
              const far = transform(key, a, h, k, -R - 20);
              assert.notEqual(far, k);
              assert.ok(Math.abs(far - k) < 1e-6, `${where}: g approaches y = k`);
              assert.ok(a > 0 ? far > k : far < k, `${where}: g never crosses y = k`);
              assert.ok(feature.includes(`asymptote y = ${num(k)}`), `${where}: ${feature}`);
              assert.ok(invFeature.includes(`asymptote x = ${num(k)}`), `${where}: ${invFeature}`);
            }
            if (key === "cube") {
              // The center is where the cubic flattens: symmetric inputs give symmetric outputs.
              assert.equal(transform(key, a, h, k, h + 1) - k, -(transform(key, a, h, k, h - 1) - k));
              assert.ok(feature.includes(`center (${num(h)}, ${num(k)})`), `${where}: ${feature}`);
              assert.ok(invFeature.includes(`center (${num(k)}, ${num(h)})`), `${where}: ${invFeature}`);
            }
          }
        }
      }
    }
  }
  assert.equal(states, 3 * 2 * 3 * 7 * 7);
  assert.equal(states, 882);
});

test("spot-checked equation and chain text", () => {
  assert.equal(gText("line", 2, 3, -4), "g(x) = 2(x − 3) − 4");
  assert.equal(gInverseText("line", 2, 3, -4), "g⁻¹(x) = (x + 4)/2 + 3");
  // g(x) = 2(x − 3) − 4 = 2x − 10, so x = (y + 10)/2 = (y + 4)/2 + 3. Check at x = 5: g(5) = 0 and (0 + 4)/2 + 3 = 5.
  assert.equal(2 * (5 - 3) - 4, 0);
  assert.equal((0 + 4) / 2 + 3, 5);
  assert.equal(gText("line", 1, 0, 0), "g(x) = x");
  assert.equal(gInverseText("line", 1, 0, 0), "g⁻¹(x) = x");
  assert.equal(gText("line", -1, 0, 0), "g(x) = −x");
  assert.equal(gInverseText("line", -1, 0, 0), "g⁻¹(x) = −x");
  assert.equal(gText("cube", 1, 0, 2), "g(x) = x³ + 2");
  assert.equal(gInverseText("cube", 1, 0, 2), "g⁻¹(x) = ∛(x − 2)");
  assert.equal(gText("cube", -3, -2, 0), "g(x) = −3(x + 2)³");
  assert.equal(gInverseText("cube", -3, -2, 0), "g⁻¹(x) = ∛(−x/3) − 2");
  assert.equal(gText("exp", 1, 0, 0), "g(x) = 2^x");
  assert.equal(gInverseText("exp", 1, 0, 0), "g⁻¹(x) = log₂(x)");
  assert.equal(gText("exp", -2, -1, 3), "g(x) = −2·2^(x + 1) + 3");
  assert.equal(gInverseText("exp", -2, -1, 3), "g⁻¹(x) = log₂(−(x − 3)/2) − 1");

  assert.deepEqual(forwardSteps("line", 1, 0, 0), ["leave x alone"]);
  assert.deepEqual(undoSteps("line", 1, 0, 0), ["leave x alone"]);
  assert.deepEqual(forwardSteps("exp", 2, 3, -4), ["subtract 3", "raise 2 to that power", "multiply by 2", "subtract 4"]);
  assert.deepEqual(undoSteps("exp", 2, 3, -4), ["add 4", "divide by 2", "take log base 2", "add 3"]);
  assert.deepEqual(forwardSteps("cube", -1, -2, 0), ["add 2", "cube it", "flip the sign"]);
  assert.deepEqual(undoSteps("cube", -1, -2, 0), ["flip the sign", "take the cube root", "subtract 2"]);
  assert.equal(parentInfo("exp").formula, "f(x) = 2^x");
});

test("worked example: the cooling model and its inverse", () => {
  assert.deepEqual([ROOM_TEMP, START_TEMP, HALF_LIFE, TARGET_TEMP], [20, 80, 10, 35]);
  assert.equal(START_GAP, 80 - 20);
  assert.equal(START_GAP, 60);

  // T(m) = 20 + 60(1/2)^(m/10): the gap 60 halves to 30, 15 and 7.5.
  assert.equal(cocoaTemp(0), 20 + 60);
  assert.equal(cocoaTemp(0), 80);
  assert.equal(cocoaTemp(10), 20 + 30);
  assert.equal(cocoaTemp(10), 50);
  assert.equal(cocoaTemp(20), 20 + 60 / 4);
  assert.equal(cocoaTemp(20), 35);
  assert.equal(cocoaTemp(30), 20 + 60 / 8);
  assert.equal(cocoaTemp(30), 27.5);
  // The gap only halves, so the model stays above room temperature: at 100 minutes it is 20 + 60/1024.
  assert.equal(cocoaTemp(100), 20 + 60 / 1024);
  assert.ok(cocoaTemp(100) > ROOM_TEMP, "the model approaches room temperature without reaching it");

  // Inverse: m = 10·log₂(60/(T − 20)). At T = 35 the ratio is 60/15 = 4 and log₂4 = 2, so m = 20.
  assert.equal(60 / (35 - 20), 4);
  assert.equal(Math.pow(2, 2), 4);
  assert.ok(Math.abs(cocoaTime(35) - 10 * 2) < CLOSE);
  assert.ok(Math.abs(cocoaTime(50) - 10) < CLOSE);
  assert.ok(Math.abs(cocoaTime(80)) < CLOSE);
  for (const m of [0, 5, 10, 17.5, 30]) {
    assert.ok(Math.abs(cocoaTime(cocoaTemp(m)) - m) < CLOSE, `time and temperature undo each other at m = ${m}`);
  }

  const w = workedExample();
  assert.deepEqual(w.checkpoints.map((c) => c.m), [0, 10, 20, 30]);
  assert.deepEqual(w.checkpoints.map((c) => c.t), [80, 50, 35, 27.5]);
  assert.deepEqual(w.checkpoints.map((c) => c.gap), [60, 30, 15, 7.5]);
  assert.equal(w.gaps, "60, 30, 15, 7.5");
  assert.equal(w.table, "T(10) = 50, T(20) = 35, T(30) = 27.5");
  assert.equal(w.targetGap, 15);
  assert.equal(w.ratio, 4);
  assert.ok(Math.abs(w.halvings - 2) < CLOSE);
  assert.equal(num(w.halvings), "2");
  assert.ok(Math.abs(w.minutes - 20) < CLOSE);
  assert.equal(num(w.minutes), "20");
});

test("Try it: exactly one candidate inverts g(x) = 2(x − 5)³ + 7", () => {
  assert.deepEqual([TRY_A, TRY_H, TRY_K], [2, 5, 7]);
  // Hand arithmetic: g(3) = 2(−2)³ + 7 = −9, g(4) = 2(−1)³ + 7 = 5, g(5) = 7, g(6) = 2·1 + 7 = 9, g(7) = 2·8 + 7 = 23.
  assert.deepEqual(TRY_INPUTS.map(tryG), [-9, 5, 7, 9, 23]);
  assert.equal(2 * Math.pow(3 - 5, 3) + 7, -9);
  assert.equal(2 * Math.pow(7 - 5, 3) + 7, 23);

  const choices = tryCandidates();
  const answer = tryAnswerIndex();
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices.map((c) => c.text)).size, 4, "choices are distinct");
  assert.equal(answer, 1);
  assert.equal(choices[answer].text, "∛((x − 7)/2) + 5");
  assert.equal(choices.filter((c) => c.why === "correct").length, 1);
  assert.equal(choices[answer].why, "correct");

  // At g(6) = 9: ∛((9 − 7)/2) + 5 = ∛1 + 5 = 6 is the only value that returns the input 6.
  assert.equal((9 - 7) / 2, 1);
  assert.ok(Math.abs(choices[1].fn(9) - 6) < CLOSE);
  assert.ok(Math.abs(choices[0].fn(9) - -4) < CLOSE, "the wrong-sign shift lands on 1 − 5 = −4");
  assert.equal(choices[2].fn(9).toFixed(4), ((Math.cbrt(9) - 7) / 2 + 5).toFixed(4));
  assert.ok(Math.abs(choices[2].fn(9) - 2.54) < 0.005, "undoing in the original order lands near 2.54");
  assert.equal(choices[3].fn(9), 2 * Math.pow(2, 3) + 5);
  assert.equal(choices[3].fn(9), 21);

  for (const [i, c] of choices.entries()) {
    const undoesEverything = TRY_INPUTS.every((x) => Math.abs(c.fn(tryG(x)) - x) < CLOSE);
    assert.equal(undoesEverything, i === answer, `candidate ${i} inverts g only if it is the answer`);
  }
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = SOURCE;
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/gu)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["F-BF.1", "F-BF.3", "F-BF.4", "F-BF.5", "F-IF.7", "F-IF.8"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  // Parent choice, reflect toggle, Next step, Start over, the mapped Try-it choice, and the stepper pair.
  assert.equal(buttonTags.length, 7);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  // Inline control bounds match the constants the state grid above enumerated.
  assert.match(source, /label="Stretch \|a\|" value=\{mag\} min=\{1\} max=\{3\}/u);
  assert.match(source, /label="Shift h" value=\{h\} min=\{-3\} max=\{3\}/u);
  assert.match(source, /label="Lift k" value=\{k\} min=\{-3\} max=\{3\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{parent === p\.key\}/u);
  assert.match(source, /aria-pressed=\{flip\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);

  // US spelling: this is a California course, and the strings reach a screen reader too.
  assert.doesNotMatch(source, /\b(?:centre|colour|behaviour|analyse|modelling|favourite|neighbour)\b/iu, "British spellings");

  // The figure must not paint the parent twice, and must not draw two dots on one pixel.
  assert.match(source, /\{parent !== "line" && <polyline points=\{polyline\(fPts, false\)\}/u);
  assert.match(source, /\{!onMirror && <line x1=\{sx\(anchor\.x\)\}/u);
  assert.match(source, /\{!onMirror && <circle cx=\{sx\(anchor\.y\)\}/u);
  assert.match(source, /\{mirrorClaim\(parent, a, h, k\)\}/u, "the Math check must use the state-aware claim");
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  assert.ok(mathCheck.length > 500, "the Math check block was found");
  assert.doesNotMatch(mathCheck, /sit on opposite sides/u, "the claim belongs in mirrorClaim, not in fixed prose");
  assert.doesNotMatch(mathCheck, /expanded polynomial/u, "F-IF.8 is shown on a card now, not asserted in prose");
  assert.match(source, /big: expandedText\(parent, a, h, k\)/u, "the multiplied-out spelling is on screen");
});

test("the multiplied-out spelling is the same rule, checked by hand", () => {
  // 2(x − 3) − 4 = 2x − 6 − 4 = 2x − 10.
  assert.equal(expandedText("line", 2, 3, -4), "g(x) = 2x − 10");
  assert.equal(2 * (5 - 3) - 4, 2 * 5 - 10);
  // (x − 1)³ = x³ − 3x² + 3x − 1.
  assert.equal(expandedText("cube", 1, 1, 0), "g(x) = x³ − 3x² + 3x − 1");
  assert.equal(Math.pow(4 - 1, 3), 64 - 3 * 16 + 3 * 4 - 1);
  // −2(x + 1)³ + 3 = −2x³ − 6x² − 6x + 1.
  assert.equal(expandedText("cube", -2, -1, 3), "g(x) = −2x³ − 6x² − 6x + 1");
  assert.equal(-2 * Math.pow(2 + 1, 3) + 3, -2 * 8 - 6 * 4 - 6 * 2 + 1);
  // 3·2^(x − 2) + 1 = (3/4)·2^x + 1, because 2^(x − 2) = 2^x/4.
  assert.equal(expandedText("exp", 3, 2, 1), "g(x) = (3/4)·2^x + 1");
  assert.equal(3 * Math.pow(2, 4 - 2) + 1, (3 / 4) * Math.pow(2, 4) + 1);
  // 2·2^(x + 1) = 4·2^x, and a shift of 0 leaves the spelling alone.
  assert.equal(expandedText("exp", 2, -1, 0), "g(x) = 4·2^x");
  assert.equal(expandedText("exp", 2, 0, -3), gText("exp", 2, 0, -3));
  assert.equal(powerCoefficientText(2, 1), "1");
  assert.equal(powerCoefficientText(-3, 3), "−3/8");
  assert.equal(powerCoefficientText(3, -2), "12");

  assert.equal(expandedNote("cube", 0), "with h = 0 there is nothing to multiply out, so both spellings agree");
  assert.ok(expandedNote("cube", 2).includes("center (h, k)"));
  assert.ok(expandedNote("exp", 2).includes("shift h"));
});

test("the marked-point sentence never claims two dots where there is one", () => {
  // parent = line, a = 1, h = 0, k = 0: the marked point is (0, 0), on the mirror line.
  assert.equal(anchorOnMirror("line", 1, 0, 0), true);
  assert.ok(mirrorClaim("line", 1, 0, 0).includes("(0, 0) is its own mirror image"));
  // The three-click state from the default figure: line, |a| = 2, h = 2, k = 2.
  assert.equal(anchorOnMirror("line", 2, 2, 2), true);
  assert.equal(anchorOnMirror("cube", -3, -3, -3), true);
  // exp lifts the anchor by a, so the point lands on y = x when h = a + k.
  assert.equal(anchorOnMirror("exp", 2, 1, -1), true);
  assert.equal(anchorOnMirror("exp", 2, 2, -1), false);
  assert.equal(anchorOnMirror("line", 2, 2, -1), false);
  assert.ok(mirrorClaim("line", 2, 2, -1).includes("(2, −1) and (−1, 2) sit on opposite sides"));
  let onMirror = 0;
  for (const key of KEYS) {
    for (const a of [-3, -2, -1, 1, 2, 3]) {
      for (let h = H_MIN; h <= H_MAX; h += 1) {
        for (let k = K_MIN; k <= K_MAX; k += 1) if (anchorOnMirror(key, a, h, k)) onMirror += 1;
      }
    }
  }
  // 42 line states (h = k) + 42 cube states (h = k) + 30 exp states (h = a + k).
  assert.equal(onMirror, 42 + 42 + 30);
  assert.equal(onMirror, 114);
});

test("no JSX text is glued to the value or the title that follows it", () => {
  const tree = ts.createSourceFile(`${SLUG}.tsx`, SOURCE, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const inline = new Set(["strong", "em", "b", "i", "code", "a"]);
  const glued: string[] = [];

  type Piece = { kind: "text" | "value" | "inline" | "block"; text: string; line: number };
  function pieceOf(child: ts.Node): Piece {
    const line = tree.getLineAndCharacterOfPosition(child.getStart(tree)).line + 1;
    if (ts.isJsxText(child)) return { kind: "text", text: jsxTextValue(child.text), line };
    if (ts.isJsxExpression(child) && child.expression && ts.isStringLiteral(child.expression)) {
      return { kind: "text", text: child.expression.text, line };
    }
    if (ts.isJsxExpression(child)) return { kind: "value", text: child.getText(tree), line };
    const tag = ts.isJsxElement(child) ? child.openingElement.tagName.getText(tree)
      : ts.isJsxSelfClosingElement(child) ? child.tagName.getText(tree) : "";
    return { kind: inline.has(tag) ? "inline" : "block", text: tag, line };
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const pieces = node.children.map(pieceOf).filter((p) => p.kind !== "text" || p.text !== "");
      for (let i = 0; i + 1 < pieces.length; i += 1) {
        const left = pieces[i], right = pieces[i + 1];
        const note = `line ${left.line}: ...${left.text.slice(-28)}] + [${right.text.slice(0, 28)}...`;
        if (left.kind === "text" && /[A-Za-z0-9]$/u.test(left.text) && right.kind === "value") glued.push(note);
        if (left.kind === "value" && right.kind === "text" && /^[A-Za-z0-9]/u.test(right.text)) glued.push(note);
        if (left.kind === "text" && !/ $/u.test(left.text) && right.kind === "inline") glued.push(note);
        if (left.kind === "inline" && right.kind === "text" && /^[A-Za-z0-9]/u.test(right.text)) glued.push(note);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.deepEqual(glued, [], `JSX whitespace is stripped here, so these render with no space:\n${glued.join("\n")}`);
});

test("the lesson renders with the words and the numbers kept apart", () => {
  // The lesson file is compiled with the classic JSX runtime, which expects a global React.
  (globalThis as unknown as { React?: unknown }).React ??= React;
  const html = renderToStaticMarkup(React.createElement(Lesson));
  // Block tags become line breaks; inline tags vanish, so gluing across <strong> still shows.
  const text = html
    .replace(/<\/(?:p|div|li|ol|ul|h1|h2|h3|figure|figcaption|aside|button|svg|section)>/gu, "\n")
    .replace(/<[^>]*>/gu, "");

  assert.doesNotMatch(text, /[A-Za-z]\d/u, "a word is glued to an interpolated number");
  assert.doesNotMatch(text, /[a-z]\.[A-Z]/u, "a sentence is glued to the title after it");
  assert.ok(text.includes("halving every 10 minutes"), "the worked-example half-life reads as words plus a number");
  assert.ok(text.includes("in half. Building Sequences"), "the roadmap keeps a space before each lesson title");
  assert.ok(text.includes("nth term. Inverse Functions"), "the roadmap keeps a space before each lesson title");

  // Default state: parent = line, |a| = 2, h = 2, k = −1, so g(x) = 2(x − 2) − 1 = 2x − 5.
  assert.ok(text.includes("g(x) = 2(x − 2) − 1"), "the machine card is on the page");
  assert.ok(text.includes("g(x) = 2x − 5"), "the multiplied-out card is on the page");
  assert.equal(2 * (4 - 2) - 1, 2 * 4 - 5);
  // The sentences the grid test verified are the ones the page actually prints.
  assert.ok(text.includes(mirrorClaim("line", 2, 2, -1)), "the Math check prints the state-aware claim");
  assert.ok(html.includes(figureLabel("line", 2, 2, -1)), "the svg label is built from state");

  // For f(x) = x the parent curve is the mirror line, so only g and its inverse are drawn.
  assert.equal((html.match(/<polyline/gu) ?? []).length, 2, "the parent line is not painted over the mirror line");
  assert.equal((html.match(/<circle/gu) ?? []).length, 2, "the marked point and its mirror are both drawn here");
  assert.ok(html.includes("drawn once"), "the caption explains the single diagonal");
});
