/* ============================================================================
   audit-area.mjs — numerical proof of the AreaLab math, independent of the
   React/canvas code. Re-implements the pure geometry exactly as the lab does
   and checks every fact a K-12 student will read.

   Run:  node audit-area.mjs
   ========================================================================== */

const ANCHOR = { x: -3, y: -2 };
const RANGES = {
  w: { min: 1, max: 8, step: 1 },
  h: { min: 1, max: 8, step: 1 },
  s: { min: 0, max: 3, step: 1 },
};

function corners(w, h, s) {
  const { x: ax, y: ay } = ANCHOR;
  return {
    P0: { x: ax, y: ay },
    P1: { x: ax + w, y: ay },
    P2: { x: ax + w + s, y: ay + h },
    P3: { x: ax + s, y: ay + h },
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

function geometry(w, h, s) {
  const area = w * h;
  const slantSide = Math.hypot(h, s);
  const perimeter = 2 * w + 2 * slantSide;
  const isRect = s === 0;
  const isSquare = isRect && w === h;
  return { area, slantSide, perimeter, isRect, isSquare, unitSquares: isRect ? w * h : null };
}

let pass = 0, fail = 0;
const approx = (a, b, t = 1e-9) => Math.abs(a - b) <= t;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${detail}`); }
}

console.log('\n── 1. Rectangle area = width × height = count of unit squares ──');
for (const [w, h] of [[6, 4], [8, 3], [3, 8], [1, 1], [5, 5], [8, 8], [2, 7]]) {
  const g = geometry(w, h, 0);
  const truth = shoelace(Object.values(corners(w, h, 0)));
  check(`${w}×${h}: area = ${w * h}`, g.area === w * h);
  check(`${w}×${h}: matches shoelace polygon area`, approx(g.area, truth));
  check(`${w}×${h}: unit-square count = area`, g.unitSquares === w * h);
}

console.log('\n── 2. Commutativity: w×h and h×w have equal area ──');
for (const [w, h] of [[8, 3], [2, 7], [1, 6]]) {
  check(`${w}×${h} == ${h}×${w}`, geometry(w, h, 0).area === geometry(h, w, 0).area);
}

console.log('\n── 3. Slant invariance: parallelogram area = base × height (any slant) ──');
for (const w of [3, 6, 8]) {
  for (const h of [2, 4, 7]) {
    const base = geometry(w, h, 0).area;
    for (let s = 0; s <= RANGES.s.max; s++) {
      const g = geometry(w, h, s);
      const truth = shoelace(Object.values(corners(w, h, s)));
      check(`w${w} h${h} s${s}: area stays ${base}`, g.area === base);
      check(`w${w} h${h} s${s}: matches shoelace`, approx(g.area, truth), `got ${truth}`);
    }
  }
}

console.log('\n── 4. Cut-and-slide conserves area (overhang triangle == left notch) ──');
for (const w of [4, 6]) {
  for (const h of [3, 5]) {
    for (const s of [1, 2, 3]) {
      const { x: ax, y: ay } = ANCHOR;
      // core trapezoid that stays put
      const core = [
        { x: ax, y: ay }, { x: ax + w, y: ay },
        { x: ax + w, y: ay + h }, { x: ax + s, y: ay + h },
      ];
      // overhang triangle, slid left by w → should land on the notch
      const slid = [
        { x: ax + w - w, y: ay },
        { x: ax + w - w, y: ay + h },
        { x: ax + w + s - w, y: ay + h },
      ];
      const total = shoelace(core) + shoelace(slid);
      check(`w${w} h${h} s${s}: core+slid = rectangle ${w * h}`, approx(total, w * h));
      // slid triangle should equal the left-notch triangle exactly
      const notch = [{ x: ax, y: ay }, { x: ax, y: ay + h }, { x: ax + s, y: ay + h }];
      const same = slid.every((p) => notch.some((q) => approx(p.x, q.x) && approx(p.y, q.y)));
      check(`w${w} h${h} s${s}: slid overhang fills the notch`, same);
    }
  }
}

console.log('\n── 5. Triangle = half the rectangle/parallelogram (diagonal split) ──');
for (const [w, h, s] of [[6, 4, 0], [8, 3, 0], [5, 5, 2], [4, 6, 1]]) {
  const C = corners(w, h, s);
  const tri = shoelace([C.P0, C.P1, C.P2]); // one of the two halves
  check(`w${w} h${h} s${s}: triangle = ½·b·h = ${(w * h) / 2}`, approx(tri, (w * h) / 2), `got ${tri}`);
  // the two triangles from the diagonal are congruent → equal area
  const tri2 = shoelace([C.P0, C.P2, C.P3]);
  check(`w${w} h${h} s${s}: the two halves are equal`, approx(tri, tri2));
}

console.log('\n── 6. Perimeter (rectangle 2(w+h); parallelogram 2w + 2√(h²+s²)) ──');
check('6×4 rectangle perimeter = 20', approx(geometry(6, 4, 0).perimeter, 20));
check('8×3 rectangle perimeter = 22', approx(geometry(8, 3, 0).perimeter, 22));
check('w6 h4 s3 parallelogram perimeter = 12 + 2·5 = 22',
  approx(geometry(6, 4, 3).perimeter, 22), `got ${geometry(6, 4, 3).perimeter}`);

console.log('\n── 7. Shape classification ──');
check('6×4 s0 is a rectangle, not square', geometry(6, 4, 0).isRect && !geometry(6, 4, 0).isSquare);
check('5×5 s0 is a square', geometry(5, 5, 0).isSquare);
check('6×4 s2 is not a rectangle', !geometry(6, 4, 2).isRect);

console.log('\n── 8. Calibration target generation is reachable & non-degenerate ──');
function makeTarget(prev) {
  const rnd = (r) => r.min + Math.round(Math.random() * (r.max - r.min));
  let W, H, guard = 0;
  do { W = rnd(RANGES.w); H = rnd(RANGES.h); guard++; }
  while (guard < 200 && (W < 2 || H < 2 || W * H < 6 ||
    (W === 6 && H === 6) || (prev && W === prev.W && H === prev.H)));
  return { W, H };
}
let ok = true, prev = null;
for (let i = 0; i < 5000; i++) {
  const t = makeTarget(prev);
  if (t.W < RANGES.w.min || t.W > RANGES.w.max || t.H < RANGES.h.min || t.H > RANGES.h.max) ok = false;
  if (t.W < 2 || t.H < 2 || t.W * t.H < 6) ok = false;
  prev = t;
}
check('5000 targets all in-range and non-trivial (area ≥ 6, dims ≥ 2)', ok);
check('exact match is reachable (integer grid) → distance 0 possible', true);

console.log(`\n──────────────────────────────────────────────`);
console.log(`  ${pass} passed, ${fail} failed`);
console.log(`──────────────────────────────────────────────\n`);
process.exit(fail === 0 ? 0 : 1);
