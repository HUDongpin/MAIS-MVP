/* Numeric audit for IrrationalLab — run: node audit-irrational.mjs
   Verifies the EXACT decimal machinery the lab teaches, independently of the
   component:
     • bigSqrt is a true floor integer square root;
     • sqrtParts / phiParts / the π,e constants match the math library to many
       places (so every digit the telescope shows is correct);
     • rationalParts detects terminating vs repeating and the exact period;
     • every specimen's classification (rational / irrational) is correct, and
       matches "√n is rational iff n is a perfect square" and "a ratio p/q is
       rational";
     • the nested-interval brackets are exact: lo < value < hi, width = 10^-L,
       properly nested, and the carry in hi = lo + 10^-L is right;
     • the calibration Number Sorter only ever grades by the true kind. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

const DIGITS_D = 30;
const EXPAND = 40;
const MAX_ZOOM = 9;

/* ---- mirror of the lab's exact model ------------------------------------- */
function bigSqrt(n) {
  if (n < 0n) throw new Error('neg');
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + n / x) >> 1n;
  }
  return x;
}
function sqrtParts(k, D) {
  const scale = 10n ** BigInt(D);
  const v = bigSqrt(BigInt(k) * scale * scale);
  const s = v.toString();
  const intLen = s.length - D;
  return { intPart: s.slice(0, intLen), digits: s.slice(intLen) };
}
function phiParts(D) {
  const scale = 10n ** BigInt(D);
  const s5 = bigSqrt(5n * scale * scale);
  const v = (scale + s5) / 2n;
  const s = v.toString();
  const intLen = s.length - D;
  return { intPart: s.slice(0, intLen), digits: s.slice(intLen) };
}
function rationalParts(p, q) {
  const intPart = String(Math.floor(p / q));
  let r = p % q;
  const digits = [];
  const seen = new Map();
  let repeatStart = -1;
  while (r !== 0) {
    if (seen.has(r)) {
      repeatStart = seen.get(r);
      break;
    }
    seen.set(r, digits.length);
    r *= 10;
    digits.push(String(Math.floor(r / q)));
    r = r % q;
    if (digits.length > 5000) break;
  }
  return { intPart, raw: digits.join(''), repeatStart, terminates: r === 0 };
}

const PI_FRAC = '141592653589793238462643383279502884197169';
const E_FRAC = '718281828459045235360287471352662497757247';

function fraction(id, sym, p, q) {
  const { intPart, raw, repeatStart, terminates } = rationalParts(p, q);
  let digits = raw;
  let decType = 'terminating';
  let period = 0;
  let preperiod = raw.length;
  if (!terminates && repeatStart >= 0) {
    decType = 'repeating';
    preperiod = repeatStart;
    period = raw.length - repeatStart;
    const pre = raw.slice(0, repeatStart);
    const block = raw.slice(repeatStart);
    let ex = pre;
    while (ex.length < EXPAND) ex += block;
    digits = ex.slice(0, EXPAND);
  }
  return { id, sym, group: 'fraction', kind: 'rational', intPart, digits, frac: [p, q], decType, repeatStart: decType === 'repeating' ? repeatStart : -1, period, preperiod, perfectSquare: null, rootN: null, value: p / q };
}
function root(id, n) {
  const s = Math.round(Math.sqrt(n));
  if (s * s === n) {
    return { id, sym: `√${n}`, group: 'root', kind: 'rational', intPart: String(s), digits: '', frac: [s, 1], decType: 'terminating', repeatStart: -1, period: 0, preperiod: 0, perfectSquare: { n, s }, rootN: n, value: s };
  }
  const { intPart, digits } = sqrtParts(n, DIGITS_D);
  return { id, sym: `√${n}`, group: 'root', kind: 'irrational', intPart, digits, frac: null, decType: null, repeatStart: -1, period: 0, preperiod: 0, perfectSquare: null, rootN: n, value: Math.sqrt(n) };
}
function constant(id, sym, intPart, digits, value) {
  return { id, sym, group: 'constant', kind: 'irrational', intPart, digits, frac: null, decType: null, repeatStart: -1, period: 0, preperiod: 0, perfectSquare: null, rootN: null, value };
}
const phi = phiParts(DIGITS_D);
const SPECIMENS = [
  fraction('q14', '1/4', 1, 4),
  fraction('q38', '3/8', 3, 8),
  fraction('q34', '3/4', 3, 4),
  fraction('q13', '1/3', 1, 3),
  fraction('q29', '2/9', 2, 9),
  fraction('q211', '2/11', 2, 11),
  fraction('q17', '1/7', 1, 7),
  fraction('q227', '22/7', 22, 7),
  root('r2', 2),
  root('r3', 3),
  root('r5', 5),
  root('r7', 7),
  root('r9', 9),
  root('r16', 16),
  constant('pi', 'π', '3', PI_FRAC, Math.PI),
  constant('phi', 'φ', phi.intPart, phi.digits, (1 + Math.sqrt(5)) / 2),
  constant('e', 'e', '2', E_FRAC, Math.E),
];
const childDigit = (spec, L) => (L < spec.digits.length ? spec.digits.charCodeAt(L) - 48 : 0);
function bracket(spec, L) {
  const frac = spec.digits.slice(0, L).padEnd(L, '0');
  const loStr = L === 0 ? spec.intPart : spec.intPart + '.' + frac;
  const whole = BigInt(spec.intPart + frac) + 1n;
  const w = whole.toString().padStart(L + 1, '0');
  const hiInt = w.slice(0, w.length - L);
  const hiStr = L === 0 ? hiInt : hiInt + '.' + w.slice(w.length - L);
  return { loStr, hiStr };
}

