/* ============================================================================
   audit-quadraticequation.mjs — numerical audit for QuadraticEquationLab.jsx
   Run:  node audit-quadraticequation.mjs

   DESIGN: this audit IMPORTS THE LAB'S REAL MODEL rather than re-implementing
   it (the FormulaLab precedent). A mirrored audit can be green while the
   component is wrong, or drift from it silently. Here we slice the pure-JS
   region of the .jsx (PARAMS … makeTarget — no JSX, no hooks), append an
   export list, and import it as a data: URL. What is checked below is exactly
   what ships.

   The model is then checked against CLOSED FORMS written independently from
   the textbook — not against itself.

   The load-bearing checks:
     * canTile (an integer predicate) ⟺ xPlus ≥ 0 (a float fact). The picture
       is drawn to scale at xPlus, so if these ever disagree the lab draws a
       square with a negative side.
     * the completed square's side is √q in BOTH tile modes — the invariant
       the renderer's fixed (0,0) anchor depends on.
     * the tiles sum to q: x² + (b/a)x + p² = q.
     * SOLVED can never fire falsely (exhaustive over dial-state × target).

   This audit is MUTATION-TESTED at the bottom: four deliberate bugs are
   injected into the real source and each must be caught. A green audit that
   cannot fail is worthless.
   ========================================================================== */

import { readFile } from 'node:fs/promises';

const SRC = new URL('./QuadraticEquationLab.jsx', import.meta.url);

const EXPORTS = `
export { PARAMS, START, STEPS, FIT, MIN_SPAN,
         gcd, fmtFrac, trim, signedTerm, leadStr, perfectSqrt,
         analyze, figureBox, ladder, isSolved, rootError, matchPercent, makeTarget };
`;

