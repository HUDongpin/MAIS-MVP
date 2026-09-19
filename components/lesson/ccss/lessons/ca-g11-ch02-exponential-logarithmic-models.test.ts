import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  CAP,
  CONTROLS,
  CURVE_STEPS,
  EXAMPLE,
  GROWTHS,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  SCAN,
  SVG_H,
  SVG_W,
  TRY,
  WEEKS,
  boom,
  boomAt,
  boomFill,
  boomPath,
  crossover,
  factor,
  figureCopy,
  gcd,
  ipow,
  reduce,
  round2,
  scaleX,
  scaleY,
  show,
  spoken,
  steady,
  steadyFill,
  steadyPath,
  tryItOptions,
  workedExample,
  workedSteps,
  type Growth
} from "./ca-g11-ch02-exponential-logarithmic-models";

const SLUG = "ca-g11-ch02-exponential-logarithmic-models";
const BRIEF_STANDARDS = ["F-LE.1", "F-LE.2", "F-LE.3", "F-LE.4", "F-LE.5"];
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
  const found = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sourceFile) === name);
  return found && ts.isJsxAttribute(found) ? found : undefined;
}
function attributeNumber(node: Opening, name: string): number | null {
  const init = attribute(node, name)?.initializer;
  if (init && ts.isJsxExpression(init) && init.expression && ts.isNumericLiteral(init.expression)) return Number(init.expression.text);
  return null;
}
function attributeIdentifier(node: Opening, name: string): string | null {
  const init = attribute(node, name)?.initializer;
  if (init && ts.isJsxExpression(init) && init.expression && ts.isIdentifier(init.expression)) return init.expression.text;
  return null;
}
function line(node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}
function assertInside(label: string, x: number, y: number, margin: number) {
  assert.ok(x - margin >= -1e-9 && x + margin <= SVG_W + 1e-9, `${label}: x=${x} (margin ${margin}) leaves the ${SVG_W}px viewBox`);
  assert.ok(y - margin >= -1e-9 && y + margin <= SVG_H + 1e-9, `${label}: y=${y} (margin ${margin}) leaves the ${SVG_H}px viewBox`);
}
const grid = (c: { min: number; max: number; step: number }) => Array.from({ length: (c.max - c.min) / c.step + 1 }, (_, i) => c.min + i * c.step);

/** Exact integer arithmetic, so the model comparison never rides on a rounded double. */
function bigPow(base: number, exp: number) {
  let out = BigInt(1);
  for (let i = 0; i < exp; i += 1) out *= BigInt(base);
  return out;
}
/** Pond B as an exact fraction: start·num^t over den^t. */
function exactBoom(start: number, g: Growth, t: number) {
  return { n: BigInt(start) * bigPow(g.num, t), d: bigPow(g.den, t) };
}
/** Is the multiplying model strictly ahead of the adding model at whole week w? */
function exactlyAhead(start: number, add: number, g: Growth, w: number) {
  const { n, d } = exactBoom(start, g, w);
  return n > BigInt(start + add * w) * d;
}
/** Is the exact value start·num^t / den^t at or under the cap? */
function exactlyUnderCap(start: number, g: Growth, t: number, strict = false) {
  const { n, d } = exactBoom(start, g, t);
  const cap = BigInt(CAP) * d;
  return strict ? n < cap : n <= cap;
}
/**
 * Which pond is completely covered first, and when — found by walking time in
 * thousandths of a week, with no logarithm and no division anywhere, so it is a
 * genuinely separate route to the numbers `steadyFill` and `boomFill` produce.
 */
function firstCovered(start: number, add: number, g: Growth) {
  const b = factor(g);
  for (let i = 0; i <= SCAN * 1000; i += 1) {
    const t = i / 1000;
    const a = start + add * t;
    const x = start * Math.pow(b, t);
    if (a >= CAP || x >= CAP) return { who: a >= CAP && x < CAP ? "A" : x >= CAP && a < CAP ? "B" : "tie", t };
  }
  return { who: "neither", t: Infinity };
}

