/* audit-mode.mjs — independent verification of ModeLab's mode logic.
   Mirrors the model helpers, then cross-checks them against brute-force
   references over hundreds of thousands of random frequency tables, plus fixed
   checks on the lesson's quiz numbers, the "no mode" rule, the categorical
   equivalence, and the calibration invariant.  Run:  node audit-mode.mjs */

const NUM_K = 8, MAX_STACK = 8, MAX_TOTAL = 24;

/* ---- copies of the model helpers from ModeLab.jsx ---- */
function computeMode(counts) {
  let n = 0, maxFreq = 0, minFreq = Infinity;
  const present = [];
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    n += c;
    if (c > 0) { present.push(i); if (c > maxFreq) maxFreq = c; if (c < minFreq) minFreq = c; }
  }
  if (present.length === 0) return { n: 0, maxFreq: 0, minFreq: 0, present: [], modes: [], noMode: false, distinct: 0 };
  const atMax = present.filter((i) => counts[i] === maxFreq);
  const noMode = present.length >= 2 && atMax.length === present.length;
  return { n, maxFreq, minFreq, present, modes: noMode ? [] : atMax.slice(), noMode, distinct: present.length };
}
function caseName(m) {
  if (m.n === 0) return '—';
  if (m.noMode) return 'no mode';
  const k = m.modes.length;
  return k === 1 ? 'unimodal' : k === 2 ? 'bimodal' : 'multimodal';
}
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
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
  if (r.den === 1) return { text: String(r.num), approx: false, value: r.num };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false, value: num / den };
  return { text: roundedHundredths(r.num, r.den), approx: true, value: num / den };
}
function numericCenters(counts) {
  let n = 0, sumV = 0;
  for (let i = 0; i < counts.length; i++) { n += counts[i]; sumV += counts[i] * (i + 1); }
  if (n === 0) return { n: 0, mean: null, median: null, meanFmt: null, medianFmt: null };
  const midLo = Math.floor((n - 1) / 2), midHi = Math.ceil((n - 1) / 2);
  let cum = 0, vLo = null, vHi = null;
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i]; if (c === 0) continue;
    const start = cum, end = cum + c - 1;
    if (vLo === null && midLo >= start && midLo <= end) vLo = i + 1;
    if (midHi >= start && midHi <= end) vHi = i + 1;
    cum += c;
  }
  const medFmt = fmtRatio(vLo + vHi, 2);
  const meanFmt = fmtRatio(sumV, n);
  return { n, mean: meanFmt.value, median: medFmt.value, meanFmt, medianFmt: medFmt };
}
function setEq(a, b) { if (a.length !== b.length) return false; const s = new Set(a); for (const x of b) if (!s.has(x)) return false; return true; }
function calibMatch(target, m) {
  if (target.kind === 'none') {
    if (m.n === 0) return { pct: 0, done: false };
    if (m.noMode) return { pct: 100, done: m.distinct >= 2 && m.n >= 3 };
    const spread = m.maxFreq - m.minFreq;
    const pct = Math.min(90, Math.max(0, 100 - spread * 34));
    return { pct, done: false };
  }
  const S = target.values, M = m.modeValues;
  const inter = M.filter((x) => S.includes(x)).length;
  const union = new Set([...S, ...M]).size;
  const pct = union ? (100 * inter) / union : 0;
  const done = setEq(M, S) && m.n >= 3;
  return { pct, done };
}

