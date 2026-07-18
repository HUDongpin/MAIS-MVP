/* Numeric audit for ExponentialFunctionLab — mirrors the lab's math exactly.
   Run: node audit-exponential.mjs

   Correctness is paramount (this is Algebra for K-12 students), so this proves,
   without touching the DOM:
     1. y-intercept = a + k for every (a, b, k), because b^0 = 1.
     2. CONSTANT RATIO: gap(x+1) / gap(x) = b exactly for every x (the staircase).
     3. Growth / decay / constant classification matches b vs 1, and the percent
        rate is b = 1 + r.
     4. The asymptote: the gap a·b^x -> 0 but is never 0, so the curve approaches
        y = k without touching it.
     5. The compare-line matches the curve at x = 0 and x = 1 and nowhere else
        (adding vs multiplying really do diverge).
     6. Calibration: every target lands on the student's dial grid; an exact
        match gives RMS ~ 0 -> CALIBRATED; a single dial step away never
        calibrates; and within a whole neighbourhood the exact triple is the
        UNIQUE match (no accidental look-alike curve). Plus the meter feel. */

const WORLD = { xmin: -5, xmax: 5, ymin: -3, ymax: 7 };
const START = { a: 1, b: 2, k: 0 };
const MATCH_RMS = 0.03;
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.3)));

const model = (x, p) => p.a * Math.pow(p.b, x) + p.k;
const gap = (x, p) => p.a * Math.pow(p.b, x);
function compareLine(p) {
  const y0 = model(0, p);
  const y1 = model(1, p);
  const slope = y1 - y0;
  return (x) => y0 + slope * x;
}
function rmsError(p, t) {
  const N = 140;
  const CAP = 8;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    let d = model(x, p) - model(x, t);
    if (d > CAP) d = CAP;
    else if (d < -CAP) d = -CAP;
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}

// ---- grids exactly as the range inputs would serialize them ----------------
const trunc = (v) => parseFloat(v.toPrecision(15));
const grid = (min, max, step) => {
  const out = [];
  for (let v = min; v <= max + 1e-9; v += step) out.push(trunc(+v.toFixed(6)));
  return out;
};
const aGrid = grid(0.25, 4, 0.25);
const bGrid = grid(0.2, 3, 0.1);
const kGrid = grid(-3, 3, 0.5);

// target grids (a well-posed subset, mirrors the lab)
const A_TARGETS = grid(0.5, 3, 0.25);
const B_TARGETS = [...grid(0.3, 0.7, 0.1), ...grid(1.3, 2.6, 0.1)];
const K_TARGETS = grid(-2, 2, 0.5);

let pass = 0,
  fail = 0;
const bad = [];
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    bad.push(msg);
  }
};

// ---- 1. y-intercept = a + k -------------------------------------------------
for (const a of [0.25, 1, 2.5, 4])
  for (const b of [0.2, 0.5, 1, 2, 3])
    for (const k of [-3, -0.5, 0, 1.5, 3]) {
      const p = { a, b, k };
      ok(Math.abs(model(0, p) - (a + k)) < 1e-12, `y-intercept a+k at (${a},${b},${k})`);
    }

// ---- 2. CONSTANT RATIO: gap(x+1)/gap(x) = b (the staircase) -----------------
let worstRatioErr = 0;
for (const a of [0.25, 1, 3])
  for (const b of [0.2, 0.5, 0.8, 1, 1.3, 2, 3])
    for (let x = -5; x <= 4 + 1e-9; x += 0.5) {
      const p = { a, b, k: 0 };
      const r = gap(x + 1, p) / gap(x, p);
      worstRatioErr = Math.max(worstRatioErr, Math.abs(r - b));
      ok(Math.abs(r - b) < 1e-12, `constant ratio b at a=${a} b=${b} x=${x}`);
    }
// the ratio is b even with k != 0, because the gap is measured above the asymptote
for (const k of [-2, 1.5, 3]) {
  const p = { a: 1.5, b: 1.7, k };
  const r = gap(2, p) / gap(1, p);
  ok(Math.abs(r - 1.7) < 1e-12, `gap ratio = b independent of k (k=${k})`);
}

