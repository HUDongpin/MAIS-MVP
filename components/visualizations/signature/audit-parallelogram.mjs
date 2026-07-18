/* ============================================================================
   audit-parallelogram.mjs — numeric verification of ParallelogramLab's math.
   Re-implements the lab's pure geometry (kept in lockstep with the component)
   and hammers it over a large grid of shapes, asserting every property a K-12
   parallelogram lab must get right. Run:  node audit-parallelogram.mjs
   ========================================================================== */

const RAD2DEG = 180 / Math.PI;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const d2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
const cross2 = (ax, ay, bx, by) => ax * by - ay * bx;
const dot2 = (ax, ay, bx, by) => ax * bx + ay * by;
const GRID = 0.5, BOUND = 9.5, DBOUND = 9.5;
const EQ2 = 1e-6, PAR = 1e-6;

const forcedD = (A, B, C) => ({ x: A.x + C.x - B.x, y: A.y + C.y - B.y });

function signedArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}
function angleAt(V, P, N) {
  const ax = P.x - V.x, ay = P.y - V.y, bx = N.x - V.x, by = N.y - V.y;
  return Math.atan2(Math.abs(cross2(ax, ay, bx, by)), dot2(ax, ay, bx, by)) * RAD2DEG;
}
function classify(A, B, C, D, sides) {
  const rightA = Math.abs(dot2(B.x - A.x, B.y - A.y, D.x - A.x, D.y - A.y)) < PAR;
  const adjEqual = Math.abs(sides.AB2 - sides.BC2) < EQ2;
  if (rightA && adjEqual) return 'square';
  if (rightA) return 'rectangle';
  if (adjEqual) return 'rhombus';
  return 'parallelogram';
}
function geometry(free) {
  const A = free.A, B = free.B, C = free.C;
  const D = forcedD(A, B, C);
  const poly = [A, B, C, D];
  const area = Math.abs(signedArea(poly));
  const sides = {
    AB: dist(A, B), BC: dist(B, C), CD: dist(C, D), DA: dist(D, A),
    AB2: d2(A, B), BC2: d2(B, C),
  };
  const tiny = Math.min(sides.AB, sides.BC) < 1e-9;
  const valid = area > 1e-6 && !tiny;
  const angA = valid ? angleAt(A, D, B) : 0;
  const angB = valid ? angleAt(B, A, C) : 0;
  const angles = [angA, angB, angA, angB];
  const base = sides.AB;
  const height = valid ? area / base : 0;
  const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  const AC = dist(A, C), BD = dist(B, D);
  const diag = {
    AC, BD,
    equal: Math.abs(AC - BD) < 1e-6,
    perp: Math.abs(dot2(C.x - A.x, C.y - A.y, D.x - B.x, D.y - B.y)) < PAR,
  };
  return { A, B, C, D, poly, valid, sides, angles, base, height, area,
    perimeter: 2 * (sides.AB + sides.BC), M, diag,
    className: valid ? classify(A, B, C, D, sides) : '—' };
}
const DIHEDRAL = [
  [0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2],
  [0, 3, 2, 1], [1, 0, 3, 2], [2, 1, 0, 3], [3, 2, 1, 0],
];
function rmsMatch(g, t) {
  const u = [g.A, g.B, g.C, g.D], v = [t.A, t.B, t.C, t.D];
  let best = Infinity;
  for (const p of DIHEDRAL) {
    let s = 0;
    for (let i = 0; i < 4; i++) s += (u[i].x - v[p[i]].x) ** 2 + (u[i].y - v[p[i]].y) ** 2;
    best = Math.min(best, Math.sqrt(s / 4));
  }
  return best;
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.2)));
const MATCH_RMS = 0.03;

