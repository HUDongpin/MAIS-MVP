/* ============================================================================
   audit-triangle.mjs — numerical proof of the TriangleLab math, independent of
   the React/canvas code. Re-implements the pure geometry exactly as the lab
   does and checks the facts every K-12 student will read.

   Run:  node audit-triangle.mjs
   ========================================================================== */

const RAD2DEG = 180 / Math.PI;
const GRID = 0.5;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

function angleAt(V, P, Q) {
  const ux = P.x - V.x, uy = P.y - V.y;
  const wx = Q.x - V.x, wy = Q.y - V.y;
  const cross = ux * wy - uy * wx;
  const dot = ux * wx + uy * wy;
  return Math.atan2(Math.abs(cross), dot) * RAD2DEG;
}
function doubleSignedArea(t) {
  return t.A.x * (t.B.y - t.C.y) + t.B.x * (t.C.y - t.A.y) + t.C.x * (t.A.y - t.B.y);
}
const SIDE_TOL2 = 1e-6;
const RIGHT_TOL = 0.5;
function classifyBySides(a, b, c) {
  const a2 = a * a, b2 = b * b, c2 = c * c;
  const eqAB = Math.abs(a2 - b2) < SIDE_TOL2;
  const eqBC = Math.abs(b2 - c2) < SIDE_TOL2;
  const eqCA = Math.abs(c2 - a2) < SIDE_TOL2;
  if (eqAB && eqBC && eqCA) return 'equilateral';
  if (eqAB || eqBC || eqCA) return 'isosceles';
  return 'scalene';
}
function classifyByAngles(A, B, C) {
  const max = Math.max(A, B, C);
  if (Math.abs(max - 90) <= RIGHT_TOL) return 'right';
  if (max > 90) return 'obtuse';
  return 'acute';
}
function altitude(P, Q, R) {
  const dx = Q.x - P.x, dy = Q.y - P.y;
  const L2 = dx * dx + dy * dy || 1;
  const t = ((R.x - P.x) * dx + (R.y - P.y) * dy) / L2;
  const foot = { x: P.x + t * dx, y: P.y + t * dy };
  return { foot, t, height: dist(R, foot) };
}
function geometry(t) {
  const a = dist(t.B, t.C), b = dist(t.C, t.A), c = dist(t.A, t.B);
  const area = Math.abs(doubleSignedArea(t)) / 2;
  const degenerate = area < 1e-6 || a < 1e-9 || b < 1e-9 || c < 1e-9;
  const A = degenerate ? 0 : angleAt(t.A, t.B, t.C);
  const B = degenerate ? 0 : angleAt(t.B, t.C, t.A);
  const C = degenerate ? 0 : angleAt(t.C, t.A, t.B);
  return {
    sides: { a, b, c }, angles: { A, B, C }, sum: A + B + C,
    perimeter: a + b + c, area, degenerate,
    classSides: degenerate ? '—' : classifyBySides(a, b, c),
    classAngles: degenerate ? '—' : classifyByAngles(A, B, C),
  };
}
const PERMS = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
function rmsMatch(t, target) {
  const u = [t.A, t.B, t.C], v = [target.A, target.B, target.C];
  let best = Infinity;
  for (const p of PERMS) {
    let s = 0;
    for (let i = 0; i < 3; i++) {
      const dx = u[i].x - v[p[i]].x, dy = u[i].y - v[p[i]].y;
      s += dx * dx + dy * dy;
    }
    best = Math.min(best, Math.sqrt(s / 3));
  }
  return best;
}
const START = { A: { x: -4, y: -3 }, B: { x: 4, y: -3 }, C: { x: 1, y: 4 } };
function makeTarget(prev) {
  const snap = (v) => Math.round(v / GRID) * GRID;
  const randPt = () => ({ x: snap(-6 + Math.random() * 12), y: snap(-6 + Math.random() * 12) });
  let t, guard = 0;
  do {
    t = { A: randPt(), B: randPt(), C: randPt() };
    guard++;
  } while (guard < 200 && (geometry(t).area < 6 || (prev && rmsMatch(t, prev) < 0.5) || rmsMatch(t, START) < 0.5));
  return t;
}
const PRESETS = {
  Equilateral: (() => { const R = 4.6; return {
    A: { x: 0, y: R }, B: { x: -R*Math.sqrt(3)/2, y: -R/2 }, C: { x: R*Math.sqrt(3)/2, y: -R/2 } }; })(),
  Isosceles: { A: { x: -4, y: -3 }, B: { x: 4, y: -3 }, C: { x: 0, y: 4 } },
  Right: { A: { x: -3, y: -3 }, B: { x: 5, y: -3 }, C: { x: -3, y: 2 } },
  Obtuse: { A: { x: -5, y: -2 }, B: { x: 3, y: -2 }, C: { x: 4, y: 1 } },
};

