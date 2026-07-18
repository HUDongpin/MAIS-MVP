/* Numeric audit for TwoVariableInequalityLab — mirrors the lab's math exactly.
   Run: node audit-twovarinequality.mjs

   Proves, across the WHOLE reachable parameter space:

     1. model spot checks (lineY, gapAt, truth, the drawn flags),

     2. THE CORE INVARIANT — truth(x, y) agrees EXACTLY with membership in the
        half-plane the renderer PAINTS, at every reachable point.  `drawnRegion`
        is an exact mirror of draw()'s two flags (drawAbove / drawDashed), so the
        picture a student sees can never disagree with substituting the point.
        (The one-variable sibling shipped a real bug of exactly this shape — its
        ray was drawn from the pre-flip operator while its algebra used the
        post-flip one — and its audit passed because it tested a DIFFERENT
        predicate than the one draw() used.  Mirroring the renderer is the guard.)

     3. EXACTNESS — the lab claims `y < m*x + b` is an exact test because every
        operand is a multiple of 0.5.  Re-decide every single comparison in pure
        INTEGERS (double both sides: 2y OP m·(2x) + 2b) and check the float and
        integer verdicts agree at every reachable point.  This is what licenses
        the lab to use no epsilon anywhere.

     4. THE GAP IS THE VERDICT — sign(y − (m·x + b)) determines above/below and,
        with the operator, the truth value.  The lab's whole "read the gap"
        pedagogy is only honest if this holds identically.

     5. NO FLIP — the lab's headline counterpoint to its sibling (step 5): once
        solved for y, which HALF is shaded depends on the operator ALONE and
        never on the slope.  Asserted over every m in range, including negative
        and zero.

     6. LESSON CLAIMS ARE TRUE AND REACHABLE — every concrete numeric example the
        prose asserts is re-derived from the model, and every (m, b, op) it names
        is inside the dials' actual range.  (AbsoluteValueLab shipped a step
        whose worked example the dials could not reach; this is that guard.)

     7. THE TARGET GENERATOR — 7 evidence points, exactly 3 strictly above / 3
        strictly below / 1 exactly ON the fence, all on-screen, labels equal to
        the hidden target's own truth, never pre-solved by the neutral fence the
        student is handed, never a repeat.

     8. THE ON-FENCE POINT DOES ITS JOB — flipping ONLY the strictness of the
        hidden operator (< ↔ ≤, > ↔ ≥) must cost exactly one point.  That is the
        formal statement of "the evidence makes DASHED vs SOLID decidable rather
        than guessable", which is the entire reason that point is generated.

     9. NO FALSE STAMP — CALIBRATED fires iff all 7 points are classified
        correctly, the meter reads 100% iff CALIBRATED, and every (m, b, op) that
        scores 7/7 genuinely classifies all 7 points (so a student landing on an
        inequality other than the hidden one is genuinely correct, not lucky).

    10. formatting round-trips (real Unicode minus, m = 0 collapsing, ±b).
*/

import fs from 'node:fs';

/* ===================== the model, copied verbatim ========================= */
const OPS = ['<', '≤', '>', '≥'];
const isStrict = (op) => op === '<' || op === '>';
const isLess = (op) => op === '<' || op === '≤';

const lineY = (x, p) => p.m * x + p.b;
const gapAt = (x, y, p) => y - lineY(x, p);
const truth = (x, y, p) => {
  const L = lineY(x, p);
  if (p.op === '<') return y < L;
  if (p.op === '≤') return y <= L;
  if (p.op === '>') return y > L;
  return y >= L;
};

const drawAbove = (p) => !isLess(p.op);
const drawDashed = (p) => isStrict(p.op);
const drawnRegion = (x, y, p) => {
  const L = lineY(x, p);
  if (drawAbove(p)) return drawDashed(p) ? y > L : y >= L;
  return drawDashed(p) ? y < L : y <= L;
};

