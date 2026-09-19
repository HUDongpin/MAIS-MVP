import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CONTROLS,
  EXAMPLE,
  HOURS_MAX,
  NL_H,
  NL_PAD,
  NL_SPAN,
  NL_W,
  NL_Y,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  SVG_H,
  SVG_W,
  TRY_OPTIONS,
  axisTop,
  comparePlans,
  costAt,
  crossLabel,
  crossStory,
  crossesInWindow,
  decimalStory,
  dollars,
  exampleSteps,
  expandDecimal,
  fracText,
  fractionValue,
  gcd,
  graphLabel,
  hourNoun,
  lineLabel,
  mathCheckRationalClause,
  moneyText,
  numberLineNote,
  placedNumber,
  readoutSentence,
  reduce,
  revealLabel,
  scaleLine,
  scaleX,
  scaleY,
  signedText,
  solvedLine,
  trapBetween,
  tryAnswerIndex,
  tryFeedback,
  workedExample,
  type Comparison,
  type Fraction,
  type Target
} from "./ca-g8-ch01-linear-equations-systems-readiness";

const SLUG = "ca-g8-ch01-linear-equations-systems-readiness";
const source = readFileSync(path.join(process.cwd(), `components/lesson/ccss/lessons/${SLUG}.tsx`), "utf8");
/** Exactly the standards listed in the chapter brief for us-ca-math-s2-chapter-01. */
const BRIEF_STANDARDS = new Set(["8.EE.C.7", "8.EE.C.8", "8.NS.A.1", "8.NS.A.2"]);
/** Generous upper bound on a monospace glyph advance at the label font sizes used. */
const GLYPH = 8;
/** Integer products can land on -0, which strict equality treats as its own value. */
const z = (n: number) => n + 0;
const TARGETS: Target[] = ["break", "root2"];

function digitsToInt(digits: number[]) {
  return digits.reduce((total, digit) => total * 10 + digit, 0);
}

/**
 * Rebuild the exact rational value that a printed decimal expansion stands for,
 * without calling back into the lesson helper that produced the digits.
 */
function reconstruct(f: Fraction) {
  const decimal = expandDecimal(f);
  if (decimal.repeatFrom === null) {
    const scale = 10 ** decimal.digits.length;
    return { num: decimal.whole * scale + digitsToInt(decimal.digits), den: scale };
  }
  const lead = decimal.digits.slice(0, decimal.repeatFrom);
  const block = decimal.digits.slice(decimal.repeatFrom);
  const nines = 10 ** block.length - 1;
  const den = 10 ** lead.length * nines;
  return { num: decimal.whole * den + digitsToInt(lead) * nines + digitsToInt(block), den };
}

/** A reduced fraction terminates exactly when its denominator is 2^a * 5^b. */
function onlyTwosAndFives(den: number) {
  let rest = den;
  while (rest % 2 === 0) rest /= 2;
  while (rest % 5 === 0) rest /= 5;
  return rest === 1;
}

function checkDecimalClaim(f: Fraction) {
  const decimal = expandDecimal(f);
  const rebuilt = reconstruct(f);
  assert.equal(
    z(Math.abs(f.num) * rebuilt.den),
    z(f.den * rebuilt.num),
    `the printed digits of ${fracText(f)} do not add back up to ${fracText(f)}`
  );
  assert.equal(
    decimal.repeatFrom === null,
    onlyTwosAndFives(f.den),
    `${fracText(f)} terminates only when its denominator has no prime factor besides 2 and 5`
  );
  const story = decimalStory(f);
  const stops = /^its decimal stops after (\d+) (place|places)$/u.exec(story);
  const repeats = /^its decimal repeats the block (\d+) forever$/u.exec(story);
  if (stops) {
    assert.equal(Number(stops[1]), decimal.digits.length);
    assert.equal(stops[2], Number(stops[1]) === 1 ? "place" : "places");
    assert.equal(decimal.repeatFrom, null);
  } else if (repeats) {
    assert.notEqual(decimal.repeatFrom, null);
    assert.equal(repeats[1], decimal.digits.slice(decimal.repeatFrom ?? 0).join(""));
  } else {
    assert.equal(story, "it is already an integer");
    assert.equal(f.den, 1);
  }
}

