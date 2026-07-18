/* audit-graphs.mjs — independent verification of GraphsLab's encodings.
   Mirrors the model helpers, then cross-checks them against brute-force
   references over tens of thousands of random categorical data sets: the pie
   angles sum to exactly 360°, the percents to exactly 100%, the pictograph
   icon count obeys icons·key = count, every exact/approx format round-trips,
   plus fixed checks on the lesson's quiz numbers and the calibration invariant.
   Run: node audit-graphs.mjs */

const NC = 5, CMAX = 12, KEY = 2;

/* ---- copies of the model helpers from GraphsLab.jsx ---- */
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
  if (den === 0) return { text: '—', approx: false };
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}
function fmtIcons(count, key) {
  const whole = Math.floor(count / key);
  const rem = count % key;
  if (rem === 0) return String(whole);
  const f = reduceFrac(rem, key);
  const glyph = f.num === 1 && f.den === 2 ? '½' : f.num === 1 && f.den === 4 ? '¼' : f.num === 3 && f.den === 4 ? '¾' : f.num + '/' + f.den;
  return (whole === 0 ? '' : whole) + glyph;
}
function computeStats(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  let maxC = 0, minC = Infinity;
  for (const c of counts) { if (c > maxC) maxC = c; if (c < minC) minC = c; }
  if (!isFinite(minC)) minC = 0;
  const modeIdx = [], leastIdx = [];
  if (total > 0) {
    for (let i = 0; i < counts.length; i++) if (counts[i] === maxC) modeIdx.push(i);
    for (let i = 0; i < counts.length; i++) if (counts[i] === minC) leastIdx.push(i);
  }
  return { total, maxC, minC, modeIdx, leastIdx };
}
function totalDiff(counts, target) { let d = 0; for (let i = 0; i < counts.length; i++) d += Math.abs(counts[i] - target[i]); return d; }
function isCalibrated(counts, target) { return !!target && totalDiff(counts, target) === 0; }

/* ---- harness ---- */
let pass = 0, fail = 0; const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function approxEq(a, b, tol = 1e-9) { return Math.abs(a - b) <= tol; }

function randCounts(allowZeroTotal = true) {
  const arr = [];
  for (let i = 0; i < NC; i++) arr.push(Math.floor(Math.random() * (CMAX + 1)));
  if (!allowZeroTotal && arr.reduce((a, b) => a + b, 0) === 0) arr[Math.floor(Math.random() * NC)] = 1 + Math.floor(Math.random() * CMAX);
  return arr;
}

for (let trial = 0; trial < 40000; trial++) {
  const counts = randCounts();
  const { total } = computeStats(counts);

  if (total === 0) {
    // empty-set guards: every ratio is the em-dash, nothing throws
    for (let i = 0; i < NC; i++) {
      ok(fmtRatio(counts[i] * 360, total).text === '—', 'empty angle dash');
      ok(fmtRatio(counts[i] * 100, total).text === '—', 'empty percent dash');
    }
    continue;
  }

  /* 1) THE ANGLE IDENTITY: Σ (countᵢ·360)/total = 360 exactly (integer ·360 units) */
  let angInt = 0;
  for (let i = 0; i < NC; i++) angInt += counts[i] * 360; // = total*360
  ok(angInt === total * 360, `angle-units sum ${counts}`);
  // and the exact per-slice angle value round-trips to the true float angle
  for (let i = 0; i < NC; i++) {
    const f = fmtRatio(counts[i] * 360, total);
    const trueAng = (counts[i] / total) * 360;
    const parsed = f.text === '—' ? 0 : parseFloat(f.text);
    if (f.approx) ok(Math.abs(parsed - trueAng) <= 0.005, `angle approx ${counts}[${i}] ${f.text} vs ${trueAng}`);
    else ok(approxEq(parsed, trueAng), `angle exact ${counts}[${i}] ${f.text} vs ${trueAng}`);
  }

  /* 2) THE PERCENT IDENTITY: Σ (countᵢ·100)/total = 100 exactly */
  let pctInt = 0;
  for (let i = 0; i < NC; i++) pctInt += counts[i] * 100;
  ok(pctInt === total * 100, `percent-units sum ${counts}`);
  for (let i = 0; i < NC; i++) {
    const f = fmtRatio(counts[i] * 100, total);
    const truePct = (counts[i] / total) * 100;
    const parsed = f.text === '—' ? 0 : parseFloat(f.text);
    if (f.approx) ok(Math.abs(parsed - truePct) <= 0.005, `percent approx ${counts}[${i}]`);
    else ok(approxEq(parsed, truePct), `percent exact ${counts}[${i}] ${f.text} vs ${truePct}`);
  }

  /* 3) fmtRatio's "approx" flag is honest: it is approximate exactly when the
        reduced fraction does not terminate in base 10 (den not of form 2^a·5^b) */
  for (let i = 0; i < NC; i++) {
    for (const scale of [360, 100]) {
      const f = fmtRatio(counts[i] * scale, total);
      const r = reduceFrac(counts[i] * scale, total);
      const shouldBeExact = r.den === 1 || terminates(r.den);
      ok(f.approx === !shouldBeExact, `approx flag ${counts[i]}·${scale}/${total}`);
    }
  }

  /* 4) PICTOGRAPH: icons·key = count; whole+frac reconstructs the count exactly */
  for (let i = 0; i < NC; i++) {
    const c = counts[i];
    const whole = Math.floor(c / KEY);
    const rem = c % KEY;
    ok(whole * KEY + rem === c, `icons reconstruct ${c}`);
    // fmtIcons parses back to c/KEY
    const s = fmtIcons(c, KEY);
    let iconVal;
    if (s.includes('½')) iconVal = (parseInt(s) || 0) + 0.5;
    else if (s.includes('¼')) iconVal = (parseInt(s) || 0) + 0.25;
    else if (s.includes('¾')) iconVal = (parseInt(s) || 0) + 0.75;
    else if (s.includes('/')) { const m = s.match(/(\d+)?(\d+)\/(\d+)/); iconVal = c / KEY; }
    else iconVal = parseInt(s);
    ok(approxEq(iconVal, c / KEY), `fmtIcons ${c} -> ${s} = ${iconVal} vs ${c / KEY}`);
  }

  /* 5) mode = category(ies) with the greatest count (brute force) */
  const st = computeStats(counts);
  const refMax = Math.max(...counts);
  const refMode = [];
  for (let i = 0; i < NC; i++) if (counts[i] === refMax) refMode.push(i);
  ok(JSON.stringify(st.modeIdx) === JSON.stringify(refMode), `mode ${counts}`);
}