const MINUS = '−';
function fmtNum(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function coefStr(m) {
  if (m === 1) return '';
  if (m === -1) return MINUS;
  return fmtNum(m);
}
function rhsStr(p) {
  if (p.m === 0) return fmtNum(p.b);
  const head = `${coefStr(p.m)}x`;
  if (p.b === 0) return head;
  return `${head} ${p.b > 0 ? '+' : MINUS} ${Math.abs(p.b)}`;
}
const parenNeg = (v) => (v < 0 ? `(${fmtNum(v)})` : fmtNum(v));
const signedTerm = (v) => (v < 0 ? `${MINUS} ${Math.abs(v)}` : `+ ${fmtNum(v)}`);
/* the middle line of the on-screen substitution: m·x + b with the point in */
const substRhs = (p, x) => `${fmtNum(p.m)}·${parenNeg(x)} ${signedTerm(p.b)}`;

const XMIN = -7,
  XMAX = 7,
  YMIN = -7,
  YMAX = 7;
const PMIN = -6,
  PMAX = 6;
const START = { m: 1, b: 2, op: '>', x: 1, y: 5 };
const CALIB_START = { m: 1, b: 0, op: '<' };
const EVIDENCE_N = 7;

/* dial ranges, straight from PARAMS */
const M_MIN = -3,
  M_MAX = 3;
const B_MIN = -4,
  B_MAX = 4;

const scoreEvidence = (pts, p) => pts.reduce((n, q) => n + (truth(q.x, q.y, p) === q.in ? 1 : 0), 0);

function makeTarget(prev, rnd = Math.random) {
  const randInt = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  for (let guard = 0; guard < 4000; guard++) {
    const m = randInt(-3, 3);
    const b = randInt(-4, 4);
    const op = OPS[randInt(0, 3)];
    const p = { m, b, op };

    const onXs = [];
    for (let x = PMIN; x <= PMAX; x++) {
      const h = m * x + b;
      if (h >= PMIN && h <= PMAX) onXs.push(x);
    }
    if (!onXs.length) continue;
    const onX = onXs[randInt(0, onXs.length - 1)];
    const pts = [{ x: onX, y: m * onX + b }];

    const grow = (sign, need) => {
      const out = [];
      for (let tries = 0; out.length < need && tries < 500; tries++) {
        const x = randInt(PMIN, PMAX);
        const d = randInt(1, 3);
        const y = m * x + b + sign * d;
        if (y < PMIN || y > PMAX) continue;
        const clash = (q) => q.x === x && q.y === y;
        if (pts.some(clash) || out.some(clash)) continue;
        out.push({ x, y });
      }
      return out;
    };
    const above = grow(1, 3);
    const below = grow(-1, 3);
    if (above.length < 3 || below.length < 3) continue;

    const all = [...pts, ...above, ...below].map((q) => ({ ...q, in: truth(q.x, q.y, p) }));
    if (all.length !== EVIDENCE_N) continue;

    const nIn = all.filter((q) => q.in).length;
    if (nIn < 2 || nIn > EVIDENCE_N - 2) continue;
    if (all.every((q) => truth(q.x, q.y, CALIB_START) === q.in)) continue;
    if (prev && prev.m === m && prev.b === b && prev.op === op) continue;

    return { m, b, op, pts: all };
  }

  const p = { m: 1, b: 0, op: '>' };
  const raw = [
    { x: 0, y: 0 },
    { x: 1, y: 2 },
    { x: -2, y: 1 },
    { x: 3, y: 5 },
    { x: 2, y: 0 },
    { x: -1, y: -3 },
    { x: 4, y: 1 },
  ];
  return { ...p, pts: raw.map((q) => ({ ...q, in: truth(q.x, q.y, p) })) };
}

/* ===================== harness =========================================== */
let pass = 0;
let fail = 0;
const bad = [];
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    bad.push(msg);
  }
};

/* a deterministic PRNG so the generator audit is reproducible */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* the reachable grids */
const HALVES = [];
for (let k = PMIN * 2; k <= PMAX * 2; k++) HALVES.push(k / 2); // −6, −5.5, … 6
const MS = [];
for (let m = M_MIN; m <= M_MAX; m++) MS.push(m);
const BS = [];
for (let b = B_MIN; b <= B_MAX; b++) BS.push(b);

