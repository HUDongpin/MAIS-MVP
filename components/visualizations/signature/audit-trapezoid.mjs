/* ============================================================================
   audit-trapezoid.mjs — numerical proof of the TrapezoidLab math, independent of
   the React/canvas code. Re-implements the pure geometry exactly as the lab does
   and checks the facts every K-12 student will read.

   Run:  node audit-trapezoid.mjs
   ========================================================================== */

const RAD2DEG = 180 / Math.PI;
const GRID = 0.5;
const BOUND = 9.5;
const MINH = 1;
const MINB = 1;
const TOL = 1e-6;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

function angleAt(V, P, Q) {
  const ux = P.x - V.x, uy = P.y - V.y;
  const wx = Q.x - V.x, wy = Q.y - V.y;
  const cross = ux * wy - uy * wx;
  const dot = ux * wx + uy * wy;
  return Math.atan2(Math.abs(cross), dot) * RAD2DEG;
}
function shoelace2(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s;
}
function classify(b1, b2, h, tz) {
  const { A, B, C, D } = tz;
  const L = D.x - A.x, R = B.x - C.x;
  const eqBases = Math.abs(b1 - b2) < TOL;
  const leftVert = Math.abs(L) < TOL, rightVert = Math.abs(R) < TOL;
  if (eqBases) {
    if (leftVert && rightVert) return Math.abs(b1 - h) < TOL ? 'square' : 'rectangle';
    return 'parallelogram';
  }
  if (leftVert || rightVert) return 'right trapezoid';
  if (Math.abs(L - R) < TOL) return 'isosceles trapezoid';
  return 'scalene trapezoid';
}
function geometry(tz) {
  const { A, B, C, D } = tz;
  const bottomY = A.y, topY = C.y;
  const h = topY - bottomY;
  const b1 = B.x - A.x, b2 = C.x - D.x;
  const mid = (b1 + b2) / 2;
  const legL = dist(D, A), legR = dist(B, C);
  const legsEqual = Math.abs(legL - legR) < TOL;
  const poly = [A, B, C, D];
  const area = Math.abs(shoelace2(poly)) / 2;
  const areaFormula = 0.5 * (b1 + b2) * h;
  const degenerate = h < MINH - TOL || b1 < MINB - TOL || b2 < MINB - TOL || h < TOL || b1 < TOL || b2 < TOL;
  const angA = degenerate ? 0 : angleAt(A, B, D);
  const angB = degenerate ? 0 : angleAt(B, C, A);
  const angC = degenerate ? 0 : angleAt(C, D, B);
  const angD = degenerate ? 0 : angleAt(D, A, C);
  return {
    bottomY, topY, h, b1, b2, mid, legL, legR, legsEqual,
    area, areaFormula, degenerate,
    angles: { A: angA, B: angB, C: angC, D: angD },
    angleSum: angA + angB + angC + angD,
    perimeter: b1 + b2 + legL + legR,
    className: degenerate ? '—' : classify(b1, b2, h, tz),
    poly,
  };
}
function rmsMatch(tz, target) {
  let s = 0;
  for (const k of ['A', 'B', 'C', 'D']) {
    const dx = tz[k].x - target[k].x, dy = tz[k].y - target[k].y;
    s += dx * dx + dy * dy;
  }
  return Math.sqrt(s / 4);
}
const MATCH_RMS = 0.03;
const START = { A: { x: -6, y: -3 }, B: { x: 6, y: -3 }, C: { x: 4, y: 3 }, D: { x: -2, y: 3 } };
function inBounds(t) {
  for (const k of ['A', 'B', 'C', 'D'])
    if (t[k].x < -BOUND || t[k].x > BOUND || t[k].y < -BOUND || t[k].y > BOUND) return false;
  return t.A.x < t.B.x && t.D.x < t.C.x && t.C.y - t.A.y >= MINH;
}
function makeTarget(prev) {
  const snap = (v) => Math.round(v / GRID) * GRID;
  const rr = (lo, hi) => snap(lo + Math.random() * (hi - lo));
  let t, guard = 0;
  do {
    const bottomY = rr(-8, 0), h = rr(3, 8), topY = bottomY + h;
    const axL = rr(-9, 1), b1 = rr(4, 10), bxR = axL + b1;
    const b2 = rr(2, Math.max(2, b1 - 1));
    const shift = rr(-3, 3), dxL = axL + shift, cxR = dxL + b2;
    t = { A: { x: axL, y: bottomY }, B: { x: bxR, y: bottomY }, C: { x: cxR, y: topY }, D: { x: dxL, y: topY } };
    guard++;
  } while (
    guard < 400 &&
    (!inBounds(t) || geometry(t).area < 12 ||
      Math.abs(t.B.x - t.A.x - (t.C.x - t.D.x)) < TOL ||
      (prev && rmsMatch(t, prev) < 1) || rmsMatch(t, START) < 1)
  );
  return t;
}
const PRESETS = {
  Right: { A: { x: -5, y: -3 }, B: { x: 5, y: -3 }, C: { x: 1, y: 3 }, D: { x: -5, y: 3 } },
  Isosceles: { A: { x: -6, y: -3 }, B: { x: 6, y: -3 }, C: { x: 3, y: 3 }, D: { x: -3, y: 3 } },
  Scalene: { A: { x: -6, y: -3 }, B: { x: 5, y: -3 }, C: { x: 4, y: 3 }, D: { x: -3, y: 3 } },
  Parallelogram: { A: { x: -5, y: -3 }, B: { x: 5, y: -3 }, C: { x: 7, y: 3 }, D: { x: -3, y: 3 } },
};
function angleReadout(g) {
  const aR = Math.round(g.angles.A * 10) / 10;
  const dR = Math.round((180 - aR) * 10) / 10;
  const bR = Math.round(g.angles.B * 10) / 10;
  const cR = Math.round((180 - bR) * 10) / 10;
  return { A: aR, D: dR, B: bR, C: cR };
}