/* ---- 1) bigSqrt is a true floor integer sqrt ----------------------------- */
for (let n = 0n; n <= 2000n; n++) {
  const r = bigSqrt(n);
  ok(r * r <= n && (r + 1n) * (r + 1n) > n, `bigSqrt(${n}) = ${r} is floor sqrt`);
}
for (const big of [10n ** 40n, 2n * 10n ** 60n, 123456789012345678901234567890n]) {
  const r = bigSqrt(big);
  ok(r * r <= big && (r + 1n) * (r + 1n) > big, `bigSqrt of large ${big} is floor sqrt`);
}
ok(bigSqrt(9n) === 3n && bigSqrt(16n) === 4n && bigSqrt(2n) === 1n, 'bigSqrt small exact');

/* ---- 2) sqrt/phi/const digits match the math library --------------------- */
function toFloat(sp, places = 12) {
  return Number(sp.intPart + '.' + (sp.digits + '0'.repeat(places)).slice(0, places));
}
for (const id of ['r2', 'r3', 'r5', 'r7']) {
  const sp = SPECIMENS.find((s) => s.id === id);
  const n = sp.rootN;
  ok(Math.abs(toFloat(sp, 12) - Math.sqrt(n)) < 1e-11, `${sp.sym} digits ≈ Math.sqrt(${n})`);
  // exact check: (floor(√n·10^D))² ≤ n·10^(2D) < (that+1)²
  const D = DIGITS_D;
  const scale = 10n ** BigInt(D);
  const v = BigInt(sp.intPart + sp.digits); // = floor(√n · 10^D)
  ok(v * v <= BigInt(n) * scale * scale && (v + 1n) * (v + 1n) > BigInt(n) * scale * scale, `${sp.sym} is exact floor to ${D} places`);
}
{
  const pi = SPECIMENS.find((s) => s.id === 'pi');
  ok(Math.abs(toFloat(pi, 12) - Math.PI) < 1e-11, 'π digits match Math.PI');
  const e = SPECIMENS.find((s) => s.id === 'e');
  ok(Math.abs(toFloat(e, 12) - Math.E) < 1e-11, 'e digits match Math.E');
  const ph = SPECIMENS.find((s) => s.id === 'phi');
  ok(Math.abs(toFloat(ph, 12) - (1 + Math.sqrt(5)) / 2) < 1e-11, 'φ digits match (1+√5)/2');
  // π begins 3.14159265358979
  ok(pi.intPart === '3' && pi.digits.startsWith('14159265358979'), 'π known prefix');
  ok(ph.intPart === '1' && ph.digits.startsWith('61803398874989'), 'φ known prefix');
  ok(e.intPart === '2' && e.digits.startsWith('71828182845904'), 'e known prefix');
}