const START = { A: { x: -5, y: -3 }, B: { x: 2, y: -3 }, C: { x: 4, y: 3 } };
const PRESETS = {
  Slanted: { A: { x: -5, y: -3 }, B: { x: 0, y: -3 }, C: { x: 3, y: 3 } },
  Rectangle: { A: { x: -4, y: -2 }, B: { x: 4, y: -2 }, C: { x: 4, y: 2 } },
  Rhombus: { A: { x: 0, y: -3 }, B: { x: 4, y: 0 }, C: { x: 0, y: 3 } },
  Square: { A: { x: -3, y: -3 }, B: { x: 3, y: -3 }, C: { x: 3, y: 3 } },
};
function makeTarget(prev) {
  const snap = (v) => Math.round(v / GRID) * GRID;
  const rnd = (lim) => snap(-lim + Math.random() * 2 * lim);
  let guard = 0;
  while (guard++ < 600) {
    const A = { x: rnd(7), y: rnd(7) }, B = { x: rnd(7), y: rnd(7) }, C = { x: rnd(7), y: rnd(7) };
    const D = forcedD(A, B, C);
    if (Math.abs(D.x) > DBOUND || Math.abs(D.y) > DBOUND) continue;
    const g = geometry({ A, B, C });
    if (!g.valid || g.area < 16) continue;
    if (Math.min(g.sides.AB, g.sides.BC) < 1.8) continue;
    const t = { A, B, C, D };
    if (prev && rmsMatch(t, prev) < 1.2) continue;
    if (rmsMatch(t, geometry(START)) < 1.2) continue;
    return t;
  }
  const A = { x: -4, y: -3 }, B = { x: 3, y: -3 }, C = { x: 5, y: 2 };
  return { A, B, C, D: forcedD(A, B, C) };
}

/* ---- test harness -------------------------------------------------------- */
let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; if (fails.length < 40) fails.push(msg); } }
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

/* 1) Exhaustive sweep: opposite sides equal & parallel, angles, diagonals,
      area = base×height = shoelace, central symmetry. */
let swept = 0;
for (let ax = -6; ax <= 6; ax += 2)
for (let ay = -6; ay <= 6; ay += 2)
for (let bx = -6; bx <= 6; bx += 2)
for (let by = -6; by <= 6; by += 2)
for (let cx = -6; cx <= 6; cx += 2)
for (let cy = -6; cy <= 6; cy += 2) {
  const A = { x: ax, y: ay }, B = { x: bx, y: by }, C = { x: cx, y: cy };
  const D = forcedD(A, B, C);
  const g = geometry({ A, B, C });
  if (!g.valid) continue;
  swept++;

  // opposite sides equal
  ok(near(g.sides.AB, g.sides.CD, 1e-9), `AB=CD ${ax},${ay},${bx},${by},${cx},${cy}`);
  ok(near(g.sides.BC, g.sides.DA, 1e-9), `BC=DA ${ax},${ay}`);
  // opposite sides parallel (cross of direction vectors ≈ 0)
  ok(near(cross2(B.x - A.x, B.y - A.y, C.x - D.x, C.y - D.y), 0, 1e-9), 'AB∥DC');
  ok(near(cross2(C.x - B.x, C.y - B.y, D.x - A.x, D.y - A.y), 0, 1e-9), 'BC∥AD');
  // angle relations: opposite equal, neighbours supplementary, sum 360
  ok(near(g.angles[0], g.angles[2], 1e-9), 'A=C');
  ok(near(g.angles[1], g.angles[3], 1e-9), 'B=D');
  ok(near(g.angles[0] + g.angles[1], 180, 1e-7), 'A+B=180');
  ok(near(g.angles.reduce((a, b) => a + b, 0), 360, 1e-7), 'sum 360');
  // diagonals bisect: common midpoint
  const midAC = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  const midBD = { x: (B.x + D.x) / 2, y: (B.y + D.y) / 2 };
  ok(near(midAC.x, midBD.x, 1e-9) && near(midAC.y, midBD.y, 1e-9), 'diagonals bisect');
  ok(near(g.M.x, midBD.x, 1e-9) && near(g.M.y, midBD.y, 1e-9), 'M is common midpoint');
  // area three ways
  const shoelace = Math.abs(signedArea([A, B, C, D]));
  const crossArea = Math.abs(cross2(B.x - A.x, B.y - A.y, D.x - A.x, D.y - A.y));
  ok(near(g.area, shoelace, 1e-9), 'area=shoelace');
  ok(near(g.area, crossArea, 1e-9), 'area=|cross|');
  ok(near(g.area, g.base * g.height, 1e-9), 'area=base×height');
  // central symmetry: half-turn about M maps A→C, B→D
  const rot = (p) => ({ x: 2 * g.M.x - p.x, y: 2 * g.M.y - p.y });
  const rA = rot(A), rB = rot(B);
  ok(near(rA.x, C.x, 1e-9) && near(rA.y, C.y, 1e-9), 'half-turn A→C');
  ok(near(rB.x, D.x, 1e-9) && near(rB.y, D.y, 1e-9), 'half-turn B→D');
  // perimeter
  ok(near(g.perimeter, 2 * (g.sides.AB + g.sides.BC), 1e-9), 'perimeter');
  // diagonals equal ⇔ rectangle, perp ⇔ rhombus
  const isRect = g.className === 'rectangle' || g.className === 'square';
  const isRhom = g.className === 'rhombus' || g.className === 'square';
  ok(g.diag.equal === isRect, `diag equal⇔rect ${g.className}`);
  ok(g.diag.perp === isRhom, `diag perp⇔rhombus ${g.className}`);
}

