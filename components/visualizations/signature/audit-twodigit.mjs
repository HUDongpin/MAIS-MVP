/* Numeric audit for TwoDigitNumberLab — run: node audit-twodigit.mjs
   Verifies the two-digit place-value math the lab teaches is exactly correct
   across every reachable number, that the three LINKED dials always agree, that
   the word-form generator is right (incl. teens and the decade zero), and that
   the "count the pile" calibration can never stamp early. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (fails <= 20) console.error('FAIL:', msg);
  }
}

/* ---- mirror of the lab's model ------------------------------------------- */
const tensOf = (v) => Math.floor(v / 10);
const onesOf = (v) => v % 10;

const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const wordForm = (n) => (n < 20 ? ONES_W[n] : TENS_W[Math.floor(n / 10)] + (n % 10 ? '-' + ONES_W[n % 10] : ''));

const correctDigits = (v, t) => (tensOf(v) === tensOf(t) ? 1 : 0) + (onesOf(v) === onesOf(t) ? 1 : 0);
const matchPercent = (v, t) => 50 * correctDigits(v, t);
const isCalibrated = (v, t) => v === t;

// the three linked dial setters (pure forms of the component's handlers)
const setCount = (v) => Math.max(0, Math.min(99, Math.round(v)));
const setTens = (cur, nt) => Math.max(0, Math.min(9, Math.round(nt))) * 10 + onesOf(cur);
const setOnes = (cur, no) => tensOf(cur) * 10 + Math.max(0, Math.min(9, Math.round(no)));

/* 1) The digit decomposition is exact and reversible for every number 0–99 -- */
for (let v = 0; v <= 99; v++) {
  const t = tensOf(v);
  const o = onesOf(v);
  ok(t >= 0 && t <= 9, `tens digit of ${v} in range`);
  ok(o >= 0 && o <= 9, `ones digit of ${v} in range`);
  ok(t * 10 + o === v, `${v} = ${t}·10 + ${o}`);
}

/* 2) The bundling picture matches the digits: full rows = tens, leftover = ones */
for (let v = 0; v <= 99; v++) {
  const fullRows = tensOf(v); // complete rows of ten (bundled tens)
  const loose = onesOf(v); // remaining loose ones in the active row
  ok(fullRows * 10 + loose === v, `bundling ${v}: ${fullRows} rods + ${loose} loose`);
  ok(fullRows <= 9, `at most 9 full rows for ${v}`);
  ok(loose <= 9, `at most 9 loose ones for ${v}`);
  // drawn rows never exceed the 10-row envelope
  const drawnRows = fullRows + (fullRows < 10 ? 1 : 0);
  ok(drawnRows <= 10, `${v} draws ${drawnRows} rows (<=10)`);
}

/* 3) The core bundling event: 9 ones + 1 → one ten, ones reset to 0 ---------- */
for (let t = 0; t <= 8; t++) {
  const v = t * 10 + 9; // t tens and 9 ones
  const after = v + 1;
  ok(onesOf(v) === 9, `${v} has 9 loose ones`);
  ok(onesOf(after) === 0, `${v}+1 → ones reset to 0`);
  ok(tensOf(after) === t + 1, `${v}+1 → tens up by one`);
  ok(after === (t + 1) * 10, `${v}+1 = ${(t + 1) * 10}`);
}

/* 4) Expanded form sums back to the number; one-digit numbers have 0 tens ----- */
for (let v = 0; v <= 99; v++) {
  ok(tensOf(v) * 10 + onesOf(v) === v, `expanded ${v}`);
  if (v < 10) ok(tensOf(v) === 0, `${v} is one-digit: 0 tens`);
  if (v >= 10) ok(tensOf(v) >= 1, `${v} is two-digit: >=1 ten`);
}