// ---- 3. growth / decay / constant + percent rate b = 1 + r -----------------
ok(model(1, { a: 1, b: 2, k: 0 }) > model(0, { a: 1, b: 2, k: 0 }), 'b>1 grows');
ok(model(1, { a: 1, b: 0.5, k: 0 }) < model(0, { a: 1, b: 0.5, k: 0 }), 'b<1 decays');
ok(model(1, { a: 1, b: 1, k: 0 }) === model(0, { a: 1, b: 1, k: 0 }), 'b=1 constant');
for (const [b, r] of [
  [1.3, 0.3],
  [1.5, 0.5],
  [0.8, -0.2],
  [0.9, -0.1],
])
  ok(Math.abs(b - 1 - r) < 1e-12, `percent rate b=1+r for b=${b}`);

// ---- 4. asymptote: gap -> 0, never 0; curve approaches k -------------------
for (const p of [
  { a: 1, b: 2, k: 0 }, // growth: gap -> 0 as x -> -inf
  { a: 2, b: 0.5, k: 1.5 }, // decay: gap -> 0 as x -> +inf
  { a: 1.5, b: 1.4, k: -2 },
]) {
  const far = p.b > 1 ? -40 : 40;
  const g = gap(far, p);
  ok(g > 0 && g < 1e-3, `gap -> 0 far out (${JSON.stringify(p)}) g=${g.toExponential(2)}`);
  ok(Math.abs(model(far, p) - p.k) < 1e-3, `curve -> asymptote k (${JSON.stringify(p)})`);
  // strictly never equals k anywhere
  ok(gap(0, p) !== 0 && gap(10, p) !== 0 && gap(-10, p) !== 0, `gap never 0 (${JSON.stringify(p)})`);
}

// ---- 5. compare-line: matches at x=0,1; diverges elsewhere -----------------
for (const p of [
  { a: 1, b: 2, k: 0 },
  { a: 2, b: 1.5, k: 1 },
  { a: 3, b: 0.5, k: -1 },
]) {
  const L = compareLine(p);
  ok(Math.abs(L(0) - model(0, p)) < 1e-12, `line meets curve x=0 ${JSON.stringify(p)}`);
  ok(Math.abs(L(1) - model(1, p)) < 1e-12, `line meets curve x=1 ${JSON.stringify(p)}`);
  // at x=2 an exponential with b != 1 must sit strictly off the line
  if (Math.abs(p.b - 1) > 1e-9)
    ok(Math.abs(L(2) - model(2, p)) > 1e-6, `line diverges from curve at x=2 ${JSON.stringify(p)}`);
}
// growth curve overtakes its line to the right; a line eventually outshoots decay downward
ok(model(3, { a: 1, b: 2, k: 0 }) > compareLine({ a: 1, b: 2, k: 0 })(3), 'exp growth beats the line');

// ---- 6. calibration --------------------------------------------------------
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);
let worstExactRms = 0;
let minSingleMiss = Infinity,
  minSingleWhat = null;
let uniquenessViolations = 0;

// every target must be reachable on the student's grid + exact -> CALIBRATED
for (const a of A_TARGETS)
  for (const b of B_TARGETS)
    for (const k of K_TARGETS) {
      ok(onGrid(a, aGrid) && onGrid(b, bGrid) && onGrid(k, kGrid), `target reachable (${a},${b},${k})`);
      const rExact = rmsError({ a, b, k }, { a, b, k });
      worstExactRms = Math.max(worstExactRms, rExact);
    }
ok(worstExactRms < MATCH_RMS, `every exact target CALIBRATED (worst ${worstExactRms.toExponential(2)})`);

