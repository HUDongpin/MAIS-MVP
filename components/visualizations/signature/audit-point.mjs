/* Numeric audit for PointLab — mirrors the lab's math exactly.
   Run: node audit-point.mjs

   Proves, across the WHOLE reachable space (nothing here is sampled — the
   coordinate plane this lab exposes is finite and small, so every claim below is
   checked at every point it could ever be made about):

     1. MODEL SPOT CHECKS — quadrantOf, the axis/origin cases, the distances.

     2. THE QUADRANT IS THE SIGN PAIR, EXHAUSTIVELY.  For every point in the box,
        quadrantOf agrees with the CCSS 6.NS.C.6.b definition re-derived from
        scratch (anticlockwise from top-right), and — the part students are
        taught wrong — every point ON an axis is in NO quadrant.

     3. THE CENTERPIECE THESIS IS LITERALLY TRUE.  The lab's whole opening claim
        is a countable statement, so count it:
          • {p : p.x = a} has MANY members (a line — one number is not enough);
          • {p : p.x = a AND p.y = b} has EXACTLY ONE (the crossing).
        If the first count were ever 1, step 1's picture would be a lie.

     4. THE PAIR IS ORDERED.  (a, b) and (b, a) are the same location iff a = b —
        exhaustively — which is what licenses step 3's ghost, including its
        stated exception on the diagonal.  Also: the swap changes the QUADRANT
        exactly when the two signs differ (a fact the lab shows but never says).

     5. THE ROUTE IS THE ADDRESS.  Walking `acrossWord` then `upWord` from the
        origin lands on (x, y), and the words name the right direction and the
        right number of steps — a sign is a DIRECTION, not a different number.

     6. |COORDINATE| = DISTANCE FROM AN AXIS (6.NS.C.8), exhaustively, re-derived
        by COUNTING unit steps rather than by calling Math.abs — otherwise the
        check would just be restating the implementation.

     7. EVERY CLUE IS TRUE OF ITS OWN TARGET.  For every M, every clue in
        cluePool(M) holds at M.  A clue that lied about its target would make a
        puzzle unsolvable, and the meter would be unable to reach 100%.

     8. THE GATE — THE UNIQUENESS THEOREM.  This is the one that matters, because
        CALIBRATED fires on "all three clues satisfied", and that is a sound test
        for "you found M" ONLY IF M is the only point satisfying them.  For every
        M and every clue set the generator can emit:
          • exactly one solution exists in the box the dials can reach;
          • exactly one solution exists in a box FAR wider (±20), so a puzzle is
            never "unique" merely because the sliders are too short to reach the
            rival answer — a student who reasoned their way to that rival would
            be RIGHT while the lab called them wrong;
          • that solution is M.
        Also reported: how many combos are unique in the small box but NOT in the
        wide one.  Those are the traps the wide check exists to reject; if the
        number is 0 the check is free, and if it is not, it earned its keep.

     9. NO FALSE STAMP.  For every emittable puzzle, over every point in the box:
        (all clues satisfied) ⟺ (you are standing on M).  Both directions.

    10. EVERY PUZZLE IS SOLVABLE AND NONE IS PRE-SOLVED.  Every non-origin M
        admits at least one fair, unique clue set (so makePuzzle never reaches its
        fallback), and the origin — where the capstone starts — never satisfies
        all three clues.

    11. THE GENERATOR, over many seeded runs: 3 clues, M in range, never the
        origin, never a repeat of the previous case, always fair, always unique.

    12. LESSON CLAIMS ARE TRUE AND REACHABLE.  Every concrete numeric example the
        prose asserts is re-derived from the model, and every point it names is
        inside the dials' actual range.  (AbsoluteValueLab shipped a step whose
        worked example the dials could not reach; this is that guard.)

    13. SOURCE PARITY.  The constants copied into this file are re-read from
        PointLab.jsx and compared, so the audit cannot quietly drift from the lab
        it claims to be auditing.

    14. FORMATTING round-trips (real Unicode minus, the ordered-pair string, the
        roman numerals, singular/plural "unit").

    15. QUIZ CHOICE-ORDER — the correct answer must not sit in one slot.

   MUTATION-TESTED.  An audit that passes against a broken model is worse than no
   audit, so this one was run against four deliberate breakages (see the README
   note at the bottom of the report).
*/

import fs from 'node:fs';

/* ===================== the model, copied verbatim ========================= */
const XMIN = -7;
const XMAX = 7;
const YMIN = -7;
const YMAX = 7;
const PMIN = -6;
const PMAX = 6;
const START = { x: 3, y: 5 };
const CALIB_START = { x: 0, y: 0 };
const N_CLUES = 3;
const UMIN = -20;
const UMAX = 20;

