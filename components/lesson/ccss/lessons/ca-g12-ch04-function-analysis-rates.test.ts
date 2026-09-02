import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BALL_A,
  BALL_B,
  BALL_C,
  BALL_T1,
  BALL_T2,
  CELL_X,
  CELL_Y,
  CLUBS,
  H,
  LATE_A_WEEK,
  LATE_B_WEEK,
  MEMBER_MAX,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  STEP,
  TRY_A_WEEK,
  TRY_B_WEEK,
  TRY_ORDER,
  W,
  WEEK_MAX,
  WEEK_MIN,
  averageRate,
  ballHeight,
  ballWorked,
  clubInfo,
  countedText,
  curvePoints,
  figureLabel,
  gcd,
  givenBy,
  memberCounts,
  memberPhrase,
  members,
  numText,
  rateNoun,
  rateSignature,
  rationalLong,
  rationalText,
  rationalValue,
  reduce,
  signatureName,
  signatureText,
  sourceText,
  stepChanges,
  sx,
  sy,
  tryAnswerIndex,
  tryChoices,
  type ClubKey,
} from "./ca-g12-ch04-function-analysis-rates";

const SLUG = "ca-g12-ch04-function-analysis-rates";
const BRIEF_STANDARDS = ["F-BF.3", "F-IF.1", "F-IF.2", "F-IF.3", "F-IF.4", "F-IF.5", "F-IF.6", "F-IF.7", "F-IF.8", "F-IF.9"];
const KEYS: ClubKey[] = ["chess", "ski", "game"];
const CLOSE = 1e-9;

/** The three models written out again, independently of the lesson's own branch. */
function handCount(key: ClubKey, w: number): number {
  if (key === "chess") return 10 * w + 4;
  if (key === "ski") return 64 - 4 * Math.pow(w - 3, 2);
  return Math.pow(2, w);
}

/** The seven counts, typed out by hand rather than computed. */
const HAND_COUNTS: Record<ClubKey, number[]> = {
  chess: [4, 14, 24, 34, 44, 54, 64],
  ski: [28, 48, 60, 64, 60, 48, 28],
  game: [1, 2, 4, 8, 16, 32, 64],
};

/** The six weekly changes, also typed out by hand. */
const HAND_CHANGES: Record<ClubKey, number[]> = {
  chess: [10, 10, 10, 10, 10, 10],
  ski: [20, 12, 4, -4, -12, -20],
  game: [1, 2, 4, 8, 16, 32],
};

/**
 * Every count any club can display, with the two readouts written out as finished English
 * rather than as a rule. Nothing here calls the lesson's helpers, so an agreement bug in
 * either the noun or the verb fails a comparison instead of passing a regex.
 */
const HAND_PHRASE: Record<number, string> = {
  1: "1 member", 2: "2 members", 4: "4 members", 8: "8 members", 14: "14 members", 16: "16 members",
  24: "24 members", 28: "28 members", 32: "32 members", 34: "34 members", 44: "44 members",
  48: "48 members", 54: "54 members", 60: "60 members", 64: "64 members",
};
const HAND_SENTENCE: Record<number, string> = {
  1: "1 member was counted that week",
  2: "2 members were counted that week",
  4: "4 members were counted that week",
  8: "8 members were counted that week",
  14: "14 members were counted that week",
  16: "16 members were counted that week",
  24: "24 members were counted that week",
  28: "28 members were counted that week",
  32: "32 members were counted that week",
  34: "34 members were counted that week",
  44: "44 members were counted that week",
  48: "48 members were counted that week",
  54: "54 members were counted that week",
  60: "60 members were counted that week",
  64: "64 members were counted that week",
};

