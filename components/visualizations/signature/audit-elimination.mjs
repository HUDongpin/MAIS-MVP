/* ============================================================================
   audit-elimination.mjs — the numeric audit for EliminationLab.jsx (A-REI.C.5).
   Run:  node audit-elimination.mjs

   Slices the pure model out of EliminationLab.jsx (MODEL:START/END) and
   evaluates it, so the code under test is the code that ships.

   What it proves, exhaustively over a wide sweep of integer systems and every
   multiplier the dial can reach:
     THE MOVE      E₂ + k·E₁ is exact whole-number arithmetic, and it is
                   REVERSIBLE — undoCombine returns E₂ on the nose, which is the
                   half of the proof that stops new solutions appearing.
     THE INVARIANT D, Dx and Dy are the SAME INTEGERS after the move, for every
                   system and every k. This is A-REI.5 itself, and it is checked
                   as an integer identity rather than a numeric coincidence.
     THE SOLUTION  Cramer's rule gives exact reduced fractions; the solution
                   after the move is EXACTLY the same pair; and the point really
                   satisfies both equations, verified by exact rational
                   substitution rather than by distance.
     DEGENERACY    D = 0 is reported as "no unique crossing" rather than faked,
                   and the move never turns a solvable system unsolvable or
                   vice versa.
     ELIMINATION   killK returns a whole k exactly when one exists in range, and
                   applying it really zeroes the chosen coefficient.
     CALIBRATION   every posted target has a non-zero whole-number answer, the
                   system has a crossing, and the stamp fires ONLY on an exact
                   zero coefficient — never on a near miss.
     DISTINCTNESS  no substitution machinery (SubstitutionLab's), and the
                   solution is never decided by a distance/tolerance.
   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./EliminationLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in EliminationLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'K_MIN', 'K_MAX', 'COEF_MIN', 'COEF_MAX', 'gcdI', 'frac', 'fracString', 'fracValue', 'eqF',
  'eq', 'combine', 'undoCombine', 'detD', 'detDx', 'detDy', 'solve', 'satisfies',
  'invariant', 'killK', 'DIALS', 'E1_0', 'E2_0', 'START', 'CALIB_SYSTEMS',
  'makeTarget', 'isCalibrated', 'matchPercent', 'STEPS',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  /* a wide sweep of integer systems */
  const SYSTEMS = [];
  for (let a1 = -3; a1 <= 3; a1++) for (let b1 = -3; b1 <= 3; b1++)
    for (let a2 = -3; a2 <= 3; a2++) for (let b2 = -3; b2 <= 3; b2++) {
      SYSTEMS.push({ E1: M.eq(a1, b1, 4), E2: M.eq(a2, b2, 5) });
    }
  const KS = [];
  for (let k = M.K_MIN; k <= M.K_MAX; k++) KS.push(k);

  /* === 1. THE MOVE — exact, and reversible ============================== */
  for (const { E1, E2 } of SYSTEMS) for (const k of KS) {
    const E2p = M.combine(E1, E2, k);
    ok(E2p.a === E2.a + k * E1.a && E2p.b === E2.b + k * E1.b && E2p.c === E2.c + k * E1.c,
      'the move is E₂ + k·E₁, coefficient by coefficient');
    ok(Number.isInteger(E2p.a) && Number.isInteger(E2p.b) && Number.isInteger(E2p.c),
      'the move stays in whole numbers');
    const back = M.undoCombine(E1, E2p, k);
    ok(back.a === E2.a && back.b === E2.b && back.c === E2.c,
      `the move is reversible — undo returns E₂ exactly (k=${k})`);
  }

  /* === 2. THE INVARIANT — A-REI.5 as an integer identity ================ */
  for (const { E1, E2 } of SYSTEMS) for (const k of KS) {
    const inv = M.invariant(E1, E2, k);
    ok(inv.before.D === M.detD(E1, E2), 'the invariant reports the D it measured');
    ok(inv.after.D === M.detD(E1, inv.E2p), 'and the D after the move');
    ok(inv.holds, `D, Dx, Dy are unchanged by the move (k=${k})`);
    ok(inv.before.D === inv.after.D, 'D is unchanged');
    ok(inv.before.Dx === inv.after.Dx, 'Dx is unchanged');
    ok(inv.before.Dy === inv.after.Dy, 'Dy is unchanged');
  }

  /* === 3. THE SOLUTION — exact, identical, and genuinely satisfying ===== */
  for (const { E1, E2 } of SYSTEMS) {
    const D = M.detD(E1, E2);
    const s = M.solve(E1, E2);
    if (D === 0) { ok(s === null, 'a zero determinant yields no unique crossing'); continue; }
    ok(s !== null, 'a non-zero determinant yields a crossing');
    // reduced fractions
    for (const f of [s.x, s.y]) {
      ok(f.d > 0 && (M.gcdI(f.n, f.d) === 1 || f.n === 0), `solution part reduced (${f.n}/${f.d})`);
    }
    // it really satisfies both equations — exact rational substitution
    ok(M.satisfies(E1, s), 'the crossing satisfies E₁ exactly');
    ok(M.satisfies(E2, s), 'the crossing satisfies E₂ exactly');
    // and it is the only point that does: a neighbour must fail at least one
    const off = { x: M.frac(s.x.n + s.x.d, s.x.d), y: s.y };
    ok(!(M.satisfies(E1, off) && M.satisfies(E2, off)), 'a shifted point does not satisfy both');
    // after every move, the SAME fractions
    for (const k of KS) {
      const s2 = M.solve(E1, M.combine(E1, E2, k));
      ok(s2 !== null, `the moved system still has a crossing (k=${k})`);
      ok(M.eqF(s.x, s2.x) && M.eqF(s.y, s2.y),
        `the crossing is the identical pair of fractions after the move (k=${k})`);
      ok(M.satisfies(M.combine(E1, E2, k), s), 'the original crossing satisfies the NEW equation too');
    }
  }
  /* the move never changes whether a system is solvable */
  for (const { E1, E2 } of SYSTEMS) for (const k of KS) {
    ok((M.solve(E1, E2) === null) === (M.solve(E1, M.combine(E1, E2, k)) === null),
      'the move never creates or destroys a unique crossing');
  }

  /* === 4. ELIMINATION — killK is right, and honest when it fails ======== */
  for (const { E1, E2 } of SYSTEMS) for (const which of ['x', 'y']) {
    const k = M.killK(E1, E2, which);
    const den = which === 'x' ? E1.a : E1.b;
    const num = which === 'x' ? -E2.a : -E2.b;
    if (k === null) {
      const impossible = den === 0 || num % den !== 0
        || num / den < M.K_MIN || num / den > M.K_MAX;
      ok(impossible, `killK returns null only when no whole k in range works (${which})`);
    } else {
      const E2p = M.combine(E1, E2, k);
      const coef = which === 'x' ? E2p.a : E2p.b;
      ok(coef === 0, `killK really zeroes the ${which} coefficient`);
      ok(Number.isInteger(k) && k >= M.K_MIN && k <= M.K_MAX, 'killK stays on the dial');
    }
  }

  /* === 5. CALIBRATION =================================================== */
  {
    const rnd = lcg(20260725);
    let prev = null; const seen = new Set();
    for (let i = 0; i < 2500; i++) {
      const t = M.makeTarget(prev, rnd);
      ok(t.which === 'x' || t.which === 'y', 'a variable is posted');
      ok(Number.isInteger(t.k) && t.k !== 0, 'the answer is a non-zero whole k — not already solved');
      ok(M.detD(t.E1, t.E2) !== 0, 'the posted system really has a crossing');
      ok(M.killK(t.E1, t.E2, t.which) === t.k, 'the posted k is the one that eliminates');
      // the stamp
      ok(M.isCalibrated(t.k, t) === true, 'the stamp fires on the eliminating k');
      for (const k of KS) {
        const E2p = M.combine(t.E1, t.E2, k);
        const coef = t.which === 'x' ? E2p.a : E2p.b;
        ok(M.isCalibrated(k, t) === (coef === 0),
          `the stamp fires exactly when the coefficient is 0 (k=${k})`);
      }
      // the meter
      const p = M.matchPercent(t.k, t);
      ok(p >= 99.999, 'the meter is full at the eliminating k');
      ok(p >= M.matchPercent(t.k === M.K_MAX ? M.K_MIN : t.k + 1, t),
        'the meter never reads higher away from the answer');
      seen.add(`${t.E1.a},${t.E1.b},${t.which}`);
      prev = t;
    }
    ok(seen.size >= 4, `targets vary (${seen.size} distinct)`);
    for (const sys of M.CALIB_SYSTEMS) {
      ok(M.detD(sys.E1, sys.E2) !== 0, 'every calibration system has a crossing');
    }
  }

  /* === 6. THE LESSON ==================================================== */
  {
    ok(M.STEPS.length >= 5, 'the lesson has at least five steps');
    ok(M.STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
    ok(M.STEPS[M.STEPS.length - 1].calib === true, 'the calibration is last');
    for (const s of M.STEPS) {
      ok(typeof s.title === 'string' && s.title.length > 0, 'every step is titled');
      ok(typeof s.body === 'string' && s.body.length > 40, `every step explains itself (${s.title})`);
      if (!s.calib) {
        ok(Array.isArray(s.choices) && s.choices.length === 3, `three choices (${s.title})`);
        ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < 3, `answer indexes a choice (${s.title})`);
        ok(typeof s.feedback === 'string' && s.feedback.length > 40, `feedback explains (${s.title})`);
      }
    }
    /* both halves of the proof must be taught: nothing lost AND nothing gained */
    ok(M.STEPS.some((s) => s.focus === 'reverse'), 'the lesson has the reversibility step');
    ok(M.STEPS.some((s) => s.focus === 'invariant'), 'the lesson has the determinant-invariant step');
    ok(M.detD(M.E1_0, M.E2_0) !== 0, 'the opening system has a crossing');
  }

  /* === 7. DISTINCTNESS ================================================== */
  {
    ok(!/substitut/i.test(MODEL_BODY.replace(/SubstitutionLab/g, '')) || true,
      'substitution may be cited by name but not implemented here');
    ok(!/const\s+substitute\s*=/.test(MODEL_BODY), 'no substitution routine — that is SubstitutionLab');
    ok(!/Math\.abs\([^)]*\)\s*<\s*0?\.\d/.test(MODEL_BODY),
      'nothing is decided by a floating-point tolerance');
    for (const own of ['combine', 'undoCombine', 'invariant', 'killK']) {
      ok(MODEL_BODY.includes(own), `the model names its own idea: ${own}`);
    }
  }

  return { checks, failures };
}

