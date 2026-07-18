/* Numeric audit for DerivativeLab — mirrors the lab's math exactly.
   Run: node audit-derivative.mjs

   Correctness is paramount (this is calculus for K-12 / AP students), so this
   proves, without touching the DOM:
     1. Each hand-written derivative f'(x) matches a high-accuracy central
        difference everywhere in the window (the derivative RULES are correct).
     2. The secant slope -> f'(a) as h -> 0 (the limit definition holds).
     3. Turning points sit exactly where f'(x) = 0.
     4. The tangent line touches the curve: T(a) = f(a) and slope T = f'(a).
     5. Calibration: exact target a* -> RMS 0 -> CALIBRATED; the nearest single
        dial step stays clearly below the stamp; the meter feels right.
     6. Every calibration target a* is reachable on the student's a-grid. */

const WORLD = { xmin: -6, xmax: 6, ymin: -6, ymax: 6 };
const START = { a: 1.5, h: 2 };
const MATCH_RMS = 0.03;
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.6)));

const FUNCS = {
  parabola: { f: (x) => (x * x) / 4, df: (x) => x / 2 },
  cubic: { f: (x) => (x * x * x) / 12 - x, df: (x) => (x * x) / 4 - 1 },
  sine: { f: (x) => 2 * Math.sin(x), df: (x) => 2 * Math.cos(x) },
};
const FN_IDS = ['parabola', 'cubic', 'sine'];

const secantSlope = (fn, a, h) => (FUNCS[fn].f(a + h) - FUNCS[fn].f(a)) / h;
const tangentAt = (fn, a) => {
  const s = FUNCS[fn].df(a);
  const y0 = FUNCS[fn].f(a);
  return (x) => y0 + s * (x - a);
};
function tangentRms(fn, a1, a2) {
  const L1 = tangentAt(fn, a1);
  const L2 = tangentAt(fn, a2);
  const N = 160;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const d = L1(x) - L2(x);
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}

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

// ---- 1. derivative RULES are correct (vs. central difference) --------------
let worstDerr = 0,
  worstDwhere = null;
for (const fn of FN_IDS) {
  const F = FUNCS[fn];
  for (let x = WORLD.xmin; x <= WORLD.xmax + 1e-9; x += 0.05) {
    const e = 1e-5;
    const num = (F.f(x + e) - F.f(x - e)) / (2 * e); // O(e^2) central difference
    const err = Math.abs(num - F.df(x));
    if (err > worstDerr) {
      worstDerr = err;
      worstDwhere = { fn, x: +x.toFixed(2) };
    }
    ok(err < 1e-6, `derivative rule ${fn} at x=${x.toFixed(2)} (err ${err.toExponential(2)})`);
  }
}

// ---- 2. limit definition: secant slope -> f'(a) as h -> 0 ------------------
let worstLimGap = 0;
for (const fn of FN_IDS) {
  for (const a of [-3, -1.25, 0, 0.75, 2, 3.5]) {
    let prevGap = Infinity;
    for (const h of [1, 0.5, 0.25, 0.1, 0.01, 0.001]) {
      const gap = Math.abs(secantSlope(fn, a, h) - FUNCS[fn].df(a));
      // gap must shrink monotonically toward 0 as h shrinks
      ok(gap <= prevGap + 1e-9, `secant converging ${fn} a=${a} h=${h} (gap ${gap.toExponential(2)})`);
      prevGap = gap;
      if (h === 0.001) {
        worstLimGap = Math.max(worstLimGap, gap);
        ok(gap < 1e-2, `secant≈tangent at h=0.001 ${fn} a=${a} (gap ${gap.toExponential(2)})`);
      }
    }
  }
}

// ---- 3. turning points sit exactly where f'(x) = 0 -------------------------
ok(Math.abs(FUNCS.parabola.df(0)) < 1e-12, 'parabola: f′(0)=0 (vertex)');
ok(Math.abs(FUNCS.cubic.df(2)) < 1e-12, 'cubic: f′(2)=0 (local min)');
ok(Math.abs(FUNCS.cubic.df(-2)) < 1e-12, 'cubic: f′(−2)=0 (local max)');
ok(Math.abs(FUNCS.sine.df(Math.PI / 2)) < 1e-12, 'sine: f′(π/2)=0 (peak)');
ok(Math.abs(FUNCS.sine.df(-Math.PI / 2)) < 1e-12, 'sine: f′(−π/2)=0 (trough)');
// sign of f' matches rising/falling either side of a cubic turning point
ok(FUNCS.cubic.df(-3) > 0, 'cubic rising left of local max');
ok(FUNCS.cubic.df(0) < 0, 'cubic falling between the turning points');
ok(FUNCS.cubic.df(3) > 0, 'cubic rising right of local min');

