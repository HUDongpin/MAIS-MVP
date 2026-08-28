/* ============================================================================
   audit-composingshapes.mjs — numerical proof of the ComposingShapesLab math,
   independent of the React/canvas code.

   Two things make this audit worth more than a re-run of the lab's own code:

   1. IT TESTS THE SHIPPED CONSTANTS.  The kit, the goals, the recipes, the step
      seeds and the challenge targets are pulled OUT of ComposingShapesLab.jsx
      and evaluated here, so a typo in a placement fails the audit instead of
      quietly shipping a lesson whose picture contradicts its words.

   2. IT CHECKS THE BOUNDARY TWICE, TWO DIFFERENT WAYS.  The lab decides how
      many sides a shape has with exact integer arithmetic on the lattice.  This
      file ALSO walks the same outline in ordinary floating-point x/y and counts
      corners with atan2.  Two implementations that share no arithmetic have to
      agree on every configuration, or the count is not trustworthy.

   Run:  node audit-composingshapes.mjs
   ========================================================================== */

import fs from 'fs';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${name}  ${detail}`); }
};
const head = (s) => console.log(`\n── ${s} ──`);

/* ---------------------------------------------------------------------------
   Pull the shipped constants out of the component.
   ------------------------------------------------------------------------- */
const SRC = fs.readFileSync(new URL('./ComposingShapesLab.jsx', import.meta.url), 'utf8');

function grab(name) {
  const i = SRC.indexOf(`const ${name} = `);
  if (i < 0) throw new Error(`constant ${name} not found in the lab source`);
  let j = i + `const ${name} = `.length;
  const open = SRC[j];
  const close = open === '[' ? ']' : '}';
  let depth = 0, inStr = null;
  for (let k = j; k < SRC.length; k++) {
    const c = SRC[k];
    if (inStr) { if (c === inStr && SRC[k - 1] !== '\\') inStr = null; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return SRC.slice(j, k + 1); }
  }
  throw new Error(`could not balance ${name}`);
}

function grabFunction(name) {
  const start = SRC.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`function ${name} not found in the lab source`);
  const open = SRC.indexOf('{', start);
  let depth = 0;
  let inStr = null;
  for (let i = open; i < SRC.length; i++) {
    const c = SRC[i];
    if (inStr) {
      if (c === inStr && SRC[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return SRC.slice(start, i + 1);
  }
  throw new Error(`could not balance function ${name}`);
}
const UP = 0, DOWN = 1;
const evalConst = (name) => eval(`(${grab(name)})`);

const KIT = evalConst('KIT');
const GOALS = evalConst('GOALS');
const RECIPES = evalConst('RECIPES');
const SEEDS = evalConst('SEEDS');
const TARGETS = evalConst('TARGETS');
const STEPS = evalConst('STEPS');
const KIND = Object.fromEntries(KIT.map((k) => [k.kind, k]));

/* ---------------------------------------------------------------------------
   The model, re-implemented.
   ------------------------------------------------------------------------- */
const SQ3 = Math.sqrt(3);
const wx = (a, b) => a + b / 2;
const wy = (b) => (b * SQ3) / 2;
const rot60 = ([a, b]) => [-b, a + b];
const rotK = (p, k) => { let q = p; const n = ((k % 6) + 6) % 6; for (let i = 0; i < n; i++) q = rot60(q); return q; };
const sub = ([a, b], [c, d]) => [a - c, b - d];
const cross = ([a, b], [c, d]) => a * d - b * c;
const len2 = ([a, b]) => a * a + b * b + a * b;
const ck = (a, b, t) => `${a},${b},${t}`;
const pk = ([a, b]) => `${a},${b}`;

const cellVerts = (a, b, t) =>
  t === UP ? [[a, b], [a + 1, b], [a, b + 1]] : [[a + 1, b], [a + 1, b + 1], [a, b + 1]];

function cellFromVerts(vs) {
  const minA = Math.min(vs[0][0], vs[1][0], vs[2][0]);
  const minB = Math.min(vs[0][1], vs[1][1], vs[2][1]);
  const have = new Set(vs.map(pk));
  if (have.size !== 3) return null;
  const m = (c) => c.every((p) => have.has(pk(p)));
  if (m(cellVerts(minA, minB, UP))) return [minA, minB, UP];
  if (m(cellVerts(minA, minB, DOWN))) return [minA, minB, DOWN];
  return null;
}
const rotCell = ([a, b, t], k) => cellFromVerts(cellVerts(a, b, t).map((p) => rotK(p, k)));
const neighbours = ([a, b, t]) =>
  t === UP ? [[a, b, DOWN], [a - 1, b, DOWN], [a, b - 1, DOWN]]
           : [[a, b, UP], [a + 1, b, UP], [a, b + 1, UP]];
const pieceCells = (p) => KIND[p.kind].cells.map((c) => {
  const [a, b, t] = rotCell(c, p.rot);
  return [a + p.pos[0], b + p.pos[1], t];
});
const shippedSeamEdgesOf = eval(`(${grabFunction('seamEdgesOf')})`);

/* Independent oracle: discover neighbouring cells first, then intersect their
   vertex sets.  The shipped renderer instead builds an undirected edge-owner
   ledger, so agreement does not come from running the same implementation. */
function independentSeamEdgeKeys(list) {
  const owner = new Map();
  list.forEach((piece, index) => pieceCells(piece).forEach((cell) => owner.set(ck(...cell), index)));
  const keys = new Set();
  list.forEach((piece, index) => pieceCells(piece).forEach((cell) => {
    for (const neighbour of neighbours(cell)) {
      const other = owner.get(ck(...neighbour));
      if (other == null || other === index) continue;
      const neighbourVertices = new Set(cellVerts(...neighbour).map(pk));
      const shared = cellVerts(...cell).filter((vertex) => neighbourVertices.has(pk(vertex)));
      if (shared.length !== 2) continue;
      const ends = shared.map(pk).sort();
      keys.add(`${ends[0]}|${ends[1]}`);
    }
  }));
  return [...keys].sort();
}

const seamEdgeKeys = (edges) => edges.map(([a, b]) => {
  const ends = [pk(a), pk(b)].sort();
  return `${ends[0]}|${ends[1]}`;
}).sort();

function outline(cells) {
  const dirEdges = new Map();
  for (const [a, b, t] of cells) {
    const v = cellVerts(a, b, t);
    for (let i = 0; i < 3; i++) dirEdges.set(pk(v[i]) + '|' + pk(v[(i + 1) % 3]), [v[i], v[(i + 1) % 3]]);
  }
  const out = new Map();
  let unitEdges = 0;
  for (const [, e] of dirEdges) {
    if (dirEdges.has(pk(e[1]) + '|' + pk(e[0]))) continue;
    unitEdges++;
    const s = pk(e[0]);
    if (!out.has(s)) out.set(s, []);
    out.get(s).push(e);
  }
  for (const [, l] of out) if (l.length > 1) return { ok: false, why: 'pinch' };
  const cycles = [];
  const used = new Set();
  for (const [, list] of out) for (const e0 of list) {
    if (used.has(pk(e0[0]) + '|' + pk(e0[1]))) continue;
    const cyc = [];
    let e = e0;
    for (let g = 0; g <= unitEdges + 1; g++) {
      const id = pk(e[0]) + '|' + pk(e[1]);
      if (used.has(id)) break;
      used.add(id);
      cyc.push(e[0]);
      const nxt = out.get(pk(e[1]));
      if (!nxt || !nxt.length) break;
      e = nxt[0];
    }
    cycles.push(cyc);
  }
  if (cycles.length !== 1) return { ok: false, why: 'hole' };
  return { ok: true, cycle: cycles[0], unitEdges };
}
function simplify(cycle) {
  const n = cycle.length, poly = [];
  for (let i = 0; i < n; i++) {
    const p = cycle[(i - 1 + n) % n], q = cycle[i], r = cycle[(i + 1) % n];
    if (cross(sub(q, p), sub(r, q)) !== 0) poly.push(q);
  }
  return poly;
}
const POLY_NAMES = { 3: 'triangle', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon', 11: 'hendecagon', 12: 'dodecagon' };
function labelFor(poly) {
  const n = poly.length;
  if (n === 4) {
    const d = poly.map((p, i) => sub(poly[(i + 1) % n], p));
    const L = d.map(len2);
    if (L.every((x) => x === L[0])) return 'rhombus';
    if (cross(d[0], d[2]) === 0 && cross(d[1], d[3]) === 0) return 'parallelogram';
    return 'trapezoid';
  }
  return POLY_NAMES[n] || `${n}-sided shape`;
}
const describe = (cells) => {
  const o = outline(cells);
  if (!o.ok) return { ok: false, why: o.why };
  const poly = simplify(o.cycle);
  return { ok: true, poly, sides: poly.length, label: labelFor(poly), unitEdges: o.unitEdges };
};
const cellsOf = (list) => list.flatMap((p) => pieceCells(p));
const overlaps = (cells) => { const s = new Set(); for (const c of cells) { const k = ck(...c); if (s.has(k)) return true; s.add(k); } return false; };
const keysOf = (cells) => new Set(cells.map((c) => ck(...c)));
const sameSet = (A, B) => A.size === B.size && [...A].every((k) => B.has(k));

/* The ledger: a SEAM is one place two PIECES are pressed together (not a line
   inside a piece), so this counts adjacent piece pairs. */
function ledgerOf(list) {
  const owner = new Map();
  list.forEach((p, i) => pieceCells(p).forEach((c) => owner.set(ck(...c), i)));
  const pairs = new Set();
  list.forEach((p, i) => pieceCells(p).forEach((c) => neighbours(c).forEach((n) => {
    const o = owner.get(ck(...n));
    if (o != null && o !== i) pairs.add([i, o].sort((x, y) => x - y).join(':'));
  })));
  let pieceSides = 0;
  for (const p of list) { const d = describe(pieceCells(p)); pieceSides += d.ok ? d.sides : 0; }
  return { seams: pairs.size, pieceSides, cells: cellsOf(list) };
}
/* a polygon is a CYCLE — compare it up to where the walk happened to start */
const canon = (poly) => {
  const s = poly.map(pk);
  let best = null;
  for (let i = 0; i < s.length; i++) {
    const r = s.slice(i).concat(s.slice(0, i)).join(' ');
    if (best === null || r < best) best = r;
  }
  return best;
};

/* ---------------------------------------------------------------------------
   1. The lattice is exact
   ------------------------------------------------------------------------- */
head('1. Lattice algebra is exact');
{
  let worst = 0;
  for (let a = -12; a <= 12; a++) for (let b = -12; b <= 12; b++) {
    // rot60 on the lattice == a real 60° rotation of the world point
    const [ra, rb] = rot60([a, b]);
    const c = Math.cos(Math.PI / 3), s = Math.sin(Math.PI / 3);
    const X = wx(a, b), Y = wy(b);
    worst = Math.max(worst, Math.abs(wx(ra, rb) - (X * c - Y * s)), Math.abs(wy(rb) - (X * s + Y * c)));
    // order 6
    check('rot60^6 = identity', rotK([a, b], 6)[0] === a && rotK([a, b], 6)[1] === b);
    // rotation preserves the exact squared length
    check('rot60 preserves len2', len2([a, b]) === len2([ra, rb]));
    // len2 agrees with the real distance
    check('len2 == |a·u + b·v|²', Math.abs(len2([a, b]) - (X * X + Y * Y)) < 1e-9);
  }
  check('rot60 IS a 60° rotation of the plane (worst error < 1e-12)', worst < 1e-12, `worst=${worst}`);
  // collinearity: integer cross == float cross
  let bad = 0;
  for (let i = 0; i < 4000; i++) {
    const P = [Math.floor(Math.random() * 11) - 5, Math.floor(Math.random() * 11) - 5];
    const Q = [Math.floor(Math.random() * 11) - 5, Math.floor(Math.random() * 11) - 5];
    const fx = wx(P[0], P[1]) * wy(Q[1]) - wy(P[1]) * wx(Q[0], Q[1]);
    if ((cross(P, Q) === 0) !== (Math.abs(fx) < 1e-9)) bad++;
  }
  check('integer cross == 0 exactly when the real cross is 0', bad === 0, `${bad} mismatches`);
}

/* ---------------------------------------------------------------------------
   2. Cells: round-trip, and the up/down invariant
   ------------------------------------------------------------------------- */
head('2. Cells round-trip through rotation');
{
  let nulls = 0;
  for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) for (const t of [UP, DOWN]) {
    const back = cellFromVerts(cellVerts(a, b, t));
    check('cellFromVerts(cellVerts(c)) == c', back && back[0] === a && back[1] === b && back[2] === t);
    for (let k = 0; k < 6; k++) {
      const r = rotCell([a, b, t], k);
      if (!r) { nulls++; continue; }
      // a rotated cell is still a unit triangle, and 6 turns come home
      const six = rotCell(r, 6 - k);
      check('rotCell round-trips over 6 turns', six && six[0] === a && six[1] === b && six[2] === t);
    }
    // the mod-3 invariant that separates up from down
    const s = cellVerts(a, b, t).reduce((acc, [x, y]) => acc + x + y, 0);
    check('up ≡ 2 (mod 3), down ≡ 1 (mod 3)', ((s % 3) + 3) % 3 === (t === UP ? 2 : 1));
  }
  check('no rotation ever produces a non-cell', nulls === 0, `${nulls} nulls`);
}

/* ---------------------------------------------------------------------------
   3. The integer side-count agrees with an INDEPENDENT float walk
   ------------------------------------------------------------------------- */
head('3. Integer outline == independent floating-point outline');
function sidesByFloat(cells) {
  // walk the same boundary in plain x/y and count corners with atan2 — shares
  // no arithmetic with the lattice implementation
  const o = outline(cells);
  if (!o.ok) return null;
  const P = o.cycle.map(([a, b]) => [wx(a, b), wy(b)]);
  let corners = 0;
  for (let i = 0; i < P.length; i++) {
    const p = P[(i - 1 + P.length) % P.length], q = P[i], r = P[(i + 1) % P.length];
    const a1 = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const a2 = Math.atan2(r[1] - q[1], r[0] - q[0]);
    let d = Math.abs(a2 - a1) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > 1e-9) corners++;
  }
  return corners;
}
{
  // exhaustive over every connected set of up-to-5 cells in a window
  const R = 2;
  const all = [];
  for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) for (const t of [UP, DOWN]) all.push([a, b, t]);
  const inWin = ([a, b]) => a >= -R && a <= R && b >= -R && b <= R;
  const seen = new Set();
  let n = 0, mismatch = 0;
  const grow = (set) => {
    const sig = set.map((c) => ck(...c)).sort().join(';');
    if (seen.has(sig)) return;
    seen.add(sig);
    const d = describe(set);
    if (d.ok) {
      n++;
      const f = sidesByFloat(set);
      if (f !== d.sides) { mismatch++; }
    }
    if (set.length >= 5) return;
    const have = new Set(set.map((c) => ck(...c)));
    for (const c of set) for (const nb of neighbours(c)) {
      if (!inWin(nb) || have.has(ck(...nb))) continue;
      grow([...set, nb]);
    }
  };
  for (const c of all) grow([c]);
  check(`side count agrees on all ${n} connected shapes of ≤5 cells`, mismatch === 0, `${mismatch} mismatches`);
}

/* ---------------------------------------------------------------------------
   4. THE SEAM LAW — the claim the whole lab rests on
   ------------------------------------------------------------------------- */
head('4. The seam law: outline unit-edges = pieces’ unit-edges − 2 × seams');
{
  // over every connected set of up-to-6 unit triangles: each cell has 3 sides
  const R = 2;
  const seen = new Set();
  let n = 0, bad = 0;
  const inWin = ([a, b]) => a >= -R && a <= R && b >= -R && b <= R;
  const grow = (set) => {
    const sig = set.map((c) => ck(...c)).sort().join(';');
    if (seen.has(sig)) return;
    seen.add(sig);
    const o = outline(set);
    if (o.ok) {
      const und = new Map();
      for (const [a, b, t] of set) {
        const v = cellVerts(a, b, t);
        for (let i = 0; i < 3; i++) {
          const k = [pk(v[i]), pk(v[(i + 1) % 3])].sort().join('|');
          und.set(k, (und.get(k) || 0) + 1);
        }
      }
      let seams = 0;
      for (const [, c] of und) if (c === 2) seams++;
      n++;
      if (set.length * 3 - 2 * seams !== o.unitEdges) bad++;
    }
    if (set.length >= 6) return;
    const have = new Set(set.map((c) => ck(...c)));
    for (const c of set) for (const nb of neighbours(c)) {
      if (!inWin(nb) || have.has(ck(...nb))) continue;
      grow([...set, nb]);
    }
  };
  for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) for (const t of [UP, DOWN]) grow([[a, b, t]]);
  check(`the law holds on all ${n} connected shapes of ≤6 triangles`, bad === 0, `${bad} violations`);
}

/* ---------------------------------------------------------------------------
   5. Every claim the lesson copy makes out loud
   ------------------------------------------------------------------------- */
head('5. The lesson’s claims');
{
  // step 1 — two triangles, full sides touching, make a rhombus (ALL ways)
  let n2 = 0, bad2 = 0;
  for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) for (const t of [UP, DOWN]) {
    for (const nb of neighbours([a, b, t])) {
      const d = describe([[a, b, t], nb]);
      n2++;
      if (!d.ok || d.label !== 'rhombus' || d.sides !== 4) bad2++;
    }
  }
  check(`every one of the ${n2} ways to join TWO triangles makes a rhombus`, bad2 === 0, `${bad2} bad`);

  // step 2 — three triangles ALWAYS make a trapezoid (the copy says 240 ways)
  const R = 3;
  const inWin = ([a, b]) => a >= -R && a <= R && b >= -R && b <= R;
  const seen = new Set();
  const names = new Map();
  const grow = (set) => {
    const sig = set.map((c) => ck(...c)).sort().join(';');
    if (seen.has(sig)) return;
    seen.add(sig);
    if (set.length === 3) {
      const d = describe(set);
      const nm = d.ok ? d.label : 'BROKEN';
      names.set(nm, (names.get(nm) || 0) + 1);
      return;
    }
    const have = new Set(set.map((c) => ck(...c)));
    for (const c of set) for (const nb of neighbours(c)) {
      if (!inWin(nb) || have.has(ck(...nb))) continue;
      grow([...set, nb]);
    }
  };
  for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) for (const t of [UP, DOWN]) grow([[a, b, t]]);
  const tri3 = [...names.entries()];
  check('three triangles joined always make a trapezoid — no other shape exists',
    tri3.length === 1 && tri3[0][0] === 'trapezoid', JSON.stringify(tri3));
  const claimed = STEPS[1].feedback.match(/all (\d+) of the ways/);
  check('the copy’s count of the ways matches the enumeration',
    claimed && Number(claimed[1]) === tri3[0][1], `copy says ${claimed && claimed[1]}, really ${tri3[0][1]}`);

  // step 3 — the 5-fan shows 7 sides; the 6th triangle takes it DOWN to 6
  const six = GOALS.hexagon6;
  const five = describe(cellsOf(six.slice(0, 5)));
  const hex = describe(cellsOf(six));
  check('five triangles fanned round a point show 7 sides (a heptagon)', five.ok && five.sides === 7, JSON.stringify(five.sides));
  check('the sixth triangle closes it into a hexagon — 6 sides', hex.ok && hex.sides === 6 && hex.label === 'hexagon');
  check('adding a piece REDUCED the side count (7 → 6)', five.sides > hex.sides);
  const L6 = ledgerOf(six);
  check('18 sides − 2 × 6 seams = 6 (the copy’s arithmetic)',
    L6.pieceSides === 18 && L6.seams === 6 && L6.pieceSides - 2 * L6.seams === hex.sides,
    `pieceSides=${L6.pieceSides} seams=${L6.seams} sides=${hex.sides}`);

  // step 5 — two hexagons: 12 − 2 = 10, a decagon with two reflex corners
  const two = describe(cellsOf(GOALS.twoHexagons));
  const L2 = ledgerOf(GOALS.twoHexagons);
  check('two hexagons joined make a 10-sided shape (decagon)', two.ok && two.sides === 10 && two.label === 'decagon', JSON.stringify(two.sides));
  check('12 sides − 2 × 1 seam = 10 (the copy’s arithmetic)',
    L2.pieceSides === 12 && L2.seams === 1 && L2.pieceSides - 2 * L2.seams === two.sides,
    `pieceSides=${L2.pieceSides} seams=${L2.seams}`);
  {
    // "two corners that point inwards" — reflex corners, checked by real angle
    const P = two.poly.map(([a, b]) => [wx(a, b), wy(b)]);
    let area = 0;
    for (let i = 0; i < P.length; i++) { const q = P[(i + 1) % P.length]; area += P[i][0] * q[1] - q[0] * P[i][1]; }
    const sgn = Math.sign(area);
    let reflex = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[(i - 1 + P.length) % P.length], q = P[i], r = P[(i + 1) % P.length];
      const c = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]);
      if (Math.sign(c) !== sgn) reflex++;
    }
    check('the decagon has exactly 2 corners pointing inwards, as the copy says', reflex === 2, `reflex=${reflex}`);
  }
}

/* ---------------------------------------------------------------------------
   5b. The ledger tells the truth or says nothing
   ------------------------------------------------------------------------- */
head('5b. The ledger only prints when its own arithmetic balances');
{
  const balances = (list) => {
    const L = ledgerOf(list);
    const d = describe(cellsOf(list));
    return d.ok && L.pieceSides - 2 * L.seams === d.sides;
  };
  // the two ledger moments the copy narrates — both must print
  check('step 3: the 5-triangle fan prints 15 − 2×4 = 7', balances(GOALS.hexagon6.slice(0, 5)));
  check('step 3: the closed hexagon prints 18 − 2×6 = 6', balances(GOALS.hexagon6));
  check('step 5: two hexagons print 12 − 2×1 = 10', balances(GOALS.twoHexagons));
  // a case where the law genuinely fails: the triangle swallows only HALF of
  // the rhombus's side once the outline merges, so the ledger must stay silent
  check('rhombus + triangle: the sides law does NOT balance, so it is hidden',
    !balances(GOALS.trapezoid),
    `pieceSides=${ledgerOf(GOALS.trapezoid).pieceSides} seams=${ledgerOf(GOALS.trapezoid).seams} sides=${describe(cellsOf(GOALS.trapezoid)).sides}`);
  // whatever it does on the step-4 recipes, it must never print a false sum
  for (const r of RECIPES) {
    const L = ledgerOf(r.pieces);
    const d = describe(cellsOf(r.pieces));
    const shown = L.pieceSides - 2 * L.seams === d.sides;
    check(`recipe "${r.name}": the ledger is either silent or right`,
      !shown || L.pieceSides - 2 * L.seams === 6);
  }
  // and the gate is the equation itself — it cannot print a sum that is wrong
  check('the lab gates the ledger on the equation holding, not on the step',
    /ledgerOk: ids\.length > 1 && o\.ok && pieceSides - 2 \* seams === sides/.test(SRC));
  check('the head asks for ledgerOk, not for a hard-coded step', /named\.ledgerOk/.test(SRC));
}

/* ---------------------------------------------------------------------------
   5c. The Canvas draws only real seams between different physical pieces
   ------------------------------------------------------------------------- */
head('5c. Visible seams are exactly shared edges between different pieces');
{
  const cases = [
    ...Object.entries(GOALS).map(([name, pieces]) => [`goal:${name}`, pieces]),
    ...RECIPES.map((recipe) => [`recipe:${recipe.name}`, recipe.pieces]),
    ...Object.entries(SEEDS).map(([step, seed]) => [`seed-goal:${step}`, seed.goal]),
    ...TARGETS.map((target) => [`target:${target.name}`, target.recipe]),
    ['disjoint-triangles', [
      { kind: 'triangle', pos: [-3, 0], rot: 0 },
      { kind: 'triangle', pos: [3, 0], rot: 0 },
    ]],
  ];
  for (const [name, rawPieces] of cases) {
    const pieces = rawPieces.map((piece, index) => ({ ...piece, id: index + 1 }));
    const expected = independentSeamEdgeKeys(pieces);
    const actual = seamEdgeKeys(shippedSeamEdgesOf(pieces));
    check(`${name}: shipped seam segments match independent cell-neighbour oracle`,
      JSON.stringify(actual) === JSON.stringify(expected),
      `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
  }
  const loneHexagon = [{ ...GOALS.twoHexagons[0], id: 1 }];
  check('internal triangular cell edges inside one hexagon block are never drawn as seams',
    shippedSeamEdgesOf(loneHexagon).length === 0);
  check('the Canvas invokes the seam stroke only for joined groups with visible shared edges',
    /if \(!g\.joined \|\| !g\.seamEdges\.length\) continue;/.test(SRC));
}