function checkNumberLine(value: number, label: string) {
  const trap = trapBetween(value);
  assert.ok(trap.lo <= value && value < trap.hi, `${label}: ${value} must sit in [${trap.lo}, ${trap.hi})`);
  assert.equal(trap.hi, trap.lo + 1);
  assert.equal(trap.start, trap.lo - 1);
  assert.equal(trap.exact, Number.isInteger(value));
  const span = NL_W - 2 * NL_PAD;
  const marker = scaleLine(value, trap.start);
  assert.ok(marker >= NL_PAD + span / 3 - 1e-9, `${label}: marker ${marker} slid left of the trapping interval`);
  assert.ok(marker <= NL_PAD + (2 * span) / 3 + 1e-9, `${label}: marker ${marker} slid right of the trapping interval`);
  assert.ok(marker - 7 >= 0 && marker + 7 <= NL_W, `${label}: the marker dot leaves the viewBox`);
  for (let i = 0; i <= NL_SPAN; i += 1) {
    const tick = scaleLine(trap.start + i, trap.start);
    assert.ok(tick >= NL_PAD - 1e-9 && tick <= NL_W - NL_PAD + 1e-9);
    const half = (signedText(trap.start + i).length * GLYPH) / 2;
    assert.ok(tick - half >= 0 && tick + half <= NL_W, `${label}: tick label ${trap.start + i} leaves the viewBox`);
  }
  assert.ok(NL_Y - 20 - 14 >= 0, "the marker label must stay below the top edge");
  assert.ok(NL_Y + 26 + 4 <= NL_H, "the tick labels must stay above the bottom edge");
}

/* ---------- independent readers for the sentences the lesson renders ---------- */

/** No placeholder ever escapes into student-facing copy. */
function checkNoJunk(text: string, where: string) {
  for (const junk of ["NaN", "undefined", "null", "Infinity", "[object"]) {
    assert.ok(!text.includes(junk), `${where}: rendered copy contains "${junk}" — ${text}`);
  }
  assert.ok(text.trim().length > 0, `${where}: rendered copy is empty`);
}

/**
 * A division the copy prints must have a divisor that is not zero, whether the
 * divisor is written as a number ("÷ 3") or as a difference ("÷ (5 − 2)").
 */
function checkNoZeroDivisor(text: string, where: string) {
  for (const match of text.matchAll(/÷\s*\((−?\d+)\s*−\s*(−?\d+)\)/gu)) {
    assert.notEqual(match[1], match[2], `${where}: divides by zero in "${match[0]}" — ${text}`);
  }
  for (const match of text.matchAll(/÷\s*(−?\d+)(?![\d/])/gu)) {
    assert.ok(Number(match[1].replace("−", "-")) !== 0, `${where}: divides by the literal zero in "${match[0]}" — ${text}`);
  }
}

/**
 * Every decimal numeral in the copy must either be flagged as an approximation
 * ("about 12.67", "1.41421356...") or be the EXACT value it stands for. The
 * exact values are recomputed here from the raw control numbers, never read back
 * out of the lesson helpers.
 */
function checkDecimalHonesty(text: string, exact: { num: number; den: number }[], where: string) {
  for (const match of text.matchAll(/(−|-)?(\d+)\.(\d+)/gu)) {
    const at = match.index ?? 0;
    const before = text.slice(Math.max(0, at - 12), at);
    const after = text.slice(at + match[0].length);
    if (/about\s*$/u.test(before) || after.startsWith("...")) continue;
    const sign = match[1] ? -1 : 1;
    const num = sign * Number(match[2] + match[3]);
    const den = 10 ** match[3].length;
    const hit = exact.some((value) => z(num * value.den) === z(den * value.num));
    assert.ok(hit, `${where}: printed "${match[0]}" as an exact value it is not — ${text}`);
  }
}

/** "1 hour" but "7/3 hours"; "1 dollar" but "0 dollars"; "1 place" but "2 places". */
function checkNounAgreement(text: string, where: string) {
  for (const match of text.matchAll(/(−?\d+(?:\/\d+)?)\s(hour|hours|dollar|dollars|place|places)\b/gu)) {
    const plural = match[2].endsWith("s");
    assert.equal(plural, match[1] !== "1", `${where}: "${match[0]}" does not agree in number — ${text}`);
  }
}

/** The exact break-even time and shared total, by hand, for a state with a crossing. */
function exactValues(rateA: number, feeA: number, rateB: number, feeB: number) {
  if (rateA === rateB) return [];
  const den = rateA - rateB;
  return [
    { num: feeB - feeA, den },
    { num: rateA * feeB - feeA * rateB, den }
  ];
}