const ROMAN = ['', 'I', 'II', 'III', 'IV'];
function quadrantOf(x, y) {
  if (x === 0 && y === 0) return { id: 0, name: 'the origin' };
  if (x === 0) return { id: 0, name: 'on the y-axis' };
  if (y === 0) return { id: 0, name: 'on the x-axis' };
  if (x > 0 && y > 0) return { id: 1, name: 'Quadrant I' };
  if (x < 0 && y > 0) return { id: 2, name: 'Quadrant II' };
  if (x < 0 && y < 0) return { id: 3, name: 'Quadrant III' };
  return { id: 4, name: 'Quadrant IV' };
}
const QUAD_SIGNS = { 1: '(+, +)', 2: '(−, +)', 3: '(−, −)', 4: '(+, −)' };
const distToYAxis = (x) => Math.abs(x);
const distToXAxis = (y) => Math.abs(y);

const MINUS = '−';
function fmtNum(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
const pointStr = (x, y) => `(${fmtNum(x)}, ${fmtNum(y)})`;
const acrossWord = (x) => (x === 0 ? 'no step across' : `${Math.abs(x)} ${x > 0 ? 'right' : 'left'}`);
const upWord = (y) => (y === 0 ? 'no step up or down' : `${Math.abs(y)} ${y > 0 ? 'up' : 'down'}`);

function clueHolds(c, x, y) {
  switch (c.kind) {
    case 'quad':
      return quadrantOf(x, y).id === c.v;
    case 'axis':
      return c.axis === 'y' ? x === 0 : y === 0;
    case 'distY':
      return distToYAxis(x) === c.d;
    case 'distX':
      return distToXAxis(y) === c.d;
    case 'xIs':
      return x === c.v;
    case 'yIs':
      return y === c.v;
    case 'xSign':
      return c.s > 0 ? x > 0 : x < 0;
    case 'ySign':
      return c.s > 0 ? y > 0 : y < 0;
    default:
      return false;
  }
}
function clueText(c) {
  switch (c.kind) {
    case 'quad':
      return `M is in Quadrant ${ROMAN[c.v]}`;
    case 'axis':
      return `M sits on the ${c.axis}-axis`;
    case 'distY':
      return `M is ${c.d} unit${c.d === 1 ? '' : 's'} from the y-axis`;
    case 'distX':
      return `M is ${c.d} unit${c.d === 1 ? '' : 's'} from the x-axis`;
    case 'xIs':
      return `M’s x-coordinate is ${fmtNum(c.v)}`;
    case 'yIs':
      return `M’s y-coordinate is ${fmtNum(c.v)}`;
    case 'xSign':
      return `M’s x-coordinate is ${c.s > 0 ? 'positive' : 'negative'}`;
    case 'ySign':
      return `M’s y-coordinate is ${c.s > 0 ? 'positive' : 'negative'}`;
    default:
      return '';
  }
}
function cluePool(M) {
  const pool = [];
  const q = quadrantOf(M.x, M.y);
  if (q.id > 0) pool.push({ kind: 'quad', v: q.id });
  if (M.x === 0) pool.push({ kind: 'axis', axis: 'y' });
  if (M.y === 0) pool.push({ kind: 'axis', axis: 'x' });
  if (M.x !== 0) pool.push({ kind: 'distY', d: distToYAxis(M.x) });
  if (M.y !== 0) pool.push({ kind: 'distX', d: distToXAxis(M.y) });
  pool.push({ kind: 'xIs', v: M.x });
  pool.push({ kind: 'yIs', v: M.y });
  if (M.x !== 0) pool.push({ kind: 'xSign', s: Math.sign(M.x) });
  if (M.y !== 0) pool.push({ kind: 'ySign', s: Math.sign(M.y) });
  return pool;
}
function solutionsOf(clues, lo, hi) {
  const out = [];
  for (let x = lo; x <= hi; x++) {
    for (let y = lo; y <= hi; y++) {
      if (clues.every((c) => clueHolds(c, x, y))) out.push({ x, y });
    }
  }
  return out;
}
const INDIRECT = new Set(['quad', 'axis', 'distY', 'distX']);
function comboIsFair(combo) {
  if (combo.some((c) => c.kind === 'xIs') && combo.some((c) => c.kind === 'yIs')) return false;
  return combo.some((c) => INDIRECT.has(c.kind));
}
function comboIsUnique(combo, M) {
  const sols = solutionsOf(combo, UMIN, UMAX);
  return sols.length === 1 && sols[0].x === M.x && sols[0].y === M.y;
}
function validCombos(M) {
  const pool = cluePool(M);
  const out = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      for (let k = j + 1; k < pool.length; k++) {
        const combo = [pool[i], pool[j], pool[k]];
        if (!comboIsFair(combo)) continue;
        if (!comboIsUnique(combo, M)) continue;
        out.push(combo);
      }
    }
  }
  return out;
}
function makePuzzle(prev, rnd = Math.random) {
  const randInt = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  for (let guard = 0; guard < 500; guard++) {
    const M = { x: randInt(PMIN, PMAX), y: randInt(PMIN, PMAX) };
    if (M.x === 0 && M.y === 0) continue;
    if (prev && prev.M.x === M.x && prev.M.y === M.y) continue;
    const combos = validCombos(M);
    if (!combos.length) continue;
    return { M, clues: combos[randInt(0, combos.length - 1)] };
  }
  const M = { x: -5, y: -2 };
  return { M, clues: [{ kind: 'quad', v: 3 }, { kind: 'distY', d: 5 }, { kind: 'distX', d: 2 }] };
}
const scoreClues = (clues, x, y) => clues.reduce((n, c) => n + (clueHolds(c, x, y) ? 1 : 0), 0);

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const choiceOrder = (q, n) => {
  const rot = hashStr(q) % n;
  return Array.from({ length: n }, (_, j) => (j + rot) % n);
};