function angleParts(A, B, C) {
  const vals = [A, B, C];
  const tenths = vals.map((v) => Math.round(v * 10));
  const diff = 1800 - (tenths[0] + tenths[1] + tenths[2]);
  if (diff !== 0) {
    const resid = vals.map((v, i) => v * 10 - tenths[i]);
    const order = [0, 1, 2].sort((i, j) => (diff > 0 ? resid[j] - resid[i] : resid[i] - resid[j]));
    for (let j = 0; j < Math.abs(diff) && j < 3; j++) tenths[order[j]] += diff > 0 ? 1 : -1;
  }
  return tenths.map((t) => (t / 10).toFixed(1));
}

/* ---------------------------------------------------------------------------- */
let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; bad.push(msg); } }

const rand = (() => { let s = 20260714; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
const snap = (v) => Math.round(v / GRID) * GRID;

/* 1) Angle sum = 180 for a large random sweep of non-degenerate triangles ---- */
let sumWorst = 0, tested = 0;
for (let i = 0; i < 60000; i++) {
  const t = {
    A: { x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) },
    B: { x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) },
    C: { x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) },
  };
  const g = geometry(t);
  if (g.degenerate) continue;
  tested++;
  sumWorst = Math.max(sumWorst, Math.abs(g.sum - 180));
}
ok(sumWorst < 1e-9, `angle sum = 180 (worst dev ${sumWorst.toExponential(2)} over ${tested} triangles)`);

/* 2) angleAt agrees with the Law of Cosines --------------------------------- */
let cosWorst = 0;
for (let i = 0; i < 20000; i++) {
  const t = {
    A: { x: -9 + rand() * 18, y: -9 + rand() * 18 },
    B: { x: -9 + rand() * 18, y: -9 + rand() * 18 },
    C: { x: -9 + rand() * 18, y: -9 + rand() * 18 },
  };
  const g = geometry(t);
  if (g.degenerate) continue;
  const { a, b, c } = g.sides;
  // law of cosines for angle A (opposite a): a² = b² + c² − 2bc·cosA
  const cosA = (b * b + c * c - a * a) / (2 * b * c);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA))) * RAD2DEG;
  cosWorst = Math.max(cosWorst, Math.abs(A - g.angles.A));
}
ok(cosWorst < 1e-7, `angleAt matches Law of Cosines (worst dev ${cosWorst.toExponential(2)}°)`);

/* 3) Area via shoelace == ½·base·height for ALL three base choices ----------- */
let areaWorst = 0;
for (let i = 0; i < 20000; i++) {
  const t = {
    A: { x: -9 + rand() * 18, y: -9 + rand() * 18 },
    B: { x: -9 + rand() * 18, y: -9 + rand() * 18 },
    C: { x: -9 + rand() * 18, y: -9 + rand() * 18 },
  };
  const g = geometry(t);
  if (g.degenerate) continue;
  const bases = [
    [t.B, t.C, t.A], // base a
    [t.C, t.A, t.B], // base b
    [t.A, t.B, t.C], // base c
  ];
  for (const [P, Q, Rr] of bases) {
    const alt = altitude(P, Q, Rr);
    const areaBH = 0.5 * dist(P, Q) * alt.height;
    areaWorst = Math.max(areaWorst, Math.abs(areaBH - g.area));
  }
}
ok(areaWorst < 1e-9, `½·base·height == shoelace area, all 3 bases (worst dev ${areaWorst.toExponential(2)})`);

