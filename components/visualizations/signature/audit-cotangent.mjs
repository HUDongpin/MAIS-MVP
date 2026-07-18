/* Numerical audit for CotangentFunctionLab.
   Mirrors the model + meter constants from the .jsx exactly, then checks:
   (1) the math the lesson teaches is true,
   (2) every calibration target is uniquely matchable on the student dial grid,
   (3) the meter constants read sensibly (exact=100%, one step off is clearly < that).
   Run: node audit-cotangent.mjs
*/
const PI = Math.PI;
const WORLD = { xmin: -2 * PI, xmax: 2 * PI, ymin: -4, ymax: 4 };
const START = { A: 1, B: 1, C: 0, D: 0 };

function model(x, p) {
  const theta = p.B * (x - p.C);
  return p.A * (Math.cos(theta) / Math.sin(theta)) + p.D;
}

const CLAMP = 6;
const SIN_EPS = 1e-4;
function clampV(y) {
  if (!isFinite(y)) return y > 0 ? CLAMP : -CLAMP;
  return y < -CLAMP ? -CLAMP : y > CLAMP ? CLAMP : y;
}
function rmsError(p, t) {
  const N = 480;
  let s = 0;
  let count = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    if (Math.abs(Math.sin(p.B * (x - p.C))) < SIN_EPS) continue;
    if (Math.abs(Math.sin(t.B * (x - t.C))) < SIN_EPS) continue;
    const d = clampV(model(x, p)) - clampV(model(x, t));
    s += d * d;
    count++;
  }
  return count ? Math.sqrt(s / count) : 0;
}
/* Emulate how an HTML range input serializes its value: a step count from min,
   then ~15 significant digits — which is NOT bit-identical to Math.PI/4. This is
   what a real student's dialed-in "exact" answer actually becomes. */
function sliderValue(min, step, target) {
  const k = Math.round((target - min) / step);
  return parseFloat((min + k * step).toPrecision(15));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.9)));
const MATCH_RMS = 0.05;

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ FAIL:', name, extra); }
};

/* ---- (1) MATH THE LESSON TEACHES ---------------------------------------- */
console.log('\n[1] Math identities & taught facts');

// cot(x) = cos/sin = 1/tan, at a spread of safe (non-asymptote) points
for (const x of [0.3, 0.9, 1.7, 2.5, -0.6, -2.2]) {
  const cot = Math.cos(x) / Math.sin(x);
  ok(`cot=cos/sin=1/tan at x=${x}`, Math.abs(cot - 1 / Math.tan(x)) < 1e-12);
}

// asymptotes of basic cot at multiples of π (sin=0); zeros at π/2 + nπ (cos=0)
for (const n of [-2, -1, 0, 1, 2]) {
  ok(`asymptote at ${n}π (|cot| huge)`, Math.abs(model(n * PI + 1e-6, START)) > 1e5);
  const zero = PI / 2 + n * PI;
  ok(`zero at π/2+${n}π`, Math.abs(model(zero, START)) < 1e-9);
}

// period π: cot(x) == cot(x+π)
for (const x of [0.4, 1.2, 2.9]) ok(`period π at x=${x}`, Math.abs(model(x, START) - model(x + PI, START)) < 1e-9);

// decreasing for A>0, increasing for A<0 (finite-difference slope inside one branch)
for (const A of [1, 2, -1, -1.5]) {
  const p = { A, B: 1, C: 0, D: 0 };
  let mono = true;
  let prev = null;
  for (let x = 0.15; x < PI - 0.15; x += 0.05) {
    const y = model(x, p);
    if (prev != null && Math.sign(y - prev) !== -Math.sign(A)) { mono = false; break; }
    prev = y;
  }
  ok(`A=${A} branch is ${A > 0 ? 'decreasing' : 'increasing'}`, mono);
}

// period = π/B, asymptotes at C + nπ/B, midline crossings at C + (π/2+nπ)/B
for (const B of [0.5, 1, 1.5, 2, 3]) {
  for (const C of [-PI / 4, 0, PI / 4]) {
    const p = { A: 1, B, C, D: 0 };
    const per = PI / B;
    ok(`period π/B for B=${B}`, Math.abs(model(0.3 + C, p) - model(0.3 + C + per, p)) < 1e-9);
    ok(`asymptote at C+π/B (B=${B},C=${C.toFixed(3)})`, Math.abs(model(C + per + 1e-6, p)) > 1e5);
    const cross = C + (PI / 2) / B;
    ok(`midline crossing at C+(π/2)/B (B=${B})`, Math.abs(model(cross, p)) < 1e-9);
  }
}

// D shifts vertically only; midline crossing value equals D
for (const D of [-2, 0, 1.5]) {
  const p = { A: 1, B: 1, C: 0, D };
  ok(`midline value = D=${D}`, Math.abs(model(PI / 2, p) - D) < 1e-9);
}

// A=0 collapses to the flat line y=D
ok('A=0 → flat line y=D', Math.abs(model(1.234, { A: 0, B: 1, C: 0, D: 2 }) - 2) < 1e-12);

