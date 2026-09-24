import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  A,
  BX_MAX,
  BX_MIN,
  BY_MAX,
  BY_MIN,
  CELL,
  DEN,
  EX_A,
  EX_B,
  EX_C,
  PAD,
  PART_MAX,
  PART_MIN,
  R,
  SIZE,
  TRY_K,
  TRY_L,
  cardTexts,
  circleEquation,
  factorText,
  figureCaption,
  figureLabel,
  mathCheckText,
  fractionText,
  gcd,
  layout,
  minusText,
  num,
  partitionPoint,
  pointText,
  ratioText,
  segment,
  shoelaceTerms,
  squareText,
  sumText,
  sx,
  sy,
  tryAnswerIndex,
  tryChoices,
  workedExample,
} from "./ca-g9-ch04-coordinate-geometry-methods";

const SLUG = "ca-g9-ch04-coordinate-geometry-methods";
const BRIEF_STANDARDS = ["G-GPE.1", "G-GPE.2", "G-GPE.3", "G-GPE.4", "G-GPE.5", "G-GPE.6", "G-GPE.7"];
/** Rough glyph box at font size 11, used to keep labels inside the viewBox and off each other. */
const GLYPH = 7, CAP = 11;

/** Independent formatting: integers plain, quarters as short decimals, a true minus sign. */
function show(v: number): string {
  const size = Math.abs(v);
  assert.ok(Number.isInteger(size * 4), `${v} should be a whole number of quarters`);
  return (v < 0 ? "−" : "") + String(size);
}

/** A squared factor, parenthesised when negative: 4² and (−3)². */
function sq(v: number): string {
  return v < 0 ? `(−${-v})²` : `${v}²`;
}

/** A factor, parenthesised when negative — the multiplier form. */
function fac(v: number): string {
  return v < 0 ? `(−${-v})` : String(v);
}

/** Lowest terms with a positive denominator, reduced by brute-force search (no shared gcd). */
function frac(n: number, d: number): string {
  if (d === 0) return "undefined";
  const top = d < 0 ? -n : n, bottom = Math.abs(d);
  if (top === 0) return "0";
  let g = 1;
  for (let k = 1; k <= Math.abs(top) + bottom; k += 1) if (top % k === 0 && bottom % k === 0) g = k;
  return bottom / g === 1 ? show(top / g) : `${show(top / g)}/${bottom / g}`;
}

/** "√25 = 5" when the root is whole, "√13 ≈ 3.61" when it is not. */
function lengthPhrase(d2: number): string {
  const root = Math.sqrt(d2);
  return Number.isInteger(root) ? `√${d2} = ${root}` : `√${d2} ≈ ${root.toFixed(2)}`;
}

/** The short form of the same length: "5" or "√13". */
function shortLength(d2: number): string {
  const root = Math.sqrt(d2);
  return Number.isInteger(root) ? String(root) : `√${d2}`;
}

/** Hand-reduced tables for the three reachable partition steps out of four. */
const QUARTER = ["", "1/4", "1/2", "3/4"];
const SPLIT_RATIO = ["", "1 : 3", "1 : 1", "3 : 1"];

/** The bounding box a label paints, in the same crude model the in-bounds check uses. */
function labelBox(lb: { text: string; x: number; y: number; anchor: "start" | "middle" | "end" }) {
  const width = lb.text.length * GLYPH;
  const left = lb.anchor === "start" ? lb.x : lb.anchor === "end" ? lb.x - width : lb.x - width / 2;
  return { text: lb.text, left, right: left + width, top: lb.y - CAP, bottom: lb.y };
}

/** Parses "−3/4", "2" or "0" back into a numerator and a positive denominator. */
function parseFraction(text: string): { n: number; d: number } {
  const m = text.match(/^(−?)(\d+)(?:\/(\d+))?$/u);
  assert.ok(m, `fraction text "${text}" must look like n, −n, n/d or −n/d`);
  const n = Number(m[2]) * (m[1] ? -1 : 1);
  const d = m[3] ? Number(m[3]) : 1;
  return { n, d };
}