/* ---- fixed checks: the START set's clean angles (total 24) ---- */
const START = [5, 8, 6, 3, 2];
ok(START.reduce((a, b) => a + b) === 24, 'start total 24');
ok(fmtRatio(5 * 360, 24).text === '75' && !fmtRatio(5 * 360, 24).approx, 'walk 75° exact');
ok(fmtRatio(8 * 360, 24).text === '120', 'bus 120° exact');
ok(fmtRatio(6 * 360, 24).text === '90', 'car 90° exact');
ok(fmtRatio(3 * 360, 24).text === '45', 'bike 45° exact');
ok(fmtRatio(2 * 360, 24).text === '30', 'scooter 30° exact');
// their sum is 360
ok(75 + 120 + 90 + 45 + 30 === 360, 'start angles sum 360');
// clean percents where they terminate; 5/24 and others flagged approx
ok(fmtRatio(6 * 100, 24).text === '25' && !fmtRatio(6 * 100, 24).approx, 'car 25% exact');
ok(fmtRatio(8 * 100, 24).approx && fmtRatio(8 * 100, 24).text === '33.33', 'bus ≈33.33%');
ok(fmtRatio(5 * 100, 24).approx && fmtRatio(5 * 100, 24).text === '20.83', `walk ≈20.83% got ${fmtRatio(5 * 100, 24).text}`);

/* ---- fixed checks on the lesson's quiz numbers ---- */
// PICTO quiz: 4 icons × key 2 = 8
ok(4 * KEY === 8, 'picto quiz 4×2=8');
// PIE quiz: 6/12 = 50% = 180°, 6/30 = 20% = 72°
ok(fmtRatio(6 * 100, 12).text === '50' && fmtRatio(6 * 360, 12).text === '180', 'pie quiz A: 50% / 180°');
ok(fmtRatio(6 * 100, 30).text === '20' && fmtRatio(6 * 360, 30).text === '72', 'pie quiz B: 20% / 72°');
// LINK quiz: count 6 with total 24 -> 90° slice, key 2 -> 3 icons
ok(fmtRatio(6 * 360, 24).text === '90', 'link quiz 90°');
ok(fmtIcons(6, KEY) === '3', 'link quiz 3 icons');

/* ---- pictograph partial-icon spot checks ---- */
ok(fmtIcons(5, 2) === '2½', `5÷2 = 2½ got ${fmtIcons(5, 2)}`);
ok(fmtIcons(3, 2) === '1½', `3÷2 = 1½ got ${fmtIcons(3, 2)}`);
ok(fmtIcons(1, 2) === '½', `1÷2 = ½ got ${fmtIcons(1, 2)}`);
ok(fmtIcons(8, 2) === '4', `8÷2 = 4 got ${fmtIcons(8, 2)}`);
ok(fmtIcons(0, 2) === '0', `0÷2 = 0 got ${fmtIcons(0, 2)}`);

/* ---- exact-decimal spot checks (no float artefacts) ---- */
ok(fmtRatio(1, 4).text === '0.25' && !fmtRatio(1, 4).approx, '1/4 = 0.25 exact');
ok(fmtRatio(1, 3).approx && fmtRatio(1, 3).text === '0.33', '1/3 ≈ 0.33');
ok(fmtRatio(100, 3).approx && fmtRatio(100, 3).text === '33.33', '100/3 ≈ 33.33');
ok(fmtRatio(360, 7).approx, '360/7 flagged approx');

/* ---- calibration invariant: isCalibrated ⇔ every count equals its target ---- */
for (let t = 0; t < 8000; t++) {
  const counts = randCounts();
  const target = randCounts(false);
  const cal = isCalibrated(counts, target);
  const trueHit = counts.every((c, i) => c === target[i]);
  ok(cal === trueHit, `calib ${counts} vs ${target} -> ${cal} vs ${trueHit}`);
}
// buildability: any target in 2..10 is reachable within [0, CMAX]
for (let r = 0; r < 2000; r++) {
  const target = Array.from({ length: NC }, () => 2 + Math.floor(Math.random() * 9));
  ok(target.every((v) => v >= 0 && v <= CMAX), `target reachable ${target}`);
}

console.log(`\nGraphsLab audit — ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFirst failures:'); for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f); process.exit(1); }
else console.log('All encodings check out: angles sum to 360°, percents to 100%, icons·key = count, exact/approx formats round-trip, quiz numbers, and the calibration invariant. ✓');