/* a random trapezoid in the lab's family (horizontal bases on the grid) */
const rand = (() => { let s = 20260715; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
const snap = (v) => Math.round(v / GRID) * GRID;
function randTrap() {
  const bottomY = snap(-8 + rand() * 8);
  const h = snap(1 + rand() * 7);
  const topY = bottomY + h;
  const axL = snap(-9 + rand() * 8);
  const b1 = snap(1 + rand() * 9);
  const bxR = axL + b1;
  const b2 = snap(1 + rand() * 9);
  const dxL = snap(axL - 3 + rand() * 6);
  const cxR = dxL + b2;
  return { A: { x: axL, y: bottomY }, B: { x: bxR, y: bottomY }, C: { x: cxR, y: topY }, D: { x: dxL, y: topY } };
}

/* ---------------------------------------------------------------------------- */
let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; bad.push(msg); } }

/* 1) Area formula ½(b₁+b₂)h EXACTLY equals the shoelace area, for a large sweep */
{
  let worst = 0, tested = 0;
  for (let i = 0; i < 80000; i++) {
    const t = randTrap();
    const g = geometry(t);
    if (g.degenerate) continue;
    tested++;
    worst = Math.max(worst, Math.abs(g.areaFormula - g.area));
  }
  ok(worst < 1e-9, `½(b₁+b₂)h == shoelace area (worst dev ${worst.toExponential(2)} over ${tested} trapezoids)`);
}

/* 2) Midsegment == average of the bases, and == area / height ---------------- */
{
  let worstAvg = 0, worstAH = 0;
  for (let i = 0; i < 40000; i++) {
    const t = randTrap();
    const g = geometry(t);
    if (g.degenerate) continue;
    worstAvg = Math.max(worstAvg, Math.abs(g.mid - (g.b1 + g.b2) / 2));
    worstAH = Math.max(worstAH, Math.abs(g.mid - g.area / g.h));
  }
  ok(worstAvg < 1e-12, `midsegment == ½(b₁+b₂) (worst ${worstAvg.toExponential(2)})`);
  ok(worstAH < 1e-9, `midsegment == area / height, so area == m·h (worst ${worstAH.toExponential(2)})`);
}

/* 3) Interior angle sum == 360°, and the two leg pairs are each supplementary - */
{
  let sumWorst = 0, pairWorst = 0, tested = 0;
  for (let i = 0; i < 80000; i++) {
    const t = randTrap();
    const g = geometry(t);
    if (g.degenerate) continue;
    tested++;
    sumWorst = Math.max(sumWorst, Math.abs(g.angleSum - 360));
    pairWorst = Math.max(
      pairWorst,
      Math.abs(g.angles.A + g.angles.D - 180),
      Math.abs(g.angles.B + g.angles.C - 180)
    );
  }
  ok(sumWorst < 1e-9, `interior angles sum to 360° (worst dev ${sumWorst.toExponential(2)} over ${tested})`);
  ok(pairWorst < 1e-9, `∠A+∠D=180° and ∠B+∠C=180° (co-interior; worst dev ${pairWorst.toExponential(2)})`);
}