test("every reachable pair of rental plans gets the algebra and the graph the figure claims", () => {
  let states = 0;
  let oneSolution = 0;
  let noSolution = 0;
  let manySolutions = 0;

  for (let rateA: number = CONTROLS.rateA.min; rateA <= CONTROLS.rateA.max; rateA += 1) {
    for (let feeA: number = CONTROLS.feeA.min; feeA <= CONTROLS.feeA.max; feeA += 1) {
      for (let rateB: number = CONTROLS.rateB.min; rateB <= CONTROLS.rateB.max; rateB += 1) {
        for (let feeB: number = CONTROLS.feeB.min; feeB <= CONTROLS.feeB.max; feeB += 1) {
          states += 1;
          const where = `rateA=${rateA} feeA=${feeA} rateB=${rateB} feeB=${feeB}`;
          const meeting = comparePlans(rateA, feeA, rateB, feeB);

          const top = axisTop(rateA, feeA, rateB, feeB);
          assert.ok(top >= 20 && top % 20 === 0, `${where}: axis top ${top} is not a usable scale`);
          assert.ok(top >= costAt(rateA, feeA, HOURS_MAX) && top >= costAt(rateB, feeB, HOURS_MAX), `${where}: a line runs off the top`);
          for (let i = 0; i <= 4; i += 1) {
            const level = (top / 4) * i;
            assert.ok(Number.isInteger(level), `${where}: gridline label ${level} is not a whole number of dollars`);
            const y = scaleY(level, top);
            assert.ok(y >= PAD_T - 1e-9 && y <= SVG_H - PAD_B + 1e-9, `${where}: gridline at ${y} leaves the plot`);
          }
          for (const [rate, fee] of [[rateA, feeA], [rateB, feeB]]) {
            for (const hours of [0, HOURS_MAX]) {
              const x = scaleX(hours);
              const y = scaleY(costAt(rate, fee, hours), top);
              assert.ok(x >= PAD_L - 1e-9 && x <= SVG_W - PAD_R + 1e-9, `${where}: line endpoint x=${x} leaves the plot`);
              assert.ok(y >= PAD_T - 1e-9 && y <= SVG_H - PAD_B + 1e-9, `${where}: line endpoint y=${y} leaves the plot`);
            }
          }

          if (rateA === rateB && feeA === feeB) {
            manySolutions += 1;
            assert.equal(meeting.kind, "many", where);
            for (let hours = 0; hours <= HOURS_MAX; hours += 1) {
              assert.equal(costAt(rateA, feeA, hours), costAt(rateB, feeB, hours), `${where}: identical plans must tie at every hour`);
            }
            continue;
          }
          if (rateA === rateB) {
            noSolution += 1;
            assert.equal(meeting.kind, "none", where);
            for (let hours = 0; hours <= HOURS_MAX; hours += 1) {
              assert.notEqual(costAt(rateA, feeA, hours), costAt(rateB, feeB, hours), `${where}: equal rates must never tie`);
            }
            continue;
          }

          oneSolution += 1;
          assert.equal(meeting.kind, "one", where);
          if (meeting.kind !== "one") return;
          const { hours, cost } = meeting;

          assert.ok(hours.den > 0 && cost.den > 0, `${where}: denominators must be positive`);
          assert.equal(gcd(hours.num, hours.den), 1, `${where}: ${fracText(hours)} is not in lowest terms`);
          assert.equal(gcd(cost.num, cost.den), 1, `${where}: ${fracText(cost)} is not in lowest terms`);
          // h really is (feeB - feeA) / (rateA - rateB), checked without dividing.
          assert.equal(z(hours.num * (rateA - rateB)), z((feeB - feeA) * hours.den), `${where}: wrong break-even time`);
          // and it really does make the two totals equal.
          assert.equal(
            z(rateA * hours.num + feeA * hours.den),
            z(rateB * hours.num + feeB * hours.den),
            `${where}: ${fracText(hours)} does not solve ${rateA}h + ${feeA} = ${rateB}h + ${feeB}`
          );
          // the shared total is what both plans charge at that time.
          assert.equal(z(cost.num * hours.den), z(cost.den * (rateA * hours.num + feeA * hours.den)), `${where}: shared total disagrees with Shop A`);
          assert.equal(z(cost.num * hours.den), z(cost.den * (rateB * hours.num + feeB * hours.den)), `${where}: shared total disagrees with Shop B`);

          checkDecimalClaim(hours);
          checkDecimalClaim(cost);

          const hoursValue = fractionValue(hours);
          const costValue = fractionValue(cost);
          assert.ok(Math.abs(rateA * hoursValue + feeA - costValue) < 1e-9, `${where}: shared total mismatch`);

          if (hoursValue >= 0 && hoursValue <= HOURS_MAX) {
            assert.ok(costValue >= 0 && costValue <= top, `${where}: the crossing point sits outside the plot`);
            const dot = { x: scaleX(hoursValue), y: scaleY(costValue, top) };
            assert.ok(dot.x - 8 >= 0 && dot.x + 8 <= SVG_W, `${where}: the crossing dot leaves the viewBox`);
            assert.ok(dot.y - 8 >= 0 && dot.y + 8 <= SVG_H, `${where}: the crossing dot leaves the viewBox`);
            const label = crossLabel(hoursValue, costValue, top);
            const text = `(${fracText(hours)} h, $${fracText(cost)})`;
            const width = text.length * GLYPH;
            const left = label.anchor === "end" ? label.x - width : label.x;
            assert.ok(left >= 0, `${where}: the crossing label "${text}" runs off the left edge`);
            assert.ok(left + width <= SVG_W, `${where}: the crossing label "${text}" runs off the right edge`);
            assert.ok(label.y - 14 >= 0 && label.y <= SVG_H - PAD_B, `${where}: the crossing label leaves the plot vertically`);
          }

          checkNumberLine(hoursValue, `${where} break-even`);
        }
      }
    }
  }

  assert.equal(states, 8 * 11 * 8 * 11);
  assert.equal(states, oneSolution + noSolution + manySolutions);
  assert.equal(manySolutions, 8 * 11);
  assert.equal(noSolution, 8 * 11 * 10);
  assert.ok(oneSolution > 0);
});

