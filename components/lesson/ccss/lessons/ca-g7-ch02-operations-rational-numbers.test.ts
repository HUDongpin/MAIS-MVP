import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  absF,
  addF,
  applyOp,
  arrowPlan,
  arrowPoints,
  decimalLabel,
  decimalLine,
  divExact,
  divisorLabel,
  equationText,
  explain,
  figureLabel,
  frac,
  fracLabel,
  gcd,
  halves,
  inverseCheck,
  moneyLabel,
  mulF,
  nameFor,
  negF,
  parenDecimal,
  parenLabel,
  reciprocal,
  sameF,
  signRule,
  signedLabel,
  subF,
  symbolFor,
  terminates,
  toNum,
  tryFeedback,
  tryIt,
  unitWord,
  workedExample,
  workedSteps,
  AXIS_Y,
  H,
  HALF_MAX,
  HALF_MIN,
  LANE_1,
  LANE_2,
  LINE_MAX,
  LINE_MIN,
  MINUS,
  OPS,
  PAD,
  TICKS,
  TRY,
  W,
  WE,
  xScale,
  type Frac,
  type OpId
} from "./ca-g7-ch02-operations-rational-numbers";

const SLUG = "ca-g7-ch02-operations-rational-numbers";
const BRIEF_STANDARDS = ["7.NS.A.1", "7.NS.A.2", "7.NS.A.3"];
const source = readFileSync(path.join(process.cwd(), `components/lesson/ccss/lessons/${SLUG}.tsx`), "utf8");
const OP_IDS = OPS.map((o) => o.id);
const EPS = 1e-12;

/* ------------------------------------------------------------------ *
 * Independent arithmetic. Nothing below calls the lesson's own helpers
 * to build an expected value: every expectation is rebuilt from the raw
 * control integers with the test's own reduce and its own formatter.
 * ------------------------------------------------------------------ */
type R = { n: number; d: number };

function reduceR(n: number, d: number): R {
  assert.notEqual(d, 0, "the test never builds a fraction over zero");
  const s = d < 0 ? -1 : 1;
  let x = Math.abs(n);
  let y = Math.abs(d);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  const g = x || 1;
  const num = (s * n) / g;
  return { n: num === 0 ? 0 : num, d: (s * d) / g };
}

/** The four label shapes the lesson prints, written out again here. */
function lab(f: R): string { return `${f.n < 0 ? MINUS : ""}${Math.abs(f.n)}${f.d === 1 ? "" : `/${f.d}`}`; }
function paren(f: R): string { return f.n < 0 ? `(${lab(f)})` : lab(f); }
function divisor(f: R): string { return f.d === 1 && f.n >= 0 ? lab(f) : `(${lab(f)})`; }
/** k halves as a decimal: k = 3 is 1.5, k = 4 is 2, k = 0 is 0. */
function halfDecimal(k: number): string { return `${k < 0 ? MINUS : ""}${Math.abs(k) / 2}`; }
function repeats(f: R): boolean {
  let d = f.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d !== 1;
}

/* ------------------------------------------------------------------ *
 * A standard-precedence evaluator, so that every equality the lesson
 * PRINTS is re-read the way a grade-7 student is taught to read it:
 * unary minus, then x / ÷ left to right, then + and - left to right.
 * A displayed "a ÷ c/d" is therefore (a ÷ c) / d here, exactly as it is
 * on paper — which is what makes an unparenthesised divisor a failure.
 * ------------------------------------------------------------------ */
function evaluate(expression: string): number {
  const s = expression.replace(/−/gu, "-").replace(/×/gu, "*").replace(/÷/gu, "/").replace(/\s+/gu, "");
  let i = 0;
  function primary(): number {
    if (s[i] === "(") {
      i += 1;
      const v = sum();
      assert.equal(s[i], ")", `unbalanced parentheses in "${expression}"`);
      i += 1;
      return v;
    }
    if (s[i] === "-") { i += 1; return -primary(); }
    let j = i;
    while (j < s.length && /[0-9.]/u.test(s[j])) j += 1;
    assert.notEqual(j, i, `expected a number at index ${i} of "${expression}"`);
    const v = Number(s.slice(i, j));
    i = j;
    return v;
  }
  function product(): number {
    let v = primary();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i];
      i += 1;
      const r = primary();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function sum(): number {
    let v = product();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i];
      i += 1;
      const r = product();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const value = sum();
  assert.equal(i, s.length, `unconsumed "${s.slice(i)}" in "${expression}"`);
  return value;
}

