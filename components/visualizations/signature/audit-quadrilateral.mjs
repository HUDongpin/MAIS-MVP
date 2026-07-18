/* ============================================================================
   audit-quadrilateral.mjs — numerical proof of the QuadrilateralLab math,
   independent of the React/canvas code. Re-implements the pure geometry exactly
   as the lab does and checks the facts every K-12 student will read.

   Run:  node audit-quadrilateral.mjs
   ========================================================================== */

const RAD2DEG = 180 / Math.PI;
const GRID = 0.5;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const d2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
const cross2 = (ax, ay, bx, by) => ax * by - ay * bx;
const dot2 = (ax, ay, bx, by) => ax * bx + ay * by;

function signedArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}
function segMeet(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = cross2(d1x, d1y, d2x, d2y);
  if (Math.abs(denom) < 1e-12) return null;
  const t = cross2(p3.x - p1.x, p3.y - p1.y, d2x, d2y) / denom;
  const u = cross2(p3.x - p1.x, p3.y - p1.y, d1x, d1y) / denom;
  return { t, u, pt: { x: p1.x + t * d1x, y: p1.y + t * d1y } };
}
function selfIntersecting(poly) {
  const [A, B, C, D] = poly;
  const proper = (p1, p2, p3, p4) => {
    const m = segMeet(p1, p2, p3, p4);
    return !!m && m.t > 1e-9 && m.t < 1 - 1e-9 && m.u > 1e-9 && m.u < 1 - 1e-9;
  };
  return proper(A, B, C, D) || proper(B, C, D, A);
}
function interiorAngles(poly) {
  const s = Math.sign(signedArea(poly)) || 1;
  const n = poly.length, out = [];
  for (let i = 0; i < n; i++) {
    const P = poly[(i - 1 + n) % n], V = poly[i], N = poly[(i + 1) % n];
    const inx = V.x - P.x, iny = V.y - P.y;
    const outx = N.x - V.x, outy = N.y - V.y;
    const turn = Math.atan2(cross2(inx, iny, outx, outy), dot2(inx, iny, outx, outy));
    out.push((Math.PI - s * turn) * RAD2DEG);
  }
  return out;
}
function sideSign(P, Q, X) {
  return Math.sign(cross2(Q.x - P.x, Q.y - P.y, X.x - P.x, X.y - P.y));
}
function interiorDiagonal(poly) {
  const [A, B, C, D] = poly;
  return sideSign(A, C, B) * sideSign(A, C, D) < 0 ? 'AC' : 'BD';
}
const EQ2 = 1e-6, PAR = 1e-6;
function classify(poly, angles) {
  const [A, B, C, D] = poly;
  const sAB = d2(A, B), sBC = d2(B, C), sCD = d2(C, D), sDA = d2(D, A);
  const eq = (x, y) => Math.abs(x - y) < EQ2;
  const parAB_CD = Math.abs(cross2(B.x - A.x, B.y - A.y, D.x - C.x, D.y - C.y)) < PAR;
  const parBC_DA = Math.abs(cross2(C.x - B.x, C.y - B.y, A.x - D.x, A.y - D.y)) < PAR;
  const rightA = Math.abs(dot2(B.x - A.x, B.y - A.y, D.x - A.x, D.y - A.y)) < PAR;
  const reflex = angles.some((a) => a > 180 + 1e-6);
  let name;
  if (parAB_CD && parBC_DA) {
    const allEqual = eq(sAB, sBC) && eq(sBC, sCD) && eq(sCD, sDA);
    if (allEqual && rightA) name = 'square';
    else if (rightA) name = 'rectangle';
    else if (allEqual) name = 'rhombus';
    else name = 'parallelogram';
  } else {
    const kite = (eq(sAB, sBC) && eq(sCD, sDA)) || (eq(sBC, sCD) && eq(sDA, sAB));
    if (kite) name = reflex ? 'dart (concave kite)' : 'kite';
    else if (parAB_CD || parBC_DA) name = 'trapezoid';
    else name = 'quadrilateral';
  }
  return { name, parAB_CD, parBC_DA };
}
function diagonals(poly) {
  const [A, B, C, D] = poly;
  const AC = dist(A, C), BD = dist(B, D);
  const equal = Math.abs(AC - BD) < 1e-6;
  const perp = Math.abs(dot2(C.x - A.x, C.y - A.y, D.x - B.x, D.y - B.y)) < PAR;
  const midAC = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  const midBD = { x: (B.x + D.x) / 2, y: (B.y + D.y) / 2 };
  const bisect = dist(midAC, midBD) < 1e-6;
  return { AC, BD, equal, perp, bisect };
}
function geometry(quad) {
  const poly = [quad.A, quad.B, quad.C, quad.D];
  const area = Math.abs(signedArea(poly));
  const sides = { AB: dist(quad.A, quad.B), BC: dist(quad.B, quad.C), CD: dist(quad.C, quad.D), DA: dist(quad.D, quad.A) };
  const tiny = Math.min(sides.AB, sides.BC, sides.CD, sides.DA) < 1e-9;
  const complex = selfIntersecting(poly);
  const degenerate = !complex && (area < 1e-6 || tiny);
  const valid = !complex && !degenerate;
  const angles = valid ? interiorAngles(poly) : [0, 0, 0, 0];
  const reflex = valid && angles.some((a) => a > 180 + 1e-6);
  const cls = valid ? classify(poly, angles) : { name: complex ? 'crossed' : '—', parAB_CD: false, parBC_DA: false };
  return {
    poly, sides, angles, sum: angles[0] + angles[1] + angles[2] + angles[3],
    perimeter: sides.AB + sides.BC + sides.CD + sides.DA, area,
    degenerate, complex, valid,
    convexity: !valid ? '—' : reflex ? 'concave' : 'convex',
    className: cls.name, parallels: { AB_CD: cls.parAB_CD, BC_DA: cls.parBC_DA },
    diag: diagonals(poly), splitDiag: valid ? interiorDiagonal(poly) : 'AC',
  };
}
const DIHEDRAL = [
  [0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2],
  [0, 3, 2, 1], [1, 0, 3, 2], [2, 1, 0, 3], [3, 2, 1, 0],
];
function rmsMatch(quad, target) {
  const u = [quad.A, quad.B, quad.C, quad.D];
  const v = [target.A, target.B, target.C, target.D];
  let best = Infinity;
  for (const p of DIHEDRAL) {
    let s = 0;
    for (let i = 0; i < 4; i++) s += (u[i].x - v[p[i]].x) ** 2 + (u[i].y - v[p[i]].y) ** 2;
    best = Math.min(best, Math.sqrt(s / 4));
  }
  return best;
}
const MATCH_RMS = 0.03;
const START = { A: { x: -5, y: -3 }, B: { x: 4, y: -4 }, C: { x: 5, y: 3 }, D: { x: -3, y: 4 } };
function makeTarget(prev) {
  const snap = (v) => Math.round(v / GRID) * GRID;
  const rnd = () => snap(-7 + Math.random() * 14);
  let guard = 0;
  while (guard++ < 400) {
    const pts = [];
    for (let i = 0; i < 4; i++) pts.push({ x: rnd(), y: rnd() });
    const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
    const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
    pts.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    const t = { A: pts[0], B: pts[1], C: pts[2], D: pts[3] };
    const g = geometry(t);
    if (!g.valid || g.area < 14) continue;
    if (Math.min(g.sides.AB, g.sides.BC, g.sides.CD, g.sides.DA) < 1.5) continue;
    if (prev && rmsMatch(t, prev) < 1.0) continue;
    if (rmsMatch(t, START) < 1.0) continue;
    return t;
  }
  return { A: { x: -4, y: -3 }, B: { x: 4, y: -3 }, C: { x: 3, y: 3 }, D: { x: -4, y: 2 } };
}
function angleParts(vals) {
  const tenths = vals.map((v) => Math.round(v * 10));
  const diff = 3600 - tenths.reduce((a, b) => a + b, 0);
  if (diff !== 0) {
    const resid = vals.map((v, i) => v * 10 - tenths[i]);
    const order = vals.map((_, i) => i).sort((i, j) => (diff > 0 ? resid[j] - resid[i] : resid[i] - resid[j]));
    for (let j = 0; j < Math.abs(diff) && j < order.length; j++) tenths[order[j]] += diff > 0 ? 1 : -1;
  }
  return tenths.map((t) => (t / 10).toFixed(1));
}