/* 4) The doubling proof: a half-turn copy about the midpoint of BC tiles a
      parallelogram of base (b₁+b₂) and height h, whose area is 2× the trapezoid */
{
  let baseWorst = 0, areaWorst = 0, shareWorst = 0;
  for (let i = 0; i < 40000; i++) {
    const t = randTrap();
    const g = geometry(t);
    if (g.degenerate) continue;
    const { A, B, C, D } = t;
    const M = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
    const rot = (P) => ({ x: 2 * M.x - P.x, y: 2 * M.y - P.y }); // 180° about M
    // B must map onto C exactly (the shared leg), so the copy joins seamlessly
    const Bp = rot(B);
    shareWorst = Math.max(shareWorst, dist(Bp, C));
    // parallelogram vertices A, D'(=rot D), A'(=rot A), D
    const Dp = rot(D), Ap = rot(A);
    const para = [A, Dp, Ap, D];
    const paraArea = Math.abs(shoelace2(para)) / 2;
    // its two "base" edges (A→D' and D→A') should both have length b₁+b₂
    baseWorst = Math.max(baseWorst, Math.abs(dist(A, Dp) - (g.b1 + g.b2)), Math.abs(dist(D, Ap) - (g.b1 + g.b2)));
    areaWorst = Math.max(areaWorst, Math.abs(paraArea - 2 * g.area), Math.abs(paraArea - (g.b1 + g.b2) * g.h));
  }
  ok(shareWorst < 1e-9, `half-turn maps B exactly onto C — the copies share leg BC (worst ${shareWorst.toExponential(2)})`);
  ok(baseWorst < 1e-9, `parallelogram base == b₁+b₂ (worst ${baseWorst.toExponential(2)})`);
  ok(areaWorst < 1e-9, `parallelogram area == (b₁+b₂)·h == 2× trapezoid (worst ${areaWorst.toExponential(2)})`);
}

/* 5) Classification of the canonical presets -------------------------------- */
{
  ok(geometry(PRESETS.Right).className === 'right trapezoid', `Right preset -> ${geometry(PRESETS.Right).className}`);
  ok(geometry(PRESETS.Isosceles).className === 'isosceles trapezoid', `Isosceles preset -> ${geometry(PRESETS.Isosceles).className}`);
  ok(geometry(PRESETS.Scalene).className === 'scalene trapezoid', `Scalene preset -> ${geometry(PRESETS.Scalene).className}`);
  ok(geometry(PRESETS.Parallelogram).className === 'parallelogram', `Parallelogram preset -> ${geometry(PRESETS.Parallelogram).className}`);
  // the isosceles preset really has equal legs and equal base angles
  const iso = geometry(PRESETS.Isosceles);
  ok(iso.legsEqual, `Isosceles preset has equal legs (${iso.legL.toFixed(4)} vs ${iso.legR.toFixed(4)})`);
  ok(Math.abs(iso.angles.A - iso.angles.B) < 1e-9, `Isosceles preset has equal bottom base angles`);
  // the right preset really has a 90° angle
  const rt = geometry(PRESETS.Right);
  ok(Math.abs(Math.min(rt.angles.A, rt.angles.B, rt.angles.C, rt.angles.D) - 90) < 1e-9 ||
     Math.abs(rt.angles.A - 90) < 1e-9 || Math.abs(rt.angles.D - 90) < 1e-9,
     `Right preset has an exact 90° angle`);
}

/* 6) Isosceles trapezoid property: equal legs ⇒ equal diagonals -------------- */
{
  const t = PRESETS.Isosceles;
  const AC = dist(t.A, t.C), BD = dist(t.B, t.D);
  ok(Math.abs(AC - BD) < 1e-9, `isosceles trapezoid has equal diagonals (AC ${AC.toFixed(4)} == BD ${BD.toFixed(4)})`);
}

/* 7) Degenerate detection: zero height / zero base --------------------------- */
{
  const flat = { A: { x: -3, y: 0 }, B: { x: 3, y: 0 }, C: { x: 2, y: 0 }, D: { x: -2, y: 0 } };
  ok(geometry(flat).degenerate === true, `zero-height shape flagged degenerate`);
  const noTop = { A: { x: -3, y: -2 }, B: { x: 3, y: -2 }, C: { x: 0.4, y: 2 }, D: { x: 0, y: 2 } };
  ok(geometry(noTop).degenerate === true, `sub-min top base flagged degenerate`);
  ok(geometry(START).degenerate === false, `START trapezoid is non-degenerate`);
}