/** Pull every "A = B [= C]" chain out of a sentence the student can read. */
function displayedEqualities(text: string): string[][] {
  const chains: string[][] = [];
  for (const m of text.matchAll(/[0-9.\s()+/=×÷−]+/gu)) {
    const run = m[0].trim().replace(/\.$/u, "").trim();
    if (!run.includes("=")) continue;
    const parts = run.split("=").map((p) => p.trim()).filter((p) => p.length > 0);
    if (parts.length >= 2) chains.push(parts);
  }
  return chains;
}

/** Every equality printed in `text` must be true under standard order of operations. */
function assertDisplayedEqualitiesHold(text: string, where: string): number {
  // A truncated repeating decimal ("0.333…") is deliberately not the exact value.
  const tolerance = text.includes("…") ? 1e-3 : 1e-9;
  let checked = 0;
  for (const parts of displayedEqualities(text)) {
    const values = parts.map(evaluate);
    for (let k = 1; k < values.length; k += 1) {
      assert.ok(
        Math.abs(values[k] - values[0]) <= tolerance,
        `${where}: "${text}" is false read left to right — ${parts[0]} = ${values[0]} but ${parts[k]} = ${values[k]}`
      );
    }
    checked += 1;
  }
  return checked;
}

function parseDecimal(text: string): number {
  return Number(text.replace(MINUS, "-").replace("…", ""));
}

/** JavaScript has a negative zero; the mathematics does not. */
function z(v: number): number {
  return v === 0 ? 0 : v;
}

test("the evaluator the rest of this file leans on really does use standard precedence", () => {
  assert.equal(evaluate("1+2*3"), 7);
  assert.equal(evaluate("(1+2)*3"), 9);
  assert.equal(evaluate(`${MINUS}3/2`), -1.5);
  assert.equal(evaluate(`${MINUS}3/2 ÷ 1/2`), -0.75, "an unparenthesised divisor really does change the value");
  assert.equal(evaluate(`${MINUS}3/2 ÷ (1/2)`), -3);
  assert.equal(evaluate("7.5 ÷ (3/4)"), 10);
  assert.equal(evaluate("7.5 × 4/3"), 10);
  assert.deepEqual(displayedEqualities("Check: 1/2 + 1/2 = 1, so it works."), [["1/2 + 1/2", "1"]]);
  assert.deepEqual(displayedEqualities("no equality here"), []);
  assert.throws(() => assertDisplayedEqualitiesHold("2 + 2 = 5", "self test"), /is false read left to right/u);
});

test("the declared control bounds are the ones the JSX actually wires up", () => {
  assert.equal(HALF_MIN, -4);
  assert.equal(HALF_MAX, 4);
  assert.match(source, /value=\{aHalves\} min=\{HALF_MIN\} max=\{HALF_MAX\}/u);
  assert.match(source, /value=\{bHalves\} min=\{HALF_MIN\} max=\{HALF_MAX\}/u);
  assert.deepEqual(OP_IDS, ["add", "sub", "mul", "div"]);
  // halves(k) = k/2, so the reachable numbers run -2, -1.5, ... 2
  for (let k = HALF_MIN; k <= HALF_MAX; k += 1) {
    const v = halves(k);
    assert.equal(z(v.n * 2), z(k * v.d), `halves(${k}) must equal ${k}/2`);
    assert.ok(Math.abs(toNum(v)) <= 2 + EPS);
  }
});

