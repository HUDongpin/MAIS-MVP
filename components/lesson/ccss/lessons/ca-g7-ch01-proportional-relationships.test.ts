import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  add,
  amountText,
  cents,
  centsText,
  costFor,
  couponReadout,
  exactCents,
  firstBreak,
  frac,
  fracLabel,
  gcd,
  graphAriaLabel,
  graphGeometry,
  isProportional,
  money,
  mul,
  percentOf,
  plural,
  ratioTexts,
  reciprocal,
  signText,
  sub,
  tickDollars,
  toNumber,
  unitRate,
  unitRateSteps,
  whyNotProportional,
  workedExample,
  H,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  TRY_ANSWER,
  TRY_CHOICES,
  W,
  WE,
  WEIGHTS,
  XMAX,
  YMAX,
  type Frac
} from "./ca-g7-ch01-proportional-relationships";

const SLUG = "ca-g7-ch01-proportional-relationships";
const BRIEF_STANDARDS = ["7.RP.A.1", "7.RP.A.2", "7.RP.A.3"];
const source = readFileSync(path.join(process.cwd(), `components/lesson/ccss/lessons/${SLUG}.tsx`), "utf8");
const EPS = 1e-9;

/* ------------------------------------------------------------------ *
 * Independent arithmetic. Nothing below calls the lesson's helpers:   *
 * a different gcd (iterative), a different rounding rule (truncate    *
 * plus remainder comparison) and hand-written string building, so an  *
 * assertion can never reduce to "the lesson agrees with itself".      *
 * ------------------------------------------------------------------ */
function ownGcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) { const t = x % y; x = y; y = t; }
  return x || 1;
}
function ownReduce(n: number, d: number): [number, number] {
  const g = ownGcd(n, d);
  return [n / g, d / g];
}
function ownFracLabel(n: number, d: number): string {
  const [rn, rd] = ownReduce(n, d);
  return rd === 1 ? `${rn}` : `${rn}/${rd}`;
}
/** n/d dollars in cents, rounded half away from zero, computed on integers. */
function ownCents(n: number, d: number): number {
  const sign = n < 0 ? -1 : 1;
  const hundredths = Math.abs(n) * 100;
  const whole = Math.trunc(hundredths / d);
  const remainder = hundredths - whole * d;
  return sign * (2 * remainder >= d ? whole + 1 : whole);
}
function ownMoney(n: number, d: number): string {
  const c = ownCents(n, d);
  const a = Math.abs(c);
  return `${c < 0 ? "-" : ""}${Math.floor(a / 100)}.${String(a % 100).padStart(2, "0")}`;
}
function ownExact(n: number, d: number): boolean {
  return (n * 100) % d === 0;
}
function ownDollarWord(n: number, d: number): string {
  const [rn, rd] = ownReduce(n, d);
  return rd === 1 && Math.abs(rn) === 1 ? "dollar" : "dollars";
}
/** "$12.34" -> 1234 */
function parseMoney(text: string): number {
  const m = /^\$(\d+)\.(\d{2})$/u.exec(text);
  assert.ok(m, `"${text}" is not a money string`);
  return Number(m[1]) * 100 + Number(m[2]);
}
/** "5/3" or "4" -> [n, d] */
function parseFrac(text: string): [number, number] {
  const m = /^(-?\d+)(?:\/(\d+))?$/u.exec(text);
  assert.ok(m, `"${text}" is not a fraction`);
  return [Number(m[1]), m[2] ? Number(m[2]) : 1];
}
/** Whole JSX opening tags, tolerating ">" inside {...} (arrow functions). */
function jsxTags(src: string, tag: string): string[] {
  const found: string[] = [];
  const needle = `<${tag}`;
  for (let i = src.indexOf(needle); i >= 0; i = src.indexOf(needle, i + 1)) {
    let depth = 0;
    for (let j = i + needle.length; j < src.length; j += 1) {
      const ch = src[j];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      else if (ch === ">" && depth === 0) { found.push(src.slice(i, j + 1)); break; }
    }
  }
  return found;
}

