/* audit-mean.mjs — independent verification of MeanLab's arithmetic.
   Mirrors the model helpers, then cross-checks them against brute-force
   references over thousands of random integer tower sets, plus fixed checks on
   the lesson's quiz numbers, the exact-decimal formatter, the give/take
   identity, total = mean × n, leveling conservation, and the missing-value
   calibration generator + invariant.  Run: node audit-mean.mjs */

const HMIN = 1, HMAX = 10, MIN_TOWERS = 2, MAX_TOWERS = 8, CAL_N = 4;

/* ---- copies of the model helpers from MeanLab.jsx ---- */
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
function computeMean(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  return { n, sum };
}
function giveTakeXn(data, sum, n) {
  let give = 0, take = 0;
  for (const v of data) { const t = v * n - sum; if (t > 0) give += t; else if (t < 0) take += -t; }
  return { give, take };
}
const isCalibrated = (sum, n, T) => n === CAL_N && sum === T * n;

function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function makeCalib(prev) {
  let T, fixed, needed, guard = 0;
  do {
    T = randInt(4, 6);
    fixed = [randInt(1, 9), randInt(1, 9), randInt(1, 9)];
    const sf = fixed[0] + fixed[1] + fixed[2];
    needed = T * CAL_N - sf;
    guard++;
  } while (guard < 800 && (needed < HMIN || needed > HMAX || (prev && prev.T === T && prev.fixed.join(',') === fixed.join(','))));
  let start = needed >= 5 ? needed - 2 : needed + 2;
  start = Math.max(HMIN, Math.min(HMAX, start));
  if (start === needed) start = needed === HMIN ? HMIN + 1 : needed - 1;
  return { T, fixed, needed, unknownIndex: 3, data: [...fixed, start] };
}

/* ---- test harness ---- */
let pass = 0, fail = 0; const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function approxEq(a, b, tol = 1e-9) { return Math.abs(a - b) <= tol; }

function randData() {
  const k = randInt(MIN_TOWERS, MAX_TOWERS);
  const arr = [];
  for (let i = 0; i < k; i++) arr.push(randInt(HMIN, HMAX));
  return arr;
}

for (let trial = 0; trial < 30000; trial++) {
  const data = randData();
  const { n, sum } = computeMean(data);
  const refSum = data.reduce((a, b) => a + b, 0);
  const refMean = refSum / n;

  // 1) total (sum)
  ok(sum === refSum, `sum ${data}`);
  // every value is a legal cube height
  ok(data.every((v) => v >= HMIN && v <= HMAX), `heights in range ${data}`);
  ok(n >= MIN_TOWERS && n <= MAX_TOWERS, `count in range ${data}`);

  // 2) the mean, rendered exactly, parses back to the true mean
  const meanFmt = fmtRatio(sum, n);
  const parsed = parseFloat(meanFmt.text);
  if (meanFmt.approx) ok(Math.abs(parsed - refMean) <= 0.005, `mean approx ${data} -> ${meanFmt.text} vs ${refMean}`);
  else ok(approxEq(parsed, refMean), `mean exact ${data} -> ${meanFmt.text} vs ${refMean}`);
  // an integer mean is flagged non-approx, exactly when sum % n === 0
  ok((sum % n === 0) === (!meanFmt.approx && meanFmt.text.indexOf('.') === -1), `integer-mean flag ${data}`);

  // 3) total = mean × n  (checked in EXACT integers, the way the lab shows it:
  //    the total is the integer `sum`, never a float product sum/n·n).  With the
  //    reduced mean num/den, the identity total = mean × n is  num · n === sum · den.
  const mr = reduceFrac(sum, n);
  ok(mr.num * n === sum * mr.den, `mean*n exact ${data} -> ${mr.num}/${mr.den} × ${n} vs ${sum}`);
  // recover the total from the fair share and the count: mean × n === total
  ok((mr.num * n) / mr.den === sum, `recover total ${data}`);

  // 4) THE GIVE/TAKE IDENTITY: surplus above === shortfall below, exactly
  const { give, take } = giveTakeXn(data, sum, n);
  ok(give === take, `give/take ${data} give=${give} take=${take}`);
  // and Σ(v·n − sum) = 0 (the algebraic reason leveling always works)
  const torque = data.reduce((acc, v) => acc + (v * n - sum), 0);
  ok(torque === 0, `torque ${data} -> ${torque}`);
  // value-unit give is a valid ratio, and equals the whole-cube count when the mean is integer
  const gf = fmtRatio(give, n);
  ok(typeof gf.text === 'string' && gf.text.length > 0, `give fmt ${data}`);
  if (sum % n === 0) {
    const M = sum / n;
    const cubesGiven = data.reduce((a, v) => a + (v > M ? v - M : 0), 0);
    const cubesNeeded = data.reduce((a, v) => a + (v < M ? M - v : 0), 0);
    ok(cubesGiven === cubesNeeded, `whole-cube give/take ${data}`);
    ok(cubesGiven === give / n, `give/n = cubes ${data}`);
  }

  // 5) leveling conserves the total: n towers each at the mean hold Σ cubes
  ok(approxEq(refMean * n, sum), `level conserves ${data}`);
}