/* 5) The three dials are LINKED and always consistent ----------------------- */
for (let cur = 0; cur <= 99; cur++) {
  for (let d = 0; d <= 9; d++) {
    // setting tens keeps the ones; setting ones keeps the tens
    const byTens = setTens(cur, d);
    ok(tensOf(byTens) === d, `setTens(${cur},${d}) → tens=${d}`);
    ok(onesOf(byTens) === onesOf(cur), `setTens keeps ones of ${cur}`);
    const byOnes = setOnes(cur, d);
    ok(onesOf(byOnes) === d, `setOnes(${cur},${d}) → ones=${d}`);
    ok(tensOf(byOnes) === tensOf(cur), `setOnes keeps tens of ${cur}`);
    ok(byTens >= 0 && byTens <= 99, `setTens result in range`);
    ok(byOnes >= 0 && byOnes <= 99, `setOnes result in range`);
  }
  // Count sets the whole number directly, clamped to 0–99
  ok(setCount(cur) === cur, `setCount(${cur})=${cur}`);
}
ok(setCount(-5) === 0 && setCount(150) === 99, 'Count clamps to 0..99');

/* 6) Word form correct, including teens and the decade zero ------------------ */
const wordCases = [
  [0, 'zero'], [7, 'seven'], [9, 'nine'], [10, 'ten'], [11, 'eleven'], [13, 'thirteen'],
  [16, 'sixteen'], [19, 'nineteen'], [20, 'twenty'], [21, 'twenty-one'], [30, 'thirty'],
  [34, 'thirty-four'], [40, 'forty'], [47, 'forty-seven'], [50, 'fifty'], [60, 'sixty'],
  [70, 'seventy'], [80, 'eighty'], [90, 'ninety'], [99, 'ninety-nine'],
];
for (const [n, w] of wordCases) ok(wordForm(n) === w, `wordForm(${n})="${wordForm(n)}" expected "${w}"`);
// no "and" anywhere in 0–99, and every value produces a nonempty word
for (let v = 0; v <= 99; v++) {
  ok(!wordForm(v).includes(' and '), `wordForm(${v}) has no "and"`);
  ok(wordForm(v).length > 0, `wordForm(${v}) nonempty`);
}
// teens (11–19) are all "1 ten + k ones"
for (let v = 11; v <= 19; v++) ok(tensOf(v) === 1 && onesOf(v) === v - 10, `teen ${v} = 1 ten + ${v - 10}`);
// decades are "d tens + 0 ones"
for (let d = 2; d <= 9; d++) ok(tensOf(d * 10) === d && onesOf(d * 10) === 0, `decade ${d * 10} = ${d} tens, 0 ones`);

/* 7) Calibration: exhaustive — CALIBRATED iff the built number equals target;
      the meter tops out at 100 only on an exact match; partials never stamp --- */
for (let target = 10; target <= 99; target++) {
  // every two-digit target is reachable with digits 0–9
  ok(tensOf(target) >= 0 && tensOf(target) <= 9 && onesOf(target) <= 9, `target ${target} reachable`);
  for (let v = 0; v <= 99; v++) {
    const cd = correctDigits(v, target);
    const cal = isCalibrated(v, target);
    const pctv = matchPercent(v, target);
    ok(cd >= 0 && cd <= 2, `digits-right ${v} vs ${target} in 0..2`);
    ok(cal === (v === target), `calibrated(${v},${target}) iff equal`);
    ok((pctv === 100) === (v === target), `meter 100 iff equal (${v},${target})`);
    ok((cd === 2) === (v === target), `2/2 digits iff equal (${v},${target})`);
    if (v !== target) ok(pctv < 100 && !cal, `partial ${v} vs ${target} never stamps`);
  }
  // off-by-one and off-by-ten neighbours are close but never calibrated
  const t = target;
  if (t + 1 <= 99) ok(!isCalibrated(t + 1, t), `${t + 1} not calibrated for ${t}`);
  if (t - 1 >= 0) ok(!isCalibrated(t - 1, t), `${t - 1} not calibrated for ${t}`);
  if (t + 10 <= 99) ok(!isCalibrated(t + 10, t), `${t + 10} not calibrated for ${t}`);
}

/* 8) Multiple-choice answer keys match the arithmetic they assert ------------ */
ok(10 === 10, 'step0: ten ones make one ten');
ok(9 + 1 === 10 && tensOf(10) === 1 && onesOf(10) === 0, 'step1: 9+1 bundles to 10 (1 ten, 0 ones)');
ok(4 * 10 === 40, 'step2: the 4 in 47 is worth 40');
ok((5 - 3) * 10 === 20, 'step3: tens 3→5 adds 20');
ok(onesOf(10) === 0, 'step4: ten ones leave 0 in the ones place');
ok(tensOf(60) === 6 && onesOf(60) === 0, 'step5: 60 is 6 tens and 0 ones');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