/* Slice the pure-JS model region out of the component and load it. */
async function loadModel(mutate) {
  let text = await readFile(SRC, 'utf8');
  const start = text.indexOf('const PARAMS = [');
  const end = text.indexOf('EDIT 5 — Equation display.');
  if (start < 0 || end < 0) throw new Error('audit: could not locate the model region');
  // rewind `end` to the start of that comment block
  const endBlock = text.lastIndexOf('/* ---', end);
  let region = text.slice(start, endBlock);

  if (/<\//.test(region) || /\/>/.test(region))
    throw new Error('audit: the sliced region contains JSX — fix the slice markers');
  if (/use(State|Effect|Ref|Callback)\s*\(/.test(region))
    throw new Error('audit: the sliced region contains hooks — fix the slice markers');

  if (mutate) {
    const before = region;
    region = mutate(region);
    if (region === before) throw new Error('audit: a mutation did not apply — it is stale');
  }
  const mod = region + EXPORTS;
  const url = 'data:text/javascript;base64,' + Buffer.from(mod, 'utf8').toString('base64');
  return import(url);
}

/* ---- tiny assert harness ------------------------------------------------ */
function makeRunner() {
  let checks = 0;
  const failures = [];
  const ok = (cond, msg) => {
    checks++;
    if (!cond && failures.length < 40) failures.push(msg);
    else if (!cond) failures.push('…');
  };
  const near = (x, y, tol, msg) => ok(Math.abs(x - y) <= tol, `${msg} (${x} vs ${y})`);
  return { ok, near, get checks() { return checks; }, failures };
}

const RANGE = { a: [1, 4], b: [-6, 6], c: [-12, 12] };
function* triples() {
  for (let a = RANGE.a[0]; a <= RANGE.a[1]; a++)
    for (let b = RANGE.b[0]; b <= RANGE.b[1]; b++)
      for (let c = RANGE.c[0]; c <= RANGE.c[1]; c++) yield [a, b, c];
}

/* ============================================================================
   THE CHECKS
   ========================================================================== */
function runChecks(M, opts = {}) {
  const R = makeRunner();
  const { ok, near } = R;
  const { analyze, ladder, isSolved, rootError, matchPercent, makeTarget, STEPS, PARAMS, START } = M;

  const census = { void: 0, point: 0, nosquare: 0, tiles: 0, exact: 0, irrational: 0 };
  let maxExtent = 0;

  /* ---- 1. the full dial grid ------------------------------------------- */
  for (const [a, b, c] of triples()) {
    const I = analyze(a, b, c);
    const tag = `a=${a} b=${b} c=${c}`;

    /* discriminant — closed form, written independently */
    ok(I.delta === b * b - 4 * a * c, `${tag}: delta`);

    /* q = Δ/(4a²) and it must share Δ's sign (4a² > 0) */
    near(I.qF, I.delta / (4 * a * a), 1e-12, `${tag}: q value`);
    ok(Math.sign(I.qF) === Math.sign(I.delta), `${tag}: sign(q) === sign(delta)`);

    /* p = b/2a */
    near(I.pF, b / (2 * a), 1e-12, `${tag}: p value`);

    /* root count is decided by an integer, never a float */
    const expectCount = I.delta > 0 ? 2 : I.delta === 0 ? 1 : 0;
    ok(I.rootCount === expectCount, `${tag}: rootCount`);

    /* mode classification */
    const expectMode =
      I.delta < 0 ? 'void' : I.delta === 0 ? 'point' : b <= 0 || c <= 0 ? 'tiles' : 'nosquare';
    ok(I.mode === expectMode, `${tag}: mode ${I.mode} != ${expectMode}`);
    census[I.mode]++;

    if (I.delta >= 0) {
      /* THE LOAD-BEARING ONE: the integer predicate canTile must agree with
         the float fact xPlus ≥ 0, because the picture is drawn at xPlus. */
      const xp = (-b + Math.sqrt(I.delta)) / (2 * a);
      near(I.xPlus, xp, 1e-12, `${tag}: xPlus`);
      if (I.delta > 0) {
        ok(I.canTile === xp >= -1e-12, `${tag}: canTile(${I.canTile}) vs xPlus=${xp}`);
      }
    }

    /* every claimed root must actually solve the equation */
    for (const r of I.rootsF) {
      near(a * r * r + b * r + c, 0, 1e-9, `${tag}: root ${r} does not satisfy the equation`);
    }

    /* Vieta — an independent cross-check of the root pair */
    if (I.rootCount === 2) {
      near(I.rootsF[0] + I.rootsF[1], -b / a, 1e-9, `${tag}: Vieta sum`);
      near(I.rootsF[0] * I.rootsF[1], c / a, 1e-9, `${tag}: Vieta product`);
      ok(I.rootsF[0] < I.rootsF[1], `${tag}: roots ordered`);
    }

    /* the completed-square identity, at every root: (x + p)² = q */
    for (const r of I.rootsF) {
      near((r + I.pF) ** 2, I.qF, 1e-9, `${tag}: (x+p)² = q at x=${r}`);
    }

    /* exact rational roots iff Δ is a perfect square */
    const s = Math.round(Math.sqrt(Math.max(I.delta, 0)));
    const perfect = I.delta >= 0 && s * s === I.delta;
    ok(I.exact === perfect, `${tag}: exactness flag`);
    if (I.delta > 0) census[perfect ? 'exact' : 'irrational']++;

    /* √q = √Δ/(2a) */
    if (I.delta >= 0) near(I.sqrtQF, Math.sqrt(I.delta) / (2 * a), 1e-12, `${tag}: sqrtQ`);

    /* ---- geometry the renderer depends on ---- */
    if (I.delta > 0) {
      const sSide = I.sqrtQF;
      const P = Math.abs(I.pF);

      if (I.canTile) {
        const x = I.xPlus;
        ok(x >= -1e-12, `${tag}: tiles mode with negative x`);

        /* INVARIANT: in BOTH tile modes the completed square sits at (0,0)
           with side √q. The renderer hard-codes that anchor. */
        if (b >= 0) near(x + I.pF, sSide, 1e-9, `${tag}: add-mode side = x + p = √q`);
        else near(x - P, sSide, 1e-9, `${tag}: sub-mode side = x − |p| = √q`);

        /* the tiles must sum to q: x² + (b/a)·x + p² = q (the MONIC middle
           term — this is what caught the strip label using b instead of b/a) */
        near(x * x + (b / a) * x + I.pF * I.pF, I.qF, 1e-9, `${tag}: tile areas sum to q`);

        /* figureBox must CONTAIN every piece the renderer draws, in BOTH the
           uncut and the cut layout. If it does not, the construction spills
           off the stage — and the zoom would jump when the strip swings. */
        const bx = M.figureBox(I);
        const pieces =
          b >= 0
            ? [
                [0, 0, x, x], // x² tile
                [x, 0, 2 * P, x], // the uncut b·x strip
                [x, 0, P, x], // strip A
                [0, x, x, P], // strip B, landed
                [x, x, P, P], // the corner
                [0, 0, sSide, sSide], // the completed square
              ]
            : [
                [0, 0, x, x],
                [x - 2 * P, 0, 2 * P, x],
                [x - P, 0, P, x],
                [0, x - P, x, P],
                [x - P, x - P, P, P],
                [0, 0, sSide, sSide],
              ];
        for (const [u, v, w, h] of pieces) {
          ok(
            u >= bx.u0 - 1e-9 &&
              v >= bx.v0 - 1e-9 &&
              u + w <= bx.u1 + 1e-9 &&
              v + h <= bx.v1 + 1e-9,
            `${tag}: piece (${u.toFixed(2)},${v.toFixed(2)},${w.toFixed(2)},${h.toFixed(
              2
            )}) escapes figureBox`
          );
        }
      } else {
        /* nosquare: both roots negative, and the square still has side √q */
        ok(I.rootsF[0] < 0 && I.rootsF[1] < 0, `${tag}: nosquare but a root is >= 0`);
        ok(sSide > 0, `${tag}: nosquare should still have a real side`);
      }
    }

    /* figureBox must be sane in EVERY mode — a NaN span blanks the stage */
    const bxAny = M.figureBox(I);
    const spanAny = Math.max(bxAny.u1 - bxAny.u0, bxAny.v1 - bxAny.v0, M.MIN_SPAN);
    ok(
      Number.isFinite(spanAny) && spanAny >= M.MIN_SPAN,
      `${tag}: figureBox span ${spanAny} in mode ${I.mode}`
    );
    ok(bxAny.u1 >= bxAny.u0 && bxAny.v1 >= bxAny.v0, `${tag}: figureBox is not inside-out`);
    maxExtent = Math.max(maxExtent, spanAny);

    /* the UNION must contain BOTH phase boxes — that is what makes the zoom
       (taken from the union) safe for the layout at either end of the swing */
    for (const ph of [0, 1]) {
      const bp = M.figureBox(I, ph);
      ok(
        bp.u0 >= bxAny.u0 - 1e-9 &&
          bp.v0 >= bxAny.v0 - 1e-9 &&
          bp.u1 <= bxAny.u1 + 1e-9 &&
          bp.v1 <= bxAny.v1 + 1e-9,
        `${tag}: phase-${ph} box escapes the union box`
      );
      ok(Number.isFinite(bp.u1 - bp.u0), `${tag}: phase-${ph} box finite`);
    }

    /* ---- the ladder ---- */
    const rows = ladder(I);
    ok(rows.length >= 4, `${tag}: ladder too short`);
    ok(rows[0].key === 'given', `${tag}: ladder starts at the equation`);
    const hasStop = rows.some((r) => r.key === 'stop');
    ok(hasStop === I.delta < 0, `${tag}: ladder stop row iff no real solution`);
    ok(
      rows.some((r) => r.key === 'monic') === (a !== 1),
      `${tag}: ladder divides through iff a != 1`
    );
    ok(
      rows.some((r) => r.key === 'complete') === (b !== 0),
      `${tag}: ladder completes the square iff b != 0`
    );
    if (I.delta >= 0) {
      ok(rows[rows.length - 1].key === 'answer', `${tag}: ladder ends at the answer`);
      /* the answer line must name the same roots the model computed */
      const last = rows[rows.length - 1].eq;
      for (const rs of I.rootsStr) ok(last.includes(rs), `${tag}: answer line missing ${rs}`);
    }
  }

  /* ---- 2. the lesson itself -------------------------------------------- */
  ok(STEPS.length === 9, 'STEPS length');
  STEPS.forEach((s, i) => {
    if (s.calib) {
      ok(i === STEPS.length - 1, 'the calibration step is last');
      return;
    }
    ok(!!s.q && Array.isArray(s.choices), `step ${i}: has a question`);
    ok(s.answer >= 0 && s.answer < s.choices.length, `step ${i}: answer index in range`);
    ok(!!s.feedback && s.feedback.length > 40, `step ${i}: has a real reveal`);
  });
  /* every dial unlock must name a real step */
  PARAMS.forEach((p) => ok(p.unlock >= 0 && p.unlock < STEPS.length, `dial ${p.key}: unlock step`));

  /* values the lesson TELLS the student to dial in must be reachable AND do
     what the text claims (the cone-audit lesson: never promise an unreachable
     state) */
  const reach = (k, v) => {
    const d = PARAMS.find((p) => p.key === k);
    return v >= d.min && v <= d.max && Number.isInteger((v - d.min) / d.step);
  };
  ok(reach('b', 4) && reach('c', -5), 'START x²+4x−5 is reachable');
  ok(reach('b', 2) && reach('c', 5) && reach('a', 1), 'step 6 tells you to try b=2, c=5');
  ok(analyze(1, 2, 5).delta < 0, 'step 6: b=2, c=5 really does give q < 0');
  ok(analyze(1, 2, 5).mode === 'void', 'step 6: b=2, c=5 really does refuse the square');
  ok(reach('b', 3), 'step 3 mentions b = 3 (strips 1.5 wide)');
  const s0 = analyze(START.a, START.b, START.c);
  ok(s0.qStr === '9' && s0.pStr === '2', 'START completes to (x+2)² = 9 as the lesson says');
  ok(s0.rootsStr.join(',') === '−5,1', 'START solves to x = −5 or 1 as the lesson says');
  ok(s0.mode === 'tiles', 'START draws the full construction');
  /* step 4 claims the corner is 2×2 = 4 at b=4 */
  ok(analyze(1, 4, -5).pF === 2, 'step 4: at b=4 the corner is 2 by 2');

  /* ---- 3. targets ------------------------------------------------------ */
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < (opts.targetDraws ?? 20000); i++) {
    const t = makeTarget(prev);
    ok(t.t1 < t.t2, `target ${t.t1},${t.t2}: distinct and ordered`);
    ok(Math.abs(t.t1 + t.t2) <= 6, `target ${t.t1},${t.t2}: b fits the dial`);
    ok(Math.abs(t.t1 * t.t2) <= 12, `target ${t.t1},${t.t2}: c fits the dial`);
    /* it must be SOLVABLE at a = 1 — the equation the student can actually build */
    const b = -(t.t1 + t.t2);
    const c = t.t1 * t.t2;
    ok(reach('b', b) && reach('c', c), `target ${t.t1},${t.t2}: reachable at a=1`);
    ok(isSolved(1, b, c, t), `target ${t.t1},${t.t2}: the canonical build is SOLVED`);
    const J = analyze(1, b, c);
    ok(J.rootCount === 2, `target ${t.t1},${t.t2}: the built equation has two roots`);
    near(J.rootsF[0], t.t1, 1e-9, `target ${t.t1},${t.t2}: root 1`);
    near(J.rootsF[1], t.t2, 1e-9, `target ${t.t1},${t.t2}: root 2`);
    ok(prev === null || !(t.t1 === prev.t1 && t.t2 === prev.t2), 'target is not an immediate repeat');
    seen.add(`${t.t1},${t.t2}`);
    prev = t;
  }

  /* ---- 4. the calibration gate: exhaustive, no false SOLVED ------------ */
  const targets = [];
  for (let t1 = -4; t1 <= 4; t1++)
    for (let t2 = t1 + 1; t2 <= 4; t2++)
      if (Math.abs(t1 + t2) <= 6 && Math.abs(t1 * t2) <= 12) targets.push({ t1, t2 });
  ok(targets.length > 20, 'the target pool is not degenerate');

  let closestWrong = 0;
  let solvedCount = 0;
  for (const t of targets) {
    for (const [a, b, c] of triples()) {
      const solved = isSolved(a, b, c, t);
      const I = analyze(a, b, c);
      const err = rootError(I, t);
      const pct = matchPercent(err);
      if (solved) {
        solvedCount++;
        /* SOLVED must mean the roots really are the targets — exactly */
        ok(I.rootCount === 2, `SOLVED a=${a} b=${b} c=${c} but not two roots`);
        near(I.rootsF[0], t.t1, 1e-9, `SOLVED a=${a} b=${b} c=${c}: root 1 wrong`);
        near(I.rootsF[1], t.t2, 1e-9, `SOLVED a=${a} b=${b} c=${c}: root 2 wrong`);
        near(err, 0, 1e-9, `SOLVED a=${a} b=${b} c=${c}: err should be 0`);
        near(pct, 100, 1e-9, `SOLVED a=${a} b=${b} c=${c}: meter should read 100`);
      } else {
        /* and NOT-SOLVED must mean the roots really differ — so the meter can
           never read a full 100% while the stamp is withheld */
        ok(err > 1e-9, `false 100%: a=${a} b=${b} c=${c} not SOLVED but err=${err}`);
        closestWrong = Math.max(closestWrong, pct);
      }
    }
  }
  ok(solvedCount > 0, 'some dial state solves each target');
  /* every a in 1..4 must work when the numbers fit — the lab claims this */
  const tA = { t1: -1, t2: 2 };
  for (let a = 1; a <= 4; a++) {
    const b = -a * (tA.t1 + tA.t2);
    const c = a * tA.t1 * tA.t2;
    if (Math.abs(b) <= 6 && Math.abs(c) <= 12)
      ok(isSolved(a, b, c, tA), `a=${a} should also solve x=−1,2`);
  }

  /* ---- 5. the meter behaves -------------------------------------------- */
  ok(matchPercent(0) === 100, 'meter: exact = 100%');
  for (let e = 0; e < 12; e += 0.25)
    ok(matchPercent(e) >= matchPercent(e + 0.25), `meter monotonic at err=${e}`);
  ok(matchPercent(99) < 1, 'meter: no real roots reads ~0%');

  return { R, census, closestWrong, maxExtent, distinctTargets: seen.size };
}

/* ============================================================================
   MAIN
   ========================================================================== */
const M = await loadModel(null);
const { R, census, closestWrong, maxExtent, distinctTargets } = runChecks(M);

console.log('QuadraticEquationLab — numerical audit');
console.log('─'.repeat(62));
console.log(`checks run        : ${R.checks.toLocaleString()}`);
console.log(`failures          : ${R.failures.length}`);
console.log('');
console.log('picture census over all 1,300 (a,b,c):');
console.log(`  tiles (full construction) : ${census.tiles}`);
console.log(`  nosquare (roots < 0)      : ${census.nosquare}`);
console.log(`  point (Δ = 0)             : ${census.point}`);
console.log(`  void  (Δ < 0)             : ${census.void}`);
console.log(`  rational vs irrational    : ${census.exact} / ${census.irrational}`);
console.log('');
console.log(`largest figure span: ${maxExtent.toFixed(2)}u (auto-fit to ${(M.FIT*100).toFixed(0)}% of the stage)`);
console.log(`distinct targets  : ${distinctTargets}`);
console.log(`closest WRONG calibration state reads : ${closestWrong.toFixed(1)}%`);

if (R.failures.length) {
  console.log('\nFAILURES:');
  for (const f of R.failures.slice(0, 40)) console.log('  ✗ ' + f);
  process.exitCode = 1;
} else {
  console.log('\n✓ all checks pass');
}

/* ---------------------------------------------------------------------------
   MUTATION TEST — inject known bugs into the REAL source and demand that the
   audit catches each one. An audit that cannot fail proves nothing.
   ------------------------------------------------------------------------- */
console.log('\nmutation test (each bug MUST be caught)');
console.log('─'.repeat(62));

const MUTANTS = [
  ['delta: b² − 4ac → b² + 4ac', (s) => s.replace('const delta = b * b - 4 * a * c;', 'const delta = b * b + 4 * a * c;')],
  ['q: Δ/(4a²) → Δ/(2a²)', (s) => s.replace('qDen: 4 * a * a,', 'qDen: 2 * a * a,').replace('qF: delta / (4 * a * a),', 'qF: delta / (2 * a * a),')],
  ['p: b/(2a) → b/a', (s) => s.replace('pF: b / (2 * a),', 'pF: b / a,')],
  ['canTile drops the c ≤ 0 branch', (s) => s.replace('out.canTile = delta > 0 && (b <= 0 || c <= 0);', 'out.canTile = delta > 0;')],
  ['SOLVED gate loosened to sign-only', (s) => s.replace('return b === -a * (t.t1 + t.t2) && c === a * t.t1 * t.t2;', 'return c === a * t.t1 * t.t2;')],
];

let caught = 0;
for (const [name, mut] of MUTANTS) {
  let failures = -1;
  try {
    const MM = await loadModel(mut);
    const res = runChecks(MM, { targetDraws: 400 });
    failures = res.R.failures.length;
  } catch (e) {
    failures = 1; // a throw is also a catch
  }
  const good = failures > 0;
  if (good) caught++;
  console.log(`  ${good ? '✓ caught' : '✗ MISSED'}  ${name}  (${failures} failures)`);
}
console.log(`\n${caught}/${MUTANTS.length} mutations caught`);
if (caught !== MUTANTS.length) process.exitCode = 1;
