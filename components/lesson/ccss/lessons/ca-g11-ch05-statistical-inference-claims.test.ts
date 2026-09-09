import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  AXIS_Y,
  ARROW_HEAD,
  ARROW_HI,
  ARROW_LO,
  BAR_H,
  BAR_Y,
  CLAIM_LABEL_Y,
  CLAIM_MAX,
  CLAIM_MIN,
  CLAIM_STEP,
  CLAIM_TOP,
  DISTRICT,
  DISTRICT_LABEL,
  H,
  MID_Y,
  N_MAX,
  N_MIN,
  N_STEP,
  PAD,
  PCT_MAX,
  PCT_MIN,
  PCT_STEP,
  TICKS,
  TRY_ME,
  TRY_PCT,
  W,
  WE_BIG_N,
  WE_CLAIM,
  WE_N,
  WE_YES,
  bandOf,
  claimIsPlausible,
  design,
  figureLabel,
  gapVerdict,
  intervalOf,
  marginOfError,
  points,
  readout,
  round1,
  seDifference,
  shownBand,
  standardError,
  tryAnswerIndex,
  tryOptions,
  trySentence,
  verdict,
  workedExample,
  workedExampleSteps,
  xAt,
  yesCount,
  type DesignKey,
} from "./ca-g11-ch05-statistical-inference-claims";

const SLUG = "ca-g11-ch05-statistical-inference-claims";
const BRIEF_STANDARDS = ["S-IC.1", "S-IC.2", "S-IC.3", "S-IC.4", "S-IC.5", "S-IC.6"];
const DESIGNS: DesignKey[] = ["random", "volunteer", "experiment"];
/** Rough glyph width at fontSize 11, used only to keep SVG text inside the viewBox. */
const GLYPH_11 = 6.4;

/**
 * Reads a printed "12.3" back as the integer 123, by splitting the string — never by
 * multiplying a float — so an assertion about printed arithmetic is an assertion about
 * the characters the student sees.
 */
function tenths(text: string): number {
  assert.match(text, /^\d+\.\d$/u, `${text} is not printed to one decimal place`);
  const [whole, tenth] = text.split(".");
  return Number(whole) * 10 + Number(tenth);
}

test("the control grid is declared as the lesson claims", () => {
  assert.deepEqual([N_MIN, N_MAX, N_STEP], [60, 300, 60]);
  assert.deepEqual([PCT_MIN, PCT_MAX, PCT_STEP], [30, 70, 5]);
  assert.deepEqual([CLAIM_MIN, CLAIM_MAX, CLAIM_STEP], [30, 70, 10]);
  assert.equal(DISTRICT, 12000);
  assert.equal(DISTRICT_LABEL, "12,000");
  // The label is the population written with a thousands separator.
  assert.equal(Number(DISTRICT_LABEL.replace(",", "")), DISTRICT);
  assert.equal(points(1), "1 percentage point");
  assert.equal(points(0), "0 percentage points");
  assert.equal(points(15), "15 percentage points");
  // round1 rounds to a tenth and nothing else: 3.6514... -> 3.7, and 3.7 doubled is 7.4, not 7.3.
  assert.equal(round1(3.6514837167011076), 3.7);
  assert.equal(tenths((2 * 3.7).toFixed(1)), 74);
  assert.equal(MID_Y, BAR_Y + BAR_H / 2);
});

