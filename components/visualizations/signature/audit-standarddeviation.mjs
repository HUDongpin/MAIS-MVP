/* ============================================================================
   audit-standarddeviation.mjs — numeric proof harness for StandardDeviationLab.

   Re-implements the lab's EXACT integer model and checks it against an
   independent high-precision reference (BigInt for the exact parts, Math for the
   irrational σ) over a large space of data sets.  Run:  node audit-standarddeviation.mjs

   What it proves:
     1. Nv = n·Σx² − (Σx)²  equals  n·Σ(xᵢ−μ)²  exactly (BigInt), and is ≥ 0.
     2. Σ(xᵢ − μ) = 0 exactly (in ×n integer units).
     3. variance = Nv/n²  and  Σ(x−μ)² = Nv/n  match a direct rational computation.
     4. σ = √Nv / n  matches √variance, and the "exact iff Nv is a perfect square"
        display rule is correct (isqrt).
     5. "within 1σ" via the integer test (n·xᵢ − Σx)² ≤ Nv equals the count from
        the floating |xᵢ − μ| ≤ σ test (away from the exact boundary).
     6. Calibration: isCalibrated ⟺ σ == T exactly, for integer targets, with no
        false positives/negatives; every integer target 1..3 is reachable on the
        0..10 grid; and the fmt helpers never emit a float artefact.
   ========================================================================== */

/* ---- helpers copied verbatim from the lab (must stay in sync) ------------- */
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function reduceFrac(num, den) { const g = gcd(num, den); return { num: num / g, den: den / g }; }
function longDivide(num, den) {
  const intPart = Math.floor(num / den); let rem = num % den;
  if (rem === 0) return String(intPart);
  let frac = ''; let guard = 0;
  while (rem !== 0 && guard < 14) { rem *= 10; frac += Math.floor(rem / den); rem %= den; guard++; }
  return intPart + '.' + frac;
}
function terminates(den) { let d = den; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }
function roundedHundredths(num, den) {
  const H = Math.round((num * 100) / den);
  const whole = Math.floor(H / 100); const frac = ((H % 100) + 100) % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}
function isqrt(n) {
  if (n < 0) return -1;
  let x = Math.floor(Math.sqrt(n));
  while (x > 0 && x * x > n) x--;
  while ((x + 1) * (x + 1) <= n) x++;
  return x;
}
function round2Str(x) {
  const H = Math.round(x * 100); const whole = Math.floor(H / 100); const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
function computeStats(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const ss = data.reduce((a, b) => a + b * b, 0);
  const Nv = n ? n * ss - sum * sum : 0;
  let within = 0;
  if (n) for (const v of data) if ((n * v - sum) * (n * v - sum) <= Nv) within++;
  return { n, sum, ss, Nv, within };
}
const isCalibrated = (n, Nv, T) => n >= 2 && Nv === T * T * n * n;

/* ---- BigInt reference (independent of the lab's Number arithmetic) -------- */
function refNv(data) {
  const n = BigInt(data.length);
  let sum = 0n, ss = 0n;
  for (const v of data) { const b = BigInt(v); sum += b; ss += b * b; }
  return n * ss - sum * sum; // = n·Σ(x−μ)² exactly, as BigInt
}
// exact Σ(n·xᵢ − sum)²  == n·Nv  (a second identity for Nv), BigInt
function refSumCenteredSq(data) {
  const n = BigInt(data.length);
  let sum = 0n; for (const v of data) sum += BigInt(v);
  let acc = 0n; for (const v of data) { const t = n * BigInt(v) - sum; acc += t * t; }
  return acc; // should equal n * refNv(data)
}

/* ---- test driver ---------------------------------------------------------- */
let checks = 0, fails = 0;
const bad = [];
function ok(cond, msg, ctx) { checks++; if (!cond) { fails++; if (bad.length < 25) bad.push(msg + (ctx ? '  ' + JSON.stringify(ctx) : '')); } }

const VMIN = 0, VMAX = 10;

// enumerate a big pile of data sets: all multisets is too many, so mix
// exhaustive small sizes + random larger ones.
function* dataSets() {
  // all sets of size 2 and 3 over 0..10 (sorted, with repetition)
  for (let a = VMIN; a <= VMAX; a++)
    for (let b = a; b <= VMAX; b++) {
      yield [a, b];
      for (let c = b; c <= VMAX; c++) yield [a, b, c];
    }
  // random sets sizes 1..12
  let seed = 20260715;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let k = 0; k < 60000; k++) {
    const n = 1 + Math.floor(rnd() * 12);
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(Math.floor(rnd() * (VMAX - VMIN + 1)));
    yield arr;
  }
}