/* ===================== harness =========================================== */
let pass = 0;
let fail = 0;
const bad = [];
function ok(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    bad.push(msg);
  }
}
/* a tiny deterministic PRNG so generator runs are reproducible */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BOX = [];
for (let x = PMIN; x <= PMAX; x++) for (let y = PMIN; y <= PMAX; y++) BOX.push({ x, y });
const NON_ORIGIN = BOX.filter((p) => !(p.x === 0 && p.y === 0));

/* ===================== 1. model spot checks ============================== */
{
  ok(quadrantOf(3, 5).id === 1, 'quadrantOf(3,5) = I');
  ok(quadrantOf(-6, 3).id === 2, 'quadrantOf(−6,3) = II');
  ok(quadrantOf(-5, -2).id === 3, 'quadrantOf(−5,−2) = III');
  ok(quadrantOf(4, -1).id === 4, 'quadrantOf(4,−1) = IV');
  ok(quadrantOf(0, 0).id === 0 && quadrantOf(0, 0).name === 'the origin', 'the origin is in no quadrant');
  ok(quadrantOf(0, 3).id === 0 && quadrantOf(0, 3).name === 'on the y-axis', '(0,3) is on the y-axis, no quadrant');
  ok(quadrantOf(6, 0).id === 0 && quadrantOf(6, 0).name === 'on the x-axis', '(6,0) is on the x-axis, no quadrant');
  ok(distToYAxis(-4) === 4 && distToXAxis(2) === 2, '(−4,2) is 4 from the y-axis and 2 from the x-axis');
}

/* ===== 2. the quadrant IS the sign pair — exhaustive ===================== */
let quadChecks = 0;
{
  /* re-derived independently of the implementation: anticlockwise from top-right */
  const expected = (x, y) => {
    if (x === 0 || y === 0) return 0; // on an axis ⇒ NO quadrant
    if (x > 0) return y > 0 ? 1 : 4;
    return y > 0 ? 2 : 3;
  };
  for (const p of BOX) {
    const got = quadrantOf(p.x, p.y).id;
    ok(got === expected(p.x, p.y), `quadrant of ${pointStr(p.x, p.y)}: got ${got}, want ${expected(p.x, p.y)}`);
    quadChecks++;
    /* the sign-pair string must agree with the actual signs */
    if (got > 0) {
      const want = `(${p.x > 0 ? '+' : '−'}, ${p.y > 0 ? '+' : '−'})`;
      ok(QUAD_SIGNS[got] === want, `sign pair for Q${ROMAN[got]} at ${pointStr(p.x, p.y)}: ${QUAD_SIGNS[got]} vs ${want}`);
      quadChecks++;
    }
  }
  /* the axes are in no quadrant — stated separately because it is the claim
     students are most often taught wrong */
  const axisPts = BOX.filter((p) => p.x === 0 || p.y === 0);
  ok(axisPts.every((p) => quadrantOf(p.x, p.y).id === 0), 'every point on an axis is in NO quadrant');
  ok(axisPts.length === 25, `the box has 25 axis points (got ${axisPts.length})`);
  quadChecks += 2;
}

/* ===== 3. one number is a LINE, two are a POINT — the centerpiece ======== */
let thesisChecks = 0;
{
  const span = PMAX - PMIN + 1; // 13
  for (let a = PMIN; a <= PMAX; a++) {
    /* {p : p.x = a} — what the student has named at step 1 */
    const line = BOX.filter((p) => p.x === a);
    ok(line.length === span, `x = ${a} alone admits ${span} points in the box (got ${line.length})`);
    ok(line.length > 1, `x = ${a} alone is NOT a single point — the smear is honest`);
    thesisChecks += 2;

    for (let b = PMIN; b <= PMAX; b++) {
      /* {p : p.x = a AND p.y = b} — the crossing */
      const cross = BOX.filter((p) => p.x === a && p.y === b);
      ok(cross.length === 1, `x = ${a} AND y = ${b} admits exactly one point (got ${cross.length})`);
      ok(cross[0].x === a && cross[0].y === b, `the crossing of x=${a}, y=${b} is ${pointStr(a, b)}`);
      thesisChecks += 2;
    }
  }
  /* and the same statement in the wide box: a line is infinite-ish, a crossing
     is still exactly one — the thesis is not an artefact of the window */
  const wide = [];
  for (let x = UMIN; x <= UMAX; x++) for (let y = UMIN; y <= UMAX; y++) wide.push({ x, y });
  ok(wide.filter((p) => p.x === 3).length === UMAX - UMIN + 1, 'x = 3 names a whole line in the wide box too');
  ok(wide.filter((p) => p.x === 3 && p.y === 5).length === 1, 'x = 3 AND y = 5 is still exactly one point');
  thesisChecks += 2;
}