/* ---- (2) CALIBRATION UNIQUENESS ----------------------------------------- */
console.log('\n[2] Calibration: every target uniquely matchable on the student grid');

// student dial grid (exactly the slider ranges/steps in the .jsx)
const grid = { A: [], B: [], C: [], D: [] };
for (let v = -3; v <= 3 + 1e-9; v += 0.5) grid.A.push(+v.toFixed(3));
for (let v = 0.5; v <= 3 + 1e-9; v += 0.5) grid.B.push(+v.toFixed(3));
for (let v = -PI / 2; v <= PI / 2 + 1e-9; v += PI / 4) grid.C.push(v);
for (let v = -3; v <= 3 + 1e-9; v += 0.5) grid.D.push(+v.toFixed(3));

const T_A = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
const T_B = [0.5, 1, 1.5];
const T_C = [-PI / 4, 0, PI / 4];
const T_D = [-2, -1, 0, 1, 2];
const near = (a, b) => Math.abs(a - b) < 1e-6;

let worstFalsePos = 0; // largest RMS among grid points that still "calibrate" but aren't the exact target
let minGap = Infinity; // smallest RMS among NON-matching grid points (how close a wrong answer can get)
let collisions = 0;
let targetCount = 0;
let worstExact = 0; // largest RMS at the exact target (should be ~0)

for (const A of T_A)
  for (const B of T_B)
    for (const C of T_C)
      for (const D of T_D) {
        const t = { A, B, C, D };
        targetCount++;
        worstExact = Math.max(worstExact, rmsError(t, t));
        for (const a of grid.A)
          for (const b of grid.B)
            for (const c of grid.C)
              for (const d of grid.D) {
                const s = { A: a, B: b, C: c, D: d };
                const isExact = near(a, A) && near(b, B) && near(c, C) && near(d, D);
                if (isExact) continue;
                const e = rmsError(s, t);
                if (e < MATCH_RMS) {
                  collisions++;
                  worstFalsePos = Math.max(worstFalsePos, e);
                  if (collisions <= 8)
                    console.log(
                      `  collision: target A=${A} B=${B} C=${C.toFixed(3)} D=${D} ` +
                        `matched by A=${a} B=${b} C=${c.toFixed(3)} D=${d} (rms=${e.toExponential(2)})`
                    );
                } else {
                  minGap = Math.min(minGap, e);
                }
              }
      }
ok(`worst exact-match RMS ≈ 0 (got ${worstExact.toExponential(2)})`, worstExact < MATCH_RMS);
ok(`no false-positive calibrations across ${targetCount} targets × grid (${collisions} found)`, collisions === 0);

// Real-world reachability: student dials the EXACT answer, but through sliders
// that truncate π/4. Every target must still cross the CALIBRATED threshold.
// (This is the case the bit-exact test above cannot see — and the one that bit us.)
let worstReach = 0;
for (const A of T_A)
  for (const B of T_B)
    for (const C of T_C)
      for (const D of T_D) {
        const t = { A, B, C, D };
        const dialed = {
          A: sliderValue(-3, 0.5, A),
          B: sliderValue(0.5, 0.5, B),
          C: sliderValue(-PI / 2, PI / 4, C),
          D: sliderValue(-3, 0.5, D),
        };
        worstReach = Math.max(worstReach, rmsError(dialed, t));
      }
ok(
  `every target reachable via truncating sliders (worst dialed-in RMS ${worstReach.toExponential(2)} < ${MATCH_RMS})`,
  worstReach < MATCH_RMS
);
console.log(`  worst RMS when the exact answer is dialed through real sliders: ${worstReach.toExponential(2)}`);
console.log(`  targets audited: ${targetCount}`);
console.log(`  closest a NON-matching grid point ever gets: rms=${minGap.toFixed(4)} (threshold ${MATCH_RMS})`);
console.log(`  safety margin: nearest wrong answer is ${(minGap / MATCH_RMS).toFixed(1)}× the CALIBRATED threshold`);

/* ---- (3) METER FEEL ------------------------------------------------------ */
console.log('\n[3] Meter mapping (exact should read 100%, one dial step off clearly less)');
const base = { A: 1, B: 1, C: 0, D: 0 };
console.log(`  exact match:            ${matchPercent(0).toFixed(0)}%  (rms 0)`);
const off = [
  ['A off by 0.5', { ...base, A: 1.5 }],
  ['B off by 0.5', { ...base, B: 1.5 }],
  ['C off by π/4', { ...base, C: PI / 4 }],
  ['D off by 0.5', { ...base, D: 0.5 }],
  ['D off by 1.0', { ...base, D: 1 }],
];
for (const [name, s] of off) {
  const e = rmsError(s, base);
  console.log(`  ${name.padEnd(16)} rms=${e.toFixed(3)}  →  ${matchPercent(e).toFixed(0)}%`);
}

console.log(`\n[summary] ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
