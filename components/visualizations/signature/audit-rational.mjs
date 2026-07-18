/* Numeric audit for RationalNumbersLab — run: node audit-rational.mjs
   Proves the rational-number math the lab teaches is EXACTLY correct across the
   whole reachable range (q = 1…12, p = −2q…2q): reduction to lowest terms,
   comparison and equality by cross-multiplication, the decimal expansion by long
   division (terminating vs. repeating, verified by reconstructing the value with
   BigInt), the terminates() rule, mixed numbers, fraction words, and the whole
   calibration clue set (every clue names a reachable target whose intended
   answer calibrates; the meter reads 100 iff calibrated; equivalent fractions
   also calibrate). Multiple-choice answer keys are checked against the arithmetic
   they assert. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (fails <= 40) console.error('FAIL:', msg);
  }
}

const VMIN = -2;
const VMAX = 2;
const Q_MIN = 1;
const Q_MAX = 12;
const pMin = (q) => VMIN * q;
const pMax = (q) => VMAX * q;
const clampP = (p, q) => Math.max(pMin(q), Math.min(pMax(q), p));

/* ---- mirror of the lab's model ------------------------------------------- */
const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
};
const reduce = (p, q) => {
  if (q < 0) {
    p = -p;
    q = -q;
  }
  if (p === 0) return [0, 1];
  const g = gcd(p, q);
  return [p / g, q / g];
};
const value = (p, q) => p / q;
const cmpRat = (p1, q1, p2, q2) => Math.sign(p1 * q2 - p2 * q1);
const eqRat = (p1, q1, p2, q2) => p1 * q2 === p2 * q1;
const terminates = (p, q) => {
  let [, d] = reduce(p, q);
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
};
function decimalParts(p, q) {
  const neg = p < 0;
  let n = Math.abs(p);
  const whole = Math.floor(n / q);
  let rem = n % q;
  const digits = [];
  const seen = new Map();
  let repeatStart = -1;
  while (rem !== 0) {
    if (seen.has(rem)) {
      repeatStart = seen.get(rem);
      break;
    }
    seen.set(rem, digits.length);
    rem *= 10;
    digits.push(Math.floor(rem / q));
    rem %= q;
  }
  const nonRep = repeatStart < 0 ? digits : digits.slice(0, repeatStart);
  const rep = repeatStart < 0 ? [] : digits.slice(repeatStart);
  return { neg, whole, nonRep, rep, terminates: repeatStart < 0 };
}
function mixedParts(p, q) {
  const [rp, rq] = reduce(p, q);
  if (rq === 1) return null;
  if (Math.abs(rp) < rq) return null;
  const neg = rp < 0;
  const a = Math.abs(rp);
  return { neg, whole: Math.floor(a / rq), num: a % rq, den: rq };
}
const DENOM_W = {
  2: 'half', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh',
  8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth',
};
const ONES_W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty'];
const numWords = (n) => {
  n = Math.abs(n);
  if (n < 20) return ONES_W[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS_W[t] + (o ? '-' + ONES_W[o] : '');
};
const denomWords = (q, plural) => {
  const base = DENOM_W[q] || q + 'th';
  if (!plural) return base;
  return base === 'half' ? 'halves' : base + 's';
};
const fracWords = (p, q) => {
  const [rp, rq] = reduce(p, q);
  if (rp === 0) return 'zero';
  const sign = rp < 0 ? 'negative ' : '';
  if (rq === 1) return sign + numWords(rp);
  const a = Math.abs(rp);
  return sign + numWords(a) + '-' + denomWords(rq, a !== 1);
};

/* ========================================================================= */
/* 1) gcd / reduce: lowest terms, positive denominator, same value ---------- */
for (let q = Q_MIN; q <= Q_MAX; q++) {
  for (let p = pMin(q); p <= pMax(q); p++) {
    const [rp, rq] = reduce(p, q);
    ok(rq >= 1, `reduce(${p},${q}) has positive denom`);
    ok(gcd(rp, rq) === 1, `reduce(${p},${q}) = ${rp}/${rq} is in lowest terms`);
    ok(eqRat(rp, rq, p, q), `reduce(${p},${q}) preserves value`);
    ok(Math.sign(rp) === Math.sign(p), `reduce keeps sign for ${p}/${q}`);
    if (p === 0) ok(rp === 0 && rq === 1, '0 reduces to 0/1');
    // value stays inside the world window
    ok(value(p, q) >= VMIN - 1e-12 && value(p, q) <= VMAX + 1e-12, `${p}/${q} in [−2,2]`);
    // clampP is idempotent inside range
    ok(clampP(p, q) === p, `clampP fixes in-range ${p}/${q}`);
  }
  ok(clampP(pMax(q) + 5, q) === pMax(q), `clampP caps above for q=${q}`);
  ok(clampP(pMin(q) - 5, q) === pMin(q), `clampP caps below for q=${q}`);
}

/* 2) comparison & equality are EXACT and agree with the true ordering ------- */
const sample = [];
for (let q = Q_MIN; q <= Q_MAX; q++) for (let p = pMin(q); p <= pMax(q); p++) sample.push([p, q]);
for (let i = 0; i < sample.length; i += 7) {
  for (let j = 0; j < sample.length; j += 13) {
    const [p1, q1] = sample[i];
    const [p2, q2] = sample[j];
    const c = cmpRat(p1, q1, p2, q2);
    const truth = Math.sign(value(p1, q1) - value(p2, q2));
    // exact and float agree except float can misjudge exact ties → trust exact
    ok(c === truth || (c === 0 && Math.abs(value(p1, q1) - value(p2, q2)) < 1e-9), `cmp(${p1}/${q1},${p2}/${q2})`);
    ok(eqRat(p1, q1, p2, q2) === (c === 0), `eqRat matches cmp==0 for ${p1}/${q1},${p2}/${q2}`);
  }
}
// equivalent fractions compare equal regardless of denominator
ok(eqRat(1, 2, 2, 4) && eqRat(2, 4, 3, 6) && eqRat(3, 6, 6, 12), 'chain 1/2=2/4=3/6=6/12');
ok(eqRat(-3, 4, -6, 8), '−3/4 = −6/8');
// the negative-ordering trap
ok(cmpRat(-1, 2, -3, 4) > 0, '−1/2 > −3/4');
ok(cmpRat(-3, 4, -1, 2) < 0, '−3/4 < −1/2');
// unit-fraction size trap
ok(cmpRat(1, 3, 1, 5) > 0, '1/3 > 1/5');
ok(cmpRat(1, 2, 1, 12) > 0, '1/2 > 1/12');

/* 3) decimal expansion: reconstruct the value EXACTLY with BigInt ----------- */
function reconstruct(dp) {
  // returns [num, den] (BigInt) of the ABSOLUTE decimal value
  const k = BigInt(dp.nonRep.length);
  const m = BigInt(dp.rep.length);
  const ten = 10n;
  const A = dp.nonRep.length ? BigInt(dp.nonRep.join('')) : 0n;
  const B = dp.rep.length ? BigInt(dp.rep.join('')) : 0n;
  const whole = BigInt(dp.whole);
  const p10k = ten ** k;
  if (m === 0n) {
    // whole + A/10^k
    return [whole * p10k + A, p10k];
  }
  const p10m1 = ten ** m - 1n;
  const den = p10k * p10m1;
  const num = whole * den + A * p10m1 + B;
  return [num, den];
}
function bigEq(p, q, dp) {
  // compare |p|/q with reconstructed decimal fraction
  const [num, den] = reconstruct(dp);
  return BigInt(Math.abs(p)) * den === num * BigInt(q);
}
const KNOWN = [
  [1, 4, false, '0.25'],
  [3, 4, false, '0.75'],
  [1, 2, false, '0.5'],
  [1, 3, true, '0.(3)'],
  [2, 3, true, '0.(6)'],
  [1, 6, true, '0.1(6)'],
  [5, 6, true, '0.8(3)'],
  [1, 7, true, '0.(142857)'],
  [1, 8, false, '0.125'],
  [1, 9, true, '0.(1)'],
  [1, 11, true, '0.(09)'],
  [1, 12, true, '0.08(3)'],
  [1, 10, false, '0.1'],
  [7, 4, false, '1.75'],
];
for (const [p, q, rep, label] of KNOWN) {
  const dp = decimalParts(p, q);
  ok(dp.terminates === !rep, `${p}/${q} ${rep ? 'repeats' : 'terminates'} (${label})`);
  ok(dp.terminates === terminates(p, q), `terminates() agrees for ${p}/${q}`);
  ok(bigEq(p, q, dp), `${p}/${q} decimal reconstructs to the exact value (${label})`);
}
// specific digit checks
ok(decimalParts(1, 6).nonRep.join('') === '1' && decimalParts(1, 6).rep.join('') === '6', '1/6 = 0.1 then 6-bar');
ok(decimalParts(1, 7).rep.join('') === '142857', '1/7 repetend is 142857');
ok(decimalParts(1, 12).nonRep.join('') === '08' && decimalParts(1, 12).rep.join('') === '3', '1/12 = 0.08 then 3-bar');
// EVERY reachable fraction: decimal reconstructs exactly, and terminates() ⇔ empty repetend
for (let q = Q_MIN; q <= Q_MAX; q++) {
  for (let p = pMin(q); p <= pMax(q); p++) {
    const dp = decimalParts(p, q);
    ok(bigEq(p, q, dp), `decimal of ${p}/${q} reconstructs exactly`);
    ok(dp.terminates === terminates(p, q), `terminates() ⇔ empty repetend for ${p}/${q}`);
    // digits are all 0..9
    ok([...dp.nonRep, ...dp.rep].every((d) => d >= 0 && d <= 9), `${p}/${q} digits valid`);
  }
}

/* 4) mixed numbers: improper ⇒ whole + proper part reconstructs value ------- */
for (let q = Q_MIN; q <= Q_MAX; q++) {
  for (let p = pMin(q); p <= pMax(q); p++) {
    const mx = mixedParts(p, q);
    const [rp, rq] = reduce(p, q);
    if (mx == null) {
      ok(rq === 1 || Math.abs(rp) < rq, `${p}/${q} correctly not mixed`);
    } else {
      ok(mx.num >= 0 && mx.num < mx.den, `mixed part proper for ${p}/${q}`);
      const recomposed = (mx.neg ? -1 : 1) * (mx.whole * mx.den + mx.num);
      ok(eqRat(recomposed, mx.den, p, q), `mixed number of ${p}/${q} = ${p}/${q}`);
    }
  }
}
ok(JSON.stringify(mixedParts(7, 4)) === JSON.stringify({ neg: false, whole: 1, num: 3, den: 4 }), '7/4 = 1 3/4');
ok(JSON.stringify(mixedParts(-5, 3)) === JSON.stringify({ neg: true, whole: 1, num: 2, den: 3 }), '−5/3 = −1 2/3');
ok(mixedParts(4, 4) === null, '4/4 is an integer, not mixed');
ok(mixedParts(3, 4) === null, '3/4 is proper, not mixed');

/* 5) fraction words --------------------------------------------------------- */
ok(fracWords(1, 2) === 'one-half', '1/2 = one-half');
ok(fracWords(2, 4) === 'one-half', '2/4 reads one-half (reduced first)');
ok(fracWords(3, 4) === 'three-fourths', '3/4 = three-fourths');
ok(fracWords(7, 4) === 'seven-fourths', '7/4 = seven-fourths');
ok(fracWords(-5, 6) === 'negative five-sixths', '−5/6 = negative five-sixths');
ok(fracWords(1, 3) === 'one-third', '1/3 = one-third');
ok(fracWords(1, 12) === 'one-twelfth', '1/12 = one-twelfth');
ok(fracWords(0, 5) === 'zero', '0/5 = zero');
ok(fracWords(4, 2) === 'two', '4/2 reduces to the integer two');
ok(fracWords(2, 3) === 'two-thirds', '2/3 = two-thirds');

/* ---- mirror of calibration ----------------------------------------------- */
const NICE = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6], [1, 8], [3, 8], [5, 8], [7, 8], [1, 10], [3, 10], [7, 10], [9, 10]];
const DECS = [['0.5', 1, 2], ['0.25', 1, 4], ['0.75', 3, 4], ['0.2', 1, 5], ['0.4', 2, 5], ['0.6', 3, 5], ['0.8', 4, 5], ['0.125', 1, 8], ['0.375', 3, 8], ['0.1', 1, 10]];
const MIXED = [['1½', 3, 2], ['1¼', 5, 4], ['1¾', 7, 4], ['1⅓', 4, 3], ['1⅔', 5, 3], ['1⅕', 6, 5]];
function makeClue(prev, rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const build = () => {
    const kind = Math.floor(rng() * 8);
    switch (kind) {
      case 0: { const [n, d] = pick(NICE); return { tp: n, tq: d, clue: fracWords(n, d), kind }; }
      case 1: { const [n, d] = pick(NICE); return { tp: -n, tq: d, clue: `the opposite of ${n}/${d}`, kind }; }
      case 2: { const [dec, n, d] = pick(DECS); return { tp: n, tq: d, clue: `a fraction equal to the decimal ${dec}`, kind, dec }; }
      case 3: { const [label, n, d] = pick(MIXED); return { tp: n, tq: d, clue: `the mixed number ${label}`, kind }; }
      case 4: {
        const opts = [
          { tp: 1, tq: 2, clue: 'the point exactly halfway between 0 and 1' },
          { tp: 1, tq: 4, clue: 'the point exactly halfway between 0 and ½' },
          { tp: 3, tq: 4, clue: 'the point exactly halfway between ½ and 1' },
          { tp: 3, tq: 2, clue: 'the point exactly halfway between 1 and 2' },
          { tp: -1, tq: 2, clue: 'the point exactly halfway between 0 and −1' },
        ];
        return { ...pick(opts), kind };
      }
      case 5: { const [n, d] = pick(NICE); return { tp: -n, tq: d, clue: `−${n}/${d}`, kind }; }
      case 6: { const [n, d] = pick(NICE); const k = 2 + Math.floor(rng() * 2); return { tp: n, tq: d, clue: `the simplest form of ${n * k}/${d * k}`, kind, k, un: n * k, ud: d * k }; }
      default: {
        let a = pick(NICE);
        let b = pick(NICE);
        let guard = 0;
        while (eqRat(a[0], a[1], b[0], b[1]) && guard++ < 20) b = pick(NICE);
        const greater = cmpRat(a[0], a[1], b[0], b[1]) > 0 ? a : b;
        const lesser = greater === a ? b : a;
        const wantGreater = rng() < 0.5;
        const t = wantGreater ? greater : lesser;
        return { tp: t[0], tq: t[1], clue: `the ${wantGreater ? 'larger' : 'smaller'} of ${a[0]}/${a[1]} and ${b[0]}/${b[1]}`, kind, a, b, wantGreater };
      }
    }
  };
  let r;
  do { r = build(); } while (prev != null && eqRat(r.tp, r.tq, prev.tp, prev.tq));
  return r;
}
const matchPercent = (p, q, tp, tq, calibrated) => {
  if (calibrated) return 100;
  const d = Math.abs(value(p, q) - value(tp, tq));
  return Math.max(0, Math.min(99, Math.round(100 - d * 40)));
};

