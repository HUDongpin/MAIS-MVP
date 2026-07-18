/* Numeric audit for DistanceLab — mirrors the lab's math exactly.
   Run: node audit-distance.mjs
   Checks: the distance model, the Pythagorean identity d² = Δx² + Δy², the
   symmetry / order-of-subtraction facts, the midpoint, degenerate segments,
   and calibration (exact target -> error 0 -> CALIBRATED; smallest single-step
   miss well above the threshold; slider float-truncation reachability). */

const WORLD = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
const START = { x1: -2, y1: -1, x2: 2, y2: 2 };
const RANGE = { min: -7, max: 7, step: 0.5 };
const MATCH_ERR = 0.03;

/* ---- model (identical to the lab) ---- */
function geometry(p) {
  const dx = p.x2 - p.x1;
  const dy = p.y2 - p.y1;
  return {
    dx, dy,
    dx2: dx * dx, dy2: dy * dy,
    sum: dx * dx + dy * dy,
    dist: Math.hypot(dx, dy),
    mx: (p.x1 + p.x2) / 2,
    my: (p.y1 + p.y2) / 2,
  };
}
function matchError(p, t) {
  const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const straight = d(p.x1, p.y1, t.x1, t.y1) + d(p.x2, p.y2, t.x2, t.y2);
  const swapped = d(p.x1, p.y1, t.x2, t.y2) + d(p.x2, p.y2, t.x1, t.y1);
  return Math.min(straight, swapped) / 2;
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 1.2)));

function sameSegment(a, b) {
  if (!a || !b) return false;
  const straight = a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2;
  const swapped = a.x1 === b.x2 && a.y1 === b.y2 && a.x2 === b.x1 && a.y2 === b.y1;
  return straight || swapped;
}

