import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  AXIS_MAX,
  AXIS_Y,
  CENTER_MAX,
  CENTER_MIN,
  DOT_R,
  EXAMPLE,
  H,
  MEAN_HALF,
  MED_W,
  PAD,
  SHAPES,
  SPACING_MAX,
  SPACING_MIN,
  STEP,
  TRY_CHOICES,
  TRY_CORRECT,
  TRY_DATA,
  W,
  answersFor,
  axisTicks,
  dotY,
  exampleSteps,
  figureLabel,
  fmt,
  isLabeledTick,
  mean,
  median,
  rangeOf,
  shapeNote,
  skewClaim,
  stackDots,
  tryFeedback,
  xOf,
  type Shape
} from "./ca-g6-ch05-statistics-data-distributions";

const BRIEF_STANDARDS = ["6.SP.A.1", "6.SP.A.2", "6.SP.A.3", "6.SP.B.4", "6.SP.B.5"];
const source = readFileSync(
  path.join(process.cwd(), "components/lesson/ccss/lessons/ca-g6-ch05-statistics-data-distributions.tsx"),
  "utf8"
);

// Independent copies of the offset patterns and their sums; the lesson must keep these exact patterns.
const EXPECTED_OFFSETS: Record<Shape, number[]> = {
  symmetric: [-2, -1, -1, 0, 0, 0, 1, 1, 2],
  right: [-1, 0, 0, 0, 0, 1, 1, 2, 3],
  left: [-3, -2, -1, -1, 0, 0, 0, 0, 1]
};
const OFFSET_SUM: Record<Shape, number> = { symmetric: 0, right: 6, left: -6 };
const ZERO_COUNT: Record<Shape, number> = { symmetric: 3, right: 4, left: 4 };

