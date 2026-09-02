import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  DOT_BASE,
  DOT_LIFT,
  DOT_R,
  DOT_STEP,
  EX_CHECK_WEEK,
  EX_FORECAST_WEEK,
  EX_HEIGHTS,
  EX_WEEKS,
  HOURS,
  H,
  MARK_R,
  MAX_HOURS,
  MAX_SCORE,
  MEAN_HOURS,
  MEAN_SCORE,
  MIN_GAP_PX,
  MODEL_HALF,
  NOISE,
  NOISE_SS,
  HOUR_L,
  HOUR_R,
  PLOT_L,
  PLOT_R,
  PX_PER_POINT,
  SCAT_BASE,
  SCAT_TOP,
  SCORE_LO,
  SCORE_TICKS,
  SLOPE_MAX,
  SLOPE_MIN,
  SPREAD_MAX,
  SPREAD_MIN,
  STUDENT_MAX,
  STUDENT_MIN,
  SXX,
  TRY_HEIGHT,
  TRY_WEEK,
  W,
  X_PER_POINT,
  centerSentence,
  cmWord,
  correlation,
  exampleFit,
  figureLabel,
  hourX,
  hoursWord,
  intercept,
  layout,
  mean,
  median,
  modelText,
  num,
  pointsWord,
  predicted,
  rText,
  residualSentence,
  scoreX,
  scoreY,
  scores,
  slopeSentence,
  strengthPhrase,
  summarize,
  tryAnswerIndex,
  tryChoices,
} from "./ca-g9-ch05-modeling-evidence";

const SLUG = "ca-g9-ch05-modeling-evidence";
const BRIEF_STANDARDS = ["S-ID.1", "S-ID.2", "S-ID.3", "S-ID.4", "S-ID.5", "S-ID.6", "S-ID.7", "S-ID.8", "S-ID.9"];
const EPS = 1e-12;

/** Independent sort-and-pick median, written out rather than reusing the lesson helper. */
function medianOf(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[(sorted.length - 1) / 2];
}