/** Parses "3 : 1" into its two whole parts. */
function parseRatio(text: string): { left: number; right: number } {
  const m = text.match(/^(\d+) : (\d+)$/u);
  assert.ok(m, `ratio text "${text}" must look like "a : b"`);
  return { left: Number(m[1]), right: Number(m[2]) };
}

test("formatting helpers are exact", () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(-8, 12), 4);
  assert.equal(gcd(7, 0), 7);
  assert.equal(num(3), "3");
  assert.equal(num(0), "0");
  assert.equal(num(-4), "−4");
  assert.equal(num(0.5), "0.5");
  assert.equal(num(-0.25), "−0.25");
  assert.equal(num(2.75), "2.75");
  assert.equal(pointText({ x: -0.5, y: 1 }), "(−0.5, 1)");
  assert.equal(factorText(3), "3");
  assert.equal(factorText(-3), "(−3)");
  assert.equal(squareText(4), "4²");
  assert.equal(squareText(-3), "(−3)²");
  assert.equal(minusText(8, -4), "8 − (−4)");
  assert.equal(minusText(7, 1), "7 − 1");
  assert.equal(sumText([-6, 20, -64]), "−6 + 20 − 64");
  assert.equal(sumText([5]), "5");
  assert.equal(fractionText(0, 5), "0");
  assert.equal(fractionText(6, 8), "3/4");
  assert.equal(fractionText(-6, 8), "−3/4");
  assert.equal(fractionText(6, -8), "−3/4");
  assert.equal(fractionText(-6, -8), "3/4");
  assert.equal(fractionText(8, 4), "2");
  assert.equal(fractionText(3, 0), "undefined");
  assert.equal(ratioText(1, 4), "1 : 3");
  assert.equal(ratioText(2, 4), "1 : 1");
  assert.equal(ratioText(3, 4), "3 : 1");
  assert.equal(circleEquation({ x: -2, y: -2 }, 25), "(x + 2)² + (y + 2)² = 25");
  assert.equal(circleEquation({ x: 4, y: 7 }, 25), "(x − 4)² + (y − 7)² = 25");
  assert.equal(circleEquation({ x: 0, y: 3 }, 9), "x² + (y − 3)² = 9");
});

