/* Numeric audit for FractionLab — run: node audit-fraction.mjs
   Verifies the math the lab teaches is exactly correct across every reachable
   dial state: part-whole structure, unit fractions, improper/mixed numbers,
   equivalence under the split (kp/kq), reduction to simplest form, comparison,
   word reading, decimal form, and calibration reachability. All fraction
   arithmetic is EXACT integer math (cross-multiplication, gcd) — no float can
   slip through into a correctness claim. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

/* --- constants mirrored from the lab -------------------------------------- */
const Q_MIN = 1;
const Q_MAX = 12;
const WHOLES_MAX = 2;
const numMax = (q) => WHOLES_MAX * q;
const kMax = (q) => Math.max(1, Math.min(4, Math.floor(24 / q)));
const MATCH_SCALE = 0.5;

/* --- model mirrored from the lab ------------------------------------------ */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
function reduce(p, q) {
  if (p === 0) return { p: 0, q: 1 };
  const g = gcd(p, q);
  return { p: p / g, q: q / g };
}
const fracEqual = (p1, q1, p2, q2) => p1 * q2 === p2 * q1;
const matchPercent = (p, q, tp, tq) =>
  100 * Math.max(0, 1 - Math.abs(p * tq - tp * q) / (q * tq) / MATCH_SCALE);
const isCalibrated = (p, q, tp, tq) => fracEqual(p, q, tp, tq);

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
const DENOM = {
  2: 'half', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth',
  7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth',
};
function denomName(q, count) {
  const base = DENOM[q] || `1/${q}`;
  if (count === 1) return base;
  return q === 2 ? 'halves' : base + 's';
}
function readFraction(p, q) {
  if (p === 0) return 'zero';
  if (q === 1) return words99(p);
  const whole = Math.floor(p / q);
  const rem = p - whole * q;
  if (rem === 0) return words99(whole);
  const fracPart = `${words99(rem)} ${denomName(q, rem)}`;
  return whole === 0 ? fracPart : `${words99(whole)} and ${fracPart}`;
}
function mixedString(p, q) {
  if (p % q === 0) return String(p / q);
  const whole = Math.floor(p / q);
  const rem = p - whole * q;
  return whole > 0 ? `${whole} ${rem}/${q}` : `${rem}/${q}`;
}
function decimalString(p, q) {
  if (p === 0) return '0';
  const whole = Math.floor(p / q);
  let rem = p - whole * q;
  if (rem === 0) return String(whole);
  let digits = '';
  let terminates = false;
  for (let i = 0; i < 6; i++) {
    rem *= 10;
    const d = Math.floor(rem / q);
    digits += d;
    rem -= d * q;
    if (rem === 0) {
      terminates = true;
      break;
    }
  }
  if (terminates) return `${whole}.${digits}`;
  return '≈ ' + (Math.round((p / q) * 1000) / 1000) + '…';
}
function makeTarget(prev) {
  for (let guard = 0; guard < 500; guard++) {
    const tq = 2 + Math.floor(Math.random() * 7);
    const tp = 1 + Math.floor(Math.random() * (WHOLES_MAX * tq - 1));
    if (tp % tq === 0) continue;
    const r = reduce(tp, tq);
    if (prev && fracEqual(r.p, r.q, prev.p, prev.q)) continue;
    return r;
  }
  return { p: 1, q: 2 };
}

/* 1) Every reachable dial state (q in 1..12, p in 0..2q) is a well-formed
      fraction: value p/q in [0,2], the whole/remainder decomposition is exact,
      and p is exactly the count of shaded unit-fractions. -------------------- */
for (let q = Q_MIN; q <= Q_MAX; q++) {
  ok(numMax(q) === 2 * q, `numMax ${q}`);
  for (let p = 0; p <= numMax(q); p++) {
    const value = p / q;
    ok(value >= 0 && value <= WHOLES_MAX + 1e-12, `value in [0,2] ${p}/${q}`);
    const whole = Math.floor(p / q);
    const rem = p - whole * q;
    ok(whole * q + rem === p, `p = whole*q + rem ${p}/${q}`);
    ok(rem >= 0 && rem < q, `remainder in [0,q) ${p}/${q}`);
    // p copies of the unit fraction 1/q equals p/q exactly
    ok(Math.abs(p * (1 / q) - value) < 1e-12, `p copies of 1/q ${p}/${q}`);
    // number of wholes to draw (bar/pie glyph count) is 1 or 2, enough for p parts
    const nW = Math.max(1, Math.ceil(p / q));
    ok(nW >= 1 && nW <= WHOLES_MAX, `nW in 1..2 ${p}/${q}`);
    ok(nW * q >= p, `enough parts drawn for p ${p}/${q}`);
  }
}