test("every sentence the figure renders is true in all 7744 x 2 control states", () => {
  let states = 0;
  let rationalClauses = 0;
  let generalClauses = 0;
  let roundedTotals = 0;
  let exactTotals = 0;
  let visibleCrossings = 0;

  for (let rateA: number = CONTROLS.rateA.min; rateA <= CONTROLS.rateA.max; rateA += 1) {
    for (let feeA: number = CONTROLS.feeA.min; feeA <= CONTROLS.feeA.max; feeA += 1) {
      for (let rateB: number = CONTROLS.rateB.min; rateB <= CONTROLS.rateB.max; rateB += 1) {
        for (let feeB: number = CONTROLS.feeB.min; feeB <= CONTROLS.feeB.max; feeB += 1) {
          states += 1;
          const where = `rateA=${rateA} feeA=${feeA} rateB=${rateB} feeB=${feeB}`;
          const meeting: Comparison = comparePlans(rateA, feeA, rateB, feeB);
          const exact = exactValues(rateA, feeA, rateB, feeB);
          const clause = mathCheckRationalClause(rateA, feeA, rateB, feeB);
          const sentences: [string, string][] = [
            ["graph label", graphLabel(rateA, feeA, rateB, feeB)],
            ["cross story", crossStory(meeting)],
            ["solved line", solvedLine(rateA, feeA, rateB, feeB)],
            ["readout", readoutSentence(meeting)],
            ["math check clause", clause]
          ];
          for (const target of TARGETS) {
            sentences.push([`number-line note (${target})`, numberLineNote(target, meeting)]);
            const placed = placedNumber(target, meeting);
            if (placed) sentences.push([`number-line label (${target})`, lineLabel(placed)]);
          }

          for (const [what, text] of sentences) {
            const label = `${where} ${what}`;
            checkNoJunk(text, label);
            checkNoZeroDivisor(text, label);
            checkDecimalHonesty(text, exact, label);
            checkNounAgreement(text, label);
          }

          // The rational-number clause may name a quotient only when a quotient exists.
          const divides = /÷/u.test(clause);
          if (rateA === rateB) {
            generalClauses += 1;
            assert.ok(!divides, `${where}: the equal-rate clause still divides — ${clause}`);
            assert.ok(clause.startsWith("With the two hourly rates equal"), `${where}: ${clause}`);
          } else {
            rationalClauses += 1;
            assert.ok(divides, `${where}: the one-solution clause never shows the division — ${clause}`);
            // h = (feeB − feeA) ÷ (rateA − rateB) = <printed>, cross-multiplied by hand.
            // The tail carries the whole mathematical claim, so the regex must reach the
            // end of it: an earlier version stopped at "is" and accepted any words after.
            const shape = /^Now look at what kind of number the answer is: h = \((\d+) − (\d+)\) ÷ \((\d+) − (\d+)\) = (−?\d+)(?:\/(\d+))? is one integer divided by another, so it is rational$/u.exec(clause);
            assert.ok(shape, `${where}: unexpected clause shape — ${clause}`);
            if (!shape) return;
            assert.equal(Number(shape[1]) - Number(shape[2]), feeB - feeA, `${where}: clause numerator`);
            assert.equal(Number(shape[3]) - Number(shape[4]), rateA - rateB, `${where}: clause denominator`);
            const num = Number(shape[5].replace("−", "-"));
            const den = shape[6] === undefined ? 1 : Number(shape[6]);
            assert.equal(z(num * (rateA - rateB)), z(den * (feeB - feeA)), `${where}: the clause prints the wrong h — ${clause}`);
          }

          if (meeting.kind !== "one") continue;
          // The shared total is printed as its exact fraction, never as a bare rounding.
          const total = moneyText(meeting.cost);
          const printed = /\((exactly|about) (−?\d+\.\d\d)\)/u.exec(total);
          if (meeting.cost.den === 1) {
            assert.equal(printed, null, `${where}: a whole number of dollars needs no decimal — ${total}`);
          } else {
            assert.ok(printed, `${where}: ${total} hides its decimal`);
            if (!printed) return;
            const cents = Number(printed[2].replace("−", "-").replace(".", ""));
            const isExact = z(cents * meeting.cost.den) === z(100 * meeting.cost.num);
            assert.equal(printed[1] === "exactly", isExact, `${where}: ${total} mislabels its decimal`);
            if (isExact) exactTotals += 1; else roundedTotals += 1;
            // A rounded decimal must never be within the figure's exact claims.
            if (!isExact) assert.notEqual(cents / 100, fractionValue(meeting.cost), `${where}: ${total}`);
          }
          if (crossesInWindow(meeting)) {
            visibleCrossings += 1;
            const story = crossStory(meeting);
            assert.ok(story.includes(`both totals are ${total}`), `${where}: ${story}`);
            assert.ok(readoutSentence(meeting).includes(`Both shops take ${total} at that moment`), `${where}: ${readoutSentence(meeting)}`);
          }
        }
      }
    }
  }

  assert.equal(states, 8 * 11 * 8 * 11);
  assert.equal(generalClauses, 8 * 11 * 11); // every state whose two rates are equal
  assert.equal(rationalClauses, states - generalClauses);
  assert.ok(roundedTotals > 0, "some shared totals really do need rounding, so the marker must be exercised");
  assert.ok(exactTotals > 0, "some shared totals are exact two-place decimals");
  assert.ok(visibleCrossings > 0);
});