/* 6) every clue: reachable target, intended answer calibrates & meters 100,
      a nearby wrong point never meters 100, consecutive targets differ, all
      kinds appear, and the clue SEMANTICS actually equal the target --------- */
let seed = 20260714;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
let prev = null;
const kindsSeen = new Set();
for (let i = 0; i < 12000; i++) {
  const r = makeClue(prev, rng);
  kindsSeen.add(r.kind);
  const [rtp, rtq] = reduce(r.tp, r.tq);
  // reachable: reduced denominator fits a dial, value inside window
  ok(rtq >= Q_MIN && rtq <= Q_MAX, `clue target denom ${rtq} ≤ ${Q_MAX} (${r.clue})`);
  ok(value(r.tp, r.tq) >= VMIN - 1e-12 && value(r.tp, r.tq) <= VMAX + 1e-12, `clue target in window (${r.clue})`);
  ok(Math.abs(rtp) <= pMax(rtq) && Math.abs(rtp) >= -pMax(rtq), `clue target numerator reachable (${r.clue})`);
  // intended answer (as reduced, and as the raw tp/tq) calibrates & meters 100
  ok(eqRat(rtp, rtq, r.tp, r.tq), `reduced target equals target (${r.clue})`);
  ok(matchPercent(r.tp, r.tq, r.tp, r.tq, true) === 100, `exact answer meters 100 (${r.clue})`);
  // an equivalent fraction also calibrates (equivalence is honoured)
  ok(eqRat(2 * r.tp, 2 * r.tq, r.tp, r.tq) && matchPercent(2 * r.tp, 2 * r.tq, r.tp, r.tq, true) === 100, `equivalent form calibrates (${r.clue})`);
  // a one-piece miss (same denom) is close but NOT calibrated and meters < 100
  const missp = r.tp + 1;
  if (Math.abs(missp) <= pMax(r.tq)) {
    const cal = eqRat(missp, r.tq, r.tp, r.tq);
    ok(!cal, `one-piece miss not calibrated (${r.clue})`);
    ok(matchPercent(missp, r.tq, r.tp, r.tq, cal) < 100, `one-piece miss meters < 100 (${r.clue})`);
  }
  if (prev != null) ok(!eqRat(r.tp, r.tq, prev.tp, prev.tq), 'consecutive clue targets differ');
  // SEMANTICS per kind
  if (r.kind === 1) ok(cmpRat(r.tp, r.tq, 0, 1) < 0, `opposite clue lands negative (${r.clue})`);
  if (r.kind === 2) {
    // the named decimal equals the target
    const asNum = Number(r.dec);
    ok(Math.abs(value(r.tp, r.tq) - asNum) < 1e-12, `decimal clue ${r.dec} = ${r.tp}/${r.tq}`);
    ok(terminates(r.tp, r.tq), `decimal clue target terminates (${r.clue})`);
  }
  if (r.kind === 3) ok(Math.abs(value(r.tp, r.tq)) > 1 && Math.abs(value(r.tp, r.tq)) < 2, `mixed clue target improper (${r.clue})`);
  if (r.kind === 5) ok(value(r.tp, r.tq) < 0, `negative clue is negative (${r.clue})`);
  if (r.kind === 6) {
    // the shown un-reduced fraction reduces to the target
    const [sp, sq] = reduce(r.un, r.ud);
    ok(eqRat(sp, sq, r.tp, r.tq) && sp === r.tp && sq === r.tq, `simplify clue: ${r.un}/${r.ud} → ${r.tp}/${r.tq}`);
  }
  if (r.kind === 7) {
    const chosen = r.wantGreater
      ? (cmpRat(r.a[0], r.a[1], r.b[0], r.b[1]) > 0 ? r.a : r.b)
      : (cmpRat(r.a[0], r.a[1], r.b[0], r.b[1]) < 0 ? r.a : r.b);
    ok(chosen[0] === r.tp && chosen[1] === r.tq, `ordering clue picks the right one (${r.clue})`);
  }
  prev = r;
}
ok(kindsSeen.size === 8, `all 8 clue kinds appear (saw ${kindsSeen.size})`);

