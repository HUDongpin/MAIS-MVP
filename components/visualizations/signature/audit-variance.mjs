/* ============================================================================
   audit-variance.mjs — numeric proof that VarianceLab's mathematics is EXACT.

   Run:  node audit-variance.mjs

   It re-implements the lab's pure model (the same integer formulas the .jsx
   uses) and checks every claim against an INDEPENDENT BigInt-rational reference,
   so a bug in the fast integer formula cannot hide behind the same bug in the
   reference.  It also parses the ACTUAL CAL_TARGETS out of VarianceLab.jsx and
   verifies each target's shipped solution really has that variance.

   Checks:
     • Nv = n·Σx² − sum²  equals  n·Σ(xᵢ−μ)²  (the sum-of-squares identity)
     • the deviations sum to 0 exactly
     • variance = Nv/n²  equals the BigInt-rational Σ(xᵢ−μ)²/n
     • the shortcut identity  mean(x²) − (mean x)² = variance
     • MAD = Σ|xᵢ−μ|/n , and the inequality  MAD ≤ √variance
     • translation invariance  Var(x+c) = Var(x)
     • the k² scaling law       Var(k·x) = k²·Var(x)
     • variance ≥ 0, and = 0 only iff all values are equal
     • fmtRatio exact/approx flags (terminating vs repeating)
     • CALIBRATION: each shipped target's solution hits it exactly; the
       CALIBRATED test fires only on an exact integer hit; the meter is 100 only
       at the target and decreases away from it
     • the fixed lesson answer-key arithmetic
   ========================================================================== */

import { readFileSync } from 'node:fs';

let pass = 0;
let fail = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    if (fails.length < 40) fails.push(msg);
  }
}

/* ---- the lab's pure model (copied verbatim from VarianceLab.jsx) ---------- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function reduceFrac(num, den) {
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}
function longDivide(num, den) {
  const sign = num < 0 ? '-' : '';
  num = Math.abs(num);
  const intPart = Math.floor(num / den);
  let rem = num % den;
  if (rem === 0) return sign + String(intPart);
  let frac = '';
  let guard = 0;
  while (rem !== 0 && guard < 14) {
    rem *= 10;
    frac += Math.floor(rem / den);
    rem %= den;
    guard++;
  }
  return sign + intPart + '.' + frac;
}
function terminates(den) {
  let d = Math.abs(den);
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}
function roundedHundredths(num, den) {
  const sign = num < 0 ? '-' : '';
  const H = Math.round((Math.abs(num) * 100) / den);
  const whole = Math.floor(H / 100);
  const frac = H % 100;
  return sign + whole + '.' + String(frac).padStart(2, '0');
}
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}
function computeStats(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const ss = data.reduce((a, b) => a + b * b, 0);
  let Aabs = 0;
  for (const v of data) Aabs += Math.abs(n * v - sum);
  const Nv = n * ss - sum * sum;
  return { n, sum, ss, Nv, Aabs };
}
const isCalibrated = (Nv, n, T) => Nv === T * n * n;
const matchPercent = (variance, T) => 100 * Math.max(0, 1 - Math.abs(variance - T) / 6);

/* ---- independent BigInt-rational reference ------------------------------- */
function bgcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}
// exact rational {p,q} for  Σ(xᵢ − μ)² / n   with μ = sum/n
function refVariance(data) {
  const n = BigInt(data.length);
  const sum = data.reduce((a, b) => a + BigInt(b), 0n);
  // Σ(xᵢ − μ)² = Σ (n·xᵢ − sum)² / n²   (exact)
  let num = 0n;
  for (const x of data) {
    const t = n * BigInt(x) - sum;
    num += t * t;
  }
  // that is Σ(x−μ)² times n² ; divide by n² then by n  → variance = num / n³
  let p = num;
  let q = n * n * n;
  const g = bgcd(p, q);
  return { p: p / g, q: q / g };
}
function fracEq(a, bNum, bDen) {
  // a = {p,q} ; compare to bNum/bDen
  return a.p * BigInt(bDen) === BigInt(bNum) * a.q;
}