test("the default state on load prints the shared total exactly, not rounded to 12.67", () => {
  const meeting = comparePlans(5, 1, 2, 8);
  assert.equal(meeting.kind, "one");
  if (meeting.kind !== "one") return;
  // 5h + 1 = 2h + 8 gives 3h = 7, so h = 7/3 and the total is 5(7/3) + 1 = 38/3.
  assert.deepEqual(meeting.hours, { num: 7, den: 3 });
  assert.deepEqual(meeting.cost, { num: 38, den: 3 });
  assert.equal(moneyText(meeting.cost), "38/3 dollars (about 12.67)");
  assert.ok(crossStory(meeting).includes("38/3 dollars (about 12.67)"));
  assert.ok(graphLabel(5, 1, 2, 8).includes("38/3 dollars (about 12.67)"));
  // 12.67 is not 38/3: 1267 * 3 = 3801 while 38 * 100 = 3800.
  assert.notEqual(1267 * 3, 38 * 100);
  assert.equal(moneyText({ num: 3, den: 2 }), "3/2 dollars (exactly 1.50)");
  assert.equal(moneyText({ num: 1, den: 1 }), "1 dollar");
  assert.equal(moneyText({ num: 12, den: 1 }), "12 dollars");
  assert.equal(hourNoun({ num: 1, den: 1 }), "hour");
  assert.equal(hourNoun({ num: 7, den: 3 }), "hours");
  assert.equal(hourNoun({ num: 0, den: 1 }), "hours");
});