/* 4) Classification of the canonical presets -------------------------------- */
{
  const e = geometry(PRESETS.Equilateral);
  ok(e.classSides === 'equilateral', `Equilateral preset -> sides=${e.classSides}`);
  ok(e.classAngles === 'acute', `Equilateral preset -> angles=${e.classAngles}`);
  ok(Math.abs(e.angles.A - 60) < 1e-6 && Math.abs(e.angles.B - 60) < 1e-6 && Math.abs(e.angles.C - 60) < 1e-6,
    `Equilateral angles all 60° (${e.angles.A.toFixed(4)}, ${e.angles.B.toFixed(4)}, ${e.angles.C.toFixed(4)})`);

  const iso = geometry(PRESETS.Isosceles);
  ok(iso.classSides === 'isosceles', `Isosceles preset -> sides=${iso.classSides}`);

  const rt = geometry(PRESETS.Right);
  ok(rt.classAngles === 'right', `Right preset -> angles=${rt.classAngles}`);
  ok(Math.abs(Math.max(rt.angles.A, rt.angles.B, rt.angles.C) - 90) < 1e-9, `Right preset has an exact 90° angle`);

  const ob = geometry(PRESETS.Obtuse);
  ok(ob.classAngles === 'obtuse', `Obtuse preset -> angles=${ob.classAngles}`);
  ok(Math.max(ob.angles.A, ob.angles.B, ob.angles.C) > 90, `Obtuse preset has an angle > 90°`);
}

/* 5) No equilateral triangle exists on the half-unit grid (so the grid-play
      classifier never falsely reports "equilateral") --------------------------*/
{
  let foundGridEquilateral = false;
  for (let i = 0; i < 200000; i++) {
    const t = {
      A: { x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) },
      B: { x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) },
      C: { x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) },
    };
    const g = geometry(t);
    if (!g.degenerate && g.classSides === 'equilateral') { foundGridEquilateral = true; break; }
  }
  ok(!foundGridEquilateral, `no false "equilateral" on the grid (200k samples)`);
}

/* 6) Degenerate (collinear) detection --------------------------------------- */
{
  const line = { A: { x: -4, y: -4 }, B: { x: 0, y: 0 }, C: { x: 3, y: 3 } };
  ok(geometry(line).degenerate === true, `collinear points detected as degenerate`);
  const coincident = { A: { x: 1, y: 1 }, B: { x: 1, y: 1 }, C: { x: 3, y: 5 } };
  ok(geometry(coincident).degenerate === true, `coincident vertices detected as degenerate`);
  ok(geometry(START).degenerate === false, `START triangle is non-degenerate`);
}

/* 7) Calibration metric: self-match is 0, and relabeling doesn't matter ------ */
{
  ok(rmsMatch(START, START) === 0, `rmsMatch(START, START) = 0`);
  const relabeled = { A: START.B, B: START.C, C: START.A }; // same triangle, corners renamed
  ok(rmsMatch(relabeled, START) < 1e-12, `relabeled triangle still matches (rms ${rmsMatch(relabeled, START).toExponential(2)})`);
  // one corner off by exactly one grid step -> a clean, non-zero, sub-threshold-free score
  const off = { A: { x: START.A.x + GRID, y: START.A.y }, B: START.B, C: START.C };
  const offRms = rmsMatch(off, START);
  ok(offRms > 0.2, `one-corner-off reads a clear mismatch (rms ${offRms.toFixed(3)})`);
}

