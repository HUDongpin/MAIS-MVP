import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CENTER,
  CUT_HOURS,
  EXAMPLE,
  GH,
  GW,
  H,
  HOURS,
  OFFSETS,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  PIVOT,
  PREDICT_MAX,
  PREDICT_MIN,
  SCATTER_MAX,
  SCATTER_MIN,
  SHOTS_MAX,
  SLOPE_MAX,
  SLOPE_MIN,
  TRY,
  TRY_ANSWER,
  TRY_CHOICES,
  TRY_CORRECT,
  W,
  X_AXIS_MAX,
  exampleSteps,
  figureLabel,
  fmtNum,
  hoursWord,
  intercept,
  lineEquation,
  percent,
  pointsFor,
  predict,
  shotsWord,
  slopeRatePhrase,
  slopeSentence,
  sx,
  sy,
  tableVerdict,
  trendSentence,
  tryFeedback,
  twoWayCounts
} from "./ca-g8-ch05-bivariate-data-claims";

const BRIEF_STANDARDS = ["8.SP.A.1", "8.SP.A.2", "8.SP.A.3", "8.SP.A.4"];
const source = readFileSync(
  path.join(process.cwd(), "components/lesson/ccss/lessons/ca-g8-ch05-bivariate-data-claims.tsx"),
  "utf8"
);

// Independent copy of the scatter pattern the lesson must keep.
const EXPECTED_OFFSETS = [1, -1, 2, -2, 0, -1, -1, 2];

function plainSum(values: number[]) {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Ordinary least squares, written out from the definitions (no lesson helper involved). */
function leastSquares(xs: number[], ys: number[]) {
  const n = xs.length;
  const xBar = plainSum(xs) / n;
  const yBar = plainSum(ys) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - xBar) * (ys[i] - yBar);
    sxx += (xs[i] - xBar) * (xs[i] - xBar);
  }
  const slope = sxy / sxx;
  return { slope, intercept: yBar - slope * xBar };
}