function inlineRange(re: RegExp, label: string) {
  const m = source.match(re);
  assert.ok(m, `${label} must declare an inline min and max in the lesson source`);
  return { min: Number(m[1]), max: Number(m[2]) };
}

// The control grid is read from the JSX itself, so the test enumerates exactly what a student can reach.
const RANGES = {
  dollars: inlineRange(/value=\{dollars\} min=\{(\d+)\} max=\{(\d+)\}/u, "price stepper"),
  weight: inlineRange(/value=\{wi\} min=\{(\d+)\} max=\{(\d+)\}/u, "weight stepper"),
  coupon: inlineRange(/value=\{coupon\} min=\{(\d+)\} max=\{(\d+)\} step=\{10\}/u, "coupon stepper"),
  buy: inlineRange(/type="range" min=\{(\d+)\} max=\{(\d+)\} value=\{buy\}/u, "pounds-to-buy slider")
};
const COUPON_STEP = 10;
// The weights the stepper indexes, written out here rather than imported as data.
const HAND_WEIGHTS: ReadonlyArray<readonly [number, number]> = [[3, 4], [1, 1], [2, 1], [3, 1]];

test("declared control bounds match the lesson contract", () => {
  assert.deepEqual(RANGES.dollars, { min: 3, max: 9 });
  assert.deepEqual(RANGES.weight, { min: 0, max: 3 });
  assert.deepEqual(RANGES.coupon, { min: 0, max: 50 });
  assert.deepEqual(RANGES.buy, { min: 1, max: 8 });
  assert.equal(WEIGHTS.length, RANGES.weight.max + 1, "the weight stepper must reach every weight");
  assert.deepEqual(
    WEIGHTS.map((w) => [w.n, w.d]),
    HAND_WEIGHTS.map(([n, d]) => [n, d])
  );
  // at least one weight is a fraction of a pound, so a unit rate from a ratio of fractions is reachable
  assert.ok(WEIGHTS.some((w) => w.d !== 1), "a fractional weight must be reachable (7.RP.A.1)");
});

test("fraction helpers are exact and reduced", () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(7, 0), 7);
  assert.deepEqual(frac(6, 4), { n: 3, d: 2 });
  assert.deepEqual(frac(0, 5), { n: 0, d: 1 });
  assert.deepEqual(frac(3, -6), { n: -1, d: 2 });
  assert.deepEqual(add(frac(3, 2), frac(1, 3)), { n: 11, d: 6 }); // 9/6 + 2/6
  assert.deepEqual(sub(frac(20, 3), frac(2, 3)), { n: 6, d: 1 }); // 18/3
  assert.deepEqual(mul(frac(5, 3), frac(4, 1)), { n: 20, d: 3 });
  assert.deepEqual(reciprocal(frac(3, 4)), { n: 4, d: 3 });
  assert.deepEqual(reciprocal(frac(3, 1)), { n: 1, d: 3 });
  assert.equal(toNumber(frac(3, 2)), 1.5);
  assert.equal(exactCents(frac(3, 2)), true); // 150 cents
  assert.equal(exactCents(frac(1, 3)), false); // 33.33... cents
  assert.equal(exactCents(frac(1, 8)), false); // 12.5 cents
  assert.equal(fracLabel(frac(4, 2)), "2");
  assert.equal(fracLabel(frac(5, 3)), "5/3");
  assert.equal(plural(1, "pound"), "pound");
  assert.equal(plural(2, "pound"), "pounds");
  assert.equal(isProportional([[2, 5], [4, 10]]), true);
  assert.equal(isProportional([[1, 3], [2, 5]]), false);
});

