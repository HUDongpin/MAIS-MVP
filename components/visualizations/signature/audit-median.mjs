/* audit-median.mjs — independent verification of MedianLab's mathematics.
   Mirrors the model helpers from MedianLab.jsx, then cross-checks them against
   brute-force references over tens of thousands of random integer data sets:
   the median value & its exact ratio, the even/odd rule, the sort-to-the-middle
   PINCER (survivors == median indices), the 50/50 split, OUTLIER RESISTANCE
   (median unmoved when the max grows; mean chases), the exact mean formatter,
   the calibration invariant, and every number quoted in the lesson.
   Run: node audit-median.mjs */

const VMIN = 0, VMAX = 10, MAX_POINTS = 11;

/* ---- copies of the model helpers from MedianLab.jsx ---- */
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function reduceFrac(num, den) { const g = gcd(num, den); return { num: num / g, den: den / g }; }
function longDivide(num, den) {
  const intPart = Math.floor(num / den); let rem = num % den;
  if (rem === 0) return String(intPart);
  let frac = '', guard = 0;
  while (rem !== 0 && guard < 14) { rem *= 10; frac += Math.floor(rem / den); rem %= den; guard++; }
  return intPart + '.' + frac;
}
function terminates(den) { let d = den; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }
function roundedHundredths(num, den) {
  const H = Math.round((num * 100) / den);
  const whole = Math.floor(H / 100); const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}
function fmtMedian(medNum, medDen) {
  if (medDen === 1) return String(medNum);
  const whole = Math.floor(medNum / 2);
  return medNum % 2 ? whole + '.5' : String(whole);
}
function computeStats(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const sorted = [...data].sort((a, b) => a - b);
  const minV = n ? sorted[0] : 0;
  const maxV = n ? sorted[n - 1] : 0;
  let medNum = 0, medDen = 1, midIdx = [];
  if (n) {
    if (n % 2) { const m = (n - 1) / 2; medNum = sorted[m]; medDen = 1; midIdx = [m]; }
    else { const a = n / 2 - 1; medNum = sorted[a] + sorted[a + 1]; medDen = 2; midIdx = [a, a + 1]; }
  }
  const half = Math.floor(n / 2);
  const maxPeel = n > 0 ? Math.floor((n - 1) / 2) : 0;
  return { n, sum, sorted, minV, maxV, medNum, medDen, midIdx, half, maxPeel };
}
const MATCH_SCALE = 3;
const matchPercent = (medVal, exists, T) => (exists ? 100 * Math.max(0, 1 - Math.abs(medVal - T) / MATCH_SCALE) : 0);
const isCalibrated = (medNum, medDen, n, T) => n >= 3 && medNum === T * medDen;

/* ---- test harness ---- */
let pass = 0, fail = 0; const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function approxEq(a, b, tol = 1e-9) { return Math.abs(a - b) <= tol; }

function randData(minN = 0, maxN = MAX_POINTS) {
  const k = minN + Math.floor(Math.random() * (maxN - minN + 1));
  const arr = [];
  for (let i = 0; i < k; i++) arr.push(VMIN + Math.floor(Math.random() * (VMAX - VMIN + 1)));
  return arr;
}