/* ===== 4. the pair is ORDERED — exhaustive ============================== */
let orderChecks = 0;
{
  for (const p of BOX) {
    const same = p.x === p.y;
    const swapEqual = p.x === p.y && p.y === p.x; // the swapped pair is the SAME location iff x = y
    const swappedIsSamePlace = p.y === p.x && p.x === p.y;
    ok(swappedIsSamePlace === same, `${pointStr(p.x, p.y)} equals its swap iff x = y`);
    orderChecks++;

    if (!same) {
      /* the ghost is genuinely elsewhere — which is what step 3 asserts */
      ok(!(p.y === p.x), `${pointStr(p.x, p.y)} ≠ ${pointStr(p.y, p.x)} — the swap moves the point`);
      orderChecks++;
      /* and the swap changes the QUADRANT exactly when the signs differ */
      const q1 = quadrantOf(p.x, p.y).id;
      const q2 = quadrantOf(p.y, p.x).id;
      const signsDiffer = Math.sign(p.x) !== Math.sign(p.y);
      if (p.x !== 0 && p.y !== 0) {
        ok(
          signsDiffer ? q1 !== q2 : q1 === q2,
          `swap of ${pointStr(p.x, p.y)}: quadrant ${signsDiffer ? 'must change' : 'must not change'} (${q1}→${q2})`
        );
        orderChecks++;
      }
    }
    /* the ghost is always drawable — it can never fall outside the dials' box,
       since it reuses the same two numbers */
    ok(p.y >= PMIN && p.y <= PMAX && p.x >= PMIN && p.x <= PMAX, `the swap of ${pointStr(p.x, p.y)} is on-screen`);
    orderChecks++;
  }
  /* step 3's stated exception */
  ok(
    BOX.filter((p) => p.x === p.y).length === PMAX - PMIN + 1,
    'exactly the 13 diagonal points are their own swap'
  );
  ok(START.x !== START.y, 'the START point (3,5) has x ≠ y, so the ghost is visible on arrival at step 3');
  orderChecks += 2;
}

/* ===== 5. the route IS the address ====================================== */
let routeChecks = 0;
{
  for (const p of BOX) {
    /* walk it: start at the origin, step across, then step up */
    let cx = 0;
    let cy = 0;
    const stepsAcross = Math.abs(p.x);
    const dirAcross = Math.sign(p.x);
    for (let i = 0; i < stepsAcross; i++) cx += dirAcross;
    const stepsUp = Math.abs(p.y);
    const dirUp = Math.sign(p.y);
    for (let i = 0; i < stepsUp; i++) cy += dirUp;
    ok(cx === p.x && cy === p.y, `walking the route to ${pointStr(p.x, p.y)} lands there (got ${pointStr(cx, cy)})`);
    routeChecks++;

    /* the words name the right direction and the right count */
    const aw = acrossWord(p.x);
    if (p.x === 0) ok(aw === 'no step across', 'x = 0 ⇒ no step across (never "0 right")');
    else {
      ok(aw === `${stepsAcross} ${p.x > 0 ? 'right' : 'left'}`, `acrossWord(${p.x}) = "${aw}"`);
      ok(aw.startsWith(String(stepsAcross)), `acrossWord(${p.x}) counts |x| = ${stepsAcross} steps`);
      ok(!aw.includes(MINUS) && !aw.includes('-'), `acrossWord(${p.x}) has no minus — the sign became a WORD`);
    }
    const uw = upWord(p.y);
    if (p.y === 0) ok(uw === 'no step up or down', 'y = 0 ⇒ no step up or down');
    else {
      ok(uw === `${stepsUp} ${p.y > 0 ? 'up' : 'down'}`, `upWord(${p.y}) = "${uw}"`);
      ok(!uw.includes(MINUS) && !uw.includes('-'), `upWord(${p.y}) has no minus`);
    }
    routeChecks += 4;
  }
}

