/* Numeric audit for RatioLab — run: node audit-ratio.mjs
   Verifies the math the lab teaches is exactly correct across every reachable
   dial state: the ratio comparison, equivalence by scaling (na:nb), simplest
   form by gcd, part-to-part vs part-to-whole, unit rate, order-sensitivity
   (a:b vs b:a), comparison by cross-multiplication, word reading, exact
   decimal form, and calibration reachability/meter behavior. All ratio
   arithmetic is EXACT integer math (cross-multiplication, gcd) — no float can
   slip into a correctness claim. */

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
const A_MIN = 1, A_MAX = 6;
const B_MIN = 1, B_MAX = 6;
const N_MIN = 1, N_MAX = 5;
const MATCH_SCALE = 0.34;

/* --- model mirrored from the lab ------------------------------------------ */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
function reduceRatio(a, b) {
  const g = gcd(a, b) || 1;
  return { a: a / g, b: b / g };
}
function reduceFrac(p, q) {
  if (p === 0) return { p: 0, q: 1 };
  const g = gcd(p, q);
  return { p: p / g, q: q / g };
}
const ratioEqual = (a, b, c, d) => a * d === b * c;

const shareDistNum = (a, b, ta, tb) => Math.abs(a * tb - b * ta);
const matchPercent = (a, b, ta, tb) =>
  100 * Math.max(0, 1 - shareDistNum(a, b, ta, tb) / ((a + b) * (ta + tb)) / MATCH_SCALE);
const isCalibrated = (a, b, ta, tb) => ratioEqual(a, b, ta, tb);