test("every reachable state keeps the four readouts true and the drawing inside the viewBox", () => {
  assert.equal(R, 7);
  assert.equal(CELL, 20);
  assert.equal(PAD, 20);
  assert.equal(SIZE, 320);
  assert.deepEqual(A, { x: -2, y: -2 });
  assert.deepEqual([BX_MIN, BX_MAX, BY_MIN, BY_MAX], [0, 2, -5, 1]);
  assert.deepEqual([DEN, PART_MIN, PART_MAX], [4, 1, 3]);
  assert.equal(sx(-R), PAD);
  assert.equal(sx(R), SIZE - PAD);
  assert.equal(sy(R), PAD);
  assert.equal(sy(-R), SIZE - PAD);

  let states = 0;
  for (let bx = BX_MIN; bx <= BX_MAX; bx += 1) {
    for (let by = BY_MIN; by <= BY_MAX; by += 1) {
      // Independent arithmetic: A is (−2, −2), so subtracting A adds 2 to each coordinate.
      const dx = bx + 2;
      const dy = by + 2;
      const d2 = dx * dx + dy * dy;
      const root = Math.sqrt(d2);
      const perfect = Number.isInteger(root);
      const s = segment(A, { x: bx, y: by });

      assert.ok(dx >= 2, "B always sits right of A, so the run is never zero and the slope always exists");
      assert.equal(s.dx, dx);
      assert.equal(s.dy, dy);
      assert.equal(s.d2, d2);
      assert.equal(s.d, root);
      assert.ok(d2 <= 25, `AB² is at most 25 so the circle of radius AB fits the grid (B = (${bx}, ${by}))`);
      assert.equal(s.exact, perfect);
      assert.equal(s.lengthText, perfect ? `√${d2} = ${root}` : `√${d2} ≈ ${root.toFixed(2)}`);
      assert.equal(s.lengthShort, perfect ? String(root) : `√${d2}`);
      assert.equal(s.legsText, `√(${dx}² + ${dy < 0 ? `(−${-dy})²` : `${dy}²`})`);

      // Slope is rise over run in lowest terms, checked by cross-multiplication.
      const slope = parseFraction(s.slope);
      assert.ok(slope.d > 0);
      assert.equal(slope.n * dx, dy * slope.d, `slope ${s.slope} must equal ${dy}/${dx}`);
      assert.equal(gcd(slope.n, slope.d), 1, `slope ${s.slope} must be reduced`);
      if (dy === 0) {
        assert.equal(s.slope, "0");
        assert.equal(s.perpSlope, "undefined");
      } else {
        const perp = parseFraction(s.perpSlope);
        assert.ok(perp.d > 0);
        // (dy/dx)(perp.n/perp.d) = −1  <=>  dy·perp.n = −dx·perp.d
        assert.equal(dy * perp.n, -dx * perp.d, `${s.slope} × ${s.perpSlope} must be −1`);
        assert.equal(gcd(perp.n, perp.d), 1);
      }

      // Circle centered at A through B; B really satisfies the printed equation.
      assert.equal(s.circle, `(x + 2)² + (y + 2)² = ${d2}`);
      assert.equal((bx - A.x) ** 2 + (by - A.y) ** 2, d2);

      for (let part = PART_MIN; part <= PART_MAX; part += 1) {
        states += 1;
        const p = partitionPoint(A, { x: bx, y: by }, part, DEN);
        // Quarters are exact in binary floating point, so these are exact equalities.
        assert.equal(4 * (p.x + 2), part * dx, `P.x for B = (${bx}, ${by}), part ${part}`);
        assert.equal(4 * (p.y + 2), part * dy);
        assert.equal((p.x - A.x) * dy, (p.y - A.y) * dx, "P is collinear with A and B");
        // AP : PB equals part : (DEN − part), checked on squared lengths.
        const ap2 = (p.x - A.x) ** 2 + (p.y - A.y) ** 2;
        const pb2 = (bx - p.x) ** 2 + (by - p.y) ** 2;
        assert.equal(ap2 * (DEN - part) ** 2, pb2 * part ** 2, "P divides AB in the stated ratio");
        const ratio = parseRatio(ratioText(part, DEN));
        assert.equal(ratio.left * (DEN - part), ratio.right * part);
        assert.equal(gcd(ratio.left, ratio.right), 1);
        if (part * 2 === DEN) {
          assert.equal(p.x, (A.x + bx) / 2, "part 2 of 4 is the midpoint");
          assert.equal(p.y, (A.y + by) / 2);
        }

        const L = layout(bx, by, part);
        assert.deepEqual(L.p, p);
        for (const [name, q] of Object.entries({ a: L.a, b: L.b, corner: L.corner, p: L.pp })) {
          assert.ok(q.x >= PAD && q.x <= SIZE - PAD, `${name}.x for B = (${bx}, ${by})`);
          assert.ok(q.y >= PAD && q.y <= SIZE - PAD, `${name}.y for B = (${bx}, ${by})`);
        }
        assert.equal(L.a.x, sx(-2));
        assert.equal(L.a.y, sy(-2));
        assert.equal(L.b.x, sx(bx));
        assert.equal(L.b.y, sy(by));
        assert.equal(L.corner.x, L.b.x);
        assert.equal(L.corner.y, L.a.y);
        assert.equal(L.pp.x, sx(p.x));
        assert.equal(L.pp.y, sy(p.y));
        // P is drawn on the segment: same parameter along both pixel axes.
        assert.equal(4 * (L.pp.x - L.a.x), part * (L.b.x - L.a.x));
        assert.equal(4 * (L.pp.y - L.a.y), part * (L.b.y - L.a.y));

        const stroke = 2;
        assert.equal(L.circle.cx, L.a.x);
        assert.equal(L.circle.cy, L.a.y);
        assert.equal(L.circle.r, root * CELL);
        assert.ok(L.circle.cx - L.circle.r - stroke >= 0, `circle left edge for B = (${bx}, ${by})`);
        assert.ok(L.circle.cx + L.circle.r + stroke <= SIZE, `circle right edge for B = (${bx}, ${by})`);
        assert.ok(L.circle.cy - L.circle.r - stroke >= 0, `circle top edge for B = (${bx}, ${by})`);
        assert.ok(L.circle.cy + L.circle.r + stroke <= SIZE, `circle bottom edge for B = (${bx}, ${by})`);

        if (L.mark) {
          assert.notEqual(dy, 0);
          assert.ok(L.mark.x >= 0 && L.mark.x + L.mark.size <= SIZE);
          assert.ok(L.mark.y >= 0 && L.mark.y + L.mark.size <= SIZE);
        } else {
          assert.equal(dy, 0, "the right-angle mark is dropped only when the legs are collinear");
        }

        assert.equal(L.labels.length, 5);
        const boxes = L.labels.map(labelBox);
        for (const box of boxes) {
          assert.ok(box.left >= 0, `label "${box.text}" runs past the left edge for B = (${bx}, ${by})`);
          assert.ok(box.right <= SIZE, `label "${box.text}" runs past the right edge for B = (${bx}, ${by})`);
          assert.ok(box.top >= 0 && box.bottom <= SIZE, `label "${box.text}" leaves the viewBox for B = (${bx}, ${by})`);
        }
        // The P label must not be printed on the segment it names: measure its four corners
        // against the line through A and B, and reject a box that straddles or grazes it.
        const vx = L.b.x - L.a.x, vy = L.b.y - L.a.y, span = Math.sqrt(vx * vx + vy * vy);
        const sides = [[boxes[4].left, boxes[4].top], [boxes[4].right, boxes[4].top], [boxes[4].left, boxes[4].bottom], [boxes[4].right, boxes[4].bottom]]
          .map(([cx, cy]) => ((cx - L.a.x) * vy - (cy - L.a.y) * vx) / span);
        const straddles = Math.min(...sides) < 0 && Math.max(...sides) > 0;
        const clearance = straddles ? 0 : Math.min(...sides.map(Math.abs));
        assert.ok(clearance >= 4, `the P label is ${clearance.toFixed(2)} px from AB for B = (${bx}, ${by}), part ${part}`);

        // No two labels may share pixels: overlap in x AND in y is a collision.
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            const overX = Math.min(boxes[i].right, boxes[j].right) - Math.max(boxes[i].left, boxes[j].left);
            const overY = Math.min(boxes[i].bottom, boxes[j].bottom) - Math.max(boxes[i].top, boxes[j].top);
            assert.ok(
              overX <= 0 || overY <= 0,
              `labels "${boxes[i].text}" and "${boxes[j].text}" overlap by ${overX} x ${overY} px for B = (${bx}, ${by}), part ${part}`
            );
          }
        }
        assert.equal(L.labels[0].text, "A (−2, −2)");
        assert.equal(L.labels[1].text, `B (${show(bx)}, ${show(by)})`);
        assert.equal(L.labels[2].text, `run ${show(dx)}`);
        assert.equal(L.labels[3].text, `rise ${show(dy)}`);
        assert.equal(L.labels[4].text, "P");

        const label = figureLabel(bx, by, part);
        assert.ok(label.includes(`B at (${show(bx)}, ${show(by)})`));
        assert.ok(label.includes(`The run is ${show(dx)} and the rise is ${show(dy)}`));
        assert.ok(label.includes(`slope ${s.slope} and length ${s.lengthText}`));
        assert.ok(label.includes(`Point P at ${fractionText(part, DEN)} of the way from A to B is (${show(p.x)}, ${show(p.y)})`));
      }
    }
  }
  assert.equal(states, 3 * 7 * 3);
});