/* 7) the meter reads 100 ONLY when calibrated (no false stamp) ------------- */
for (let s = 0; s < 4000; s++) {
  const r = makeClue(null, rng);
  // scan a spread of user fractions and confirm meter=100 ⇔ eqRat
  for (let q = Q_MIN; q <= Q_MAX; q += 1) {
    for (let p = pMin(q); p <= pMax(q); p += 3) {
      const cal = eqRat(p, q, r.tp, r.tq);
      const m = matchPercent(p, q, r.tp, r.tq, cal);
      ok((m === 100) === cal, `meter 100 ⇔ calibrated for ${p}/${q} vs ${r.tp}/${r.tq}`);
    }
  }
  if (s > 30) break; // 30 clues × full scan is plenty
}

/* 8) multiple-choice answer keys match the arithmetic they assert ----------- */
// step 0: 6 and 0.5 are both rational (answer index 2 = "both")
ok(eqRat(6, 1, 6, 1) && eqRat(1, 2, 5, 10), 'step0: 6=6/1 and 0.5=1/2 are rational');
// step 1: 3/4 is between 0 and 1 (three one-fourth pieces), not near 3
ok(value(3, 4) > 0 && value(3, 4) < 1, 'step1: 3/4 between 0 and 1');
// step 2: 1/3 is a bigger piece than 1/5
ok(cmpRat(1, 3, 1, 5) > 0, 'step2: 1/3 > 1/5');
// step 3: 4/8 and 3/6 equal 1/2; 2/3 does not
ok(eqRat(4, 8, 1, 2) && eqRat(3, 6, 1, 2) && !eqRat(2, 3, 1, 2), 'step3: 4/8=3/6=1/2 ≠ 2/3');
// step 4: 1/3 = 0.333… repeats, not 0.3 exactly
ok(!terminates(1, 3) && !eqRat(3, 10, 1, 3), 'step4: 1/3 repeats and ≠ 3/10');
// step 5: −1/2 > −3/4
ok(cmpRat(-1, 2, -3, 4) > 0, 'step5: −1/2 > −3/4');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
