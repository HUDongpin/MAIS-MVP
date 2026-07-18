/* Numerical audit for SphereLab.
   Mirrors the exact math + geometry the .jsx uses, then checks:

   (1) EXACTNESS — every π-coefficient the lab prints (surface area, volume,
       great circle, slice area, cylinder, double cone) is the true value, and is
       computed with integer arithmetic on the 0.5 dial grid, not floats.
   (2) THE SLICE — ρ² + y² = r² exactly at every reachable (r, y); the cut is
       widest at the equator and a single point at the poles; the cut circle
       really does lie on the sphere.
   (3) CAVALIERI — the centrepiece. At EVERY height, sphere slice = cylinder
       slice − double-cone slice, exactly; hence cylinder − double cone = sphere
       in volume, giving V = (4/3)πr³. Checked as exact rationals.
   (4) ARCHIMEDES — cylinder : sphere : double cone = 3 : 2 : 1 exactly, with
       2 + 1 = 3; sphere SA = the cylinder's lateral area; sphere SA = 2/3 of the
       cylinder's total area.
   (5) THE 3-D ENGINE — the mesh lies on the sphere, normals point outward, the
       exact visibility test agrees with the geometry, and the orthographic
       silhouette is a circle of radius r from every orbit angle.
   (6) CALIBRATION — every target is reachable on the dial grid; each clue pins
       its unknown uniquely; and, exhaustively over every target × every dial
       state, CALIBRATED fires IF AND ONLY IF the student is exactly right
       (up to the ±y symmetry, which cuts the identical circle).
   (7) THE LESSON — each quiz answer is verified numerically.

   Run: node audit-sphere.mjs
*/

let pass = 0, fail = 0;
const FAILS = [];
function ok(cond, what) {
  if (cond) pass++;
  else { fail++; if (FAILS.length < 25) FAILS.push(what); }
}
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

/* ---- exact rationals (identical to the .jsx) ----------------------------- */
const gcdInt = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
};
function frac(n, d = 1) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcdInt(n, d);
  return { n: n / g, d: d / g };
}
const fracVal = (f) => f.n / f.d;
const fracEq = (A, B) => A.n * B.d === B.n * A.d;
const fracAdd = (A, B) => frac(A.n * B.d + B.n * A.d, A.d * B.d);
const fracSub = (A, B) => frac(A.n * B.d - B.n * A.d, A.d * B.d);
const gridA = (v) => Math.round(v * 2);

const saCoef = (a) => frac(a * a, 1);
const volCoef = (a) => frac(a * a * a, 6);
const circCoef = (a) => frac(a, 1);
const gcAreaCoef = (a) => frac(a * a, 4);
const sliceCoef = (a, b) => frac(a * a - b * b, 4);
const cylVolCoef = (a) => frac(a * a * a, 4);
const coneVolCoef = (a) => frac(a * a * a, 12);
const cylTotalCoef = (a) => frac(3 * a * a, 2); // 6r²

const MINUS = '−';
function piStr(f) {
  if (f.n === 0) return '0';
  const head = f.n === 1 ? 'π' : f.n === -1 ? MINUS + 'π' : `${f.n}π`.replace('-', MINUS);
  return f.d === 1 ? head : `${head}/${f.d}`;
}

/* ---- the dial grid (identical to the .jsx) -------------------------------- */
const R_MIN = 1, R_MAX = 6, STEP = 0.5;
const R_GRID = [];
for (let v = R_MIN; v <= R_MAX + 1e-9; v += STEP) R_GRID.push(Math.round(v * 2) / 2);
const yGrid = (r) => {
  const out = [];
  for (let v = -r; v <= r + 1e-9; v += STEP) out.push(Math.round(v * 2) / 2);
  return out;
};

/* ==========================================================================
   (1) EXACTNESS — the printed π-coefficients are the true values
   ======================================================================== */
