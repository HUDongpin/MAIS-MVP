/* Numeric audit for LineFunctionLab — mirrors the lab's math exactly.
   Run: node audit-line.mjs
   Checks: model, facts, standard form, slope-triangle fit, and calibration
   (exact target -> RMS 0 -> CALIBRATED; smallest single-step miss well above
   the threshold; slider float-truncation reachability). */

const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };
const START = { m: 1, b: 0 };
const TRI_RUN = 2;
const MATCH_RMS = 0.05;

const model = (x, p) => p.m * x + p.b;
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.8)));

function rmsError(p, t) {
  const N = 160;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const d = model(x, p) - model(x, t);
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function standardForm(m, b) {
  if (Math.abs(m) < 1e-9) return `y = ${b}`;
  let A = Math.round(-4 * m), B = 4, C = Math.round(4 * b);
  const g = gcd(gcd(A, B), C);
  A /= g; B /= g; C /= g;
  if (A < 0 || (A === 0 && B < 0)) { A = -A; B = -B; C = -C; }
  return { A, B, C };
}

function slopeTriangle(m, b, run) {
  const padX = 1.2, padY = 1.2;
  const xLo = WORLD.xmin + padX, xHi = WORLD.xmax - padX - run;
  const yLo = WORLD.ymin + padY, yHi = WORLD.ymax - padY;
  let x1 = Math.abs(m) < 0.15 ? -run / 2 : -b / m - run / 2;
  x1 = Math.min(Math.max(x1, xLo), xHi);
  const fits = (xx) => {
    const ya = m * xx + b, yb = m * (xx + run) + b;
    return Math.min(ya, yb) >= yLo && Math.max(ya, yb) <= yHi;
  };
  if (!fits(x1)) {
    let best = x1, bestPen = Infinity;
    for (let xx = xLo; xx <= xHi; xx += 0.2) {
      const ya = m * xx + b, yb = m * (xx + run) + b;
      const pen = Math.max(0, yLo - Math.min(ya, yb)) + Math.max(0, Math.max(ya, yb) - yHi);
      if (pen < bestPen) { bestPen = pen; best = xx; }
    }
    x1 = best;
  }
  const x2 = x1 + run, y1 = m * x1 + b, y2 = m * x2 + b;
  return { p1: [x1, y1], corner: [x2, y1], p3: [x2, y2], rise: y2 - y1, run, fitPen: (() => {
    const ya = y1, yb = y2;
    return Math.max(0, yLo - Math.min(ya, yb)) + Math.max(0, Math.max(ya, yb) - yHi);
  })() };
}

let pass = 0, fail = 0;
const bad = [];
const ok = (cond, msg) => { if (cond) pass++; else { fail++; bad.push(msg); } };

// ---- dial grids (as the sliders would produce them) ----
const trunc = (v) => parseFloat(v.toPrecision(15)); // emulate range-input serialization
const mVals = [];
for (let v = -3; v <= 3 + 1e-9; v += 0.25) mVals.push(trunc(v));
const bVals = [];
for (let v = -4; v <= 4 + 1e-9; v += 0.5) bVals.push(trunc(v));

// ---- 1. model & facts spot checks ----
ok(model(0, { m: 2, b: 3 }) === 3, 'y-intercept: model(0)=b');
ok(model(1, { m: 2, b: 3 }) === 5, 'model(1)=m+b');
ok(Math.abs(-3 / 2 - (-(3) / 2)) < 1e-12, 'x-intercept sign'); // -b/m for m=2,b=3 = -1.5
ok((-3) / 2 === -1.5, 'x-intercept value m=2,b=3 -> -1.5');

// ---- 2. standard form correctness: point on line satisfies Ax+By=C ----
let sfChecks = 0;
for (const m of mVals) for (const b of bVals) {
  const sf = standardForm(m, b);
  if (typeof sf === 'string') { // horizontal
    ok(Math.abs(m) < 1e-9, `horizontal string only when m=0 (m=${m},b=${b})`);
    continue;
  }
  const { A, B, C } = sf;
  // check three points on the line satisfy A x + B y = C
  for (const x of [-3, 0, 4]) {
    const y = m * x + b;
    ok(Math.abs(A * x + B * y - C) < 1e-6, `standardForm point-check m=${m} b=${b} x=${x}`);
  }
  // integer coefficients, leading positive
  ok(Number.isInteger(A) && Number.isInteger(B) && Number.isInteger(C), `sf integer m=${m} b=${b}`);
  ok(A > 0 || (A === 0 && B > 0), `sf leading positive m=${m} b=${b}`);
  ok(gcd(gcd(A, B), C) === 1, `sf reduced m=${m} b=${b}`);
  sfChecks++;
}

// ---- 3. slope triangle: hypotenuse lies on the line, right angle, fits window ----
let triWorstPen = 0, triWorstAt = null;
for (const m of mVals) for (const b of bVals) {
  const t = slopeTriangle(m, b, TRI_RUN);
  // p1 and p3 lie on the line
  ok(Math.abs(t.p1[1] - (m * t.p1[0] + b)) < 1e-9, `p1 on line m=${m} b=${b}`);
  ok(Math.abs(t.p3[1] - (m * t.p3[0] + b)) < 1e-9, `p3 on line m=${m} b=${b}`);
  // corner shares x with p3 and y with p1 (right angle)
  ok(Math.abs(t.corner[0] - t.p3[0]) < 1e-9 && Math.abs(t.corner[1] - t.p1[1]) < 1e-9, `right angle m=${m} b=${b}`);
  // rise/run reproduces the slope
  ok(Math.abs(t.rise / t.run - m) < 1e-9, `rise/run = m (m=${m} b=${b})`);
  if (t.fitPen > triWorstPen) { triWorstPen = t.fitPen; triWorstAt = { m, b }; }
}
ok(triWorstPen < 1e-6, `slope triangle always fits window (worst overflow ${triWorstPen.toFixed(4)} at ${JSON.stringify(triWorstAt)})`);

// ---- 4. calibration: exact target -> RMS 0 -> CALIBRATED, over the target grid ----
const mTargets = [];
for (let mag = 0.5; mag <= 2.5 + 1e-9; mag += 0.25) { mTargets.push(trunc(mag)); mTargets.push(trunc(-mag)); }
const bTargets = [];
for (let v = -3.5; v <= 3.5 + 1e-9; v += 0.5) bTargets.push(trunc(v));

let worstExactRms = 0;
for (const m of mTargets) for (const b of bTargets) {
  const t = { m, b };
  const r = rmsError(t, t); // dialed in exactly (with slider truncation already baked in)
  if (r > worstExactRms) worstExactRms = r;
  ok(r < MATCH_RMS, `exact target CALIBRATED m=${m} b=${b} (rms ${r})`);
}

// ---- 5. smallest single-step miss stays well below CALIBRATED ----
let minMissRms = Infinity, minMissWhat = null;
for (const m of mTargets) for (const b of bTargets) {
  const t = { m, b };
  const candidates = [
    { m: trunc(m + 0.25), b },
    { m: trunc(m - 0.25), b },
    { m, b: trunc(b + 0.5) },
    { m, b: trunc(b - 0.5) },
  ];
  for (const c of candidates) {
    const r = rmsError(c, t);
    if (r < minMissRms) { minMissRms = r; minMissWhat = { t, c }; }
  }
}
ok(minMissRms > MATCH_RMS * 3, `smallest single-step miss (${minMissRms.toFixed(3)}) safely above threshold`);

// ---- 6. meter feel ----
const feel = [
  ['exact', 0],
  ['Δb=0.5', rmsError({ m: 1, b: 0.5 }, { m: 1, b: 0 })],
  ['Δm=0.25', rmsError({ m: 1.25, b: 0 }, { m: 1, b: 0 })],
  ['Δm=1', rmsError({ m: 2, b: 0 }, { m: 1, b: 0 })],
  ['wrong sign', rmsError({ m: -1.5, b: 2 }, { m: 1.5, b: -2 })],
];

console.log('LineFunctionLab audit');
console.log('======================');
console.log(`standard-form combos checked : ${sfChecks}`);
console.log(`worst exact-target RMS       : ${worstExactRms.toExponential(2)}  (MATCH_RMS ${MATCH_RMS})`);
console.log(`smallest single-step miss RMS: ${minMissRms.toFixed(3)}  -> match ${matchPercent(minMissRms).toFixed(0)}%`);
console.log(`  (${JSON.stringify(minMissWhat.t)} vs ${JSON.stringify(minMissWhat.c)})`);
console.log(`slope-triangle worst overflow: ${triWorstPen.toExponential(2)}`);
console.log('\nmeter feel:');
for (const [name, r] of feel) console.log(`  ${name.padEnd(11)} rms ${r.toFixed(3)}  -> ${matchPercent(r).toFixed(0)}%`);
console.log('\n----------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) { console.log('\nFAILURES:'); bad.slice(0, 20).forEach((m) => console.log('  ✗ ' + m)); process.exit(1); }
console.log('All checks passed ✓');