test("grid constants, scales, fractions and number formatting", () => {
  assert.deepEqual([WEEK_MIN, WEEK_MAX, MEMBER_MAX], [0, 6, 64]);
  assert.deepEqual([CELL_X, CELL_Y, PAD_L, PAD_R, PAD_T, PAD_B], [46, 4, 34, 18, 20, 28]);
  assert.equal(W, 34 + 6 * 46 + 18);
  assert.equal(W, 328);
  assert.equal(H, 20 + 64 * 4 + 28);
  assert.equal(H, 304);
  assert.equal(STEP, 0.0625, "1/16 is exact in binary");
  assert.equal(WEEK_MAX / STEP, 96);
  assert.equal(sx(WEEK_MIN), PAD_L);
  assert.equal(sx(WEEK_MAX), W - PAD_R);
  assert.equal(sy(0), H - PAD_B);
  assert.equal(sy(MEMBER_MAX), PAD_T);

  assert.equal(gcd(28, 3), 1);
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(0, 4), 4);
  assert.deepEqual(reduce(30, 3), { num: 10, den: 1 });
  assert.deepEqual(reduce(28, 3), { num: 28, den: 3 });
  assert.deepEqual(reduce(-12, 3), { num: -4, den: 1 });
  assert.deepEqual(reduce(0, 4), { num: 0, den: 1 });
  assert.deepEqual(reduce(63, 6), { num: 21, den: 2 }, "63/6 reduces to 21/2");
  assert.deepEqual(reduce(15, 4), { num: 15, den: 4 });

  assert.equal(numText(0), "0");
  assert.equal(numText(10), "10");
  assert.equal(numText(-4), "−4");
  assert.equal(numText(9.333333333333334), "9.33");
  assert.equal(numText(-0.5), "−0.5");
  assert.equal(rationalText({ num: 10, den: 1 }), "10");
  assert.equal(rationalText({ num: -4, den: 1 }), "−4");
  assert.equal(rationalText({ num: 28, den: 3 }), "28/3");
  assert.equal(rationalLong({ num: 10, den: 1 }), "10");
  assert.equal(rationalLong({ num: 28, den: 3 }), "28/3 ≈ 9.33", "28 ÷ 3 = 9.333… rounds to 9.33");
  assert.equal(rationalLong({ num: 56, den: 3 }), "56/3 ≈ 18.67", "56 ÷ 3 = 18.666… rounds to 18.67");
  assert.equal(rationalValue({ num: 21, den: 2 }), 10.5);
  assert.equal(rateNoun({ num: 1, den: 1 }), "member");
  assert.equal(rateNoun({ num: 10, den: 1 }), "members");
  assert.equal(rateNoun({ num: 1, den: 3 }), "members");
});

test("every count a card or label can show reads as grammatical English", () => {
  // 1. The finished sentences, compared against hand-written English for every reachable count.
  const seen = new Set<number>();
  for (const key of KEYS) {
    for (let w = WEEK_MIN; w <= WEEK_MAX; w += 1) {
      const n = handCount(key, w);
      seen.add(n);
      assert.equal(memberPhrase(n), HAND_PHRASE[n], `${key} week ${w}: phrase`);
      assert.equal(countedText(n), HAND_SENTENCE[n], `${key} week ${w}: card sentence`);
    }
  }
  // Game club week 0 is the state that used to read "1 member were counted that week".
  assert.equal(handCount("game", 0), 1);
  assert.equal(countedText(1), "1 member was counted that week");
  assert.equal(memberPhrase(1), "1 member");
  // The hand table covers exactly the reachable counts — no state escapes the comparison above.
  assert.deepEqual([...seen].sort((x, y) => x - y), Object.keys(HAND_PHRASE).map(Number).sort((x, y) => x - y));
  assert.equal(seen.size, 15);

  // 2. The agreement invariant itself, over the whole axis, checked on the produced strings.
  for (let n = 0; n <= MEMBER_MAX; n += 1) {
    const sentence = countedText(n), phrase = memberPhrase(n);
    assert.ok(sentence.startsWith(`${n} `), `${n}: the sentence opens with the count`);
    assert.ok(phrase.startsWith(`${n} `), `${n}: the phrase opens with the count`);
    assert.equal(/\bwas\b/u.test(sentence), n === 1, `${n}: "was" only for one member`);
    assert.equal(/\bwere\b/u.test(sentence), n !== 1, `${n}: "were" for every other count`);
    assert.equal(/\bmember\b/u.test(sentence), n === 1, `${n}: singular noun only for one member`);
    assert.equal(/\bmembers\b/u.test(sentence), n !== 1, `${n}: plural noun otherwise`);
    assert.equal(/\bmember\b/u.test(phrase), n === 1, `${n}: phrase noun`);
    assert.doesNotMatch(sentence, /\b1 members\b|\b1 member were\b/u, `${n}: no "1 apples" defect`);
    assert.doesNotMatch(phrase, /\b1 members\b/u, `${n}: no "1 apples" defect`);
    assert.equal(sentence.endsWith(" counted that week"), true, `${n}: same sentence frame at every count`);
  }
});

