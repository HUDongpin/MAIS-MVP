import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CELL,
  describe as describeDistance,
  figureLabel,
  floorSqrt,
  GX,
  GY0,
  H,
  LADDER,
  labelSpots,
  ladderExample,
  ladderSteps,
  legs,
  markerLabelX,
  N,
  NL_L,
  NL_MAX,
  NL_R,
  NL_Y,
  nx,
  plural,
  readoutText,
  root,
  sx,
  sy,
  TICK_Y,
  TRY_P,
  TRY_Q,
  tryOptions,
  W,
  walkSentence,
  type Point
} from "./ca-g8-ch04-pythagorean-reasoning-coordinate-geometry";

const SLUG = "ca-g8-ch04-pythagorean-reasoning-coordinate-geometry";
const BRIEF_STANDARDS = ["8.EE.A.1", "8.EE.A.2", "8.EE.A.3", "8.EE.A.4", "8.G.B.6", "8.G.B.7", "8.G.B.8", "8.G.C.9"];
const CITED_BY_THIS_LESSON = ["8.G.B.7", "8.G.B.8", "8.EE.A.2"];
const source = readFileSync(path.join(process.cwd(), `components/lesson/ccss/lessons/${SLUG}.tsx`), "utf8");
const EPS = 1e-9;

/** Brute-force integer square root, written out rather than imported. */
function isqrtByHand(n: number) {
  let f = 0;
  while ((f + 1) * (f + 1) <= n) f += 1;
  return f;
}

/**
 * sqrt(n) rounded to two decimals with integer arithmetic only — no Math.sqrt, no toFixed,
 * so the lesson's decimal is compared against a number this file worked out on its own.
 * k = floor(100 * sqrt(n)) satisfies k^2 <= 10000n < (k+1)^2; the root is at least k + 0.5
 * exactly when 4 * 10000n >= (2k + 1)^2, which decides the rounding without leaving the integers.
 */