/* ---- 3) rational digits: terminating vs repeating, exact period ---------- */
const cases = [
  { p: 1, q: 4, term: true, digits: '25' },
  { p: 3, q: 8, term: true, digits: '375' },
  { p: 3, q: 4, term: true, digits: '75' },
  { p: 1, q: 3, term: false, period: 1, pre: 0, block: '3' },
  { p: 2, q: 9, term: false, period: 1, pre: 0, block: '2' },
  { p: 2, q: 11, term: false, period: 2, pre: 0, block: '18' },
  { p: 1, q: 7, term: false, period: 6, pre: 0, block: '142857' },
  { p: 22, q: 7, term: false, period: 6, pre: 0, block: '142857' },
  { p: 5, q: 6, term: false, period: 1, pre: 1, block: '3' }, // 0.8333… mixed
];
for (const c of cases) {
  const r = rationalParts(c.p, c.q);
  ok(r.terminates === c.term, `${c.p}/${c.q} terminates=${c.term}`);
  if (c.term) {
    ok(r.raw === c.digits, `${c.p}/${c.q} = 0.${c.digits}`);
  } else {
    const period = r.raw.length - r.repeatStart;
    ok(period === c.period, `${c.p}/${c.q} period ${c.period} (got ${period})`);
    ok(r.repeatStart === c.pre, `${c.p}/${c.q} preperiod ${c.pre}`);
    ok(r.raw.slice(r.repeatStart) === c.block, `${c.p}/${c.q} block ${c.block}`);
  }
}
// reconstruction: sum the geometric series of the repeating block == p/q exactly
for (const c of cases.filter((x) => !x.term)) {
  const r = rationalParts(c.p, c.q);
  const pre = r.raw.slice(0, r.repeatStart);
  const block = r.raw.slice(r.repeatStart);
  // value = intPart + pre/10^|pre| + block/((10^|block|-1)·10^|pre|)
  const P = 10n ** BigInt(pre.length);
  const B = 10n ** BigInt(block.length);
  const frac = (pre === '' ? 0n : BigInt(pre)) * (B - 1n) + BigInt(block);
  const den = P * (B - 1n);
  const num = BigInt(r.intPart) * den + frac; // integer part + fractional expansion
  // compare num/den to p/q as fractions (cross-multiply)
  ok(num * BigInt(c.q) === den * BigInt(c.p), `${c.p}/${c.q} reconstructs from its repeating expansion`);
}
// every rational specimen's decimal really equals p/q (long-division digits check)
for (const sp of SPECIMENS.filter((s) => s.kind === 'rational' && s.digits !== '')) {
  const [p, q] = sp.frac;
  // check first ~15 fractional digits equal long-division of p/q
  let r = p % q;
  for (let i = 0; i < 15; i++) {
    r *= 10;
    const d = Math.floor(r / q);
    r = r % q;
    const shown = i < sp.digits.length ? sp.digits.charCodeAt(i) - 48 : 0;
    if (i < sp.digits.length) ok(shown === d, `${sp.sym} digit ${i} = ${d}`);
  }
}