for (const r of R_GRID) {
  const a = gridA(r);
  ok(a === r * 2 && Number.isInteger(a), `grid index a=2r integral at r=${r}`);
  ok(near(fracVal(saCoef(a)) * Math.PI, 4 * Math.PI * r * r), `SA coef exact at r=${r}`);
  ok(near(fracVal(volCoef(a)) * Math.PI, (4 / 3) * Math.PI * r * r * r), `V coef exact at r=${r}`);
  ok(near(fracVal(circCoef(a)) * Math.PI, 2 * Math.PI * r), `circumference coef exact at r=${r}`);
  ok(near(fracVal(gcAreaCoef(a)) * Math.PI, Math.PI * r * r), `great-circle area coef exact at r=${r}`);
  ok(near(fracVal(cylVolCoef(a)) * Math.PI, 2 * Math.PI * r * r * r), `cylinder V coef exact at r=${r}`);
  ok(near(fracVal(coneVolCoef(a)) * Math.PI, (2 / 3) * Math.PI * r * r * r), `double-cone V coef exact at r=${r}`);
  ok(near(fracVal(cylTotalCoef(a)) * Math.PI, 6 * Math.PI * r * r), `cylinder total SA coef exact at r=${r}`);
  // SA is ALWAYS a whole multiple of π on this grid — that is why the lab can print it
  ok(saCoef(a).d === 1 && Number.isInteger(saCoef(a).n), `SA is a whole multiple of π at r=${r}`);
  for (const y of yGrid(r)) {
    const b = gridA(y);
    ok(near(fracVal(sliceCoef(a, b)) * Math.PI, Math.PI * (r * r - y * y)), `slice coef exact at r=${r}, y=${y}`);
  }
}

/* ==========================================================================
   (2) THE SLICE — ρ² + y² = r², exactly, everywhere on the grid
   ======================================================================== */
for (const r of R_GRID) {
  const a = gridA(r);
  for (const y of yGrid(r)) {
    const b = gridA(y);
    const rho2 = sliceCoef(a, b);          // exact ρ² as a rational
    const y2 = frac(b * b, 4);             // exact y²
    const r2 = frac(a * a, 4);             // exact r²
    ok(fracEq(fracAdd(rho2, y2), r2), `Pythagoras exact: ρ²+y²=r² at r=${r}, y=${y}`);
    ok(fracVal(rho2) >= 0, `ρ² non-negative at r=${r}, y=${y}`);
    // the cut circle lies ON the sphere: any of its points is exactly r from O
    const rho = Math.sqrt(fracVal(rho2));
    for (const t of [0, 1, 2.5, 4]) {
      const p = [rho * Math.cos(t), y, rho * Math.sin(t)];
      ok(near(Math.hypot(p[0], p[1], p[2]), r), `cut circle lies on the sphere at r=${r}, y=${y}`);
    }
    // monotone: the cut shrinks as |y| grows, and is widest at the equator
    ok(fracVal(rho2) <= r * r + 1e-12, `cut never exceeds the great circle at r=${r}, y=${y}`);
  }
  ok(near(Math.sqrt(fracVal(sliceCoef(a, 0))), r), `equator cut is the great circle (ρ=r) at r=${r}`);
  ok(near(fracVal(sliceCoef(a, gridA(r))), 0), `pole cut is a single point (ρ=0) at r=${r}`);
}

/* ==========================================================================
   (3) CAVALIERI — the centrepiece, checked exactly at every height
   ======================================================================== */