test("money readouts stay grammatical at every value a control can take", () => {
  assert.equal(signedText(-4), "−4");
  assert.equal(signedText(0), "0");
  assert.equal(dollars(0), "0 dollars");
  assert.equal(dollars(1), "1 dollar");
  assert.equal(dollars(2), "2 dollars");
  for (let n: number = CONTROLS.feeA.min; n <= CONTROLS.feeA.max; n += 1) {
    assert.match(dollars(n), n === 1 ? /^1 dollar$/u : /^\d+ dollars$/u);
  }
});

test("the number line also traps the square root of 2 between consecutive whole numbers", () => {
  checkNumberLine(Math.SQRT2, "root 2");
  const trap = trapBetween(Math.SQRT2);
  assert.equal(trap.lo, 1);
  assert.equal(trap.hi, 2);
  assert.equal(trap.exact, false);
  // The lesson justifies the trap with squares: 1*1 = 1 < 2 < 4 = 2*2.
  assert.ok(trap.lo * trap.lo < 2);
  assert.ok(trap.hi * trap.hi > 2);
  assert.equal(Math.SQRT2.toFixed(8), "1.41421356");
  const note = numberLineNote("root2", comparePlans(5, 1, 2, 8));
  assert.ok(note.includes("1 × 1 = 1 sits below 2 and 2 × 2 = 4 sits above it"), note);
  assert.ok(note.includes("1.41421356..."), note);
  assert.equal(lineLabel({ text: "√2", srText: "The square root of 2", value: Math.SQRT2 }), "Number line from 0 to 3. The square root of 2 is marked between 1 and 2.");
});

test("reduce and the decimal expansion agree with hand arithmetic on known fractions", () => {
  assert.deepEqual(reduce(38, 3), { num: 38, den: 3 });
  assert.deepEqual(reduce(-45, -5), { num: 9, den: 1 });
  assert.deepEqual(reduce(4, -6), { num: -2, den: 3 });
  assert.deepEqual(reduce(0, 7), { num: 0, den: 1 });
  assert.equal(fracText({ num: -7, den: 3 }), "−7/3");
  assert.equal(fracText({ num: 9, den: 1 }), "9");

  // 7/3 = 2.333..., a repeating block of one digit.
  const third = expandDecimal({ num: 7, den: 3 });
  assert.equal(third.whole, 2);
  assert.deepEqual(third.digits, [3]);
  assert.equal(third.repeatFrom, 0);
  assert.equal(decimalStory({ num: 7, den: 3 }), "its decimal repeats the block 3 forever");
  // 3/4 = 0.75, terminating after two places.
  assert.deepEqual(expandDecimal({ num: 3, den: 4 }).digits, [7, 5]);
  assert.equal(expandDecimal({ num: 3, den: 4 }).repeatFrom, null);
  assert.equal(decimalStory({ num: 3, den: 4 }), "its decimal stops after 2 places");
  // 1/6 = 0.1666..., one digit before the repeating block.
  assert.deepEqual(expandDecimal({ num: 1, den: 6 }).digits, [1, 6]);
  assert.equal(expandDecimal({ num: 1, den: 6 }).repeatFrom, 1);
  // 1/2 = 0.5, a single place, so the readout must say "place" not "places".
  assert.equal(decimalStory({ num: 1, den: 2 }), "its decimal stops after 1 place");
  assert.equal(decimalStory({ num: 4, den: 1 }), "it is already an integer");
  assert.equal(decimalStory({ num: -3, den: 1 }), "it is already an integer");
});