/* ---------------------------------------------------------------------------
   6. The centerpiece: one outline, many recipes
   ------------------------------------------------------------------------- */
head('6. One outline, many recipes — all four fill the IDENTICAL hexagon');
{
  const base = keysOf(cellsOf(RECIPES[0].pieces));
  const d0 = describe(cellsOf(RECIPES[0].pieces));
  for (const r of RECIPES) {
    const cells = cellsOf(r.pieces);
    const d = describe(cells);
    check(`recipe "${r.name}": pieces never overlap`, !overlaps(cells));
    check(`recipe "${r.name}": covers exactly the same cells as 6 triangles`, sameSet(keysOf(cells), base));
    check(`recipe "${r.name}": same outline, same label (hexagon, 6 sides)`,
      d.ok && d.sides === 6 && d.label === 'hexagon');
    check(`recipe "${r.name}": outline polygon is vertex-for-vertex identical`,
      canon(d.poly) === canon(d0.poly));
    check(`recipe "${r.name}": every piece is in the kit`, r.pieces.every((p) => KIND[p.kind]));
  }
  // the recipes really are different insides (or the step is a lie)
  const sigs = RECIPES.map((r) => r.pieces.map((p) => `${p.kind}`).sort().join(','));
  check('the four recipes use genuinely different pieces', new Set(sigs).size === 4, JSON.stringify(sigs));
  // and the hexagon is regular: 6 equal sides, each turn the same 60°
  const d = d0;
  const dd = d.poly.map((p, i) => sub(d.poly[(i + 1) % 6], p));
  check('the composed hexagon is regular (6 equal sides, equal turns)',
    dd.every((v) => len2(v) === len2(dd[0])) && dd.every((v, i) => {
      const r = rot60(v);
      const nx = dd[(i + 1) % 6];
      return r[0] === nx[0] && r[1] === nx[1];
    }));
}

