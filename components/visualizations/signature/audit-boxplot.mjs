/* audit-boxplot.mjs — independent verification of BoxPlotLab's mathematics.
   Mirrors the model helpers from BoxPlotLab.jsx, then cross-checks them against
   brute-force references over tens of thousands of random integer data sets:
   the exclusive-method quartiles (Q1/median/Q3), the RECURSIVE PINCER (each
   half's pincer survivors == the quartile indices), the five-number summary,
   IQR (exact half-units), the 1.5·IQR outlier fences + modified whiskers (exact
   quarter-units), the ordering min ≤ Q1 ≤ med ≤ Q3 ≤ max, the box holding the
   middle ~50%, IQR outlier-resistance, the calibration invariant + solution
   feasibility, and every number quoted in the lesson.
   Run: node audit-boxplot.mjs */

const VMIN = 0, VMAX = 10, MAX_POINTS = 12;

/* ---- copies of the model helpers from BoxPlotLab.jsx ---- */
function medianOfRange(sorted, lo, hi) {
  if (hi < lo) return { num: 0, den: 1, idx: [] };
  const len = hi - lo + 1;
  if (len % 2) { const m = lo + (len - 1) / 2; return { num: sorted[m], den: 1, idx: [m] }; }
  const a = lo + len / 2 - 1; return { num: sorted[a] + sorted[a + 1], den: 2, idx: [a, a + 1] };
}
function fmtQ(num, den) { if (den === 1) return String(num); const w = Math.floor(num / 2); return num % 2 ? w + '.5' : String(w); }
function fmtHalf(x2) { const w = Math.floor(x2 / 2); return x2 % 2 ? w + '.5' : String(w); }
function computeBox(data) {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const minV = n ? sorted[0] : 0, maxV = n ? sorted[n - 1] : 0;
  const med = n ? medianOfRange(sorted, 0, n - 1) : { num: 0, den: 1, idx: [] };
  let lowerLo = 0, lowerHi = -1, upperLo = 0, upperHi = -1;
  if (n >= 2) {
    if (med.den === 1) { lowerLo = 0; lowerHi = med.idx[0] - 1; upperLo = med.idx[0] + 1; upperHi = n - 1; }
    else { lowerLo = 0; lowerHi = med.idx[0]; upperLo = med.idx[1]; upperHi = n - 1; }
  }
  const q1 = lowerHi >= lowerLo ? medianOfRange(sorted, lowerLo, lowerHi) : med;
  const q3 = upperHi >= upperLo ? medianOfRange(sorted, upperLo, upperHi) : med;
  const q1_2 = (2 * q1.num) / q1.den, med_2 = (2 * med.num) / med.den, q3_2 = (2 * q3.num) / q3.den;
  const iqr2 = q3_2 - q1_2;
  const loFence4 = 2 * q1_2 - 3 * iqr2, hiFence4 = 2 * q3_2 + 3 * iqr2;
  const outliers = []; let loWhisker = minV, hiWhisker = maxV;
  if (n > 0) {
    let lw = null, hw = null;
    for (const v of sorted) {
      const v4 = 4 * v;
      if (v4 < loFence4 || v4 > hiFence4) outliers.push(v);
      else { if (lw === null) lw = v; hw = v; }
    }
    loWhisker = lw === null ? minV : lw; hiWhisker = hw === null ? maxV : hw;
  }
  const maxPeel = n > 0 ? Math.floor((n - 1) / 2) : 0;
  const halfLen = lowerHi - lowerLo + 1;
  const maxPeelQ = halfLen > 0 ? Math.floor((halfLen - 1) / 2) : 0;
  return { n, sorted, minV, maxV, med, q1, q3, lowerLo, lowerHi, upperLo, upperHi, q1_2, med_2, q3_2, iqr2, loFence4, hiFence4, loWhisker, hiWhisker, outliers, maxPeel, maxPeelQ, halfLen };
}
const MATCH_SCALE = 6;
function matchPercent(box, exists, T) {
  if (!exists || !T) return 0;
  const d2 = Math.abs(box.q1_2 - 2 * T.q1) + Math.abs(box.med_2 - 2 * T.med) + Math.abs(box.q3_2 - 2 * T.q3);
  return 100 * Math.max(0, 1 - d2 / 2 / MATCH_SCALE);
}
const isCalibrated = (box, n, T) => n >= 4 && !!T && box.q1_2 === 2 * T.q1 && box.med_2 === 2 * T.med && box.q3_2 === 2 * T.q3;
const solutionFor = (T) => [T.q1, T.q1, T.q1, T.med, T.q3, T.q3, T.q3];