test("every reachable state keeps the drawing, the verdict, and every printed number true", () => {
  let states = 0;
  let narrowest = Infinity;
  let widest = 0;
  let oneSampleWouldHaveLied = 0;
  let edges = 0;

  for (let n = N_MIN; n <= N_MAX; n += N_STEP) {
    for (let pct = PCT_MIN; pct <= PCT_MAX; pct += PCT_STEP) {
      const where = `n=${n}, pct=${pct}`;

      // The count of yes answers is a whole number, and it really is pct percent of n.
      const yes = yesCount(pct, n);
      assert.ok(Number.isInteger(yes), `${yes} answers is not a whole number (${where})`);
      assert.equal(yes * 100, pct * n, where);
      assert.ok(yes > 0 && yes < n, where);

      // se^2 * n = pct(100 - pct) exactly in the reals; only the binary square root separates the sides.
      const se = standardError(pct, n);
      assert.ok(se > 0, where);
      assert.ok(Math.abs(se * se * n - pct * (100 - pct)) < 1e-9, where);
      assert.equal(marginOfError(pct, n), 2 * se, where);

      const { lo, hi, me } = intervalOf(pct, n);
      assert.equal(me, 2 * se, where);
      assert.equal(lo, pct - me, where);
      assert.equal(hi, pct + me, where);
      assert.ok(lo > 0 && hi < 100, `the interval must stay on the 0-100 scale (${where})`);
      narrowest = Math.min(narrowest, hi - lo);
      widest = Math.max(widest, hi - lo);

      // Quadrupling the sample halves the margin: me(4n) * 2 = me(n).
      if (n * 4 <= 1200) {
        assert.ok(Math.abs(2 * marginOfError(pct, 4 * n) - marginOfError(pct, n)) < 1e-12, where);
      }

      // The chrome that does not move stays inside the viewBox.
      assert.ok(BAR_Y - 6 > CLAIM_LABEL_Y, "the bar must clear the marker label row");
      assert.ok(BAR_Y + BAR_H + 6 < AXIS_Y, "the bar must clear the axis");
      assert.ok(AXIS_Y + 22 + 4 <= H, "the tick labels must sit inside the viewBox");
      assert.ok(CLAIM_LABEL_Y - 9 > 0 && CLAIM_TOP > CLAIM_LABEL_Y, "the marker label must sit above its own line");
      assert.ok(xAt(ARROW_LO) - ARROW_HEAD >= 0 && xAt(ARROW_HI) + ARROW_HEAD <= W, "the sign-up-sheet arrowheads leave the viewBox");
      for (const tick of TICKS) {
        const half = (`${tick}%`.length * GLYPH_11) / 2;
        assert.ok(xAt(tick) - half >= 0 && xAt(tick) + half <= W, `the ${tick}% tick label leaves the viewBox`);
      }

      for (let claim = CLAIM_MIN; claim <= CLAIM_MAX; claim += CLAIM_STEP) {
        states += 1;
        const tag = `${where}, claim=${claim}`;
        const gap = Math.abs(claim - pct);

        // --- 1. the one-sample decision, recomputed from scratch -------------------
        // Written out here as a float comparison against a square root; the lesson decides it by
        // cross-multiplying integers. Two different routes to the same question must agree.
        const trueMe = 2 * Math.sqrt((pct * (100 - pct)) / n);
        const insideByHand = gap <= trueMe;
        const inside = claimIsPlausible(claim, pct, n);
        assert.equal(inside, insideByHand, `the interval decision disagrees with 2 sqrt(p(100-p)/n) (${tag})`);
        assert.equal(inside, lo <= claim && claim <= hi, `the drawn endpoints disagree with the decision (${tag})`);
        assert.ok(Math.abs(gap - me) > 0.4, `${tag} sits too close to the edge of the interval`);

        // --- 2. the two-group decision, recomputed from scratch --------------------
        // Under the null both groups really sit at pct, so the gap between two
        // independent groups swings by sqrt((pct·q + pct·q)/n) = sqrt(2·pct·q/n).
        // This is the same bound the drawn band uses, so an endpoint the band
        // draws can never be one this verdict calls "beyond".
        const trueSwing = 2 * Math.sqrt((2 * pct * (100 - pct)) / n);
        const byHand = gap < trueSwing ? "routine" : gap === trueSwing ? "edge" : "beyond";
        const gv = gapVerdict(claim, pct, n);
        assert.equal(gv, byHand, `the two-group decision disagrees with 2 sqrt((p1 q1 + p2 q2)/n) (${tag})`);
        assert.ok(trueSwing > trueMe, `the gap between two groups must swing wider than one group (${tag})`);
        if (gv === "edge") edges += 1;
        // The states where judging a gap by ONE group's margin would have claimed a cause the
        // two-group arithmetic does not support. They are reachable, so the lesson must not lie there.
        if (!inside && gv !== "beyond") oneSampleWouldHaveLied += 1;

        for (const key of DESIGNS) {
          const s = shownBand(key, pct, n, claim);
          const band = bandOf(key, pct, n, claim);
          const d = design(key, pct, n, claim);
          const box = readout(key, pct, n, claim);
          const label = figureLabel(key, pct, n, claim);
          const sentence = verdict(key, pct, n, claim);
          const at = `${tag}, ${key}`;

          // --- 3. every printed number agrees with every other printed number -----
          const seT = tenths(s.seText), halfT = tenths(s.halfText);
          assert.equal(halfT, 2 * seT, `printed margin is not twice the printed standard error (${at})`);
          assert.equal(tenths(s.loText), pct * 10 - halfT, `printed low end is not estimate minus printed margin (${at})`);
          assert.equal(tenths(s.hiText), pct * 10 + halfT, `printed high end is not estimate plus printed margin (${at})`);
          // The experiment band names a set fixed by the reminded group and the
          // sample size alone, so its standard error is the NULL one — computed
          // here from the definition, not from the lesson's helper.
          const trueSe = key === "experiment"
            ? Math.sqrt((2 * pct * (100 - pct)) / n)
            : Math.sqrt((pct * (100 - pct)) / n);
          assert.ok(Math.abs(seT / 10 - trueSe) <= 0.05 + 1e-12, `the printed standard error is not the real one rounded (${at})`);

          // --- 4. the band each design draws --------------------------------------
          assert.equal(band.show, key !== "volunteer", at);
          if (key === "random") assert.equal(band.half, 2 * standardError(pct, n), at);
          if (key === "experiment") {
            assert.equal(band.half, 2 * Math.sqrt((2 * pct * (100 - pct)) / n), at);
            assert.ok(band.half > 2 * standardError(pct, n), `the chance band must be wider than one group's margin (${at})`);
            // The band must not move when only the marker moves: its words name
            // the reminded group and the sample size, nothing else.
            for (const other of [30, 40, 50, 60, 70]) {
              assert.equal(bandOf(key, pct, n, other).half, band.half, `the band moved with the marker (${at}, marker ${other})`);
            }
            // And every endpoint it draws must pass the same rule the marker is judged by.
            for (const edge of [band.lo, band.hi]) {
              const inward = edge > pct ? edge - 1e-9 : edge + 1e-9;
              assert.notEqual(gapVerdict(inward, pct, n), "beyond", `the band draws a rate its own verdict rejects (${at}, edge ${edge})`);
            }
          }
          if (band.show) {
            assert.equal(band.lo, pct - band.half, at);
            assert.equal(band.hi, pct + band.half, at);
            for (const value of [band.lo, band.hi, pct]) {
              assert.ok(xAt(value) >= PAD - 1e-9 && xAt(value) <= W - PAD + 1e-9, `${value}% is drawn outside the axis (${at})`);
            }
            assert.ok(xAt(band.hi) - xAt(band.lo) > 2, at);
          }
          assert.ok(xAt(claim) - (d.marker.length * GLYPH_11) / 2 >= 0 && xAt(claim) + (d.marker.length * GLYPH_11) / 2 <= W, `the marker label leaves the viewBox (${at})`);

          // --- 5. the readout box -------------------------------------------------
          if (key === "volunteer") {
            assert.equal(box.headline, `${pct}% of the ${n} who answered, and no band`, at);
            assert.ok(box.arithmetic.startsWith(`${yes} of ${n} answers`), at);
            assert.doesNotMatch(box.headline + box.meaning + box.arithmetic, /\d+\.\d/u, `a design with no random sample must print no band (${at})`);
            assert.ok(!box.meaning.includes(DISTRICT_LABEL), `a self-selected sample must not claim the district (${at})`);
          } else {
            assert.equal(box.headline, `${s.loText}% to ${s.hiText}%`, at);
            // The rendered multiplication, checked as characters: "2 x 3.7 = 7.4", never "= 7.3".
            const product = /2 × (\d+\.\d) = (\d+\.\d) points/u.exec(box.arithmetic);
            assert.ok(product, `the readout must show the doubling (${at})`);
            assert.equal(tenths(product[1]), seT, at);
            assert.equal(tenths(product[2]), 2 * tenths(product[1]), `the printed product is not the product of the printed operands (${at})`);
            // The rendered square root, EVALUATED — not pasted. Interpolating s.seText into
            // the expected string only proves the component agrees with itself about the
            // characters; it let the experiment readout spell one formula while the band
            // was drawn from another, false at the printed tenth in 144 of 225 states.
            const root = key === "experiment"
              ? /sqrt\(2 × (\d+) × (\d+) \/ (\d+)\) = (\d+\.\d)/u.exec(box.arithmetic)
              : /sqrt\((\d+) × (\d+) \/ (\d+)\) = (\d+\.\d)/u.exec(box.arithmetic);
            assert.ok(root, `the readout must show the standard error it used (${at})`);
            const [, ra, rb, rn, rv] = root;
            const factor = key === "experiment" ? 2 : 1;
            assert.equal(
              tenths(rv),
              tenths(round1(Math.sqrt((factor * Number(ra) * Number(rb)) / Number(rn))).toFixed(1)),
              `the printed square root does not equal the printed value (${at}): sqrt of the shown operands is ${Math.sqrt((factor * Number(ra) * Number(rb)) / Number(rn))}`
            );
            assert.equal(tenths(rv), seT, `${at} must print the standard error the band was drawn from`);
          }
          if (key === "random") assert.ok(box.meaning.includes(DISTRICT_LABEL), at);

          // --- 6. the accessible name describes THIS design's drawing -------------
          assert.ok(label.includes(d.marker), `the label must name the marker the drawing shows (${at})`);
          if (key === "random") {
            assert.ok(label.startsWith("Random sample."), at);
            assert.ok(label.includes(`solid bar from ${s.loText} percent to ${s.hiText} percent`), at);
            assert.ok(label.includes(`stands ${inside ? "inside" : "outside"} the bar`), at);
          }
          if (key === "volunteer") {
            assert.ok(label.startsWith("Sign-up sheet sample."), at);
            assert.ok(label.includes("No band is drawn"), at);
            assert.doesNotMatch(label, /\d+\.\d/u, `the sign-up sheet draws no endpoints, so its label must name none (${at})`);
          }
          if (key === "experiment") {
            assert.ok(label.startsWith("Randomized experiment."), at);
            assert.ok(label.includes(`dashed band from ${s.loText} percent to ${s.hiText} percent`), at);
            const stands = gv === "beyond" ? "outside" : gv === "edge" ? "on the edge of" : "inside";
            assert.ok(label.includes(`stands ${stands} the band`), at);
          }

          // --- 7. the verdict sentence --------------------------------------------
          if (key === "random") {
            assert.ok(sentence.includes(`${claim}% sits ${inside ? "inside" : "outside"} the interval`), at);
            assert.equal(sentence.includes("evidence against the claim"), !inside, at);
            assert.equal(sentence.includes("does not rule the claim out"), inside, at);
            if (!inside) {
              assert.ok(sentence.includes(points(gap)) && sentence.includes(`${s.halfText}-point margin`), at);
              assert.ok(tenths(s.halfText) < gap * 10, `the printed margin must be smaller than the printed gap (${at})`);
            }
          }
          if (key === "volunteer") {
            assert.ok(sentence.startsWith(`The sheet measured ${pct}% among the students who chose to answer`), at);
            assert.ok(sentence.includes(`Whether ${claim}%`) && sentence.includes(DISTRICT_LABEL), at);
            assert.ok(sentence.includes("never given a chance to be counted"), at);
            assert.doesNotMatch(sentence, /\d+\.\d/u, `there is no band here, so no band number may be quoted (${at})`);
            assert.ok(!sentence.includes("inside") && !sentence.includes("outside"), `nothing is inside or outside a band that was not drawn (${at})`);
          }
          if (key === "experiment") {
            // The causal claim appears only where the GAP's own two-standard-error swing is beaten.
            assert.equal(sentence.includes("the reminder is the leading explanation"), gap > trueSwing, at);
            if (gap === 0) {
              assert.ok(sentence.includes("no gap here for the reminder to explain"), at);
            } else {
              assert.ok(sentence.includes(points(gap)), at);
              assert.ok(sentence.includes(`the ${s.halfText} points that random assignment alone swings the gap between two groups of ${n}`), at);
              assert.equal(sentence.includes("less than"), gv === "routine", at);
              assert.equal(sentence.includes("exactly"), gv === "edge", at);
              assert.equal(sentence.includes("more than"), gv === "beyond", at);
              const printed = tenths(s.halfText);
              if (gv === "routine") assert.ok(printed > gap * 10, `printed swing ${printed} must exceed the printed gap (${at})`);
              if (gv === "edge") assert.equal(printed, gap * 10, at);
              if (gv === "beyond") assert.ok(printed < gap * 10, `printed swing ${printed} must fall short of the printed gap (${at})`);
            }
          }
        }

        // --- 8. the three designs draw three different pictures --------------------
        const labels = DESIGNS.map((key) => figureLabel(key, pct, n, claim));
        assert.equal(new Set(labels).size, 3, `each design must describe its own drawing (${tag})`);
        assert.equal(new Set(DESIGNS.map((key) => verdict(key, pct, n, claim))).size, 3, tag);
        assert.equal(new Set(DESIGNS.map((option) => readout(option, pct, n, claim).headline)).size, 3, `each design must headline its own number (${tag})`);

        // --- 9. in the states where the two yardsticks part, the lesson uses the right one ---
        if (!inside && gv !== "beyond") {
          assert.ok(verdict("random", pct, n, claim).includes("evidence against the claim"), tag);
          assert.ok(!verdict("experiment", pct, n, claim).includes("the reminder is the leading explanation"), `one group's margin must never be used to credit the reminder (${tag})`);
        }
      }
    }
  }

  assert.equal(states, 5 * 9 * 5, "5 sample sizes x 9 sample percents x 5 marked values");
  // 20 of the 225 experiment states have a gap past one group's margin but inside the
  // gap's own null swing — the states where using one group's margin would have lied.
  assert.equal(oneSampleWouldHaveLied, 20);
  // Under the null rule (gap² · n vs 8 · pct · (100 − pct)) no shipped control setting
  // lands exactly on the boundary, so the "edge" verdict is unreachable from the UI.
  assert.equal(edges, 0);
  // The branch still has to be right, so exercise it directly: at pct = 50, n = 200 a
  // 10-point gap gives 10² · 200 = 20000 = 8 · 50 · 50 exactly.
  assert.equal(gapVerdict(60, 50, 200), "edge");
  assert.equal(gapVerdict(61, 50, 200), "beyond");
  assert.equal(gapVerdict(59, 50, 200), "routine");
  // These two track the ONE-SAMPLE estimation interval (intervalOf), not the
  // experiment band: narrowest is 300 students at 30% or 70%, widest 60 at 50%.
  assert.ok(Math.abs(narrowest - 2 * 2 * Math.sqrt((30 * 70) / 300)) < 1e-12);
  assert.ok(Math.abs(widest - 2 * 2 * Math.sqrt((50 * 50) / 60)) < 1e-12);
  assert.ok(narrowest > 10 && widest < 26);
});

