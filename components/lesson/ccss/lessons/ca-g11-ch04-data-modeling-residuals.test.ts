import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  DOT_R,
  DOT_STEP,
  DOT_X0,
  EX_A,
  EX_B,
  EX_POINTS,
  GW,
  H,
  INTERCEPT_MAX,
  INTERCEPT_MIN,
  MAX_STACK,
  OFFSETS,
  PAD_L,
  PAD_R,
  R_BOT,
  R_MAX,
  R_MID,
  R_TOP,
  ROUTE_MAX,
  ROUTE_MIN,
  SC_BOT,
  SC_TOP,
  SHAPE_KEYS,
  SHAPE_LABEL,
  SLOPE_MAX,
  SLOPE_MIN,
  TRUE_B,
  TRUE_M,
  TRY,
  TRY_ANSWER,
  TRY_CHOICES,
  TRY_CORRECT,
  TRY_PREDICTED,
  W,
  X_MAX,
  XS,
  Y_MAX,
  compareSentence,
  exPredictions,
  exResiduals,
  exSsr,
  exSum,
  exampleSteps,
  figureLabel,
  fitVerdict,
  fmtNum,
  meanResidual,
  minutesWord,
  observedAt,
  outlierIndices,
  outlierNote,
  packagesWord,
  predictedAt,
  quartiles,
  rangeOf,
  residualsFor,
  routeSentence,
  slopeSentence,
  spreadSentence,
  ssrFor,
  stackX,
  tryFeedback,
  sx,
  sy,
  ry
} from "./ca-g11-ch04-data-modeling-residuals";

const BRIEF_STANDARDS = ["S-ID.1", "S-ID.2", "S-ID.3", "S-ID.4", "S-ID.5", "S-ID.6", "S-ID.7", "S-ID.8", "S-ID.9"];
const CITED_STANDARDS = ["S-ID.1", "S-ID.2", "S-ID.3", "S-ID.6", "S-ID.7"];
/** The seven chapter lessons the roadmap paragraph must orient the student to. */
const BRIEF_LESSON_TITLES = [
  "Dot Plots, Histograms, Box Plots",
  "Comparing Distributions",
  "The Normal Distribution",
  "Two-Way Frequency Tables",
  "Fitting a Line &amp; Residuals",
  "Interpreting Slope &amp; Intercept",
  "Correlation, Not Causation"
];
const source = readFileSync(
  path.join(process.cwd(), "components/lesson/ccss/lessons/ca-g11-ch04-data-modeling-residuals.tsx"),
  "utf8"
);

/** Independent copies of the three weeks the lesson must keep. */
const EXPECTED_OFFSETS: Record<string, number[]> = {
  ordinary: [1, -2, 2, -1, 1, -2, 0, 1],
  ends: [5, 1, -2, -4, -4, -2, 1, 5],
  closure: [-1, -1, -1, 6, -1, -1, -1, 0]
};
/** The route times a reader can add up by hand: 5x + 12 + offset. */
const EXPECTED_TIMES: Record<string, number[]> = {
  ordinary: [18, 20, 29, 31, 38, 40, 47, 53],
  ends: [22, 23, 25, 28, 33, 40, 48, 57],
  closure: [16, 21, 26, 38, 36, 41, 46, 52]
};
const EXPECTED_BEST_SSR: Record<string, number> = { ordinary: 16, ends: 92, closure: 42 };

function total(values: number[]) {
  let sum = 0;
  for (const v of values) sum += v;
  return sum;
}

/** Independent re-implementations of the lesson's two formatters. */
function num(n: number) {
  return n < 0 ? `−${-n}` : `${n}`;
}
function mins(n: number) {
  return n === 1 ? "1 minute" : `${n} minutes`;
}

/** Squared residual total written straight from the definition, no lesson helper. */
function ssrDirect(times: number[], m: number, b: number) {
  let sum = 0;
  for (let i = 0; i < times.length; i += 1) {
    const miss = times[i] - (m * (i + 1) + b);
    sum += miss * miss;
  }
  return sum;
}

/** Quartiles of eight numbers, written out: sort, then average the 2nd/3rd and 6th/7th. */
function quartilesDirect(values: number[]) {
  assert.equal(values.length, 8, "these quartiles are only defined for the eight residuals");
  const sorted = values.slice().sort((p, q) => p - q);
  const q1 = (sorted[1] + sorted[2]) / 2;
  const q3 = (sorted[5] + sorted[6]) / 2;
  return { sorted, q1, q3, iqr: q3 - q1 };
}

/** The 1.5-IQR fence rule, written out. */
function outliersDirect(values: number[]) {
  const { q1, q3, iqr } = quartilesDirect(values);
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  const flagged: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] < low || values[i] > high) flagged.push(i);
  }
  return flagged;
}