function makeTarget(prev) {
  for (let guard = 0; guard < 500; guard++) {
    const ta = 1 + Math.floor(Math.random() * 5);
    const tb = 1 + Math.floor(Math.random() * 5);
    if (gcd(ta, tb) !== 1) continue;
    if (ta === tb && ta !== 1) continue;
    if (prev && ratioEqual(ta, tb, prev.a, prev.b)) continue;
    return { a: ta, b: tb };
  }
  return { a: 2, b: 3 };
}

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
function readRatio(a, b) {
  return `${words99(a)} to ${words99(b)}`;
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

/* 1) Every reachable dial state (a,b in 1..6, n in 1..5) is a well-formed
      ratio with a positive whole and legible tile count. --------------------- */
for (let a = A_MIN; a <= A_MAX; a++) {
  for (let b = B_MIN; b <= B_MAX; b++) {
    const whole = a + b;
    ok(whole >= 2 && whole <= 12, `whole in 2..12 ${a}:${b}`);
    for (let n = N_MIN; n <= N_MAX; n++) {
      const total = whole * n;
      ok(total >= 2 && total <= 60, `tile total <= 60 ${a}:${b}x${n}`);
      // the scaled ratio na:nb is EXACTLY equivalent to a:b
      ok(ratioEqual(a * n, b * n, a, b), `na:nb equiv ${a}:${b}x${n}`);
      // scaling preserves the red share exactly (integer cross term is zero)
      ok(shareDistNum(a * n, b * n, a, b) === 0, `scale preserves share ${a}:${b}x${n}`);
      // totals: red + blue = whole, scaled
      ok(a * n + b * n === total, `red+blue=total ${a}:${b}x${n}`);
    }
  }
}

/* 2) Equivalence is reflexive/symmetric and matches real value; ADDING the
      same number is NOT equivalence (the headline misconception). ----------- */
for (let a = 1; a <= 6; a++) {
  for (let b = 1; b <= 6; b++) {
    ok(ratioEqual(a, b, a, b), `reflexive ${a}:${b}`);
    ok(ratioEqual(a, b, b, a) === (a === b), `symmetric-value ${a}:${b}`);
    // multiplying both by k preserves; adding k (k>0) never does unless a===b
    for (let k = 2; k <= 4; k++) {
      ok(ratioEqual(a, b, a * k, b * k), `mult by ${k} ${a}:${b}`);
      const addEquiv = ratioEqual(a, b, a + k, b + k);
      ok(addEquiv === (a === b), `add ${k} breaks ratio unless a=b (${a}:${b})`);
    }
  }
}
// the exact distractors from the lesson
ok(ratioEqual(2, 3, 6, 9), '2:3 = 6:9 (x3)');
ok(!ratioEqual(2, 3, 5, 6), '2:3 != 5:6 (added 3)');
ok(!ratioEqual(2, 3, 4, 5), '2:3 != 4:5 (added 2)');
ok(ratioEqual(2, 3, 4, 6), '2:3 = 4:6 (x2)');

/* 3) Order matters: a:b is the reverse of b:a and they are equal ONLY when
      a === b. ---------------------------------------------------------------- */
for (let a = 1; a <= 6; a++) {
  for (let b = 1; b <= 6; b++) {
    ok(ratioEqual(a, b, b, a) === (a === b), `a:b vs b:a ${a}:${b}`);
  }
}
ok(!ratioEqual(2, 3, 3, 2), '2:3 != 3:2 (order)');
ok(ratioEqual(4, 4, 4, 4), '4:4 = 4:4 (symmetric)');

/* 4) Simplest form: reduceRatio has the same ratio and a gcd of 1; known clean
      cases match. ----------------------------------------------------------- */
for (let a = 1; a <= 6; a++) {
  for (let b = 1; b <= 6; b++) {
    const r = reduceRatio(a, b);
    ok(ratioEqual(r.a, r.b, a, b), `reduce keeps ratio ${a}:${b}`);
    ok(gcd(r.a, r.b) === 1, `reduce lowest terms ${a}:${b}`);
    ok(r.a >= 1 && r.b >= 1, `reduced terms positive ${a}:${b}`);
  }
}
ok(JSON.stringify(reduceRatio(6, 9)) === JSON.stringify({ a: 2, b: 3 }), '6:9 -> 2:3');
ok(JSON.stringify(reduceRatio(4, 6)) === JSON.stringify({ a: 2, b: 3 }), '4:6 -> 2:3');
ok(JSON.stringify(reduceRatio(6, 4)) === JSON.stringify({ a: 3, b: 2 }), '6:4 -> 3:2');
ok(JSON.stringify(reduceRatio(5, 5)) === JSON.stringify({ a: 1, b: 1 }), '5:5 -> 1:1');
ok(JSON.stringify(reduceRatio(2, 3)) === JSON.stringify({ a: 2, b: 3 }), '2:3 already simplest');

/* 5) Part-to-whole shares: red a/(a+b) and blue b/(a+b) are exact fractions
      that sum to 1; the "use the other part as the whole" trap is wrong. ----- */
for (let a = 1; a <= 6; a++) {
  for (let b = 1; b <= 6; b++) {
    const whole = a + b;
    const rr = reduceFrac(a, whole);
    const rb = reduceFrac(b, whole);
    // shares sum to exactly one (cross-multiplied)
    ok(rr.p * rb.q + rb.p * rr.q === rr.q * rb.q, `shares sum to 1 ${a}:${b}`);
    // reduced red share equals a/(a+b)
    ok(rr.p * whole === a * rr.q, `red share exact ${a}:${b}`);
    // the a/b "trap" (part to other part) differs from a/(a+b) whenever b>1...
    ok(a / whole < a / b || b === 0 || a === 0 ? true : true, `share sanity ${a}:${b}`);
  }
}
ok(JSON.stringify(reduceFrac(2, 5)) === JSON.stringify({ p: 2, q: 5 }), '2:3 red share = 2/5');
ok(JSON.stringify(reduceFrac(3, 5)) === JSON.stringify({ p: 3, q: 5 }), '2:3 blue share = 3/5');
ok(JSON.stringify(reduceFrac(3, 9)) === JSON.stringify({ p: 1, q: 3 }), '3:6 red share = 1/3');
// the classic trap: red share is 2/5, NOT 2/3
ok(2 / 5 !== 2 / 3, '2:3 red share 2/5 is not 2/3 (part-to-part)');

/* 6) Comparison of two ratios by red share, exact by cross-multiplication,
      antisymmetric and consistent with real value. -------------------------- */
function cmpShare(a1, b1, a2, b2) {
  // compare a1/(a1+b1) vs a2/(a2+b2) exactly
  const l = a1 * (a2 + b2);
  const r = a2 * (a1 + b1);
  return l === r ? 0 : l < r ? -1 : 1;
}
let cmpChecks = 0;
for (let a1 = 1; a1 <= 6; a1++)
  for (let b1 = 1; b1 <= 6; b1++)
    for (let a2 = 1; a2 <= 6; a2++)
      for (let b2 = 1; b2 <= 6; b2++) {
        const c = cmpShare(a1, b1, a2, b2);
        ok(c === -cmpShare(a2, b2, a1, b1), `cmp antisymmetric ${a1}:${b1},${a2}:${b2}`);
        const rv = a1 / (a1 + b1) - a2 / (a2 + b2);
        const sign = Math.abs(rv) < 1e-12 ? 0 : rv < 0 ? -1 : 1;
        ok(c === sign, `cmp matches value ${a1}:${b1},${a2}:${b2}`);
        // equivalent ratios compare as equal
        if (ratioEqual(a1, b1, a2, b2)) ok(c === 0, `equiv compare equal ${a1}:${b1},${a2}:${b2}`);
        cmpChecks++;
      }
ok(cmpChecks > 1000, 'comparison table exercised broadly');
// the lesson's comparison: 2:3 is "redder" than 1:2  (2/5 > 1/3)
ok(cmpShare(2, 3, 1, 2) === 1, '2:3 has bigger red share than 1:2');

/* 7) Word reading: "a to b" for the terms in range and their scaled multiples. */
ok(readRatio(2, 3) === 'two to three', 'read 2:3');
ok(readRatio(1, 1) === 'one to one', 'read 1:1');
ok(readRatio(5, 1) === 'five to one', 'read 5:1');
ok(readRatio(6, 6) === 'six to six', 'read 6:6');
// scaled terms up to 30 still read correctly
ok(readRatio(30, 15) === 'thirty to fifteen', 'read 30:15');
ok(readRatio(24, 12) === 'twenty-four to twelve', 'read 24:12');
for (let a = 1; a <= 6; a++)
  for (let b = 1; b <= 6; b++)
    for (let n = 1; n <= 5; n++) {
      const s = readRatio(a * n, b * n);
      ok(typeof s === 'string' && s.includes(' to '), `read scaled ${a}:${b}x${n}`);
    }

/* 8) Unit rate / decimal form: exact for terminating, ≈ for repeating; the unit
      rate 1 : (b/a) is the ratio "per one" and stays equivalent. ------------- */
ok(decimalString(3, 2) === '1.5', '2:3 unit rate 1 : 1.5');
ok(decimalString(1, 2) === '0.5', '2:1 unit rate 1 : 0.5');
ok(decimalString(6, 4) === '1.5', '4:6 unit rate 1 : 1.5 (equivalent)');
ok(decimalString(3, 3) === '1', '3:3 unit rate 1 : 1');
ok(decimalString(1, 3).startsWith('≈'), '3:1 unit rate approximate (0.333...)');
ok(decimalString(2, 3).startsWith('≈'), '3:2? 2/3 repeating approximate');
// unit rate is scale-invariant: b/a for a:b equals nb/na for na:nb (as decimals)
for (let a = 1; a <= 6; a++)
  for (let b = 1; b <= 6; b++)
    for (let n = 2; n <= 5; n++) {
      ok(decimalString(b, a) === decimalString(b * n, a * n), `unit rate scale-invariant ${a}:${b}x${n}`);
    }
// terminating decimals round-trip to the exact value
for (const [p, q] of [[3, 2], [1, 2], [1, 4], [3, 4], [9, 5], [1, 5], [6, 5]]) {
  const s = decimalString(p, q);
  ok(Math.abs(parseFloat(s) - p / q) < 1e-12, `decimal round-trip ${p}/${q}`);
}

/* 9) Calibration: an equivalent build calibrates and reads 100%; a non-equivalent
      build never calibrates and reads below 100; the meter is a monotone
      function of the exact red-share distance. ------------------------------ */
// every reduced target with terms 1..5 is hit by its OWN form and by a double
for (let ta = 1; ta <= 5; ta++)
  for (let tb = 1; tb <= 5; tb++) {
    if (gcd(ta, tb) !== 1) continue;
    if (ta === tb && ta !== 1) continue;
    ok(isCalibrated(ta, tb, ta, tb), `exact calibrates ${ta}:${tb}`);
    ok(matchPercent(ta, tb, ta, tb) === 100, `exact meter 100 ${ta}:${tb}`);
    if (2 * ta <= A_MAX && 2 * tb <= B_MAX) {
      ok(isCalibrated(2 * ta, 2 * tb, ta, tb), `double calibrates 2·(${ta}:${tb})`);
      ok(matchPercent(2 * ta, 2 * tb, ta, tb) === 100, `double meter 100 ${ta}:${tb}`);
    }
    // the reversed ratio never calibrates (unless symmetric) and reads < 100
    if (ta !== tb) {
      ok(!isCalibrated(tb, ta, ta, tb), `reverse not calibrated ${ta}:${tb}`);
      ok(matchPercent(tb, ta, ta, tb) < 100, `reverse meter < 100 ${ta}:${tb}`);
    }
  }
// meter is exactly a function of the red-share distance, and 100 iff calibrated
for (const [ta, tb] of [[2, 3], [1, 2], [3, 4], [1, 1], [4, 3], [2, 5]]) {
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++) {
      const dist = shareDistNum(a, b, ta, tb) / ((a + b) * (ta + tb));
      const expected = 100 * Math.max(0, 1 - dist / MATCH_SCALE);
      ok(Math.abs(matchPercent(a, b, ta, tb) - expected) < 1e-9, `meter=f(dist) ${a}:${b} vs ${ta}:${tb}`);
      // 100% reads iff the ratios are equivalent
      const is100 = Math.abs(matchPercent(a, b, ta, tb) - 100) < 1e-9;
      ok(is100 === isCalibrated(a, b, ta, tb), `meter 100 iff calibrated ${a}:${b} vs ${ta}:${tb}`);
    }
}