test("money rounds half away from zero on the integers, never through a double", () => {
  // Hand-checked half-cent cases. 0.075 and 2.025 are stored as ...4999 in IEEE-754,
  // so a toFixed(2) implementation rounds them down; grade 7 rounds half up.
  assert.equal(money(frac(1, 40)), "0.03"); // 2.5 cents
  assert.equal(money(frac(3, 40)), "0.08"); // 7.5 cents
  assert.equal(money(frac(1, 8)), "0.13"); // 12.5 cents
  assert.equal(money(frac(7, 40)), "0.18"); // 17.5 cents
  assert.equal(money(frac(33, 40)), "0.83"); // 82.5 cents
  assert.equal(money(frac(81, 40)), "2.03"); // 202.5 cents
  assert.equal(money(frac(189, 40)), "4.73"); // 472.5 cents
  assert.equal(money(frac(693, 40)), "17.33"); // 1732.5 cents
  assert.equal(money(frac(1, 3)), "0.33");
  assert.equal(money(frac(20, 3)), "6.67");
  assert.equal(money(frac(3, 2)), "1.50");
  assert.equal(cents(frac(3, 40)), 8);
  assert.equal(centsText(8), "0.08");
  assert.equal(centsText(1620), "16.20");
  // and it agrees with the test's own truncate-and-compare rounding everywhere it is used
  for (let d = 1; d <= 40; d += 1) {
    for (let n = 0; n <= 200; n += 1) assert.equal(money(frac(n, d)), ownMoney(n, d), `${n}/${d}`);
  }
});