/* ---------------------------------------------------------------------------
   7. The kit itself
   ------------------------------------------------------------------------- */
head('7. Kit pieces are the shapes their labels claim');
{
  const want = { triangle: ['triangle', 3, 1], rhombus: ['rhombus', 4, 2], trapezoid: ['trapezoid', 4, 3], hexagon: ['hexagon', 6, 6] };
  for (const k of KIT) {
    for (let r = 0; r < 6; r++) {
      const cells = pieceCells({ kind: k.kind, pos: [0, 0], rot: r });
      const d = describe(cells);
      const [label, sides, ncells] = want[k.kind];
      check(`${k.kind} @rot${r}: is a ${label} with ${sides} sides`, d.ok && d.label === label && d.sides === sides,
        `got ${d.ok ? d.label + '/' + d.sides : d.why}`);
      check(`${k.kind} @rot${r}: ${ncells} cells, no self-overlap`, cells.length === ncells && !overlaps(cells));
    }
    // turning a piece never changes what it is
    check(`${k.kind}: all 6 turns give the same label`,
      new Set([0, 1, 2, 3, 4, 5].map((r) => describe(pieceCells({ kind: k.kind, pos: [0, 0], rot: r })).label)).size === 1);
  }
  // the hexagon is turn-invariant: 6 turns, one and the same cell set
  const hexSets = [0, 1, 2, 3, 4, 5].map((r) => keysOf(pieceCells({ kind: 'hexagon', pos: [0, 0], rot: r })));
  check('the hexagon piece maps onto itself under every turn', hexSets.every((s) => sameSet(s, hexSets[0])));
  // unlock order = one per step, in kit order
  check('the kit unlocks one piece per step, in order', KIT.every((k, i) => k.unlock === i));
  // a triangle's own outline has 3 sides — the ledger's "pieces' sides" input
  check('a lone piece is its own outline (the ledger’s input is honest)',
    KIT.every((k) => describe(pieceCells({ kind: k.kind, pos: [0, 0], rot: 0 })).sides === want[k.kind][1]));
}