test("the scale functions map the declared plot corners exactly", () => {
  assert.equal(scaleX(0), PAD_L);
  assert.equal(scaleX(WEEKS), SVG_W - PAD_R);
  assert.equal(scaleY(0), SVG_H - PAD_B);
  assert.equal(scaleY(CAP), PAD_T);
  assert.equal(scaleY(CAP / 2), (PAD_T + SVG_H - PAD_B) / 2);
  assert.ok(PAD_L - 8 - 20 >= 0, "the \"100\" y-axis label at 11px needs room left of the axis");
  assert.ok(PAD_T - 9 - 8 >= 0, "the \"pond completely covered\" caption sits 9px above the top gridline");
  assert.ok(SVG_H - PAD_B + 17 + 4 <= SVG_H && SVG_H - 7 <= SVG_H, "the week labels and axis title fit under the plot");
  for (const g of GROWTHS) assert.equal(factor(g), 1 + g.percent / 100);
  assert.deepEqual(GROWTHS.map(factor), [1.25, 1.5, 2]);
  assert.equal(ipow(5, 0), 1);
  assert.equal(ipow(5, 4), 625);
  assert.equal(gcd(3000, 1024), 8);
  assert.deepEqual(reduce(3000, 1024), { p: 375, q: 128 });
  // "≈" is a claim about rounding, so it may only appear when two decimals lose something.
  assert.equal(round2(0.125), 0.13);
  assert.equal(show(9), "9");
  assert.equal(show(24.5), "24.50", "98/4 is exactly 24.5 and must not be called approximate");
  assert.equal(show(15.5), "15.50");
  assert.equal(show(98 / 6), "≈16.33", "98/6 does not terminate, so it is genuinely rounded");
  assert.equal(show(Math.log(50) / Math.log(1.25)), "≈17.53");
  assert.equal(spoken(9), "9");
  assert.equal(spoken(24.5), "24.50");
  assert.equal(spoken(98 / 6), "about 16.33");
});