test("every sentence the student reads is rebuilt from the controls and true in every state", () => {
  let flat = 0, sloped = 0;
  for (let bx = BX_MIN; bx <= BX_MAX; bx += 1) {
    for (let by = BY_MIN; by <= BY_MAX; by += 1) {
      for (let part = PART_MIN; part <= PART_MAX; part += 1) {
        // Independent arithmetic from the raw control values: A is (−2, −2).
        const dx = bx + 2, dy = by + 2, d2 = dx * dx + dy * dy;
        const px = -2 + (part * dx) / 4, py = -2 + (part * dy) / 4;
        const t = QUARTER[part], squares = `${sq(dx)} + ${sq(dy)} = ${d2}`;
        const cards = cardTexts(bx, by, part);
        const check = mathCheckText(bx, by, part);
        const caption = figureCaption(bx, by);

        assert.equal(cards.length, 4);
        assert.deepEqual(cards[0], {
          title: "Slope of AB",
          big: frac(dy, dx),
          small: `rise ÷ run = ${show(dy)} ÷ ${show(dx)}`,
          faint: dy === 0
            ? "AB is horizontal, so a perpendicular line is vertical and has no slope"
            : `a perpendicular line has slope ${frac(-dx, dy)}`,
        });
        assert.deepEqual(cards[1], {
          title: "Length of AB",
          big: lengthPhrase(d2),
          small: `√(${sq(dx)} + ${sq(dy)})`,
          faint: dy === 0 ? "a flat segment, so the length is the run itself" : "the Pythagorean theorem on the two dashed legs",
        });
        assert.deepEqual(cards[2], {
          title: "Point P",
          big: `(${show(px)}, ${show(py)})`,
          small: `(−2 + ${t}·${fac(dx)}, −2 + ${t}·${fac(dy)})`,
          faint: `AP : PB = ${SPLIT_RATIO[part]}${part === 2 ? ", the midpoint" : ""}`,
        });
        assert.deepEqual(cards[3], {
          title: "Circle through B centered at A",
          big: `(x + 2)² + (y + 2)² = ${d2}`,
          small: `B fits: ${squares}`,
          faint: `every point exactly ${shortLength(d2)} from A`,
        });

        assert.equal(caption, dy === 0
          ? `The rise is ${show(dy)}, so AB lies flat along the dashed run leg and its length is that run of ${show(dx)}. P slides along AB, and the dashed circle collects every point exactly as far from A as B is.`
          : `The dashed legs are the run ${show(dx)} and the rise ${show(dy)}, and AB is their hypotenuse. P slides along AB, and the dashed circle collects every point exactly as far from A as B is.`);

        const legs = dy === 0
          ? `AB lies flat along a grid line, so the second leg has no length and AB is the run itself; the distance formula still agrees, because AB² = ${squares}, so AB = ${lengthPhrase(d2)}`
          : `Those dashed legs meet at a right angle, so AB is their hypotenuse: AB² = ${squares}, giving AB = ${lengthPhrase(d2)}`;
        const perp = dy === 0
          ? ", and a line perpendicular to this horizontal segment is vertical, so it has no slope"
          : `, while a perpendicular line has slope ${frac(-dx, dy)}; whenever both slopes exist their product is −1`;
        assert.deepEqual(check, {
          distance: `For A(−2, −2) and B(${show(bx)}, ${show(by)}) the run is ${show(dx)} and the rise is ${show(dy)}. ${legs}. Distance in coordinates is the Pythagorean theorem in disguise, and chaining such lengths around a polygon gives its perimeter, while the shoelace formula gives its area.`,
          slope: `Reading the same legs as a ratio gives the slope ${show(dy)} ÷ ${show(dx)} = ${frac(dy, dx)}${perp} — the criterion that lets algebra prove a figure has parallel sides or square corners.`,
          partition: `Point P is A + ${t}(B − A), so each coordinate of (${show(px)}, ${show(py)}) is a weighted average of the endpoints, and P divides AB in the ratio ${SPLIT_RATIO[part]}.`,
          circle: `Asking which points sit exactly ${shortLength(d2)} from A is the distance formula set equal to a constant; squaring both sides clears the root and leaves (x + 2)² + (y + 2)² = ${d2}, the boundary of the region within ${shortLength(d2)} of A, with B on it because ${squares}.`,
        });

        // The right-angle reading is legitimate exactly when both legs have length. The legs are
        // A → corner = (dx, 0) and corner → B = (0, dy); their dot product dx·0 + 0·dy is always 0,
        // so they are perpendicular, but a leg of length 0 leaves no triangle and no hypotenuse.
        const rendered = [caption, figureLabel(bx, by, part), ...cards.flatMap((c) => [c.big, c.small, c.faint]), ...Object.values(check)];
        assert.equal(dx * 0 + 0 * dy, 0, "the run leg and the rise leg are always perpendicular");
        if (dy === 0) {
          flat += 1;
          assert.equal(Math.sqrt(d2), dx, "with no rise, AB is exactly its run");
          for (const text of rendered) {
            assert.doesNotMatch(text, /right angle|hypotenuse/u, `flat AB at B = (${bx}, ${by}) has one leg, so "${text}" may not claim a right triangle`);
          }
          assert.ok(check.distance.includes("the second leg has no length and AB is the run itself"));
          assert.ok(cards[1].faint.includes("the length is the run itself"));
        } else {
          sloped += 1;
          assert.ok(dx !== 0 && dy !== 0, "both legs have length, so the right angle at the corner is real");
          assert.equal(dx * dx + dy * dy, d2, "and Pythagoras on those legs gives AB²");
          assert.match(check.distance, /meet at a right angle, so AB is their hypotenuse/u);
          assert.match(cards[1].faint, /Pythagorean theorem on the two dashed legs/u);
        }
      }
    }
  }
  assert.equal(flat, 3 * 3, "by = −2 flattens AB at every bx and every partition step");
  assert.equal(sloped, 3 * 7 * 3 - 3 * 3);
});