/* ==========================================================================
   1) Core identities over many integer datasets
   ========================================================================== */
function checkDataset(data) {
  const { n, sum, ss, Nv, Aabs } = computeStats(data);

  // sum-of-squares identity:  Σ(n·x − sum)² === n·Nv
  let SS = 0;
  let devSum = 0;
  for (const x of data) {
    const t = n * x - sum;
    SS += t * t;
    devSum += t;
  }
  ok(SS === n * Nv, `SS identity ${data}`);
  ok(devSum === 0, `deviations sum to 0 ${data}`);
  ok(Nv >= 0, `Nv ≥ 0 ${data}`);
  const allEqual = data.every((v) => v === data[0]);
  ok((Nv === 0) === allEqual, `Nv=0 iff all equal ${data}`);

  // variance = Nv/n²  matches the BigInt reference
  const ref = refVariance(data);
  ok(fracEq(ref, Nv, n * n), `variance vs BigInt ref ${data}`);

  // shortcut identity: mean(x²) − (mean)² = variance   ⟺  ss·n − sum² === Nv
  ok(ss * n - sum * sum === Nv, `identity mean(x²)−mean² ${data}`);

  // MAD = Aabs/n² ; and MAD ≤ √variance (float sanity, generous eps)
  const mad = Aabs / (n * n);
  const variance = Nv / (n * n);
  ok(mad <= Math.sqrt(variance) + 1e-9, `MAD ≤ SD ${data}`);

  // translation invariance: shift by any integer c keeps Nv
  for (const c of [-3, 1, 5]) {
    const shifted = data.map((v) => v + c);
    ok(computeStats(shifted).Nv === Nv, `translation c=${c} ${data}`);
  }
  // scaling law: Var(k·x) = k²·Var(x)  ⟺  Nv(k·x) = k²·Nv
  for (const k of [2, 3]) {
    const scaled = data.map((v) => k * v);
    ok(computeStats(scaled).Nv === k * k * Nv, `scaling k=${k} ${data}`);
  }
}

// exhaustive over n = 2,3,4 with values 0..10
const V = 10;
for (let a = 0; a <= V; a++)
  for (let b = 0; b <= V; b++) {
    checkDataset([a, b]);
    for (let c = 0; c <= V; c++) {
      checkDataset([a, b, c]);
      for (let d = 0; d <= V; d++) checkDataset([a, b, c, d]);
    }
  }
// random sampling for n = 5..7
let seed = 12345;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
for (let t = 0; t < 40000; t++) {
  const n = 5 + Math.floor(rnd() * 3); // 5..7
  const data = [];
  for (let i = 0; i < n; i++) data.push(Math.floor(rnd() * (V + 1)));
  checkDataset(data);
}

/* ==========================================================================
   2) fmtRatio exact / approx flags
   ========================================================================== */
function fmtCase(num, den, text, approx) {
  const f = fmtRatio(num, den);
  ok(f.text === text && f.approx === approx, `fmt ${num}/${den} → ${f.text}/${f.approx} (want ${text}/${approx})`);
}
fmtCase(50, 25, '2', false); // variance 2
fmtCase(1, 4, '0.25', false); // terminating
fmtCase(1, 2, '0.5', false);
fmtCase(1, 3, '0.33', true); // repeating → approx
fmtCase(2, 3, '0.67', true);
fmtCase(32, 16, '2', false); // START variance
fmtCase(8, 16, '0.5', false); // Tight variance
fmtCase(128, 16, '8', false); // Wide variance
fmtCase(7, 1, '7', false);

/* ==========================================================================
   3) START_DATA and presets
   ========================================================================== */