test("every reachable control state keeps the figure true and inside its viewBox", () => {
  let states = 0;
  let bFirst = 0, aFirst = 0, crossInWindow = 0, crossBeyondWindow = 0, aOverCap = 0, bOverCap = 0;
  let insidePondCount = 0, outsidePondCount = 0, insideBeyondWindow = 0;
  let closestFillGap = Infinity, latestCross = 0;
  const markerTally = [0, 0, 0];
  const exactTwoDecimalFills = new Set<number>();

  for (const start of grid(CONTROLS.start)) {
    for (const g of GROWTHS) {
      const b = factor(g);
      // Pond B has a constant ratio, and at whole weeks it is exactly start·num^t / den^t.
      for (const t of grid(CONTROLS.week)) {
        const { n, d } = exactBoom(start, g, t);
        assert.ok(Number(n) <= Number.MAX_SAFE_INTEGER, `numerator ${n} must stay exact in a double`);
        assert.equal(boom(start, g, t), Number(n) / Number(d), `boom(${start}, ${g.percent}%, ${t})`);
        assert.ok(Math.abs(boomAt(start, g, t) - boom(start, g, t)) < 1e-9, "the drawn curve passes through the whole-week values");
        if (t > 0) {
          assert.equal(boom(start, g, t) / boom(start, g, t - 1), b, `constant ratio at week ${t}`);
          assert.ok(boom(start, g, t) > boom(start, g, t - 1), "pond B grows every week");
        }
      }
      assert.equal(boom(start, g, 0), start, "week 0 is the starting patch");
      // Solving start·b^t = CAP with a logarithm really does hit CAP, and the answer is
      // bracketed by exact integers: whole week floor(tB) is still under the cap and the
      // next whole week is over it. That is a separate route, not e^(t·ln b) again.
      const tB = boomFill(start, g);
      assert.ok(tB > 0, `fill time ${tB} must be positive`);
      assert.ok(Math.abs(start * Math.pow(b, tB) - CAP) < 1e-9, `log solution ${tB} must satisfy the model`);
      const kB = Math.floor(tB);
      assert.ok(exactlyUnderCap(start, g, kB, true), `${start} at ${g.percent}%: week ${kB} is still under the cap`);
      assert.ok(!exactlyUnderCap(start, g, kB + 1), `${start} at ${g.percent}%: week ${kB + 1} is over the cap`);
      assert.ok(show(tB).startsWith("≈"), `${start} at ${g.percent}%: a log fill time is irrational and must be marked as rounded`);
      // The curve is drawn only while it fits, and every drawn point lands in the plot.
      const curve = boomPath(start, g);
      assert.equal(curve.length, CURVE_STEPS + 1);
      assert.deepEqual(curve[0], { t: 0, v: start });
      for (let i = 1; i < curve.length; i += 1) {
        assert.ok(curve[i].t > curve[i - 1].t && curve[i].v >= curve[i - 1].v, "the curve rises left to right");
        assert.ok(Math.abs(curve[i].v - Math.min(CAP, start * Math.exp(curve[i].t * Math.log(b)))) < 1e-9, "each drawn point is the model, capped");
      }
      for (const p of curve) {
        assert.ok(p.t >= 0 && p.t <= WEEKS && p.v >= 0 && p.v <= CAP, `curve point (${p.t}, ${p.v})`);
        assertInside(`curve point start=${start} g=${g.percent}`, scaleX(p.t), scaleY(p.v), 2);
      }
      const last = curve[CURVE_STEPS];
      if (tB < WEEKS) assert.ok(Math.abs(last.v - CAP) < 1e-9, `a curve that fills the pond ends at ${CAP}`);
      else assert.ok(Math.abs(last.t - WEEKS) < 1e-12, "a curve that never fills the pond runs the whole axis");

      for (const add of grid(CONTROLS.add)) {
        const where = `start=${start} add=${add} growth=${g.percent}%`;
        // Pond A rebuilt by repeated addition — the constant-difference definition itself,
        // never the start + add·t expression the helper returns.
        const walk: number[] = [];
        for (let v = start, t = 0; t <= WEEKS; t += 1, v += add) walk.push(v);
        for (const t of grid(CONTROLS.week)) {
          assert.equal(steady(start, add, t), walk[t], `${where}: week ${t} by repeated addition`);
          if (t > 0) assert.equal(walk[t] - walk[t - 1], add, `constant difference at week ${t}`);
        }
        const tA = steadyFill(start, add);
        assert.ok(tA >= 9 && tA <= 49, `${where}: fill time ${tA}`);
        if ((CAP - start) % add === 0) {
          assert.ok(Number.isInteger(tA), `${where}: an exact division gives a whole number of weeks`);
          assert.equal(steady(start, add, tA), CAP, where);
        } else assert.ok(Math.abs(steady(start, add, tA) - CAP) < 1e-9, where);
        // (CAP - start)/add is exact at two decimals exactly when add divides (CAP - start)·100,
        // and only then may it be printed without the "≈" flag.
        const exactAtTwoDecimals = ((CAP - start) * 100) % add === 0;
        assert.equal(show(tA).startsWith("≈"), !exactAtTwoDecimals, `${where}: show(${tA})`);
        if (Number.isInteger(tA)) assert.equal(show(tA), String(tA), where);
        else if (exactAtTwoDecimals) { assert.equal(show(tA), tA.toFixed(2), where); exactTwoDecimalFills.add(tA); }

        // The line is drawn only while it fits.
        const linePts = steadyPath(start, add);
        assert.equal(linePts.length, 2);
        assert.deepEqual(linePts[0], { t: 0, v: start });
        assert.equal(linePts[1].t, Math.min(WEEKS, tA), where);
        assert.ok(linePts[1].v <= CAP + 1e-9 && linePts[1].v > start, where);
        if (tA <= WEEKS) assert.ok(Math.abs(linePts[1].v - CAP) < 1e-9, `${where}: a line that fills the pond ends at ${CAP}`);
        else assert.equal(linePts[1].v, start + add * WEEKS, `${where}: a line that never fills runs the whole axis`);
        for (const p of linePts) assertInside(`${where} line point`, scaleX(p.t), scaleY(p.v), 2);

        // "Pond X is covered first" must never be a coin flip, and the sentence the banner
        // prints must name the pond a plain time-walk finds first.
        closestFillGap = Math.min(closestFillGap, Math.abs(tA - tB));
        if (tB < tA) bFirst += 1; else aFirst += 1;
        const copy = figureCopy(start, add, g, 0);
        const race = firstCovered(start, add, g);
        assert.ok(race.who === "A" || race.who === "B", `${where}: one pond fills first`);
        assert.ok(copy.first.startsWith(`Pond ${race.who} is completely covered first, after `), `${where}: ${copy.first}`);
        const printedFirst = Number(/after (?:≈)?([0-9.]+) weeks\.$/u.exec(copy.first)?.[1]);
        assert.ok(Math.abs(printedFirst - race.t) <= 0.01, `${where}: printed ${printedFirst} vs walked ${race.t}`);
        // The spoken label names both fill weeks, and both agree with the models.
        const fills = [...copy.aria.matchAll(/reaches the full pond at week (?:about )?([0-9]+(?:\.[0-9]+)?)/gu)].map((m) => Number(m[1]));
        assert.equal(fills.length, 2, `${where}: the label must name both fill weeks`);
        assert.ok(Math.abs(fills[0] - tA) <= 0.005 + 1e-9 && Math.abs(fills[1] - tB) <= 0.005 + 1e-9, `${where}: label fill weeks ${fills}`);

        // The crossover week, recomputed exactly with integers: start·num^w > (start + add·w)·den^w.
        let expected: number | null = null;
        for (let w = 1; w <= SCAN && expected === null; w += 1) if (exactlyAhead(start, add, g, w)) expected = w;
        const cross = crossover(start, add, g);
        assert.equal(cross, expected, `${where}: crossover week`);
        assert.ok(cross !== null, `${where}: a multiplying model always overtakes an adding one`);
        const w = cross as number;
        latestCross = Math.max(latestCross, w);
        if (w > 1) assert.ok(!exactlyAhead(start, add, g, w - 1), `${where}: week ${w - 1} is not yet ahead`);
        for (let k = w; k <= SCAN; k += 1) assert.ok(exactlyAhead(start, add, g, k), `${where}: still ahead at week ${k}`);
        if (w <= WEEKS) crossInWindow += 1; else crossBeyondWindow += 1;

        // A crossing may only be told as a pond story while BOTH ponds still have open water
        // at that week — decided here with exact integers, never with the lesson's fill times.
        const insidePond = start + add * w < CAP && exactlyUnderCap(start, g, w, true);
        assert.equal(copy.inPond, insidePond, `${where}: the crossing at week ${w} is inside the pond`);
        const said = `${copy.legend} ${copy.banner} ${copy.check}`;
        assert.equal(/pond B pulls ahead|both ponds still have room|before either pond is full/u.test(said), insidePond, `${where}: pond-language overtaking claim — ${said}`);
        assert.ok(said.includes(`week ${w}`), `${where}: the crossing week must be named — ${said}`);
        if (insidePond) {
          insidePondCount += 1;
          if (w > WEEKS) insideBeyondWindow += 1; else assertInside(`${where} crossover rule`, scaleX(w), PAD_T, 1);
        } else {
          outsidePondCount += 1;
          assert.match(copy.banner, /already been completely covered/u, `${where}: an out-of-pond crossing must say so`);
          assert.doesNotMatch(copy.legend, /pulls ahead/u, `${where}: the legend must not claim a pond overtakes after the pond is full`);
          // "A bigger weekly percent brings it back inside the pond" is only printed where a
          // bigger percent really does put the crossing inside both ponds.
          const bigger = GROWTHS.slice(GROWTHS.findIndex((o) => o.percent === g.percent) + 1);
          assert.ok(bigger.some((up) => { const c = crossover(start, add, up) as number; return start + add * c < CAP && exactlyUnderCap(start, up, c, true); }), `${where}: no bigger weekly percent brings the crossing inside the pond`);
        }

        for (const week of grid(CONTROLS.week)) {
          states += 1;
          const aNow = walk[week];
          const bNow = boom(start, g, week);
          const { n, d } = exactBoom(start, g, week);
          const state = figureCopy(start, add, g, week);
          assert.ok(Number.isInteger(aNow), `${where} week=${week}: pond A is a whole number of square meters`);
          if (aNow <= CAP) assertInside(`${where} week=${week} A marker`, scaleX(week), scaleY(aNow), 6); else aOverCap += 1;
          if (bNow <= CAP) assertInside(`${where} week=${week} B marker`, scaleX(week), scaleY(bNow), 6); else bOverCap += 1;
          assert.equal(aNow > CAP, week > tA, `${where} week=${week}: the "already covered" readout agrees with the fill time`);
          assert.equal(bNow > CAP, week > tB, `${where} week=${week}: the "already covered" readout agrees with the fill time`);
          assertInside(`${where} week=${week} slider rule`, scaleX(week), PAD_T, 1);

          // The markers the figure draws, decided from exact integers.
          const drawn = [aNow <= CAP ? "pond A" : "", exactlyUnderCap(start, g, week) ? "pond B" : ""].filter((m) => m !== "");
          markerTally[drawn.length] += 1;
          assert.deepEqual(state.marks, drawn, `${where} week=${week}: markers drawn`);
          const sentence = drawn.length === 0
            ? `Both ponds are covered before week ${week}, so no marker is drawn.`
            : drawn.length === 1
              ? `One marker, on ${drawn[0]}, shows week ${week}.`
              : `Markers on pond A and pond B show week ${week}.`;
          assert.equal(state.markers, sentence, `${where} week=${week}: marker sentence`);
          assert.ok(state.aria.endsWith(sentence), `${where} week=${week}: the spoken label must end with what it drew`);
          assert.equal(/\bMarkers\b/u.test(state.aria), drawn.length === 2, `${where} week=${week}: plural "Markers" only for two`);
          assert.equal(state.aria.includes("no marker is drawn"), drawn.length === 0, `${where} week=${week}: an empty figure must say so`);

          // The two readouts under the figure.
          const done = `the model passed ${CAP} m², so this pond is already covered`;
          assert.equal(state.aWeek, aNow <= CAP ? `${aNow} m² covered` : done, `${where} week=${week}: pond A readout`);
          // start·num^week / den^week is exact at two decimals exactly when 4n is a multiple of d.
          const bExactAtTwoDecimals = (n * BigInt(4)) % d === BigInt(0);
          const printedB = Number.isInteger(bNow) ? String(bNow) : bExactAtTwoDecimals ? bNow.toFixed(2) : `≈${bNow.toFixed(2)}`;
          assert.equal(state.bWeek, bNow <= CAP ? `${printedB} m² covered` : done, `${where} week=${week}: pond B readout`);
          if (bNow <= CAP) assert.equal(state.bWeek.startsWith("≈"), !Number.isInteger(bNow) && !bExactAtTwoDecimals, `${where} week=${week}: "≈" honesty`);
        }
      }
    }
  }
  assert.equal(states, 5 * 3 * 5 * 11);
  assert.ok(bFirst > 0 && aFirst > 0, "both ponds must be able to fill first somewhere in the grid");
  assert.ok(crossInWindow > 0 && crossBeyondWindow > 0, "the crossover must be reachable both inside and outside the 10-week window");
  assert.ok(aOverCap > 0 && bOverCap > 0, "both markers must be hidden by the cap somewhere in the grid");
  // 10 states draw no marker at all and 235 draw exactly one, which is why the spoken label
  // may never say "Markers" unconditionally.
  assert.deepEqual(markerTally, [10, 235, 580]);
  assert.equal(markerTally[0] + markerTally[1] + markerTally[2], states);
  // 12 of the 75 settings put the crossing after a pond is already full; those must never be
  // told as one pond overtaking the other, and 5 of the remaining 63 sit past the drawn axis.
  assert.equal(insidePondCount + outsidePondCount, 75);
  assert.equal(outsidePondCount, 12);
  assert.equal(insideBeyondWindow, 5);
  // Eleven distinct pond A fill times are non-integers that two decimals represent exactly.
  assert.equal(exactTwoDecimalFills.size, 11);
  // The closest the two fill times ever come is about 0.15 weeks (start 2, add 10, 50% growth),
  // which is astronomically larger than the 1e-15 error in either calculation, so "covered first" is never a coin flip.
  assert.ok(closestFillGap > 0.1, `the two fill times come within ${closestFillGap} weeks somewhere`);
  assert.ok(latestCross < SCAN, `the latest crossover is week ${latestCross}`);
});