const decimalMemo = new Map<number, string>();
function sqrtToTwoDecimals(n: number) {
  const cached = decimalMemo.get(n);
  if (cached !== undefined) return cached;
  const k = isqrtByHand(n * 10000);
  const hundredths = (2 * k + 1) * (2 * k + 1) <= 4 * 10000 * n ? k + 1 : k;
  const text = `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
  decimalMemo.set(n, text);
  return text;
}

/**
 * A glyph box for one run of text, measured with this file's own advance-width guess (0.66 em,
 * deliberately different from the 0.7 em the lesson clamps with) plus generous ascender/descender.
 */
const TEST_EM = 0.66;
type Box = { left: number; right: number; top: number; bottom: number };
function textBox(x: number, y: number, chars: number, fontSize: number, anchor: "start" | "middle" | "end"): Box {
  const w = chars * fontSize * TEST_EM;
  const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
  return { left, right: left + w, top: y - fontSize * 0.78, bottom: y + fontSize * 0.25 };
}
function overlaps(u: Box, v: Box) {
  return u.left < v.right && v.left < u.right && u.top < v.bottom && v.top < u.bottom;
}
/** Where the grid draws its axis numbers, read straight off the JSX. */
function yAxisTickBox(i: number) { return textBox(GX - 10, sy(i) + 3.5, 1, 9, "end"); }
function xAxisTickBox(i: number) { return textBox(sx(i), TICK_Y, 1, 9, "middle"); }

test("the drawing frame and the declared controls are what the lesson says they are", () => {
  assert.equal(N, 8);
  assert.equal(CELL, 32);
  assert.equal(W, 360);
  assert.equal(H, 390);
  // the grid fits inside the frame with room for the axis numbers on either side
  assert.equal(sx(0), GX);
  assert.equal(sx(N), GX + N * CELL);
  assert.ok(sx(N) < W - 20);
  assert.equal(sy(0), GY0);
  assert.equal(sy(N), GY0 - N * CELL);
  assert.ok(sy(N) > 12);
  assert.ok(TICK_Y < NL_Y - 20 && NL_Y + 17 < H);
  // the number line is long enough for every distance this grid can produce
  assert.ok(Math.sqrt(2) * N < NL_MAX);
  assert.equal(nx(0), NL_L);
  assert.equal(nx(NL_MAX), NL_R);
  // all four steppers declare their bounds inline
  for (const name of ["x₁", "y₁", "x₂", "y₂"]) {
    assert.match(source, new RegExp(`<Stepper label="${name}" value=\\{\\w+\\} min=\\{0\\} max=\\{N\\}`, "u"), `${name} needs an inline min and max`);
  }
  assert.match(source, /const \[x1, setX1\] = useState\(1\), \[y1, setY1\] = useState\(2\);/u);
  assert.match(source, /const \[x2, setX2\] = useState\(5\), \[y2, setY2\] = useState\(5\);/u);
  // the seed state is the 3-4-5 triple: a = |5 - 1| = 4, b = |5 - 2| = 3, c = 5
  assert.equal(root(4 * 4 + 3 * 3).value, 5);
  assert.equal(root(25).perfect, true);
});

test("plural agreement and the integer square root are exact", () => {
  assert.equal(plural(1, "unit"), "unit");
  assert.equal(plural(0, "unit"), "units");
  assert.equal(plural(2, "unit"), "units");
  for (let n = 0; n <= 200; n += 1) {
    const f = floorSqrt(n);
    assert.equal(f, isqrtByHand(n), `floorSqrt(${n})`);
    assert.ok(f * f <= n && (f + 1) * (f + 1) > n, `${f} must bracket ${n}`);
  }
  // the four perfect squares the figure can reach that are not leg-aligned
  assert.equal(root(25).text, "5");
  assert.equal(root(25).relation, "=");
  assert.equal(root(2).relation, "≈");
  assert.equal(root(2).text, "1.41");
  assert.equal(root(0).value, 0);
  assert.equal(root(0).perfect, true);
});

test("every reachable state of the figure is mathematically and visually honest", () => {
  let states = 0;
  const seen = { same: 0, aligned: 0, triple: 0, irrational: 0 };
  let maxRoot = 0;

  for (let x1 = 0; x1 <= N; x1 += 1) {
    for (let y1 = 0; y1 <= N; y1 += 1) {
      for (let x2 = 0; x2 <= N; x2 += 1) {
        for (let y2 = 0; y2 <= N; y2 += 1) {
          states += 1;
          const p: Point = { x: x1, y: y1 }, q: Point = { x: x2, y: y2 };

          // --- 1. the legs are the coordinate differences ---------------------
          const a = x2 >= x1 ? x2 - x1 : x1 - x2;
          const b = y2 >= y1 ? y2 - y1 : y1 - y2;
          assert.deepEqual(legs(p, q), { a, b });

          // --- 2. c is the positive solution of c² = a² + b² ------------------
          const s = a * a + b * b;
          const f = isqrtByHand(s);
          const decimal = sqrtToTwoDecimals(s);   // worked out with integers, never with toFixed
          const r = root(s);
          assert.equal(r.floor, f);
          assert.equal(r.ceil, f + 1);
          assert.equal(r.perfect, f * f === s);
          assert.ok(Math.abs(r.value * r.value - s) < EPS, `c² must equal ${s}`);
          if (r.perfect) {
            assert.equal(r.value, f);
            assert.equal(r.value * r.value, s); // exact, not approximate
            assert.equal(r.text, `${f}`);
            assert.equal(r.relation, "=");
          } else {
            assert.ok(r.value > f && r.value < f + 1, `√${s} must sit strictly between ${f} and ${f + 1}`);
            assert.equal(r.text, decimal, `√${s} must be shown as ${decimal}`);
            assert.equal(r.relation, "≈");
            seen.irrational += 1;
          }
          maxRoot = Math.max(maxRoot, r.value);

          // --- 3. the distance obeys the triangle inequality -------------------
          if (a > 0 && b > 0) {
            assert.ok(r.value < a + b, "the straight line must be shorter than going around the corner");
            assert.ok(r.value > Math.max(a, b), "the hypotenuse must be longer than either leg");
            if (r.perfect) { seen.triple += 1; assert.equal(a * a + b * b, f * f); }
          } else {
            assert.equal(r.value, Math.max(a, b));
            if (s === 0) seen.same += 1; else seen.aligned += 1;
          }

          // --- 4. nothing drawn leaves the viewBox -----------------------------
          const spot = labelSpots(p, q);
          for (const px of [sx(x1), sx(x2)]) assert.ok(px >= 0 && px <= W);
          for (const py of [sy(y1), sy(y2)]) assert.ok(py >= 0 && py <= H);
          for (const [cx, cy] of [[sx(x1), sy(y1)], [sx(x2), sy(y2)]]) {
            assert.ok(cx - 7 >= 0 && cx + 7 <= W, "the point marker must stay in frame");
            assert.ok(cy - 7 >= 0 && cy + 7 <= H, "the point marker must stay in frame");
          }
          if (spot.run) {
            assert.equal(spot.run.x, (sx(x1) + sx(x2)) / 2);
            assert.ok(spot.run.x >= GX && spot.run.x <= sx(N));
            assert.ok(spot.run.y >= 12 && spot.run.y <= TICK_Y - 8, "the run label must not collide with the axis numbers");
            const runBox = textBox(spot.run.x, spot.run.y, `${a}`.length, 11, "middle");
            assert.ok(runBox.left >= 0 && runBox.right <= W, "the run label must stay in frame");
            for (let i = 0; i <= N; i += 1) {
              assert.ok(!overlaps(runBox, xAxisTickBox(i)), `the horizontal-leg label ${a} lands on the x-axis number ${i} at P(${x1}, ${y1}) Q(${x2}, ${y2})`);
              assert.ok(!overlaps(runBox, yAxisTickBox(i)), `the horizontal-leg label ${a} lands on the y-axis number ${i} at P(${x1}, ${y1}) Q(${x2}, ${y2})`);
            }
          } else {
            assert.equal(a, 0);
          }
          if (spot.rise) {
            assert.ok(spot.rise.x >= 12 && spot.rise.x <= W - 12);
            assert.ok(spot.rise.y >= 12 && spot.rise.y <= GY0 + 8);
            // the label sits on the side of the vertical leg that faces away from the triangle,
            // unless that side is the strip the y-axis numbers occupy, where it must turn inward
            if (x2 > x1) assert.equal(spot.rise.anchor, "start", "the triangle is left of the leg");
            else if (x2 < x1 && x2 > 0) assert.equal(spot.rise.anchor, "end", "the triangle is right of the leg");
            else assert.equal(spot.rise.anchor, "start", "against the y-axis the inside is the only clear side");
            const riseBox = textBox(spot.rise.x, spot.rise.y, `${b}`.length, 11, spot.rise.anchor);
            assert.ok(riseBox.left >= 0 && riseBox.right <= W, "the leg label must stay in frame");
            for (let i = 0; i <= N; i += 1) {
              assert.ok(!overlaps(riseBox, yAxisTickBox(i)), `the vertical-leg label ${b} lands on the y-axis number ${i} at P(${x1}, ${y1}) Q(${x2}, ${y2})`);
              assert.ok(!overlaps(riseBox, xAxisTickBox(i)), `the vertical-leg label ${b} lands on the x-axis number ${i} at P(${x1}, ${y1}) Q(${x2}, ${y2})`);
            }
          } else {
            assert.equal(b, 0);
          }
          if (spot.corner) {
            assert.ok(a > 0 && b > 0);
            assert.ok(spot.corner.x >= 0 && spot.corner.x + 9 <= W);
            assert.ok(spot.corner.y >= 0 && spot.corner.y + 9 <= H);
            // the right-angle tick sits inside the triangle, at the corner (x2, y1)
            assert.ok(spot.corner.x >= Math.min(sx(x1), sx(x2)) && spot.corner.x + 9 <= Math.max(sx(x1), sx(x2)) + 9);
            assert.ok(spot.corner.y >= Math.min(sy(y1), sy(y2)) - 9 && spot.corner.y + 9 <= Math.max(sy(y1), sy(y2)) + 9);
          } else {
            assert.ok(a === 0 || b === 0);
          }
          // the number line: marker, shaded bracket and label all inside the frame
          assert.ok(nx(r.value) >= NL_L - EPS && nx(r.value) <= NL_R + EPS);
          assert.ok(nx(r.value) - 5 >= 0 && nx(r.value) + 5 <= W);
          assert.ok(nx(r.floor) >= NL_L - EPS && nx(r.ceil) <= NL_R + EPS, "the bracket band must stay on the number line");
          assert.ok(nx(r.floor) <= nx(r.value) && nx(r.value) <= nx(r.ceil));
          // the readout string, rebuilt here from the independently computed root
          const readout = `c = √${s} ${f * f === s ? "=" : "≈"} ${f * f === s ? `${f}` : decimal}`;
          assert.equal(readoutText(s), readout, `the readout for √${s}`);
          const readoutX = markerLabelX(r.value, readout);
          const readoutBox = textBox(readoutX, NL_Y - 19, readout.length, 11, "middle");
          assert.ok(readoutBox.left >= 0 && readoutBox.right <= W, `"${readout}" runs off the frame: ${readoutBox.left} to ${readoutBox.right}`);
          for (let i = 0; i <= N; i += 1) assert.ok(!overlaps(readoutBox, xAxisTickBox(i)), "the readout must clear the grid's own numbers");
          assert.ok(Math.abs(readoutX - nx(r.value)) < 12, "the readout must stay over the marker it labels");
          assert.ok(NL_Y - 19 > TICK_Y && NL_Y + 17 <= H);

          // --- 5. every sentence built from state is true ----------------------
          const label = figureLabel(p, q);
          assert.ok(label.startsWith(`Coordinate grid from 0 to ${N} on both axes. P is at (${x1}, ${y1}) and Q is at (${x2}, ${y2}). `));
          assert.ok(label.endsWith(`marks that distance, the square root of ${s}.`));
          if (s === 0) {
            assert.ok(label.includes("P and Q are the same point, so the distance from P to Q is 0."));
          } else if (a === 0 || b === 0) {
            assert.ok(r.perfect, "a grid-aligned distance is always a whole number");
            assert.ok(label.includes(`P and Q lie on one grid line, so the distance from P to Q is ${f}.`));
          } else {
            const shown = r.perfect ? `${f}` : `about ${decimal}`;
            assert.ok(label.includes(`horizontal leg of ${a} and a vertical leg of ${b}, so the distance from P to Q is ${shown}.`));
          }

          const said = describeDistance(a, b);
          if (s === 0) {
            assert.equal(said, "P and Q are the same point, so the distance between them is 0.");
          } else if (a === 0) {
            assert.equal(said, `P and Q sit in the same column, so the distance is just the vertical gap: ${b} ${b === 1 ? "unit" : "units"}.`);
          } else if (b === 0) {
            assert.equal(said, `P and Q sit in the same row, so the distance is just the horizontal gap: ${a} ${a === 1 ? "unit" : "units"}.`);
          } else if (r.perfect) {
            assert.ok(said.includes(`${s} is a perfect square, since ${f} × ${f} = ${s}`));
            assert.ok(said.includes(`${Math.min(a, b)}, ${Math.max(a, b)}, ${f} is a Pythagorean triple`));
            assert.equal(Math.min(a, b) ** 2 + Math.max(a, b) ** 2, f * f);
          } else {
            assert.ok(said.includes(`${f}² = ${f * f} and ${f + 1}² = ${(f + 1) * (f + 1)}`));
            assert.ok(said.includes(`between ${f} and ${f + 1}, at about ${decimal}`));
            assert.ok(said.includes("irrational"));
          }

          const walk = walkSentence(a, b);
          if (a === 0 || b === 0) {
            assert.equal(walk, null, "there is no corner to cut when the points share a row or a column");
          } else {
            assert.ok(walk !== null);
            assert.ok(walk.includes(`${a} + ${b} = ${a + b} units`));
            assert.ok(walk.includes(r.perfect ? `line is ${f},` : `line is about ${decimal},`));
          }

          for (const sentence of [label, said, walk ?? ""]) {
            assert.doesNotMatch(sentence, /\b1 (?:units|blocks|points|squares|legs)\b/u, "a value of 1 must not take a plural noun");
          }
        }
      }
    }
  }

  assert.equal(states, (N + 1) ** 4);
  assert.equal(seen.same, (N + 1) ** 2); // the 81 placements where P and Q coincide
  assert.ok(seen.aligned > 0 && seen.triple > 0 && seen.irrational > 0);
  // the longest distance is the full diagonal, and it fits on a 0-to-12 line
  assert.ok(Math.abs(maxRoot - Math.sqrt(2 * N * N)) < EPS);
  assert.ok(maxRoot < NL_MAX);
});

test("the worked example is arithmetically correct, step by step", () => {
  assert.equal(LADDER.hypotenuse, 25);
  assert.equal(LADDER.base, 7);
  const e = ladderExample();
  // recomputed by hand: 25 x 25 = 625, 7 x 7 = 49, 625 - 49 = 576, 24 x 24 = 576
  assert.equal(e.c2, 625);
  assert.equal(e.base2, 49);
  assert.equal(e.height2, 576);
  assert.equal(625 - 49, 576);
  assert.equal(e.height, 24);
  assert.equal(24 * 24, 576);
  assert.equal(e.check, 625);
  assert.equal(49 + 576, 625);
  assert.ok(Number.isInteger(e.height));
  assert.ok(e.height < LADDER.hypotenuse, "a leg is always shorter than the hypotenuse");
  assert.ok(e.height > LADDER.base);
  // 7, 24, 25 really is a right triangle
  assert.equal(LADDER.base ** 2 + e.height ** 2, LADDER.hypotenuse ** 2);

  const steps = ladderSteps();
  assert.equal(steps.length, 5);
  assert.equal(steps[0].math, "7² + h² = 25²");
  assert.equal(steps[1].math, "49 + h² = 625");
  assert.equal(steps[2].math, "h² = 625 − 49 = 576");
  assert.equal(steps[3].math, "h = √576 = 24 ft");
  assert.equal(steps[4].math, "7² + 24² = 49 + 576 = 625");
  assert.equal(new Set(steps.map((st) => st.title)).size, 5, "step titles are React keys, so they must be unique");
  for (const st of steps) assert.ok(st.note.length > 30, `${st.title} needs an explanation`);
});

test("the Try it answer is the mathematically correct one", () => {
  assert.deepEqual(TRY_P, { x: 1, y: 2 });
  assert.deepEqual(TRY_Q, { x: 9, y: 17 });
  const t = tryOptions();
  // recomputed by hand: run 9 - 1 = 8, rise 17 - 2 = 15, 64 + 225 = 289, 17 x 17 = 289
  assert.equal(t.run, 8);
  assert.equal(t.rise, 15);
  assert.equal(8 * 8, 64);
  assert.equal(15 * 15, 225);
  assert.equal(t.sum, 289);
  assert.equal(64 + 225, 289);
  assert.equal(t.answer, 17);
  assert.equal(17 * 17, 289);

  assert.equal(t.options.length, 4);
  assert.equal(t.correct, 1);
  assert.equal(t.options[t.correct].value, 17);
  assert.equal(t.options[t.correct].label, "17");
  assert.equal(t.options.filter((o) => o.value === t.answer).length, 1, "exactly one option is right");
  // the three distractors are the three classic wrong turns, and none of them is 17
  assert.deepEqual(t.options.map((o) => o.label), ["7", "17", "23", "about 12.69"]);
  assert.equal(t.options[0].value, 15 - 8);
  assert.equal(t.options[2].value, 8 + 15);
  assert.ok(Math.abs(t.options[3].value - Math.sqrt(225 - 64)) < EPS);
  // 12.69 checked by hand: 1268² = 1607824 ≤ 1610000 < 1610361 = 1269², so 100√161 sits between
  // 1268 and 1269, and 2537² = 6436369 ≤ 6440000 = 4 × 1610000 puts it past the halfway mark
  assert.equal(sqrtToTwoDecimals(161), "12.69");
  assert.equal(t.options[3].label, `about ${sqrtToTwoDecimals(161)}`);
  assert.equal(new Set(t.options.map((o) => o.label)).size, 4, "option labels are distinct");
  for (const o of t.options) assert.ok(o.why.length > 40, "each option needs a one-sentence explanation");
});

test("the lesson source obeys the house rules", () => {
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...new Set(
    [...source.matchAll(/\b((?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/gu)].map((m) => m[1])
  )].sort();
  assert.ok(cited.length > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  assert.deepEqual(cited, [...CITED_BY_THIS_LESSON].sort());
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of CITED_BY_THIS_LESSON) assert.ok(mathCheck.includes(`(${id})`), `the Math check must cite ${id}`);

  const svgs = [...source.matchAll(/<svg\b[^>]*>/gu)].map((m) => m[0]);
  assert.equal(svgs.length, 1);
  for (const tag of svgs) {
    assert.match(tag, /viewBox=/u);
    assert.match(tag, /role="img"/u);
    assert.match(tag, /aria-label=\{figureLabel\(p, q\)\}/u);
  }

  const buttons = [...source.matchAll(/<button\b[^>]*>/gu)].map((m) => m[0]);
  assert.equal(buttons.length, 5); // two stepper arrows, next step, start over, the mapped Try it choice
  for (const tag of buttons) assert.match(tag, /type="button"/u);

  assert.doesNotMatch(source, /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/u, "no CJK characters");
  for (const forbidden of ["Math.random", "fetch(", "localStorage", "sessionStorage", "<form", "dangerouslySetInnerHTML", "next/image", "<img"]) {
    assert.ok(!source.includes(forbidden), `${forbidden} is forbidden`);
  }
  for (const internal of ["Codex", "S18", "QA", "candidate", "us-ca-math", "topicId"]) {
    assert.ok(!source.includes(internal), `internal identifier ${internal} must not appear`);
  }

  // accessible state on every control that shows a choice or opens a panel
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{pick === i\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.match(source, /disabled=\{value <= min\}/u);
  assert.match(source, /disabled=\{value >= max\}/u);
  assert.match(source, /onChange\(Math\.max\(min, value - 1\)\)/u);
  assert.match(source, /onChange\(Math\.min\(max, value \+ 1\)\)/u);

  // the roadmap names every other lesson in the chapter, and re-teaches none of them
  for (const title of ["Exponent Rules", "Square &amp; Cube Roots", "Scientific Notation", "The Pythagorean Theorem", "Distance Between Points", "Volume of Round Solids"]) {
    assert.ok(source.includes(`<strong>${title}</strong>`), `the roadmap must name ${title}`);
  }
  assert.ok(!/bg-linear-|inset-shadow-|text-shadow-|field-sizing-|not-\[/u.test(source), "Tailwind 4 only syntax");
});