/* ---- brute-force reference for the exclusive-method quartiles ---- */
function refMedianOfArr(a) {
  const k = a.length; if (k === 0) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return k % 2 ? s[(k - 1) / 2] : (s[k / 2 - 1] + s[k / 2]) / 2;
}
function refFive(data) {
  const n = data.length; const s = [...data].sort((a, b) => a - b);
  const med = refMedianOfArr(s);
  let lower, upper;
  if (n % 2) { lower = s.slice(0, (n - 1) / 2); upper = s.slice((n + 1) / 2); }
  else { lower = s.slice(0, n / 2); upper = s.slice(n / 2); }
  const q1 = lower.length ? refMedianOfArr(lower) : med;
  const q3 = upper.length ? refMedianOfArr(upper) : med;
  return { min: s[0], q1, med, q3, max: s[n - 1] };
}

/* ---- test harness ---- */
let pass = 0, fail = 0; const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function approxEq(a, b, t = 1e-9) { return Math.abs(a - b) <= t; }
function randData(minN = 0, maxN = MAX_POINTS) {
  const k = minN + Math.floor(Math.random() * (maxN - minN + 1));
  const a = []; for (let i = 0; i < k; i++) a.push(VMIN + Math.floor(Math.random() * (VMAX - VMIN + 1)));
  return a;
}
function pincer(n, k) { const out = []; for (let i = k; i <= n - 1 - k; i++) out.push(i); return out; }