test("worked example values recompute independently from its five constants", () => {
  assert.deepEqual({ ...EXAMPLE }, { start: 1024, addPerDay: 300, percent: 25, days: 5, target: 3000 });
  const ex = workedExample();
  assert.equal(ex.b, 1.25);
  assert.equal(1 + 25 / 100, 1.25);
  // A(t) = 1024 + 300t: 1024, 1324, 1624, 1924, 2224, 2524
  assert.deepEqual(ex.rows.map((r) => r.a), [1024, 1324, 1624, 1924, 2224, 2524]);
  // B(t) = 1024·(5/4)^t; 1024 = 4^5, so every value through day 5 is the whole number 5^t·4^(5-t)
  assert.deepEqual(ex.rows.map((r) => r.b), [1024, 1280, 1600, 2000, 2500, 3125]);
  for (let t = 0; t <= 5; t += 1) assert.equal(ex.rows[t].b, Math.pow(5, t) * Math.pow(4, 5 - t), `day ${t}`);
  assert.equal((1024 * 5) / 4, 1280);
  assert.equal((1280 * 5) / 4, 1600);
  assert.equal((1600 * 5) / 4, 2000);
  assert.equal((2000 * 5) / 4, 2500);
  assert.equal((2500 * 5) / 4, 3125);
  // Post B first passes post A on day 3: 2000 > 1924, while on day 2 1600 < 1624.
  assert.ok(1600 < 1624 && 2000 > 1924);
  assert.equal(ex.lead, 3);
  assert.ok(ex.rows.slice(1, ex.lead).every((r) => r.b < r.a), "post A leads until the crossover day");
  assert.ok(ex.rows.slice(ex.lead).every((r) => r.b > r.a), "post B leads from the crossover day on");
  // 3000/1024 reduces by 8 to 375/128, and no whole power of 5/4 equals it, so the target
  // cannot be reached by spotting an exact power: only the logarithm locates t.
  assert.equal(3000 / 8, 375);
  assert.equal(1024 / 8, 128);
  assert.deepEqual([ex.p, ex.q], [375, 128]);
  for (let k = 0; k <= 8; k += 1) assert.notEqual(Math.pow(5, k) * 128, Math.pow(4, k) * 375, `(5/4)^${k} is not 375/128`);
  // Solve 1024·1.25^t = 3000 by bisection — no logarithm anywhere — and the log answer must match.
  assert.ok(1024 * Math.pow(1.25, 4) < 3000 && 1024 * Math.pow(1.25, 5) > 3000, "the answer is between day 4 and day 5");
  let lo = 4, hi = 5;
  for (let i = 0; i < 200; i += 1) { const mid = (lo + hi) / 2; if (1024 * Math.pow(1.25, mid) < 3000) lo = mid; else hi = mid; }
  assert.ok(Math.abs(ex.solved - lo) < 1e-9, `bisection gives ${lo}, the logarithm gives ${ex.solved}`);
  assert.equal(ex.solved.toFixed(2), "4.82");
  // A fractional answer only becomes a day after rounding up, and the two neighbours prove it.
  assert.equal(ex.day, 5);
  assert.equal(ex.below, 2500);
  assert.equal(ex.check, 3125);
  assert.ok(ex.below < EXAMPLE.target && ex.check >= EXAMPLE.target, "day 5 is the first whole day at or above the target");
  assert.ok(ex.day <= EXAMPLE.days, "the answer day is inside the table the example prints");

  // The seven revealed steps, as the student reads them.
  const steps = workedSteps();
  assert.equal(steps.length, 7);
  assert.equal(steps[0].math, "Post A: + 300 views a day");
  assert.equal(steps[0].math2, "Post B: \u00d7 1.25 each day", "a growth factor is unitless: it is not \"1.25 views a day\"");
  assert.equal(steps[1].math, "A(t) = 1024 + 300t");
  assert.equal(steps[1].math2, "B(t) = 1024(1.25)^t");
  assert.equal(steps[2].math, "A: 1024, 1324, 1624, 1924, 2224, 2524");
  assert.equal(steps[2].math2, "B: 1024, 1280, 1600, 2000, 2500, 3125");
  assert.ok(steps[2].note.startsWith("Post A leads for the first 2 days. From day 3 on, post B is ahead"), steps[2].note);
  assert.equal(steps[3].math, "1024(1.25)^t = 3000");
  assert.equal(steps[3].math2, "(1.25)^t = 375/128");
  assert.equal(steps[4].math, "t \u00b7 log(1.25) = log(375/128)");
  assert.equal(steps[4].math2, "t = log(375/128) \u00f7 log(1.25) = 4.82");
  assert.match(steps[4].note, /log\(b\^t\) = t \u00b7 log\(b\)/u, "the step must state the rule that lets t come down");
  assert.match(steps[4].note, /is not log of \(375\/128 \u00f7 1\.25\)/u, "the step must warn against collapsing the two logs into one");
  assert.equal(steps[5].math, "B(4) = 2500");
  assert.equal(steps[5].math2, "B(5) = 3125");
  assert.match(steps[5].note, /first whole day with at least 3000/u);
  assert.match(steps[5].note, /no lucky exact power was ever going to turn up here/u, "the step must say the logarithm is what locates t");
  assert.ok(!steps.some((step) => /This one is exact/u.test(step.note)), "no step may claim the target is an exact power of the base");
  assert.match(steps[6].note, /multiplier with no units at all/u);
});