test("every reachable figure state keeps the unit rate, table, coupon, graph and copy true", () => {
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const LABEL_W = 48; // generous estimate of a "≈$96.00" label at 11px mono
  let states = 0;
  let exactCheckouts = 0;
  let fractionCheckouts = 0;

  for (let dollars = RANGES.dollars.min; dollars <= RANGES.dollars.max; dollars += 1) {
    for (let wi = RANGES.weight.min; wi <= RANGES.weight.max; wi += 1) {
      const [wn, wd] = HAND_WEIGHTS[wi];
      const weight: Frac = { n: wn, d: wd };
      // k = dollars / (wn/wd) = dollars * wd / wn
      const [kn, kd] = ownReduce(dollars * wd, wn);

      for (let buy = RANGES.buy.min; buy <= RANGES.buy.max; buy += 1) {
        // cost = k * buy
        const [cn, cd] = ownReduce(kn * buy, kd);

        for (let coupon = RANGES.coupon.min; coupon <= RANGES.coupon.max; coupon += COUPON_STEP) {
          states += 1;
          // savings = coupon/100 of the cost; payment = the other (100 - coupon)/100
          const [sn, sd] = ownReduce(cn * coupon, cd * 100);
          const [pn, pd] = ownReduce(cn * (100 - coupon), cd * 100);

          const k = unitRate(dollars, weight);
          assert.deepEqual(k, { n: kn, d: kd }, `k for $${dollars} per ${wn}/${wd} lb`);
          assert.equal(k.n * wn, dollars * wd * k.d, "k times the weight must be the price");

          const cost = costFor(dollars, weight, frac(buy, 1));
          assert.deepEqual(cost, { n: cn, d: cd });
          const save = percentOf(cost, coupon);
          assert.deepEqual(save, { n: sn, d: sd });
          const pay = sub(cost, save);
          assert.deepEqual(pay, { n: pn, d: pd });
          assert.deepEqual(add(pay, save), cost, "savings and payment must rebuild the price exactly");

          // the sign row of the table reproduces the price on the sign exactly
          assert.deepEqual(costFor(dollars, weight, weight), { n: dollars, d: 1 });

          // every table row: cost = k * pounds, and its money string is the hand-rounded one
          const rows: Array<[number, number]> = wd === 1 ? [] : [[wn, wd]];
          for (let x = 1; x <= XMAX; x += 1) rows.push([x, 1]);
          for (const [rn, rd] of rows) {
            const c = costFor(dollars, weight, frac(rn, rd));
            const [en, ed] = ownReduce(kn * rn, kd * rd);
            assert.deepEqual(c, { n: en, d: ed }, `row ${rn}/${rd}`);
            assert.equal(money(c), ownMoney(en, ed), `row ${rn}/${rd} money`);
            assert.equal(exactCents(c), ownExact(en, ed));
          }

          // ---- geometry on a FIXED dollar axis: the drawn slope carries k ----
          const g = graphGeometry(dollars, weight, buy, coupon);
          const full = (kn * XMAX) / kd;
          assert.ok(full <= YMAX + EPS, `the cost of ${XMAX} pounds (${full}) must fit the fixed axis`);
          assert.equal(g.full, full, "the axis cap must never clamp a reachable state");
          assert.equal(g.origin.x, PAD_L);
          assert.equal(g.origin.y, H - PAD_B);
          assert.ok(Math.abs(g.lineEnd.x - (W - PAD_R)) < EPS);
          assert.ok(Math.abs(g.lineEnd.y - (H - PAD_B - (full / YMAX) * plotH)) < 1e-6, "line end height is set by k, not normalised away");
          assert.ok(g.lineEnd.y >= PAD_T - EPS, "the line must stay below the top of the plot");
          assert.ok(Math.abs(g.point.x - (PAD_L + (buy / XMAX) * plotW)) < EPS);
          assert.ok(Math.abs(g.point.y - (H - PAD_B - (cn / cd / YMAX) * plotH)) < 1e-6);
          const expectedCouponY = H - PAD_B - (pn / pd / YMAX) * plotH;
          assert.ok(Math.abs(g.couponPoint.y - expectedCouponY) < 1e-6);
          assert.ok(g.couponPoint.y >= g.point.y - EPS, "coupon point is never above the full-price point");
          assert.ok(g.couponEnd.y >= g.lineEnd.y - EPS && g.couponEnd.y <= H - PAD_B + EPS);
          for (const p of [g.point, g.couponPoint, g.lineEnd, g.couponEnd, g.origin]) {
            assert.ok(p.x >= 6 && p.x <= W - 6, `x=${p.x} must leave room for a 6px marker`);
            assert.ok(p.y >= 6 && p.y <= H - 6, `y=${p.y} must leave room for a 6px marker`);
          }
          const labelLeft = g.labelAnchor === "end" ? g.labelX - LABEL_W : g.labelX;
          assert.ok(labelLeft >= 0 && labelLeft + LABEL_W <= W, `point label must stay inside the viewBox (${labelLeft})`);
          assert.ok(g.labelY - 11 >= 0 && g.labelY <= H, `point label baseline ${g.labelY} must stay inside the viewBox`);
          for (let i = 0; i <= XMAX; i += 1) {
            assert.ok(g.gy(i) >= PAD_T - EPS && g.gy(i) <= H - PAD_B + EPS);
            assert.ok(g.sx(i) >= PAD_L - EPS && g.sx(i) <= W - PAD_R + EPS);
            assert.equal(tickDollars(i), 12 * i); // 0, 12, ... 96 dollars
          }

          // ---- the accessible description, rebuilt character for character ----
          const expectedLabel =
            `Cost in dollars against pounds, on an axis fixed from 0 to 96 dollars. ` +
            `A solid line through the origin rises ${ownFracLabel(kn, kd)} ${ownDollarWord(kn, kd)} for each pound ` +
            `and passes through the marked point: ${buy} ${buy === 1 ? "pound" : "pounds"} for ` +
            `${ownExact(cn, cd) ? "" : "about "}${ownMoney(cn, cd)} ${ownDollarWord(cn, cd)}.` +
            (coupon > 0 ? ` A dashed line below it shows the price after a ${coupon} percent coupon.` : "");
          const label = graphAriaLabel(dollars, weight, buy, coupon);
          assert.equal(label, expectedLabel);
          assert.equal(label.includes("rises 1 dollar for each pound"), kn === 1 && kd === 1);
          assert.equal(label.includes("coupon"), coupon > 0);

          // ---- the checkout copy: the subtraction on screen must be true as written ----
          const readout = couponReadout(cost, save, pay, coupon);
          const bothExact = ownExact(cn, cd) && ownExact(sn, sd);
          if (bothExact) {
            exactCheckouts += 1;
            assert.equal(readout.note, "");
            assert.equal(readout.savings, `${coupon}/100 × $${ownMoney(cn, cd)} = $${ownMoney(sn, sd)}`);
            assert.equal(readout.subtraction, `$${ownMoney(cn, cd)} − $${ownMoney(sn, sd)}`);
            assert.equal(readout.total, `$${ownMoney(pn, pd)}`);
            const [shownCost, shownSave] = readout.subtraction.split(" − ").map(parseMoney);
            assert.equal(shownCost - shownSave, parseMoney(readout.total), "printed cents must subtract to the printed total");
            assert.equal(shownCost - shownSave, ownCents(pn, pd));
          } else {
            fractionCheckouts += 1;
            assert.equal(readout.savings, `${coupon}/100 × ${ownFracLabel(cn, cd)} = ${ownFracLabel(sn, sd)} ${ownDollarWord(sn, sd)}`);
            assert.equal(readout.subtraction, `${ownFracLabel(cn, cd)} − ${ownFracLabel(sn, sd)}`);
            assert.equal(readout.total, `${ownFracLabel(pn, pd)} ${ownDollarWord(pn, pd)}`);
            assert.equal(readout.note, `about $${ownMoney(pn, pd)}`);
            const [[an, ad], [bn, bd]] = readout.subtraction.split(" − ").map(parseFrac);
            const [tn, td] = parseFrac(readout.total.split(" ")[0]);
            // (a - b) == t, by cross multiplication on the printed numerals
            assert.equal((an * bd - bn * ad) * td, tn * ad * bd, "printed fractions must subtract to the printed total");
          }

          // ---- standalone amounts never present a rounded value as exact ----
          const amount = amountText(cost);
          assert.equal(
            amount,
            ownExact(cn, cd) ? `$${ownMoney(cn, cd)}` : `${ownFracLabel(cn, cd)} ${ownDollarWord(cn, cd)}, about $${ownMoney(cn, cd)}`
          );

          // ---- no readout ever prints "1 dollars" or "1 pounds" ----
          for (const text of [label, amount, readout.savings, readout.subtraction, readout.total, readout.note, signText(dollars, weight), unitRateSteps(dollars, weight)]) {
            assert.doesNotMatch(text, /(^|[^\d.\/])1 dollars\b/u, `"${text}"`);
            assert.doesNotMatch(text, /(^|[^\d.\/])1 pounds\b/u, `"${text}"`);
          }
        }
      }

      // ---- the unit-rate line: dividing by a weight is multiplying by its reciprocal ----
      const [rn, rd] = ownReduce(wd, wn);
      const viaReciprocal = wn === wd ? "" : ` = ${dollars} × ${ownFracLabel(rn, rd)}`;
      assert.equal(unitRateSteps(dollars, weight), `${dollars} ÷ ${ownFracLabel(wn, wd)}${viaReciprocal} = ${ownFracLabel(kn, kd)}`);
      assert.equal(signText(dollars, weight), `$${dollars} for ${ownFracLabel(wn, wd)} ${wn <= wd ? "pound" : "pounds"}`);
    }
  }

  assert.equal(states, 7 * 4 * 8 * 6);
  assert.ok(exactCheckouts > 0 && fractionCheckouts > 0, "both checkout forms must be reachable");
});