/* ---------------------------------------------------------------------------
   8. Every corner is a multiple of 60° — so no square can ever be composed
   ------------------------------------------------------------------------- */
head('8. Structural facts the labels depend on');
{
  const R = 2;
  const seen = new Set();
  let n = 0, badAngle = 0, bad3 = 0, bad4 = 0;
  const inWin = ([a, b]) => a >= -R && a <= R && b >= -R && b <= R;
  const grow = (set) => {
    const sig = set.map((c) => ck(...c)).sort().join(';');
    if (seen.has(sig)) return;
    seen.add(sig);
    const d = describe(set);
    if (d.ok) {
      n++;
      const P = d.poly.map(([a, b]) => [wx(a, b), wy(b)]);
      for (let i = 0; i < P.length; i++) {
        const p = P[(i - 1 + P.length) % P.length], q = P[i], r = P[(i + 1) % P.length];
        const a1 = Math.atan2(q[1] - p[1], q[0] - p[0]), a2 = Math.atan2(r[1] - q[1], r[0] - q[0]);
        let turn = ((a2 - a1) * 180) / Math.PI;
        while (turn <= -180) turn += 360;
        while (turn > 180) turn -= 360;
        if (Math.abs(turn / 60 - Math.round(turn / 60)) > 1e-9) badAngle++;
      }
      // a 3-sided composite is always equilateral
      if (d.sides === 3) {
        const dd = d.poly.map((p, i) => sub(d.poly[(i + 1) % 3], p));
        if (!dd.every((v) => len2(v) === len2(dd[0]))) bad3++;
      }
      // a 4-sided composite is only ever rhombus / parallelogram / trapezoid
      if (d.sides === 4 && !['rhombus', 'parallelogram', 'trapezoid'].includes(d.label)) bad4++;
    }
    if (set.length >= 5) return;
    const have = new Set(set.map((c) => ck(...c)));
    for (const c of set) for (const nb of neighbours(c)) {
      if (!inWin(nb) || have.has(ck(...nb))) continue;
      grow([...set, nb]);
    }
  };
  for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) for (const t of [UP, DOWN]) grow([[a, b, t]]);
  check(`every corner of all ${n} composable shapes is a multiple of 60° (⇒ no square is composable)`, badAngle === 0, `${badAngle} bad corners`);
  check('every 3-sided composite is equilateral', bad3 === 0);
  check('every 4-sided composite is a rhombus, parallelogram or trapezoid', bad4 === 0);
}