test("the worked example really does solve 45 + 2v = 7v at v = 9, in every reveal state", () => {
  assert.equal(EXAMPLE.pass, 45);
  assert.equal(EXAMPLE.perVisit, 2);
  assert.equal(EXAMPLE.dayRate, 7);
  const worked = workedExample();
  assert.equal(worked.gap, 5); // 7 - 2 = 5
  assert.equal(worked.visits, 9); // 45 / 5 = 9
  assert.equal(worked.passTotal, 63); // 45 + 2 * 9 = 45 + 18 = 63
  assert.equal(worked.dayTotal, 63); // 7 * 9 = 63
  assert.equal(worked.passTotal, worked.dayTotal);
  // 9 is the only whole number of visits that ties.
  for (let visits = 0; visits <= 30; visits += 1) {
    assert.equal(45 + 2 * visits === 7 * visits, visits === 9, `visits=${visits}`);
  }
  // The same numbers are the crossing point of the system y = 45 + 2v, y = 7v.
  const system = comparePlans(EXAMPLE.perVisit, EXAMPLE.pass, EXAMPLE.dayRate, 0);
  assert.equal(system.kind, "one");
  if (system.kind !== "one") return;
  assert.deepEqual(system.hours, { num: 9, den: 1 });
  assert.deepEqual(system.cost, { num: 63, den: 1 });

  // Every reveal state of the "Next step" control, from nothing shown to all shown.
  const steps = exampleSteps();
  assert.equal(steps.length, 6);
  assert.equal(new Set(steps.map((step) => step.title)).size, steps.length);
  for (const step of steps) {
    checkNoJunk(`${step.title} ${step.math} ${step.note}`, "worked example");
    checkNoZeroDivisor(`${step.math} ${step.note}`, "worked example");
    checkNounAgreement(`${step.math} ${step.note}`, "worked example");
  }
  assert.ok(steps[3].math.endsWith("= 9"), steps[3].math);
  assert.equal(steps[2].math, "45 = 5v");
  assert.equal(steps[4].math, "45 + 2(9) = 63   and   7(9) = 63");
  assert.equal(steps[5].math, "(9, 63)");
  for (let shown = 0; shown <= steps.length; shown += 1) {
    assert.equal(steps.slice(0, shown).length, shown, `shown=${shown}`);
    const label = revealLabel(shown, steps.length);
    assert.equal(label, shown === 0 ? "Show the first step" : shown === steps.length ? "All steps shown" : "Next step", `shown=${shown}`);
    checkNoJunk(label, `reveal label shown=${shown}`);
  }
});

test("the Try it answer is the only listed number that is not a ratio of whole numbers", () => {
  const answer = tryAnswerIndex();
  assert.equal(TRY_OPTIONS.length, 4);
  assert.equal(TRY_OPTIONS[answer].label, "√2");
  assert.equal(TRY_OPTIONS.filter((option) => option.fraction === null).length, 1);
  assert.equal(TRY_OPTIONS[0].value, 7 / 3);
  assert.equal(TRY_OPTIONS[1].value, 0.75);
  assert.equal(TRY_OPTIONS[2].value, Math.sqrt(9));
  assert.equal(TRY_OPTIONS[3].value, Math.sqrt(2));
  for (const option of TRY_OPTIONS) {
    if (option.fraction === null) continue;
    assert.ok(Number.isInteger(option.fraction.num) && Number.isInteger(option.fraction.den));
    assert.equal(option.fraction.num / option.fraction.den, option.value, `${option.label} is not the fraction it claims`);
    checkDecimalClaim(reduce(option.fraction.num, option.fraction.den));
  }
  // 2 is not a perfect square, so its square root is not a whole number; by the
  // rational root theorem the square root of a non-square whole number cannot be
  // a fraction of whole numbers either.
  for (let n = 0; n <= 2; n += 1) assert.notEqual(n * n, 2);
  assert.ok(!Number.isInteger(Math.sqrt(2)));

  // Every pick state of the four choice buttons, plus the untouched state.
  assert.equal(tryFeedback(null), "Pick the number you think is irrational.");
  for (let pick = 0; pick < TRY_OPTIONS.length; pick += 1) {
    const feedback = tryFeedback(pick);
    checkNoJunk(feedback, `try feedback pick=${pick}`);
    checkNounAgreement(feedback, `try feedback pick=${pick}`);
    assert.equal(feedback.startsWith("Correct."), pick === answer, `pick=${pick}: ${feedback}`);
    assert.ok(feedback.endsWith(TRY_OPTIONS[pick].why), `pick=${pick}: ${feedback}`);
  }
});