/* 8) START trapezoid reads the numbers the header promises ------------------- */
{
  const g = geometry(START);
  ok(g.b1 === 12 && g.b2 === 6 && g.h === 6, `START: b₁=${g.b1}, b₂=${g.b2}, h=${g.h}`);
  ok(g.mid === 9, `START midsegment = ${g.mid}`);
  ok(g.areaFormula === 54 && g.area === 54, `START area = ½(12+6)·6 = ${g.areaFormula} (shoelace ${g.area})`);
  ok(g.className === 'scalene trapezoid', `START is ${g.className}`);
}

/* 9) Calibration metric: self-match is 0; one grid step off reads a mismatch -- */
{
  ok(rmsMatch(START, START) === 0, `rmsMatch(START, START) = 0`);
  const off = { ...START, A: { x: START.A.x + GRID, y: START.A.y } };
  ok(rmsMatch(off, START) > 0.2, `one-corner-off reads a clear mismatch (rms ${rmsMatch(off, START).toFixed(3)})`);
}

/* 10) makeTarget always yields a reachable, on-grid, non-START target -------- */
{
  let worstArea = Infinity, tooClose = 0, offGrid = 0, outOfBounds = 0;
  for (let i = 0; i < 5000; i++) {
    const t = makeTarget(null);
    const g = geometry(t);
    worstArea = Math.min(worstArea, g.area);
    if (rmsMatch(t, START) < 1) tooClose++;
    if (!inBounds(t)) outOfBounds++;
    for (const k of ['A', 'B', 'C', 'D']) {
      if (Math.abs(t[k].x / GRID - Math.round(t[k].x / GRID)) > 1e-9) offGrid++;
      if (Math.abs(t[k].y / GRID - Math.round(t[k].y / GRID)) > 1e-9) offGrid++;
    }
  }
  ok(worstArea >= 12, `every target has area ≥ 12 (worst ${worstArea.toFixed(2)})`);
  ok(tooClose === 0, `no target within 1.0 rms of START (${tooClose} bad)`);
  ok(outOfBounds === 0, `every target is a valid in-bounds trapezoid (${outOfBounds} bad)`);
  ok(offGrid === 0, `all target corners land on the ${GRID} grid (exact match reachable)`);
}

/* 11) Target uniqueness: exact target scores 0; nearest grid neighbour is well
       above the CALIBRATED threshold, so no false stamp ------------------------ */
{
  let minNeighbor = Infinity, selfWorst = 0;
  for (let i = 0; i < 500; i++) {
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

/* 12) Supplementary-preserving angle display: the two shown pairs ALWAYS total
       exactly 180.0°, all four total 360.0°, none drifts more than 0.05° ------ */
{
  let sumBad = 0, driftWorst = 0, totalBad = 0;
  for (let i = 0; i < 80000; i++) {
    const t = randTrap();
    const g = geometry(t);
    if (g.degenerate) continue;
    const r = angleReadout(g);
    if (Math.abs(r.A + r.D - 180) > 1e-9) sumBad++;
    if (Math.abs(r.B + r.C - 180) > 1e-9) sumBad++;
    if (Math.abs(r.A + r.B + r.C + r.D - 360) > 1e-9) totalBad++;
    driftWorst = Math.max(
      driftWorst,
      Math.abs(r.A - g.angles.A), Math.abs(r.B - g.angles.B),
      Math.abs(r.C - g.angles.C), Math.abs(r.D - g.angles.D)
    );
  }
  ok(sumBad === 0, `each leg pair shows exactly 180.0° (${sumBad} bad)`);
  ok(totalBad === 0, `four shown angles total exactly 360.0° (${totalBad} bad)`);
  ok(driftWorst <= 0.05 + 1e-9, `each displayed angle within 0.05° of truth (worst ${driftWorst.toFixed(4)}°)`);
}

/* 13) Shearing invariance: sliding the top base sideways keeps the area ------- */
{
  const g0 = geometry(START);
  const sheared = { A: START.A, B: START.B, C: { x: START.C.x + 3, y: START.C.y }, D: { x: START.D.x + 3, y: START.D.y } };
  const g1 = geometry(sheared);
  ok(Math.abs(g0.areaFormula - g1.areaFormula) < 1e-9 && Math.abs(g0.area - g1.area) < 1e-9,
    `shearing the top base leaves area unchanged (${g0.area} == ${g1.area})`);
}

/* ---------------------------------------------------------------------------- */
console.log(`\nTrapezoidLab audit — ${pass} passed, ${fail} failed\n`);
if (fail) { for (const m of bad) console.log('  ✗ ' + m); process.exit(1); }
else console.log('  ✓ all checks pass\n');
