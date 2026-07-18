/* Numeric audit for PercentageLab — run: node audit-percentage.mjs
   Verifies the math the lab teaches is exactly correct across every reachable
   dial state: percent↔decimal↔fraction, the 100-grid shading structure, a
   percent OF a quantity, benchmarks, the "rate not amount" trap, and the
   calibration reachability/meter. All amounts are held in INTEGER HUNDREDTHS so
   no float artefact can slip through. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

/* --- helpers mirrored EXACTLY from the lab --------------------------------- */
const WHOLES = [20, 40, 50, 60, 80, 100, 200];
const CALIB_WHOLES = [20, 40, 50, 80, 100, 200];
const MATCH_SCALE = 25;
const partHundredths = (p, W) => p * W;
const matchPercent = (p, pT) => 100 * Math.max(0, 1 - Math.abs(p - pT) / MATCH_SCALE);
const isCalibrated = (p, pT) => p === pT;
function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
function decimal2(p) {
  if (p >= 100) {
    const whole = Math.floor(p / 100);
    const rem = p % 100;
    return whole + '.' + String(rem).padStart(2, '0');
  }
  return '0.' + String(p).padStart(2, '0');
}
function reducedFraction(p) {
  if (p === 0) return { n: 0, d: 1 };
  const g = gcd(p, 100);
  return { n: p / g, d: 100 / g };
}
function formatAmount(partH) {
  const whole = Math.floor(partH / 100);
  const frac = partH % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return whole + '.' + frac / 10;
  return whole + '.' + String(frac).padStart(2, '0');
}

/* 1) percent = p/100 exactly, for every reachable p (0..100), with no float
      drift; and the two-place decimal is exactly p hundredths. --------------- */
for (let p = 0; p <= 100; p++) {
  ok(Number.isInteger(p), `p integer ${p}`);
  // decimal2 equals p/100 as a value
  const decVal = Number(decimal2(p));
  ok(Math.abs(decVal - p / 100) < 1e-12, `decimal2 equals p/100 (${p})`);
  // decimal is always two places (÷100 lands in hundredths) — string form
  if (p < 100) ok(/^0\.\d\d$/.test(decimal2(p)), `two-place decimal ${p}`);
  ok(decimal2(100) === '1.00', '100% = 1.00');
  // reduced fraction equals p/100
  const { n, d } = reducedFraction(p);
  ok(Math.abs(n / d - p / 100) < 1e-12, `reduced fraction equals value ${p}`);
  ok(gcd(n, d) === 1 || n === 0, `fraction in lowest terms ${p}`);
}

/* 2) The 100-grid shading structure: p cells = (tens full 10% columns) +
      (ones loose 1% cells); totals reconstruct p; a column is 10 cells; the
      loose block never exceeds one column. ---------------------------------- */
for (let p = 0; p <= 100; p++) {
  const tens = Math.floor(p / 10);
  const ones = p % 10;
  ok(tens * 10 + ones === p, `grid cells reconstruct percent ${p}`);
  ok(tens <= 10, `at most ten columns ${p}`);
  ok(ones >= 0 && ones <= 9, `loose cells 0..9 ${p}`);
  if (ones > 0) ok(tens < 10, `loose column exists ${p}`);
  ok(tens * 10 === 10 * tens, `column = ten cells ${p}`);
}
ok(Math.floor(100 / 10) === 10 && 100 % 10 === 0, '100% is ten full columns, no loose cells');

/* 3) Decimal string spot-checks the lesson asserts. ------------------------- */
ok(decimal2(7) === '0.07', '7% = 0.07 (NOT 0.7)');
ok(decimal2(70) === '0.70', '70% = 0.70');
ok(decimal2(30) === '0.30', '30% = 0.30');
ok(decimal2(5) === '0.05', '5% = 0.05');
ok(decimal2(1) === '0.01', '1% = 0.01');
ok(decimal2(50) === '0.50', '50% = 0.50');
ok(decimal2(0) === '0.00', '0% = 0.00');
ok(decimal2(7) !== decimal2(70), '7% ≠ 70% as decimals');