/* ---- fixed checks on the lesson's quiz numbers ---- */
function meanText(arr) { const { n, sum } = computeMean(arr); return fmtRatio(sum, n); }

// Step TOTAL: 3 + 5 + 2 + 6 = 16
ok([3, 5, 2, 6].reduce((a, b) => a + b) === 16, 'quiz total = 16');
// Step SHARE: 16 ÷ 4 = 4
ok(meanText([3, 5, 2, 6]).text === '4' && !meanText([3, 5, 2, 6]).approx, `quiz mean = 4 got ${meanText([3, 5, 2, 6]).text}`);
// Step RECT: total = mean × n = 7 × 3 = 21
ok(7 * 3 === 21, 'quiz mean*n = 21');
// Step GIVE: give = take (6 = 6) — conceptual, but verify a concrete set whose surplus is 6
{
  // set 2,2,8,8 has mean 5; towers above give (8-5)+(8-5)=6; below need (5-2)+(5-2)=6
  const d = [2, 2, 8, 8]; const { n, sum } = computeMean(d); const { give, take } = giveTakeXn(d, sum, n);
  ok(give / n === 6 && take / n === 6, `quiz give/take = 6 got ${give / n}/${take / n}`);
}
// Step FRAC: 1 + 2 + 2 + 4 + 4 = 13, 13 ÷ 5 = 2.6 (exact terminating, not approx)
ok([1, 2, 2, 4, 4].reduce((a, b) => a + b) === 13, 'quiz frac sum = 13');
ok(meanText([1, 2, 2, 4, 4]).text === '2.6' && !meanText([1, 2, 2, 4, 4]).approx, `quiz frac mean = 2.6 got ${meanText([1, 2, 2, 4, 4]).text}`);

/* ---- exact-decimal spot checks (no float artefacts) ---- */
ok(fmtRatio(1, 4).text === '0.25' && !fmtRatio(1, 4).approx, '1/4 = 0.25 exact');
ok(fmtRatio(1, 8).text === '0.125' && !fmtRatio(1, 8).approx, '1/8 = 0.125 exact');
ok(fmtRatio(21, 4).text === '5.25' && !fmtRatio(21, 4).approx, '21/4 = 5.25 exact');
ok(fmtRatio(13, 5).text === '2.6' && !fmtRatio(13, 5).approx, '13/5 = 2.6 exact');
ok(fmtRatio(1, 3).approx && fmtRatio(1, 3).text === '0.33', '1/3 ≈ 0.33 flagged approx');
ok(fmtRatio(47, 6).approx && fmtRatio(47, 6).text === '7.83', `47/6 ≈ 7.83 got ${fmtRatio(47, 6).text}`);
ok(fmtRatio(20, 4).text === '5' && !fmtRatio(20, 4).approx, '20/4 = 5 exact integer');

/* ---- the "Uneven" preset [4,4,4,9] has a fractional mean 21/4 = 5.25 ---- */
ok(meanText([4, 4, 4, 9]).text === '5.25' && !meanText([4, 4, 4, 9]).approx, `Uneven preset mean = 5.25 got ${meanText([4, 4, 4, 9]).text}`);
/* ---- START_DATA [3,8,4,5] and "Stairs" [1,3,5,7] both level to whole means ---- */
ok(meanText([3, 8, 4, 5]).text === '5' && !meanText([3, 8, 4, 5]).approx, 'START mean = 5');
ok(meanText([1, 3, 5, 7]).text === '4' && !meanText([1, 3, 5, 7]).approx, 'Stairs mean = 4');

/* ---- calibration: the missing-value generator is always solvable ---- */
for (let t = 0; t < 20000; t++) {
  const c = makeCalib(null);
  // the intended solution is a legal cube height
  ok(c.needed >= HMIN && c.needed <= HMAX, `calib needed in range T=${c.T} fixed=${c.fixed} needed=${c.needed}`);
  // plugging in the needed height hits the target exactly
  const solved = [...c.fixed, c.needed];
  const { n, sum } = computeMean(solved);
  ok(isCalibrated(sum, n, c.T), `calib solved hits target T=${c.T} fixed=${c.fixed}`);
  ok(sum / n === c.T, `calib solved mean === T ${solved} T=${c.T}`);
  // the starting (unsolved) tower is genuinely wrong
  const start = computeMean(c.data);
  ok(!isCalibrated(start.sum, start.n, c.T), `calib starts unsolved T=${c.T} data=${c.data}`);
  ok(c.data[c.unknownIndex] !== c.needed, `calib start != needed T=${c.T}`);
}

/* ---- calibration invariant: isCalibrated ⇔ exact mean hit at n = 4 ---- */
for (let t = 0; t < 5000; t++) {
  const data = randData(); const { n, sum } = computeMean(data); const T = randInt(4, 6);
  const cal = isCalibrated(sum, n, T);
  const trueHit = n === CAL_N && sum / n === T;
  ok(cal === trueHit, `calib invariant ${data} T=${T} -> ${cal} vs ${trueHit}`);
}

console.log(`\nMeanLab audit — ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFirst failures:'); for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f); process.exit(1); }
else console.log('All arithmetic — mean, total = mean × n, give = take, exact decimals, quiz numbers, and the missing-value calibration — checks out. ✓');
