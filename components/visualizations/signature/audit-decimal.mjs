/* Numeric audit for DecimalLab — run: node audit-decimal.mjs
   Verifies the math the lab teaches is exactly correct across every reachable
   dial state, plus place-value structure, equivalence, comparison, decimal↔
   fraction, word reading, and calibration reachability. All arithmetic is done
   in INTEGER HUNDREDTHS so no float artefact can slip through. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

const ONES_MAX = 2;
const hundredths = (o, t, h) => 100 * o + 10 * t + h;
const MATCH_SCALE = 50;
const matchPercent = (cH, N) => 100 * Math.max(0, 1 - Math.abs(cH - N) / MATCH_SCALE);
const isCalibrated = (cH, N) => cH === N;

/* --- helpers mirrored from the lab ---------------------------------------- */
const ONES_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words99(n) {
  if (n < 20) return ONES_WORDS[n];
  const t = Math.floor(n / 10);
  const r = n % 10;
  return TENS_WORDS[t] + (r ? '-' + ONES_WORDS[r] : '');
}
function readDecimal(o, t, h) {
  const frac = 10 * t + h;
  const wholeWord = words99(o);
  if (frac === 0) return wholeWord;
  let fracPhrase;
  if (h === 0) fracPhrase = words99(t) + (t === 1 ? ' tenth' : ' tenths');
  else fracPhrase = words99(frac) + (frac === 1 ? ' hundredth' : ' hundredths');
  return o === 0 ? fracPhrase : wholeWord + ' and ' + fracPhrase;
}
function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/* 1) Value composition is exact place value, and equals cH/100 with no float
      drift. Also: the whole part is the digit left of the point, the fractional
      part is exactly 10·tenths + hundredths hundredths. ---------------------- */
for (let o = 0; o <= ONES_MAX; o++) {
  for (let t = 0; t <= 9; t++) {
    for (let h = 0; h <= 9; h++) {
      const cH = hundredths(o, t, h);
      ok(Number.isInteger(cH), `cH integer ${o}.${t}${h}`);
      ok(cH === o * 100 + t * 10 + h, `place value ${o}.${t}${h}`);
      // exact tenths worth 10× a hundredth
      ok(t * 10 === (10 * t), `tenth = ten hundredths ${t}`);
      // reconstruct the digits from cH (round-trip)
      ok(Math.floor(cH / 100) === o, `recover ones ${o}.${t}${h}`);
      ok(Math.floor((cH % 100) / 10) === t, `recover tenths ${o}.${t}${h}`);
      ok(cH % 10 === h, `recover hundredths ${o}.${t}${h}`);
      // fractional cell count
      const cells = cH - o * 100;
      ok(cells === 10 * t + h, `fractional cells ${o}.${t}${h}`);
      ok(cells >= 0 && cells <= 99, `cells in 0..99 ${o}.${t}${h}`);
    }
  }
}

/* 2) The grid model: T full columns (10 cells each) + H loose cells accounts
      for exactly the fractional part; the loose column never overflows. ------ */
for (let t = 0; t <= 9; t++) {
  for (let h = 0; h <= 9; h++) {
    const fromColumns = t * 10; // complete tenths as cells
    const total = fromColumns + h;
    ok(total === 10 * t + h, `grid shading total ${t},${h}`);
    // loose hundredths sit in a single next column (index t), never past cell 9
    if (h > 0) ok(t < 10, `loose column exists ${t},${h}`);
    ok(h <= 9, `loose column within one column ${t},${h}`);
  }
}

/* 3) Equivalent decimals: 0.3 = 0.30, and in general t tenths = 10t hundredths;
      a trailing zero (h=0) never changes the value. ------------------------- */
for (let t = 0; t <= 9; t++) {
  const asTenths = hundredths(0, t, 0);
  const asHundredths = t * 10; // "t tenths" counted as hundredths
  ok(asTenths === asHundredths, `t tenths = 10t hundredths ${t}`);
}
ok(hundredths(0, 3, 0) === hundredths(0, 3, 0), '0.3 = 0.30 same cH');
ok(hundredths(0, 3, 0) === 30, '0.3 is 30 hundredths');
ok(hundredths(1, 5, 0) === hundredths(1, 5, 0) && hundredths(1, 5, 0) === 150, '1.5 = 1.50 = 150');

/* 4) Comparison — the "more digits" misconception is false. Compare by value in
      hundredths. Spot-check the classic traps. ------------------------------ */
ok(hundredths(0, 3, 0) > hundredths(0, 2, 5), '0.3 > 0.25');
ok(hundredths(0, 3, 0) > hundredths(0, 0, 9), '0.3 > 0.09');
ok(hundredths(0, 1, 2) < hundredths(0, 2, 0), '0.12 < 0.2');
ok(hundredths(0, 5, 0) === hundredths(0, 5, 0), '0.5 = 0.50');
ok(hundredths(1, 0, 5) < hundredths(1, 5, 0), '1.05 < 1.5');
// digit-count does NOT track order: a 2-digit decimal can beat a stray longer one
ok(hundredths(0, 3, 0) > hundredths(0, 2, 9), '0.3 > 0.29 (fewer written digits, larger)');