function plainSum(values: number[]) {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
function plainSorted(values: number[]) {
  const copy = values.slice();
  for (let i = 0; i < copy.length; i += 1) {
    for (let j = i + 1; j < copy.length; j += 1) {
      if (copy[j] < copy[i]) [copy[i], copy[j]] = [copy[j], copy[i]];
    }
  }
  return copy;
}
function isWhole(x: number) {
  return Math.abs(x - Math.round(x)) < 1e-9;
}
/** Independent re-implementation of the lesson's display rules (never call fmt/approx here). */
function showRounded(x: number) {
  return isWhole(x) ? String(Math.round(x)) : (Math.round(x * 10) / 10).toFixed(1);
}
function showApprox(x: number) {
  return isWhole(x) ? String(Math.round(x)) : `about ${(Math.round(x * 10) / 10).toFixed(1)}`;
}

test("offset patterns are the audited ones: median pinned, span 4, skew sums +/- 6", () => {
  assert.equal(SHAPES.length, 3);
  for (const s of SHAPES) {
    assert.deepEqual(s.offsets, EXPECTED_OFFSETS[s.key]);
    assert.equal(s.offsets.length, 9);
    assert.equal(plainSorted(s.offsets)[4], 0, `${s.key}: 5th sorted offset must be 0`);
    assert.equal(plainSum(s.offsets), OFFSET_SUM[s.key]);
    assert.equal(s.offsets.filter((o) => o === 0).length, ZERO_COUNT[s.key], `${s.key}: dots sitting on the median`);
    assert.equal(Math.max(...s.offsets) - Math.min(...s.offsets), 4, `${s.key}: offsets span 4 so range = 4 x spacing`);
    // every value stays on the 0..AXIS_MAX axis at both control extremes
    assert.ok(CENTER_MAX + Math.max(...s.offsets) * SPACING_MAX <= AXIS_MAX, `${s.key}: overflows the axis`);
    assert.ok(CENTER_MIN + Math.min(...s.offsets) * SPACING_MAX >= 0, `${s.key}: underflows the axis`);
  }
  // The skew must be big enough to SEE: |mean - median| = 6/9 of a step at the smallest
  // non-zero spacing, i.e. 6/9 * 20 px = 13.33 px, clear of the 5 px mean triangle.
  assert.equal((6 / 9) * STEP > MEAN_HALF + MED_W, true);
});

test("the axis carries a tick at every whole minute and a number on the even ones", () => {
  const ticks = axisTicks();
  assert.equal(ticks.length, AXIS_MAX + 1);
  for (let v = 0; v <= AXIS_MAX; v += 1) {
    assert.equal(ticks[v], v);
    assert.equal(isLabeledTick(v), v % 2 === 0, `tick ${v}`);
    assert.ok(xOf(v) >= PAD && xOf(v) <= W - PAD, `tick ${v} outside the axis`);
  }
  assert.equal(ticks.filter((v) => isLabeledTick(v)).length, 13);
  assert.equal(ticks.filter((v) => !isLabeledTick(v)).length, 12);
});

test("every reachable (center, spacing, shape) state satisfies the figure's claims", () => {
  let states = 0;
  let statesWithOddValue = 0;
  for (let center = CENTER_MIN; center <= CENTER_MAX; center += 1) {
    for (let spacing = SPACING_MIN; spacing <= SPACING_MAX; spacing += 1) {
      for (const { key: shape } of SHAPES) {
        states += 1;
        const answers = answersFor(center, spacing, shape);
        const label = `center=${center} spacing=${spacing} shape=${shape}`;

        // independently built values, sorted by hand
        const built = plainSorted(EXPECTED_OFFSETS[shape].map((o) => center + o * spacing));
        assert.deepEqual(answers, built, label);

        // nine whole-number answers, sorted, inside the axis, each on a drawn tick
        assert.equal(answers.length, 9, label);
        const ticks = axisTicks();
        for (let i = 0; i < answers.length; i += 1) {
          assert.ok(Number.isInteger(answers[i]), label);
          assert.ok(answers[i] >= 0 && answers[i] <= AXIS_MAX, `${label}: ${answers[i]} outside the 0..${AXIS_MAX} axis`);
          assert.ok(ticks.includes(answers[i]), `${label}: ${answers[i]} has no tick under it`);
          if (i > 0) assert.ok(answers[i] >= answers[i - 1], `${label}: not sorted`);
        }
        if (answers.some((v) => v % 2 !== 0)) statesWithOddValue += 1;

        // center: median is exactly the typical answer; mean is the exact rational sum/9
        const sorted = plainSorted(answers);
        const sum = plainSum(answers);
        assert.equal(median(answers), sorted[4], label);
        assert.equal(median(answers), center, label);
        assert.equal(sum, 9 * center + OFFSET_SUM[shape] * spacing, label);
        assert.equal(mean(answers), sum / 9, label);

        // spacing: range is largest minus smallest and equals 4 x spacing
        assert.equal(rangeOf(answers), sorted[8] - sorted[0], label);
        assert.equal(rangeOf(answers), 4 * spacing, label);

        const mu = mean(answers);
        const med = median(answers);

        // shape: integer arithmetic decides the direction, then the note must match it
        const note = shapeNote(spacing, shape, med, mu);
        if (spacing === 0) {
          assert.ok(answers.every((v) => v === center), label);
          assert.equal(sum, 9 * center, label);
          assert.equal(mu, med, label);
          assert.equal(rangeOf(answers), 0, label);
          assert.match(note, new RegExp(`^All nine answers are ${center} minutes, so the range is 0\\.`), label);
          assert.match(note, /the mean sits exactly on the median\.$/, label);
        } else if (shape === "right") {
          assert.ok(sum > 9 * center, label);
          assert.ok(mu > med, label);
          assert.match(note, /pulled above the median/, label);
          assert.ok(note.includes(`(${showApprox(mu)})`), `${label}: note must print the mean as ${showApprox(mu)}`);
          assert.ok(note.includes(`(${med})`), label);
        } else if (shape === "left") {
          assert.ok(sum < 9 * center, label);
          assert.ok(mu < med, label);
          assert.match(note, /pulled below the median/, label);
          assert.ok(note.includes(`(${showApprox(mu)})`), `${label}: note must print the mean as ${showApprox(mu)}`);
          assert.ok(note.includes(`(${med})`), label);
        } else {
          assert.equal(sum, 9 * center, label);
          assert.equal(mu, med, label);
          assert.match(note, new RegExp(`mean and the median are both ${center} minutes\\.$`), label);
        }

        // a non-integer mean is never presented as exact
        if (!Number.isInteger(mu)) {
          assert.ok(note.includes("about "), `${label}: rounded mean ${mu} printed without "about"`);
          assert.equal(showApprox(mu), `about ${showRounded(mu)}`, label);
        }
        assert.ok(Math.abs(Number(showRounded(mu)) - mu) < 0.05 + 1e-12, label);
        assert.equal(fmt(mu), showRounded(mu), label);

        // accessible name is true in this state
        const aria = figureLabel(med, mu, rangeOf(answers));
        assert.ok(aria.includes(`median ${center} minutes`), label);
        assert.ok(aria.includes(`mean ${showApprox(mu)} minutes`), `${label}: aria said "${aria}"`);
        assert.ok(aria.includes(`range ${4 * spacing} minutes`), label);

        // every drawn element stays inside the viewBox
        const dots = stackDots(answers);
        assert.equal(dots.length, 9, label);
        const tally: Record<number, number> = {};
        for (const d of dots) {
          tally[d.v] = (tally[d.v] ?? 0) + 1;
          assert.equal(d.level, tally[d.v], label);
          assert.ok(d.level >= 1 && d.level <= 9, label);
          const cx = xOf(d.v);
          const cy = dotY(d.level);
          assert.ok(cx - DOT_R >= PAD - DOT_R && cx + DOT_R <= W, `${label}: dot x ${cx}`);
          assert.ok(cx >= PAD && cx <= W - PAD, `${label}: dot centre outside the axis gutter`);
          assert.ok(cy - DOT_R >= 0, `${label}: dot y ${cy} above the viewBox`);
          assert.ok(cy + DOT_R < AXIS_Y, `${label}: dot y ${cy} overlaps the axis`);
        }
        const meanX = xOf(mu);
        assert.ok(meanX - MEAN_HALF >= 0 && meanX + MEAN_HALF <= W, `${label}: mean marker x ${meanX}`);
        assert.ok(AXIS_Y + 16 <= H, label);
        const medX = xOf(med);
        assert.ok(medX >= PAD && medX <= W - PAD, `${label}: median line x ${medX}`);

        // the mean/median gap the figure claims to show must be visible, not sub-pixel
        const gapPx = Math.abs(meanX - medX);
        // exact rational gap in data units (integer numerator), then its pixel projection
        assert.ok(sum - 9 * center === OFFSET_SUM[shape] * spacing, label);
        assert.ok(Math.abs(gapPx * 9 - Math.abs(OFFSET_SUM[shape]) * spacing * STEP) < 1e-9, label);
        if (spacing === 0 || shape === "symmetric") {
          assert.equal(gapPx, 0, label);
        } else {
          assert.ok(gapPx > MEAN_HALF + MED_W, `${label}: mean/median gap is only ${gapPx.toFixed(2)} px`);
        }
      }
    }
  }
  assert.equal(states, (CENTER_MAX - CENTER_MIN + 1) * (SPACING_MAX - SPACING_MIN + 1) * 3);
  assert.equal(states, 72);
  assert.ok(statesWithOddValue > 0, "odd values occur, so the axis needs a tick at every integer");
  assert.equal(W, AXIS_MAX * STEP + 2 * PAD);
  assert.equal(xOf(0), PAD);
  assert.equal(xOf(AXIS_MAX), W - PAD);
});

test("the Math check's skew sentence is true in all 72 states, spacing 0 included", () => {
  let zeroStates = 0;
  for (let center = CENTER_MIN; center <= CENTER_MAX; center += 1) {
    for (let spacing = SPACING_MIN; spacing <= SPACING_MAX; spacing += 1) {
      const claim = skewClaim(spacing);
      for (const { key: shape } of SHAPES) {
        const label = `center=${center} spacing=${spacing} shape=${shape}`;
        const values = EXPECTED_OFFSETS[shape].map((o) => center + o * spacing);
        const sum = plainSum(values);
        const med = plainSorted(values)[4];
        const meanAbove = sum > 9 * med;
        const meanBelow = sum < 9 * med;

        if (spacing === 0) {
          zeroStates += 1;
          // the ONLY true statement here: all three shapes coincide and mean = median
          assert.equal(meanAbove, false, label);
          assert.equal(meanBelow, false, label);
          assert.equal(sum, 9 * med, label);
          assert.deepEqual(plainSorted(values), plainSorted(EXPECTED_OFFSETS.symmetric.map(() => center)), label);
          assert.match(claim, /all three shapes give the same nine dots and the mean sits exactly on the median/, label);
          assert.match(claim, /Raise the spacing above 0/, label);
          assert.doesNotMatch(claim, /^With the spacing above 0/, label);
        } else {
          assert.match(claim, /^With the spacing above 0, a tail to the right pulls the mean above the median and a tail to the left pulls it below/, label);
          if (shape === "right") assert.equal(meanAbove, true, label);
          if (shape === "left") assert.equal(meanBelow, true, label);
          if (shape === "symmetric") assert.equal(sum, 9 * med, label);
        }
      }
    }
  }
  assert.equal(zeroStates, (CENTER_MAX - CENTER_MIN + 1) * 3);
  assert.notEqual(skewClaim(0), skewClaim(1));
  for (let spacing = 1; spacing <= SPACING_MAX; spacing += 1) assert.equal(skewClaim(spacing), skewClaim(1));
});

test("worked example values are the ones the arithmetic gives", () => {
  assert.deepEqual(EXAMPLE, [2, 3, 3, 4, 5, 6, 12]);
  const sorted = plainSorted(EXAMPLE);
  assert.deepEqual(sorted, [2, 3, 3, 4, 5, 6, 12]);
  const sum = 2 + 3 + 3 + 4 + 5 + 6 + 12;
  assert.equal(sum, 35);
  assert.equal(sorted[3], 4); // 4th of 7 values
  assert.equal(median(EXAMPLE), 4);
  assert.equal(35 / 7, 5);
  assert.equal(mean(EXAMPLE), 5);
  assert.equal(12 - 2, 10);
  assert.equal(rangeOf(EXAMPLE), 10);
  assert.ok(mean(EXAMPLE) > median(EXAMPLE), "tail to the right pulls the mean above the median");
  assert.equal(showApprox(5), "5", "an exact mean is never hedged with \"about\"");

  const steps = exampleSteps();
  assert.equal(steps.length, 4);
  assert.equal(steps[0].text, "2, 3, 3, 4, 5, 6, 12. The middle value, the 4th of 7, is 4, so the median is 4 books.");
  assert.equal(steps[1].text, "2 + 3 + 3 + 4 + 5 + 6 + 12 = 35, and 35 ÷ 7 = 5. The mean is 5 books.");
  assert.equal(steps[2].text, "Largest minus smallest: 12 − 2 = 10. The answers vary by 10 books.");
  assert.match(steps[3].text, /read about 4 books/);
  assert.match(steps[3].text, /who read 12 /);
  assert.match(steps[3].text, /mean up to 5, above the median/);
  assert.match(steps[3].text, /range of 10 /);
});

test("Try it: the marked choice is the true median and the distractors are what the feedback says", () => {
  assert.deepEqual(TRY_DATA, [6, 7, 7, 8, 8, 8, 9, 10, 18]);
  const sorted = plainSorted(TRY_DATA);
  assert.equal(sorted[4], 8);
  assert.equal(median(TRY_DATA), 8);
  assert.equal(TRY_CHOICES.length, 4);
  assert.equal(TRY_CORRECT, 1);
  assert.equal(TRY_CHOICES[TRY_CORRECT], 8);
  assert.equal(6 + 7 + 7 + 8 + 8 + 8 + 9 + 10 + 18, 81);
  assert.equal(81 / 9, 9);
  assert.equal(mean(TRY_DATA), 9);
  assert.equal(TRY_CHOICES[2], 9, "the mean is offered as a distractor");
  assert.equal(TRY_CHOICES[3], 18, "the maximum is offered as a distractor");
  assert.match(tryFeedback(TRY_CORRECT), /^Correct\. In order, the 5th of the 9 values is 8/);
  assert.match(tryFeedback(0), /^Not quite\. 7 appears in the data/);
  assert.match(tryFeedback(2), /^Not quite\. 9 is the mean \(81 ÷ 9\)/);
  assert.match(tryFeedback(3), /^Not quite\. 18 is the largest answer/);
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

  // 6.SP.A.1 must be about ANTICIPATED variability, not "the data happened to be constant"
  assert.match(mathCheck, /The question still anticipates variety even when a class happens to answer the same/);
  assert.doesNotMatch(mathCheck, /nothing to summarize/);
  // the skew claim must come from the state-gated helper, never be a flat sentence in the JSX
  assert.match(mathCheck, /\{skewClaim\(spacing\)\}/);
  assert.doesNotMatch(mathCheck, /tail to the (?:right|left)/);
  // the live mean must be hedged where it is rounded
  assert.match(mathCheck, /the mean is \{approx\(mu\)\}/);

  const svgTags = [...source.matchAll(/<svg\b[^>]*>/g)];
  assert.equal(svgTags.length, (source.match(/<svg\b/g) ?? []).length);
  assert.ok(svgTags.length >= 1);
  for (const tag of svgTags) {
    assert.match(tag[0], /viewBox=/);
    assert.match(tag[0], /role="img"/);
    assert.match(tag[0], /aria-label=/);
  }

  const buttonCount = (source.match(/<button\b/g) ?? []).length;
  assert.ok(buttonCount >= 6);
  assert.equal((source.match(/<button type="button"/g) ?? []).length, buttonCount, "every <button> must declare type=\"button\"");

  assert.match(source, /label="Typical answer \(minutes\)" value=\{center\} min=\{10\} max=\{15\}/);
  assert.match(source, /label="Spacing \(minutes\)" value=\{spacing\} min=\{0\} max=\{3\}/);
  assert.equal(CENTER_MIN, 10);
  assert.equal(CENTER_MAX, 15);
  assert.equal(SPACING_MIN, 0);
  assert.equal(SPACING_MAX, 3);

  // "spread" must not label two different visible numbers at once
  assert.doesNotMatch(source, /label="Spread"/);
  assert.doesNotMatch(source, /Range \(spread\)/);
  assert.match(source, /Fact label="Range \(variability\)"/);

  // The Math check's spacing claim must be computed, and its widest range must be the true one.
  assert.match(source, /range moves from 0 to \{4 \* SPACING_MAX\}/);
  assert.equal(4 * SPACING_MAX, 12);
  assert.equal(rangeOf(answersFor(12, SPACING_MAX, "symmetric")), 12);
  assert.equal(rangeOf(answersFor(12, SPACING_MIN, "symmetric")), 0);

  // the axis draws a tick per integer, with a number only on the even ones
  assert.match(source, /axisTicks\(\)\.map/);
  assert.match(source, /length: AXIS_MAX \+ 1/);
  assert.match(source, /isLabeledTick\(v\) \? \(/);

  assert.match(source, /^"use client";/);
  assert.match(source, /aria-controls=\{stepsId\}/);
  assert.match(source, /id=\{stepsId\}/);
  assert.doesNotMatch(source, /[぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/);
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/);
});