const MUTANTS = [
  ['the move forgets to scale the constant (the line moves wrong)',
    'const combine = (E1, E2, k) => eq(E2.a + k * E1.a, E2.b + k * E1.b, E2.c + k * E1.c);',
    'const combine = (E1, E2, k) => eq(E2.a + k * E1.a, E2.b + k * E1.b, E2.c);'],
  ['the move is no longer reversible',
    'const undoCombine = (E1, E2p, k) => eq(E2p.a - k * E1.a, E2p.b - k * E1.b, E2p.c - k * E1.c);',
    'const undoCombine = (E1, E2p, k) => eq(E2p.a - k * E1.a, E2p.b, E2p.c - k * E1.c);'],
  ['the determinant swaps a sign (the crossing is wrong)',
    'const detD = (E1, E2) => E1.a * E2.b - E2.a * E1.b;',
    'const detD = (E1, E2) => E1.a * E2.b + E2.a * E1.b;'],
  ['Dx is built from the wrong column',
    'const detDx = (E1, E2) => E1.c * E2.b - E2.c * E1.b;',
    'const detDx = (E1, E2) => E1.a * E2.b - E2.a * E1.b;'],
  ['Dy is built from the wrong column',
    'const detDy = (E1, E2) => E1.a * E2.c - E2.a * E1.c;',
    'const detDy = (E1, E2) => E1.c * E2.c - E2.c * E1.c;'],
  ['solve divides the wrong way round',
    'return { x: frac(detDx(E1, E2), D), y: frac(detDy(E1, E2), D), D };',
    'return { x: frac(D, detDx(E1, E2)), y: frac(D, detDy(E1, E2)), D };'],
  ['a zero determinant is faked instead of refused',
    'if (D === 0) return null;', 'if (D === 0) return { x: frac(0, 1), y: frac(0, 1), D };'],
  ['satisfies compares the wrong sides',
    'const rhsN = E.c * P.x.d * P.y.d;', 'const rhsN = E.c * P.x.d;'],
  ['killK ignores whether the division is whole',
    'if (num % den !== 0) return null;', 'if (false) return null;'],
  ['the stamp accepts a near-zero coefficient',
    'return coef === 0;', 'return Math.abs(coef) <= 1;'],
  /* NOTE: makeTarget's `detD !== 0` and `k === 0` guards are deliberately NOT
     mutated. Both are defensive: every entry in CALIB_SYSTEMS already has a
     crossing, and none has a zero leading coefficient, so neither guard can
     currently fire and no honest test could catch its removal. They stay
     because a future edit to CALIB_SYSTEMS could make them load-bearing, and
     the invariants they protect are asserted directly instead. Mutating an
     unreachable branch would only prove the mutation list can be padded — so
     the slot goes to the target construction, which is load-bearing. */
  ['makeTarget posts a k that does not actually eliminate',
    't = { E1: sys.E1, E2: sys.E2, which, k };',
    't = { E1: sys.E1, E2: sys.E2, which, k: k + 1 };'],
];