test("the worked example is right, recomputed by hand, and its printed steps say so", () => {
  assert.deepEqual([WE_N, WE_YES, WE_CLAIM, WE_BIG_N], [300, 225, 65, 1200]);
  const we = workedExample();
  const steps = workedExampleSteps();
  assert.equal(steps.length, 6);

  // Step 1: 225 of 300 is 0.75, so the estimate is 75 percent. (225 x 4 = 900 = 300 x 3.)
  assert.equal(WE_YES * 4, WE_N * 3);
  assert.equal(we.pct, 75);
  assert.equal((WE_YES / WE_N).toFixed(2), "0.75");
  assert.ok(steps[0].includes("225/300 = 0.75") && steps[0].includes("the sample estimate is 75%"));

  // Step 2: se = sqrt(75 x 25 / 300) = sqrt(1875/300) = sqrt(6.25) = 2.5, and 2.5 x 2.5 = 6.25.
  assert.equal(75 * 25, 1875);
  assert.equal(1875 / 300, 6.25);
  assert.equal(2.5 * 2.5, 6.25);
  assert.equal(we.small.se, 2.5);
  assert.ok(steps[1].includes("sqrt(75 × 25 / 300) = sqrt(6.25) = 2.5 points"));

  // Step 3: the margin is two standard errors, 2 x 2.5 = 5.
  assert.equal(we.small.me, 5);
  assert.ok(steps[2].includes("2 × 2.5 = 5 points"));

  // Step 4: 75 - 5 = 70 and 75 + 5 = 80.
  assert.equal(we.small.lo, 70);
  assert.equal(we.small.hi, 80);
  assert.ok(steps[3].includes("75% plus or minus 5 points: 70% to 80%"));

  // Step 5: the budget's 65 is 10 below 75, which is 10 / 2.5 = 4 standard errors, so it is outside 70 to 80.
  assert.equal(we.gap, 10);
  assert.equal(75 - 65, 10);
  assert.equal(we.errors, 4);
  assert.equal(10 / 2.5, 4);
  assert.ok(WE_CLAIM < we.small.lo);
  assert.equal(claimIsPlausible(WE_CLAIM, we.pct, WE_N), false);
  // The same call in whole numbers: 10^2 x 300 = 30000 is bigger than 4 x 75 x 25 = 7500.
  assert.equal(10 * 10 * 300, 30000);
  assert.equal(4 * 75 * 25, 7500);
  assert.ok(30000 > 7500);
  assert.ok(steps[4].includes("10 percentage points below the estimate") && steps[4].includes("10 / 2.5 = 4 standard errors") && steps[4].includes("outside 70% to 80%"));

  // Step 6: four times the families, so se = sqrt(1875/1200) = sqrt(1.5625) = 1.25 and the margin is 2.5.
  assert.equal(we.ratio, 4);
  assert.equal(WE_BIG_N, 4 * WE_N);
  assert.equal(1875 / 1200, 1.5625);
  assert.equal(1.25 * 1.25, 1.5625);
  assert.equal(we.big.se, 1.25);
  assert.equal(we.big.me, 2.5);
  assert.equal(we.big.lo, 72.5);
  assert.equal(we.big.hi, 77.5);
  assert.equal(we.small.me / 2, we.big.me);
  assert.equal(claimIsPlausible(WE_CLAIM, we.pct, WE_BIG_N), false);
  assert.ok(steps[5].includes("4 times the families, not 2") && steps[5].includes("the standard error is 1.25 and the margin is 2.5 points, giving 72.5% to 77.5%"));

  // Every "a x b = c" and "a / b = c" the student reads is arithmetic that comes out.
  let checked = 0;
  for (const match of steps.join("  ").matchAll(/(\d+(?:\.\d+)?) (×|\/) (\d+(?:\.\d+)?) = (\d+(?:\.\d+)?)/gu)) {
    const a = Number(match[1]), b = Number(match[3]), c = Number(match[4]);
    assert.equal(match[2] === "×" ? a * b : a / b, c, `the step prints ${match[0]}, which is false`);
    checked += 1;
  }
  assert.equal(checked, 2, "the doubling in step 3 and the division in step 5");
});