test("two clubs are given by a rule and one is given only by a table", () => {
  assert.deepEqual(CLUBS.map((c) => c.key), KEYS);
  assert.deepEqual(CLUBS.map((c) => c.formula === null), [false, false, true], "only the game club lacks a rule");
  assert.equal(givenBy("chess"), "formula");
  assert.equal(givenBy("ski"), "formula");
  assert.equal(givenBy("game"), "table");
  assert.equal(clubInfo("game").formula, null);
  assert.match(sourceText("chess"), /arrives as a rule/u);
  assert.match(sourceText("game"), /arrives as a table and nothing more/u);
  assert.doesNotMatch(sourceText("game"), /G\(w\)|2\^w/u, "the table club never shows a rule");
  // The accessible label tells the same truth, in every interval state.
  for (let a = WEEK_MIN; a <= WEEK_MAX - 1; a += 1) {
    for (let b = a + 1; b <= WEEK_MAX; b += 1) {
      assert.match(figureLabel("chess", a, b), /follows the rule C\(w\) = 10w \+ 4/u);
      assert.match(figureLabel("game", a, b), /is given only as a table of counts, with no rule/u);
      assert.doesNotMatch(figureLabel("game", a, b), /follows the rule|2\^w/u);
    }
  }
  // Comparing the two representations is the point: same interval, rates read the same way.
  assert.deepEqual(averageRate("chess", 2, 5), { num: 10, den: 1 });
  assert.deepEqual(averageRate("game", 2, 5), { num: 28, den: 3 });
  assert.equal((HAND_COUNTS.chess[5] - HAND_COUNTS.chess[2]) / 3, 10, "read off the rule");
  assert.equal(HAND_COUNTS.game[5] - HAND_COUNTS.game[2], 28, "read off the table");
});

test("the three models produce the counts and weekly changes claimed", () => {
  assert.deepEqual(CLUBS.map((c) => c.letter), ["C", "S", "G"]);
  assert.equal(clubInfo("ski").formula, "S(w) = 64 − 4(w − 3)²");
  assert.throws(() => clubInfo("swim" as unknown as ClubKey), /unknown club/u);

  for (const key of KEYS) {
    assert.deepEqual(memberCounts(key), HAND_COUNTS[key], `${key} counts`);
    assert.deepEqual(stepChanges(key), HAND_CHANGES[key], `${key} weekly changes`);
    for (let w = WEEK_MIN; w <= WEEK_MAX; w += 1) {
      assert.equal(members(key, w), handCount(key, w), `${key} at week ${w}`);
      assert.ok(Number.isInteger(members(key, w)), `${key} at week ${w} is a whole number`);
      assert.ok(members(key, w) >= 0 && members(key, w) <= MEMBER_MAX, `${key} at week ${w} is on the axis`);
    }
    // Each weekly change really is a difference of two counts.
    for (const [i, d] of stepChanges(key).entries()) {
      assert.equal(d, HAND_COUNTS[key][i + 1] - HAND_COUNTS[key][i], `${key} change ${i}`);
    }
  }
  // Hand arithmetic on the awkward one: 64 − 4(0 − 3)² = 64 − 36 = 28 and 64 − 4(3 − 3)² = 64.
  assert.equal(64 - 4 * 9, 28);
  assert.equal(members("ski", 3), 64);
  assert.equal(Math.pow(2, 6), 64);
});