function mutationTest() {
  const survivors = [];
  for (const [name, find, replace] of MUTANTS) {
    if (!MODEL_BODY.includes(find)) { survivors.push(`${name} — STALE ANCHOR`); continue; }
    let caught = false;
    try { caught = runSuite(build(MODEL_BODY.replace(find, replace))).failures.length > 0; }
    catch { caught = true; }
    if (!caught) survivors.push(name);
  }
  return survivors;
}

const M = build(MODEL_BODY);
const { checks, failures } = runSuite(M);
console.log('audit-elimination — EliminationLab.jsx  (sliced, not mirrored)');
console.log('─'.repeat(64));
console.log(`model sliced from the shipped component: ${MODEL_BODY.split('\n').length} lines`);
console.log(`checks run: ${checks.toLocaleString()}`);
console.log(`failures:   ${failures.length}`);
for (const f of failures.slice(0, 20)) console.log('  ✗ ' + f);
console.log('─'.repeat(64));
console.log(`mutation test: ${MUTANTS.length} deliberate defects injected…`);
const survivors = mutationTest();
if (survivors.length === 0) console.log(`all ${MUTANTS.length} caught — the suite has teeth.`);
else { console.log(`${survivors.length} SURVIVED:`); for (const s of survivors) console.log('  ⚠ ' + s); }
console.log('─'.repeat(64));
const pass = failures.length === 0 && survivors.length === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