/* ---------------------------------------------------------------- 1. model */
{
  const p = { m: 1, b: 2, op: '>' };
  ok(lineY(1, p) === 3, 'lineY(1) of y=x+2 is 3');
  ok(lineY(-4, p) === -2, 'lineY(−4) of y=x+2 is −2');
  ok(gapAt(1, 5, p) === 2, 'gap at (1,5) is +2');
  ok(gapAt(1, 3, p) === 0, 'gap on the fence is 0');
  ok(truth(1, 5, p) === true, '(1,5) satisfies y > x+2');
  ok(truth(1, 3, p) === false, '(1,3) is ON the fence, so y > x+2 is false');
  ok(truth(1, 3, { ...p, op: '≥' }) === true, '(1,3) satisfies y ≥ x+2');
  ok(lineY(5, { m: 0, b: 3 }) === 3, 'm=0 gives a horizontal fence at b');
  ok(drawAbove({ m: -3, b: 0, op: '>' }) === true, '> shades above even for m=−3');
  ok(drawDashed({ m: 1, b: 0, op: '≥' }) === false, '≥ draws a SOLID fence');
  ok(drawDashed({ m: 1, b: 0, op: '>' }) === true, '> draws a DASHED fence');
}

/* ------------------------------- 2/3/4. the exhaustive point-by-point sweep */
let invChecks = 0;
let exactChecks = 0;
let gapChecks = 0;
for (const m of MS) {
  for (const b of BS) {
    for (const op of OPS) {
      const p = { m, b, op };
      for (const x of HALVES) {
        for (const y of HALVES) {
          /* 2. THE CORE INVARIANT: the algebra and the painted pixels agree */
          const t = truth(x, y, p);
          if (t !== drawnRegion(x, y, p)) {
            ok(false, `truth ≠ drawnRegion at m=${m} b=${b} ${op} (${x},${y})`);
          } else pass++;
          invChecks++;

          /* 3. EXACTNESS: re-decide the same comparison in pure integers.
                2·y OP m·(2x) + 2b — multiplying by 2 (positive) preserves order. */
          const Y2 = 2 * y;
          const X2 = 2 * x;
          if (!Number.isInteger(Y2) || !Number.isInteger(X2)) {
            ok(false, `grid value not a clean half: x=${x} y=${y}`);
          } else {
            const lhs = Y2;
            const rhs = m * X2 + 2 * b;
            let ti;
            if (op === '<') ti = lhs < rhs;
            else if (op === '≤') ti = lhs <= rhs;
            else if (op === '>') ti = lhs > rhs;
            else ti = lhs >= rhs;
            if (ti !== t) ok(false, `float ≠ integer verdict at m=${m} b=${b} ${op} (${x},${y})`);
            else pass++;
          }
          exactChecks++;

          /* 4. THE GAP IS THE VERDICT */
          const gp = gapAt(x, y, p);
          const expected =
            op === '<' ? gp < 0 : op === '≤' ? gp <= 0 : op === '>' ? gp > 0 : gp >= 0;
          if (expected !== t) ok(false, `gap sign ≠ verdict at m=${m} b=${b} ${op} (${x},${y})`);
          else pass++;
          gapChecks++;

          /* the gap's sign must also equal "is the point above the fence" */
          const above = y > lineY(x, p);
          if (above !== gp > 0) ok(false, `gap>0 ≠ above-the-fence at m=${m} b=${b} (${x},${y})`);
          else pass++;
        }
      }
    }
  }
}

/* ------------------------------------------------------------- 5. NO FLIP */
/* The lab's headline claim (step 5): solved for y, the shaded HALF depends on
   the operator alone — the slope tilts the fence but never swaps the sides.
   Formally: drawAbove is independent of m and b, and equals !isLess(op). */
let flipChecks = 0;
for (const op of OPS) {
  for (const m of MS) {
    for (const b of BS) {
      ok(drawAbove({ m, b, op }) === !isLess(op), `shade-above depends only on the op (m=${m} b=${b} ${op})`);
      ok(drawDashed({ m, b, op }) === isStrict(op), `dashed depends only on the op (m=${m} b=${b} ${op})`);
      flipChecks += 2;
    }
  }
}
/* and the concrete consequence: for a NEGATIVE slope, "less" still shades the
   points vertically BELOW — test real points, not just the flags */