test("each family's rate signature is what the lesson says it is, and the three tests do not overlap", () => {
  // Linear: the six changes are identical.
  const chess = HAND_CHANGES.chess;
  assert.equal(new Set(chess).size, 1);
  assert.deepEqual(rateSignature("chess"), { kind: "constant", value: 10 });
  assert.equal(signatureName("chess"), "same change every week");
  assert.match(signatureText("chess"), /Every weekly change is the same 10, so C is linear/u);

  // Quadratic: the changes fall by a constant 8 each week (the second difference of S).
  const ski = HAND_CHANGES.ski;
  const skiDiffs = ski.slice(1).map((v, i) => v - ski[i]);
  assert.deepEqual(skiDiffs, [-8, -8, -8, -8, -8]);
  assert.deepEqual(rateSignature("ski"), { kind: "arithmetic", value: -8 });
  assert.equal(signatureName("ski"), "the change steps down evenly");
  assert.match(signatureText("ski"), /Each weekly change is 8 less than the one before, so .* S is quadratic/u);
  // 2a for S(w) = −4w² + 24w + 28 is −8, which is exactly that second difference.
  assert.equal(2 * -4, -8);

  // Exponential: the changes multiply by 2, the same factor the counts do.
  const game = HAND_CHANGES.game;
  const gameRatios = game.slice(1).map((v, i) => v / game[i]);
  assert.deepEqual(gameRatios, [2, 2, 2, 2, 2]);
  assert.deepEqual(rateSignature("game"), { kind: "geometric", value: 2 });
  assert.equal(signatureName("game"), "the change multiplies");
  assert.match(signatureText("game"), /Each weekly change is 2 times the one before/u);
  // 2^(w+1) − 2^w = 2^w, so the change list is the count list again.
  for (let w = 0; w < WEEK_MAX; w += 1) assert.equal(game[w], Math.pow(2, w));

  // Exclusivity: a constant change also steps by a fixed amount (0) and multiplies by a fixed
  // factor (1), so the clauses only separate the families because of the wording the lesson uses —
  // "non-zero" step, factor "other than 1" — and because the code tests constant first.
  assert.deepEqual(chess.slice(1).map((v, i) => v - chess[i]), [0, 0, 0, 0, 0]);
  assert.deepEqual(chess.slice(1).map((v, i) => v / chess[i]), [1, 1, 1, 1, 1]);
  assert.equal(rateSignature("chess").kind, "constant", "a constant change is never reported as quadratic or exponential");
  assert.notEqual(skiDiffs[0], 0, "the quadratic's step is non-zero");
  assert.notEqual(gameRatios[0], 1, "the exponential's factor is not 1");
  // No club has a zero weekly change, so the ratio list is never a division by zero — and the code
  // only forms it once that is true.
  for (const key of KEYS) assert.ok(stepChanges(key).every((d) => d !== 0), `${key}: no zero weekly change`);
});

test("every reachable (club, a, b) state keeps the figure and its readouts true", () => {
  let states = 0;
  for (const key of KEYS) {
    for (let a = WEEK_MIN; a <= WEEK_MAX - 1; a += 1) {
      for (let b = a + 1; b <= WEEK_MAX; b += 1) {
        states += 1;
        const where = `${key} [${a}, ${b}]`;
        const fa = members(key, a), fb = members(key, b), rise = fb - fa, run = b - a;
        assert.equal(fa, handCount(key, a), `${where}: f(a)`);
        assert.equal(fb, handCount(key, b), `${where}: f(b)`);

        // --- the two week cards ----------------------------------------------
        assert.equal(countedText(fa), HAND_SENTENCE[fa], `${where}: week a card`);
        assert.equal(countedText(fb), HAND_SENTENCE[fb], `${where}: week b card`);

        // --- the average rate, as an exact fraction --------------------------
        const rate = averageRate(key, a, b);
        assert.ok(rate.den >= 1 && Number.isInteger(rate.den), `${where}: positive integer denominator`);
        assert.ok(Number.isInteger(rate.num), `${where}: integer numerator`);
        assert.equal(gcd(rate.num, rate.den), rate.num === 0 ? rate.den : 1, `${where}: in lowest terms`);
        assert.equal(rate.num * run, rise * rate.den, `${where}: num/den equals rise/run exactly`);
        assert.ok(Math.abs(rationalValue(rate) - rise / run) < CLOSE, `${where}: decimal agrees`);
        // Family-by-family closed forms, derived on paper.
        if (key === "chess") assert.deepEqual(rate, { num: 10, den: 1 }, `${where}: a line has one rate`);
        if (key === "ski") assert.deepEqual(rate, { num: -4 * (a + b - 6) + 0, den: 1 }, `${where}: −4(a + b − 6), with −0 normalised to 0`);
        if (key === "game") assert.equal(rate.num * run, (Math.pow(2, b) - Math.pow(2, a)) * rate.den, `${where}: (2^b − 2^a)/(b − a)`);

        // --- the strip claim: the highlighted changes average to that rate ----
        const highlighted = stepChanges(key).slice(a, b);
        assert.equal(highlighted.length, run, `${where}: one chip per week crossed`);
        const total = highlighted.reduce((s, d) => s + d, 0);
        assert.equal(total, rise, `${where}: the crossed changes total the rise`);
        assert.equal(total * rate.den, rate.num * run, `${where}: their mean is the average rate`);

        // --- pixels: everything drawn stays inside the viewBox ----------------
        for (const [w, m] of [[a, fa], [b, fb]] as const) {
          assert.ok(sx(w) >= PAD_L && sx(w) <= W - PAD_R, `${where}: marker x in the plot`);
          assert.ok(sy(m) >= PAD_T && sy(m) <= H - PAD_B, `${where}: marker y in the plot`);
          assert.ok(sx(w) - 6 >= 0 && sx(w) + 6 <= W, `${where}: marker circle x inside the viewBox`);
          assert.ok(sy(m) - 6 >= 0 && sy(m) + 6 <= H, `${where}: marker circle y inside the viewBox`);
        }
        assert.ok(sy(fa) + 13 <= H, `${where}: the run label sits inside the viewBox`);
        assert.ok(sx(b) - 7 >= 0, `${where}: the rise label sits inside the viewBox`);
        const riseLabelY = (sy(fa) + sy(fb)) / 2 + 3;
        assert.ok(riseLabelY >= 0 && riseLabelY <= H, `${where}: the rise label baseline is inside the viewBox`);

        // --- the accessible label is true in this state -----------------------
        const label = figureLabel(key, a, b);
        assert.ok(label.includes(`week ${a} at ${HAND_PHRASE[fa]}`), `${where}: ${label}`);
        assert.ok(label.includes(`week ${b} at ${HAND_PHRASE[fb]}`), `${where}: ${label}`);
        assert.ok(label.includes(`changing by ${numText(rise)}`), `${where}: ${label}`);
        assert.ok(label.includes(`run of ${run} ${run === 1 ? "week" : "weeks"}`), `${where}: ${label}`);
        assert.ok(label.includes(`an average of ${rationalText(rate)} ${rateNoun(rate)} per week`), `${where}: ${label}`);
        assert.equal(rateNoun(rate), rise === run ? "member" : "members", `${where}: singular only when the rate is exactly 1`);
        assert.ok(label.includes(HAND_COUNTS[key].join(", ")), `${where}: the label lists the counts`);
        assert.doesNotMatch(label, /\b1 (?:members|weeks)\b/u, `${where}: plural agreement`);
      }
    }
  }
  assert.equal(states, 3 * 21);
  assert.equal(states, 63);
});