test("the exact fraction helpers reduce, sign and format correctly", () => {
  assert.equal(gcd(18, 12), 6);
  assert.equal(gcd(0, 7), 7);
  assert.deepEqual(frac(6, 4), { n: 3, d: 2 });
  assert.deepEqual(frac(0, 5), { n: 0, d: 1 });
  assert.deepEqual(frac(3, -6), { n: -1, d: 2 });
  assert.deepEqual(frac(-4, -2), { n: 2, d: 1 });
  assert.deepEqual(addF(frac(-3, 2), frac(1, 2)), { n: -1, d: 1 }); // -1.5 + 0.5 = -1
  assert.deepEqual(subF(frac(-3, 2), frac(-1, 2)), { n: -1, d: 1 }); // -1.5 + 0.5 = -1
  assert.deepEqual(mulF(frac(-3, 2), frac(1, 2)), { n: -3, d: 4 }); // -0.75
  assert.deepEqual(divExact(frac(1, 2), frac(3, 2)), { n: 1, d: 3 });
  assert.deepEqual(reciprocal(frac(3, 4)), { n: 4, d: 3 });
  assert.throws(() => divExact(frac(1, 2), frac(0, 1)), /divide by zero/u);
  assert.equal(fracLabel(frac(-3, 2)), `${MINUS}3/2`);
  assert.equal(fracLabel(frac(4, 2)), "2");
  assert.equal(parenLabel(frac(-1, 2)), `(${MINUS}1/2)`);
  assert.equal(parenLabel(frac(1, 2)), "1/2");
  // a divisor is bare only when it is a whole number, so "a ÷ b" can never be misread
  assert.equal(divisorLabel(frac(1, 2)), "(1/2)");
  assert.equal(divisorLabel(frac(-1, 2)), `(${MINUS}1/2)`);
  assert.equal(divisorLabel(frac(3, 1)), "3");
  assert.equal(divisorLabel(frac(-3, 1)), `(${MINUS}3)`);
  assert.equal(divisorLabel(frac(0, 5)), "0");
  assert.equal(signedLabel(frac(1, 2)), "+1/2");
  assert.equal(signedLabel(frac(-1, 2)), `${MINUS}1/2`);
  assert.equal(signedLabel(frac(0, 1)), "0");
  assert.equal(terminates(frac(3, 4)), true);
  assert.equal(terminates(frac(1, 3)), false);
  assert.equal(decimalLabel(frac(-3, 2)), `${MINUS}1.5`);
  assert.equal(decimalLabel(frac(3, 4)), "0.75");
  assert.equal(decimalLabel(frac(1, 3)), "0.333…"); // truncated, never rounded up
  assert.equal(decimalLabel(frac(2, 3)), "0.666…");
  assert.equal(decimalLabel(frac(-4, 3)), `${MINUS}1.333…`);
  assert.equal(parenDecimal(frac(-3, 2)), `(${MINUS}1.5)`);
  assert.equal(unitWord(frac(2, 2)), "unit");
  assert.equal(unitWord(frac(3, 2)), "units");
  assert.equal(moneyLabel(frac(-9, 2)), `${MINUS}$4.50`);
  assert.equal(sameF(frac(2, 4), frac(1, 2)), true);
  assert.equal(sameF(frac(1, 2), frac(-1, 2)), false);
  assert.equal(nameFor("div"), "Division");
  assert.equal(toNum(absF(frac(-3, 2))), 1.5);
  assert.equal(toNum(negF(frac(-3, 2))), 1.5);
});

test("the number line geometry is a faithful, in-bounds scale", () => {
  assert.equal(TICKS.length, 19);
  assert.equal(TICKS[0], LINE_MIN);
  assert.equal(TICKS[TICKS.length - 1], LINE_MAX);
  assert.equal(xScale(LINE_MIN), PAD);
  assert.equal(xScale(LINE_MAX), W - PAD);
  assert.equal(xScale(0), W / 2);
  for (let i = 1; i < TICKS.length; i += 1) {
    assert.ok(TICKS[i] > TICKS[i - 1], "ticks increase");
    assert.ok(Math.abs(TICKS[i] - TICKS[i - 1] - 0.5) < EPS, "ticks are half a unit apart");
    assert.ok(xScale(TICKS[i]) > xScale(TICKS[i - 1]), "the scale is increasing");
  }
  assert.ok(LANE_2 < LANE_1 && LANE_1 < AXIS_Y, "the operation arrow sits above the starting arrow");
  assert.ok(LANE_2 - 9 - 13 > 0, "the upper arrow label stays inside the viewBox");
  assert.ok(AXIS_Y + 46 < H, "the answer label stays inside the viewBox");
  assert.equal(arrowPoints(100, 200, 50), "200,50 191,44 191,56");
  assert.equal(arrowPoints(200, 100, 50), "100,50 109,44 109,56");
});