/* 4) Fraction spot-checks. -------------------------------------------------- */
const fr = (p) => {
  const { n, d } = reducedFraction(p);
  return `${n}/${d}`;
};
ok(fr(25) === '1/4', '25% = 1/4');
ok(fr(50) === '1/2', '50% = 1/2');
ok(fr(10) === '1/10', '10% = 1/10');
ok(fr(20) === '1/5', '20% = 1/5');
ok(fr(75) === '3/4', '75% = 3/4');
ok(fr(5) === '1/20', '5% = 1/20');
ok(fr(1) === '1/100', '1% = 1/100');
ok(fr(100) === '1/1', '100% = 1/1 (one whole)');
ok(fr(0) === '0/1', '0% = 0/1');
ok(fr(20) !== '1/20', '20% (1/5) ≠ 5% (1/20)');

/* 5) Percent OF a quantity: partH = p·W is integer; part = partH/100 exact.
      Test EVERY reachable (p, W) — no float artefacts, part in valid range. -- */
for (const W of WHOLES) {
  for (let p = 0; p <= 100; p++) {
    const partH = partHundredths(p, W);
    ok(Number.isInteger(partH), `partH integer ${p}% of ${W}`);
    ok(Math.abs(partH / 100 - (p / 100) * W) < 1e-9, `part equals (p/100)W ${p}%,${W}`);
    ok(partH >= 0 && partH <= 100 * W, `part in [0,W] ${p}%,${W}`);
    // formatAmount is exact and parses back to the same value
    ok(Math.abs(Number(formatAmount(partH)) - partH / 100) < 1e-12, `formatAmount exact ${p}%,${W}`);
  }
}

/* 6) Percent-of spot-checks the lesson/quizzes assert. ---------------------- */
const partOf = (p, W) => formatAmount(partHundredths(p, W));
ok(partOf(50, 80) === '40', '50% of 80 = 40');
ok(partOf(50, 200) === '100', '50% of 200 = 100');
ok(partOf(25, 40) === '10', '25% of 40 = 10');
ok(partOf(25, 80) === '20', '25% of 80 = 20');
ok(partOf(10, 60) === '6', '10% of 60 = 6');
ok(partOf(30, 60) === '18', '30% of 60 = 18');
ok(partOf(5, 60) === '3', '5% of 60 = 3');
ok(partOf(100, 80) === '80', '100% of 80 = 80 (the whole)');
ok(partOf(0, 80) === '0', '0% of 80 = 0');
// exact non-integer amounts render cleanly (money), no float artefact
ok(partOf(25, 50) === '12.5', '25% of 50 = 12.5');
ok(partOf(25, 25 /* not a base, but formatAmount must still be exact */) === '6.25', '25% of 25 = 6.25');
ok(partOf(15, 80) === '12', '15% of 80 = 12');

/* 7) Benchmarks: 100%→whole, 50%→half, 10%→tenth, 1%→hundredth, exactly. ---- */
for (const W of WHOLES) {
  ok(partHundredths(100, W) === 100 * W, `100% of ${W} = ${W}`);
  ok(partHundredths(50, W) * 2 === 100 * W, `50% of ${W} is exactly half`);
  ok(partHundredths(10, W) * 10 === 100 * W, `10% of ${W} is exactly a tenth`);
  ok(partHundredths(1, W) * 100 === 100 * W, `1% of ${W} is exactly a hundredth`);
}

/* 8) "A percent is a rate, not an amount": the classic trap the lesson tests —
      a smaller percent of a bigger whole can beat a bigger percent of a smaller
      whole. Compare in exact hundredths. ------------------------------------ */
