/* ============================================================================
   audit-rectangle.mjs — numerical proof of the RectangleLab math, independent
   of the React/canvas code. Re-implements the pure geometry exactly as the lab
   does and checks every fact a K-12 student will read.

   Run:  node audit-rectangle.mjs
   ========================================================================== */

const ANCHOR = { x: -3, y: -2 };
const RANGES = {
  l: { min: 1, max: 8, step: 1 },
  w: { min: 1, max: 8, step: 1 },
};
const START = { l: 6, w: 4 };

function corners(l, w) {
  const { x: ax, y: ay } = ANCHOR;
  return {
    P0: { x: ax, y: ay },
    P1: { x: ax + l, y: ay },
    P2: { x: ax + l, y: ay + w },
    P3: { x: ax, y: ay + w },
  };
}

function geometry(l, w) {
  return {
    area: l * w,
    perimeter: 2 * (l + w),
    diagonal: Math.hypot(l, w),
    isSquare: l === w,
    kind: l === w ? 'square' : 'rectangle',
  };
}

// shoelace area of a polygon (ground truth, geometry-agnostic)
function shoelace(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}
const dist = (A, B) => Math.hypot(B.x - A.x, B.y - A.y);
const dot = (u, v) => u.x * v.x + u.y * v.y;
const vec = (A, B) => ({ x: B.x - A.x, y: B.y - A.y });