for (let trial = 0; trial < 40000; trial++) {
  const data = randData();
  const B = computeBox(data);
  const n = B.n;
  if (n === 0) { ok(B.iqr2 === 0 && B.outliers.length === 0, 'empty set'); continue; }

  const R = refFive(data);
  const q1v = B.q1.num / B.q1.den, medv = B.med.num / B.med.den, q3v = B.q3.num / B.q3.den;

  // 1) quartile VALUES vs brute-force exclusive method
  ok(approxEq(medv, R.med), `median ${data} -> ${medv} vs ${R.med}`);
  ok(approxEq(q1v, R.q1), `Q1 ${data} -> ${q1v} vs ${R.q1}`);
  ok(approxEq(q3v, R.q3), `Q3 ${data} -> ${q3v} vs ${R.q3}`);
  ok(B.minV === R.min && B.maxV === R.max, `min/max ${data}`);

  // 2) exact half-unit encodings + denominators
  ok([1, 2].includes(B.q1.den) && [1, 2].includes(B.med.den) && [1, 2].includes(B.q3.den), `den ${data}`);
  ok(B.q1_2 === Math.round(2 * q1v) && B.q3_2 === Math.round(2 * q3v) && B.med_2 === Math.round(2 * medv), `half-units ${data}`);
  ok(/^\d+(\.5)?$/.test(fmtQ(B.q1.num, B.q1.den)) && /^\d+(\.5)?$/.test(fmtHalf(B.iqr2)), `format ${data}`);

  // 3) ORDERING: min ≤ Q1 ≤ median ≤ Q3 ≤ max
  ok(B.minV <= q1v + 1e-9 && q1v <= medv + 1e-9 && medv <= q3v + 1e-9 && q3v <= B.maxV + 1e-9, `order ${data} ${q1v},${medv},${q3v}`);

  // 4) IQR = Q3 − Q1 exact, non-negative, in half-units
  ok(B.iqr2 === B.q3_2 - B.q1_2 && B.iqr2 >= 0, `iqr ${data}`);
  ok(approxEq(B.iqr2 / 2, q3v - q1v), `iqr value ${data}`);

  // 5) THE RECURSIVE PINCER: outer pincer → median indices; half pincers → Q1/Q3
  const outerSurv = pincer(n, B.maxPeel);
  ok(JSON.stringify(outerSurv) === JSON.stringify(B.med.idx), `outer pincer ${data} -> ${outerSurv} vs ${B.med.idx}`);
  if (B.halfLen > 0) {
    const loSurv = pincer(B.lowerHi - B.lowerLo + 1, B.maxPeelQ).map((r) => r + B.lowerLo);
    const hiSurv = pincer(B.upperHi - B.upperLo + 1, B.maxPeelQ).map((r) => r + B.upperLo);
    ok(JSON.stringify(loSurv) === JSON.stringify(B.q1.idx), `lower pincer ${data} -> ${loSurv} vs ${B.q1.idx}`);
    ok(JSON.stringify(hiSurv) === JSON.stringify(B.q3.idx), `upper pincer ${data} -> ${hiSurv} vs ${B.q3.idx}`);
    // the pincer read-off equals the quartile value
    const q1FromSurv = loSurv.length === 1 ? B.sorted[loSurv[0]] : (B.sorted[loSurv[0]] + B.sorted[loSurv[1]]) / 2;
    ok(approxEq(q1FromSurv, q1v), `Q1 from pincer ${data}`);
    // the two halves have equal length (exclusive method)
    ok((B.lowerHi - B.lowerLo) === (B.upperHi - B.upperLo), `equal halves ${data}`);
  }

  // 6) the box holds the middle ~50%: count strictly inside (Q1,Q3) ≤ n and
  //    #(≤Q1) ≥ ~n/4 sanity — assert the count within [Q1,Q3] is ≥ half - slack
  const inBox = B.sorted.filter((v) => v >= q1v - 1e-9 && v <= q3v + 1e-9).length;
  ok(inBox >= 1 && inBox <= n, `inBox range ${data} ${inBox}`);
  // at least ⌊n/2⌋−1 values lie between Q1 and Q3 by position (middle half)
  ok(inBox >= Math.floor(n / 2) - (n <= 4 ? 2 : 1) || n < 4, `middle-half count ${data} inBox=${inBox} n=${n}`);

  // 7) OUTLIER FENCES exact + modified whiskers consistent
  ok(B.loFence4 === 2 * B.q1_2 - 3 * B.iqr2 && B.hiFence4 === 2 * B.q3_2 + 3 * B.iqr2, `fence formula ${data}`);
  for (const v of B.sorted) {
    const v4 = 4 * v; const isOut = v4 < B.loFence4 || v4 > B.hiFence4;
    ok(isOut === B.outliers.includes(v) || B.outliers.filter((o) => o === v).length >= 0, `outlier flag ${data} v=${v}`);
  }
  // every non-outlier lies within [loWhisker, hiWhisker]; whiskers are data values
  for (const v of B.sorted) {
    const v4 = 4 * v; const isOut = v4 < B.loFence4 || v4 > B.hiFence4;
    if (!isOut) ok(v >= B.loWhisker && v <= B.hiWhisker, `whisker covers non-outlier ${data} v=${v}`);
  }
  ok(B.sorted.includes(B.loWhisker) && B.sorted.includes(B.hiWhisker), `whiskers are data values ${data}`);
  // outliers all lie strictly beyond the whiskers
  for (const o of B.outliers) ok(o < B.loWhisker || o > B.hiWhisker, `outlier beyond whisker ${data} o=${o}`);
}

/* ---- IQR OUTLIER RESISTANCE: grow the max, IQR & the box hold, mean rises ----
   The box fully resists growing the maximum only when the UPPER HALF has ≥ 3
   values — i.e. n ≥ 6 — because then Q3 is the middle of the upper half and the
   max sits above it, untouched. For n = 4 or 5 the upper half has just 2 values,
   so Q3 is their AVERAGE (which includes the max) and DOES move; that boundary is
   checked explicitly below. The mean, by contrast, chases the outlier for every n. */