test("the drawn path matches the club's representation and stays on the canvas", () => {
  for (const key of KEYS) {
    const parts = curvePoints(key).split(" ");
    if (givenBy(key) === "formula") {
      // A published rule can be sampled anywhere, so the model curve is drawn finely.
      assert.equal(parts.length, WEEK_MAX / STEP + 1);
      assert.equal(parts.length, 97);
    } else {
      // A table is only known at the seven recorded weeks, so only those are joined.
      assert.equal(parts.length, WEEK_MAX + 1);
      assert.equal(parts.length, 7);
    }
    for (const [i, part] of parts.entries()) {
      const [px, py] = part.split(",").map(Number);
      const w = givenBy(key) === "formula" ? WEEK_MIN + i * STEP : i;
      const m = handCount(key, w);
      assert.ok(m >= 0 && m <= MEMBER_MAX, `${key}: the model stays between 0 and ${MEMBER_MAX} at week ${w}`);
      assert.ok(Math.abs(px - sx(w)) <= 0.0051, `${key}: sample ${i} x`);
      assert.ok(Math.abs(py - sy(m)) <= 0.0051, `${key}: sample ${i} y`);
      assert.ok(px >= PAD_L - 0.01 && px <= W - PAD_R + 0.01, `${key}: sample ${i} inside the plot horizontally`);
      assert.ok(py >= PAD_T - 0.01 && py <= H - PAD_B + 0.01, `${key}: sample ${i} inside the plot vertically`);
    }
    // The seven data dots (radius 3.5) sit on the same path and inside the box.
    for (const [w, m] of memberCounts(key).entries()) {
      assert.equal(m, handCount(key, w));
      assert.ok(sy(m) - 3.5 >= 0 && sy(m) + 3.5 <= H, `${key}: dot at week ${w}`);
    }
  }
  // The table club's path really is its counts, in order.
  assert.equal(curvePoints("game"), HAND_COUNTS.game.map((m, w) => `${sx(w).toFixed(2)},${sy(m).toFixed(2)}`).join(" "));
});

