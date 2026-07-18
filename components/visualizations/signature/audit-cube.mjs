/* Numerical audit for CubeLab.
   Mirrors the geometry + math the .jsx will use, then checks:
   (1) the folded state (u=0) is a true cube: 8 vertices, 12 edges of length s,
       6 faces, all right angles, and it matches the plain corner cube.
   (2) the unfolded state (u=1) is a flat, non-overlapping Latin-cross NET:
       all six faces coplanar, each still an s×s square, total area = 6s².
   (3) the taught formulas are exact:
       V = s³, SA = 6s², face diagonal = s√2, space diagonal = s√3,
       Euler's V − E + F = 2.
   (4) calibration targets (build-to-volume / build-to-area) are reachable on the
       student dial grid and read sensibly on the meter.
   Run: node audit-cube.mjs
*/

/* ---- tiny vector helpers ------------------------------------------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => scale(a, 1 / len(a));

/* Rodrigues rotation of point p about the line through A with unit axis k, angle t */
function rotAbout(A, k, t, p) {
  const v = sub(p, A);
  const c = Math.cos(t), s = Math.sin(t);
  const term1 = scale(v, c);
  const term2 = scale(cross(k, v), s);
  const term3 = scale(k, dot(k, v) * (1 - c));
  return add(A, add(term1, add(term2, term3)));
}

/* ---- the cube-net face tree (this is exactly what CubeLab renders) --------
   Front is the fixed root in the plane z=+h. Its four neighbours hinge on the
   front's four edges; Back hinges on Bottom (a second-level child). u=0 is the
   folded cube, u=1 the flat cross net. Each face is a square given by 4 corners.
*/
const HALF_PI = Math.PI / 2;

function faceCorners(s, u) {
  const h = s / 2;
  const X = [1, 0, 0], Y = [0, 1, 0];

  // folded-state square corners (O, O+U, O+U+V, O+V), listed per face
  const folded = {
    front:  [[-h,-h, h], [ h,-h, h], [ h, h, h], [-h, h, h]],
    top:    [[-h, h, h], [ h, h, h], [ h, h,-h], [-h, h,-h]],
    bottom: [[-h,-h, h], [ h,-h, h], [ h,-h,-h], [-h,-h,-h]],
    left:   [[-h,-h, h], [-h, h, h], [-h, h,-h], [-h,-h,-h]],
    right:  [[ h,-h, h], [ h, h, h], [ h, h,-h], [ h,-h,-h]],
    back:   [[-h,-h,-h], [ h,-h,-h], [ h, h,-h], [-h, h,-h]],
  };

  const a = HALF_PI * u; // hinge sweep 0 → 90°

  const applyTop    = (p) => rotAbout([-h, h, h], X,  a, p);
  const applyBottom = (p) => rotAbout([-h,-h, h], X, -a, p);
  const applyLeft   = (p) => rotAbout([-h,-h, h], Y,  a, p);
  const applyRight  = (p) => rotAbout([ h,-h, h], Y, -a, p);
  // Back is a child of Bottom: rotate about its own hinge first, then ride Bottom.
  const applyBack   = (p) => applyBottom(rotAbout([-h,-h,-h], X, -a, p));

  return {
    front:  folded.front,
    top:    folded.top.map(applyTop),
    bottom: folded.bottom.map(applyBottom),
    left:   folded.left.map(applyLeft),
    right:  folded.right.map(applyRight),
    back:   folded.back.map(applyBack),
  };
}

/* ---- test harness -------------------------------------------------------- */
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) pass++;
  else { fail++; console.log('  ✗ FAIL:', name, extra); }
};
const approx = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const vApprox = (a, b, e = 1e-9) => approx(a[0], b[0], e) && approx(a[1], b[1], e) && approx(a[2], b[2], e);

/* ---- (1) folded state is a true cube ------------------------------------- */
console.log('\n[1] Folded state (u=0) is a true cube');
for (const s of [1, 2, 3.5, 5]) {
  const F = faceCorners(s, 0);
  const faces = Object.values(F);

  // every edge of every face has length s, and every corner angle is 90°
  let allEdges = true, allRight = true;
  for (const f of faces) {
    for (let i = 0; i < 4; i++) {
      const e = sub(f[(i + 1) % 4], f[i]);
      if (!approx(len(e), s)) allEdges = false;
      const eprev = sub(f[(i + 3) % 4], f[i]);
      if (!approx(dot(norm(e), norm(eprev)), 0)) allRight = false;
    }
  }
  ok(`s=${s}: every face edge = s`, allEdges);
  ok(`s=${s}: every face corner is a right angle`, allRight);

  // collect unique vertices — a cube must have exactly 8
  const verts = [];
  for (const f of faces) for (const c of f) {
    if (!verts.some((v) => vApprox(v, c))) verts.push(c);
  }
  ok(`s=${s}: exactly 8 distinct vertices`, verts.length === 8, `(got ${verts.length})`);

  // they must be the corner cube {±h}³
  const h = s / 2;
  const expected = [];
  for (const sx of [-h, h]) for (const sy of [-h, h]) for (const sz of [-h, h]) expected.push([sx, sy, sz]);
  const matches = expected.every((e) => verts.some((v) => vApprox(v, e)));
  ok(`s=${s}: vertices are exactly {±s/2}³`, matches);

  // collect unique undirected edges — a cube must have exactly 12
  const edges = [];
  const key = (p) => p.map((n) => n.toFixed(6)).join(',');
  for (const f of faces) for (let i = 0; i < 4; i++) {
    const p = f[i], q = f[(i + 1) % 4];
    const k = [key(p), key(q)].sort().join('|');
    if (!edges.includes(k)) edges.push(k);
  }
  ok(`s=${s}: exactly 12 distinct edges`, edges.length === 12, `(got ${edges.length})`);
  ok(`s=${s}: Euler V−E+F = 2`, verts.length - edges.length + 6 === 2);
}