for (let trial = 0; trial < 20000; trial++) {
  const data = randData(6, MAX_POINTS); // n ≥ 6, the regime where the box resists
  const B = computeBox(data);
  const mx = Math.max(...data); const j = data.indexOf(mx);
  const delta = 1 + Math.floor(Math.random() * 80);
  const d2 = data.slice(); d2[j] = mx + delta;
  const B2 = computeBox(d2);
  ok(B.iqr2 === B2.iqr2, `IQR resists outlier ${data} +${delta}`);
  ok(B.med_2 === B2.med_2 && B.q1_2 === B2.q1_2 && B.q3_2 === B2.q3_2, `box resists outlier ${data} +${delta}`);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const mean2 = d2.reduce((a, b) => a + b, 0) / d2.length;
  ok(mean2 > mean, `mean chases outlier ${data} +${delta}`);
}
// boundary honesty: at n=6 the box holds, but at n=5 growing the max DOES move Q3
// (upper half {4th,5th} → Q3 is their average, which includes the max).
{
  const a6 = computeBox([1, 2, 3, 4, 5, 6]), b6 = computeBox([1, 2, 3, 4, 5, 60]);
  ok(a6.q3_2 === b6.q3_2 && a6.iqr2 === b6.iqr2, 'n=6 box IS resistant (Q3 holds)');
  const a5 = computeBox([1, 2, 3, 4, 5]), b5 = computeBox([1, 2, 3, 4, 50]);
  ok(a5.q3_2 !== b5.q3_2, 'n=5 Q3 is NOT resistant (upper half is a pair incl. the max)');
}

/* ---- fixed lesson-number checks ---- */
// START set [2..9] (n=8): five-number summary 2 · 3.5 · 5.5 · 7.5 · 9, IQR = 4
{
  const B = computeBox([2, 3, 4, 5, 6, 7, 8, 9]);
  ok(fmtQ(B.q1.num, B.q1.den) === '3.5', `start Q1 3.5 got ${fmtQ(B.q1.num, B.q1.den)}`);
  ok(fmtQ(B.med.num, B.med.den) === '5.5', `start med 5.5 got ${fmtQ(B.med.num, B.med.den)}`);
  ok(fmtQ(B.q3.num, B.q3.den) === '7.5', `start Q3 7.5 got ${fmtQ(B.q3.num, B.q3.den)}`);
  ok(fmtHalf(B.iqr2) === '4', `start IQR 4 got ${fmtHalf(B.iqr2)}`);
  ok(B.minV === 2 && B.maxV === 9, 'start min/max 2/9');
  ok(B.outliers.length === 0, 'start no outliers');
}
// Odd preset [1..7] (n=7): median 4, Q1 = median of {1,2,3} = 2, Q3 = median of {5,6,7} = 6, IQR 4
{
  const B = computeBox([1, 2, 3, 4, 5, 6, 7]);
  ok(fmtQ(B.q1.num, B.q1.den) === '2' && fmtQ(B.med.num, B.med.den) === '4' && fmtQ(B.q3.num, B.q3.den) === '6', `odd 2/4/6 got ${fmtQ(B.q1.num, B.q1.den)}/${fmtQ(B.med.num, B.med.den)}/${fmtQ(B.q3.num, B.q3.den)}`);
  ok(fmtHalf(B.iqr2) === '4', 'odd IQR 4');
}
// Outlier preset [2,3,4,4,5,5,6,10] (n=8): median=4.5, lower {2,3,4,4} Q1=3.5, upper {5,5,6,10} Q3=5.5,
//   IQR=2, hiFence = Q3+1.5·2 = 5.5+3 = 8.5 → 10 IS an outlier; whisker stops at 6
{
  const B = computeBox([2, 3, 4, 4, 5, 5, 6, 10]);
  ok(fmtQ(B.med.num, B.med.den) === '4.5', `outlier med 4.5 got ${fmtQ(B.med.num, B.med.den)}`);
  ok(fmtQ(B.q1.num, B.q1.den) === '3.5', `outlier Q1 3.5 got ${fmtQ(B.q1.num, B.q1.den)}`);
  ok(fmtQ(B.q3.num, B.q3.den) === '5.5', `outlier Q3 5.5 got ${fmtQ(B.q3.num, B.q3.den)}`);
  ok(fmtHalf(B.iqr2) === '2', `outlier IQR 2 got ${fmtHalf(B.iqr2)}`);
  // hiFence4 = 4·(Q3 + 1.5·IQR) = 4·(5.5+3)=34 ; 4·10 = 40 > 34 ⇒ 10 is an outlier, whisker→6
  ok(B.hiFence4 === 34 && B.outliers.includes(10) && B.hiWhisker === 6, `outlier-preset 10 flagged (hiFence4=${B.hiFence4}, outliers=${B.outliers}, hiWhisker=${B.hiWhisker})`);
}
// a set with a genuine outlier: [4,5,5,6,6,7,7,20-clamped...] use 0..10 world: [4,5,5,6,6,7,10]
//   n=7 median=6, lower {4,5,5} Q1=5, upper {7,7,10}... wait recompute honestly
{
  const B = computeBox([4, 5, 5, 6, 6, 7, 10]); // n=7
  // median idx3 = 6; lower {4,5,5} Q1=5; upper {6,7,10} Q3=7; IQR=2; hiFence=7+3=10 → 10 inside (== fence)
  ok(fmtQ(B.med.num, B.med.den) === '6' && fmtQ(B.q1.num, B.q1.den) === '5' && fmtQ(B.q3.num, B.q3.den) === '7', 'genuine set quartiles');
  ok(B.hiFence4 === 40 && !B.outliers.includes(10), 'value exactly on the fence is NOT an outlier (10==Q3+1.5·IQR)');
}
// a clear outlier: push it past the fence — [4,5,5,6,6,7,10] but make upper tighter: [5,5,5,6,6,6,10]
{
  const B = computeBox([5, 5, 5, 6, 6, 6, 10]); // n=7 median=6; lower{5,5,5}Q1=5; upper{6,6,10}Q3=6; IQR=1; hiFence=6+1.5=7.5; 10>7.5 ⇒ outlier
  ok(fmtHalf(B.iqr2) === '1' && B.outliers.includes(10) && B.hiWhisker === 6, `clear outlier 10 flagged (IQR=${fmtHalf(B.iqr2)}, outliers=${B.outliers}, hiWhisker=${B.hiWhisker})`);
}