/* 2) Preset classifications and specifics */
ok(geometry(PRESETS.Rectangle).className === 'rectangle', 'Rectangle preset');
ok(geometry(PRESETS.Rhombus).className === 'rhombus', 'Rhombus preset');
ok(geometry(PRESETS.Square).className === 'square', 'Square preset');
ok(geometry(PRESETS.Slanted).className === 'parallelogram', 'Slanted preset');
ok(geometry(START).className === 'parallelogram', 'START is a generic parallelogram');
{
  const r = geometry(PRESETS.Rhombus);
  ok(near(r.sides.AB, 5) && near(r.sides.BC, 5), 'rhombus sides all 5');
  ok(near(r.diag.AC, 6) && near(r.diag.BD, 8), 'rhombus diagonals 6 & 8');
  ok(!r.diag.equal && r.diag.perp, 'rhombus diagonals perp, unequal');
  const rect = geometry(PRESETS.Rectangle);
  ok(rect.diag.equal && !rect.diag.perp, 'rectangle diagonals equal, not perp');
  ok(near(rect.area, 32), 'rectangle area 32');
  const sq = geometry(PRESETS.Square);
  ok(sq.diag.equal && sq.diag.perp, 'square diagonals equal AND perp');
  const st = geometry(START);
  ok(near(st.base, 7) && near(st.height, 6) && near(st.area, 42), 'START base 7 height 6 area 42');
}

/* 3) Calibration: exact match → rms 0 → 100%; dihedral relabelings → 0;
      different shape → large; a one-grid-step miss is well below 100%. */
{
  const g = geometry(START);
  const self = { A: g.A, B: g.B, C: g.C, D: g.D };
  ok(near(rmsMatch(g, self), 0, 1e-12), 'self-match rms 0');
  ok(near(matchPercent(0), 100, 1e-9), '100% at rms 0');
  ok(rmsMatch(g, self) < MATCH_RMS, 'self → CALIBRATED');
  // relabel start-corner / reverse orientation: same shape, still rms 0
  const rotLabel = { A: g.B, B: g.C, C: g.D, D: g.A };
  ok(near(rmsMatch(g, rotLabel), 0, 1e-9), 'rotated labels still match');
  const revLabel = { A: g.A, B: g.D, C: g.C, D: g.B };
  ok(near(rmsMatch(g, revLabel), 0, 1e-9), 'reflected labels still match');
  // a different parallelogram is NOT calibrated
  const other = geometry(PRESETS.Rhombus);
  ok(rmsMatch(g, { A: other.A, B: other.B, C: other.C, D: other.D }) > 0.5, 'different shape not matched');
  // nudge one free corner by one grid step: should drop below CALIBRATED
  const nudged = geometry({ A: g.A, B: g.B, C: { x: g.C.x + GRID, y: g.C.y } });
  ok(rmsMatch(nudged, self) > MATCH_RMS, 'one-step miss not calibrated');
  ok(matchPercent(rmsMatch(nudged, self)) < 100, 'one-step miss < 100%');
}