// simulate the on-screen pincer: peel k pairs from each end, return surviving indices
function pincerSurvivors(n, k) {
  const lo = k, hi = n - 1 - k, out = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

for (let trial = 0; trial < 30000; trial++) {
  const data = randData();
  const st = computeStats(data);
  const n = st.n;

  if (n === 0) {
    ok(st.sum === 0 && st.medDen === 1 && st.medNum === 0 && st.half === 0 && st.maxPeel === 0, 'empty set');
    continue;
  }

  const s = [...data].sort((a, b) => a - b);
  const refMedian = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;

  // 1) median value matches brute reference
  const medVal = st.medNum / st.medDen;
  ok(approxEq(medVal, refMedian), `median ${data} -> ${medVal} vs ${refMedian}`);

  // 2) exact ratio: den 1 (odd) or den 2 (even), and fmtMedian is integer or ".5"
  ok(st.medDen === (n % 2 ? 1 : 2), `median den parity ${data} -> ${st.medDen}`);
  const mt = fmtMedian(st.medNum, st.medDen);
  ok(/^\d+(\.5)?$/.test(mt), `median format ${data} -> ${mt}`);
  ok(approxEq(parseFloat(mt), refMedian), `median text value ${data} -> ${mt} vs ${refMedian}`);
  // even median lies strictly between the two middles when they differ; equals them when identical
  if (n % 2 === 0) {
    const a = s[n / 2 - 1], b = s[n / 2];
    ok(medVal >= a && medVal <= b, `even median between middles ${data}`);
    ok(approxEq(medVal, (a + b) / 2), `even median = (a+b)/2 ${data}`);
  } else {
    ok(Number.isInteger(medVal) && s.includes(medVal), `odd median is a data value ${data}`);
  }

  // 3) THE PINCER: peeling maxPeel pairs leaves exactly the median indices, and
  //    the median read off the survivors equals medVal.
  const surv = pincerSurvivors(n, st.maxPeel);
  ok(JSON.stringify(surv) === JSON.stringify(st.midIdx), `pincer survivors ${data} k=${st.maxPeel} -> ${surv} vs ${st.midIdx}`);
  ok(surv.length === (n % 2 ? 1 : 2), `pincer count parity ${data} -> ${surv.length}`);
  const survMed = surv.length === 1 ? s[surv[0]] : (s[surv[0]] + s[surv[1]]) / 2;
  ok(approxEq(survMed, medVal), `pincer median ${data} -> ${survMed} vs ${medVal}`);
  // every non-survivor is crossed out exactly once as either a "smallest" or a "largest"
  ok(2 * st.maxPeel + surv.length === n, `pincer accounts for all ${data}`);

  // 4) THE 50/50 SPLIT (by position): ⌊n/2⌋ below the middle and ⌊n/2⌋ above.
  ok(st.half === Math.floor(n / 2), `half count ${data}`);
  // value-counts either side never exceed n/2 (ties may sit on the median)
  const below = s.filter((x) => x < medVal).length;
  const above = s.filter((x) => x > medVal).length;
  ok(below <= n / 2 && above <= n / 2, `split value-counts ${data} below=${below} above=${above}`);
  // positional halves: first ⌊n/2⌋ are ≤ median, last ⌊n/2⌋ are ≥ median
  for (let i = 0; i < st.half; i++) ok(s[i] <= medVal, `lower half ≤ median ${data} i=${i}`);
  for (let i = 0; i < st.half; i++) ok(s[n - 1 - i] >= medVal, `upper half ≥ median ${data} i=${i}`);

  // 5) range endpoints
  ok(st.minV === s[0] && st.maxV === s[n - 1], `min/max ${data}`);
}

/* ---- OUTLIER RESISTANCE: grow the max, median holds, mean rises ----
   The median is resistant for n ≥ 3: growing the maximum keeps it at the TOP of
   the sorted order, so it never touches a middle index and the median is exactly
   unchanged — while the mean always rises.  (The boundary n ≤ 2 is checked below:
   there the max IS a middle value, so the median is NOT resistant — that is why
   the median only earns its reputation on real, larger sets.) */
for (let trial = 0; trial < 20000; trial++) {
  const data = randData(3, MAX_POINTS); // n ≥ 3, the regime where the median resists
  const st = computeStats(data);
  const n = st.n;
  // pick an index holding a current maximum and push it higher
  const mx = Math.max(...data);
  const j = data.indexOf(mx);
  const delta = 1 + Math.floor(Math.random() * 90);
  const d2 = data.slice(); d2[j] = mx + delta;
  const st2 = computeStats(d2);
  // median is unchanged (the grown value stays at the top of the order)
  ok(st.medNum * st2.medDen === st2.medNum * st.medDen, `median resists outlier ${data} j=${j} +${delta}`);
  // mean strictly increases (the balance point chases the outlier)
  ok(st2.sum * n > st.sum * st2.n, `mean chases outlier ${data} +${delta}`);
}
// boundary honesty: for n = 1 and n = 2 the maximum IS a middle value, so growing
// it DOES move the median (the resistance claim is specifically an n ≥ 3 fact).
{
  const a1 = computeStats([5]), b1 = computeStats([65]);
  ok(a1.medNum / a1.medDen !== b1.medNum / b1.medDen, 'n=1 median is NOT resistant (moves)');
  const a2 = computeStats([0, 4]), b2 = computeStats([0, 40]);
  ok(a2.medNum / a2.medDen !== b2.medNum / b2.medDen, 'n=2 median is NOT resistant (moves)');
  // smallest resistant case: n = 3 holds
  const a3 = computeStats([0, 4, 5]), b3 = computeStats([0, 4, 50]);
  ok(a3.medNum / a3.medDen === b3.medNum / b3.medDen, 'n=3 median IS resistant (holds at 4)');
}

/* ---- fixed checks on the lesson's quiz numbers ---- */
function medOf(arr) { const st = computeStats(arr); return fmtMedian(st.medNum, st.medDen); }
// Step MIDDLE: median of 3,6,8,9 is 7 (even → (6+8)/2)
ok(medOf([3, 6, 8, 9]) === '7', `quiz even median = 7 got ${medOf([3, 6, 8, 9])}`);
ok((6 + 8) / 2 === 7, 'quiz (6+8)/2 = 7');
// distractor sanity: bigger-middle (8) and number-line-middle ((3+9)/2 = 6) are both wrong
ok(medOf([3, 6, 8, 9]) !== '8' && (3 + 9) / 2 === 6, 'quiz distractors are wrong');
// Step SPLIT: a set of 9 → 4 below, 4 above, 1 middle
ok(computeStats([0, 1, 2, 3, 4, 5, 6, 7, 8]).half === 4, 'quiz 9-value split = 4 each');
ok(9 % 2 === 1, 'quiz 9 is odd (1 in the middle)');
// Step DATA/ORDER: sorting is required; the START set median is 5
ok(medOf([2, 4, 5, 7, 8]) === '5', `start median = 5 got ${medOf([2, 4, 5, 7, 8])}`);
// preset medians
ok(medOf([1, 3, 4, 7, 8, 9]) === '5.5', `even preset median = 5.5 got ${medOf([1, 3, 4, 7, 8, 9])}`);
ok(medOf([1, 2, 2, 3, 3, 10]) === '2.5', `outlier preset median = 2.5 got ${medOf([1, 2, 2, 3, 3, 10])}`);
// outlier preset: median 2.5 well left of the mean
{
  const st = computeStats([1, 2, 2, 3, 3, 10]);
  const mean = st.sum / st.n; // 21/6 = 3.5
  ok(approxEq(mean, 3.5) && 2.5 < mean, 'outlier preset: median 2.5 < mean 3.5');
}

/* ---- fmtMedian / fmtRatio spot checks (no float artefacts) ---- */
ok(fmtMedian(9, 2) === '4.5', `9/2 → 4.5 got ${fmtMedian(9, 2)}`);
ok(fmtMedian(10, 2) === '5', `10/2 → 5 got ${fmtMedian(10, 2)}`);
ok(fmtMedian(7, 1) === '7', `7/1 → 7 got ${fmtMedian(7, 1)}`);
ok(fmtMedian(0, 1) === '0', `0/1 → 0 got ${fmtMedian(0, 1)}`);
ok(fmtRatio(1, 4).text === '0.25' && !fmtRatio(1, 4).approx, '1/4 = 0.25 exact');
ok(fmtRatio(1, 3).approx && fmtRatio(1, 3).text === '0.33', '1/3 ≈ 0.33 flagged approx');
ok(!fmtRatio(21, 6).approx && fmtRatio(21, 6).text === '3.5', `21/6 = 3.5 exact got ${fmtRatio(21, 6).text}`);
ok(fmtRatio(33, 7).approx && fmtRatio(33, 7).text === '4.71', `33/7 ≈ 4.71 got ${fmtRatio(33, 7).text}`);

/* ---- calibration invariant: isCalibrated ⇔ exact median hit, n≥3 ---- */
for (let t = 0; t < 8000; t++) {
  const data = randData();
  const st = computeStats(data);
  const T = 3 + Math.floor(Math.random() * 5);
  const cal = isCalibrated(st.medNum, st.medDen, st.n, T);
  const trueHit = st.n >= 3 && st.n > 0 && st.medNum / st.medDen === T;
  ok(cal === trueHit, `calib ${data} T=${T} -> ${cal} vs ${trueHit}`);
  // meter reads 100% exactly when calibrated, and 100% ⇒ exact hit
  const pct = matchPercent(st.n ? st.medNum / st.medDen : 0, st.n > 0, T);
  if (cal) ok(approxEq(pct, 100), `meter 100 at calib ${data} T=${T}`);
  ok(pct <= 100 + 1e-9 && pct >= 0, `meter bounded ${data}`);
}
// buildability: a target median T (3..7) is always reachable (e.g. [T,T,T], n=3)
for (let T = 3; T <= 7; T++) {
  const st = computeStats([T, T, T]);
  ok(isCalibrated(st.medNum, st.medDen, st.n, T), `target ${T} reachable via [${T},${T},${T}]`);
  // and via an even construction with a straddling pair
  if (T - 1 >= VMIN && T + 1 <= VMAX) {
    const st2 = computeStats([T - 1, T - 1, T + 1, T + 1]);
    ok(isCalibrated(st2.medNum, st2.medDen, st2.n, T), `target ${T} reachable via even straddle`);
  }
}

console.log(`\nMedianLab audit — ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFirst failures:'); for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f); process.exit(1); }
else console.log('Median value & ratio, the even/odd rule, the pincer survivors, the 50/50 split, outlier resistance, exact formatting, and the calibration invariant all check out. ✓');