test("the graph line gets steeper as the unit rate gets larger", () => {
  const plotH = H - PAD_T - PAD_B;
  const tags: Array<{ k: number; y: number; label: string }> = [];
  for (let dollars = RANGES.dollars.min; dollars <= RANGES.dollars.max; dollars += 1) {
    for (let wi = RANGES.weight.min; wi <= RANGES.weight.max; wi += 1) {
      const [wn, wd] = HAND_WEIGHTS[wi];
      tags.push({
        k: (dollars * wd) / wn,
        y: graphGeometry(dollars, { n: wn, d: wd }, 1, 0).lineEnd.y,
        label: `$${dollars} per ${wn}/${wd} lb`
      });
    }
  }
  for (const a of tags) {
    for (const b of tags) {
      if (a.k < b.k - EPS) assert.ok(a.y > b.y + EPS, `${a.label} (k=${a.k}) must draw a shallower line than ${b.label} (k=${b.k})`);
      if (Math.abs(a.k - b.k) < EPS) assert.ok(Math.abs(a.y - b.y) < EPS, "equal unit rates must draw the same line");
    }
  }
  const ys = tags.map((t) => t.y);
  const spread = Math.max(...ys) - Math.min(...ys);
  assert.ok(spread > 0.85 * plotH, `the drawn slope must vary across the grid (spread ${spread}px of ${plotH}px)`);
  // the marked point also moves with k, not only the line
  const cheap = graphGeometry(3, { n: 3, d: 1 }, 8, 0).point.y; // k = 1, cost of 8 lb = $8
  const dear = graphGeometry(9, { n: 3, d: 4 }, 8, 0).point.y; // k = 12, cost of 8 lb = $96
  assert.ok(Math.abs(cheap - (H - PAD_B - (8 / 96) * plotH)) < 1e-6);
  assert.ok(Math.abs(dear - PAD_T) < 1e-6);
  assert.ok(cheap - dear > 150, "the marked point must move a long way as k grows");
});