/* 4) Target generator: always a valid, on-screen, reachable parallelogram far
      from START; the three free corners reconstruct it exactly. */
{
  let prev = null;
  for (let i = 0; i < 4000; i++) {
    const t = makeTarget(prev);
    const g = geometry({ A: t.A, B: t.B, C: t.C });
    ok(g.valid, 'target valid');
    ok(g.area >= 16 - 1e-9, 'target area ≥ 16');
    ok(Math.abs(t.D.x) <= DBOUND + 1e-9 && Math.abs(t.D.y) <= DBOUND + 1e-9, 'target D in bounds');
    ok([t.A, t.B, t.C].every((p) => Math.abs(p.x) <= 7 + 1e-9 && Math.abs(p.y) <= 7 + 1e-9), 'target free corners bounded');
    // reachable: placing A,B,C on the target's free corners reconstructs D
    ok(near(rmsMatch(g, t), 0, 1e-9), 'target reachable to rms 0');
    ok(rmsMatch(t, geometry(START)) >= 1.2 - 1e-9, 'target far from START');
    prev = t;
  }
}

/* 5) tryUpdate bounds rule: a move that would push D out of the window is
      rejected (shape stays on screen), an in-bounds move is accepted. */
function tryUpdate(prev, key, p) {
  const next = { ...prev, [key]: p };
  const D = forcedD(next.A, next.B, next.C);
  if (Math.abs(D.x) > DBOUND || Math.abs(D.y) > DBOUND) return prev;
  return next;
}
{
  // From START, dragging C far up-right would force D out of bounds → rejected.
  const s = START;
  const bad = tryUpdate(s, 'C', { x: 9.5, y: 9.5 }); // D = A+C−B = (-5+9.5-2, -3+9.5+3)=(2.5,9.5) ok actually
  // pick a genuinely out-of-bounds case: move B far negative → D.x large
  const bad2 = tryUpdate(s, 'B', { x: -9.5, y: -9.5 }); // D=(-5+4+9.5, -3+3+9.5)=(8.5,9.5) in-bounds → accepted
  // construct a definite rejection: A=9.5, C=9.5, B=-9.5 → D=28.5
  const rej = tryUpdate({ A: { x: 9, y: 0 }, B: { x: -9, y: 0 }, C: { x: 9, y: 0 } }, 'C', { x: 9.5, y: 0 });
  ok(rej.C.x === 9, 'out-of-bounds D rejected (state unchanged)');
  const acc = tryUpdate(s, 'C', { x: 3, y: 2 });
  ok(acc.C.x === 3 && acc.C.y === 2, 'in-bounds move accepted');
  const Dacc = forcedD(acc.A, acc.B, acc.C);
  ok(Math.abs(Dacc.x) <= DBOUND && Math.abs(Dacc.y) <= DBOUND, 'accepted move keeps D in bounds');
}

/* 6) Degeneracy: three collinear free corners → not valid. */
{
  ok(!geometry({ A: { x: -4, y: 0 }, B: { x: 0, y: 0 }, C: { x: 4, y: 0 } }).valid, 'collinear → invalid');
  ok(!geometry({ A: { x: 0, y: 0 }, B: { x: 2, y: 2 }, C: { x: 3, y: 3 } }).valid, 'collinear diagonal → invalid');
}

/* ---- report -------------------------------------------------------------- */
console.log(`swept ${swept} non-degenerate parallelograms`);
console.log(`PASS ${pass}  FAIL ${fail}`);
if (fail) { console.log('--- first failures ---'); fails.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
else console.log('All parallelogram checks pass ✓');