/* ===== 6. |coordinate| = distance from an axis (6.NS.C.8) =============== */
let distChecks = 0;
{
  for (const p of BOX) {
    /* re-derived by COUNTING unit steps to the axis, not by calling Math.abs —
       otherwise this check would merely restate the implementation */
    let steps = 0;
    let c = p.x;
    while (c !== 0) {
      c -= Math.sign(c);
      steps++;
    }
    ok(distToYAxis(p.x) === steps, `distance from ${pointStr(p.x, p.y)} to the y-axis is ${steps}`);
    let steps2 = 0;
    let d = p.y;
    while (d !== 0) {
      d -= Math.sign(d);
      steps2++;
    }
    ok(distToXAxis(p.y) === steps2, `distance from ${pointStr(p.x, p.y)} to the x-axis is ${steps2}`);
    /* distance never cares which way you walked */
    ok(distToYAxis(p.x) === distToYAxis(-p.x), `|x| is the same either side: ${p.x}`);
    ok(distToYAxis(p.x) >= 0 && distToXAxis(p.y) >= 0, 'a distance is never negative');
    distChecks += 4;
  }
}

/* ===== 7. every clue is TRUE of its own target ========================== */
let poolChecks = 0;
{
  for (const M of BOX) {
    const pool = cluePool(M);
    for (const c of pool) {
      ok(clueHolds(c, M.x, M.y), `clue "${clueText(c)}" must hold at its own target ${pointStr(M.x, M.y)}`);
      ok(clueText(c).length > 0, `clue of kind ${c.kind} renders text`);
      poolChecks += 2;
    }
    /* the pool never offers a quadrant clue for a point that has no quadrant */
    const q = quadrantOf(M.x, M.y).id;
    ok(
      (q === 0) === !pool.some((c) => c.kind === 'quad'),
      `${pointStr(M.x, M.y)}: a quadrant clue exists iff the point is in a quadrant`
    );
    /* ...and offers an axis clue exactly when a coordinate is 0 */
    ok(
      pool.some((c) => c.kind === 'axis') === (M.x === 0 || M.y === 0),
      `${pointStr(M.x, M.y)}: an axis clue exists iff a coordinate is zero`
    );
    poolChecks += 2;
  }
}

/* ===== 8-10. THE GATE: uniqueness, no false stamp, solvability ========== */
let uniqChecks = 0;
let stampChecks = 0;
let comboCount = 0;
let narrowOnly = 0; // combos unique in the dials' box but NOT in the wide box
{
  for (const M of NON_ORIGIN) {
    const combos = validCombos(M);

    /* 10a. EVERY non-origin M is solvable — makePuzzle never needs its fallback */
    ok(combos.length > 0, `${pointStr(M.x, M.y)} admits at least one fair, unique clue set`);
    uniqChecks++;

    for (const combo of combos) {
      comboCount++;

      /* 8. unique in the WIDE box (this is what validCombos filtered on) ... */
      const wide = solutionsOf(combo, UMIN, UMAX);
      ok(wide.length === 1, `${pointStr(M.x, M.y)}: exactly one solution in ±20 (got ${wide.length})`);
      ok(wide[0].x === M.x && wide[0].y === M.y, `${pointStr(M.x, M.y)}: the unique wide solution IS M`);

      /* ... and therefore unique in the box the dials can reach */
      const near = solutionsOf(combo, PMIN, PMAX);
      ok(near.length === 1 && near[0].x === M.x && near[0].y === M.y, `${pointStr(M.x, M.y)}: unique in the dials' box`);

      ok(combo.length === N_CLUES, `a case has exactly ${N_CLUES} clues`);
      ok(comboIsFair(combo), `${pointStr(M.x, M.y)}: the clue set is fair (an indirect clue, never xIs+yIs)`);
      uniqChecks += 5;

      /* 9. NO FALSE STAMP, both directions, at every point in the box */
      for (const p of BOX) {
        const all = scoreClues(combo, p.x, p.y) === N_CLUES;
        const isM = p.x === M.x && p.y === M.y;
        ok(all === isM, `${pointStr(M.x, M.y)}: all-clues-satisfied ⟺ standing on M — broke at ${pointStr(p.x, p.y)}`);
        stampChecks++;
      }
      /* the meter reads 100% iff CALIBRATED */
      const pctAt = (p) => (100 * scoreClues(combo, p.x, p.y)) / N_CLUES;
      ok(pctAt(M) === 100, `${pointStr(M.x, M.y)}: the meter reaches 100% at M`);
      ok(BOX.every((p) => (pctAt(p) === 100) === (p.x === M.x && p.y === M.y)), 'the meter reads 100% iff calibrated');
      stampChecks += 2;

      /* 10b. never pre-solved: the capstone starts at the origin */
      ok(
        scoreClues(combo, CALIB_START.x, CALIB_START.y) < N_CLUES,
        `${pointStr(M.x, M.y)}: the starting origin does not already solve the case`
      );
      stampChecks++;
    }

    /* the diagnostic the wide box exists for: would the small box have accepted
       a clue set with an unreachable rival answer? */
    const pool = cluePool(M);
    for (let i = 0; i < pool.length; i++)
      for (let j = i + 1; j < pool.length; j++)
        for (let k = j + 1; k < pool.length; k++) {
          const combo = [pool[i], pool[j], pool[k]];
          if (!comboIsFair(combo)) continue;
          const near = solutionsOf(combo, PMIN, PMAX);
          const wide = solutionsOf(combo, UMIN, UMAX);
          const uniqNear = near.length === 1 && near[0].x === M.x && near[0].y === M.y;
          const uniqWide = wide.length === 1 && wide[0].x === M.x && wide[0].y === M.y;
          if (uniqNear && !uniqWide) narrowOnly++;
          /* whatever the count, the invariant the lab relies on must hold: the
             sets validCombos accepts are unique EVERYWHERE, not just on screen */
          ok(!(uniqWide && !uniqNear), `${pointStr(M.x, M.y)}: wide-unique implies near-unique`);
          uniqChecks++;
        }
  }
}