test("worked example: the ball's heights, rates, average speed, vertex form and domain", () => {
  assert.deepEqual([BALL_A, BALL_B, BALL_C, BALL_T1, BALL_T2], [-5, 30, 20, 1, 5]);
  // h(t) = −5t² + 30t + 20, worked by hand.
  assert.equal(ballHeight(0), 20);
  assert.equal(ballHeight(1), -5 + 30 + 20);
  assert.equal(ballHeight(1), 45);
  assert.equal(ballHeight(3), -45 + 90 + 20);
  assert.equal(ballHeight(3), 65);
  assert.equal(ballHeight(5), -125 + 150 + 20);
  assert.equal(ballHeight(5), 45);

  const k = ballWorked();
  assert.equal(k.h1, 45);
  assert.equal(k.h2, 45);
  assert.equal(k.hPeak, 65);
  assert.equal(k.peakT, 3, "−b/2a = −30 / (2 × −5) = 3");
  assert.equal(-BALL_B / (2 * BALL_A), 3);
  // Average rate of change on [1, 5] is (45 − 45)/4 = 0/4 = 0: the secant is level.
  assert.deepEqual(k.whole, { num: 0, den: 1 });
  assert.equal((45 - 45) / (5 - 1), 0);
  // But the two halves are +10 and −10 meters per second, and they cancel.
  assert.deepEqual(k.up, { num: 10, den: 1 });
  assert.deepEqual(k.down, { num: -10, den: 1 });
  assert.equal((65 - 45) / (3 - 1), 10);
  assert.equal((45 - 65) / (5 - 3), -10);
  assert.equal(rationalValue(k.up) + rationalValue(k.down), 0);

  // Average SPEED is a different number, and the step that says so must be right: the peak is
  // interior to [1, 5] and h rises then falls, so the distance travelled is 20 up plus 20 down.
  assert.ok(BALL_T1 < k.peakT && k.peakT < BALL_T2, "the peak is inside the interval");
  for (let t = BALL_T1; t < k.peakT - CLOSE; t += 1 / 32) assert.ok(ballHeight(t + 1 / 32) > ballHeight(t), `rising at t = ${t}`);
  for (let t = k.peakT; t < BALL_T2 - CLOSE; t += 1 / 32) assert.ok(ballHeight(t + 1 / 32) < ballHeight(t), `falling at t = ${t}`);
  assert.equal(k.climb, 20);
  assert.equal(k.drop, 20);
  assert.equal(65 - 45, 20);
  assert.equal(k.distance, 40);
  assert.equal(20 + 20, 40);
  assert.deepEqual(k.speed, { num: 10, den: 1 }, "40 meters of travel in 4 seconds is 10 meters per second");
  assert.equal(40 / (5 - 1), 10);
  assert.notEqual(rationalValue(k.speed), rationalValue(k.whole), "average speed is not the average rate of change of height");

  // Completing the square: −5(t² − 6t + 9) + 45 + 20 = −5(t − 3)² + 65.
  assert.equal(k.inner, 6);
  assert.equal(k.square, 9);
  assert.equal(k.added, 45);
  assert.equal(k.added + BALL_C, k.hPeak);
  for (const t of [0, 1, 2, 3, 4, 5, 6]) {
    assert.equal(-5 * Math.pow(t - 3, 2) + 65, ballHeight(t), `vertex form agrees at t = ${t}`);
    assert.ok(ballHeight(t) <= k.hPeak, `t = ${t} does not beat the maximum`);
  }
  // Meeting the water: (t − 3)² = 65/5 = 13, so t = 3 + √13 ≈ 6.61 seconds.
  assert.equal(k.radicand, 13);
  assert.equal(65 / 5, 13);
  assert.ok(Math.abs(k.landing - (3 + Math.sqrt(13))) < CLOSE);
  assert.ok(Math.abs(k.landing - 6.605551275463989) < CLOSE, "√13 is irrational");
  assert.equal(numText(Math.round(k.landing * 100) / 100), "6.61");
  assert.ok(Math.abs(ballHeight(k.landing)) < 1e-9, "the model reads zero at the landing time");
  assert.ok(ballHeight(k.landing + 0.5) < 0, "past landing the formula returns non-heights");
});