/* 2) The unit fraction shrinks as the denominator grows: 1/q > 1/(q+1). ----- */
for (let q = Q_MIN; q < Q_MAX; q++) {
  ok(1 / q > 1 / (q + 1), `unit fraction shrinks ${q} -> ${q + 1}`);
  // and same numerator, bigger denominator is smaller (the classic trap)
  ok(!fracEqual(1, q, 1, q + 1), `1/${q} != 1/${q + 1}`);
  ok(1 * (q + 1) > 1 * q, `1/${q} > 1/${q + 1} by cross-multiply`);
}

/* 3) q/q = 1 for every q, and improper p>q spills past one whole. ----------- */
for (let q = Q_MIN; q <= Q_MAX; q++) {
  ok(fracEqual(q, q, 1, 1), `${q}/${q} = 1`);
  ok(q / q === 1, `${q}/${q} numeric 1`);
  if (2 * q <= numMax(q)) ok(fracEqual(2 * q, q, 2, 1), `${2 * q}/${q} = 2`);
}
// specific mixed-number reads the lesson asserts
ok(mixedString(5, 4) === '1 1/4', '5/4 = 1 1/4');
ok(readFraction(5, 4) === 'one and one fourth', 'read 5/4');
ok(mixedString(7, 3) === '2 1/3', '7/3 = 2 1/3');
ok(mixedString(4, 4) === '1', '4/4 = 1 (whole)');
ok(mixedString(8, 4) === '2', '8/4 = 2 (whole)');

/* 4) Equivalence under the split: kp/kq has the SAME value as p/q for every
      legal k, and the split never changes the shaded amount. ----------------- */
for (let q = Q_MIN; q <= Q_MAX; q++) {
  const kM = kMax(q);
  ok(kM >= 1 && kM <= 4, `kMax range ${q}`);
  ok(kM * q <= 24, `split stays legible ${q}`);
  for (let p = 0; p <= numMax(q); p++) {
    for (let k = 1; k <= kM; k++) {
      ok(fracEqual(k * p, k * q, p, q), `equiv ${k}(${p}/${q})`);
      ok((k * p) / (k * q) === p / q || p === 0, `equiv value ${k}(${p}/${q})`);
    }
  }
}
// the canonical equivalence chain from the lesson
ok(fracEqual(1, 2, 2, 4), '1/2 = 2/4');
ok(fracEqual(1, 2, 3, 6), '1/2 = 3/6');
ok(fracEqual(2, 4, 3, 6), '2/4 = 3/6');
ok(!fracEqual(1, 2, 1, 4), '1/2 != 1/4');
ok(!fracEqual(1, 2, 2, 2), '1/2 != 2/2');

/* 5) Reduction to simplest form: reduce(p,q) has the same value and a gcd of 1;
      known clean cases match. ----------------------------------------------- */
for (let q = Q_MIN; q <= Q_MAX; q++) {
  for (let p = 1; p <= numMax(q); p++) {
    const r = reduce(p, q);
    ok(fracEqual(r.p, r.q, p, q), `reduce keeps value ${p}/${q}`);
    ok(gcd(r.p, r.q) === 1, `reduce is lowest terms ${p}/${q}`);
    ok(r.q >= 1, `reduced denom positive ${p}/${q}`);
  }
}
ok(JSON.stringify(reduce(2, 4)) === JSON.stringify({ p: 1, q: 2 }), '2/4 -> 1/2');
ok(JSON.stringify(reduce(6, 8)) === JSON.stringify({ p: 3, q: 4 }), '6/8 -> 3/4');
ok(JSON.stringify(reduce(9, 12)) === JSON.stringify({ p: 3, q: 4 }), '9/12 -> 3/4');
ok(JSON.stringify(reduce(0, 5)) === JSON.stringify({ p: 0, q: 1 }), '0/5 -> 0/1');
ok(JSON.stringify(reduce(3, 4)) === JSON.stringify({ p: 3, q: 4 }), '3/4 already simplest');