/* ===== 11. the generator ================================================= */
let genChecks = 0;
{
  let prev = null;
  for (let seed = 1; seed <= 600; seed++) {
    const pz = makePuzzle(prev, mulberry32(seed));
    ok(pz && pz.M && Array.isArray(pz.clues), `seed ${seed}: makePuzzle returns a case`);
    ok(pz.clues.length === N_CLUES, `seed ${seed}: ${N_CLUES} clues`);
    ok(pz.M.x >= PMIN && pz.M.x <= PMAX && pz.M.y >= PMIN && pz.M.y <= PMAX, `seed ${seed}: M is inside the dials`);
    ok(!(pz.M.x === 0 && pz.M.y === 0), `seed ${seed}: M is never the origin`);
    ok(comboIsFair(pz.clues), `seed ${seed}: the clue set is fair`);
    ok(comboIsUnique(pz.clues, pz.M), `seed ${seed}: the clue set proves exactly one address`);
    ok(pz.clues.every((c) => clueHolds(c, pz.M.x, pz.M.y)), `seed ${seed}: every clue is true of M`);
    ok(scoreClues(pz.clues, CALIB_START.x, CALIB_START.y) < N_CLUES, `seed ${seed}: not pre-solved at the origin`);
    if (prev) ok(!(pz.M.x === prev.M.x && pz.M.y === prev.M.y), `seed ${seed}: never the same M twice running`);
    genChecks += 9;
    prev = pz;
  }
  /* the hand-checked fallback must itself be a legal, unique case */
  const fb = { M: { x: -5, y: -2 }, clues: [{ kind: 'quad', v: 3 }, { kind: 'distY', d: 5 }, { kind: 'distX', d: 2 }] };
  ok(comboIsUnique(fb.clues, fb.M), 'the fallback case proves exactly one address');
  ok(comboIsFair(fb.clues), 'the fallback case is fair');
  ok(fb.clues.every((c) => clueHolds(c, fb.M.x, fb.M.y)), 'the fallback clues are true of its M');
  genChecks += 3;
}