test("every reachable state of the figure is mathematically true and stays in the viewBox", () => {
  const SYMBOL: Record<OpId, string> = { add: "+", sub: MINUS, mul: "×", div: "÷" };
  let states = 0;
  let equalitiesChecked = 0;

  for (const id of OP_IDS) {
    for (let ak = HALF_MIN; ak <= HALF_MAX; ak += 1) {
      for (let bk = HALF_MIN; bk <= HALF_MAX; bk += 1) {
        states += 1;
        const a = halves(ak);
        const b = halves(bk);
        const result = applyOp(id, a, b);
        const label = figureLabel(id, a, b, result);
        const plan = arrowPlan(id, a, b, result);
        const equation = equationText(id, a, b, result);
        const sentence = explain(id, a, b);
        const check = inverseCheck(id, a, b);
        const dec = decimalLine(id, a, b);

        // --- expectations rebuilt from the raw integers, never from the lesson ---
        const A = reduceR(ak, 2);
        const B = reduceR(bk, 2);
        const absB = reduceR(Math.abs(bk), 2);
        const negB = reduceR(-bk, 2);
        const operand = id === "div" ? divisor(B) : paren(B);
        const unit = Math.abs(bk) === 2 ? "unit" : "units";
        const signSentence = (ak > 0) === (bk > 0)
          ? "The two signs match, so the answer is positive."
          : "The two signs are different, so the answer is negative.";

        for (const text of [equation, sentence, check, dec, label]) {
          assert.ok(!text.includes("-"), `an ASCII hyphen leaked into "${text}"`);
          equalitiesChecked += assertDisplayedEqualitiesHold(text, `${id} a=${ak}/2 b=${bk}/2`);
        }

        // --- division by zero is the only undefined state, and every readout says so ---
        if (id === "div" && bk === 0) {
          assert.equal(result, null);
          assert.equal(equation, `${lab(A)} ÷ 0 is undefined`);
          assert.equal(sentence, ak === 0
            ? "Every number times 0 gives 0, so 0 divided by 0 has no single answer. Dividing by 0 is undefined."
            : `No number times 0 gives ${lab(A)}, so ${lab(A)} divided by 0 is undefined.`);
          assert.equal(check, "There is nothing to check: dividing by 0 has no answer.");
          assert.equal(dec, `As decimals: ${halfDecimal(ak)} ÷ 0 is undefined too.`);
          assert.equal(label, [
            `Number line from ${MINUS}4.5 to 4.5 showing division: ${equation}.`,
            ...(ak === 0 ? [] : [`The starting arrow runs from 0 to ${lab(A)}.`]),
            "Nothing is marked as the answer."
          ].join(" "));
          assert.equal(plan.length, ak === 0 ? 0 : 1);
          continue;
        }
        assert.ok(result !== null);
        const r: Frac = result;

        // --- the value is exactly the arithmetic, computed here on integers only ---
        const E = id === "add" ? reduceR(ak + bk, 2)
          : id === "sub" ? reduceR(ak - bk, 2)
            : id === "mul" ? reduceR(ak * bk, 4)
              : reduceR(ak, bk);
        assert.deepEqual({ n: r.n, d: r.d }, E, `${ak}/2 ${SYMBOL[id]} ${bk}/2`);

        // --- always a reduced fraction with a positive denominator ---
        assert.ok(r.d > 0);
        assert.equal(gcd(Math.abs(r.n), r.d), 1);
        if (r.n === 0) assert.equal(r.d, 1);
        assert.ok(r.d <= 4, "halves only ever produce denominators up to 4");

        // --- every answer fits the fixed -4.5 .. 4.5 line ---
        const rv = E.n / E.d;
        assert.equal(toNum(r), rv);
        assert.ok(Math.abs(rv) <= 4 + EPS, `${equation} must stay on the line`);
        assert.ok(xScale(rv) - 8 >= 0 && xScale(rv) + 8 <= W, "the 8px answer dot stays inside the viewBox");
        assert.ok(xScale(rv) - 24 >= 0 && xScale(rv) + 24 <= W, "the answer label stays inside the viewBox");

        // --- the printed equation is exactly the true one, divisor parenthesised ---
        assert.equal(equation, `${lab(A)} ${SYMBOL[id]} ${operand} = ${lab(E)}`);

        // --- each operation is undone by its inverse, and the check sentence says so truly ---
        if (id === "add") assert.ok(sameF(subF(r, b), a));
        if (id === "sub") assert.ok(sameF(addF(r, b), a));
        if (id === "mul" && bk !== 0) assert.ok(sameF(divExact(r, b), a));
        if (id === "div") assert.ok(sameF(mulF(r, b), a));
        const expectedCheck = id === "add"
          ? `Check: ${lab(E)} ${MINUS} ${paren(B)} = ${lab(A)}, so subtracting undoes adding.`
          : id === "sub"
            ? `Check: ${lab(E)} + ${paren(B)} = ${lab(A)}, so adding undoes subtracting.`
            : id === "mul"
              ? (bk === 0
                ? "A product with 0 cannot be undone by dividing, because dividing by 0 is undefined."
                : `Check: ${lab(E)} ÷ ${divisor(B)} = ${lab(A)}, so dividing undoes multiplying.`)
              : `Check: ${lab(E)} × ${paren(B)} = ${lab(A)}, so multiplying undoes dividing.`;
        assert.equal(check, expectedCheck);

        // --- the explanation names the right move, the right direction and the right answer ---
        let expectedSentence: string;
        if (id === "add" || id === "sub") {
          if (bk === 0) {
            expectedSentence = `${id === "add" ? "Adding" : "Subtracting"} 0 moves nothing, so the answer is still ${lab(A)}.`;
          } else {
            const toward = (id === "add" ? bk > 0 : bk < 0) ? "right" : "left";
            const slide = `slides you ${lab(absB)} ${unit} to the ${toward}`;
            expectedSentence = id === "add"
              ? `Adding ${paren(B)} ${slide}, from ${lab(A)} to ${lab(E)}.`
              : `Subtracting ${paren(B)} is the same as adding its opposite ${paren(negB)}, which ${slide}: `
                + `${lab(A)} ${MINUS} ${paren(B)} = ${lab(A)} + ${paren(negB)} = ${lab(E)}.`;
          }
        } else if (id === "mul") {
          expectedSentence = ak === 0 || bk === 0
            ? "A product with a factor of 0 is 0, so the answer arrow has no length at all."
            : `Multiplying by ${paren(B)} makes the ${lab(A)} arrow ${lab(absB)} times as long`
              + `${bk < 0 ? " and flips it to the other side of 0" : ""}, landing on ${lab(E)}. ${signSentence}`;
        } else if (ak === 0) {
          expectedSentence = `Starting from 0 you never leave 0, so 0 ÷ ${divisor(B)} = 0.`;
        } else {
          expectedSentence = `Dividing by ${paren(B)} undoes multiplying by ${paren(B)}: the answer ${lab(E)} is the number `
            + `whose arrow becomes the ${lab(A)} arrow once it is made ${lab(absB)} times as long`
            + `${bk < 0 ? " and flipped" : ""}. ${signSentence}`;
        }
        assert.equal(sentence, expectedSentence);

        // --- the sign story matches the sign of the answer ---
        if ((id === "mul" || id === "div") && ak !== 0 && bk !== 0) {
          const positive = signRule(a, b).includes("positive");
          assert.equal(positive, (ak > 0) === (bk > 0));
          assert.equal(positive, rv > 0);
          assert.equal(sentence.includes("the answer is positive"), rv > 0);
          assert.equal(sentence.includes("the answer is negative"), rv < 0);
        }

        // --- arrows: real moves only, inside the viewBox, and matching the operation ---
        assert.ok(plan.length <= 2);
        assert.equal(plan.some((p) => p.role === "start"), ak !== 0);
        for (const p of plan) {
          assert.ok(!sameF(p.from, p.to), "a drawn arrow always has length");
          const x1 = xScale(toNum(p.from));
          const x2 = xScale(toNum(p.to));
          for (const x of [x1, x2]) assert.ok(x >= PAD - EPS && x <= W - PAD + EPS);
          assert.ok((x1 + x2) / 2 - 24 >= 0 && (x1 + x2) / 2 + 24 <= W, "the arrow label stays inside the viewBox");
          assert.ok(p.y > 0 && p.y < AXIS_Y);
          if (p.role === "start") {
            assert.equal(p.from.n, 0);
            assert.deepEqual({ n: p.to.n, d: p.to.d }, A);
          } else if (id === "add" || id === "sub") {
            assert.deepEqual({ n: p.from.n, d: p.from.d }, A, "add and subtract chain from the first number");
            // the chained arrow's displacement is exactly +b (add) or -b (subtract)
            assert.deepEqual({ n: subF(p.to, p.from).n, d: subF(p.to, p.from).d }, id === "add" ? B : negB);
          } else {
            assert.equal(p.from.n, 0, "multiply and divide are drawn as arrows from 0");
            assert.deepEqual({ n: p.to.n, d: p.to.d }, E);
          }
        }

        // --- the accessible description is the true sentence for this exact state ---
        const moveArrow = id === "add" || id === "sub"
          ? (lab(A) === lab(E) ? [] : [`The operation arrow runs from ${lab(A)} to ${lab(E)}.`])
          : (E.n === 0 ? [] : [`The operation arrow runs from 0 to ${lab(E)}.`]);
        assert.equal(label, [
          `Number line from ${MINUS}4.5 to 4.5 showing ${nameFor(id).toLowerCase()}: ${equation}.`,
          ...(ak === 0 ? [] : [`The starting arrow runs from 0 to ${lab(A)}.`]),
          ...moveArrow,
          `The answer ${lab(E)} is marked on the line.`
        ].join(" "));

        // --- the decimal echo agrees with the fraction, and only claims "repeating" when it repeats ---
        const decHead = `As decimals: ${halfDecimal(ak)} ${SYMBOL[id]} ${bk < 0 ? `(${halfDecimal(bk)})` : halfDecimal(bk)} = `;
        assert.ok(dec.startsWith(decHead), `${dec} must start with ${decHead}`);
        assert.equal(dec.endsWith(repeats(E) ? ", a repeating decimal." : "."), true);
        assert.equal(dec.includes("repeating decimal"), repeats(E));
        assert.equal(repeats(E), !terminates(r));
        const printed = parseDecimal(dec.slice(decHead.length).replace(", a repeating decimal.", "").replace(/\.$/u, ""));
        if (repeats(E)) {
          assert.ok(Math.abs(printed) <= Math.abs(rv), "a repeating decimal is truncated, never rounded up");
          assert.ok(Math.abs(printed - rv) < 1e-3);
        } else {
          assert.equal(printed, z(rv));
        }
      }
    }
  }

  assert.equal(states, 4 * 9 * 9);
  assert.ok(equalitiesChecked >= states, `only ${equalitiesChecked} displayed equalities were re-evaluated`);
});