for (const m of [-1, -2, -3]) {
  const p = { m, b: 1, op: '<' };
  for (const x of [-3, -1, 0, 2, 4]) {
    const L = lineY(x, p);
    ok(truth(x, L - 1, p) === true, `y<${m}x+1: the point 1 BELOW the fence at x=${x} is a solution`);
    ok(truth(x, L + 1, p) === false, `y<${m}x+1: the point 1 ABOVE the fence at x=${x} is not`);
    flipChecks += 2;
  }
}

/* ------------------------------------- 6. lesson claims: true AND reachable */
const inRange = (p) => p.m >= M_MIN && p.m <= M_MAX && p.b >= B_MIN && p.b <= B_MAX && OPS.includes(p.op);
const onGrid = (v) => v >= PMIN && v <= PMAX && Number.isInteger(v * 2);
{
  /* START: y > x + 2, tested at (1,5) */
  ok(inRange(START), 'START (m,b,op) is inside the dial ranges');
  ok(onGrid(START.x) && onGrid(START.y), 'START test point is on the 0.5 grid');
  ok(truth(START.x, START.y, START) === true, 'step 0 claim: (1,5) satisfies y > x+2');
  ok(lineY(1, START) === 3, 'step 0 claim: x+2 = 3 at x = 1');

  /* step 2: (1,3) is on the fence of y = x+2 and fails a strict > */
  ok(gapAt(1, 3, START) === 0, 'step 2 claim: (1,3) lies exactly on y = x+2');
  ok(truth(1, 3, START) === false, 'step 2 claim: (1,3) does not satisfy y > x+2');

  /* step 4: at x = 2 the fence y = x+2 has height 4 */
  ok(lineY(2, START) === 4, 'step 4 claim: the fence height at x=2 is 4');
  ok(truth(2, 6, START) === true, 'step 4 claim: (2,6) satisfies y > x+2');
  ok(gapAt(2, 6, START) === 2, 'step 4 claim: the gap at (2,6) is +2');
  ok(truth(2, 4, START) === false, 'step 4 claim: (2,4) sits on the fence → false');
  ok(truth(2, 1, START) === false, 'step 4 claim: (2,1) is below → false');
  ok(onGrid(2) && onGrid(6) && onGrid(1) && onGrid(4), 'step 4 points are reachable by the dials');

  /* step 5: y < −2x + 1 shades BELOW */
  const s5 = { m: -2, b: 1, op: '<' };
  ok(inRange(s5), 'step 5 example y < −2x+1 is reachable by the dials');
  ok(drawAbove(s5) === false, 'step 5 claim: y < −2x+1 shades BELOW the fence');
  ok(drawDashed(s5) === true, 'step 5: a strict < draws a dashed fence');
  ok(truth(0, lineY(0, s5) - 1, s5) === true, 'step 5: a point below the fence satisfies y < −2x+1');
  ok(truth(0, lineY(0, s5) + 1, s5) === false, 'step 5: a point above it does not');

  /* step 6: y ≥ 2x − 4, tested at the origin */
  const s6 = { m: 2, b: -4, op: '≥' };
  ok(inRange(s6), 'step 6 example y ≥ 2x−4 is reachable by the dials');
  ok(lineY(0, s6) === -4, 'step 6 claim: 2·0 − 4 = −4');
  ok(truth(0, 0, s6) === true, 'step 6 claim: (0,0) satisfies y ≥ 2x−4 (0 ≥ −4)');
  ok(drawAbove(s6) === true, 'step 6: ≥ shades above — the side (0,0) is on');
  ok(truth(0, 0, s6) === drawnRegion(0, 0, s6), 'step 6: the origin lands in the painted region');
  ok(drawDashed(s6) === false, 'step 6: ≥ draws a solid fence');

  /* the "test the origin" button always lands on the grid */
  ok(onGrid(0), 'the origin is reachable by the test-point dials');
}