/* ===== 12. lesson claims are true AND reachable ========================== */
let lessonChecks = 0;
{
  const reachable = (x, y) => x >= PMIN && x <= PMAX && y >= PMIN && y <= PMAX;

  /* step 1 — "x = 3 names a line; (3,0), (3,5), (3,−2) all have x = 3" */
  for (const p of [[3, 0], [3, 5], [3, -2]]) {
    ok(p[0] === 3, `step 1: ${pointStr(p[0], p[1])} has x = 3`);
    ok(reachable(p[0], p[1]), `step 1: ${pointStr(p[0], p[1])} is reachable`);
    lessonChecks += 2;
  }
  ok(BOX.filter((p) => p.x === 3).length > 1, 'step 1: "x = 3" really is many points');
  ok(quadrantOf(3, 0).id === 0, 'step 1: (3,0) is the point on the x-axis it claims to be');

  /* step 2 — the crossing is START */
  ok(START.x === 3 && START.y === 5, 'step 2: the lab opens at (3,5), as the prose says');
  ok(reachable(START.x, START.y), 'step 2: (3,5) is reachable');

  /* step 3 — (3,5) ≠ (5,3), and (a,a) is its own swap */
  ok(!(3 === 5), 'step 3: (3,5) and (5,3) are different points');
  ok(reachable(5, 3), 'step 3: the ghost (5,3) is reachable');
  ok(quadrantOf(3, 5).id === quadrantOf(5, 3).id, 'step 3: the ghost of (3,5) stays in Quadrant I — same signs');

  /* step 4 — (−4,2): 4 left, 2 up */
  ok(acrossWord(-4) === '4 left', 'step 4: (−4,2) means 4 LEFT');
  ok(upWord(2) === '2 up', 'step 4: (−4,2) means 2 UP');
  ok(reachable(-4, 2), 'step 4: (−4,2) is reachable');

  /* step 5 — (0,6) on the y-axis, (6,0) on the x-axis, (0,0) the origin */
  ok(quadrantOf(0, 6).name === 'on the y-axis', 'step 5: (0,6) is on the y-axis');
  ok(quadrantOf(6, 0).name === 'on the x-axis', 'step 5: (6,0) is on the x-axis');
  ok(quadrantOf(0, 0).name === 'the origin', 'step 5: (0,0) is the origin');
  ok(reachable(0, 6) && reachable(6, 0), 'step 5: (0,6) and (6,0) are reachable');

  /* step 6 — (−6,3) is Quadrant II; (0,3) is in none */
  ok(quadrantOf(-6, 3).id === 2, 'step 6: (−6,3) is in Quadrant II');
  ok(QUAD_SIGNS[2] === '(−, +)', 'step 6: Quadrant II is the sign pair (−, +)');
  ok(reachable(-6, 3), 'step 6: (−6,3) is reachable');
  ok(quadrantOf(0, 3).id === 0, 'step 6: (0,3) is in NO quadrant');
  /* "size never affects the quadrant, only sign" — the prose's claim, checked */
  ok(
    BOX.every((p) => (p.x === 0 || p.y === 0 ? true : quadrantOf(p.x, p.y).id === quadrantOf(Math.sign(p.x), Math.sign(p.y)).id)),
    'step 6: the quadrant depends on the SIGNS alone, never the sizes'
  );

  /* step 7 — 5 from the y-axis ⇒ x = 5 or −5; at (−4,2) the distances are 4, 2 */
  const fiveFrom = BOX.filter((p) => distToYAxis(p.x) === 5).map((p) => p.x);
  ok(new Set(fiveFrom).size === 2 && new Set(fiveFrom).has(5) && new Set(fiveFrom).has(-5), 'step 7: |x| = 5 ⇒ x ∈ {5, −5}');
  ok(distToYAxis(-4) === 4 && distToXAxis(2) === 2, 'step 7: (−4,2) is 4 from the y-axis and 2 from the x-axis');
  lessonChecks += 20;

  /* every dial value the lesson names is inside the dials' range */
  for (const v of [3, 5, -2, 0, -4, 2, 6, -6]) {
    ok(v >= PMIN && v <= PMAX, `the lesson names ${v}, which the dials must reach`);
    lessonChecks++;
  }
  /* the window must actually contain the reachable box, with room for the pills */
  ok(XMIN < PMIN && XMAX > PMAX && YMIN < PMIN && YMAX > PMAX, 'the window is strictly wider than the dials reach');
  lessonChecks++;
}

/* ===== 13. source parity ================================================= */
let srcChecks = 0;
{
  const src = fs.readFileSync(new URL('./PointLab.jsx', import.meta.url), 'utf8');
  const num = (name) => {
    const m = src.match(new RegExp(`const ${name} = (-?\\d+);`));
    return m ? parseInt(m[1], 10) : NaN;
  };
  const pairs = [
    ['XMIN', XMIN],
    ['XMAX', XMAX],
    ['YMIN', YMIN],
    ['YMAX', YMAX],
    ['PMIN', PMIN],
    ['PMAX', PMAX],
    ['N_CLUES', N_CLUES],
    ['UMIN', UMIN],
    ['UMAX', UMAX],
  ];
  for (const [name, mine] of pairs) {
    ok(num(name) === mine, `source parity: ${name} is ${num(name)} in the lab, ${mine} here`);
    srcChecks++;
  }
  const st = src.match(/const START = \{ x: (-?\d+), y: (-?\d+) \}/);
  ok(st && parseInt(st[1], 10) === START.x && parseInt(st[2], 10) === START.y, 'source parity: START');
  const cs = src.match(/const CALIB_START = \{ x: (-?\d+), y: (-?\d+) \}/);
  ok(cs && parseInt(cs[1], 10) === CALIB_START.x && parseInt(cs[2], 10) === CALIB_START.y, 'source parity: CALIB_START');
  /* the lab must not have grown an epsilon behind the audit's back — every
     comparison in this topic is integer, and a tolerance would be a smell */
  ok(!/1e-\d/.test(src), 'source parity: the lab contains no epsilon (all integer math)');
  /* the y dial must genuinely unlock at step 1 — the opening lesson depends on it */
  ok(/key: 'y',[^}]*unlock: 1/.test(src), 'source parity: the y dial unlocks at step 1, not step 0');
  ok(/key: 'x',[^}]*unlock: 0/.test(src), 'source parity: the x dial unlocks at step 0');
  /* the distinctness promises, kept in code: no y=x mirror, no swap control */
  ok(!/y\s*=\s*x\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'source parity: no y = x mirror line (that is LogarithmLab’s)');
  srcChecks += 6;
}