test("the worked example matches independent arithmetic", () => {
  assert.deepEqual({ ...WE }, { startDepth: -12, riseN: 3, riseD: 4, seconds: 6 });

  // the whole example, recomputed here as plain decimals from the four constants
  const rise = WE.riseN / WE.riseD;          // 0.75 m per second
  const change = WE.seconds * rise;          // 4.5 m of rise in the first 6 s
  const depth = WE.startDepth + change;      // -7.5 m
  const gap = 0 - depth;                     // 7.5 m still to climb
  const extra = gap / rise;                  // 10 more seconds
  const total = WE.seconds + extra;          // 16 seconds in all
  assert.equal(WE.startDepth + total * rise, 0, "the drone really does reach the surface at the total time");

  const w = workedExample();
  assert.deepEqual(w.rise, { n: 3, d: 4 });
  assert.deepEqual(w.change, { n: 9, d: 2 });
  assert.deepEqual(w.depth, { n: -15, d: 2 });
  assert.deepEqual(w.gap, { n: 15, d: 2 });
  assert.deepEqual(w.extra, { n: 10, d: 1 });
  assert.deepEqual(w.total, { n: 16, d: 1 });
  assert.deepEqual(reciprocal(w.rise), { n: 4, d: 3 });
  for (const [got, want] of [[w.change, change], [w.depth, depth], [w.gap, gap], [w.extra, extra], [w.total, total]] as const) {
    assert.equal(toNum(got), want);
  }

  // the four displayed step strings, rebuilt from those decimals
  const steps = workedSteps();
  assert.equal(steps.length, 4);
  assert.equal(steps[0].math, `${WE.seconds} × ${WE.riseN}/${WE.riseD} = ${change} m`);
  assert.equal(steps[1].math, `${MINUS}${Math.abs(WE.startDepth)} + ${change} = ${MINUS}${Math.abs(depth)} m`);
  assert.equal(steps[2].math, `0 ${MINUS} (${MINUS}${Math.abs(depth)}) = 0 + ${gap} = ${gap} m`);
  assert.equal(steps[3].math, `${gap} ÷ (${WE.riseN}/${WE.riseD}) = ${gap} × ${WE.riseD}/${WE.riseN} = ${extra} s`);
  assert.equal(steps[3].why, "Dividing by a fraction is multiplying by its reciprocal (7.NS.A.2). "
    + `With the first ${WE.seconds} seconds that is ${total} seconds in all, `
    + "and naming the unit is what turns the number into an answer (7.NS.A.3).");

  // and each of those strings has to survive being read with standard precedence
  for (const s of steps) {
    assert.ok(s.title.length > 0 && s.why.length > 0);
    assert.ok(!s.math.includes("-"), `an ASCII hyphen leaked into "${s.math}"`);
    assert.ok(assertDisplayedEqualitiesHold(s.math, s.title) > 0, `${s.title} must display an equality`);
    assert.ok(/7\.NS\.A\.[123]/u.test(s.why), "each step names the standard it uses");
  }
  // step 3 keeps the decimals of step 2 rather than switching to fractions mid-chain
  assert.ok(!steps[2].math.includes("/"), "step 3 stays in the decimals the student was just given");
});