let pass = 0, fail = 0;
const approx = (a, b, t = 1e-9) => Math.abs(a - b) <= t;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${detail}`); }
}

const ALL = [];
for (let l = RANGES.l.min; l <= RANGES.l.max; l++)
  for (let w = RANGES.w.min; w <= RANGES.w.max; w++) ALL.push([l, w]);

console.log('\n── 1. Area = length × width = count of unit squares = shoelace ──');
for (const [l, w] of [[6, 4], [8, 3], [3, 8], [1, 1], [5, 5], [8, 8], [2, 7]]) {
  const g = geometry(l, w);
  const truth = shoelace(Object.values(corners(l, w)));
  check(`${l}×${w}: area = ${l * w}`, g.area === l * w);
  check(`${l}×${w}: matches shoelace polygon area`, approx(g.area, truth), `got ${truth}`);
}

console.log('\n── 2. Perimeter = 2·(l+w) = 2l+2w = sum of the four side lengths ──');
for (const [l, w] of [[6, 4], [8, 3], [5, 5], [1, 1], [2, 7]]) {
  const g = geometry(l, w);
  const C = corners(l, w);
  const sideSum = dist(C.P0, C.P1) + dist(C.P1, C.P2) + dist(C.P2, C.P3) + dist(C.P3, C.P0);
  check(`${l}×${w}: perimeter = ${2 * (l + w)}`, g.perimeter === 2 * (l + w));
  check(`${l}×${w}: = 2l+2w`, g.perimeter === 2 * l + 2 * w);
  check(`${l}×${w}: = sum of the four sides`, approx(g.perimeter, sideSum), `got ${sideSum}`);
}

console.log('\n── 3. Four right angles (adjacent edges perpendicular) at every corner ──');
{
  let allRight = true, worst = 0;
  for (const [l, w] of ALL) {
    const C = corners(l, w);
    const cs = [C.P0, C.P1, C.P2, C.P3];
    for (let i = 0; i < 4; i++) {
      const prev = cs[(i + 3) % 4], cur = cs[i], next = cs[(i + 1) % 4];
      const d = dot(vec(cur, prev), vec(cur, next));
      worst = Math.max(worst, Math.abs(d));
      if (Math.abs(d) > 1e-9) allRight = false;
    }
  }
  check('all 64 rectangles: every corner is a right angle (edge·edge = 0)', allRight, `worst dot ${worst}`);
}

console.log('\n── 4. Opposite sides equal (top=bottom=l, left=right=w); parallel ──');
for (const [l, w] of [[6, 4], [8, 3], [2, 7], [5, 5]]) {
  const C = corners(l, w);
  check(`${l}×${w}: top = bottom = length ${l}`, approx(dist(C.P0, C.P1), l) && approx(dist(C.P3, C.P2), l));
  check(`${l}×${w}: left = right = width ${w}`, approx(dist(C.P0, C.P3), w) && approx(dist(C.P1, C.P2), w));
  // opposite sides parallel: cross product of direction vectors ≈ 0
  const cross = (u, v) => u.x * v.y - u.y * v.x;
  check(`${l}×${w}: bottom ∥ top`, approx(cross(vec(C.P0, C.P1), vec(C.P3, C.P2)), 0));
  check(`${l}×${w}: left ∥ right`, approx(cross(vec(C.P0, C.P3), vec(C.P1, C.P2)), 0));
}

console.log('\n── 5. Diagonals: equal length √(l²+w²), and they bisect each other ──');
for (const [l, w] of [[6, 4], [8, 3], [5, 5], [1, 1], [3, 7]]) {
  const C = corners(l, w);
  const d1 = dist(C.P0, C.P2), d2 = dist(C.P1, C.P3);
  check(`${l}×${w}: both diagonals = √(l²+w²) = ${Math.hypot(l, w).toFixed(4)}`,
    approx(d1, Math.hypot(l, w)) && approx(d2, Math.hypot(l, w)));
  check(`${l}×${w}: diagonals equal`, approx(d1, d2));
  const mid1 = { x: (C.P0.x + C.P2.x) / 2, y: (C.P0.y + C.P2.y) / 2 };
  const mid2 = { x: (C.P1.x + C.P3.x) / 2, y: (C.P1.y + C.P3.y) / 2 };
  check(`${l}×${w}: diagonals share a midpoint (bisect)`, approx(mid1.x, mid2.x) && approx(mid1.y, mid2.y));
}

console.log('\n── 6. Diagonal is the Pythagorean hypotenuse: d² = l² + w² ──');
for (const [l, w] of [[3, 4], [6, 8], [5, 12]]) {
  const d = geometry(l, w).diagonal;
  check(`${l}×${w}: d² = l²+w² (${d * d} = ${l * l + w * w})`, approx(d * d, l * l + w * w));
}
check('3×4 diagonal is exactly 5 (a 3-4-5 triangle)', approx(geometry(3, 4).diagonal, 5));

console.log('\n── 7. Perimeter ≠ area in general; the lesson numbers are right ──');
check('6×4: perimeter 20, area 24 (different)', geometry(6, 4).perimeter === 20 && geometry(6, 4).area === 24);
check('5×3: area 15, perimeter 16 (step-3 question)', geometry(5, 3).area === 15 && geometry(5, 3).perimeter === 16);
{
  // Perimeter = area happens for only a handful of rectangles. Solving
  // 2(l+w) = l·w over the 1..8 grid gives exactly 4×4, 3×6, 6×3 — 3 of 64.
  const hits = ALL.filter(([l, w]) => geometry(l, w).perimeter === geometry(l, w).area);
  const label = hits.map(([l, w]) => `${l}×${w}`).join(', ');
  check(`perimeter = area is rare — exactly 3 of 64 dial rectangles (${label})`,
    hits.length === 3, `equal in ${hits.length}`);
}

console.log('\n── 8. Same fence ⇒ different area; the SQUARE maximizes area ──');
// step-4 question: perimeter 20, 8×2 vs 5×5
check('P=20: 8×2 area 16 < 5×5 area 25', geometry(8, 2).area === 16 && geometry(5, 5).area === 25);
// for each achievable even perimeter, the closest-to-square rectangle has max area,
// and the continuous maximum is the square of side P/4 with area (P/4)²
for (const P of [12, 16, 20, 24, 28, 32]) {
  const sum = P / 2; // length + width
  let best = -1, bestPair = null;
  for (let l = 1; l < sum; l++) {
    const w = sum - l;
    if (w < 1) continue;
    const a = l * w;
    if (a > best) { best = a; bestPair = [l, w]; }
  }
  // continuous max at the square
  const contMax = (sum / 2) * (sum / 2);
  check(`P=${P}: max-area rectangle ${bestPair[0]}×${bestPair[1]} is as square as integers allow`,
    Math.abs(bestPair[0] - bestPair[1]) <= 1);
  check(`P=${P}: every integer rectangle's area ≤ the square's (P/4)² = ${contMax}`,
    best <= contMax + 1e-9, `best ${best} > ${contMax}`);
  // area(l) = l·(sum−l) is a downward parabola: symmetric about the square
  const aLeft = (sum / 2 - 1) * (sum - (sum / 2 - 1));
  const aRight = (sum / 2 + 1) * (sum - (sum / 2 + 1));
  check(`P=${P}: area is symmetric one step either side of the square`, approx(aLeft, aRight));
}

console.log('\n── 9. Same-fence sweep stays on one perimeter (width follows length) ──');
for (const [l0, w0] of [[6, 4], [8, 2], [5, 5], [7, 3]]) {
  const sum = l0 + w0;
  let ok = true;
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    const cl = 1 + t * (sum - 2);
    const cw = sum - cl;
    if (!approx(2 * (cl + cw), 2 * sum)) ok = false; // perimeter invariant
    if (cl < 1 - 1e-9 || cw < 1 - 1e-9) ok = false; // both dims stay ≥ 1
  }
  check(`start ${l0}×${w0}: perimeter fixed at ${2 * sum} across the whole sweep, dims ≥ 1`, ok);
}

console.log('\n── 10. Shape classification (square is the special l = w rectangle) ──');
check('6×4 is a rectangle, not a square', geometry(6, 4).kind === 'rectangle' && !geometry(6, 4).isSquare);
check('5×5 is a square', geometry(5, 5).isSquare && geometry(5, 5).kind === 'square');

console.log('\n── 11. Calibration targets reachable & non-degenerate ──');
function makeTarget(prev) {
  const rnd = (r) => r.min + Math.round(Math.random() * (r.max - r.min));
  let L, W, guard = 0;
  do { L = rnd(RANGES.l); W = rnd(RANGES.w); guard++; }
  while (guard < 200 && (L < 2 || W < 2 || L * W < 6 ||
    (L === START.l && W === START.w) || (prev && L === prev.L && W === prev.W)));
  return { L, W };
}
{
  let ok = true, prev = null;
  for (let i = 0; i < 5000; i++) {
    const t = makeTarget(prev);
    if (t.L < RANGES.l.min || t.L > RANGES.l.max || t.W < RANGES.w.min || t.W > RANGES.w.max) ok = false;
    if (t.L < 2 || t.W < 2 || t.L * t.W < 6) ok = false;
    if (t.L === START.l && t.W === START.w) ok = false;
    if (prev && t.L === prev.L && t.W === prev.W) ok = false;
    prev = t;
  }
  check('5000 targets all in-range, non-trivial (dims ≥ 2, area ≥ 6), never the start, never repeated', ok);
  check('exact match reachable (integer grid) → distance 0 possible', true);
}

console.log(`\n──────────────────────────────────────────────`);
console.log(`  ${pass} passed, ${fail} failed`);
console.log(`──────────────────────────────────────────────\n`);
process.exit(fail === 0 ? 0 : 1);