const PRESETS = {
  Square: { A: { x: -3, y: -3 }, B: { x: 3, y: -3 }, C: { x: 3, y: 3 }, D: { x: -3, y: 3 } },
  Rectangle: { A: { x: -4, y: -2 }, B: { x: 4, y: -2 }, C: { x: 4, y: 2 }, D: { x: -4, y: 2 } },
  Rhombus: { A: { x: 0, y: -3 }, B: { x: 4, y: 0 }, C: { x: 0, y: 3 }, D: { x: -4, y: 0 } },
  Parallelogram: { A: { x: -4, y: -2 }, B: { x: 2, y: -2 }, C: { x: 4, y: 2 }, D: { x: -2, y: 2 } },
  Trapezoid: { A: { x: -5, y: -3 }, B: { x: 5, y: -3 }, C: { x: 3, y: 3 }, D: { x: -3, y: 3 } },
  Kite: { A: { x: 0, y: -4 }, B: { x: 3, y: 0 }, C: { x: 0, y: 5 }, D: { x: -3, y: 0 } },
};
const CONCAVE = { A: { x: -4, y: 4 }, B: { x: -1, y: 1 }, C: { x: 4, y: 4 }, D: { x: 0, y: -4 } };

/* ---------------------------------------------------------------------------- */
let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; bad.push(msg); } }