test("worked example values are recomputed independently", () => {
  assert.deepEqual(EX_A, { x: -2, y: -1 });
  assert.deepEqual(EX_B, { x: 4, y: 7 });
  assert.deepEqual(EX_C, { x: 8, y: 4 });
  const w = workedExample();

  // AB: run 4 − (−2) = 6, rise 7 − (−1) = 8, so AB = √(36 + 64) = √100 = 10 and the slope is 8/6 = 4/3.
  assert.equal(w.ab.dx, 6);
  assert.equal(w.ab.dy, 8);
  assert.equal(6 * 6 + 8 * 8, 100);
  assert.equal(w.ab.d2, 100);
  assert.equal(w.ab.d, 10);
  assert.equal(w.ab.lengthText, "√100 = 10");
  assert.equal(w.ab.slope, "4/3");
  // BC: run 8 − 4 = 4, rise 4 − 7 = −3, so BC = √(16 + 9) = √25 = 5 and the slope is −3/4.
  assert.equal(w.bc.dx, 4);
  assert.equal(w.bc.dy, -3);
  assert.equal(4 * 4 + (-3) * (-3), 25);
  assert.equal(w.bc.d2, 25);
  assert.equal(w.bc.d, 5);
  assert.equal(w.bc.lengthText, "√25 = 5");
  assert.equal(w.bc.slope, "−3/4");
  // (4/3) × (−3/4) = −12/12 = −1, so the corner at B is a right angle.
  assert.equal((4 * -3) / (3 * 4), -1);
  assert.equal(w.ab.perpSlope, w.bc.slope);
  // CA: run −2 − 8 = −10, rise −1 − 4 = −5, so CA = √(100 + 25) = √125 ≈ 11.18.
  assert.equal(w.ca.dx, -10);
  assert.equal(w.ca.dy, -5);
  assert.equal(w.ca.d2, 125);
  assert.equal(w.ca.exact, false);
  assert.equal(w.ca.lengthText, `√125 ≈ ${Math.sqrt(125).toFixed(2)}`);
  assert.equal(Math.sqrt(125).toFixed(2), "11.18");
  // Perimeter 10 + 5 + √125 ≈ 26.18.
  assert.equal(w.perimeter, 15 + Math.sqrt(125));
  assert.equal(w.perimeterText, "26.18");
  assert.equal((15 + Math.sqrt(125)).toFixed(2), "26.18");
  // Area from the legs: ½ × 10 × 5 = 25.
  assert.equal(w.legArea, 25);
  assert.equal((10 * 5) / 2, 25);
  // Shoelace: ½|(−2)(7 − 4) + 4(4 − (−1)) + 8((−1) − 7)| = ½|−6 + 20 − 64| = ½ × 50 = 25.
  assert.deepEqual(w.terms, [-6, 20, -64]);
  assert.deepEqual(shoelaceTerms(EX_A, EX_B, EX_C), [-2 * 3, 4 * 5, 8 * -8]);
  assert.equal(w.shoelaceSum, -50);
  assert.equal(Math.abs(-6 + 20 - 64) / 2, 25);
  assert.equal(w.area, 25);
  assert.equal(w.area, w.legArea, "the shoelace formula agrees with the leg formula");
  assert.equal(sumText(w.terms), "−6 + 20 − 64");
  // Quarter point: (−2 + ¼·6, −1 + ¼·8) = (−0.5, 1); it splits AB as 1 : 3.
  assert.deepEqual(w.quarter, { x: -0.5, y: 1 });
  assert.equal(-2 + 6 / 4, -0.5);
  assert.equal(-1 + 8 / 4, 1);
  assert.equal(pointText(w.quarter), "(−0.5, 1)");
  // Sprinkler circle centered at B(4, 7) through C(8, 4): r² = BC² = 25.
  assert.equal(w.circle, "(x − 4)² + (y − 7)² = 25");
  assert.equal((8 - 4) ** 2 + (4 - 7) ** 2, 25);
});