test("the lesson source keeps the accessibility and citation contract", () => {
  const openingTags = (tag: string) => {
    const tags: string[] = [];
    let from = source.indexOf(`<${tag}`);
    while (from >= 0) {
      let depth = 0;
      let end = source.length;
      for (let i = from; i < source.length; i += 1) {
        const ch = source[i];
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
        else if (ch === ">" && depth === 0 && source[i - 1] !== "=") { end = i + 1; break; }
      }
      tags.push(source.slice(from, end));
      from = source.indexOf(`<${tag}`, end);
    }
    return tags;
  };

  const svgs = openingTags("svg");
  assert.equal(svgs.length, 2);
  for (const tag of svgs) {
    assert.match(tag, /viewBox=/u);
    assert.match(tag, /role="img"/u);
    // the accessible name is computed from state, never a fixed string
    assert.match(tag, /aria-label=\{\w+\(/u);
  }

  const buttons = openingTags("button");
  assert.equal(buttons.length, 6);
  for (const tag of buttons) assert.match(tag, /type="button"/u);
  assert.equal(buttons.filter((tag) => /aria-pressed=/u.test(tag)).length, 2);
  assert.equal(buttons.filter((tag) => /aria-expanded=/u.test(tag) && /aria-controls=\{stepsId\}/u.test(tag)).length, 1);
  assert.match(source, /id=\{stepsId\}/u);
  assert.equal(buttons.filter((tag) => /aria-label=\{`(Increase|Decrease) /u.test(tag) && /disabled=/u.test(tag)).length, 2);

  const cited = new Set([...source.matchAll(/\b\d\.[A-Z]{2}\.[A-D]\.\d\b/gu)].map((match) => match[0]));
  assert.ok(cited.size > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.has(id), `${id} is not one of the chapter brief standards`);
  for (const id of BRIEF_STANDARDS) assert.ok(cited.has(id), `${id} from the brief is never cited`);
  // the citations must live inside the Math check the interaction gate reads
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of BRIEF_STANDARDS) assert.ok(mathCheck.includes(`(${id})`), `${id} is cited outside the Math check`);

  // the prose may not promise a crossing point the parallel and coincident states do not have
  assert.match(source, /when they cross at all, because two lines can also run parallel or lie right on top of each other/u);
  assert.match(source, /one solution when the lines cross, none when they are parallel, and infinitely many when they coincide \(8\.EE\.C\.8\)/u);
  assert.doesNotMatch(source, /the answer is the point where they cross\./u);
  assert.doesNotMatch(source, /its solution is the point where the graphs meet/u);

  // rounding may only happen inside moneyText, which labels what it prints
  const rounding = [...source.matchAll(/toFixed\(/gu)];
  assert.equal(rounding.length, 1, "toFixed may appear only in moneyText");
  assert.match(source, /export function moneyText[\s\S]*?toFixed\(2\)[\s\S]*?exactly[\s\S]*?about/u);

  assert.match(source, /min=\{1\} max=\{8\}/u);
  assert.match(source, /min=\{0\} max=\{10\}/u);
  assert.doesNotMatch(source, /[\u3000-\u303f\u3040-\u30ff\u4e00-\u9fff\uff00-\uffef]/u);
  assert.doesNotMatch(source, /Math\.random|dangerouslySetInnerHTML|next\/image|<form\b/u);
  assert.match(source, /^"use client";/u);
  assert.match(source, /export default function Lesson\(\)/u);
});

test("no rendered sentence ever calls a negative value a whole number", () => {
  // A quotient of two whole numbers is never negative, so the number-kind claims have
  // to say "integer". h < 0 in 3,080 of the 7,744 states, 1,370 of them negative integers.
  let states = 0, negatives = 0;
  for (let rateA = CONTROLS.rateA.min; rateA <= CONTROLS.rateA.max; rateA += 1) {
    for (let feeA = CONTROLS.feeA.min; feeA <= CONTROLS.feeA.max; feeA += 1) {
      for (let rateB = CONTROLS.rateB.min; rateB <= CONTROLS.rateB.max; rateB += 1) {
        for (let feeB = CONTROLS.feeB.min; feeB <= CONTROLS.feeB.max; feeB += 1) {
          states += 1;
          const clause = mathCheckRationalClause(rateA, feeA, rateB, feeB);
          const meeting = comparePlans(rateA, feeA, rateB, feeB);
          const sentences = [clause];
          if (meeting.kind === "one") {
            sentences.push(decimalStory(meeting.hours));
            if (meeting.hours.num * meeting.hours.den < 0) negatives += 1;
          }
          for (const text of sentences) {
            assert.ok(
              !/(−|-)\d[\d/.]*[^.]{0,90}whole number/u.test(text),
              `rateA=${rateA} feeA=${feeA} rateB=${rateB} feeB=${feeB}: a negative value is called a whole number — "${text}"`
            );
          }
        }
      }
    }
  }
  assert.equal(states, (CONTROLS.rateA.max - CONTROLS.rateA.min + 1) * (CONTROLS.feeA.max - CONTROLS.feeA.min + 1) * (CONTROLS.rateB.max - CONTROLS.rateB.min + 1) * (CONTROLS.feeB.max - CONTROLS.feeB.min + 1));
  assert.equal(states, 7744);
  assert.ok(negatives > 1000, `the negative branch must actually be exercised — saw ${negatives}`);
});