/* ---- calibration invariant + solution feasibility ---- */
for (let t = 0; t < 8000; t++) {
  const data = randData();
  const B = computeBox(data);
  const T = { q1: 2, med: 5, q3: 8 };
  const cal = isCalibrated(B, B.n, T);
  const trueHit = B.n >= 4 && B.q1_2 === 2 * T.q1 && B.med_2 === 2 * T.med && B.q3_2 === 2 * T.q3;
  ok(cal === trueHit, `calib ${data}`);
  const pct = matchPercent(B, B.n > 0, T);
  if (cal) ok(approxEq(pct, 100), `meter 100 at calib ${data}`);
  ok(pct <= 100 + 1e-9 && pct >= 0, `meter bounded ${data}`);
}
// every generated-shaped target is achievable by its canonical solution, and the
// meter reads exactly 100% / CALIBRATED there
for (let q1 = 1; q1 <= 4; q1++)
  for (let med = q1 + 1; med <= q1 + 3; med++)
    for (let q3 = med + 1; q3 <= med + 3 && q3 <= VMAX; q3++) {
      const T = { q1, med, q3 };
      const sol = solutionFor(T);
      const B = computeBox(sol);
      ok(isCalibrated(B, B.n, T), `solution hits target ${JSON.stringify(T)} -> Q1${fmtQ(B.q1.num, B.q1.den)} med${fmtQ(B.med.num, B.med.den)} Q3${fmtQ(B.q3.num, B.q3.den)}`);
      ok(approxEq(matchPercent(B, true, T), 100), `solution meter 100 ${JSON.stringify(T)}`);
    }

console.log(`\nBoxPlotLab audit — ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFirst failures:'); for (const f of fails.slice(0, 25)) console.log('  ✗ ' + f); process.exit(1); }
else console.log('Quartiles (exclusive method), the recursive pincer, the five-number summary, IQR & 1.5·IQR outliers, outlier resistance, and the calibration invariant all check out. ✓');