test("the Try it answer is the one correct share, and the feedback says it in one notation", () => {
  assert.deepEqual({ ...TRY }, { balance: -18, members: 4 });
  const t = tryIt();

  // -18 shared among 4 members is -18 / 4 = -4.5 each; the distractors are the three near misses
  const share = TRY.balance / TRY.members;
  const expected = [-TRY.balance / TRY.members, share, TRY.balance * TRY.members, TRY.balance + TRY.members];
  assert.deepEqual(expected, [4.5, -4.5, -72, -14]);
  assert.equal(t.choices.length, 4);
  assert.equal(t.correct, 1);
  assert.deepEqual(t.choices.map(toNum), expected);
  assert.deepEqual(t.share, { n: -9, d: 2 });
  assert.equal(t.share.n * TRY.members, TRY.balance * t.share.d, "the share times the members rebuilds the balance");
  assert.equal(toNum(t.choices[t.correct]), share);
  assert.equal(new Set(expected).size, 4);
  for (let i = 0; i < expected.length; i += 1) if (i !== t.correct) assert.notEqual(expected[i], share);
  assert.equal(moneyLabel(t.share), `${MINUS}$4.50`);

  // the feedback, rebuilt here, with one minus sign for the whole block
  const money = (v: number) => `${v < 0 ? MINUS : ""}$${Math.abs(v).toFixed(2)}`;
  const quotient = `${MINUS}${Math.abs(TRY.balance)} ÷ ${TRY.members}`;
  assert.equal(tryFeedback(null), "");
  assert.equal(tryFeedback(t.correct), `Yes. Sharing means dividing: ${quotient} = ${MINUS}${Math.abs(share)}. `
    + `A negative divided by a positive is negative, so each member holds ${money(share)} of the shortfall.`);
  for (let i = 0; i < expected.length; i += 1) {
    if (i === t.correct) continue;
    assert.equal(tryFeedback(i), `Not that one. ${money(expected[i])} is not ${quotient}. `
      + `Sharing a balance among ${TRY.members} members divides it, and ${quotient} = ${MINUS}${Math.abs(share)}.`);
  }
  for (const pick of [null, 0, 1, 2, 3]) {
    const text = tryFeedback(pick);
    assert.ok(!text.includes("-"), `an ASCII hyphen leaked into "${text}"`);
    assertDisplayedEqualitiesHold(text, `try it pick ${pick}`);
  }
});