// nearest single dial step away must never calibrate (no false stamp)
for (const a of A_TARGETS)
  for (const b of B_TARGETS)
    for (const k of K_TARGETS) {
      const t = { a, b, k };
      for (const [da, db, dk] of [
        [0.25, 0, 0],
        [-0.25, 0, 0],
        [0, 0.1, 0],
        [0, -0.1, 0],
        [0, 0, 0.5],
        [0, 0, -0.5],
      ]) {
        const p = { a: trunc(+(a + da).toFixed(6)), b: trunc(+(b + db).toFixed(6)), k: trunc(+(k + dk).toFixed(6)) };
        if (!onGrid(p.a, aGrid) || !onGrid(p.b, bGrid) || !onGrid(p.k, kGrid)) continue;
        const r = rmsError(p, t);
        if (r < minSingleMiss) {
          minSingleMiss = r;
          minSingleWhat = { t, p, rms: +r.toFixed(4) };
        }
      }
    }
ok(minSingleMiss > MATCH_RMS, `nearest single dial step stays above the stamp (min ${minSingleMiss.toFixed(4)})`);

// UNIQUENESS: within a ±3-step neighbourhood, only the exact triple calibrates
const idx = (v, g) => g.findIndex((gv) => Math.abs(gv - v) < 1e-9);
const SPAN = 3;
let worstRunnerUp = Infinity; // smallest non-exact RMS seen (should stay > MATCH_RMS)
for (const a of A_TARGETS)
  for (const b of B_TARGETS)
    for (const k of K_TARGETS) {
      const t = { a, b, k };
      const ia = idx(a, aGrid),
        ib = idx(b, bGrid),
        ik = idx(k, kGrid);
      for (let da = -SPAN; da <= SPAN; da++)
        for (let db = -SPAN; db <= SPAN; db++)
          for (let dk = -SPAN; dk <= SPAN; dk++) {
            if (da === 0 && db === 0 && dk === 0) continue;
            const ja = ia + da,
              jb = ib + db,
              jk = ik + dk;
            if (ja < 0 || ja >= aGrid.length || jb < 0 || jb >= bGrid.length || jk < 0 || jk >= kGrid.length)
              continue;
            const p = { a: aGrid[ja], b: bGrid[jb], k: kGrid[jk] };
            const r = rmsError(p, t);
            if (r < worstRunnerUp) worstRunnerUp = r;
            if (r < MATCH_RMS) uniquenessViolations++;
          }
    }
ok(uniquenessViolations === 0, `calibration unique in neighbourhood (violations ${uniquenessViolations})`);

// ---- meter feel ------------------------------------------------------------
const feel = [
  ['exact', rmsError({ a: 2, b: 1.6, k: 1 }, { a: 2, b: 1.6, k: 1 })],
  ['b off 0.1', rmsError({ a: 2, b: 1.7, k: 1 }, { a: 2, b: 1.6, k: 1 })],
  ['a off 0.25', rmsError({ a: 2.25, b: 1.6, k: 1 }, { a: 2, b: 1.6, k: 1 })],
  ['k off 0.5', rmsError({ a: 2, b: 1.6, k: 1.5 }, { a: 2, b: 1.6, k: 1 })],
  ['decay vs growth', rmsError({ a: 2, b: 0.5, k: 1 }, { a: 2, b: 1.6, k: 1 })],
];

console.log('ExponentialFunctionLab audit');
console.log('============================');
console.log(`constant-ratio worst error   : ${worstRatioErr.toExponential(2)}`);
console.log(`worst exact-target RMS       : ${worstExactRms.toExponential(2)}  (MATCH_RMS ${MATCH_RMS})`);
console.log(
  `nearest single dial-step RMS : ${minSingleMiss.toFixed(4)} -> match ${matchPercent(minSingleMiss).toFixed(0)}%  ${JSON.stringify(minSingleWhat)}`
);
console.log(`neighbourhood runner-up RMS  : ${worstRunnerUp.toFixed(4)}  (uniqueness violations ${uniquenessViolations})`);
console.log(`target space checked         : ${A_TARGETS.length}×${B_TARGETS.length}×${K_TARGETS.length} = ${A_TARGETS.length * B_TARGETS.length * K_TARGETS.length}`);
console.log('\nmeter feel:');
for (const [name, r] of feel)
  console.log(`  ${name.padEnd(16)} rms ${r.toFixed(3)}  -> ${matchPercent(r).toFixed(0)}%`);
console.log('\n-------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.slice(0, 20).forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