/* --------------------------------- 7/8/9. the capstone: generator + no false stamp */
const rnd = mulberry32(20260715);
let genChecks = 0;
let strictChecks = 0;
let stampChecks = 0;
const opSeen = new Set();
let prev = null;
const TARGETS = 6000;
for (let i = 0; i < TARGETS; i++) {
  const t = makeTarget(prev, rnd);
  const p = { m: t.m, b: t.b, op: t.op };
  opSeen.add(t.op);

  /* 7. shape of the evidence */
  ok(t.pts.length === EVIDENCE_N, `target has exactly ${EVIDENCE_N} points`);
  ok(inRange(p), `target (m=${t.m}, b=${t.b}, ${t.op}) is inside the dial ranges — so it is findable`);

  const on = t.pts.filter((q) => gapAt(q.x, q.y, p) === 0);
  const above = t.pts.filter((q) => gapAt(q.x, q.y, p) > 0);
  const below = t.pts.filter((q) => gapAt(q.x, q.y, p) < 0);
  ok(on.length === 1, `exactly ONE point sits on the fence (got ${on.length})`);
  ok(above.length === 3, `exactly 3 points strictly above (got ${above.length})`);
  ok(below.length === 3, `exactly 3 points strictly below (got ${below.length})`);

  for (const q of t.pts) {
    ok(q.x >= PMIN && q.x <= PMAX && q.y >= PMIN && q.y <= PMAX, `evidence point ${q.x},${q.y} is on-screen`);
    ok(Number.isInteger(q.x) && Number.isInteger(q.y), 'evidence points sit on integer lattice points');
    ok(q.in === truth(q.x, q.y, p), 'every label equals the hidden inequality’s own verdict');
  }
  /* no duplicate points — a repeat would be dead evidence */
  const keys = new Set(t.pts.map((q) => `${q.x},${q.y}`));
  ok(keys.size === EVIDENCE_N, 'evidence points are distinct');

  /* both classes genuinely represented */
  const nIn = t.pts.filter((q) => q.in).length;
  ok(nIn >= 2 && nIn <= EVIDENCE_N - 2, `both ✓ and ✗ are represented (in = ${nIn})`);

  /* the target itself must solve its own puzzle */
  ok(scoreEvidence(t.pts, p) === EVIDENCE_N, 'the hidden inequality classifies all 7 — the puzzle IS solvable');

  /* never opens already-solved */
  ok(
    scoreEvidence(t.pts, CALIB_START) < EVIDENCE_N,
    'the neutral fence the student is handed misclassifies at least one point'
  );

  /* never a repeat of the previous puzzle */
  if (prev) ok(!(prev.m === t.m && prev.b === t.b && prev.op === t.op), 'a fresh puzzle differs from the last');
  genChecks++;

  /* 8. THE ON-FENCE POINT MAKES DASHED-vs-SOLID DECIDABLE.
        Flipping ONLY strictness can change the verdict at points ON the fence,
        and exactly one point is there — so the score must drop by exactly 1.
        This is the formal reason that point is generated at all. */
  const strictFlip = { '<': '≤', '≤': '<', '>': '≥', '≥': '>' }[t.op];
  const sf = { m: t.m, b: t.b, op: strictFlip };
  ok(
    scoreEvidence(t.pts, sf) === EVIDENCE_N - 1,
    `getting dashed/solid wrong costs exactly one point (${t.op} → ${strictFlip})`
  );
  ok(!isStrict(t.op) === isStrict(strictFlip), 'the strictness flip really does flip strictness');
  strictChecks++;

  /* getting the SIDE wrong is far more expensive than getting the fence style
     wrong — the meter must punish the big error harder */
  const dirFlip = { '<': '>', '≤': '≥', '>': '<', '≥': '≤' }[t.op];
  const df = { m: t.m, b: t.b, op: dirFlip };
  ok(scoreEvidence(t.pts, df) <= EVIDENCE_N - 3, `shading the wrong side costs at least 3 points (${t.op} → ${dirFlip})`);

  /* 9. NO FALSE STAMP — sweep the ENTIRE control space the student can reach
        and check that a 7/7 score always means genuinely all-correct, that the
        meter reads 100% iff the stamp fires, and that nothing below 7 stamps. */
  if (i < 400) {
    for (const m of MS) {
      for (const b of BS) {
        for (const op of OPS) {
          const s = { m, b, op };
          const n = scoreEvidence(t.pts, s);
          const solved = n === EVIDENCE_N;
          const pct = (100 * n) / EVIDENCE_N;
          /* the stamp fires iff every point is genuinely classified right */
          const genuinelyAll = t.pts.every((q) => truth(q.x, q.y, s) === q.in);
          ok(solved === genuinelyAll, `CALIBRATED iff all 7 genuinely correct (m=${m} b=${b} ${op})`);
          /* meter and stamp can never disagree */
          ok((pct === 100) === solved, `meter reads 100% iff CALIBRATED (m=${m} b=${b} ${op})`);
          ok(pct >= 0 && pct <= 100, 'the meter stays inside 0…100');
          /* a solving inequality must also PAINT all 7 correctly (picture = algebra) */
          if (solved) {
            ok(
              t.pts.every((q) => drawnRegion(q.x, q.y, s) === q.in),
              'a solving inequality also paints every point on the right side'
            );
          }
          stampChecks++;
        }
      }
    }
  }

  prev = t;
}
ok(opSeen.size === 4, `all four signs appear among generated targets (saw ${[...opSeen].join(' ')})`);