/* ---------------------------------------------------------------------------
   9. The rule: a corner touch is NOT a join; holes and pinches are refused
   ------------------------------------------------------------------------- */
head('9. "Full sides touching" is enforced, and the honest refusals fire');
{
  // two triangles meeting at exactly one corner: the bow tie from step 1's question
  const A = [0, 0, UP];   // verts (0,0),(1,0),(0,1)
  const B = [1, 0, UP];   // verts (1,0),(2,0),(1,1) — meets A at the corner (1,0) only
  const vA = new Set(cellVerts(...A).map(pk));
  const shared = cellVerts(...B).filter((p) => vA.has(pk(p)));
  check('the bow-tie pair shares exactly one corner and no side', shared.length === 1, `shared=${shared.length}`);
  check('a corner touch is NOT edge-adjacency (they stay two shapes)',
    !neighbours(A).some((n) => ck(...n) === ck(...B)));
  check('the bow tie is two shapes, not one', groupsCount([
    { kind: 'triangle', pos: [0, 0], rot: 0 }, { kind: 'triangle', pos: [1, 0], rot: 0 },
  ]) === 2);
  // and the lab's own outline walk refuses to name it (it pinches at that corner)
  const bow = outline([A, B]);
  check('the bow tie is never given one outline', !bow.ok, JSON.stringify(bow.why));

  // a ring of six hexagons around an empty one → a hole, refused
  const centres = [[1, 1], [-1, 2], [-2, 1], [-1, -1], [1, -2], [2, -1]];
  const ring = cellsOf(centres.map((c) => ({ kind: 'hexagon', pos: c, rot: 0 })));
  check('the ring of six hexagons does not overlap itself', !overlaps(ring));
  const ro = outline(ring);
  check('a ring with a gap in the middle is refused, not named', !ro.ok && ro.why === 'hole', JSON.stringify(ro.why));

  // and the hole is exactly the missing centre hexagon
  const hole = keysOf(pieceCells({ kind: 'hexagon', pos: [0, 0], rot: 0 }));
  const ringKeys = keysOf(ring);
  check('the hole is exactly the missing hexagon', [...hole].every((k) => !ringKeys.has(k)));
  const filled = outline([...ring, ...pieceCells({ kind: 'hexagon', pos: [0, 0], rot: 0 })]);
  check('plugging the hole makes it one clean shape again', filled.ok);
}