test("the data design makes the drawn line the exact least-squares line", () => {
  assert.deepEqual(HOURS, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(NOISE, [2, -1, -1, 1, -2, 1, -1, -1, 2]);
  // mean hours = 36 / 9 = 4
  assert.equal(HOURS.reduce((a, b) => a + b, 0), 36);
  assert.equal(MEAN_HOURS, 4);
  // 2 - 1 - 1 + 1 - 2 + 1 - 1 - 1 + 2 = 0, so the noise never moves the mean score
  assert.equal(NOISE.reduce((a, b) => a + b, 0), 0);
  // (-4)(2) + (-3)(-1) + (-2)(-1) + (-1)(1) + 0(-2) + (1)(1) + (2)(-1) + (3)(-1) + (4)(2) = -8+3+2-1+0+1-2-3+8 = 0
  assert.equal(HOURS.reduce((sum, h, i) => sum + (h - 4) * NOISE[i], 0), 0);
  // 16+9+4+1+0+1+4+9+16 = 60 and 4+1+1+1+4+1+1+1+4 = 18
  assert.equal(HOURS.reduce((sum, h) => sum + (h - 4) ** 2, 0), 60);
  assert.equal(SXX, 60);
  assert.equal(NOISE.reduce((sum, e) => sum + e * e, 0), 18);
  assert.equal(NOISE_SS, 18);
  assert.deepEqual([SLOPE_MIN, SLOPE_MAX, SPREAD_MIN, SPREAD_MAX, STUDENT_MIN, STUDENT_MAX], [-3, 3, 1, 4, 1, 9]);
  // Every residual is spread x NOISE[i], so the smallest one the controls can produce is 1 x 1 = 1 point.
  const everyResidual = new Set<number>();
  for (let spread = SPREAD_MIN; spread <= SPREAD_MAX; spread += 1) for (const e of NOISE) everyResidual.add(Math.abs(spread * e));
  assert.deepEqual([...everyResidual].sort((a, b) => a - b), [1, 2, 3, 4, 6, 8]);
  assert.equal(Math.min(...everyResidual), 1, "the figure has to stay readable at a residual of one point");
});

test("the score axis is scaled to the reachable band, so one point is ten pixels", () => {
  // Sweep the whole grid by hand: score i = 30 + slope x (hours - 4) + spread x NOISE[i].
  let lo = Infinity, hi = -Infinity;
  for (let slope = -3; slope <= 3; slope += 1) {
    for (let spread = 1; spread <= 4; spread += 1) {
      for (let i = 0; i < 9; i += 1) {
        const v = 30 + slope * (HOURS[i] - 4) + spread * NOISE[i];
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  }
  assert.deepEqual([lo, hi], [17, 50], "the reachable scores run 17 to 50, so an axis from 0 wastes a third of the panel");
  assert.ok(SCORE_LO <= lo && SCORE_LO === 15, "the axis starts just below the lowest reachable score");
  assert.equal(MAX_SCORE, 50);
  // 350 px of scatter for the 35 points from 15 to 50 is exactly 10 px per point.
  assert.equal(SCAT_BASE - SCAT_TOP, 350);
  assert.equal(MAX_SCORE - SCORE_LO, 35);
  assert.equal(350 / 35, 10);
  assert.equal(PX_PER_POINT, 10);
  assert.ok(Math.abs(X_PER_POINT - 356 / 35) < EPS);
  assert.equal(PLOT_R - PLOT_L, 356);
  // The hours axis is inset inside the frame: at 0 hours a residual drawn on x = PLOT_L would sit exactly on the
  // y-axis, in the same colour, and disappear. 64 leaves 16 px of clear ground for it.
  assert.deepEqual([HOUR_L, HOUR_R], [64, 396]);
  assert.equal(HOUR_L - PLOT_L, 16);
  assert.equal(PLOT_R - HOUR_R, 8);
  for (const h of HOURS) assert.ok(Math.abs(hourX(h) - (64 + (h / 8) * 332)) < EPS, `the ${h}-hour column is not where the inset axis puts it`);
  // Both axes are drawn on the same 15-to-50 band, so the two panels line up.
  assert.deepEqual(SCORE_TICKS, [15, 20, 25, 30, 35, 40, 45, 50]);
  for (const v of SCORE_TICKS) {
    assert.equal(scoreY(v), 482 - (v - 15) * 10);
    assert.ok(Math.abs(scoreX(v) - (48 + (v - 15) * (356 / 35))) < EPS);
    assert.ok(scoreY(v) >= SCAT_TOP && scoreY(v) <= SCAT_BASE);
    assert.ok(scoreX(v) >= PLOT_L && scoreX(v) <= PLOT_R);
  }
  assert.equal(scoreY(SCORE_LO), SCAT_BASE);
  assert.equal(scoreY(MAX_SCORE), SCAT_TOP);
  assert.equal(scoreX(SCORE_LO), PLOT_L);
  assert.ok(Math.abs(scoreX(MAX_SCORE) - PLOT_R) < EPS);
  // The marker radius and the fitted line's half-stroke are what eat into a residual segment.
  assert.equal(MARK_R, 3);
  assert.equal(MODEL_HALF, 1);
  assert.equal(MIN_GAP_PX, 6);
  assert.equal(1 * 10 - 3 - 1, 6, "a one-point residual leaves six bare pixels once the marker and the line are subtracted");
});

test("formatting helpers read correctly at every value they can take", () => {
  assert.equal(num(3), "3");
  assert.equal(num(0), "0");
  assert.equal(num(-2), "−2");
  assert.equal(pointsWord(1), "1 point");
  assert.equal(pointsWord(-1), "−1 point");
  assert.equal(pointsWord(0), "0 points");
  assert.equal(pointsWord(7), "7 points");
  assert.equal(hoursWord(1), "1 hour");
  assert.equal(hoursWord(0), "0 hours");
  assert.equal(hoursWord(8), "8 hours");
  assert.equal(cmWord(-2), "−2 cm");
  assert.equal(rText(0), "0.00");
  assert.equal(rText(-0.87707), "−0.88");
  assert.equal(mean([1, 2, 3, 4]), 2.5);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.deepEqual(summarize([2, 9, 4]), { mean: 5, median: 4, low: 2, high: 9, range: 7 });
  assert.equal(strengthPhrase(0), "no linear association at all");
  assert.equal(strengthPhrase(0.9), "a strong positive linear association");
  assert.equal(strengthPhrase(-0.9), "a strong negative linear association");
  assert.equal(strengthPhrase(0.5), "a moderate positive linear association");
  assert.equal(strengthPhrase(-0.3), "a weak negative linear association");
  // the three shapes of the model equation
  assert.equal(modelText(0), "score = 30");
  assert.equal(modelText(1), "score = hours + 26");
  assert.equal(modelText(-1), "score = −hours + 34");
  assert.equal(modelText(3), "score = 3 × hours + 18");
  assert.equal(modelText(-2), "score = −2 × hours + 38");
  // mean − median = 0 case, phrased without a direction
  assert.match(centerSentence([28, 30, 32]), /^Mean and median agree at 30/u);
  assert.match(centerSentence([10, 20, 60]), /The mean 30 sits 10 points above the median 20/u);
  assert.match(centerSentence([0, 40, 50]), /The mean 30 sits 10 points below the median 40/u);
});

test("every reachable control state keeps the two panels true, visible and inside the viewBox", () => {
  const seenStrength = new Set<string>();
  let states = 0;
  let tightestGap = Infinity;

  for (let slope = SLOPE_MIN; slope <= SLOPE_MAX; slope += 1) {
    // b = 30 − 4 × slope, always a positive score, so "+ b" in the equation is never wrong
    const b = MEAN_SCORE - MEAN_HOURS * slope;
    assert.equal(intercept(slope), b);
    assert.ok(b > 0 && b <= MAX_SCORE, `intercept ${b} must be a possible score`);
    for (const h of HOURS) assert.equal(predicted(slope, h), slope * h + b);

    for (let spread = SPREAD_MIN; spread <= SPREAD_MAX; spread += 1) {
      // Independent construction of the nine scores: 30 + slope × (hours − 4) + spread × noise.
      const expected = HOURS.map((h, i) => 30 + slope * (h - 4) + spread * NOISE[i]);
      const values = scores(slope, spread);
      assert.deepEqual(values, expected);
      for (const v of values) assert.ok(v >= SCORE_LO && v <= MAX_SCORE, `score ${v} is off the drawn ${SCORE_LO}-to-${MAX_SCORE} axis`);

      // Least squares recomputed from the nine points themselves.
      const xbar = mean(HOURS);
      const ybar = values.reduce((a, v) => a + v, 0) / values.length;
      const sxy = HOURS.reduce((sum, h, i) => sum + (h - xbar) * (values[i] - ybar), 0);
      const sxx = HOURS.reduce((sum, h) => sum + (h - xbar) ** 2, 0);
      const syy = values.reduce((sum, v) => sum + (v - ybar) ** 2, 0);
      assert.equal(ybar, MEAN_SCORE, "the mean score is 30 in every state");
      assert.equal(values.reduce((a, v) => a + v, 0), 270);
      assert.equal(sxx, 60);
      assert.equal(sxy, 60 * slope);
      assert.equal(syy, 60 * slope * slope + 18 * spread * spread);
      assert.equal(sxy / sxx, slope, "the fitted slope is the control value");
      assert.equal(ybar - (sxy / sxx) * xbar, b, "the fitted intercept is 30 − 4 × slope");

      // Residuals: exactly spread × noise, never zero, summing to zero and uncorrelated with hours.
      const residuals = values.map((v, i) => v - predicted(slope, HOURS[i]));
      assert.deepEqual(residuals, NOISE.map((e) => spread * e));
      assert.equal(residuals.reduce((a, v) => a + v, 0), 0);
      assert.equal(HOURS.reduce((sum, h, i) => sum + (h - 4) * residuals[i], 0), 0);
      for (const r of residuals) assert.notEqual(r, 0, "every student is off the line, so no residual sentence says zero");

      // One-variable summary.
      const s = summarize(values);
      assert.equal(s.mean, 30);
      assert.equal(s.median, medianOf(values));
      assert.equal(s.low, Math.min(...values));
      assert.equal(s.high, Math.max(...values));
      assert.equal(s.range, s.high - s.low);
      assert.ok(Number.isInteger(s.median));
      // mean − median is exactly the average signed distance from the median, so the sentence's direction is provable.
      const signedTotal = values.reduce((sum, v) => sum + (v - s.median), 0);
      assert.equal(9 * (s.mean - s.median), signedTotal);
      const sentence = centerSentence(values);
      if (signedTotal === 0) assert.match(sentence, /^Mean and median agree at 30/u);
      else assert.match(sentence, new RegExp(`^The mean 30 sits ${Math.abs(s.mean - s.median)} points? ${signedTotal > 0 ? "above" : "below"} the median ${s.median}`, "u"));

      // Correlation.
      const r = correlation(slope, spread);
      assert.ok(Math.abs(r - sxy / Math.sqrt(sxx * syy)) < EPS, "r is Sxy over the root of Sxx times Syy");
      assert.ok(Math.abs(r) <= 1 + EPS, `r = ${r} left the interval −1 to 1`);
      // r² = 3600·slope² / (60 · (60·slope² + 18·spread²)) = 10·slope² / (10·slope² + 3·spread²)
      assert.ok(Math.abs(r * r - (10 * slope * slope) / (10 * slope * slope + 3 * spread * spread)) < EPS);
      assert.equal(Math.sign(r), Math.sign(slope), "r shares the sign of the slope");
      const phrase = strengthPhrase(r);
      for (const word of ["none", "weak", "moderate", "strong"]) {
        if (word === "none" ? phrase === "no linear association at all" : phrase.includes(word)) seenStrength.add(word);
      }
      if (slope === 0) assert.equal(phrase, "no linear association at all");
      else {
        assert.ok(phrase.includes(slope > 0 ? "positive" : "negative"));
        assert.ok(phrase.includes(Math.abs(r) >= 0.8 ? "strong" : Math.abs(r) >= 0.5 ? "moderate" : "weak"));
      }

      // Pixels: dot plot above, scatter below, everything inside the 420 × 512 viewBox.
      const L = layout(slope, spread);
      assert.deepEqual(L.values, expected);
      const stacks = new Map<number, number>();
      for (const d of L.dots) {
        const rank = stacks.get(d.value) ?? 0;
        stacks.set(d.value, rank + 1);
        assert.ok(Math.abs(d.x - (48 + (d.value - 15) * (356 / 35))) < EPS, `dot at ${d.value} is not on the 15-to-50 score axis`);
        assert.equal(d.y, DOT_BASE - DOT_LIFT - rank * DOT_STEP);
        assert.ok(d.x >= PLOT_L && d.x <= PLOT_R, `dot at ${d.value} left the score axis`);
        assert.ok(d.x - DOT_R >= 0 && d.x + DOT_R <= W, `dot at ${d.value} left the viewBox`);
        assert.ok(d.y - DOT_R >= 0 && d.y + DOT_R <= DOT_BASE, `dot at ${d.value} left the dot-plot strip`);
        // The median marker is drawn on top of the stack and starts 52 px above the axis, so a full stack cannot hide it.
        assert.ok(d.y - DOT_R > DOT_BASE - 52, `a dot at ${d.value} reached above the top of the median marker`);
      }
      assert.ok(Math.max(...stacks.values()) <= 4, "no score is repeated more than four times, so a stack never overflows");
      assert.ok(scoreX(s.median) >= PLOT_L && scoreX(s.median) <= PLOT_R, "the median line stays on the axis");
      assert.ok(scoreX(s.mean) - 5 >= PLOT_L && scoreX(s.mean) + 5 <= PLOT_R, "the mean triangle stays on the axis");

      const ringX = hourX(MEAN_HOURS), ringY = 482 - (30 - 15) * 10;
      assert.equal(scoreY(MEAN_SCORE), ringY);
      for (const [i, p] of L.points.entries()) {
        const residual = spread * NOISE[i];
        const yHand = 482 - (expected[i] - 15) * 10;
        const modelHand = 30 + slope * (HOURS[i] - 4);
        const yModelHand = 482 - (modelHand - 15) * 10;
        assert.equal(p.model, modelHand);
        assert.ok(Math.abs(p.x - (64 + (HOURS[i] / 8) * 332)) < EPS, `the ${HOURS[i]}-hour column moved`);
        assert.ok(p.x - PLOT_L >= 12, "a residual must not be painted down the y-axis, where it reads as the axis");
        assert.equal(p.y, yHand);
        assert.equal(p.yModel, yModelHand);
        assert.ok(p.x >= PLOT_L && p.x <= PLOT_R, `point at ${p.hours} hours left the plot`);
        assert.ok(p.x - MARK_R >= 0 && p.x + MARK_R <= W, `the marker for ${p.hours} hours left the viewBox`);
        assert.ok(p.y >= SCAT_TOP && p.y <= SCAT_BASE, `score ${p.value} left the plot vertically`);
        assert.ok(p.y - MARK_R >= 0 && p.y + MARK_R <= H, `the marker for score ${p.value} left the viewBox`);
        assert.ok(p.yModel >= SCAT_TOP && p.yModel <= SCAT_BASE, `prediction ${p.model} left the plot vertically`);

        // The residual is drawn as the BARE run: it starts MARK_R past the marker and stops MODEL_HALF short of
        // the fitted line, so this length is what a reader actually sees. A positive residual sits above the
        // line, which on screen is a SMALLER y, so the segment runs downward from the marker.
        const dirHand = residual > 0 ? 1 : -1;
        assert.equal(p.gapY1, yHand + dirHand * 3);
        assert.equal(p.gapY2, yModelHand - dirHand * 1);
        assert.equal(p.gap, Math.abs(residual) * 10 - 3 - 1);
        assert.equal(Math.abs(p.gapY2 - p.gapY1), p.gap);
        assert.ok(p.gap >= MIN_GAP_PX, `student ${i + 1} at slope ${slope}, spread ${spread} shows only ${p.gap} px of residual`);
        assert.ok(Math.min(p.gapY1, p.gapY2) >= SCAT_TOP && Math.max(p.gapY1, p.gapY2) <= SCAT_BASE, "a residual segment left the plot");
        // The segment lies strictly between the marker and the line, in that order.
        assert.ok(Math.abs(p.gapY1 - yHand) === 3 && Math.abs(p.gapY2 - yModelHand) === 1);
        assert.ok((p.gapY1 - yHand) * (yModelHand - yHand) > 0, "the segment must start toward the line, not away from it");
        tightestGap = Math.min(tightestGap, p.gap);

        // The point-of-averages ring (radius 9, 2 px stroke) must never enclose or crowd a data marker.
        const distance = Math.hypot(p.x - ringX, p.y - ringY);
        assert.ok(distance - MARK_R - (9 + 1) >= 6, `the ring comes within ${distance} px of the marker for ${p.hours} hours`);
      }
      for (const end of [predicted(slope, 0), predicted(slope, MAX_HOURS)]) {
        assert.ok(scoreY(end) >= SCAT_TOP && scoreY(end) <= SCAT_BASE, `the line ends at ${end}, off the plot`);
      }

      for (let student = STUDENT_MIN; student <= STUDENT_MAX; student += 1) {
        states += 1;
        const i = student - 1;
        const actual = 30 + slope * (HOURS[i] - 4) + spread * NOISE[i];
        const model = 30 + slope * (HOURS[i] - 4);
        const residual = spread * NOISE[i];
        assert.equal(values[i], actual);
        assert.equal(predicted(slope, HOURS[i]), model);
        assert.equal(actual - model, residual);
        const text = residualSentence(slope, spread, student);
        assert.ok(text.includes(`Student ${student} practiced ${hoursWord(HOURS[i])} and scored ${actual}`), text);
        assert.ok(text.includes(`Residual = ${actual} − ${model} = ${num(residual)}`), text);
        assert.ok(text.includes(residual > 0 ? "under-predicts" : "over-predicts"), text);
        assert.ok(text.endsWith(`by ${Math.abs(residual)} ${Math.abs(residual) === 1 ? "point" : "points"}.`), text);

        const label = figureLabel(slope, spread, student);
        assert.ok(label.includes(`runs from ${s.low} to ${s.high}`), label);
        assert.ok(label.includes(`mean 30 and a dashed line at the median ${s.median}`), label);
        assert.ok(label.includes(`least-squares line ${modelText(slope)}`), label);
        assert.ok(label.includes(`r = ${rText(r)}`), label);
        // Every mark the figure draws has to be named for a reader who cannot see it, the ring included.
        assert.ok(label.includes("A ring marks the point of averages, 4 hours and 30 points"), label);
        assert.ok(label.includes("a vertical gap runs from each point down or up to the line"), label);
        assert.ok(label.includes(`Student ${student} is highlighted: ${hoursWord(HOURS[i])} of practice, an actual score of ${actual}, a predicted score of ${model}`), label);
      }

      const slopeText = slopeSentence(slope);
      if (slope === 0) assert.equal(slopeText, `slope 0 means the model predicts 30 points for every student, however long they practiced`);
      else assert.equal(slopeText, `slope ${num(slope)} means one more hour of practice goes with ${Math.abs(slope)} ${Math.abs(slope) === 1 ? "point" : "points"} ${slope > 0 ? "more" : "fewer"} in the prediction, and intercept ${b} is the prediction at 0 hours`);
    }
  }

  assert.equal(states, 7 * 4 * 9);
  assert.equal(tightestGap, 6, "the worst case across all 252 states is a six-pixel visible residual");
  assert.deepEqual([...seenStrength].sort(), ["moderate", "none", "strong", "weak"], "all four strength readings are reachable");
});

test("the worked example is recomputed from the five measurements", () => {
  assert.deepEqual(EX_WEEKS, [0, 1, 2, 3, 4]);
  assert.deepEqual(EX_HEIGHTS, [15, 16, 20, 22, 27]);
  const ex = exampleFit();
  // mean week = (0+1+2+3+4)/5 = 10/5 = 2; mean height = (15+16+20+22+27)/5 = 100/5 = 20
  assert.equal((0 + 1 + 2 + 3 + 4) / 5, 2);
  assert.equal((15 + 16 + 20 + 22 + 27) / 5, 20);
  assert.equal(ex.mw, 2);
  assert.equal(ex.mh, 20);
  // Sxy = (−2)(−5) + (−1)(−4) + (0)(0) + (1)(2) + (2)(7) = 10 + 4 + 0 + 2 + 14 = 30
  assert.equal(-2 * -5 + -1 * -4 + 0 * 0 + 1 * 2 + 2 * 7, 30);
  assert.equal(ex.sxy, 30);
  // Sxx = 4 + 1 + 0 + 1 + 4 = 10
  assert.equal(4 + 1 + 0 + 1 + 4, 10);
  assert.equal(ex.sxx, 10);
  // slope = 30 / 10 = 3; intercept = 20 − 3 × 2 = 14
  assert.equal(30 / 10, 3);
  assert.equal(ex.slope, 3);
  assert.equal(20 - 3 * 2, 14);
  assert.equal(ex.b, 14);
  // predictions 3w + 14 at w = 0..4, then residuals actual − predicted
  assert.deepEqual(ex.fits, [14, 17, 20, 23, 26]);
  assert.deepEqual(EX_WEEKS.map((w) => 3 * w + 14), ex.fits);
  assert.deepEqual(ex.residuals, [1, -1, 0, -1, 1]);
  assert.deepEqual(EX_HEIGHTS.map((h, i) => h - (3 * EX_WEEKS[i] + 14)), ex.residuals);
  assert.equal(ex.residuals.reduce((a, b) => a + b, 0), 0);
  assert.equal(EX_WEEKS.reduce((sum, w, i) => sum + (w - 2) * ex.residuals[i], 0), 0);
  // Step 4 no longer offers that zero as evidence; it compares the worst residual with the growth measured.
  assert.equal(Math.max(...ex.residuals.map((r) => Math.abs(r))), 1);
  assert.equal(EX_HEIGHTS[EX_HEIGHTS.length - 1] - EX_HEIGHTS[0], 27 - 15);
  assert.equal(27 - 15, 12);
  // step 5: week 4 measured 27 against a prediction of 3 × 4 + 14 = 26, residual +1
  assert.equal(EX_CHECK_WEEK, 4);
  assert.equal(EX_HEIGHTS[EX_CHECK_WEEK], 27);
  assert.equal(ex.fitted(EX_CHECK_WEEK), 26);
  assert.equal(EX_HEIGHTS[EX_CHECK_WEEK] - ex.fitted(EX_CHECK_WEEK), 1);
  assert.equal(cmWord(EX_HEIGHTS[EX_CHECK_WEEK] - ex.fitted(EX_CHECK_WEEK)), "1 cm");
  // step 6: week 6 extrapolates to 3 × 6 + 14 = 32, beyond the last measured week
  assert.equal(EX_FORECAST_WEEK, 6);
  assert.equal(3 * 6 + 14, 32);
  assert.equal(ex.fitted(EX_FORECAST_WEEK), 32);
  assert.ok(EX_FORECAST_WEEK > EX_WEEKS[EX_WEEKS.length - 1]);
});

test("the Try it answer is the only choice equal to actual minus predicted", () => {
  assert.equal(TRY_WEEK, 3);
  assert.equal(TRY_HEIGHT, 21);
  // prediction 3 × 3 + 14 = 23; gap 21 − 23 = −2
  assert.equal(3 * 3 + 14, 23);
  assert.equal(21 - 23, -2);
  // The second pot is not one of the fitted weeks, so its gap is a prediction error, not a residual.
  assert.ok(!EX_WEEKS.includes(TRY_WEEK) || EX_HEIGHTS[TRY_WEEK] !== TRY_HEIGHT);
  assert.notEqual(TRY_HEIGHT, EX_HEIGHTS[TRY_WEEK]);
  const choices = tryChoices();
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices.map((c) => c.value)).size, 4, "the four choices are distinct");
  assert.equal(tryAnswerIndex(), 1);
  assert.equal(choices[tryAnswerIndex()].value, -2);
  assert.equal(choices[tryAnswerIndex()].why, "correct");
  assert.equal(choices.filter((c) => c.why === "correct").length, 1);
  assert.deepEqual(choices.map((c) => c.value), [2, -2, 21, 23]);
  assert.deepEqual(choices.map((c) => cmWord(c.value)), ["2 cm", "−2 cm", "21 cm", "23 cm"]);
});

test("lesson source cites only what it develops and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);
  const lineCount = source.replace(/\n$/u, "").split("\n").length;
  assert.ok(lineCount >= 120 && lineCount <= 260, `lesson is ${lineCount} lines`);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["S-ID.1", "S-ID.3", "S-ID.6", "S-ID.7", "S-ID.8", "S-ID.9"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }
  // S-ID.2 is "compare center and spread of two or more data sets". This lesson shows exactly one data set in
  // all 252 states and never asks for a comparison, so citing it would be a name-drop; the chapter brief gives
  // it to Comparing Distributions, and the roadmap hands it over there in prose.
  assert.ok(!cited.includes("S-ID.2"), "S-ID.2 must not be cited by a lesson with only one data set on screen");
  assert.match(source, /two data sets finally sit\s+side by side/u);

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

  assert.match(source, /label="Points per hour" value=\{slope\} min=\{-3\} max=\{3\}/u);
  assert.match(source, /label="Off-the-line spread" value=\{spread\} min=\{1\} max=\{4\}/u);
  assert.match(source, /label="Highlight student" value=\{student\} min=\{1\} max=\{9\}/u);
  assert.match(source, /aria-expanded=\{step > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{choice === i\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.equal(W, 420);
  assert.equal(H, 512);
  assert.match(source, /viewBox=\{`0 0 \$\{W\} \$\{H\}`\}/u);

  // The residual gaps are the figure's whole S-ID.6 payload, so the markup that decides whether they are
  // visible is pinned here: solid strokes over the bare run, a 2 px fitted line, and MARK_R-sized markers.
  assert.match(source, /x1=\{p\.x\} y1=\{p\.gapY1\} x2=\{p\.x\} y2=\{p\.gapY2\}/u);
  assert.match(source, /stroke=\{LINE_C\} strokeWidth=\{MODEL_HALF \* 2\}/u);
  assert.match(source, /cx=\{p\.x\} cy=\{p\.y\} r=\{MARK_R\}/u);
  assert.equal(source.split("strokeDasharray").length - 1, 1, "only the median marker is dashed, so no residual run can land inside a dash gap");
  assert.ok(!source.includes("dashed gap"), "the copy must not promise dashes the residuals no longer use");
  const gapIndex = source.indexOf("p.gapY1"), markerIndex = source.indexOf("r={MARK_R}");
  assert.ok(gapIndex > 0 && markerIndex > gapIndex, "the markers are painted after the gaps, which is what MARK_R accounts for");

  // The median marker is painted after the dot stack and starts above the tallest reachable stack of four.
  const dotsIndex = source.indexOf("{L.dots.map("), medianIndex = source.indexOf('strokeDasharray="4 3"');
  assert.ok(dotsIndex > 0 && medianIndex > dotsIndex, "the median line must be drawn after the dots so the stack cannot hide it");
  assert.equal(DOT_BASE - DOT_LIFT - 3 * DOT_STEP - DOT_R, 31, "a full stack of four tops out 31 px from the top of the box");
  assert.ok(DOT_BASE - 52 < 31, "the median marker has to start above that");
  assert.match(source, /y1=\{DOT_BASE - 52\}/u);

  // The point-of-averages ring is named in the caption, in the panel, and in the aria-label.
  assert.match(source, /a ring at the point of averages/u);
  assert.match(source, /ring = point of averages/u);

  // The residual identity is stated as an identity, not as evidence of fit.
  assert.match(source, /as the residuals of any least-squares line must/u);
  assert.match(source, /an identity every least-squares line/u);
  // The Try it names the second pot's gap for what it is.
  assert.match(source, /prediction error rather than one of the model&apos;s residuals/u);

  assert.doesNotMatch(source, /[぀-ヿ㐀-鿿]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
  assert.doesNotMatch(source, /bg-linear-|inset-shadow-|text-shadow-|field-sizing-|not-\[/u, "Tailwind 3.4 only");
});