test("the eight players and the scatter pattern are the audited ones", () => {
  assert.deepEqual(HOURS, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(OFFSETS, EXPECTED_OFFSETS);
  assert.equal(plainSum(OFFSETS), 0, "offsets must cancel overall");
  assert.equal(plainSum(OFFSETS.map((e, i) => e * HOURS[i])), 0, "hour-weighted offsets must cancel");
  assert.equal(1 - 2 + 6 - 8 + 0 - 6 - 7 + 16, 0);
  assert.equal(Math.max(...OFFSETS.map(Math.abs)), 2, "the stray bound 2 x scatter must be attained");
  assert.equal(OFFSETS.slice(0, 4).filter((e) => e >= 0).length, 2);
  assert.equal(OFFSETS.slice(4).filter((e) => e >= 0).length, 2);
  assert.equal(CENTER, 25);
  assert.equal(PIVOT, 4);
  assert.equal(CUT_HOURS, 5);
  assert.equal(SHOTS_MAX, 50);
  assert.equal(W, PAD_L + GW + PAD_R);
  assert.equal(H, PAD_T + GH + PAD_B);
  assert.equal(sx(0), PAD_L);
  assert.equal(sx(X_AXIS_MAX), W - PAD_R);
  assert.equal(sy(0), PAD_T + GH);
  assert.equal(sy(SHOTS_MAX), PAD_T);
});

test("every reachable (slope, scatter, predict-for) state satisfies the figure's claims", () => {
  let states = 0;
  for (let m = SLOPE_MIN; m <= SLOPE_MAX; m += 1) {
    for (let s = SCATTER_MIN; s <= SCATTER_MAX; s += 1) {
      const label = `m=${m} s=${s}`;
      const b = 25 - 4 * m;
      assert.equal(intercept(m), b, label);
      assert.ok(b >= 13 && b <= 37, label);

      // the data: y = m x + b + s e, integer, inside the 0..50 axis
      const points = pointsFor(m, s);
      assert.equal(points.length, 8, label);
      for (let i = 0; i < 8; i += 1) {
        const x = i + 1;
        const y = m * x + b + s * EXPECTED_OFFSETS[i];
        assert.equal(points[i].x, x, label);
        assert.equal(points[i].y, y, label);
        assert.ok(Number.isInteger(y), label);
        assert.ok(y >= 7 && y <= 43, `${label}: y=${y}`);
        assert.ok(y >= 0 && y <= SHOTS_MAX, label);
        // each dot stays inside the plotting rectangle with its radius
        const cx = sx(x);
        const cy = sy(y);
        assert.ok(cx - 5 >= PAD_L && cx + 5 <= W - PAD_R, `${label}: dot cx ${cx}`);
        assert.ok(cy - 5 >= PAD_T && cy + 5 <= PAD_T + GH, `${label}: dot cy ${cy}`);
      }

      // the drawn line is exactly the least-squares line through the eight points
      const fit = leastSquares(points.map((p) => p.x), points.map((p) => p.y));
      assert.equal(fit.slope, m, `${label}: least-squares slope`);
      assert.equal(fit.intercept, b, `${label}: least-squares intercept`);
      // and its drawn endpoints stay inside the plot
      for (const x of [0, X_AXIS_MAX]) {
        const y = m * x + b;
        assert.equal(predict(m, x), y, label);
        assert.ok(y >= 0 && y <= SHOTS_MAX, `${label}: line end y=${y}`);
        assert.ok(sy(y) >= PAD_T && sy(y) <= PAD_T + GH, label);
      }

      // equation string
      const eq = lineEquation(m);
      if (m === 0) assert.equal(eq, `y = ${b}`, label);
      else if (m === 1) assert.equal(eq, `y = x + ${b}`, label);
      else if (m === -1) assert.equal(eq, `y = −x + ${b}`, label);
      else if (m > 0) assert.equal(eq, `y = ${m}x + ${b}`, label);
      else assert.equal(eq, `y = −${-m}x + ${b}`, label);

      // slope / intercept sentence
      const ss = slopeSentence(m);
      assert.ok(ss.startsWith(`Slope ${fmtNum(m)}:`), label);
      assert.ok(ss.includes(`Intercept ${b}:`) && ss.includes(`predicted to make ${b} shots`), label);
      if (m === 0) assert.ok(ss.includes("no change"), label);
      else assert.ok(ss.includes(`${Math.abs(m)} ${m > 0 ? "more" : "fewer"} ${Math.abs(m) === 1 ? "shot" : "shots"}`), label);
      // the Math check's rate phrase names the slope and pluralizes "shot" at every value
      assert.equal(slopeRatePhrase(m), `${fmtNum(m)} ${m === 1 || m === -1 ? "shot" : "shots"} per extra hour`, label);
      assert.ok(!slopeRatePhrase(m).includes("1 shots"), label);

      // trend sentence: direction from the sign, stray bound is exactly 2 x scatter
      const ts = trendSentence(m, s);
      const maxMiss = Math.max(...points.map((p) => Math.abs(p.y - (m * p.x + b))));
      assert.equal(maxMiss, 2 * s, label);
      if (m > 0) assert.ok(ts.startsWith(`The line climbs ${7 * m} shots from 1 to 8 hours: a positive association.`), label);
      else if (m < 0) assert.ok(ts.startsWith(`The line drops ${-7 * m} shots from 1 to 8 hours: a negative association.`), label);
      else assert.ok(ts.startsWith("The line is flat, so practice hours do not predict shots made: no association."), label);
      assert.equal(m * 8 + b - (m * 1 + b), 7 * m, label);
      if (s === 0) assert.ok(ts.endsWith("Every dot sits exactly on the line."), label);
      else assert.ok(ts.endsWith(`Every dot stays within ${2 * s} shots of the line.`), label);

      // two-way table recomputed by hand
      const counts = twoWayCounts(points);
      let lowYes = 0;
      let highYes = 0;
      for (const p of points) {
        if (p.x <= 4 && p.y >= 25) lowYes += 1;
        if (p.x >= 5 && p.y >= 25) highYes += 1;
      }
      assert.deepEqual(counts, { lowYes, lowTotal: 4, highYes, highTotal: 4 }, label);
      const pLow = (lowYes * 100) / 4;
      const pHigh = (highYes * 100) / 4;
      assert.equal(percent(counts.lowYes, counts.lowTotal), pLow, label);
      assert.equal(percent(counts.highYes, counts.highTotal), pHigh, label);
      assert.ok(Number.isInteger(pLow) && Number.isInteger(pHigh), label);
      const gap = pHigh - pLow;
      // the table never contradicts the line: the gap has the slope's sign, and is 0 when the line is flat
      if (m > 0) assert.ok(gap >= 25, `${label}: gap ${gap}`);
      else if (m < 0) assert.ok(gap <= -25, `${label}: gap ${gap}`);
      else assert.equal(gap, 0, label);
      if (Math.abs(m) >= 2) assert.ok(Math.abs(gap) >= 75, `${label}: gap ${gap}`);
      if (m === 0 && s === 0) assert.equal(pLow, 100, label);
      if (m === 0 && s > 0) assert.equal(pLow, 50, label);
      const verdict = tableVerdict(pLow, pHigh);
      if (gap >= 50) assert.match(verdict, /far more often, \d+% versus \d+%: the table shows a positive association\.$/, label);
      else if (gap <= -50) assert.match(verdict, /far less often, \d+% versus \d+%: the table shows a negative association\.$/, label);
      else if (gap === 25) assert.match(verdict, /just one player ahead, \d+% versus \d+%.*weak evidence of a positive association\.$/, label);
      else if (gap === -25) assert.match(verdict, /just one player behind, \d+% versus \d+%.*weak evidence of a negative association\.$/, label);
      else assert.equal(verdict, `Both rows made 25 or more at the same rate, ${pHigh}%: the table shows no association.`, label);
      if (gap !== 0) assert.ok(verdict.includes(`${pHigh}% versus ${pLow}%`), label);

      for (let hours = PREDICT_MIN; hours <= PREDICT_MAX; hours += 1) {
        states += 1;
        const yHat = m * hours + b;
        assert.equal(predict(m, hours), yHat, `${label} hours=${hours}`);
        assert.ok(yHat >= 7 && yHat <= 43, `${label} hours=${hours}: prediction ${yHat}`);
        // prediction marker (r = 7) and its guide stay inside the viewBox
        const cx = sx(hours);
        const cy = sy(yHat);
        assert.ok(cx - 7 >= 0 && cx + 7 <= W, `${label} hours=${hours}: marker cx ${cx}`);
        assert.ok(cy - 7 >= 0 && cy + 7 <= H, `${label} hours=${hours}: marker cy ${cy}`);
        assert.ok(cx >= PAD_L && cx <= W - PAD_R, label);
        // accessible name is true in this state
        const aria = figureLabel(m, s, hours);
        assert.ok(aria.includes(eq), label);
        assert.ok(aria.includes(m > 0 ? "rising" : m < 0 ? "falling" : "flat"), label);
        assert.ok(aria.includes(`predicts ${yHat} shots for ${hours} ${hours === 1 ? "hour" : "hours"} of practice`), label);
        assert.ok(aria.includes(`scatter level ${s}`), label);
      }
    }
  }
  assert.equal(states, (SLOPE_MAX - SLOPE_MIN + 1) * (SCATTER_MAX - SCATTER_MIN + 1) * (PREDICT_MAX - PREDICT_MIN + 1));
  assert.equal(states, 7 * 4 * 11);
  // labels below and beside the plot stay inside the viewBox
  assert.ok(sy(0) + 16 + 10 <= H, "x tick labels");
  assert.ok(H - 6 <= H && H - 6 - 10 > sy(0) + 16, "x-axis title sits below the tick labels");
  assert.ok(sx(0) - 6 - 14 >= 0, "y tick labels");
  assert.ok(sx(CUT_HOURS - 0.5) > PAD_L && sx(CUT_HOURS - 0.5) < W - PAD_R, "table cut line");
  assert.ok(sy(CENTER) > PAD_T && sy(CENTER) < PAD_T + GH, "table cut line");
});

test("readouts pluralize at every value", () => {
  assert.equal(hoursWord(0), "0 hours");
  assert.equal(hoursWord(1), "1 hour");
  assert.equal(hoursWord(2), "2 hours");
  assert.equal(shotsWord(1), "1 shot");
  assert.equal(shotsWord(2), "2 shots");
  assert.equal(fmtNum(-3), "−3");
  assert.equal(fmtNum(0), "0");
  assert.equal(fmtNum(3), "3");
  assert.equal(slopeRatePhrase(1), "1 shot per extra hour");
  assert.equal(slopeRatePhrase(-1), "−1 shot per extra hour");
  assert.equal(slopeRatePhrase(0), "0 shots per extra hour");
  assert.equal(slopeRatePhrase(3), "3 shots per extra hour");
});

test("worked example values are the ones the arithmetic gives", () => {
  assert.deepEqual(EXAMPLE, { bringTotal: 40, bringVeg: 24, buyTotal: 60, buyVeg: 27 });
  assert.equal(40 + 60, 100);
  assert.equal(24 / 40, 0.6);
  assert.equal((24 * 100) / 40, 60);
  assert.equal(27 / 60, 0.45);
  assert.equal((27 * 100) / 60, 45);
  assert.equal(60 - 45, 15);
  assert.ok(27 > 24, "the raw count is larger for buyers");
  assert.ok(45 < 60, "but the buyers' percentage is smaller");
  const steps = exampleSteps();
  assert.equal(steps.length, 4);
  assert.equal(steps[0].text, "27 buyers ate a vegetable and only 24 bringers did, but there were 60 buyers and just 40 bringers. Counts from groups of different sizes cannot be compared directly.");
  assert.equal(steps[1].text, "Bring lunch: 24 ÷ 40 = 0.6 = 60%. Buy lunch: 27 ÷ 60 = 0.45 = 45%.");
  assert.equal(steps[2].text, "60% − 45% = 15 percentage points. Students who bring lunch ate a vegetable more often, even though fewer of them did in raw numbers.");
  assert.match(steps[3].text, /^The data support the claim: bringing lunch is associated with eating a vegetable, 60% versus 45%\./);
  assert.match(steps[3].text, /not proof that bringing lunch causes it\.$/);
});

test("Try it: the marked choice is the true prediction and each distractor is what its feedback says", () => {
  assert.deepEqual(TRY, { m: 4, b: 10, hours: 5 });
  assert.equal(4 * 5 + 10, 30);
  assert.equal(TRY_ANSWER, 30);
  assert.deepEqual(TRY_CHOICES, [19, 30, 45, 15]);
  assert.equal(new Set(TRY_CHOICES).size, 4);
  assert.equal(TRY_CORRECT, 1);
  assert.equal(TRY_CHOICES[TRY_CORRECT], 30);
  assert.equal(4 + 5 + 10, 19);
  assert.equal(4 * 10 + 5, 45);
  assert.equal(5 + 10, 15);
  assert.equal(tryFeedback(1), "Correct. Substitute x = 5: y = 4 · 5 + 10 = 20 + 10 = 30 shots.");
  assert.match(tryFeedback(0), /^Not quite\. 19 comes from adding 4 \+ 5 \+ 10\./);
  assert.match(tryFeedback(2), /^Not quite\. 45 swaps the roles of the numbers \(4 · 10 \+ 5\)\./);
  assert.match(tryFeedback(3), /^Not quite\. 15 skips the slope: 5 \+ 10 leaves out the 4 shots gained per hour\. y = 4 · 5 \+ 10 = 30\.$/);
  for (let i = 0; i < TRY_CHOICES.length; i += 1) {
    assert.equal(tryFeedback(i).startsWith("Correct"), i === TRY_CORRECT);
  }
});

test("lesson source: standards, svg viewBox, button types, inline control bounds, no CJK", () => {
  const cited = new Set(
    [...source.matchAll(/\b((?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[1])
  );
  assert.ok(cited.size > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of BRIEF_STANDARDS) assert.ok(mathCheck.includes(`(${id})`), `Math check must cite ${id}`);

  const svgTags = [...source.matchAll(/<svg\b[^>]*>/g)];
  assert.equal(svgTags.length, (source.match(/<svg\b/g) ?? []).length);
  assert.ok(svgTags.length >= 1);
  for (const tag of svgTags) {
    assert.match(tag[0], /viewBox=/);
    assert.match(tag[0], /role="img"/);
    assert.match(tag[0], /aria-label=/);
  }

  const buttonCount = (source.match(/<button\b/g) ?? []).length;
  assert.ok(buttonCount >= 5);
  assert.equal((source.match(/<button type="button"/g) ?? []).length, buttonCount, "every <button> must declare type=\"button\"");

  assert.match(source, /label="Slope \(shots per hour\)" value=\{m\} min=\{-3\} max=\{3\}/);
  assert.match(source, /label="Scatter" value=\{s\} min=\{0\} max=\{3\}/);
  assert.match(source, /label="Predict for \(hours\)" value=\{hours\} min=\{0\} max=\{10\}/);
  assert.equal(SLOPE_MIN, -3);
  assert.equal(SLOPE_MAX, 3);
  assert.equal(SCATTER_MIN, 0);
  assert.equal(SCATTER_MAX, 3);
  assert.equal(PREDICT_MIN, 0);
  assert.equal(PREDICT_MAX, 10);

  assert.match(source, /^"use client";/);
  assert.match(source, /aria-controls=\{stepsId\}/);
  assert.match(source, /id=\{stepsId\}/);
  assert.match(source, /aria-pressed=\{pick === i\}/);
  assert.match(source, /a rate, \{slopeRatePhrase\(m\)\}, and an/);
  assert.doesNotMatch(source, /\{fmtNum\(m\)\} shots/);
  assert.doesNotMatch(source, /[぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/);
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/);
  assert.doesNotMatch(source, /bg-linear-|inset-shadow-|text-shadow-|field-sizing-|not-\[|[a-z-]+-\(--/);
});