/* 8) makeTarget always yields a reachable, non-degenerate, non-START target -- */
{
  let worstArea = Infinity, tooCloseToStart = 0, offGrid = 0;
  for (let i = 0; i < 4000; i++) {
    const t = makeTarget(null);
    const g = geometry(t);
    worstArea = Math.min(worstArea, g.area);
    if (rmsMatch(t, START) < 0.5) tooCloseToStart++;
    for (const k of ['A', 'B', 'C']) {
      if (Math.abs(t[k].x / GRID - Math.round(t[k].x / GRID)) > 1e-9) offGrid++;
      if (Math.abs(t[k].y / GRID - Math.round(t[k].y / GRID)) > 1e-9) offGrid++;
    }
  }
  ok(worstArea >= 6, `every target has area ≥ 6 (worst ${worstArea.toFixed(2)})`);
  ok(tooCloseToStart === 0, `no target within 0.5 rms of START (${tooCloseToStart} bad)`);
  ok(offGrid === 0, `all target vertices land on the ${GRID} grid (so exact match reachable)`);
}

/* 9) Target uniqueness: the exact target scores 0; nearest grid neighbor is far
      above the CALIBRATED threshold, so no false stamp -------------------------*/
{
  const MATCH_RMS = 0.03;
  let minNeighbor = Infinity, selfWorst = 0;
  for (let i = 0; i < 500; i++) {
    const t = makeTarget(null);
    selfWorst = Math.max(selfWorst, rmsMatch(t, t));
    // nudge one vertex by one grid step in each of 4 directions
    for (const k of ['A', 'B', 'C']) {
      for (const [dx, dy] of [[GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID]]) {
        const n = { ...t, [k]: { x: t[k].x + dx, y: t[k].y + dy } };
        minNeighbor = Math.min(minNeighbor, rmsMatch(n, t));
      }
    }
  }
  ok(selfWorst < MATCH_RMS, `exact target always CALIBRATED (self rms ${selfWorst.toExponential(2)} < ${MATCH_RMS})`);
  ok(minNeighbor > MATCH_RMS * 3, `nearest wrong answer is well above threshold (${minNeighbor.toFixed(3)} vs ${MATCH_RMS})`);
}

/* 10) Angle-sum wedge identity: the three interior angles (radians) sum to π,
       so the "straightened corners" fill exactly a straight angle ------------ */
{
  let worst = 0;
  for (let i = 0; i < 20000; i++) {
    const t = {
      A: { x: -9 + rand() * 18, y: -9 + rand() * 18 },
      B: { x: -9 + rand() * 18, y: -9 + rand() * 18 },
      C: { x: -9 + rand() * 18, y: -9 + rand() * 18 },
    };
    const g = geometry(t);
    if (g.degenerate) continue;
    const radSum = (g.angles.A + g.angles.B + g.angles.C) / RAD2DEG;
    worst = Math.max(worst, Math.abs(radSum - Math.PI));
  }
  ok(worst < 1e-11, `three wedges fill exactly π radians (worst dev ${worst.toExponential(2)})`);
}

/* 11) Sum-preserving angle display: the three shown parts ALWAYS total exactly
       180.0°, and no part strays more than 0.1° from its true value ---------- */
{
  let sumBad = 0, driftWorst = 0;
  for (let i = 0; i < 60000; i++) {
    const t = {
      A: { x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) },
      B: { x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) },
      C: { x: snap(-9 + rand() * 18), y: snap(-9 + rand() * 18) },
    };
    const g = geometry(t);
    if (g.degenerate) continue;
    const p = angleParts(g.angles.A, g.angles.B, g.angles.C).map(Number);
    if (Math.abs(p[0] + p[1] + p[2] - 180) > 1e-9) sumBad++;
    driftWorst = Math.max(
      driftWorst,
      Math.abs(p[0] - g.angles.A),
      Math.abs(p[1] - g.angles.B),
      Math.abs(p[2] - g.angles.C)
    );
  }
  ok(sumBad === 0, `angle parts always sum to exactly 180.0° (${sumBad} bad)`);
  ok(driftWorst <= 0.1 + 1e-9, `each displayed angle within 0.1° of truth (worst ${driftWorst.toFixed(3)}°)`);
}

/* ---------------------------------------------------------------------------- */
console.log(`\nTriangleLab audit — ${pass} passed, ${fail} failed\n`);
if (fail) { for (const m of bad) console.log('  ✗ ' + m); process.exit(1); }
else console.log('  ✓ all checks pass\n');