// ---- 4. tangent line touches the curve at P --------------------------------
for (const fn of FN_IDS) {
  for (const a of [-4, -1.5, 0.25, 2.75, 4]) {
    const T = tangentAt(fn, a);
    ok(Math.abs(T(a) - FUNCS[fn].f(a)) < 1e-12, `tangent meets curve ${fn} a=${a}`);
    const slope = (T(a + 1) - T(a)) / 1;
    ok(Math.abs(slope - FUNCS[fn].df(a)) < 1e-12, `tangent slope = f′(a) ${fn} a=${a}`);
  }
}

// ---- dial grids exactly as the range inputs would serialize them -----------
const trunc = (v) => parseFloat(v.toPrecision(15));
const aGrid = [];
for (let v = -4.5; v <= 4.5 + 1e-9; v += 0.25) aGrid.push(trunc(v));
const targetGrid = [];
for (let v = -4; v <= 4 + 1e-9; v += 0.5) targetGrid.push(trunc(v));

// ---- 5/6. calibration: every target reachable, exact -> CALIBRATED ---------
let worstExactRms = 0;
let minMissRms = Infinity,
  minMissWhat = null;
for (const fn of FN_IDS) {
  for (const aStar of targetGrid) {
    if (Math.abs(aStar - START.a) < 1e-9) continue; // makeTarget excludes the start
    // reachable on the student's a-grid?
    ok(
      aGrid.some((av) => Math.abs(av - aStar) < 1e-9),
      `target a*=${aStar} reachable on a-grid (${fn})`
    );
    // exact match -> RMS 0 -> CALIBRATED
    const rExact = tangentRms(fn, aStar, aStar);
    worstExactRms = Math.max(worstExactRms, rExact);
    ok(rExact < MATCH_RMS, `exact target CALIBRATED ${fn} a*=${aStar} (rms ${rExact})`);
    // nearest single a-step away must NOT be calibrated (avoid false stamp)
    for (const da of [0.25, -0.25]) {
      const near = trunc(aStar + da);
      if (near < -4.5 - 1e-9 || near > 4.5 + 1e-9) continue;
      const r = tangentRms(fn, near, aStar);
      if (r < minMissRms) {
        minMissRms = r;
        minMissWhat = { fn, aStar, near, rms: +r.toFixed(4) };
      }
    }
  }
}
ok(minMissRms > MATCH_RMS, `nearest single a-step stays above the stamp (min ${minMissRms.toFixed(4)})`);

// ---- meter feel ------------------------------------------------------------
const feel = [
  ['exact', tangentRms('cubic', 2, 2)],
  ['a off 0.25', tangentRms('cubic', 2.25, 2)],
  ['a off 0.5', tangentRms('cubic', 2.5, 2)],
  ['a off 1.0', tangentRms('parabola', 1, 2)],
  ['wrong region', tangentRms('sine', -3, 2)],
];

console.log('DerivativeLab audit');
console.log('===================');
console.log(`derivative rule worst error : ${worstDerr.toExponential(2)}  at ${JSON.stringify(worstDwhere)}`);
console.log(`limit gap at h=0.001 (worst) : ${worstLimGap.toExponential(2)}`);
console.log(`worst exact-target RMS       : ${worstExactRms.toExponential(2)}  (MATCH_RMS ${MATCH_RMS})`);
console.log(
  `nearest single a-step RMS    : ${minMissRms.toFixed(4)} -> match ${matchPercent(minMissRms).toFixed(0)}%  ${JSON.stringify(minMissWhat)}`
);
console.log('\nmeter feel:');
for (const [name, r] of feel)
  console.log(`  ${name.padEnd(13)} rms ${r.toFixed(3)}  -> ${matchPercent(r).toFixed(0)}%`);
console.log('\n-------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.slice(0, 20).forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