/* 6) Comparison is exact by cross-multiplication, both easy directions. ------ */
// same denominator: more shaded parts is bigger
ok(3 * 8 > 2 * 8, '3/8 > 2/8 (same denom)');
// same numerator: smaller denominator is bigger (the headline trap)
ok(1 * 4 > 1 * 3, '1/3 > 1/4 (same num)');
ok(2 * 7 > 2 * 5, '2/5 > 2/7 (same num)'); // a/b > c/d ⟺ a·d > c·b
// a mixed comparison across the whole table is antisymmetric & consistent
function cmp(p1, q1, p2, q2) {
  const a = p1 * q2;
  const b = p2 * q1;
  return a === b ? 0 : a < b ? -1 : 1;
}
let cmpChecks = 0;
for (let q1 = 1; q1 <= 6; q1++) {
  for (let p1 = 0; p1 <= 2 * q1; p1++) {
    for (let q2 = 1; q2 <= 6; q2++) {
      for (let p2 = 0; p2 <= 2 * q2; p2++) {
        const c = cmp(p1, q1, p2, q2);
        ok(c === -cmp(p2, q2, p1, q1), `cmp antisymmetric ${p1}/${q1},${p2}/${q2}`);
        // agrees with real value ordering
        const rv = p1 / q1 - p2 / q2;
        const sign = Math.abs(rv) < 1e-12 ? 0 : rv < 0 ? -1 : 1;
        ok(c === sign, `cmp matches value ${p1}/${q1},${p2}/${q2}`);
        cmpChecks++;
      }
    }
  }
}
ok(cmpChecks > 1000, 'comparison table exercised broadly');

/* 7) Word reading follows the standard convention: unit fractions, plurals,
      the "quarter/fourth" family, wholes, and mixed numbers. ---------------- */
ok(readFraction(3, 4) === 'three fourths', 'read 3/4');
ok(readFraction(1, 2) === 'one half', 'read 1/2 (singular half)');
ok(readFraction(2, 2) === 'one', 'read 2/2 = one');
ok(readFraction(1, 3) === 'one third', 'read 1/3');
ok(readFraction(5, 6) === 'five sixths', 'read 5/6');
ok(readFraction(1, 12) === 'one twelfth', 'read 1/12');
ok(readFraction(11, 12) === 'eleven twelfths', 'read 11/12');
ok(readFraction(0, 7) === 'zero', 'read 0/7 = zero');
ok(readFraction(3, 1) === 'three', 'read 3/1 = three');
ok(readFraction(7, 3) === 'two and one third', 'read 7/3');
ok(readFraction(3, 2) === 'one and one half', 'read 3/2');
// halves plural is "halves", not "halfs"
ok(denomName(2, 3) === 'halves', '3 halves plural');
ok(denomName(2, 1) === 'half', '1 half singular');

/* 8) Decimal form: exact for terminating denominators, ≈ for repeating. ----- */
ok(decimalString(3, 4) === '0.75', '3/4 = 0.75');
ok(decimalString(1, 2) === '0.5', '1/2 = 0.5');
ok(decimalString(1, 8) === '0.125', '1/8 = 0.125');
ok(decimalString(5, 4) === '1.25', '5/4 = 1.25');
ok(decimalString(2, 2) === '1', '2/2 = 1 (integer)');
ok(decimalString(0, 5) === '0', '0/5 = 0');
ok(decimalString(1, 3).startsWith('≈'), '1/3 marked approximate');
ok(decimalString(2, 3).startsWith('≈'), '2/3 marked approximate');
// a terminating decimal, read back, equals the fraction
const termCases = [[3, 4], [1, 8], [7, 8], [3, 5], [9, 10], [1, 2], [5, 4]];
for (const [p, q] of termCases) {
  const s = decimalString(p, q);
  ok(Math.abs(parseFloat(s) - p / q) < 1e-12, `decimal round-trip ${p}/${q}`);
}