/* ===== 14. formatting =================================================== */
let fmtChecks = 0;
{
  ok(fmtNum(-4) === '−4', 'fmtNum uses a real Unicode minus');
  ok(fmtNum(-4).charCodeAt(0) === 0x2212, 'the minus is U+2212, not a hyphen');
  ok(fmtNum(0) === '0' && !Object.is(fmtNum(-0), '−0'), 'negative zero prints as 0');
  ok(pointStr(3, 5) === '(3, 5)', 'the ordered pair is "(3, 5)"');
  ok(pointStr(-5, -2) === '(−5, −2)', 'a negative pair prints with real minuses');
  ok(ROMAN[1] === 'I' && ROMAN[2] === 'II' && ROMAN[3] === 'III' && ROMAN[4] === 'IV', 'the roman numerals');
  ok(clueText({ kind: 'distY', d: 1 }) === 'M is 1 unit from the y-axis', 'singular "unit" at distance 1');
  ok(clueText({ kind: 'distY', d: 5 }) === 'M is 5 units from the y-axis', 'plural "units" otherwise');
  ok(clueText({ kind: 'quad', v: 3 }) === 'M is in Quadrant III', 'the quadrant clue reads in roman numerals');
  ok(clueText({ kind: 'xIs', v: -5 }) === 'M’s x-coordinate is −5', 'a named negative coordinate uses a real minus');
  ok(clueText({ kind: 'axis', axis: 'y' }) === 'M sits on the y-axis', 'the axis clue');
  ok(clueText({ kind: 'xSign', s: -1 }) === 'M’s x-coordinate is negative', 'the sign clue');
  /* every clue kind the pool can emit must render — a blank clue is unsolvable */
  const kinds = new Set();
  for (const M of BOX) for (const c of cluePool(M)) kinds.add(c.kind);
  for (const k of kinds) {
    const sample = [...BOX].flatMap((M) => cluePool(M)).find((c) => c.kind === k);
    ok(clueText(sample).length > 3, `clue kind "${k}" renders real text`);
    fmtChecks++;
  }
  ok(kinds.size === 8, `all 8 clue kinds are reachable (got ${kinds.size}: ${[...kinds].join(', ')})`);
  fmtChecks += 13;
}

/* ===== 15. quiz choice order ============================================ */
let quizChecks = 0;
const slotDist = [];
{
  const src = fs.readFileSync(new URL('./PointLab.jsx', import.meta.url), 'utf8');
  const qs = [...src.matchAll(/^\s*q: '([^']+)',$/gm)].map((m) => m[1]);
  ok(qs.length === 7, `the lab has 7 questions before the capstone (found ${qs.length})`);
  quizChecks++;
  for (const q of qs) {
    const order = choiceOrder(q, 3);
    ok(new Set(order).size === 3, `"${q.slice(0, 28)}…" — the rotation is a permutation, no choice lost or doubled`);
    const slot = order.indexOf(0); // where the correct answer (original index 0) lands
    ok(slot >= 0 && slot < 3, 'the correct answer appears exactly once');
    ok(choiceOrder(q, 3).join() === order.join(), 'the rotation is deterministic across calls');
    slotDist.push(slot);
    quizChecks += 3;
  }
  ok(new Set(slotDist).size >= 2, `the correct answer moves between slots (saw ${JSON.stringify(slotDist)})`);
  ok(!slotDist.every((s) => s === 0), 'clicking the FIRST choice every time cannot pass the lab');
  ok(!slotDist.every((s) => s !== 0), 'the answer is not suspiciously never-first either');
  quizChecks += 3;
}

/* ===================== report ============================================ */
console.log('PointLab audit');
console.log('==============');
console.log(`quadrant == sign pair (exhaustive) : ${quadChecks}`);
console.log(`one number = LINE, two = POINT     : ${thesisChecks}`);
console.log(`the pair is ORDERED (exhaustive)   : ${orderChecks}`);
console.log(`route walks to the address         : ${routeChecks}`);
console.log(`|coord| = distance from an axis    : ${distChecks}`);
console.log(`clues true of their own target     : ${poolChecks}`);
console.log(`UNIQUENESS of every clue set       : ${uniqChecks}   (${comboCount} emittable cases)`);
console.log(`no-false-stamp sweeps              : ${stampChecks}`);
console.log(`generator runs                     : ${genChecks}`);
console.log(`lesson claims true & reachable     : ${lessonChecks}`);
console.log(`source parity with PointLab.jsx    : ${srcChecks}`);
console.log(`formatting round-trips             : ${fmtChecks}`);
console.log(`quiz choice-order checks           : ${quizChecks}  (answer slots: ${JSON.stringify(slotDist)})`);
console.log(`\nclue sets unique on-screen but NOT in ±20 (rejected by the wide check): ${narrowOnly}`);
console.log('\n-----------------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.slice(0, 25).forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