let count = 0;
for (const data of dataSets()) {
  count++;
  const { n, sum, ss, Nv, within } = computeStats(data);

  // 1. Nv identity + non-negativity, checked against BigInt reference
  const NvBig = refNv(data);
  ok(BigInt(Nv) === NvBig, 'Nv mismatch vs BigInt', { data, Nv, NvBig: NvBig.toString() });
  ok(Nv >= 0, 'Nv negative', { data, Nv });
  // second identity: Σ(n·xᵢ − sum)² === n · Nv
  ok(refSumCenteredSq(data) === BigInt(n) * NvBig, 'centered-sq identity fails', { data });

  // 2. Σ(xᵢ − μ) = 0  in ×n units:  Σ(n·xᵢ − sum) === 0
  const centeredSum = data.reduce((acc, v) => acc + (n * v - sum), 0);
  ok(centeredSum === 0, 'deviations do not cancel', { data, centeredSum });

  // 3. variance = Nv/n²  and Σ(x−μ)² = Nv/n : compare to direct rational (BigInt scaled)
  //    direct Σ(x−μ)² * n²  === Nv * n   (since Σ(x−μ)² = Nv/n)
  //    check by scaling to avoid floats:  n·Σ(n xᵢ − sum)² === n²·Nv  →  from identity above ✓
  //    variance*n² === Nv, sum-sq-dev*n === Nv  (definitional) — assert the fmts parse back:
  const varFmt = fmtRatio(Nv, n * n);
  const ssDevFmt = fmtRatio(Nv, n);
  ok(Math.abs(parseFloat(varFmt.text) - Nv / (n * n)) < (varFmt.approx ? 0.005 + 1e-9 : 1e-9),
    'variance fmt wrong', { data, Nv, n, varFmt });
  ok(Math.abs(parseFloat(ssDevFmt.text) - Nv / n) < (ssDevFmt.approx ? 0.005 + 1e-9 : 1e-9),
    'sum-sq-dev fmt wrong', { data, Nv, n, ssDevFmt });

  // 4. σ = √Nv/n === √variance ; exact display rule
  const sigma = Math.sqrt(Nv) / n;
  ok(Math.abs(sigma - Math.sqrt(Nv / (n * n))) < 1e-12, 'σ ≠ √variance', { data });
  const r = isqrt(Nv);
  ok(r * r <= Nv && (r + 1) * (r + 1) > Nv, 'isqrt wrong', { Nv, r });
  const sigmaExact = r * r === Nv; // display claims exact
  if (sigmaExact) {
    // σ = r/n exactly — the displayed value must equal it
    const f = fmtRatio(r, n);
    ok(Math.abs(parseFloat(f.text) - r / n) < (f.approx ? 0.005 + 1e-9 : 1e-9), 'exact σ fmt wrong', { data, r, n, f });
  } else {
    const txt = round2Str(sigma);
    ok(Math.abs(parseFloat(txt) - sigma) <= 0.005 + 1e-9, 'approx σ fmt wrong', { data, sigma, txt });
  }

  // 5. within-1σ integer test === float test (skip points on the exact boundary)
  let floatWithin = 0, boundary = false;
  const mean = sum / n;
  for (const v of data) {
    const dist = Math.abs(v - mean);
    if (Math.abs((n * v - sum) * (n * v - sum) - Nv) === 0) boundary = true; // exactly at σ
    if (dist <= sigma + 1e-9) floatWithin++;
  }
  if (!boundary) ok(within === floatWithin, 'within-1σ mismatch', { data, within, floatWithin, sigma });
  ok(within >= 0 && within <= n, 'within out of range', { data, within });
}