const rand = (() => { let s = 20260714; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
const snap = (v) => Math.round(v / GRID) * GRID;
const randQuadOrdered = () => {
  // four grid points ordered around their centroid -> a simple quadrilateral
  const pts = [];
  for (let i = 0; i < 4; i++) pts.push({ x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) });
  const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
  const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
  pts.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
  return { A: pts[0], B: pts[1], C: pts[2], D: pts[3] };
};

/* 1) Angle sum = 360° for a large sweep of simple quadrilaterals ------------- */
{
  let worst = 0, tested = 0, concaveSeen = 0;
  for (let i = 0; i < 80000; i++) {
    const g = geometry(randQuadOrdered());
    if (!g.valid) continue;
    tested++;
    if (g.convexity === 'concave') concaveSeen++;
    worst = Math.max(worst, Math.abs(g.sum - 360));
  }
  ok(worst < 1e-9, `angle sum = 360° (worst dev ${worst.toExponential(2)} over ${tested} quads)`);
  ok(concaveSeen > 100, `sweep includes concave quads (${concaveSeen} seen — reflex path exercised)`);
}

/* 2) Convex-corner angles agree with the stable atan2(|cross|,dot) formula --- */
{
  let worst = 0;
  for (let i = 0; i < 40000; i++) {
    const q = randQuadOrdered();
    const g = geometry(q);
    if (!g.valid || g.convexity !== 'convex') continue;
    const poly = g.poly;
    for (let k = 0; k < 4; k++) {
      const P = poly[(k + 3) % 4], V = poly[k], N = poly[(k + 1) % 4];
      const ux = P.x - V.x, uy = P.y - V.y, wx = N.x - V.x, wy = N.y - V.y;
      const ang = Math.atan2(Math.abs(cross2(ux, uy, wx, wy)), dot2(ux, uy, wx, wy)) * RAD2DEG;
      worst = Math.max(worst, Math.abs(ang - g.angles[k]));
    }
  }
  ok(worst < 1e-7, `convex interior angles match direct formula (worst ${worst.toExponential(2)}°)`);
}

/* 3) Self-intersecting ("crossed") quadrilaterals are detected --------------- */
{
  const bowtie = { A: { x: 0, y: 0 }, B: { x: 4, y: 4 }, C: { x: 4, y: 0 }, D: { x: 0, y: 4 } };
  ok(geometry(bowtie).complex === true, `bowtie AB×CD detected as self-intersecting`);
  const bowtie2 = { A: { x: -4, y: 0 }, B: { x: 4, y: 0 }, C: { x: -4, y: 3 }, D: { x: 4, y: 3 } };
  ok(geometry(bowtie2).complex === true, `bowtie BC×DA detected as self-intersecting`);
  ok(geometry(START).complex === false && geometry(START).valid, `START is a simple quadrilateral`);
  // a crossed quad's interior-angle sum is genuinely NOT 360 (so flagging matters)
  const angs = interiorAngles([bowtie.A, bowtie.B, bowtie.C, bowtie.D]);
  ok(Math.abs(angs.reduce((a, b) => a + b, 0) - 360) > 1, `crossed quad's raw angle sum ≠ 360° (why we flag it)`);
}

/* 4) Degenerate (collinear / coincident) detection --------------------------- */
{
  const line = { A: { x: -4, y: -4 }, B: { x: -1, y: -1 }, C: { x: 1, y: 1 }, D: { x: 4, y: 4 } };
  ok(geometry(line).degenerate === true, `collinear points detected as degenerate`);
  const coincident = { A: { x: 1, y: 1 }, B: { x: 1, y: 1 }, C: { x: 3, y: 5 }, D: { x: -2, y: 4 } };
  ok(geometry(coincident).degenerate === true, `coincident vertices detected as degenerate`);
}

/* 5) Classification of the canonical presets -------------------------------- */
{
  const expect = {
    Square: 'square', Rectangle: 'rectangle', Rhombus: 'rhombus',
    Parallelogram: 'parallelogram', Trapezoid: 'trapezoid', Kite: 'kite',
  };
  for (const [name, quad] of Object.entries(PRESETS)) {
    const g = geometry(quad);
    ok(g.valid, `${name} preset is a valid simple quad`);
    ok(g.className === expect[name], `${name} preset classified as "${g.className}" (want "${expect[name]}")`);
    ok(g.convexity === 'convex', `${name} preset is convex`);
    ok(Math.abs(g.sum - 360) < 1e-9, `${name} preset angle sum = 360°`);
  }
  // square has four right angles; rectangle too
  const sq = geometry(PRESETS.Square);
  ok(sq.angles.every((a) => Math.abs(a - 90) < 1e-9), `Square has four exact 90° angles`);
  const re = geometry(PRESETS.Rectangle);
  ok(re.angles.every((a) => Math.abs(a - 90) < 1e-9), `Rectangle has four exact 90° angles`);
  // rhombus has four equal sides but is not a square
  const rh = geometry(PRESETS.Rhombus);
  const s = rh.sides;
  ok(Math.abs(s.AB - s.BC) < 1e-9 && Math.abs(s.BC - s.CD) < 1e-9 && Math.abs(s.CD - s.DA) < 1e-9,
    `Rhombus has four equal sides (${s.AB.toFixed(3)})`);
}

/* 6) Diagonal properties of the presets -------------------------------------- */
{
  const D = (n) => geometry(PRESETS[n]).diag;
  ok(D('Square').equal && D('Square').perp && D('Square').bisect, `Square diagonals: equal, perpendicular, bisect`);
  ok(D('Rectangle').equal && !D('Rectangle').perp && D('Rectangle').bisect, `Rectangle diagonals: equal, bisect, not perpendicular`);
  ok(!D('Rhombus').equal && D('Rhombus').perp && D('Rhombus').bisect, `Rhombus diagonals: perpendicular, bisect, not equal`);
  ok(!D('Parallelogram').equal && !D('Parallelogram').perp && D('Parallelogram').bisect, `Parallelogram diagonals: bisect only`);
  ok(D('Trapezoid').equal && !D('Trapezoid').perp && !D('Trapezoid').bisect, `Isosceles trapezoid diagonals: equal only`);
  ok(!D('Kite').equal && D('Kite').perp && !D('Kite').bisect, `Kite diagonals: perpendicular only`);
}

/* 7) Concave arrowhead: valid, concave, one reflex corner, sum still 360° ---- */
{
  const g = geometry(CONCAVE);
  ok(g.valid, `CONCAVE example is a valid simple quad`);
  ok(g.convexity === 'concave', `CONCAVE example is concave`);
  ok(g.angles.filter((a) => a > 180).length === 1, `CONCAVE has exactly one reflex angle (${g.angles.map((a) => a.toFixed(1)).join(', ')})`);
  ok(Math.abs(g.sum - 360) < 1e-9, `CONCAVE angle sum = 360°`);
  // the interior diagonal is the one from the reflex vertex (so triangles tile)
  ok(g.splitDiag === 'BD', `CONCAVE splitting diagonal is BD (from the reflex corner)`);
}

/* 8) Area via the interior diagonal == shoelace area (convex AND concave) ---- */
{
  const areaTri = (P, Q, R) => Math.abs((Q.x - P.x) * (R.y - P.y) - (R.x - P.x) * (Q.y - P.y)) / 2;
  let worst = 0, tested = 0;
  for (let i = 0; i < 60000; i++) {
    const q = randQuadOrdered();
    const g = geometry(q);
    if (!g.valid) continue;
    tested++;
    const [A, B, C, Dd] = g.poly;
    let a1, a2;
    if (g.splitDiag === 'AC') { a1 = areaTri(A, B, C); a2 = areaTri(A, C, Dd); }
    else { a1 = areaTri(B, C, Dd); a2 = areaTri(B, Dd, A); }
    worst = Math.max(worst, Math.abs(a1 + a2 - g.area));
  }
  ok(worst < 1e-9, `interior-diagonal two-triangle split tiles the area (worst dev ${worst.toExponential(2)} over ${tested})`);
}

/* 9) Sum-preserving angle display always totals exactly 360.0° -------------- */
{
  let sumBad = 0, driftWorst = 0;
  for (let i = 0; i < 80000; i++) {
    const g = geometry(randQuadOrdered());
    if (!g.valid) continue;
    const p = angleParts(g.angles).map(Number);
    if (Math.abs(p[0] + p[1] + p[2] + p[3] - 360) > 1e-9) sumBad++;
    for (let k = 0; k < 4; k++) driftWorst = Math.max(driftWorst, Math.abs(p[k] - g.angles[k]));
  }
  ok(sumBad === 0, `angle parts always sum to exactly 360.0° (${sumBad} bad)`);
  ok(driftWorst <= 0.1 + 1e-9, `each displayed angle within 0.1° of truth (worst ${driftWorst.toFixed(3)}°)`);
}

/* 10) Calibration: self-match 0, dihedral relabel matches, scramble does NOT - */
{
  ok(rmsMatch(START, START) === 0, `rmsMatch(START, START) = 0`);
  // rotate the labels A->B->C->D (same shape, different starting corner)
  const rotated = { A: START.B, B: START.C, C: START.D, D: START.A };
  ok(rmsMatch(rotated, START) < 1e-12, `rotated labels still match (rms ${rmsMatch(rotated, START).toExponential(2)})`);
  // reflect the labels (trace the other way)
  const reflected = { A: START.A, B: START.D, C: START.C, D: START.B };
  ok(rmsMatch(reflected, START) < 1e-12, `reflected labels still match (rms ${rmsMatch(reflected, START).toExponential(2)})`);
  // a NON-dihedral scramble (swap two opposite corners) is a different, crossed
  // shape and must NOT read as a match even though it uses the same four points
  const scramble = { A: START.A, B: START.C, C: START.B, D: START.D };
  ok(rmsMatch(scramble, START) > 0.5, `opposite-corner swap (a crossed shape) does NOT match (rms ${rmsMatch(scramble, START).toFixed(3)})`);
}

/* 11) makeTarget always yields a reachable, valid, on-grid, distinct target -- */
{
  let worstArea = Infinity, invalid = 0, offGrid = 0, tooClose = 0;
  for (let i = 0; i < 3000; i++) {
    const t = makeTarget(null);
    const g = geometry(t);
    if (!g.valid) invalid++;
    worstArea = Math.min(worstArea, g.area);
    if (rmsMatch(t, START) < 1.0) tooClose++;
    for (const k of ['A', 'B', 'C', 'D']) {
      if (Math.abs(t[k].x / GRID - Math.round(t[k].x / GRID)) > 1e-9) offGrid++;
      if (Math.abs(t[k].y / GRID - Math.round(t[k].y / GRID)) > 1e-9) offGrid++;
    }
  }
  ok(invalid === 0, `every target is a valid simple quadrilateral (${invalid} bad)`);
  ok(worstArea >= 14, `every target has area ≥ 14 (worst ${worstArea.toFixed(2)})`);
  ok(offGrid === 0, `all target vertices land on the ${GRID} grid (exact match reachable)`);
  ok(tooClose === 0, `no target within 1.0 rms of START (${tooClose} bad)`);
}

/* 12) Target uniqueness: exact target => CALIBRATED; nearest neighbor is far -- */
{
  let selfWorst = 0, minNeighbor = Infinity;
  for (let i = 0; i < 400; i++) {
    const t = makeTarget(null);
    selfWorst = Math.max(selfWorst, rmsMatch(t, t));
    for (const k of ['A', 'B', 'C', 'D']) {
      for (const [dx, dy] of [[GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID]]) {
        const n = { ...t, [k]: { x: t[k].x + dx, y: t[k].y + dy } };
        minNeighbor = Math.min(minNeighbor, rmsMatch(n, t));
      }
    }
  }
  ok(selfWorst < MATCH_RMS, `exact target always CALIBRATED (self rms ${selfWorst.toExponential(2)} < ${MATCH_RMS})`);
  ok(minNeighbor > MATCH_RMS * 3, `nearest wrong answer well above threshold (${minNeighbor.toFixed(3)} vs ${MATCH_RMS})`);
}

/* 13) The 360° proof: two triangles' angle sums add to the quad's ----------- */
{
  const areaTri = (P, Q, R) => Math.abs((Q.x - P.x) * (R.y - P.y) - (R.x - P.x) * (Q.y - P.y)) / 2;
  let worst = 0;
  for (let i = 0; i < 40000; i++) {
    const g = geometry(randQuadOrdered());
    if (!g.valid) continue;
    const [A, B, C, Dd] = g.poly;
    let t1, t2;
    if (g.splitDiag === 'AC') { t1 = [A, B, C]; t2 = [A, C, Dd]; }
    else { t1 = [B, C, Dd]; t2 = [B, Dd, A]; }
    // each sub-triangle is non-degenerate, so each contributes exactly 180°
    if (areaTri(...t1) < 1e-9 || areaTri(...t2) < 1e-9) continue;
    worst = Math.max(worst, Math.abs(180 + 180 - g.sum));
  }
  ok(worst < 1e-9, `two triangles (180° each) reconstruct the quad's 360° (worst ${worst.toExponential(2)})`);
}

/* ---------------------------------------------------------------------------- */
console.log(`\nQuadrilateralLab audit — ${pass} passed, ${fail} failed\n`);
if (fail) { for (const m of bad) console.log('  ✗ ' + m); process.exit(1); }
else console.log('  ✓ all checks pass\n');