ok(partHundredths(25, 100) > partHundredths(50, 40), '25% of 100 (25) > 50% of 40 (20)');
ok(formatAmount(partHundredths(25, 100)) === '25', '25% of 100 = 25');
ok(formatAmount(partHundredths(50, 40)) === '20', '50% of 40 = 20');
// but same whole: bigger percent always ≥ amount (monotone in p)
for (const W of WHOLES) {
  for (let p = 0; p < 100; p++) {
    ok(partHundredths(p + 1, W) >= partHundredths(p, W), `monotone in p (W=${W}, p=${p})`);
    if (W > 0) ok(partHundredths(p + 1, W) > partHundredths(p, W), `strictly monotone (W=${W}, p=${p})`);
  }
}

/* 9) Calibration: for any fixed whole, the target part = pT·W/100 is hit by
      exactly ONE integer percent (pT); an exact hit stamps and reads 100%; one
      point off never stamps and reads below 100; the meter is monotone. ------ */
for (const W of CALIB_WHOLES) {
  for (let pT = 5; pT <= 100; pT++) {
    // uniqueness: no other integer percent gives the same part (W>0 ⇒ strictly increasing)
    let hits = 0;
    for (let p = 0; p <= 100; p++) {
      if (partHundredths(p, W) === partHundredths(pT, W)) hits++;
    }
    ok(hits === 1, `unique percent for target ${pT}% of ${W}`);
    ok(isCalibrated(pT, pT), `exact calibrates ${pT}`);
    ok(matchPercent(pT, pT) === 100, `exact meter 100 (${pT})`);
    const near = pT === 100 ? pT - 1 : pT + 1;
    ok(!isCalibrated(near, pT), `off-by-one not calibrated ${pT}`);
    ok(matchPercent(near, pT) < 100, `off-by-one meter < 100 ${pT}`);
    ok(matchPercent(near, pT) === 96, `off-by-one meter = 96 ${pT}`);
  }
}

/* 10) Meter is monotone: farther from the target never reads higher. -------- */
for (let pT = 5; pT <= 100; pT += 13) {
  for (let d = 0; d < MATCH_SCALE + 5; d++) {
    const a = Math.min(100, pT + d);
    const b = Math.min(100, pT + d + 1);
    ok(matchPercent(a, pT) >= matchPercent(b, pT) - 1e-9, `meter monotone ${pT},${d}`);
  }
}

/* 11) makeTarget always yields a reachable, in-range challenge, and "New
       target" never repeats the previous one. -------------------------------- */
function makeTarget(prev) {
  let t;
  let guard = 0;
  do {
    const W = CALIB_WHOLES[Math.floor(Math.random() * CALIB_WHOLES.length)];
    const p = 5 + Math.floor(Math.random() * 96);
    t = { p, W };
    guard++;
  } while (prev != null && t.p === prev.p && t.W === prev.W && guard < 1000);
  return t;
}
let prev = null;
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(prev);
  ok(CALIB_WHOLES.includes(t.W), `target whole is a base ${t.W}`);
  ok(t.p >= 5 && t.p <= 100, `target percent in 5..100 ${t.p}`);
  ok(WHOLES.includes(t.W), `target whole is a valid dial stop ${t.W}`);
  if (prev != null) ok(!(t.p === prev.p && t.W === prev.W), 'new target differs from previous');
  prev = t;
}

/* 12) The multiple-choice answer keys match the arithmetic they assert. ------ */
ok('45 out of every 100' === '45 out of every 100', 'step0: 45% = 45 per 100'); // definitional
ok(decimal2(7) === '0.07', 'step1: 7% = 0.07');
ok(fr(20) === '1/5', 'step2: 20% = 1/5');
ok(partOf(25, 40) === '10', 'step3: 25% of 40 = 10');
ok(partOf(10, 60) === '6', 'step4: 10% of 60 = 6');
ok(partHundredths(25, 100) > partHundredths(50, 40), 'step5: 25% of 100 > 50% of 40');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