for (const r of R_GRID) {
  const a = gridA(r);
  for (const y of yGrid(r)) {
    const b = gridA(y);
    const sphereSlice = sliceCoef(a, b);          // π(r² − y²)
    const cylSlice = frac(a * a, 4);              // πr²
    const coneSlice = frac(b * b, 4);             // πy² — the cone's radius at height y is |y|
    ok(fracEq(sphereSlice, fracSub(cylSlice, coneSlice)),
      `Cavalieri slice identity exact at r=${r}, y=${y}`);
    // the double cone's radius at height y really is |y| (apex at O, base r at height r)
    const coneRadius = (Math.abs(y) / r) * r;
    ok(near(coneRadius, Math.abs(y)), `double-cone radius = |y| at r=${r}, y=${y}`);
  }
  // …and therefore the volumes agree, exactly
  ok(fracEq(fracSub(cylVolCoef(a), coneVolCoef(a)), volCoef(a)),
    `Cavalieri conclusion: cylinder − double cone = sphere at r=${r}`);
  ok(near(fracVal(volCoef(a)) * Math.PI, (4 / 3) * Math.PI * r ** 3),
    `…and that equals the textbook (4/3)πr³ at r=${r}`);
}

/* ==========================================================================
   (4) ARCHIMEDES — 3 : 2 : 1, and the two surface coincidences
   ======================================================================== */
for (const r of R_GRID) {
  const a = gridA(r);
  const cyl = fracVal(cylVolCoef(a)), sph = fracVal(volCoef(a)), cone = fracVal(coneVolCoef(a));
  ok(near(cyl / cone, 3), `cylinder : cone = 3 : 1 at r=${r}`);
  ok(near(sph / cone, 2), `sphere : cone = 2 : 1 at r=${r}`);
  ok(near(sph / cyl, 2 / 3), `sphere fills 2/3 of its snug cylinder at r=${r}`);
  ok(fracEq(fracAdd(volCoef(a), coneVolCoef(a)), cylVolCoef(a)), `2 + 1 = 3 exactly at r=${r}`);
  // the sphere's surface equals the cylinder's LATERAL surface: 4πr² = 2πr · 2r
  ok(fracEq(saCoef(a), frac(a * a, 1)) && near(4 * Math.PI * r * r, 2 * Math.PI * r * (2 * r)),
    `sphere SA = cylinder lateral SA at r=${r}`);
  // …and 2/3 of the cylinder's TOTAL surface, the same ratio as the volumes
  ok(near(fracVal(saCoef(a)) / fracVal(cylTotalCoef(a)), 2 / 3),
    `sphere SA = 2/3 of the cylinder's total SA at r=${r}`);
  // the double cone is two cones of radius r and height r — ConeLab's ⅓ rule
  ok(near(fracVal(coneVolCoef(a)) * Math.PI, 2 * (1 / 3) * Math.PI * r * r * r),
    `double cone = 2 × (1/3)πr²h with h=r at r=${r}`);
}

/* ==========================================================================
   (5) THE 3-D ENGINE — mesh, normals, visibility, silhouette
   ======================================================================== */
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const spherePt = (r, th, ph) => [r * Math.cos(th) * Math.cos(ph), r * Math.sin(th), r * Math.cos(th) * Math.sin(ph)];
const mkRotate = (yaw, pitch) => {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return (p) => {
    const x1 = p[0] * cy + p[2] * sy;
    const z1 = -p[0] * sy + p[2] * cy;
    const y2 = p[1] * cp - z1 * sp;
    const z2 = p[1] * sp + z1 * cp;
    return [x1, y2, z2];
  };
};
const NLON = 96, NLAT = 48;
for (const r of [1, 2.5, 6]) {
  // every mesh vertex is exactly r from the centre — it is a sphere, not an approximation of one
  for (let i = 0; i <= NLAT; i += 5) {
    const th = -Math.PI / 2 + (Math.PI * i) / NLAT;
    for (let j = 0; j < NLON; j += 7) {
      const ph = (2 * Math.PI * j) / NLON;
      const p = spherePt(r, th, ph);
      ok(near(Math.hypot(p[0], p[1], p[2]), r), `mesh vertex on the sphere at r=${r}`);
    }
  }
  for (const [yaw, pitch] of [[0, 0], [-0.62, 0.42], [1.3, -1.1], [3.0, 1.45]]) {
    const rot = mkRotate(yaw, pitch);
    // the rotation is rigid: it preserves length, so the silhouette stays a circle of radius r
    for (const p of [spherePt(r, 0.3, 1.1), spherePt(r, -1.2, 4.0), spherePt(r, 0, 0)]) {
      const q = rot(p);
      ok(near(Math.hypot(q[0], q[1], q[2]), r), `orbit is rigid (|p| preserved) at r=${r}`);
    }
    // exactly half the sphere faces the camera: the visibility test is p·ẑ > 0 after rotation
    let front = 0, total = 0;
    for (let i = 0; i < NLAT; i++) {
      const th = -Math.PI / 2 + (Math.PI * (i + 0.5)) / NLAT;
      for (let j = 0; j < NLON; j++) {
        const ph = (2 * Math.PI * (j + 0.5)) / NLON;
        const p = spherePt(r, th, ph);
        const area = Math.cos(th); // the lat/long cell's area weight
        total += area;
        if (rot(p)[2] > 0) front += area;
      }
    }
    ok(Math.abs(front / total - 0.5) < 0.02, `back-face culling keeps ~half the surface (yaw=${yaw})`);
    // the outward normal of a sphere point is its own direction — the cull test is exact
    const p = spherePt(r, 0.4, 2.2);
    const n = [p[0] / r, p[1] / r, p[2] / r];
    ok(near(dot3(n, n), 1), 'sphere normal is a unit vector');
    ok(near(rot(n)[2] * r, rot(p)[2]), 'cull test rotate(n)·ẑ agrees with rotate(p)·ẑ');
  }
}