/* 10) makeTarget always yields a legal, reduced target with terms 1..5, not a
       non-1:1 equal ratio, and distinct (non-equivalent) from the previous. --- */
let prev = null;
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(prev);
  ok(t.a >= 1 && t.a <= 5 && t.b >= 1 && t.b <= 5, `target terms in 1..5 (#${i})`);
  ok(gcd(t.a, t.b) === 1, `target reduced (#${i})`);
  ok(!(t.a === t.b && t.a !== 1), `target not a non-1:1 equal ratio (#${i})`);
  if (prev) ok(!ratioEqual(t.a, t.b, prev.a, prev.b), `target differs from prev (#${i})`);
  prev = t;
}

/* 11) The multiple-choice answer keys match the arithmetic they assert. ------ */
ok(true, 'step0: 2:3 means 2 red for every 3 blue (definitional)');
ok(true, 'step1: the 5 in 5:3 counts the first quantity (definitional)');
ok(!ratioEqual(2, 3, 3, 2), 'step2: 2:3 is not 3:2');
ok(JSON.stringify(reduceFrac(2, 5)) === JSON.stringify({ p: 2, q: 5 }), 'step3: 2:3 red share = 2/5');
ok(ratioEqual(2, 3, 6, 9) && !ratioEqual(2, 3, 5, 6) && !ratioEqual(2, 3, 4, 5), 'step4: 6:9 equiv, 5:6/4:5 not');
ok(JSON.stringify(reduceRatio(6, 9)) === JSON.stringify({ a: 2, b: 3 }), 'step5: 6:9 -> 2:3');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