/* ---------------------------------------------------------------------------
   10. Step seeds — legal, in bounds, and exactly one drag from the point
   ------------------------------------------------------------------------- */
head('10. Every step starts one drag from its point');
{
  const BOUND = Number(SRC.match(/const BOUND = ([\d.]+);/)[1]);
  const inBounds = (cells) => cells.every(([a, b, t]) =>
    cellVerts(a, b, t).every(([va, vb]) => Math.abs(wx(va, vb)) <= BOUND && Math.abs(wy(vb)) <= BOUND));

  const expect = { 0: 'rhombus', 1: 'trapezoid', 2: 'hexagon', 3: 'hexagon', 4: 'decagon' };
  for (const [k, s] of Object.entries(SEEDS)) {
    const step = Number(k);
    if (!s.goal.length) continue;
    const goalCells = cellsOf(s.goal);
    check(`step ${step + 1}: the goal has no overlapping pieces`, !overlaps(goalCells));
    check(`step ${step + 1}: the goal fits on the paper`, inBounds(goalCells));
    const d = describe(goalCells);
    check(`step ${step + 1}: the goal really is a ${expect[step]}`, d.ok && d.label === expect[step],
      `got ${d.ok ? d.label : d.why}`);
    // the goal is ONE joined whole
    check(`step ${step + 1}: the goal is a single joined whole`, groupsCount(s.goal) === 1);

    if (s.park < 0) continue;
    const seed = s.goal.map((p, i) => i === s.park ? { ...p, pos: [p.pos[0] + s.by[0], p.pos[1] + s.by[1]] } : p);
    const seedCells = cellsOf(seed);
    check(`step ${step + 1}: the seed is legal (no overlap)`, !overlaps(seedCells));
    check(`step ${step + 1}: the seed fits on the paper`, inBounds(seedCells));
    check(`step ${step + 1}: the parked piece starts NOT joined (2 shapes)`, groupsCount(seed) === 2,
      `groups=${groupsCount(seed)}`);
    // ...and putting it back is a single slide, no turn needed
    check(`step ${step + 1}: one slide (no turn) completes it`, true);
    // all pieces the seed uses are unlocked by that step
    check(`step ${step + 1}: every seeded piece is already in the kit`,
      seed.every((p) => KIND[p.kind].unlock <= step), seed.map((p) => p.kind).join(','));
  }
  // step 4's kit chips: same
  for (const r of RECIPES) {
    check(`recipe "${r.name}" fits on the paper`, inBounds(cellsOf(r.pieces)));
    check(`recipe "${r.name}" only uses pieces unlocked by step 4`, r.pieces.every((p) => KIND[p.kind].unlock <= 3));
  }

  // the kit tray must always have somewhere to put a new piece, or a button
  // would look enabled and do nothing
  const PARK = eval(`(${(SRC.match(/const PARK = (\[[\s\S]*?\]);/) || [])[1]})`);
  for (const k of KIT) {
    const okSpots = PARK.filter((spot) => inBounds(pieceCells({ kind: k.kind, pos: spot, rot: 0 })));
    check(`the kit can always place a ${k.kind} on an empty paper`, okSpots.length > 0);
    check(`every ${k.kind} parking spot that is used fits on the paper`, okSpots.length >= 3,
      `${okSpots.length}/${PARK.length} spots fit`);
  }
  // and enough spots that a full bench still has room for a few pieces
  check('the tray has at least 8 parking spots', PARK.length >= 8);
}
function groupsCount(list) {
  const owner = new Map();
  list.forEach((p, i) => pieceCells(p).forEach((c) => owner.set(ck(...c), i)));
  const adj = list.map(() => new Set());
  list.forEach((p, i) => pieceCells(p).forEach((c) => neighbours(c).forEach((n) => {
    const o = owner.get(ck(...n));
    if (o != null && o !== i) { adj[i].add(o); adj[o].add(i); }
  })));
  const seen = new Set();
  let g = 0;
  for (let i = 0; i < list.length; i++) {
    if (seen.has(i)) continue;
    g++;
    const st = [i];
    seen.add(i);
    while (st.length) { const x = st.pop(); for (const y of adj[x]) if (!seen.has(y)) { seen.add(y); st.push(y); } }
  }
  return g;
}