/* ==========================================================================
   (6) CALIBRATION — reachability, uniqueness, and NO false CALIBRATED
   ======================================================================== */
const SA_RADII = [2, 3, 4, 5, 6];
const VOL_RADII = [3, 6];

// build every target the lab can ever hand out
const ALL_TARGETS = [];
for (const kind of ['surface', 'volume']) {
  for (const r of kind === 'surface' ? SA_RADII : VOL_RADII) {
    for (let y = 1; y <= r - 1; y++) {
      ALL_TARGETS.push({
        kind, r, y,
        clue: kind === 'surface' ? saCoef(gridA(r)) : volCoef(gridA(r)),
        slice: sliceCoef(gridA(r), gridA(y)),
      });
    }
  }
}
ok(ALL_TARGETS.length === 15 + 7, `target pool is the expected size (got ${ALL_TARGETS.length})`);

for (const t of ALL_TARGETS) {
  // reachable: both answers sit on the dial grid
  ok(R_GRID.some((v) => v === t.r), `target r=${t.r} is on the r dial grid`);
  ok(yGrid(t.r).some((v) => v === t.y), `target y=${t.y} is on the y dial grid for r=${t.r}`);
  ok(t.y >= 1 && t.y <= t.r - 1, `target slice is a real circle, not the equator or a pole (r=${t.r}, y=${t.y})`);
  // the clue is a clean whole number of π — a student can read it off
  ok(t.clue.d === 1, `${t.kind} clue is a whole multiple of π (r=${t.r}: ${piStr(t.clue)})`);
  ok(t.slice.d === 1, `slice clue is a whole multiple of π (r=${t.r}, y=${t.y}: ${piStr(t.slice)})`);
  // the clue is arithmetically what it claims
  if (t.kind === 'surface') ok(near(fracVal(t.clue), 4 * t.r * t.r), `SA clue = 4r² at r=${t.r}`);
  else ok(near(fracVal(t.clue), (4 / 3) * t.r ** 3), `V clue = (4/3)r³ at r=${t.r}`);
  ok(near(fracVal(t.slice), t.r * t.r - t.y * t.y), `slice clue = r² − y² at r=${t.r}, y=${t.y}`);

  // UNIQUENESS — the size clue pins r among ALL grid radii, with no ties
  const rSolutions = R_GRID.filter((v) =>
    fracEq(t.kind === 'surface' ? saCoef(gridA(v)) : volCoef(gridA(v)), t.clue));
  ok(rSolutions.length === 1 && rSolutions[0] === t.r,
    `the ${t.kind} clue pins r uniquely (r=${t.r}, found [${rSolutions}])`);

  // …and with r fixed, the slice clue pins |y|, leaving only the ±y symmetry
  const ySolutions = yGrid(t.r).filter((v) => fracEq(sliceCoef(gridA(t.r), gridA(v)), t.slice));
  ok(ySolutions.length === 2 && ySolutions.includes(t.y) && ySolutions.includes(-t.y),
    `the slice clue pins |y| (r=${t.r}, y=${t.y}, found [${ySolutions}])`);
}