test("the Try it correct option is the true share count after three days of 50% growth", () => {
  assert.deepEqual({ ...TRY }, { start: 40, percent: 50, days: 3 });
  const { options, correct } = tryItOptions();
  assert.equal(options.length, 4);
  // 40 · 1.5³ = 40 · 27/8 = 135
  assert.equal(Math.pow(3, 3), 27);
  assert.equal(Math.pow(2, 3), 8);
  assert.equal((40 * 27) / 8, 135);
  // Day by day: 40 -> 60 -> 90 -> 135
  assert.equal(40 * 1.5, 60);
  assert.equal(60 * 1.5, 90);
  assert.equal(90 * 1.5, 135);
  assert.equal(options[correct].value, 135);
  assert.equal(correct, 2);
  // The three distractors are the three classic slips, and each is genuinely wrong.
  assert.deepEqual(options.map((o) => o.value), [60, 100, 135, 180]);
  assert.equal(40 + 3 * 20, 100, "adding 50% of the original each day");
  assert.equal(40 * 1.5 * 3, 180, "treating the exponent as a factor");
  assert.equal(new Set(options.map((o) => o.value)).size, 4, "all four choices must read differently");
  options.forEach((o, i) => assert.equal(o.value === 135, i === correct, `option ${i} (${o.value})`));
});