test("worked example values match independent arithmetic", () => {
  assert.deepEqual(WE, { cups: 4, dollars: 6, buy: 10, taxPct: 8 });
  const we = workedExample();

  // Step 1: $6 for 4 cups -> 6 / 4 = 3/2 = $1.50 per cup
  assert.deepEqual(we.rate, { n: 3, d: 2 });
  assert.equal(toNumber(we.rate), WE.dollars / WE.cups);
  assert.equal(money(we.rate), "1.50");

  // Step 2: 10 cups -> 3/2 * 10 = 30/2 = 15
  assert.deepEqual(we.base, { n: 15, d: 1 });
  assert.equal(toNumber(we.base), (WE.dollars / WE.cups) * WE.buy);
  assert.equal(money(we.base), "15.00");

  // Step 3: 8% of 15 = 15 * 8 / 100 = 120/100 = 6/5 = 1.20; total 15 + 1.20 = 16.20 = 81/5
  assert.deepEqual(we.tax, { n: 6, d: 5 });
  assert.equal(toNumber(we.tax), 1.2);
  assert.equal(money(we.tax), "1.20");
  assert.deepEqual(we.total, { n: 81, d: 5 });
  assert.equal(money(we.total), "16.20");
  assert.equal(cents(we.total), 1620);

  // One-step multiplier 1 + 8/100 = 108/100 = 27/25 = 1.08; 27/25 * 15 = 405/25 = 81/5
  assert.deepEqual(we.multiplier, { n: 27, d: 25 });
  assert.equal(money(we.multiplier), "1.08");
  assert.deepEqual(we.oneStep, { n: 81, d: 5 });
  assert.deepEqual(we.oneStep, we.total);

  // the lesson reveals exactly three moves, matching the heading and the roadmap
  assert.equal((source.match(/^\s{4}<>(?:Find|Write|Add) the <strong>/gmu) ?? []).length, 3);
  assert.match(source, /one problem, three moves/u);
  assert.match(source, /Three lessons follow, one for each move you just made/u);
});