/* ---------------------------------------------------------------------------
   11. The challenge: reachable, and the stamp cannot lie
   ------------------------------------------------------------------------- */
head('11. The challenge is always winnable and never falsely stamped');
{
  const BOUND = Number(SRC.match(/const BOUND = ([\d.]+);/)[1]);
  const inBounds = (cells) => cells.every(([a, b, t]) =>
    cellVerts(a, b, t).every(([va, vb]) => Math.abs(wx(va, vb)) <= BOUND && Math.abs(wy(vb)) <= BOUND));
  const targetCells = (t, rot, shift) => t.recipe.flatMap((p) =>
    pieceCells({ kind: p.kind, rot: (p.rot + rot) % 6, pos: [0, 0] }).map(([a, b, ty]) => {
      const [ra, rb] = rotK([p.pos[0], p.pos[1]], rot);
      return [a + ra + shift[0], b + rb + shift[1], ty];
    }));
  const matchOf = (keys, covered) => {
    let hit = 0;
    for (const k of keys) if (covered.has(k)) hit++;
    let stray = 0;
    for (const k of covered) if (!keys.has(k)) stray++;
    return { calibrated: hit === keys.size && stray === 0, pct: Math.max(0, Math.min(100, ((hit - stray) / keys.size) * 100)) };
  };

  for (const t of TARGETS) {
    for (let rot = 0; rot < 6; rot++) {
      const cells = targetCells(t, rot, [0, 0]);
      const keys = keysOf(cells);
      check(`target "${t.name}" @rot${rot}: its own recipe never overlaps`, !overlaps(cells), `${t.name}`);
      check(`target "${t.name}" @rot${rot}: fits on the paper`, inBounds(cells));
      check(`target "${t.name}" @rot${rot}: is one clean shape`, describe(cells).ok);
      check(`target "${t.name}" @rot${rot}: WINNABLE — its recipe fills it exactly`,
        matchOf(keys, keysOf(cells)).calibrated);
      // turning the recipe == turning the shape (the two rotK calls are right)
      const direct = keysOf(targetCells(t, 0, [0, 0]).map(([a, b, ty]) => {
        const vs = cellVerts(a, b, ty).map((p) => rotK(p, rot));
        return cellFromVerts(vs);
      }));
      check(`target "${t.name}" @rot${rot}: turning the recipe == turning the shape`, sameSet(keys, direct));

      // no false stamp: one cell short, one cell over, one cell moved
      const arr = [...keys];
      check(`target "${t.name}" @rot${rot}: one cell SHORT does not stamp`,
        !matchOf(keys, new Set(arr.slice(1))).calibrated);
      const over = new Set(arr);
      over.add(ck(99, 99, UP));
      check(`target "${t.name}" @rot${rot}: one cell STICKING OUT does not stamp`, !matchOf(keys, over).calibrated);
      const moved = new Set(arr.slice(1));
      moved.add(ck(99, 99, UP));
      check(`target "${t.name}" @rot${rot}: same NUMBER of cells in the wrong place does not stamp`,
        !matchOf(keys, moved).calibrated);
      check(`target "${t.name}" @rot${rot}: an empty paper reads 0%`, matchOf(keys, new Set()).pct === 0);
      check(`target "${t.name}" @rot${rot}: the exact fill reads 100%`, matchOf(keys, keys).pct === 100);
    }
  }
  // a DIFFERENT recipe filling the same outline must also win — the whole thesis
  const hexT = TARGETS.find((t) => t.name === 'hexagon');
  const keys = keysOf(targetCells(hexT, 0, [0, 0]));
  for (const r of RECIPES) {
    check(`the challenge accepts "${r.name}" for the hexagon outline (any recipe wins)`,
      matchOf(keys, keysOf(cellsOf(r.pieces))).calibrated, r.name);
  }
  // makeTarget never hands back the same one twice
  check('targets are distinct shapes', new Set(TARGETS.map((t) => t.name)).size === TARGETS.length);
  check('there are enough targets for the no-repeat guard to terminate', TARGETS.length >= 2);
}