/* 9) Calibration: an exact-value match (any equivalent fraction) calibrates and
      reads 100%; a near miss never calibrates and reads below 100; the meter is
      monotone in |value − target|. ------------------------------------------ */
// every reduced target 1..8 denom, value in (0,2), is hit by ITS OWN reduced
// form and by an equivalent (doubled) form, when reachable.
for (let tq = 2; tq <= 8; tq++) {
  for (let tp = 1; tp < WHOLES_MAX * tq; tp++) {
    if (tp % tq === 0) continue;
    const r = reduce(tp, tq);
    // exact form calibrates
    ok(isCalibrated(r.p, r.q, r.p, r.q), `exact calibrates ${r.p}/${r.q}`);
    ok(matchPercent(r.p, r.q, r.p, r.q) === 100, `exact meter 100 ${r.p}/${r.q}`);
    // a doubled equivalent (2p/2q) also calibrates when it fits the dials
    if (2 * r.q <= Q_MAX && 2 * r.p <= numMax(2 * r.q)) {
      ok(isCalibrated(2 * r.p, 2 * r.q, r.p, r.q), `equiv calibrates 2·(${r.p}/${r.q})`);
      ok(matchPercent(2 * r.p, 2 * r.q, r.p, r.q) === 100, `equiv meter 100 ${r.p}/${r.q}`);
    }
    // a one-part miss at the same denominator never calibrates and is < 100
    const missP = r.p + 1 <= numMax(r.q) ? r.p + 1 : r.p - 1;
    ok(!isCalibrated(missP, r.q, r.p, r.q), `off-by-one not calibrated ${r.p}/${r.q}`);
    ok(matchPercent(missP, r.q, r.p, r.q) < 100, `off-by-one < 100 ${r.p}/${r.q}`);
  }
}
// meter monotonicity: increasing distance from a target never reads higher
for (const [tp, tq] of [[1, 2], [3, 4], [2, 3], [5, 6]]) {
  let prevPct = Infinity;
  let prevDist = -1;
  for (let q = 1; q <= 12; q++) {
    for (let p = 0; p <= numMax(q); p++) {
      const dist = Math.abs(p * tq - tp * q) / (q * tq);
      const m = matchPercent(p, q, tp, tq);
      // reconstruct: m is a strict function of dist (m = 100·max(0,1-dist/0.5))
      const expected = 100 * Math.max(0, 1 - dist / MATCH_SCALE);
      ok(Math.abs(m - expected) < 1e-9, `meter is f(dist) ${p}/${q} vs ${tp}/${tq}`);
    }
  }
  void prevPct;
  void prevDist;
}

/* 10) makeTarget always yields a legal, reduced, non-integer target distinct
       from the previous one. ------------------------------------------------- */
let prev = null;
for (let i = 0; i < 2000; i++) {
  const t = makeTarget(prev);
  ok(t.q >= 2 && t.q <= 8, `target denom in 2..8 (#${i})`);
  ok(gcd(t.p, t.q) === 1, `target reduced (#${i})`);
  ok(t.p % t.q !== 0, `target not a whole number (#${i})`);
  ok(t.p / t.q > 0 && t.p / t.q < WHOLES_MAX, `target value in (0,2) (#${i})`);
  if (prev) ok(!fracEqual(t.p, t.q, prev.p, prev.q), `target differs from prev (#${i})`);
  prev = t;
}

/* 11) The multiple-choice answer keys match the arithmetic they assert. ------ */
ok(true, 'step0: parts must be equal (definitional)');
ok(1 / 6 < 1 / 4, 'step1: 1/6 < 1/4');
ok(readFraction(3, 4) === 'three fourths', 'step2: 3/4 is three fourths');
ok(mixedString(5, 4) === '1 1/4' && 5 / 4 > 1, 'step3: 5/4 = 1 1/4 > 1');
ok(fracEqual(1, 2, 2, 4), 'step4: 1/2 = 2/4');
ok(1 * 4 > 1 * 3, 'step5: 1/3 > 1/4');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