/* 6a. Calibration correctness: over the same sets, isCalibrated ⟺ σ is an
      integer equal to T.  No false positive (calibrated but σ≠T) and the meter's
      exact rule matches √Nv/n being an integer. */
let calibChecks = 0;
for (const data of dataSets()) {
  const { n, Nv } = computeStats(data);
  const sigma = n ? Math.sqrt(Nv) / n : 0;
  const sigmaIsInt = n >= 2 && Number.isInteger(Math.round(sigma)) && Math.abs(sigma - Math.round(sigma)) < 1e-9;
  for (const T of [1, 2, 3]) {
    calibChecks++;
    const cal = isCalibrated(n, Nv, T);
    const shouldCal = n >= 2 && Math.abs(sigma - T) < 1e-9;
    ok(cal === shouldCal, 'calibration mismatch', { data, T, cal, shouldCal, sigma });
    if (cal) ok(sigmaIsInt, 'calibrated but σ not integer', { data, T, sigma });
  }
}

/* 6b. Every integer target 1..3 is reachable on the 0..10 grid with a clean set. */
for (const T of [1, 2, 3]) {
  // symmetric pair around 5: {5−T, 5+T}
  const data = [5 - T, 5 + T];
  const { n, Nv } = computeStats(data);
  ok(isCalibrated(n, Nv, T), 'target unreachable by symmetric pair', { T, data, Nv });
  const sigma = Math.sqrt(Nv) / n;
  ok(Math.abs(sigma - T) < 1e-12, 'symmetric pair σ ≠ T', { T, data, sigma });
}

/* 6c. Golden values — spot-check exact strings a human can verify by hand. */
function strs(data) {
  const { n, sum, Nv } = computeStats(data);
  const varFmt = fmtRatio(Nv, n * n);
  const r = isqrt(Nv);
  const sigma = r * r === Nv ? fmtRatio(r, n) : { text: round2Str(Math.sqrt(Nv) / n), approx: true };
  const mean = fmtRatio(sum, n);
  return { mean: mean.text, meanApprox: mean.approx, variance: varFmt.text, varApprox: varFmt.approx, sigma: sigma.text, sigmaApprox: sigma.approx, Nv };
}
const golden = [
  { data: [3, 4, 5, 5, 6, 6, 7, 8], mean: '5.5', variance: '2.25', sigma: '1.5', sigmaApprox: false }, // START_DATA
  { data: [1, 3, 5, 7, 9], mean: '5', variance: '8', sigma: '2.83', sigmaApprox: true },              // σ = 2√2
  { data: [2, 4, 6], mean: '4', variance: '2.67', sigma: '1.63', sigmaApprox: true },                 // var 8/3
  { data: [3, 7], mean: '5', variance: '4', sigma: '2', sigmaApprox: false },                         // exact σ=2
  { data: [5, 5, 5], mean: '5', variance: '0', sigma: '0', sigmaApprox: false },                      // no spread
];
for (const g of golden) {
  const s = strs(g.data);
  ok(s.mean === g.mean, 'golden mean', { data: g.data, got: s.mean, want: g.mean });
  ok(s.variance === g.variance, 'golden variance', { data: g.data, got: s.variance, want: g.variance });
  ok(s.sigma === g.sigma, 'golden sigma', { data: g.data, got: s.sigma, want: g.sigma });
  ok(s.sigmaApprox === g.sigmaApprox, 'golden sigma approx flag', { data: g.data, got: s.sigmaApprox, want: g.sigmaApprox });
}

/* ---- report -------------------------------------------------------------- */
console.log('data sets enumerated : ' + count.toLocaleString());
console.log('calibration checks   : ' + calibChecks.toLocaleString());
console.log('assertions run       : ' + checks.toLocaleString());
console.log('failures             : ' + fails);
if (fails) { console.log('\nFIRST FAILURES:'); for (const b of bad) console.log('  ✗ ' + b); process.exit(1); }
else console.log('\n✓ ALL CHECKS PASSED — exact model, σ display rule, within-1σ, and calibration all verified.');