/* THE BIG ONE — exhaustively, over every target × every reachable dial state:
   CALIBRATED must fire IF AND ONLY IF the student is exactly right.
   This is what makes a false stamp impossible rather than merely unlikely. */
let stampChecks = 0, falseStamps = 0, missedStamps = 0;
for (const t of ALL_TARGETS) {
  for (const r of R_GRID) {
    for (const y of yGrid(r)) {
      const a = gridA(r), b = gridA(y);
      const curClue = t.kind === 'surface' ? saCoef(a) : volCoef(a);
      const curSlice = sliceCoef(a, b);
      const calibrated = fracEq(curClue, t.clue) && fracEq(curSlice, t.slice);
      const trulyRight = r === t.r && Math.abs(y) === t.y;
      stampChecks++;
      if (calibrated && !trulyRight) { falseStamps++; ok(false, `FALSE stamp: target r=${t.r},y=${t.y} stamped at r=${r},y=${y}`); }
      else if (!calibrated && trulyRight) { missedStamps++; ok(false, `MISSED stamp: target r=${t.r},y=${t.y} not stamped at r=${r},y=${y}`); }
      else ok(true, 'stamp verdict correct');

      // the guide meter must never read 100% unless the stamp is earned
      const closeness = (cur, goal) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - goal) / goal)));
      const pct = (closeness(fracVal(curClue), fracVal(t.clue)) + closeness(fracVal(curSlice), fracVal(t.slice))) / 2;
      if (pct >= 99.999) ok(calibrated, `meter reads 100% only when calibrated (target r=${t.r},y=${t.y} at r=${r},y=${y})`);
      if (calibrated) ok(pct >= 99.999, `calibrated implies the meter is full (r=${r},y=${y})`);
    }
  }
}
ok(falseStamps === 0, `no false CALIBRATED anywhere (${stampChecks} target × dial-state combinations)`);
ok(missedStamps === 0, 'no missed CALIBRATED at a correct answer');

/* the calibration entry state (r=1, y=0) must never already satisfy a target */
for (const t of ALL_TARGETS) {
  const curClue = t.kind === 'surface' ? saCoef(gridA(1)) : volCoef(gridA(1));
  const curSlice = sliceCoef(gridA(1), gridA(0));
  ok(!(fracEq(curClue, t.clue) && fracEq(curSlice, t.slice)),
    `the build step starts un-matched for target r=${t.r}, y=${t.y}`);
}

/* makeTarget never repeats the previous order, and always emits a legal one */
function makeTarget(prev, rnd) {
  let t;
  do {
    const kind = rnd() < 0.5 ? 'surface' : 'volume';
    const pool = kind === 'surface' ? SA_RADII : VOL_RADII;
    const r = pool[Math.floor(rnd() * pool.length)];
    const y = 1 + Math.floor(rnd() * (r - 1));
    t = { kind, r, y, clue: kind === 'surface' ? saCoef(gridA(r)) : volCoef(gridA(r)), slice: sliceCoef(gridA(r), gridA(y)) };
  } while (prev && prev.kind === t.kind && prev.r === t.r && prev.y === t.y);
  return t;
}
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
let prev = null;
for (let i = 0; i < 5000; i++) {
  const t = makeTarget(prev, rnd);
  ok(t.y >= 1 && t.y <= t.r - 1, 'makeTarget slice height is legal');
  ok(t.clue.d === 1 && t.slice.d === 1, 'makeTarget clues are whole multiples of π');
  ok(!(prev && prev.kind === t.kind && prev.r === t.r && prev.y === t.y), 'makeTarget never repeats the previous order');
  prev = t;
}

