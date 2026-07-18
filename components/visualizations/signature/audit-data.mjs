/* audit-data.mjs — independent verification of DataLab's statistics.
   Mirrors the model helpers, then cross-checks them against brute-force
   references over thousands of random integer data sets, plus fixed checks on
   the lesson's quiz numbers and the calibration invariant. Run: node audit-data.mjs */

const VMIN = 0, VMAX = 10, MAX_POINTS = 12;

/* ---- copies of the model helpers from DataLab.jsx ---- */
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
function computeStats(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const sorted = [...data].sort((a, b) => a - b);
  const freq = new Map();
  for (const v of data) freq.set(v, (freq.get(v) || 0) + 1);
  let maxFreq = 0; for (const c of freq.values()) if (c > maxFreq) maxFreq = c;
  const modes = [];
  if (maxFreq >= 2) { for (const [v, c] of freq) if (c === maxFreq) modes.push(v); modes.sort((a, b) => a - b); }
  const minV = n ? sorted[0] : 0; const maxV = n ? sorted[n - 1] : 0;
  let medNum = 0, medDen = 1;
  if (n) { if (n % 2) { medNum = sorted[(n - 1) / 2]; medDen = 1; } else { medNum = sorted[n / 2 - 1] + sorted[n / 2]; medDen = 2; } }
  return { n, sum, sorted, freq, maxFreq, modes, minV, maxV, medNum, medDen };
}
function balancePulls(data, sum, n) {
  let left = 0, right = 0;
  for (const v of data) { const t = v * n - sum; if (t < 0) left += -t; else if (t > 0) right += t; }
  return { left, right };
}

/* ---- test harness ---- */
let pass = 0, fail = 0; const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function approxEq(a, b, tol = 1e-9) { return Math.abs(a - b) <= tol; }

function randData() {
  const k = Math.floor(Math.random() * (MAX_POINTS + 1)); // 0..12 (include empty)
  const arr = [];
  for (let i = 0; i < k; i++) arr.push(VMIN + Math.floor(Math.random() * (VMAX - VMIN + 1)));
  return arr;
}

for (let trial = 0; trial < 20000; trial++) {
  const data = randData();
  const st = computeStats(data);
  const n = st.n;

  if (n === 0) {
    ok(st.modes.length === 0 && st.sum === 0, 'empty set stats');
    continue;
  }

  // reference mean/median/mode/range
  const refSum = data.reduce((a, b) => a + b, 0);
  const refMean = refSum / n;
  const s = [...data].sort((a, b) => a - b);
  const refMedian = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  const cnt = {}; for (const v of data) cnt[v] = (cnt[v] || 0) + 1;
  const mf = Math.max(...Object.values(cnt));
  const refModes = mf >= 2 ? Object.keys(cnt).filter((k) => cnt[k] === mf).map(Number).sort((a, b) => a - b) : [];
  const refRange = s[n - 1] - s[0];

  // 1) sum & mean value
  ok(st.sum === refSum, `sum ${data}`);
  const meanFmt = fmtRatio(st.sum, n);
  // parse displayed mean back to a number and compare to true mean within rounding
  const parsed = parseFloat(meanFmt.text);
  if (meanFmt.approx) ok(Math.abs(parsed - refMean) <= 0.005, `mean approx ${data} -> ${meanFmt.text} vs ${refMean}`);
  else ok(approxEq(parsed, refMean), `mean exact ${data} -> ${meanFmt.text} vs ${refMean}`);

  // 2) median value
  const medVal = st.medNum / st.medDen;
  ok(approxEq(medVal, refMedian), `median ${data} -> ${medVal} vs ${refMedian}`);
  // median must be integer or clean half
  ok(st.medDen === 1 || st.medDen === 2, `median den ${data} -> ${st.medDen}`);
  // median splits sorted data into equal halves (count below <= n/2 and above <= n/2)
  const below = s.filter((x) => x < medVal).length;
  const above = s.filter((x) => x > medVal).length;
  ok(below <= n / 2 && above <= n / 2, `median split ${data} below=${below} above=${above}`);

  // 3) modes
  ok(JSON.stringify(st.modes) === JSON.stringify(refModes), `modes ${data} -> ${st.modes} vs ${refModes}`);

  // 4) range
  ok(st.maxV - st.minV === refRange, `range ${data}`);

  // 5) THE BALANCE IDENTITY: left pull === right pull, exactly
  const { left, right } = balancePulls(data, st.sum, n);
  ok(left === right, `balance ${data} left=${left} right=${right}`);
  // and it equals Σ|xᵢ·n − sum| split — cross-check Σ(xᵢ·n − sum) === 0
  const torqueSum = data.reduce((acc, v) => acc + (v * n - st.sum), 0);
  ok(torqueSum === 0, `torque sum ${data} -> ${torqueSum}`);
  // per-side distance formatting is exact/again a valid ratio
  const pf = fmtRatio(left, n);
  ok(typeof pf.text === 'string' && pf.text.length > 0, `pull fmt ${data}`);
}