/** Ordinary least squares from the definitions. */
function leastSquares(xs: number[], ys: number[]) {
  const n = xs.length;
  const xBar = total(xs) / n;
  const yBar = total(ys) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - xBar) * (ys[i] - yBar);
    sxx += (xs[i] - xBar) * (xs[i] - xBar);
  }
  const slope = sxy / sxx;
  return { slope, intercept: yBar - slope * xBar };
}

test("the three weeks, the route times and the drawing frame are the audited ones", () => {
  assert.deepEqual(XS, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(TRUE_M, 5);
  assert.equal(TRUE_B, 12);
  assert.deepEqual(SHAPE_KEYS, ["ordinary", "ends", "closure"]);
  for (const key of SHAPE_KEYS) {
    const offsets = EXPECTED_OFFSETS[key];
    assert.deepEqual(OFFSETS[key], offsets, key);
    assert.equal(offsets.length, 8, key);
    // both conditions that make y = 5x + 12 the least-squares line for this week
    assert.equal(total(offsets), 0, `${key}: misses must cancel overall`);
    assert.equal(total(offsets.map((e, i) => e * XS[i])), 0, `${key}: package-weighted misses must cancel`);
    const times = EXPECTED_TIMES[key];
    for (let i = 0; i < 8; i += 1) {
      assert.equal(times[i], 5 * (i + 1) + 12 + offsets[i], `${key} route ${i + 1}`);
      assert.equal(observedAt(key, i), times[i], `${key} route ${i + 1}`);
    }
    assert.equal(total(times), 276, key);
    // the least-squares line of the eight plotted points really is y = 5x + 12
    const fit = leastSquares(XS, times);
    assert.equal(fit.slope, 5, `${key}: least-squares slope`);
    assert.equal(fit.intercept, 12, `${key}: least-squares intercept`);
    assert.equal(ssrDirect(times, 5, 12), EXPECTED_BEST_SSR[key], key);
    assert.equal(ssrFor(key, 5, 12), EXPECTED_BEST_SSR[key], key);
    assert.equal(total(offsets.map((e) => e * e)), EXPECTED_BEST_SSR[key], key);
    assert.equal(SHAPE_LABEL[key].length > 0, true, key);
  }
  assert.equal(EXPECTED_BEST_SSR.ordinary, 1 + 4 + 4 + 1 + 1 + 4 + 0 + 1);
  assert.equal(EXPECTED_BEST_SSR.ends, 25 + 1 + 4 + 16 + 16 + 4 + 1 + 25);
  assert.equal(EXPECTED_BEST_SSR.closure, 1 + 1 + 1 + 36 + 1 + 1 + 1 + 0);
  // the "ends" week really is a U and not an arch: it falls, then rises, and it is symmetric
  for (let i = 0; i < 3; i += 1) {
    assert.ok(EXPECTED_OFFSETS.ends[i] > EXPECTED_OFFSETS.ends[i + 1], `ends must fall from route ${i + 1} to route ${i + 2}`);
    assert.ok(EXPECTED_OFFSETS.ends[i + 4] < EXPECTED_OFFSETS.ends[i + 5], `ends must rise from route ${i + 5} to route ${i + 6}`);
    assert.equal(EXPECTED_OFFSETS.ends[i], EXPECTED_OFFSETS.ends[7 - i], "the U is symmetric");
  }
  assert.ok(
    Math.max(EXPECTED_OFFSETS.ends[0], EXPECTED_OFFSETS.ends[7]) > Math.min(EXPECTED_OFFSETS.ends[3], EXPECTED_OFFSETS.ends[4]),
    "high at the ends, low in the middle"
  );
  assert.equal(EXPECTED_OFFSETS.ends.filter((e) => e > 0).length, 4, "the U week is high at both ends");
  assert.deepEqual([EXPECTED_OFFSETS.ends[0], EXPECTED_OFFSETS.ends[7]], [5, 5]);
  assert.deepEqual([EXPECTED_OFFSETS.ends[3], EXPECTED_OFFSETS.ends[4]], [-4, -4]);
  assert.equal(EXPECTED_OFFSETS.closure.filter((e) => Math.abs(e) <= 1).length, 7, "the closure week has seven near misses");
  assert.equal(Math.max(...EXPECTED_OFFSETS.closure), 6);

  // drawing frame
  assert.equal(W, PAD_L + GW + 56 + PAD_R);
  assert.equal(W, 420);
  assert.equal(H, 396);
  assert.equal(SC_BOT, SC_TOP + 190);
  assert.equal(R_TOP, R_MID - 55);
  assert.equal(R_BOT, R_MID + 55);
  assert.equal(sx(0), PAD_L);
  assert.equal(sx(X_MAX), PAD_L + GW);
  assert.equal(sy(0), SC_BOT);
  assert.equal(sy(Y_MAX), SC_TOP);
  assert.equal(ry(0), R_MID);
  assert.equal(ry(R_MAX), R_TOP);
  assert.equal(ry(-R_MAX), R_BOT);
  assert.ok(SC_BOT < R_TOP, "the residual panel sits below the scatter panel");
  assert.ok(R_BOT + 16 + 4 < H, "the shared x-axis labels fit under the residual panel");
  assert.ok(DOT_X0 > PAD_L + GW + 4, "the dot plot sits right of the residual plot");
  assert.ok(DOT_X0 + (MAX_STACK - 1) * DOT_STEP + DOT_R <= W - PAD_R, "a full stack of dots stays inside the plot area");
});

test("every reachable (week, slope, intercept, route) state satisfies the figure's claims", () => {
  let states = 0;
  let outlierStates = 0;
  for (const key of SHAPE_KEYS) {
    const offsets = EXPECTED_OFFSETS[key];
    const times = EXPECTED_TIMES[key];
    const best = EXPECTED_BEST_SSR[key];
    // the second data set the open circles draw: what y = 5x + 12 leaves behind, recomputed
    const bestResiduals = times.map((t, i) => t - (5 * (i + 1) + 12));
    assert.deepEqual(bestResiduals, offsets, `${key}: least-squares residuals are the week's own offsets`);
    const bestStats = quartilesDirect(bestResiduals);
    const bestRange = Math.max(...bestResiduals) - Math.min(...bestResiduals);
    assert.deepEqual(residualsFor(key, 5, 12), bestResiduals, key);
    assert.equal(rangeOf(bestResiduals), bestRange, key);

    for (let m = SLOPE_MIN; m <= SLOPE_MAX; m += 1) {
      for (let b = INTERCEPT_MIN; b <= INTERCEPT_MAX; b += 1) {
        const label = `${key} m=${m} b=${b}`;
        const rs = residualsFor(key, m, b);
        assert.equal(rs.length, 8, label);

        let sumOfSquares = 0;
        for (let i = 0; i < 8; i += 1) {
          const x = i + 1;
          // residual recomputed from the definition and from the algebra separately
          const expected = times[i] - (m * x + b);
          assert.equal(rs[i], expected, `${label} route ${x}`);
          assert.equal(rs[i], (5 - m) * x + (12 - b) + offsets[i], `${label} route ${x}`);
          assert.ok(Number.isInteger(rs[i]), `${label} route ${x}: residual must be a whole number`);
          assert.ok(Math.abs(rs[i]) <= 15, `${label} route ${x}: residual ${rs[i]} leaves the residual axis`);
          assert.ok(Math.abs(rs[i]) <= R_MAX, `${label} route ${x}`);
          sumOfSquares += expected * expected;

          // the plotted point, its residual stem, its dot-plot twin and its open twin stay in frame
          assert.ok(sx(x) >= PAD_L && sx(x) <= PAD_L + GW, `${label} route ${x}: sx`);
          assert.ok(sx(x) + 6 <= W, `${label} route ${x}: dot spills off the right edge`);
          assert.ok(sy(times[i]) - 6 >= SC_TOP && sy(times[i]) + 6 <= SC_BOT, `${label} route ${x}: scatter dot`);
          assert.ok(sy(m * x + b) >= SC_TOP && sy(m * x + b) <= SC_BOT, `${label} route ${x}: predicted point`);
          assert.ok(ry(rs[i]) - 6 >= 0 && ry(rs[i]) + 6 <= H, `${label} route ${x}: residual dot leaves the viewBox`);
          assert.ok(ry(rs[i]) >= R_TOP - 6 && ry(rs[i]) <= R_BOT + 6, `${label} route ${x}: residual dot leaves its panel`);
          assert.ok(ry(bestResiduals[i]) >= R_TOP && ry(bestResiduals[i]) <= R_BOT, `${label} route ${x}: open circle leaves its panel`);
          const stack = stackX(rs, i);
          assert.ok(stack >= DOT_X0 && stack + DOT_R <= W - PAD_R, `${label} route ${x}: dot-plot column ${stack}`);
          assert.ok(rs.filter((r) => r === rs[i]).length <= MAX_STACK, `${label} route ${x}: stack too tall to draw`);
        }
        // both endpoints of the drawn model line stay inside the scatter panel
        for (const x of [0, X_MAX]) {
          assert.equal(predictedAt(m, b, x), m * x + b, label);
          assert.ok(m * x + b >= 0 && m * x + b <= Y_MAX, `${label}: line end ${m * x + b}`);
          assert.ok(sy(m * x + b) >= SC_TOP && sy(m * x + b) <= SC_BOT, label);
        }

        // the squared total, three independent ways
        assert.equal(ssrFor(key, m, b), sumOfSquares, label);
        assert.equal(ssrFor(key, m, b), ssrDirect(times, m, b), label);
        assert.equal(
          ssrFor(key, m, b),
          best + total(XS.map((x) => ((5 - m) * x + (12 - b)) ** 2)),
          `${label}: squared total must split into the week's own misses plus the line's error`
        );
        // and y = 5x + 12 is the only line in the grid that reaches the minimum
        if (m === 5 && b === 12) assert.equal(ssrFor(key, m, b), best, label);
        else assert.ok(ssrFor(key, m, b) > best, `${label}: ${ssrFor(key, m, b)} must beat ${best}`);

        // centre of the residuals
        const mean = meanResidual(key, m, b);
        assert.equal(mean, total(rs) / 8, label);
        assert.equal(mean, 4.5 * (5 - m) + (12 - b), label);
        assert.equal(mean === 0, m === 5 && b === 12, `${label}: mean 0 exactly at the least-squares line`);

        const lo = Math.min(...rs);
        const hi = Math.max(...rs);
        const spread = spreadSentence(key, m, b);
        assert.ok(spread.startsWith(`Those eight residuals run from ${num(lo)} to ${num(hi)}, a spread of ${mins(hi - lo)}.`), `${label}: ${spread}`);
        if (mean === 0) assert.ok(spread.endsWith("They average exactly 0, so the misses above the line cancel the misses below."), label);
        else if (mean > 0) assert.ok(spread.includes(`They average ${num(mean)}, above 0, so overall this line predicts less time`), label);
        else assert.ok(spread.includes(`They average ${num(mean)}, below 0, so overall this line predicts more time`), label);

        // ---- one-variable statistics of this residual set, recomputed by hand ----
        const stats = quartilesDirect(rs);
        assert.equal(stats.sorted[0], lo, label);
        assert.equal(stats.sorted[7], hi, label);
        assert.equal(quartiles(rs).q1, stats.q1, `${label}: Q1`);
        assert.equal(quartiles(rs).q3, stats.q3, `${label}: Q3`);
        assert.equal(quartiles(rs).iqr, stats.q3 - stats.q1, `${label}: IQR`);
        assert.equal(rangeOf(rs), hi - lo, `${label}: range`);
        const flagged = outliersDirect(rs);
        assert.deepEqual(outlierIndices(rs), flagged, `${label}: 1.5-IQR fence`);
        for (const i of flagged) {
          assert.ok(rs[i] < stats.q1 - 1.5 * stats.iqr || rs[i] > stats.q3 + 1.5 * stats.iqr, `${label}: route ${i + 1} is not really outside the fence`);
        }
        for (let i = 0; i < 8; i += 1) {
          if (flagged.includes(i)) continue;
          assert.ok(rs[i] >= stats.q1 - 1.5 * stats.iqr && rs[i] <= stats.q3 + 1.5 * stats.iqr, `${label}: route ${i + 1} was missed by the fence`);
        }
        // the ONLY states with an outlier are the road-closure week at the true slope
        assert.equal(flagged.length <= 1, true, `${label}: this grid never flags two routes at once`);
        assert.equal(flagged.length === 1, key === "closure" && m === 5, `${label}: flagged ${flagged.length}`);
        if (flagged.length === 1) {
          outlierStates += 1;
          assert.deepEqual(flagged, [3], `${label}: the closed road is route 4`);
          // route 4 of the closure week took 5·4 + 12 + 6 = 38 minutes
          assert.equal(rs[3], (5 * 4 + 12 + 6) - (m * 4 + b), `${label}: route 4 residual`);
        }

        // the S-ID.3 clause, spelled out from those same numbers
        const fences = `Q1 ${num(stats.q1)}, Q3 ${num(stats.q3)}, IQR ${num(stats.iqr)}`;
        const expectedNote = flagged.length === 0
          ? `right now none of these eight is that far out (${fences}), so no single route is stretching this spread by itself.`
          : `right now route ${flagged[0] + 1} is (${fences}): its residual of ${num(rs[flagged[0]])} stretches the spread while the other seven routes stay put.`;
        assert.equal(outlierNote(key, m, b), expectedNote, label);
        // and it never claims an outlier the plot does not show
        if (flagged.length === 0) assert.ok(!outlierNote(key, m, b).includes("stretches the spread"), label);

        // ---- the two-set comparison the open circles make possible ----
        const hRange = hi - lo;
        assert.ok(hRange >= bestRange, `${label}: your line's residuals are never narrower than the least-squares set`);
        assert.ok(stats.iqr >= bestStats.iqr, `${label}: nor is the middle half ever narrower`);
        assert.equal(hRange === bestRange, m === 5, `${label}: only a pure intercept shift keeps the range`);
        const expectedCompare = m === 5 && b === 12
          ? `Your line is the least-squares line right now, so the filled dots sit on the open circles and there is only one set to read: center 0, range ${mins(hRange)}, IQR ${num(stats.iqr)}. Move a stepper and the open circles stay behind as the set to compare against.`
          : `Filled dots, your line: center ${num(mean)}, range ${mins(hRange)}, IQR ${num(stats.iqr)}. Open circles, the least-squares line y = 5x + 12: center 0, range ${mins(bestRange)}, IQR ${num(bestStats.iqr)}. ${
              hRange > bestRange
                ? "Off center and more spread out, so the open set is the tighter of the two."
                : "The same spread, but shifted off zero, so the open set still sits closer to zero overall."
            }`;
        assert.equal(compareSentence(key, m, b), expectedCompare, label);

        const verdict = fitVerdict(key, m, b);
        if (m === 5 && b === 12) {
          assert.ok(verdict.startsWith(`This is the least-squares line, squared total ${best}.`), `${label}: ${verdict}`);
          if (key === "ordinary") assert.ok(verdict.endsWith("a straight line is a good model for this week."), label);
          if (key === "ends") assert.ok(verdict.includes("bends into a U: high at both ends, low in the middle"), label);
          if (key === "closure") assert.ok(verdict.includes("Seven routes land within 1 minute of the line and one route sits 6 minutes above it"), label);
        } else {
          assert.ok(verdict.startsWith(`Squared residual total ${ssrFor(key, m, b)}.`), `${label}: ${verdict}`);
          assert.ok(verdict.includes(`brings the total down to ${best}`), label);
          assert.ok(verdict.endsWith("this line is not the best fit yet."), label);
        }

        // S-ID.7: the slope/intercept reading is attributed to the line, not asserted about the world
        assert.equal(
          slopeSentence(m, b),
          `Slope ${m}: this line says every extra package adds ${mins(m)} to the route. Intercept ${b}: it puts loading and paperwork at ${mins(b)} before the van moves at all.`,
          label
        );
        assert.ok(slopeSentence(m, b).includes("this line says"), label);
        assert.ok(!slopeSentence(m, b).includes("every extra package adds") || slopeSentence(m, b).includes("says every extra package adds"), label);

        for (let route = ROUTE_MIN; route <= ROUTE_MAX; route += 1) {
          states += 1;
          const i = route - 1;
          const observed = times[i];
          const predicted = m * route + b;
          const r = observed - predicted;
          assert.equal(rs[i], r, `${label} route ${route}`);
          const sentence = routeSentence(key, m, b, route);
          assert.ok(sentence.startsWith(`Route ${route} carried ${route} ${route === 1 ? "package" : "packages"} and took ${observed} minutes.`), `${label}: ${sentence}`);
          assert.ok(sentence.includes(`The line predicts ${predicted} minutes, so its residual is ${observed} − ${predicted} = ${num(r)}:`), `${label}: ${sentence}`);
          if (r === 0) assert.ok(sentence.endsWith("exactly what the model said."), label);
          else assert.ok(sentence.endsWith(`${Math.abs(r)} ${Math.abs(r) === 1 ? "minute" : "minutes"} ${r > 0 ? "longer" : "shorter"} than the model said.`), `${label}: ${sentence}`);

          // the accessible name is true in this exact state
          const aria = figureLabel(key, m, b, route);
          assert.ok(aria.includes(`Week labelled ${SHAPE_LABEL[key]}:`), label);
          assert.ok(aria.includes(`the line y = ${m}x + ${b}`), label);
          assert.ok(aria.includes(`eight delivery routes`), label);
          assert.ok(aria.includes(`run from ${num(lo)} to ${num(hi)}`), label);
          assert.ok(aria.includes(`squared total ${ssrFor(key, m, b)}`), label);
          assert.ok(
            aria.includes(`open circles mark the residuals of the least-squares line y = 5x + 12, which run from ${num(Math.min(...bestResiduals))} to ${num(Math.max(...bestResiduals))}`),
            `${label}: ${aria}`
          );
          assert.ok(aria.endsWith(`route ${route} is highlighted, with residual ${num(r)}.`), `${label}: ${aria}`);

          // nothing the figure can say ever reads "1 minutes" / "1 packages"
          for (const text of [sentence, aria, spread, verdict, slopeSentence(m, b), compareSentence(key, m, b), outlierNote(key, m, b)]) {
            assert.doesNotMatch(text, /(^|[^0-9])1 (minutes|packages|routes|hours)\b/u, `${label}: ${text}`);
          }
        }
      }
    }
  }
  assert.equal(states, 3 * (SLOPE_MAX - SLOPE_MIN + 1) * (INTERCEPT_MAX - INTERCEPT_MIN + 1) * (ROUTE_MAX - ROUTE_MIN + 1));
  assert.equal(states, 3 * 3 * 5 * 8);
  assert.equal(outlierStates, 5, "one road-closure outlier at each of the five intercepts on the true slope");
});

test("y = 5x + 12 beats every other straight line, not just the ones on the steppers", () => {
  for (const key of SHAPE_KEYS) {
    const times = EXPECTED_TIMES[key];
    const best = ssrDirect(times, 5, 12);
    assert.equal(best, EXPECTED_BEST_SSR[key], key);
    for (let m = -5; m <= 15; m += 0.5) {
      for (let b = -10; b <= 30; b += 0.5) {
        const here = ssrDirect(times, m, b);
        if (m === 5 && b === 12) assert.equal(here, best, key);
        else assert.ok(here > best, `${key}: y = ${m}x + ${b} scored ${here}, not more than ${best}`);
      }
    }
  }
});

test("readouts pluralize at every value", () => {
  assert.equal(minutesWord(0), "0 minutes");
  assert.equal(minutesWord(1), "1 minute");
  assert.equal(minutesWord(2), "2 minutes");
  assert.equal(packagesWord(1), "1 package");
  assert.equal(packagesWord(3), "3 packages");
  assert.equal(fmtNum(-4), "−4");
  assert.equal(fmtNum(0), "0");
  assert.equal(fmtNum(7), "7");
  assert.equal(fmtNum(-2.5), "−2.5");
  assert.equal(fmtNum(3.5), "3.5");
});

test("worked example: both scores are the ones the arithmetic gives", () => {
  assert.deepEqual(EX_POINTS, [[2, 22], [5, 40], [9, 60]]);
  assert.deepEqual(EX_A, { m: 6, b: 8 });
  assert.deepEqual(EX_B, { m: 5, b: 14 });

  // Model A, by hand: 6·2+8 = 20, 6·5+8 = 38, 6·9+8 = 62
  assert.deepEqual(exPredictions(EX_A), [20, 38, 62]);
  assert.equal(6 * 2 + 8, 20);
  assert.equal(6 * 5 + 8, 38);
  assert.equal(6 * 9 + 8, 62);
  assert.deepEqual(exResiduals(EX_A), [2, 2, -2]);
  assert.equal(22 - 20, 2);
  assert.equal(40 - 38, 2);
  assert.equal(60 - 62, -2);
  assert.equal(exSsr(EX_A), 12);
  assert.equal(2 * 2 + 2 * 2 + -2 * -2, 12);
  assert.equal(exSum(EX_A), 2);

  // Model B, by hand: 5·2+14 = 24, 5·5+14 = 39, 5·9+14 = 59
  assert.deepEqual(exPredictions(EX_B), [24, 39, 59]);
  assert.equal(5 * 2 + 14, 24);
  assert.equal(5 * 5 + 14, 39);
  assert.equal(5 * 9 + 14, 59);
  assert.deepEqual(exResiduals(EX_B), [-2, 1, 1]);
  assert.equal(22 - 24, -2);
  assert.equal(40 - 39, 1);
  assert.equal(60 - 59, 1);
  assert.equal(exSsr(EX_B), 6);
  assert.equal(-2 * -2 + 1 * 1 + 1 * 1, 6);
  assert.equal(exSum(EX_B), 0);
  assert.ok(exSsr(EX_B) < exSsr(EX_A), "Model B must be the better fit");
  // the "sits below the points on average" reading of Model A's positive total
  assert.ok(exSum(EX_A) > 0);
  assert.equal(exSum(EX_B), 0);

  const steps = exampleSteps();
  assert.equal(steps.length, 5);
  assert.ok(steps[0].text.includes("it predicts 6 · 2 + 8 = 20, and that route really took 22 minutes"), steps[0].text);
  assert.ok(steps[0].text.endsWith("Residual = observed − predicted = 22 − 20 = 2."), steps[0].text);
  assert.ok(steps[1].text.includes("predicts 20, 38, 62 minutes; the routes took 22, 40, 60"), steps[1].text);
  assert.ok(steps[1].text.endsWith("leaves the residuals 2, 2, −2."), steps[1].text);
  assert.ok(steps[2].text.startsWith("(2)² + (2)² + (−2)² = 4 + 4 + 4 = 12."), steps[2].text);
  assert.ok(steps[3].text.includes("It predicts 24, 39, 59, so its residuals are −2, 1, 1 and its squared total is 4 + 1 + 1 = 6."), steps[3].text);
  assert.ok(steps[4].text.startsWith("6 < 12, so Model B fits these three routes better."), steps[4].text);
  assert.ok(steps[4].text.includes("add to 0 while Model A's add to 2"), steps[4].text);
  assert.ok(steps[4].text.includes("read the residual plot for left-over pattern"), steps[4].text);
  for (const step of steps) assert.doesNotMatch(step.text, /(^|[^0-9])1 (minutes|packages|routes)\b/u, step.text);
});

test("Try it: the marked choice is the true residual and each distractor is what its feedback says", () => {
  assert.deepEqual(TRY, { m: 7, b: 5, x: 4, observed: 30 });
  assert.equal(7 * 4 + 5, 33);
  assert.equal(TRY_PREDICTED, 33);
  assert.equal(30 - 33, -3);
  assert.equal(TRY_ANSWER, -3);
  assert.deepEqual(TRY_CHOICES, [2, -3, 3, 33]);
  assert.equal(new Set(TRY_CHOICES).size, 4);
  assert.equal(TRY_CORRECT, 1);
  assert.equal(TRY_CHOICES[TRY_CORRECT], -3);
  assert.equal(30 - 7 * 4, 2, "the intercept-dropping distractor");
  assert.equal(33 - 30, 3, "the reversed-order distractor");
  assert.ok(TRY_CHOICES.includes(TRY_PREDICTED), "the prediction itself is offered as a distractor");
  assert.ok(tryFeedback(1).startsWith("Correct. The model predicts 7 · 4 + 5 = 33, the route took 30, so the residual is 30 − 33 = −3"), tryFeedback(1));
  assert.ok(tryFeedback(1).endsWith("the route beat the prediction by 3 minutes."), tryFeedback(1));
  assert.ok(tryFeedback(0).startsWith("Not quite. 2 drops the intercept."), tryFeedback(0));
  assert.ok(tryFeedback(0).includes("The prediction is 7 · 4 + 5 = 33, not 28"), tryFeedback(0));
  assert.ok(tryFeedback(2).startsWith("Not quite. 3 is predicted minus observed."), tryFeedback(2));
  assert.ok(tryFeedback(3).startsWith("Not quite. 33 is the prediction itself."), tryFeedback(3));
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
  for (const id of CITED_STANDARDS) assert.ok(mathCheck.includes(`(${id})`), `Math check must cite ${id}`);
  assert.deepEqual([...cited].sort(), [...CITED_STANDARDS].sort());

  const svgTags = [...source.matchAll(/<svg\b[^>]*>/g)];
  assert.equal(svgTags.length, (source.match(/<svg\b/g) ?? []).length);
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.match(tag[0], /viewBox=/);
    assert.match(tag[0], /role="img"/);
    assert.match(tag[0], /aria-label=\{figureLabel\(shape, m, b, route\)\}/);
  }

  const buttonCount = (source.match(/<button\b/g) ?? []).length;
  assert.ok(buttonCount >= 5, `expected several buttons, found ${buttonCount}`);
  assert.equal((source.match(/<button type="button"/g) ?? []).length, buttonCount, 'every <button> must declare type="button"');

  assert.match(source, /label="Slope \(minutes per package\)" value=\{m\} min=\{4\} max=\{6\}/);
  assert.match(source, /label="Intercept \(fixed minutes\)" value=\{b\} min=\{10\} max=\{14\}/);
  assert.match(source, /label="Route to inspect" value=\{route\} min=\{1\} max=\{8\}/);
  assert.equal(SLOPE_MIN, 4);
  assert.equal(SLOPE_MAX, 6);
  assert.equal(INTERCEPT_MIN, 10);
  assert.equal(INTERCEPT_MAX, 14);
  assert.equal(ROUTE_MIN, 1);
  assert.equal(ROUTE_MAX, 8);

  assert.match(source, /^"use client";/);
  assert.match(source, /aria-controls=\{stepsId\}/);
  assert.match(source, /id=\{stepsId\}/);
  assert.match(source, /aria-pressed=\{shape === key\}/);
  assert.match(source, /aria-pressed=\{pick === i\}/);
  assert.doesNotMatch(source, /[぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/u);
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/);
  assert.doesNotMatch(source, /bg-linear-|inset-shadow-|text-shadow-|field-sizing-|not-\[|[a-z-]+-\(--/);

  // the second data set really is drawn, not just described
  assert.match(source, /cy=\{ry\(bestRs\[i\]\)\}/);
  assert.match(source, /const bestRs = residualsFor\(shape, TRUE_M, TRUE_B\)/);
  assert.match(source, /\{compareSentence\(shape, m, b\)\}/);
});

test("static prose: the Math check makes no data claim the code does not derive", () => {
  const block = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>")).replace(/\s+/g, " ").trim();

  // 1. the exact wording is pinned, so any future edit to it has to be re-justified here
  const EXPECTED_MATH_CHECK = [
    "<MathCheck> <p> A <strong>residual</strong> is observed minus predicted, so the eight vertical gaps in the top panel become the eight numbers the bottom panel",
    "displays &mdash; the residual plot and the dot plot beside it are two displays of one small data set (S-ID.1). The open circles keep a second set",
    "on that plot, the one the least-squares line leaves behind, so its center and spread can be read against your line&apos;s; that comparison, not",
    "either number on its own, is how you decide which fit is tighter (S-ID.2). Center and spread still hide one thing, because a single unusual route",
    "can stretch a spread by itself: the usual test flags any residual more than 1.5 IQRs past Q1 or Q3 (S-ID.3), and {outlierNote(shape, m, b)}{\" \"}",
    "<strong>Fitting a function and analyzing residuals</strong> (S-ID.6) is those two moves in order: y = {m}x + {b} scores {ssrFor(shape, m, b)}, and",
    "because each week&apos;s misses cancel both overall and across route sizes, no straight line scores below {ssrFor(shape, TRUE_M, TRUE_B)} &mdash;",
    "yet that score alone cannot tell a good model from a wrong one, only the shape of the residuals can. The two numbers in the model carry meaning of",
    "their own (S-ID.7): {slopeSentence(m, b)} </p>"
  ].join(" ");
  assert.equal(block, EXPECTED_MATH_CHECK);

  // 2. every interpolation in the Math check is a derived value the tests above enumerate
  assert.deepEqual(
    [...block.matchAll(/\{[^{}]*\}/g)].map((match) => match[0]),
    ["{outlierNote(shape, m, b)}", '{" "}', "{m}", "{b}", "{ssrFor(shape, m, b)}", "{ssrFor(shape, TRUE_M, TRUE_B)}", "{slopeSentence(m, b)}"]
  );

  // 3. the static half carries no number of its own: strip the citations, the fence rule and the
  //    quartile names, and no digit is left, so no data claim can hide in the prose
  const staticOnly = block
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/\(S-ID\.\d\)/g, " ")
    .replace(/1\.5 IQRs/g, " ")
    .replace(/Q1|Q3/g, " ");
  assert.doesNotMatch(staticOnly, /\d/, `an un-derived number is left in the Math check prose: ${staticOnly}`);
  // and it never names a week, so it cannot claim a shape the current state does not show
  for (const key of SHAPE_KEYS) assert.ok(!block.includes(SHAPE_LABEL[key]), `the Math check must not hard-code the ${key} week`);
  assert.ok(!block.includes("road-closure"), "the Math check must not hard-code the closure week's shape");
});

test("static prose: the opening hook quotes a complete model, and shapes are named correctly", () => {
  // the hook must give BOTH numbers of a line, or it teaches the Try it's own distractor
  const intercept: Record<number, string> = { 12: "Twelve" };
  const slope: Record<number, string> = { 5: "five" };
  assert.ok(
    source.includes(`&ldquo;${intercept[TRUE_B]} minutes to load, then ${slope[TRUE_M]} more per package&rdquo;`),
    "the hook must quote the intercept and the slope together"
  );
  assert.ok(!source.includes("Each package adds five minutes"), "a slope with no intercept predicts nothing");
  // the quoted model is the least-squares line of all three weeks, checked above
  assert.equal(TRUE_M, 5);
  assert.equal(TRUE_B, 12);

  // "arch" is high in the middle; this chapter's leftover shape is a U
  assert.doesNotMatch(source, /\barch(es|ed|ing)?\b/i, "a residual plot high at both ends is a U, not an arch");
  assert.ok(fitVerdict("ends", TRUE_M, TRUE_B).includes("bends into a U"), fitVerdict("ends", TRUE_M, TRUE_B));

  // the figure caption tells the truth about what the bottom panel now holds
  const caption = source.match(/<Figure caption="([^"]*)"/);
  assert.ok(caption, "the figure must carry a caption");
  assert.equal(
    caption[1],
    "Top: eight routes and your model line, with each residual drawn as a vertical gap. Bottom: those same eight residuals plotted against route size and stacked again as a dot plot, with open circles holding the least-squares line's residuals beside them."
  );

  // the roadmap orients the student to all seven lessons of the brief, by name
  const roadmap = source.slice(source.indexOf("<h2>Where this chapter goes</h2>"), source.indexOf("<MathCheck"));
  for (const title of BRIEF_LESSON_TITLES) assert.ok(roadmap.includes(`<strong>${title}</strong>`), `the roadmap must name ${title}`);
  assert.equal((roadmap.match(/<strong>/g) ?? []).length, BRIEF_LESSON_TITLES.length, "the roadmap names the seven lessons and nothing else");
  assert.ok(roadmap.includes("Seven lessons follow."), roadmap.slice(0, 120));
});