let pass = 0, fail = 0;
const bad = [];
const ok = (cond, msg) => { if (cond) pass++; else { fail++; bad.push(msg); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

/* emulate range-input serialization (parseFloat of a toString'd value) */
const trunc = (v) => parseFloat(v.toPrecision(15));
const grid = [];
for (let v = RANGE.min; v <= RANGE.max + 1e-9; v += RANGE.step) grid.push(trunc(v));

/* ---- 1. spot checks: the starting 3–4–5 triangle ---- */
{
  const g = geometry(START);
  ok(g.dx === 4, 'START run Δx = 4');
  ok(g.dy === 3, 'START rise Δy = 3');
  ok(g.dist === 5, 'START distance = 5 (a 3–4–5 triangle)');
  ok(g.mx === 0 && g.my === 0.5, 'START midpoint = (0, 0.5)');
}

/* ---- 2. Pythagorean identity d² = Δx² + Δy² over the whole grid,
          plus symmetry d(A,B) = d(B,A) and order-of-subtraction invariance ---- */
let pythWorst = 0, symWorst = 0;
let sample = 0;
for (let i = 0; i < grid.length; i += 3) {
  for (let j = 0; j < grid.length; j += 3) {
    for (let k = 0; k < grid.length; k += 5) {
      for (let l = 0; l < grid.length; l += 5) {
        const A = { x1: grid[i], y1: grid[j], x2: grid[k], y2: grid[l] };
        const B = { x1: grid[k], y1: grid[l], x2: grid[i], y2: grid[j] }; // swapped points
        const g = geometry(A);
        // d² equals the sum of squared legs
        pythWorst = Math.max(pythWorst, Math.abs(g.dist * g.dist - g.sum));
        // order of subtraction can't matter: (x2−x1)² = (x1−x2)²
        ok(near((A.x2 - A.x1) ** 2, (A.x1 - A.x2) ** 2), 'order-invariance x');
        ok(near((A.y2 - A.y1) ** 2, (A.y1 - A.y2) ** 2), 'order-invariance y');
        // distance is symmetric
        symWorst = Math.max(symWorst, Math.abs(g.dist - geometry(B).dist));
        // distance is never negative
        ok(g.dist >= 0, 'distance ≥ 0');
        sample++;
      }
    }
  }
}
ok(pythWorst < 1e-12, `Pythagorean identity holds (worst |d²−(Δx²+Δy²)| = ${pythWorst.toExponential(2)})`);
ok(symWorst < 1e-12, `distance symmetric d(A,B)=d(B,A) (worst diff ${symWorst.toExponential(2)})`);

/* ---- 3. midpoint is the average, and it is equidistant from both endpoints ---- */
let midWorst = 0;
for (let n = 0; n < 400; n++) {
  const p = {
    x1: grid[(Math.random() * grid.length) | 0], y1: grid[(Math.random() * grid.length) | 0],
    x2: grid[(Math.random() * grid.length) | 0], y2: grid[(Math.random() * grid.length) | 0],
  };
  const g = geometry(p);
  const dAM = Math.hypot(p.x1 - g.mx, p.y1 - g.my);
  const dBM = Math.hypot(p.x2 - g.mx, p.y2 - g.my);
  midWorst = Math.max(midWorst, Math.abs(dAM - dBM));
  // midpoint distance to each end is half the full distance
  ok(near(dAM, g.dist / 2), 'midpoint splits the segment in half');
}
ok(midWorst < 1e-12, `midpoint equidistant from both endpoints (worst ${midWorst.toExponential(2)})`);

/* ---- 4. special cases: horizontal and vertical segments collapse to |Δ| ---- */
{
  const horiz = geometry({ x1: -3, y1: 2, x2: 4, y2: 2 }); // Δy = 0
  ok(horiz.dist === 7 && horiz.dy === 0, 'horizontal segment: d = |Δx| = 7');
  const vert = geometry({ x1: 1, y1: -5, x2: 1, y2: 3 }); // Δx = 0
  ok(vert.dist === 8 && vert.dx === 0, 'vertical segment: d = |Δy| = 8');
  const zero = geometry({ x1: 2, y1: 2, x2: 2, y2: 2 }); // same point
  ok(zero.dist === 0, 'coincident points: d = 0');
}

/* ---- 5. calibration: exact target -> error 0 -> CALIBRATED, integer grid ---- */
const targets = [];
for (let n = 0; n < 300; n++) {
  const ri = () => Math.round(-6 + Math.random() * 12);
  let t;
  do {
    t = { x1: ri(), y1: ri(), x2: ri(), y2: ri() };
  } while (
    Math.hypot(t.x2 - t.x1, t.y2 - t.y1) < 3 ||
    sameSegment(t, START)
  );
  targets.push(t);
}
let worstExact = 0;
for (const t of targets) {
  const e = matchError(t, t);
  worstExact = Math.max(worstExact, e);
  ok(e < MATCH_ERR, `exact target CALIBRATED (${JSON.stringify(t)})`);
  // the swapped orientation is also an exact match (segment has no direction)
  const flipped = { x1: t.x2, y1: t.y2, x2: t.x1, y2: t.y1 };
  ok(matchError(flipped, t) < MATCH_ERR, 'swapped-orientation match is also exact');
  // targets are integer-valued and reachable by the 0.5-step dials
  for (const v of [t.x1, t.y1, t.x2, t.y2]) {
    ok(v >= RANGE.min && v <= RANGE.max, 'target coord within dial range');
    ok(near(v, Math.round(v / RANGE.step) * RANGE.step), 'target coord on the 0.5 grid');
  }
}

/* ---- 6. smallest single-step (0.5) miss stays well above CALIBRATED ---- */
let minMiss = Infinity, minMissWhat = null;
for (const t of targets.slice(0, 60)) {
  const nudges = [
    { ...t, x1: t.x1 + 0.5 }, { ...t, y1: t.y1 + 0.5 },
    { ...t, x2: t.x2 + 0.5 }, { ...t, y2: t.y2 + 0.5 },
  ];
  for (const c of nudges) {
    const e = matchError(c, t);
    if (e < minMiss) { minMiss = e; minMissWhat = { t, c }; }
  }
}
ok(minMiss > MATCH_ERR * 3, `smallest single-step miss (${minMiss.toFixed(3)}) safely above threshold`);

/* ---- 7. meter feel ---- */
const T = { x1: 0, y1: 0, x2: 4, y2: 3 };
const feel = [
  ['exact', matchError(T, T)],
  ['one end off 0.5', matchError({ ...T, x2: 4.5 }, T)],
  ['one end off 1', matchError({ ...T, x2: 5 }, T)],
  ['both ends off 1', matchError({ x1: 1, y1: 0, x2: 5, y2: 3 }, T)],
  ['far off', matchError({ x1: -3, y1: -3, x2: 6, y2: 6 }, T)],
];

console.log('DistanceLab audit');
console.log('=================');
console.log(`grid points per axis        : ${grid.length}  (${RANGE.min}…${RANGE.max} step ${RANGE.step})`);
console.log(`Pythagorean sample size     : ${sample}`);
console.log(`worst |d²−(Δx²+Δy²)|         : ${pythWorst.toExponential(2)}`);
console.log(`worst symmetry diff          : ${symWorst.toExponential(2)}`);
console.log(`worst exact-target error     : ${worstExact.toExponential(2)}  (MATCH_ERR ${MATCH_ERR})`);
console.log(`smallest single-step miss    : ${minMiss.toFixed(3)}  -> match ${matchPercent(minMiss).toFixed(0)}%`);
console.log(`  (${JSON.stringify(minMissWhat.t)} vs ${JSON.stringify(minMissWhat.c)})`);
console.log('\nmeter feel:');
for (const [name, e] of feel) console.log(`  ${name.padEnd(16)} err ${e.toFixed(3)}  -> ${matchPercent(e).toFixed(0)}%`);
console.log('\n-----------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) { console.log('\nFAILURES:'); bad.slice(0, 20).forEach((m) => console.log('  ✗ ' + m)); process.exit(1); }
console.log('All checks passed ✓');