test("the Try it question has exactly one proportional table and it is the marked answer", () => {
  // hand-written: the tables, and whether each is proportional, worked out by cross products
  const HAND: Array<{ pairs: Array<[number, number]>; proportional: boolean; ratios: string[]; breakAt: number }> = [
    { pairs: [[1, 3], [2, 5], [3, 7]], proportional: false, ratios: ["3.00", "2.50", "≈2.33"], breakAt: 1 }, // 3*2 != 5*1
    { pairs: [[2, 6], [3, 8], [4, 10]], proportional: false, ratios: ["3.00", "≈2.67", "2.50"], breakAt: 1 }, // 6*3 != 8*2
    { pairs: [[2, 5], [4, 10], [6, 15]], proportional: true, ratios: ["2.50", "2.50", "2.50"], breakAt: -1 }, // 5*4 = 10*2, 5*6 = 15*2
    { pairs: [[1, 4], [2, 8], [3, 10]], proportional: false, ratios: ["4.00", "4.00", "≈3.33"], breakAt: 2 } // 4*2 = 8*1 but 4*3 != 10*1
  ];
  assert.equal(TRY_CHOICES.length, HAND.length);
  assert.deepEqual(TRY_CHOICES.map((c) => c.map(([x, y]) => [x, y])), HAND.map((h) => h.pairs));
  HAND.forEach((hand, i) => {
    const [x0, y0] = hand.pairs[0];
    const agrees = hand.pairs.every(([x, y]) => y * x0 === y0 * x);
    assert.equal(agrees, hand.proportional, `hand check of choice ${i}`);
    assert.equal(isProportional(TRY_CHOICES[i]), hand.proportional);
    assert.deepEqual(ratioTexts(TRY_CHOICES[i]), hand.ratios);
    assert.equal(firstBreak(TRY_CHOICES[i]), hand.breakAt);
  });
  assert.equal(TRY_ANSWER, HAND.findIndex((h) => h.proportional));
  assert.equal(TRY_ANSWER, 2);
  // the feedback names the row that breaks the pattern instead of claiming every row disagrees
  assert.equal(
    whyNotProportional(TRY_CHOICES[3]),
    "Cost ÷ pounds gives 4.00, 4.00, ≈3.33, so the first 2 rows agree, but row 3 does not. One row that disagrees is enough: there is no single constant k."
  );
  assert.match(whyNotProportional(TRY_CHOICES[0]), /the first two rows already disagree/u);
});

test("lesson source obeys the house rules", () => {
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = new Set(
    [...source.matchAll(/\b((?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/gu)].map((m) => m[1])
  );
  assert.ok(cited.size > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of BRIEF_STANDARDS) assert.ok(mathCheck.includes(`(${id})`), `Math check must cite ${id}`);
  // 7.RP.A.1 is earned, not name-dropped: it is cited on the reciprocal division the figure performs
  assert.match(mathCheck, /multiplying by its reciprocal[^.]*fraction of a pound \(7\.RP\.A\.1\)/u);

  // tag scanning must survive ">" inside an arrow function
  assert.deepEqual(jsxTags('<button onClick={() => f(1)} type="button">x</button>', "button"), ['<button onClick={() => f(1)} type="button">']);
  const svgs = jsxTags(source, "svg");
  assert.equal(svgs.length, 1);
  for (const tag of svgs) {
    assert.match(tag, /viewBox=/u);
    assert.match(tag, /role="img"/u);
    assert.match(tag, /aria-label=/u);
  }
  // Next step, Start over, the mapped Try-it choice, and the two Stepper buttons
  const buttons = jsxTags(source, "button");
  assert.equal(buttons.length, 5);
  for (const tag of buttons) assert.match(tag, /type="button"/u);

  // the step revealer is an incrementer, not a disclosure: it announces through its live region
  assert.ok(!source.includes("aria-expanded"), "a 4-state incrementer must not claim to be an expand/collapse toggle");
  assert.equal((source.match(/aria-controls=\{stepsId\}/gu) ?? []).length, 2, "both step buttons declare what they control");
  assert.match(source, /<div id=\{stepsId\} aria-live="polite">/u);
  assert.match(source, /className="sr-only">Showing \{shown\} of \{steps\.length\} steps\./u);
  assert.match(source, /aria-pressed=\{pick === i\}/u);

  // dark mode: markers use tokens, never a hard-coded white
  assert.ok(!/stroke="white"/u.test(source), "SVG markers must use var(--surface), not a hard-coded white");

  assert.doesNotMatch(source, /[⺀-鿿豈-﫿＀-￯]/u, "no CJK characters");
  for (const forbidden of ["Math.random", "fetch(", "localStorage", "<form", "dangerouslySetInnerHTML", "next/image"]) {
    assert.ok(!source.includes(forbidden), `${forbidden} is forbidden`);
  }
  for (const internal of ["Codex", "S18", "QA", "candidate", "us-ca-math"]) {
    assert.ok(!source.includes(internal), `internal identifier ${internal} must not appear`);
  }
});