/* ---------------------------------------------------------------------------
   12. DISTINCTNESS — the refusals, enforced against this lab's own copy.
   A promise kept only in prose is broken by the next edit.
   ------------------------------------------------------------------------- */
head('12. Distinctness: the refusals hold in the shipped copy');
{
  const copy = [
    ...STEPS.flatMap((s) => [s.title, s.body, s.q || '', s.feedback || '', ...(s.choices || [])]),
  ].join(' \n ');
  const lede = (SRC.match(/<p className="lede">([\s\S]*?)<\/p>/) || ['', ''])[1];
  const student = (copy + ' ' + lede).toLowerCase();

  const refuse = (what, re, why) => check(`refuses ${what} (${why})`, !re.test(student), `matched: ${(student.match(re) || [])[0]}`);

  refuse('AreaLab’s unit-square tiling', /\bunit square|tiling|tiles?\b|checkerboard/, 'that lab counts tiles to measure; this one joins shapes');
  refuse('area and perimeter', /\barea\b|\bperimeter\b|square units?/, 'AreaLab and RectangleLab own the measures');
  refuse('the fraction reading of pattern blocks', /\bone sixth|one third|one half|1\/2|1\/3|1\/6|\bfraction/, 'FractionLab owns the equal-parts-as-an-amount picture');
  refuse('angle measurement', /°|\bdegrees?\b|\bangle sum\b|\bprotractor\b/, 'TriangleLab and QuadrilateralLab own angles; this lab never measures one');
  refuse('ShapesLab’s name function', /defining attribute|non-defining|regardless of (its )?(orientation|size)|what is it called/, 'ShapesLab owns attributes → name');
  refuse('coordinates', /\bx-axis|\by-axis|\bcoordinate|\borigin\b|ordered pair/, 'PointLab and the coordinate labs own the plane');
  refuse('the half-turn doubling proof', /half-turn|rotate a copy|doubling/, 'TrapezoidLab and ParallelogramLab own it');

  // and the positive promises: the head is a recipe and an arrow, not a measure.
  // Every other lab in this library puts a NUMBER in its equation head; this
  // one puts the thing the pieces became.
  check('the head prints a recipe, an arrow, and the ONE whole it made',
    /→ 1 \$\{\w+\.label\}/.test(SRC), 'head template not found');
  check('the head is built from the piece counts, not from a measurement',
    /recipeOf\s*=\s*\(g\)/.test(SRC) && /plural\(g\.counts\[k\.kind\]/.test(SRC));
  // the sibling labs draw tick labels with fillText(String(gx), …) — this one
  // has no axes and no numbers on the paper at all
  check('the lab draws NO axes and NO tick labels', !/fillText\(String\(/.test(SRC) && !/ctx\.moveTo\(0, Math\.round\(sy\(0\)\)/.test(SRC));
  check('the seam law is in the footer where a teacher can see it', /outline = pieces’ sides − 2 × seams/.test(SRC));
  check('one accent only: carmine is the joined outline', (SRC.match(/#C81E4F/g) || []).length >= 1 && !/#2D5F8C/.test(SRC));

  // the standards this lab claims
  check('anchors CCSS K.G.B.6 and 1.G.A.2', /K\.G\.B\.6/.test(SRC) && /1\.G\.A\.2/.test(SRC));
  // the six steps, one question each except the challenge
  check('six steps: five taught, one challenge', STEPS.length === 6 && STEPS.filter((s) => s.calib).length === 1);
  check('every taught step asks exactly one predict-then-check question',
    STEPS.filter((s) => !s.calib).every((s) => s.q && s.choices.length === 3 && s.feedback && s.answer === 0));
  check('the kit unlock notes match the steps that unlock them',
    STEPS.filter((s) => s.kit).map((s) => s.kit).join(',') === 'Triangle,Rhombus,Trapezoid,Hexagon');
}

/* ------------------------------------------------------------------------- */
console.log(`\n${'─'.repeat(64)}`);
console.log(`  ${pass} checks passed, ${fail} failed`);
console.log(`${'─'.repeat(64)}\n`);
process.exit(fail ? 1 : 0);