test("the lesson source obeys the house rules", () => {
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = new Set(
    [...source.matchAll(/\b((?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/gu)].map((m) => m[1])
  );
  assert.ok(cited.size > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of BRIEF_STANDARDS) assert.ok(mathCheck.includes(`(${id})`), `the Math check must cite ${id}`);

  const svgs = [...source.matchAll(/<svg\b[^>]*>/gu)].map((m) => m[0]);
  assert.equal(svgs.length, 1);
  for (const tag of svgs) {
    assert.match(tag, /viewBox=/u);
    assert.match(tag, /role="img"/u);
    assert.match(tag, /aria-label=\{figureLabel\(/u);
  }

  // operation chooser, next step, start over, try-it choice, and the two stepper buttons
  const buttons = [...source.matchAll(/<button\b[^>]*/gu)].map((m) => m[0]);
  assert.equal(buttons.length, 6);
  for (const tag of buttons) assert.match(tag, /type="button"/u);
  assert.match(source, /aria-pressed=\{opId === o\.id\}/u);
  assert.match(source, /aria-pressed=\{pick === i\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);

  // changing a control must announce the readouts it changes
  assert.match(source, /<div role="status"[^>]*>\s*<div className="rounded-2xl border-2/u);
  assert.match(source, /<p role="status"[^>]*>\{tryFeedback\(pick\)\}<\/p>/u);
  assert.match(source, /aria-live="polite"/u);
  // the opener must not promise that multiplying always makes the arrow longer
  assert.ok(!/multiplying stretches/u.test(source), "multiplying by a factor under 1 shortens the arrow");
  assert.match(source, /multiplying rescales an arrow/u);

  assert.doesNotMatch(source, /[⺀-鿿豈-﷿＀-￯]/u, "no CJK characters");
  for (const forbidden of ["Math.random", "fetch(", "localStorage", "sessionStorage", "<form", "dangerouslySetInnerHTML", "next/image"]) {
    assert.ok(!source.includes(forbidden), `${forbidden} is forbidden`);
  }
  for (const internal of ["Codex", "S18", "QA", "candidate", "us-ca-math", "topicId"]) {
    assert.ok(!source.includes(internal), `internal identifier ${internal} must not appear`);
  }
  // Tailwind-4-only syntax, assembled at run time so this guard is not itself a match
  const v4Only = ["bg-linear", "inset-shadow", "text-shadow", "field-sizing"].map((name) => `${name}-`);
  v4Only.push(`${"not"}-[`);
  for (const v4 of v4Only) assert.ok(!source.includes(v4), `${v4} is Tailwind 4 only`);
});

test("every operation symbol used in the copy is the one the operation means", () => {
  const symbols: Record<OpId, string> = { add: "+", sub: MINUS, mul: "×", div: "÷" };
  for (const id of OP_IDS) assert.equal(symbolFor(id), symbols[id]);
  const a = frac(-3, 2);
  const b = frac(1, 2);
  assert.equal(equationText("add", a, b, applyOp("add", a, b)), `${MINUS}3/2 + 1/2 = ${MINUS}1`);
  assert.equal(equationText("sub", a, b, applyOp("sub", a, b)), `${MINUS}3/2 ${MINUS} 1/2 = ${MINUS}2`);
  assert.equal(equationText("mul", a, b, applyOp("mul", a, b)), `${MINUS}3/2 × 1/2 = ${MINUS}3/4`);
  // the divisor is parenthesised: without it the printed line would read as -3/2 ÷ 1 / 2 = -0.75
  assert.equal(equationText("div", a, b, applyOp("div", a, b)), `${MINUS}3/2 ÷ (1/2) = ${MINUS}3`);
  assert.equal(evaluate(`${MINUS}3/2 ÷ (1/2)`), -3);
  assert.equal(equationText("div", a, frac(0, 1), null), `${MINUS}3/2 ÷ 0 is undefined`);
  assert.equal(inverseCheck("mul", frac(-3, 2), frac(1, 2)), `Check: ${MINUS}3/4 ÷ (1/2) = ${MINUS}3/2, so dividing undoes multiplying.`);
});