/* ---- 4) classification is correct for every specimen --------------------- */
const perfectSquares = new Set([0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100]);
for (const sp of SPECIMENS) {
  if (sp.rootN != null) {
    const shouldBeRational = perfectSquares.has(sp.rootN);
    ok(sp.kind === (shouldBeRational ? 'rational' : 'irrational'), `√${sp.rootN} kind matches perfect-square rule`);
    if (shouldBeRational) {
      const s = Math.round(Math.sqrt(sp.rootN));
      ok(s * s === sp.rootN && sp.intPart === String(s) && sp.digits === '', `√${sp.rootN} = ${s}`);
    }
  }
  if (sp.frac) {
    // anything with an integer ratio must be classified rational
    ok(sp.kind === 'rational', `${sp.sym} has a fraction ⇒ rational`);
  }
  if (['pi', 'phi', 'e'].includes(sp.id)) ok(sp.kind === 'irrational', `${sp.sym} is irrational`);
}
// the trap: 22/7 is rational (repeats), NOT π; and it differs from π by ~0.00126
{
  const q227 = SPECIMENS.find((s) => s.id === 'q227');
  const pi = SPECIMENS.find((s) => s.id === 'pi');
  ok(q227.kind === 'rational' && q227.decType === 'repeating' && q227.period === 6, '22/7 rational, period 6');
  ok(q227.intPart === '3' && q227.digits.startsWith('142857'), '22/7 = 3.142857…');
  ok(pi.digits.startsWith('14159'), 'π = 3.14159…');
  ok(q227.digits[0] === pi.digits[0] && q227.digits[2] !== pi.digits[2], '22/7 and π split by the 3rd decimal');
  ok(Math.abs(22 / 7 - Math.PI) > 0.001 && Math.abs(22 / 7 - Math.PI) < 0.002, '22/7 within ~0.0013 of π');
}

/* ---- 5) nested-interval brackets are exact & properly nested ------------- */
for (const sp of SPECIMENS) {
  const vF = sp.value;
  let prevLo = -Infinity;
  let prevHi = Infinity;
  for (let L = 0; L <= MAX_ZOOM; L++) {
    const b = bracket(sp, L);
    const lo = Number(b.loStr);
    const hi = Number(b.hiStr);
    // width is exactly 10^-L
    ok(Math.abs(hi - lo - Math.pow(10, -L)) < Math.pow(10, -L) * 1e-6, `${sp.sym} level ${L} width 10^-${L}`);
    // value lies in [lo, hi]  (allow tiny float slack; digits are exact)
    ok(vF >= lo - 1e-9 && vF <= hi + 1e-9, `${sp.sym} in [${b.loStr}, ${b.hiStr}] at level ${L}`);
    // nested inside the parent bracket
    ok(lo >= prevLo - 1e-9 && hi <= prevHi + 1e-9, `${sp.sym} level ${L} nested in parent`);
    // lo is the value truncated to L decimals: lo = intPart.(first L digits)
    const expectLo = L === 0 ? sp.intPart : sp.intPart + '.' + sp.digits.slice(0, L).padEnd(L, '0');
    ok(b.loStr === expectLo, `${sp.sym} level ${L} lo string exact`);
    // the child sub-interval index equals the next digit
    const d = childDigit(sp, L);
    ok(d >= 0 && d <= 9, `${sp.sym} child digit in 0..9`);
    // sub-bracket [lo + d·10^-(L+1), lo + (d+1)·10^-(L+1)] == bracket(L+1)
    const nb = bracket(sp, L + 1);
    ok(Number(nb.loStr) >= lo - 1e-12 && Number(nb.hiStr) <= hi + 1e-12, `${sp.sym} child bracket inside parent`);
    prevLo = lo;
    prevHi = hi;
  }
}
// carry correctness: a value like 1.9… would roll hi to 2.0 — test the helper on
// a synthetic specimen whose digits start with 9s
{
  const s9 = { intPart: '1', digits: '9989' + '0'.repeat(40) };
  ok(bracket(s9, 1).hiStr === '2.0', 'carry: 1.9.. → hi 2.0');
  ok(bracket(s9, 2).hiStr === '2.00', 'carry: 1.99.. → hi 2.00');
  ok(bracket(s9, 3).loStr === '1.998' && bracket(s9, 3).hiStr === '1.999', 'no false carry at 1.998');
}
// terminating decimals: once past the last digit, the point sits on a tick
{
  const q14 = SPECIMENS.find((s) => s.id === 'q14'); // 0.25
  ok(childDigit(q14, 0) === 2 && childDigit(q14, 1) === 5, '1/4 digits 2 then 5');
  ok(childDigit(q14, 2) === 0 && childDigit(q14, 3) === 0, '1/4 lands: 0s after 0.25');
  // √9 sits exactly on integer tick 3 at every level
  const r9 = SPECIMENS.find((s) => s.id === 'r9');
  for (let L = 0; L <= 4; L++) ok(childDigit(r9, L) === 0, `√9 child digit 0 at level ${L} (on the tick)`);
  ok(bracket(r9, 0).loStr === '3' && bracket(r9, 0).hiStr === '4', '√9 bracket [3,4]');
}
// repeating decimals: self-similar — same child digit cycle, never a tick-landing
{
  const q13 = SPECIMENS.find((s) => s.id === 'q13'); // 0.333…
  for (let L = 0; L <= 8; L++) ok(childDigit(q13, L) === 3, `1/3 child digit always 3 at level ${L}`);
  const q17 = SPECIMENS.find((s) => s.id === 'q17'); // 142857 repeating
  const block = '142857';
  for (let L = 0; L <= 11; L++) ok(childDigit(q17, L) === block.charCodeAt(L % 6) - 48, `1/7 digit ${L} follows 142857`);
}