test("the Try it answer is the interval the report describes", () => {
  assert.deepEqual([TRY_PCT, TRY_ME], [58, 6]);
  // 58 - 6 = 52 and 58 + 6 = 64.
  const lo = 52;
  const hi = 64;
  assert.equal(TRY_PCT - TRY_ME, lo);
  assert.equal(TRY_PCT + TRY_ME, hi);

  const options = tryOptions();
  assert.equal(options.length, 4);
  assert.equal(options.filter((option) => option.ok).length, 1, "exactly one option is supported");
  const answer = tryAnswerIndex();
  assert.equal(answer, 1);
  assert.equal(options[answer].why, "correct");
  assert.ok(options[answer].text.includes(`from ${lo}% to ${hi}%`));

  // Option 1 pins the population to one number, which only a zero-width interval could do; 52 is not 64.
  assert.equal(options[0].ok, false);
  assert.notEqual(lo, hi);
  // Option 3 needs the low end below 50, but the low end is 52.
  assert.equal(options[2].ok, false);
  assert.ok(lo > 50);
  // Option 4 needs the margin to survive a four-fold sample; it halves, 6 / 2 = 3.
  assert.equal(options[3].ok, false);
  assert.equal(TRY_ME / Math.sqrt(4), 3);
  assert.notEqual(TRY_ME / Math.sqrt(4), TRY_ME);
  assert.ok(options[3].why.includes("halves the margin to 3 points"));
  assert.equal(new Set(options.map((option) => option.text)).size, 4);

  // The sentence shown after either answer states the same subtraction and addition.
  assert.equal(trySentence(), "The report gives 58% give or take 6 points, so the plausible values run from 58 − 6 = 52% up to 58 + 6 = 64%.");
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of BRIEF_STANDARDS) assert.ok(cited.includes(must), `${must} must be cited`);

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }
  // The accessible name is computed from all four pieces of figure state, the design included.
  assert.match(source, /aria-label=\{figureLabel\(key, pct, n, claim\)\}/u);

  // The design toggle, the mapped Try-it option, Next step, Start over, and the stepper's decrease/increase pair.
  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(buttonTags.length, 6);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  // The drawing itself answers the design control: a band, or arrows and a hollow dot instead of one.
  assert.match(source, /\{band\.show \? \(/u);
  assert.match(source, /strokeDasharray=\{key === "experiment" \? "7 5" : undefined\}/u);
  assert.match(source, /fill=\{band\.show \? ACCENT : "var\(--surface\)"\}/u);

  // No decimal is formatted inside the component: every shown number comes from shownBand, rounded once.
  const body = source.slice(source.indexOf("export default function Lesson()"));
  assert.ok(!body.includes("toFixed"), "the component must print only strings the formatters already rounded");

  assert.match(source, /value=\{n\} min=\{N_MIN\} max=\{N_MAX\} step=\{N_STEP\}/u);
  assert.match(source, /value=\{pct\} min=\{PCT_MIN\} max=\{PCT_MAX\} step=\{PCT_STEP\}/u);
  assert.match(source, /value=\{claim\} min=\{CLAIM_MIN\} max=\{CLAIM_MAX\} step=\{CLAIM_STEP\}/u);
  assert.match(source, /disabled=\{value <= min\}/u);
  assert.match(source, /disabled=\{value >= max\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{key === option\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
});