/* ---- brute-force references (deliberately independent of the model) ---- */
// Expand a count table into a flat multiset of values (1-indexed), then reason
// about it the "obvious" way.
function expand(counts) {
  const arr = [];
  for (let i = 0; i < counts.length; i++) for (let j = 0; j < counts[i]; j++) arr.push(i + 1);
  return arr;
}
function bruteMode(values) {
  // returns { modes: sorted value list ([] if no mode), noMode, maxFreq, n, distinct }
  const n = values.length;
  if (n === 0) return { modes: [], noMode: false, maxFreq: 0, n: 0, distinct: 0 };
  const freq = new Map();
  for (const v of values) freq.set(v, (freq.get(v) || 0) + 1);
  let maxFreq = 0;
  for (const c of freq.values()) if (c > maxFreq) maxFreq = c;
  const distinct = freq.size;
  const atMax = [...freq.keys()].filter((v) => freq.get(v) === maxFreq).sort((a, b) => a - b);
  // NO mode ⇔ every distinct value occurs equally often (and there are ≥ 2)
  const allEqual = distinct >= 2 && atMax.length === distinct;
  return { modes: allEqual ? [] : atMax, noMode: allEqual, maxFreq, n, distinct };
}
function bruteMean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function bruteMedian(values) {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/* ---- test harness ---- */
let pass = 0, fail = 0; const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function approxEq(a, b, tol = 1e-9) { return Math.abs(a - b) <= tol; }

function randCounts() {
  const counts = new Array(NUM_K).fill(0);
  let total = 0;
  const picks = Math.floor(Math.random() * 15); // 0..14 data points (includes empty)
  for (let i = 0; i < picks && total < MAX_TOTAL; i++) {
    const k = Math.floor(Math.random() * NUM_K);
    if (counts[k] < MAX_STACK) { counts[k]++; total++; }
  }
  return counts;
}

for (let trial = 0; trial < 60000; trial++) {
  const counts = randCounts();
  const values = expand(counts);
  const m = computeMode(counts);
  const ref = bruteMode(values);

  // 1) n & distinct
  ok(m.n === ref.n, `n ${counts} -> ${m.n} vs ${ref.n}`);
  ok(m.distinct === ref.distinct, `distinct ${counts}`);

  // 2) modes (as values) match brute force
  const modeVals = m.modes.map((i) => i + 1);
  ok(JSON.stringify(modeVals) === JSON.stringify(ref.modes), `modes ${counts} -> ${modeVals} vs ${ref.modes}`);

  // 3) the "no mode" rule
  ok(m.noMode === ref.noMode, `noMode ${counts} -> ${m.noMode} vs ${ref.noMode}`);

  // 4) max frequency
  ok(m.maxFreq === ref.maxFreq, `maxFreq ${counts}`);

  if (m.n > 0) {
    // 5) every mode really is a value at the maximum frequency
    for (const i of m.modes) ok(counts[i] === m.maxFreq, `mode-at-max ${counts} idx=${i}`);
    // 6) if there IS a mode, no non-mode present value reaches maxFreq
    if (!m.noMode) {
      const modeSet = new Set(m.modes);
      for (const i of m.present) if (!modeSet.has(i)) ok(counts[i] < m.maxFreq, `strict-loser ${counts} idx=${i}`);
    }
    // 7) classification consistency
    const name = caseName(m);
    if (m.noMode) ok(name === 'no mode', `case ${counts}`);
    else if (m.modes.length === 1) ok(name === 'unimodal', `case ${counts}`);
    else if (m.modes.length === 2) ok(name === 'bimodal', `case ${counts}`);
    else ok(name === 'multimodal', `case ${counts}`);

    // 8) numeric mean/median vs brute force (exact)
    const c = numericCenters(counts);
    ok(approxEq(c.meanFmt.value, bruteMean(values)), `mean ${counts} -> ${c.meanFmt.text}`);
    ok(approxEq(c.medianFmt.value, bruteMedian(values)), `median ${counts} -> ${c.medianFmt.text}`);
    ok(c.medianFmt.den === 1 || c.medianFmt.den === 2 || c.medianFmt.value === Math.round(c.medianFmt.value * 2) / 2,
      `median clean-half ${counts}`);
  }
}

/* ---- the "no mode" rule, on hand-picked cases ---- */
function cm(values) { return bruteMode(values); } // convenience via expand-free path
function fromValues(values) { const c = new Array(NUM_K).fill(0); for (const v of values) c[v - 1]++; return computeMode(c); }

// every value once -> no mode
ok(fromValues([1, 2, 3, 4]).noMode === true && fromValues([1, 2, 3, 4]).modes.length === 0, 'all-once -> no mode');
// full tie {1,1,2,2,3,3} -> no mode
ok(fromValues([1, 1, 2, 2, 3, 3]).noMode === true, '{1,1,2,2,3,3} -> no mode');
// partial tie {1,1,2,2,3} -> bimodal 1 & 2
{ const r = fromValues([1, 1, 2, 2, 3]); ok(r.noMode === false && setEq(r.modes.map((i) => i + 1), [1, 2]), '{1,1,2,2,3} -> bimodal 1,2'); }
// single repeated value {5,5,5} -> unimodal 5 (it occurs most often; others occur 0 times)
{ const r = fromValues([5, 5, 5]); ok(r.noMode === false && setEq(r.modes.map((i) => i + 1), [5]), '{5,5,5} -> unimodal 5'); }
// one repeat among singletons {1,1,2,3} -> unimodal 1
{ const r = fromValues([1, 1, 2, 3]); ok(setEq(r.modes.map((i) => i + 1), [1]) && !r.noMode, '{1,1,2,3} -> unimodal 1'); }

/* ---- fixed checks on the lesson's quiz numbers ---- */
// Step FREQ: frequency of 2 in 2,2,2,5,5,9 is 3
{ const c = new Array(NUM_K).fill(0); [2, 2, 2, 5, 5, 9].forEach((v) => { if (v <= NUM_K) c[v - 1]++; }); ok(c[1] === 3, 'quiz freq of 2 = 3'); }
// Step MODE: mode of 3,7,7,7,9 is 7
ok(setEq(fromValues([3, 7, 7, 7, 9]).modes.map((i) => i + 1), [7]), 'quiz mode = 7');
// Step COUNT: 1,1,2,2,5 is bimodal {1,2}
{ const r = fromValues([1, 1, 2, 2, 5]); ok(r.modes.length === 2 && setEq(r.modes.map((i) => i + 1), [1, 2]), 'quiz bimodal 1,2'); }
// Step CONTRAST: the mode can be the largest value — e.g. 1,2,8,8,8 has mode 8 = max
{ const r = fromValues([1, 2, 8, 8, 8]); ok(setEq(r.modes.map((i) => i + 1), [8]), 'mode can be the max'); }

/* ---- categorical mode uses the SAME machinery (index-based) ---- */
// favorite fruit [Apple2, Banana4, Cherry1, Grape3, Lemon1] -> mode index 1 (Banana)
{ const r = computeMode([2, 4, 1, 3, 1]); ok(r.modes.length === 1 && r.modes[0] === 1, 'categorical mode = Banana'); }
// a categorical tie [3,3,1] -> bimodal (indices 0,1)
{ const r = computeMode([3, 3, 1]); ok(r.modes.length === 2 && setEq(r.modes, [0, 1]), 'categorical bimodal'); }
// categorical all-equal [2,2,2] -> no mode
ok(computeMode([2, 2, 2]).noMode === true, 'categorical all-equal -> no mode');

/* ---- the toolbar presets really are what they claim ---- */
ok(fromValues4(computeMode([0, 1, 2, 4, 2, 1, 0, 0])) === 'unimodal', 'preset One mode -> unimodal');
{ const r = computeMode([0, 3, 1, 3, 1, 0, 0, 0]); ok(r.modes.length === 2 && setEq(r.modes.map((i) => i + 1), [2, 4]), 'preset Two modes -> bimodal 2,4'); }
ok(computeMode([0, 2, 2, 2, 0, 0, 0, 0]).noMode === true, 'preset No mode -> no mode');
function fromValues4(m) { return caseName(m); }

/* ---- calibration invariant: done ⇔ exact structural hit ---- */
for (let t = 0; t < 40000; t++) {
  const counts = randCounts();
  const m = computeMode(counts);
  const modeValues = m.modes.map((i) => i + 1);
  const vm = { n: m.n, maxFreq: m.maxFreq, minFreq: m.minFreq, modeValues, noMode: m.noMode, distinct: m.distinct };

  // unimodal target
  const v = 2 + Math.floor(Math.random() * 6);
  const uni = calibMatch({ kind: 'unimodal', values: [v], v }, vm);
  const trueUni = setEq(modeValues, [v]) && m.n >= 3;
  ok(uni.done === trueUni, `calib uni ${counts} v=${v} -> ${uni.done} vs ${trueUni}`);
  ok(uni.pct >= 0 && uni.pct <= 100, `uni pct range ${counts}`);
  if (uni.done) ok(Math.abs(uni.pct - 100) < 1e-9, `uni done -> 100% ${counts}`);

  // none target
  const none = calibMatch({ kind: 'none', values: [] }, vm);
  const trueNone = m.noMode && m.distinct >= 2 && m.n >= 3;
  ok(none.done === trueNone, `calib none ${counts} -> ${none.done} vs ${trueNone}`);
  ok(none.pct >= 0 && none.pct <= 100, `none pct range ${counts}`);
  if (none.done) ok(Math.abs(none.pct - 100) < 1e-9, `none done -> 100% ${counts}`);
}

// buildability: every unimodal goal v in 2..7 is reachable (three chips on v, none elsewhere)
for (let v = 2; v <= 7; v++) {
  const c = new Array(NUM_K).fill(0); c[v - 1] = 3;
  const m = computeMode(c);
  ok(setEq(m.modes.map((i) => i + 1), [v]) && m.n >= 3, `goal ${v} reachable`);
}
// a no-mode goal is reachable (e.g. two columns of equal height)
{ const c = [0, 2, 2, 0, 0, 0, 0, 0]; const m = computeMode(c); ok(m.noMode && m.distinct >= 2 && m.n >= 3, 'no-mode goal reachable'); }

console.log(`\nModeLab audit — ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFirst failures:'); for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f); process.exit(1); }
else console.log('Mode logic, the no-mode rule, classification, categorical equivalence, presets, exact mean/median, and the calibration invariant all check out. ✓');