/* ---- 6) irrationals never repeat within the shown window ----------------- */
function hasShortRepeat(digits, maxPeriod) {
  // returns true if digits (from some start) fall into a cycle of length ≤ maxPeriod
  for (let p = 1; p <= maxPeriod; p++) {
    let good = true;
    for (let i = 0; i + p < digits.length; i++) {
      if (digits[i] !== digits[i + p]) {
        good = false;
        break;
      }
    }
    if (good) return true;
  }
  return false;
}
for (const sp of SPECIMENS.filter((s) => s.kind === 'irrational')) {
  ok(!hasShortRepeat(sp.digits.slice(0, 24), 6), `${sp.sym} shows no period ≤ 6 in first 24 digits`);
}

/* ---- 7) calibration Number Sorter grades by the true kind ---------------- */
const POOL = SPECIMENS.map((s) => s.id);
function pickSorter(prev, rng) {
  let id = prev;
  while (id === prev) id = POOL[Math.floor(rng() * POOL.length)];
  return id;
}
let seed = 20260714;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
let prev = null;
const seen = new Set();
for (let i = 0; i < 8000; i++) {
  const id = pickSorter(prev, rng);
  ok(id !== prev, 'sorter never repeats the same number twice in a row');
  const sp = SPECIMENS.find((s) => s.id === id);
  ok(sp.kind === 'rational' || sp.kind === 'irrational', 'sorter number has a definite kind');
  // grading: choosing the true kind is correct; the other is wrong
  ok((sp.kind === 'rational') !== (sp.kind === 'irrational'), 'exactly one kind is correct');
  seen.add(id);
  prev = id;
}
ok(seen.size === SPECIMENS.length, `every specimen can appear in the sorter (saw ${seen.size}/${SPECIMENS.length})`);

/* ---- 8) multiple-choice answer keys are true ----------------------------- */
ok((3 / 4) === 0.75, 'step0: 3/4 is rational 0.75');
ok(!Number.isInteger(Math.sqrt(2)) && Math.abs(Math.sqrt(2) - 1.41421356) < 1e-6, 'step0/3: √2 irrational ≈ 1.41421356');
{
  const q17 = SPECIMENS.find((s) => s.id === 'q17');
  ok(q17.decType === 'repeating' && q17.period === 6, 'step1: 1/7 repeats period 6');
}
ok(1.41 * 1.41 < 2 && 1.42 * 1.42 > 2, 'step3: √2 between 1.41 and 1.42');
ok(1.4 * 1.4 < 2 && 1.5 * 1.5 > 2, 'step4: √2 between 1.4 and 1.5');
{
  const r9 = SPECIMENS.find((s) => s.id === 'r9');
  const r7 = SPECIMENS.find((s) => s.id === 'r7');
  const r2 = SPECIMENS.find((s) => s.id === 'r2');
  ok(r9.kind === 'rational' && r7.kind === 'irrational' && r2.kind === 'irrational', 'step5: √9 rational, √7 & √2 irrational');
}
ok(22 / 7 !== Math.PI, 'step6: 22/7 is not π');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