test("Try it: the chess club has the greatest average rate over weeks 2 to 5", () => {
  assert.deepEqual([TRY_A_WEEK, TRY_B_WEEK, LATE_A_WEEK, LATE_B_WEEK], [2, 5, 3, 6]);
  assert.deepEqual(TRY_ORDER, ["game", "chess", "ski"]);

  // Hand arithmetic: chess 24 → 54 is 30 in 3 weeks = 10; game 4 → 32 is 28 in 3 weeks = 28/3;
  // ski 60 → 48 is −12 in 3 weeks = −4.
  assert.deepEqual(averageRate("chess", 2, 5), { num: 10, den: 1 });
  assert.deepEqual(averageRate("game", 2, 5), { num: 28, den: 3 });
  assert.deepEqual(averageRate("ski", 2, 5), { num: -4, den: 1 });
  assert.equal((54 - 24) / 3, 10);
  assert.equal(32 - 4, 28);
  assert.equal((48 - 60) / 3, -4);
  assert.ok(10 * 3 > 28 * 1, "10 beats 28/3 because 30 > 28");

  const choices = tryChoices();
  const answer = tryAnswerIndex();
  assert.equal(choices.length, 4);
  assert.deepEqual(choices.map((c) => c.text), ["Game club", "Chess club", "Ski club", "All three at the same rate"]);
  assert.equal(new Set(choices.map((c) => c.text)).size, 4, "choices are distinct");
  assert.equal(answer, 1);
  assert.equal(choices[answer].text, "Chess club");
  assert.equal(choices[3].rate, null, "the tie option carries no rate");
  // The winner beats every rival strictly, so the tie option is genuinely wrong.
  const winner = rationalValue(choices[answer].rate!);
  for (const [i, c] of choices.entries()) {
    if (i === answer || !c.rate) continue;
    assert.ok(rationalValue(c.rate) < winner, `choice ${i} is slower than the answer`);
  }
  // Doubling wins later: weeks 3 to 6 is 8 → 64, i.e. 56 in 3 weeks = 56/3 ≈ 18.67 > 10.
  assert.deepEqual(averageRate("game", 3, 6), { num: 56, den: 3 });
  assert.equal(64 - 8, 56);
  assert.ok(56 / 3 > 10);
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);
  const lines = source.split("\n").length - 1;
  assert.ok(lines >= 120 && lines <= 260, `the lesson is ${lines} lines; the contract allows 120 to 260`);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/gu)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of ["F-IF.1", "F-IF.2", "F-IF.3", "F-IF.4", "F-IF.5", "F-IF.6", "F-IF.7", "F-IF.8", "F-IF.9"]) {
    assert.ok(cited.includes(must), `${must} must be cited`);
  }

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  // Club choice, Next step, Start over, the mapped Try-it choice, and the stepper pair.
  assert.equal(buttonTags.length, 6);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  // Inline control bounds match the state grid enumerated above.
  assert.match(source, /label="Week a" value=\{a\} min=\{WEEK_MIN\} max=\{b - 1\}/u);
  assert.match(source, /label="Week b" value=\{b\} min=\{a \+ 1\} max=\{WEEK_MAX\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{clubKey === c\.key\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  // The readouts checked above are the ones actually rendered: the cards print countedText, the
  // svg prints figureLabel, and the table club's counts come from memberCounts.
  assert.match(source, /small: countedText\(fa\)/u);
  assert.match(source, /small: countedText\(fb\)/u);
  assert.match(source, /aria-label=\{figureLabel\(clubKey, a, b\)\}/u);
  assert.match(source, /points=\{curvePoints\(clubKey\)\}/u);
  assert.match(source, /\{memberCounts\(clubKey\)\.map\(\(m, w\) => <td/u, "the table club renders its recorded counts");
  assert.match(source, /\{sourceText\(clubKey\)\}/u);
  // The kite that did not obey projectile motion is gone, and so are the British spellings.
  assert.doesNotMatch(source, /kite|metres|modelled|kilometre|travelled/iu, "US spelling, and no free-fall kite");
  assert.doesNotMatch(source, /average vertical speed/u, "the interval question asks for a rate of change, not a speed");
  assert.match(source, /non-zero amount mean quadratic/u, "the quadratic clause excludes a constant change");
  assert.match(source, /fixed factor other than 1 mean exponential/u, "the exponential clause excludes a constant change");
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
  assert.doesNotMatch(source, /bg-linear-|inset-shadow-|text-shadow-|field-sizing-|not-\[/u, "Tailwind 3.4 only");
});