test("the Try it answer is the point one third of the way from K to L", () => {
  assert.deepEqual(TRY_K, { x: -4, y: 2 });
  assert.deepEqual(TRY_L, { x: 8, y: 8 });
  // Change from K to L: (8 − (−4), 8 − 2) = (12, 6); a third of it is (4, 2); K + (4, 2) = (0, 4).
  assert.equal(8 - -4, 12);
  assert.equal(8 - 2, 6);
  assert.deepEqual({ x: -4 + 12 / 3, y: 2 + 6 / 3 }, { x: 0, y: 4 });

  const choices = tryChoices();
  const answer = tryAnswerIndex();
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices.map((c) => pointText(c.point))).size, 4, "choices are distinct");
  assert.equal(answer, 2);
  assert.deepEqual(choices[answer].point, { x: 0, y: 4 });
  assert.equal(choices[answer].why, "correct");
  assert.equal(choices.filter((c) => c.why === "correct").length, 1);
  // The winner splits KL as 1 : 2; no other choice does.
  for (const [i, c] of choices.entries()) {
    const kp2 = (c.point.x + 4) ** 2 + (c.point.y - 2) ** 2;
    const pl2 = (8 - c.point.x) ** 2 + (8 - c.point.y) ** 2;
    const onLine = (c.point.x + 4) * 6 === (c.point.y - 2) * 12;
    const splitsOneToTwo = onLine && kp2 * 4 === pl2;
    assert.equal(splitsOneToTwo, i === answer, `choice ${pointText(c.point)} splits KL as 1 : 2 only if it is the answer`);
  }
  assert.deepEqual(choices[0].point, { x: 2, y: 5 }, "the midpoint distractor");
  assert.deepEqual(choices[1].point, { x: 4, y: 2 }, "the change-only distractor");
  assert.deepEqual(choices[3].point, { x: 4, y: 6 }, "the two-thirds distractor");
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/gu)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["G-GPE.1", "G-GPE.4", "G-GPE.5", "G-GPE.6", "G-GPE.7"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  // Next step, Start over, the mapped Try-it choice, and the stepper's decrease/increase pair.
  assert.equal(buttonTags.length, 5);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  // Inline control bounds match the constants the grid above enumerated.
  assert.match(source, /label="B x-coordinate" value=\{bx\} min=\{0\} max=\{2\}/u);
  assert.match(source, /label="B y-coordinate" value=\{by\} min=\{-5\} max=\{1\}/u);
  assert.match(source, /label="P: quarters from A" value=\{part\} min=\{1\} max=\{3\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  // The caption and the Math check are computed from the controls, never fixed prose.
  assert.match(source, /caption=\{figureCaption\(bx, by\)\}/u);
  assert.doesNotMatch(source, /caption="/u, "a literal caption cannot stay true in every state");
  assert.match(source, /const check = mathCheckText\(bx, by, part\)/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
});