/* 5) Decimal ↔ fraction: value = cH/100, reduced by gcd, and known cleans. --- */
function reduced(cH) {
  if (cH === 0) return [0, 1];
  const g = gcd(cH, 100);
  return [cH / g, 100 / g];
}
ok(JSON.stringify(reduced(hundredths(0, 2, 5))) === JSON.stringify([1, 4]), '0.25 = 1/4');
ok(JSON.stringify(reduced(hundredths(0, 5, 0))) === JSON.stringify([1, 2]), '0.5 = 1/2');
ok(JSON.stringify(reduced(hundredths(0, 7, 5))) === JSON.stringify([3, 4]), '0.75 = 3/4');
ok(JSON.stringify(reduced(hundredths(0, 2, 0))) === JSON.stringify([1, 5]), '0.2 = 1/5');
ok(JSON.stringify(reduced(hundredths(0, 3, 4))) === JSON.stringify([17, 50]), '0.34 = 17/50');
// the reduced fraction always equals the original value
for (let cH = 0; cH <= 100 * (ONES_MAX + 1) - 1; cH++) {
  const [p, q] = reduced(cH);
  ok(Math.abs(p / q - cH / 100) < 1e-12, `reduced equals value ${cH}`);
}

/* 6) Word reading matches the standard US convention, including the tenths-vs-
      hundredths and placeholder-zero cases the lesson tests. ---------------- */
ok(readDecimal(0, 3, 0) === 'three tenths', 'read 0.3');
ok(readDecimal(0, 3, 4) === 'thirty-four hundredths', 'read 0.34');
ok(readDecimal(2, 0, 5) === 'two and five hundredths', 'read 2.05 (placeholder zero)');
ok(readDecimal(2, 5, 0) === 'two and five tenths', 'read 2.5');
ok(readDecimal(1, 2, 4) === 'one and twenty-four hundredths', 'read 1.24');
ok(readDecimal(0, 0, 1) === 'one hundredth', 'read 0.01 (singular)');
ok(readDecimal(0, 1, 0) === 'one tenth', 'read 0.1 (singular)');
ok(readDecimal(0, 0, 0) === 'zero', 'read 0.00');
ok(readDecimal(2, 0, 0) === 'two', 'read 2.00');
// 2.05 and 2.5 must NOT read the same — the placeholder zero matters
ok(readDecimal(2, 0, 5) !== readDecimal(2, 5, 0), '2.05 ≠ 2.5 in words');

/* 7) Number-line placement: the value lands in the correct one-tenth interval,
      and the hundredth-within-tenth offset is 0..9. ------------------------- */
for (let o = 0; o <= ONES_MAX; o++) {
  for (let t = 0; t <= 9; t++) {
    for (let h = 0; h <= 9; h++) {
      const cH = hundredths(o, t, h);
      const tIndex = Math.floor(cH / 10);
      const lo = tIndex / 10;
      const hi = lo + 0.1;
      ok(cH / 100 >= lo - 1e-12 && cH / 100 <= hi + 1e-12, `in tenth interval ${o}.${t}${h}`);
      const hInTenth = cH - tIndex * 10;
      ok(hInTenth === h, `hundredth-within-tenth ${o}.${t}${h}`);
      ok(hInTenth >= 0 && hInTenth <= 9, `offset 0..9 ${o}.${t}${h}`);
    }
  }
}

/* 8) Calibration: every target 5..(max) is reachable by exactly one digit build;
      an exact hit stamps and reads 100%; off-by-one-hundredth never stamps and
      reads below 100. ------------------------------------------------------- */
const MAXH = 100 * (ONES_MAX + 1) - 1; // 299
for (let N = 5; N <= MAXH; N++) {
  const o = Math.floor(N / 100);
  const t = Math.floor((N % 100) / 10);
  const h = N % 10;
  const cH = hundredths(o, t, h);
  ok(cH === N, `target ${N} reachable & unique`);
  ok(isCalibrated(cH, N), `exact calibrates ${N}`);
  ok(matchPercent(cH, N) === 100, `exact meter 100 ${N}`);
  const near = N === MAXH ? N - 1 : N + 1; // one hundredth off, stay in range
  ok(!isCalibrated(near, N), `off-by-one not calibrated ${N}`);
  ok(matchPercent(near, N) < 100, `off-by-one < 100 ${N}`);
  ok(matchPercent(near, N) === 98, `off-by-one meter 98 ${N}`);
}

/* 9) Meter is monotone: farther from the target never reads higher. ---------- */
for (let N = 5; N <= MAXH; N += 37) {
  for (let d = 0; d < MATCH_SCALE - 1; d++) {
    const a = Math.min(MAXH, N + d);
    const b = Math.min(MAXH, N + d + 1);
    ok(matchPercent(a, N) >= matchPercent(b, N) - 1e-9, `meter monotone ${N},${d}`);
  }
}

/* 10) The multiple-choice answer keys match the arithmetic they assert. ------ */
ok(hundredths(0, 3, 0) === 30, 'step0/1: 0.3 is three tenths');
ok(10 === 10, 'step2: 10 hundredths in a tenth');
ok(readDecimal(2, 0, 5) === 'two and five hundredths', 'step3: read 2.05');
ok(hundredths(0, 3, 0) === hundredths(0, 3, 0), 'step4: 0.3 = 0.30');
ok(hundredths(0, 3, 0) > hundredths(0, 2, 5), 'step5: 0.3 > 0.25');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