/* -------------------------------------------------- 10. formatting round-trip */
{
  ok(fmtNum(-3) === '−3', 'fmtNum uses a real Unicode minus (U+2212)');
  ok(fmtNum(-0) === '0', 'fmtNum normalises −0 to 0');
  ok(fmtNum(2.5) === '2.5', 'fmtNum keeps a half');
  ok(coefStr(1) === '', 'a coefficient of 1 is written as nothing');
  ok(coefStr(-1) === '−', 'a coefficient of −1 is written as a bare minus');
  ok(coefStr(-3) === '−3', 'a coefficient of −3 keeps its minus');
  ok(rhsStr({ m: 1, b: 2 }) === 'x + 2', 'y > x + 2 reads correctly');
  ok(rhsStr({ m: 1, b: -2 }) === 'x − 2', 'a negative b becomes a subtraction, not "+ −2"');
  ok(rhsStr({ m: -1, b: 0 }) === '−x', 'b = 0 disappears');
  ok(rhsStr({ m: 0, b: 3 }) === '3', 'm = 0 collapses the x-term entirely → y > 3');
  ok(rhsStr({ m: 0, b: 0 }) === '0', 'm = 0, b = 0 reads as y > 0');
  ok(rhsStr({ m: -2, b: 1 }) === '−2x + 1', 'the step-5 example prints as −2x + 1');
  ok(rhsStr({ m: 2, b: -4 }) === '2x − 4', 'the step-6 example prints as 2x − 4');
  /* every reachable (m,b) must produce a printable, minus-clean right side */
  let fmtChecks = 0;
  for (const m of MS) {
    for (const b of BS) {
      const s = rhsStr({ m, b });
      ok(!s.includes('-'), `rhsStr never emits an ASCII hyphen (m=${m}, b=${b} → ${s})`);
      ok(!s.includes('+ −') && !s.includes('− −'), `rhsStr never emits a doubled sign (m=${m}, b=${b} → ${s})`);
      ok(s.length > 0, 'rhsStr is never empty');
      fmtChecks += 3;
    }
  }
  ok(fmtChecks === MS.length * BS.length * 3, 'formatting swept every reachable (m, b)');

  /* THE SUBSTITUTION LINE'S NOTATION.  Browser QA caught the lab printing
     "1·−4 + 2": a negative multiplicand with no parentheses, which is malformed
     notation a student would copy down. Sweep every reachable (m, b, x) and
     assert the substitution is always well formed. */
  ok(substRhs({ m: 1, b: 2 }, -4) === '1·(−4) + 2', 'a negative x is parenthesised: 1·(−4) + 2');
  ok(substRhs({ m: 1, b: 2 }, 1) === '1·1 + 2', 'a positive x needs no parentheses');
  ok(substRhs({ m: -2, b: -4 }, -3) === '−2·(−3) − 4', 'a negative b subtracts, and a negative x is parenthesised');
  ok(substRhs({ m: 3, b: 0 }, 2.5) === '3·2.5 + 0', 'a zero b is still shown in a substitution — it is arithmetic');
  let subChecks = 0;
  for (const m of MS) {
    for (const b of BS) {
      for (const x of HALVES) {
        const s = substRhs({ m, b }, x);
        ok(!s.includes('-'), `substitution never emits an ASCII hyphen (m=${m} b=${b} x=${x} → ${s})`);
        ok(!/·\s*−/.test(s), `a negative multiplicand is NEVER bare after · (m=${m} b=${b} x=${x} → ${s})`);
        ok(!s.includes('+ −'), `a negative constant is NEVER added as "+ −" (m=${m} b=${b} x=${x} → ${s})`);
        /* and the line must still be arithmetically honest: it evaluates to m·x+b */
        const shown = s.replace(/−/g, '-').replace(/[()]/g, '').replace('·', '*');
        // eslint-disable-next-line no-eval
        ok(Math.abs(eval(shown) - (m * x + b)) < 1e-9, `the substitution line evaluates to m·x+b (${s})`);
        subChecks += 4;
      }
    }
  }
  ok(subChecks === MS.length * BS.length * HALVES.length * 4, 'substitution notation swept every reachable (m, b, x)');
}