/* ---- fixed checks on the lesson's quiz numbers ---- */
function meanText(arr) { const st = computeStats(arr); return fmtRatio(st.sum, st.n); }
function medText(arr) { const st = computeStats(arr); return fmtRatio(st.medNum, st.medDen); }

// Step MODE: mode of 2,5,5,5,8,9 is 5
ok(computeStats([2, 5, 5, 5, 8, 9]).modes.join(',') === '5', 'quiz mode = 5');
// Step MEDIAN: median of 3,6,7,10 is 6.5
ok(medText([3, 6, 7, 10]).text === '6.5', `quiz median = 6.5 got ${medText([3, 6, 7, 10]).text}`);
// Step MEAN: mean of 4,6,6,8 is 6
ok(meanText([4, 6, 6, 8]).text === '6' && !meanText([4, 6, 6, 8]).approx, `quiz mean = 6 got ${meanText([4, 6, 6, 8]).text}`);
// Step MEAN feedback: 4+6+6+8 = 24, /4 = 6
ok([4, 6, 6, 8].reduce((a, b) => a + b) === 24, 'quiz sum = 24');

/* ---- exact-decimal spot checks (no float artefacts) ---- */
ok(fmtRatio(1, 4).text === '0.25' && !fmtRatio(1, 4).approx, '1/4 = 0.25 exact');
ok(fmtRatio(1, 8).text === '0.125' && !fmtRatio(1, 8).approx, '1/8 = 0.125 exact');
ok(fmtRatio(3, 10).text === '0.3' && !fmtRatio(3, 10).approx, '3/10 = 0.3 exact');
ok(fmtRatio(1, 3).approx && fmtRatio(1, 3).text === '0.33', '1/3 ≈ 0.33 flagged approx');
ok(fmtRatio(47, 6).approx && fmtRatio(47, 6).text === '7.83', `47/6 ≈ 7.83 got ${fmtRatio(47, 6).text}`);
ok(fmtRatio(10, 2).text === '5' && !fmtRatio(10, 2).approx, '10/2 = 5 exact integer');
ok(fmtRatio(2, 3).approx && fmtRatio(2, 3).text === '0.67', `2/3 ≈ 0.67 got ${fmtRatio(2, 3).text}`);

/* ---- calibration invariant: isCalibrated ⇔ exact mean hit, n≥3 ---- */
function isCalibrated(sum, n, T) { return n >= 3 && sum === T * n; }
for (let t = 0; t < 5000; t++) {
  const data = randData(); const st = computeStats(data); const T = 3 + Math.floor(Math.random() * 5);
  const cal = isCalibrated(st.sum, st.n, T);
  const trueHit = st.n >= 3 && st.n > 0 && st.sum / st.n === T;
  ok(cal === trueHit, `calib ${data} T=${T} -> ${cal} vs ${trueHit}`);
}
// buildability: a target mean T (3..7) is always reachable (e.g. n dots all = T, T in range)
for (let T = 3; T <= 7; T++) ok(T >= VMIN && T <= VMAX, `target ${T} within [${VMIN},${VMAX}]`);

console.log(`\nDataLab audit — ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFirst failures:'); for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f); process.exit(1); }
else console.log('All statistics, the balance identity, quiz numbers, exact decimals, and the calibration invariant check out. ✓');