(() => {
  const st = computeStats([3, 5, 5, 7]);
  ok(st.sum / st.n === 5, 'START mean 5');
  ok(st.Nv === 32 && st.Nv / (st.n * st.n) === 2, 'START variance 2');
  ok(st.Aabs / (st.n * st.n) === 1, 'START MAD 1');

  const tight = computeStats([4, 5, 5, 6]);
  const wide = computeStats([1, 5, 5, 9]);
  ok(tight.sum / tight.n === 5 && wide.sum / wide.n === 5, 'Tight & Wide share mean 5');
  ok(tight.Nv / 16 === 0.5, 'Tight variance 0.5');
  ok(wide.Nv / 16 === 8, 'Wide variance 8');
  ok(wide.Nv > tight.Nv, 'Wide more spread than Tight (same mean)');
})();

/* ==========================================================================
   4) CALIBRATION — parse the ACTUAL targets out of the source and verify
   ========================================================================== */
const src = readFileSync(new URL('./VarianceLab.jsx', import.meta.url), 'utf8');
const m = src.match(/const CAL_TARGETS\s*=\s*\[([\s\S]*?)\];/);
ok(!!m, 'found CAL_TARGETS in source');
const targets = [];
if (m) {
  const re = /\{\s*T:\s*(\d+)\s*,\s*solution:\s*\[([0-9,\s]+)\]/g;
  let mm;
  while ((mm = re.exec(m[1]))) {
    targets.push({ T: Number(mm[1]), solution: mm[2].split(',').map((s) => Number(s.trim())) });
  }
}
ok(targets.length >= 4, `parsed ${targets.length} calibration targets`);
for (const { T, solution } of targets) {
  const { n, Nv } = computeStats(solution);
  ok(Nv === T * n * n, `target V=${T}: solution ${solution} has variance ${Nv / (n * n)} (want ${T})`);
  ok(isCalibrated(Nv, n, T), `target V=${T}: isCalibrated true on exact hit`);
  ok(solution.every((v) => v >= 0 && v <= 10), `target V=${T}: solution in [0,10]`);
  // meter is exactly 100 only at the exact variance, and lower nearby
  ok(Math.abs(matchPercent(Nv / (n * n), T) - 100) < 1e-9, `target V=${T}: meter 100 at exact`);
  ok(matchPercent(Nv / (n * n) + 0.5, T) < 100, `target V=${T}: meter < 100 when off by 0.5`);
  ok(matchPercent(Nv / (n * n) + 1, T) < matchPercent(Nv / (n * n) + 0.5, T), `target V=${T}: meter monotone`);
  // a flat start (all 5s) has variance 0 ⇒ never falsely CALIBRATED (targets > 0)
  const flat = computeStats(new Array(solution.length).fill(5));
  ok(!isCalibrated(flat.Nv, flat.n, T), `target V=${T}: flat start not calibrated`);
}
// no target is reachable by the flat start (all targets are non-zero variance)
ok(targets.every((t) => t.T > 0), 'all targets are non-zero variance');

/* ==========================================================================
   5) Lesson answer-key arithmetic (the numbers the quizzes assert)
   ========================================================================== */
ok(3 ** 2 / 1 ** 2 === 9, 'SIGN step: far point counts 9× (3²/1²)');
ok(3 / 1 === 3, 'SIGN step: MAD would count only 3×');
ok((-4) ** 2 === 16, 'SQUARES step: (−4)²=16');
ok((4 + 0 + 8) / 3 === 4, 'VAR step: (4+0+8)/3 = 4');
ok(2 ** 2 === 4, 'IDENT step: doubling distance → ×4 variance (k²=4)');

/* ==========================================================================
   Report
   ========================================================================== */
console.log(`\nVarianceLab audit — ${pass} checks passed, ${fail} failed.`);
if (fail) {
  console.log('\nFirst failures:');
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
} else {
  console.log('All variance identities, calibration targets, and lesson keys verified exact. ✓');
}