/* ------------------------- 11. the quiz cannot be passed by clicking first */
/* Reads the REAL question strings out of the component (not a copy, which would
   silently drift the moment a question is reworded and the hash changes). */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const choiceOrder = (q, n) => {
  const rot = hashStr(q) % n;
  return Array.from({ length: n }, (_, j) => (j + rot) % n);
};
let quizChecks = 0;
let slotDist = [];
{
  const src = fs.readFileSync(new URL('./TwoVariableInequalityLab.jsx', import.meta.url), 'utf8');
  const qs = [...src.matchAll(/^\s*q: '((?:[^'\\]|\\.)*)',$/gm)].map((mm) => mm[1]);
  const answerZeros = [...src.matchAll(/^\s*answer: (\d+),$/gm)].map((mm) => Number(mm[1]));

  ok(qs.length >= 5, `found the lesson's questions in the source (got ${qs.length})`);
  ok(answerZeros.length === qs.length, 'every question declares an answer');
  /* the rotation is only safe to reason about because the SOURCE convention
     holds: the authored correct answer is always index 0 */
  ok(
    answerZeros.every((a) => a === 0),
    'the source keeps every correct answer at index 0 — the convention the rotation relies on'
  );

  for (const q of qs) {
    const n = 3; // every step in this lab offers three choices
    const perm = choiceOrder(q, n);
    /* a permutation: every original index appears exactly once */
    ok(new Set(perm).size === n && perm.every((v) => v >= 0 && v < n), `choiceOrder is a permutation (${q.slice(0, 30)}…)`);
    /* determinism: same question ⇒ same order, every time */
    ok(JSON.stringify(choiceOrder(q, n)) === JSON.stringify(perm), 'choiceOrder is deterministic — buttons never reorder');
    /* the correct answer (original 0) is still reachable and marked correctly */
    const slot = perm.indexOf(0);
    ok(slot >= 0 && slot < n, 'the correct answer still appears somewhere on screen');
    slotDist.push(slot);
    quizChecks += 3;
  }

  /* THE POINT: the correct answer must not sit in the same slot every time —
     "always first" and "never first" are equally learnable patterns. */
  ok(new Set(slotDist).size >= 2, `the correct answer moves between slots (saw ${JSON.stringify(slotDist)})`);
  ok(!slotDist.every((s) => s === 0), 'clicking the FIRST choice every time cannot pass the lab');
  ok(!slotDist.every((s) => s !== 0), 'the answer is not suspiciously never-first either');
}

/* ===================== report ============================================ */
console.log('TwoVariableInequalityLab audit');
console.log('=============================');
console.log(`truth == painted-region checks : ${invChecks}`);
console.log(`float == exact-integer checks  : ${exactChecks}`);
console.log(`gap-sign == verdict checks     : ${gapChecks}`);
console.log(`no-flip (slope never swaps)    : ${flipChecks}`);
console.log(`generated targets              : ${genChecks}`);
console.log(`dashed/solid decidability      : ${strictChecks}`);
console.log(`no-false-stamp sweeps          : ${stampChecks}`);
console.log(`quiz choice-order checks       : ${quizChecks}  (answer slots: ${JSON.stringify(slotDist)})`);
console.log('\n-----------------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.slice(0, 25).forEach((msgn) => console.log('  ✗ ' + msgn));
  process.exit(1);
}
console.log('All checks passed ✓');