/* ==========================================================================
   (7) THE LESSON — every quiz answer, checked as arithmetic
   ======================================================================== */
// step 2: a globe 20 across → r = 10, and the cost of using d instead of r
ok(20 / 2 === 10, 'diameter 20 gives r = 10');
ok(near((4 * Math.PI * 20 ** 2) / (4 * Math.PI * 10 ** 2), 4), 'using d for r overstates SA by exactly 4×');
ok(near(((4 / 3) * Math.PI * 20 ** 3) / ((4 / 3) * Math.PI * 10 ** 3), 8), 'using d for r overstates V by exactly 8×');
// step 3: r=5 cut at y=3 → ρ=4 (and the distractor 5−3=2 is wrong)
ok(near(Math.sqrt(5 * 5 - 3 * 3), 4), 'r=5 cut at y=3 gives ρ=4 (the 3-4-5 triangle)');
ok(!near(Math.sqrt(5 * 5 - 3 * 3), 5 - 3), 'the “subtract the lengths” distractor is genuinely wrong');
ok(fracEq(sliceCoef(gridA(5), gridA(3)), frac(16, 1)), 'that cut has area exactly 16π');
// step 4: the Cavalieri arithmetic quoted in the feedback
for (const r of R_GRID) {
  ok(near(2 * Math.PI * r ** 3 - (2 / 3) * Math.PI * r ** 3, (4 / 3) * Math.PI * r ** 3),
    `2πr³ − (2/3)πr³ = (4/3)πr³ at r=${r}`);
}
// step 6: the sphere fills two thirds of its snug cylinder
ok(near(((4 / 3) * Math.PI * 5 ** 3) / (2 * Math.PI * 5 ** 3), 2 / 3), 'the sphere fills 2/3 of the cylinder');

/* ---- π-formatting -------------------------------------------------------- */
ok(piStr(frac(36, 1)) === '36π', 'piStr renders a whole coefficient');
ok(piStr(frac(32, 3)) === '32π/3', 'piStr renders a fractional coefficient');
ok(piStr(frac(1, 1)) === 'π', 'piStr drops a coefficient of 1');
ok(piStr(frac(0, 1)) === '0', 'piStr renders zero');
ok(piStr(frac(1, 6)) === 'π/6', 'piStr renders a unit fraction');
// the headline values the lab shows at its start state
ok(piStr(saCoef(gridA(3))) === '36π', 'at r=3 the surface area prints as 36π');
ok(piStr(volCoef(gridA(3))) === '36π', 'at r=3 the volume prints as 36π too — a real coincidence, not a bug');
ok(near(4 * Math.PI * 9, (4 / 3) * Math.PI * 27), 'and r=3 is the only radius where SA and V agree numerically');
for (const r of R_GRID) {
  if (r !== 3) ok(!near(4 * Math.PI * r * r, (4 / 3) * Math.PI * r ** 3), `SA ≠ V at r=${r}`);
}

/* ---- report -------------------------------------------------------------- */
const total = pass + fail;
console.log(`\nSphereLab audit — ${total.toLocaleString()} checks`);
console.log(`  pass: ${pass.toLocaleString()}`);
console.log(`  fail: ${fail.toLocaleString()}`);
if (FAILS.length) {
  console.log('\nfirst failures:');
  for (const f of FAILS) console.log('  ✗ ' + f);
}
console.log(
  `\n  exhaustive stamp scan: ${stampChecks.toLocaleString()} (target × dial-state) combinations, ` +
  `${falseStamps} false stamps, ${missedStamps} missed stamps`,
);
console.log(fail === 0 ? '\n✓ all checks pass\n' : '\n✗ FAILURES PRESENT\n');
process.exit(fail === 0 ? 0 : 1);