test("lesson source honors the authoring contract", () => {
  assert.ok(source.startsWith('"use client";'), "file must start with the client directive");
  assert.doesNotMatch(source, /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/u, "no CJK characters");
  for (const banned of ["Math.random", "fetch(", "localStorage", "sessionStorage", "dangerouslySetInnerHTML", "<form", "next/image", "Codex", "candidate", "S18"]) {
    assert.ok(!source.includes(banned), `source must not contain ${banned}`);
  }
  const lines = source.split("\n").length;
  assert.ok(lines >= 120 && lines <= 260, `lesson is ${lines} lines; the contract allows 120-260`);

  const cited = [...source.matchAll(/\b[A-Z]-[A-Z]{2,3}\.\d+\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of BRIEF_STANDARDS) assert.ok(mathCheck.includes(id), `Math check must cite ${id}`);

  const svgs = openings("svg");
  assert.equal(svgs.length, 1);
  for (const svg of svgs) {
    assert.ok(attribute(svg, "viewBox"), `svg at line ${line(svg)} needs a viewBox`);
    assert.ok(attribute(svg, "role"), `svg at line ${line(svg)} needs role="img"`);
    assert.ok(attribute(svg, "aria-label"), `svg at line ${line(svg)} needs an aria-label`);
  }

  const buttons = openings("button");
  assert.equal(buttons.length, 6, "stepper pair, growth choice, disclosure, reset and try-it choice expected");
  for (const button of buttons) {
    const init = attribute(button, "type")?.initializer;
    assert.ok(init && ts.isStringLiteral(init) && init.text === "button", `button at line ${line(button)} needs type="button"`);
  }

  const steppers = openings("Stepper");
  assert.equal(steppers.length, 2);
  for (const stepper of steppers) {
    const name = attributeIdentifier(stepper, "value") as keyof typeof CONTROLS | null;
    assert.ok(name && name in CONTROLS, `Stepper at line ${line(stepper)} must bind a declared control`);
    const declared = CONTROLS[name as keyof typeof CONTROLS];
    assert.equal(attributeNumber(stepper, "min"), declared.min, `${name} min`);
    assert.equal(attributeNumber(stepper, "max"), declared.max, `${name} max`);
    assert.equal(attributeNumber(stepper, "step") ?? 1, declared.step, `${name} step`);
  }
  const ranges = openings("input");
  assert.equal(ranges.length, 1);
  assert.equal(attributeIdentifier(ranges[0], "value"), "week");
  assert.equal(attributeNumber(ranges[0], "min"), CONTROLS.week.min);
  assert.equal(attributeNumber(ranges[0], "max"), CONTROLS.week.max);

  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /<ol id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{pick === i\}/u);
  assert.match(source, /aria-pressed=\{gi === i\}/u);
  for (const title of ["Exponential vs. Linear Growth", "Linear vs. Exponential Models", "Logarithms Solve Exponentials"]) {
    assert.ok(source.includes(title), `roadmap must name "${title}"`);
  }

  // Every sentence checked above must be the one the page actually renders.
  assert.match(source, /aria-label=\{copy\.aria\}/u, "the spoken label must come from the tested builder");
  assert.match(source, /const steps = workedSteps\(\);/u, "the revealed steps must be the tested ones");
  assert.match(source, /copy\.marks\.includes\("pond A"\) && <circle/u, "pond A's marker must be gated by the same list the label reads");
  assert.match(source, /copy\.marks\.includes\("pond B"\) && <circle/u, "pond B's marker must be gated by the same list the label reads");
  assert.match(source, /\{cross !== null && copy\.inPond && cross <= WEEKS && <line/u, "the crossover rule is only drawn for a crossing inside the pond");
  for (const bound of ["{copy.legend}", "{copy.aWeek}", "{copy.bWeek}", "{copy.first} {copy.banner}", "(F-LE.3){copy.check}"]) {
    assert.ok(source.includes(bound), `the lesson must render ${bound}`);
  }

  // F-LE.4 has to be developed, not asserted: what a log is, the power rule that makes the
  // quotient legal, and a warning against collapsing it into one log.
  assert.ok(source.includes("the exponent you put on 10 to get x"), "the lesson must say what log means");
  assert.ok(source.includes("log(b^t) = t · log(b)"), "the worked example must state the power rule it uses");
  assert.ok(source.includes("log(b<sup>t</sup>) = t · log(b)"), "the Math check must state the power rule it uses");
  assert.ok(source.includes("is not log of"), "the lesson must warn against moving the division inside the log");
  // A growth factor is unitless, so it may never be printed with a unit.
  assert.ok(source.includes("Post B: × ${ex.b} each day"), "step 1 must not attach units to the growth factor");
  assert.ok(!source.includes("views a day`, math2: `Post B: × ${ex.b} views"), "step 1 must not read as \"times 1.25 views a day\"");
});