/* ---- (2) unfolded state is a flat, non-overlapping cross net -------------- */
console.log('\n[2] Unfolded state (u=1) is a flat Latin-cross net');
for (const s of [1, 2, 3.5, 5]) {
  const h = s / 2;
  const F = faceCorners(s, 1);
  const faces = Object.entries(F);

  // all corners share z = +h (coplanar, flat)
  let coplanar = true;
  for (const [, f] of faces) for (const c of f) if (!approx(c[2], h)) coplanar = false;
  ok(`s=${s}: net is flat (all z = s/2)`, coplanar);

  // each face is still an s×s square, and total area = 6s²
  let totalArea = 0, allSquares = true;
  for (const [, f] of faces) {
    for (let i = 0; i < 4; i++) if (!approx(len(sub(f[(i + 1) % 4], f[i])), s)) allSquares = false;
    // planar polygon area via shoelace in the z=h plane (x,y)
    let A2 = 0;
    for (let i = 0; i < 4; i++) A2 += f[i][0] * f[(i + 1) % 4][1] - f[(i + 1) % 4][0] * f[i][1];
    totalArea += Math.abs(A2) / 2;
  }
  ok(`s=${s}: every net face is still an s×s square`, allSquares);
  ok(`s=${s}: total net area = 6s² = ${6 * s * s}`, approx(totalArea, 6 * s * s));

  // expected cross layout (x,y) centres — no two faces overlap
  const expectCentres = {
    front:  [0, 0],  top:  [0, s],  bottom: [0, -s],
    left:   [-s, 0],  right: [s, 0], back:  [0, -2 * s],
  };
  let layoutOK = true;
  for (const [name, f] of faces) {
    const cx = (f[0][0] + f[2][0]) / 2, cy = (f[0][1] + f[2][1]) / 2;
    const [ex, ey] = expectCentres[name];
    if (!approx(cx, ex) || !approx(cy, ey)) layoutOK = false;
  }
  ok(`s=${s}: faces land in the expected non-overlapping cross`, layoutOK);
}

/* ---- (3) taught formulas ------------------------------------------------- */
console.log('\n[3] Taught formulas are exact');
for (const s of [1, 2, 3, 4, 5, 2.5]) {
  ok(`s=${s}: V = s³ = ${s ** 3}`, approx(s ** 3, s * s * s));
  ok(`s=${s}: SA = 6s² = ${6 * s * s}`, approx(6 * s * s, 6 * s ** 2));
  ok(`s=${s}: face diagonal = s√2`, approx(Math.hypot(s, s), s * Math.SQRT2));
  ok(`s=${s}: space diagonal = s√3`, approx(Math.hypot(s, s, s), s * Math.sqrt(3)));
}
// space diagonal really is the far-corner distance in the cube
for (const s of [1, 2, 3.5]) {
  const F = faceCorners(s, 0);
  const h = s / 2;
  const d = len(sub([h, h, h], [-h, -h, -h]));
  ok(`s=${s}: opposite-corner distance = s√3`, approx(d, s * Math.sqrt(3)));
}

/* ---- (4) calibration reachability & meter feel --------------------------- */
console.log('\n[4] Calibration (build-to-target) reachability & meter');
// student dial grid for s (exactly the slider range/step in the .jsx)
const grid = [];
for (let v = 0.5; v <= 5 + 1e-9; v += 0.5) grid.push(+v.toFixed(3));

// targets are chosen at integer s so the goal has a clean whole-number answer
const volTargets = [2, 3, 4].map((n) => ({ kind: 'volume', s: n, goal: n ** 3 }));
const areaTargets = [2, 3, 4].map((n) => ({ kind: 'area', s: n, goal: 6 * n * n }));

const measure = (kind, s) => (kind === 'volume' ? s ** 3 : 6 * s * s);
// meter: relative error → percent; CALIBRATED when the built solid equals the goal
const matchPercent = (cur, goal) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - goal) / goal)));
const MATCH_TOL = 1e-6;

for (const t of [...volTargets, ...areaTargets]) {
  const reachable = grid.some((sv) => approx(measure(t.kind, sv), t.goal, MATCH_TOL));
  ok(`${t.kind} goal ${t.goal} reachable at s=${t.s}`, reachable);
  // exactly one grid s hits it (unique answer)
  const hits = grid.filter((sv) => approx(measure(t.kind, sv), t.goal, MATCH_TOL));
  ok(`${t.kind} goal ${t.goal} has a unique answer`, hits.length === 1, `(hits: ${hits})`);
  // exact reads 100%, one dial step off reads clearly less
  const exact = matchPercent(measure(t.kind, t.s), t.goal);
  const offV = measure(t.kind, t.s + 0.5);
  const off = matchPercent(offV, t.goal);
  ok(`${t.kind} goal ${t.goal}: exact = 100%`, approx(exact, 100, 1e-6));
  ok(`${t.kind} goal ${t.goal}: +0.5 step off < 92%`, off < 92, `(got ${off.toFixed(1)}%)`);
}

console.log(`\n[summary] ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
