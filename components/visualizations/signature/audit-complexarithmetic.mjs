/* ============================================================================
   audit-complexarithmetic.mjs — the numeric audit for ComplexArithmeticLab.jsx
   (N-CN.A.3 / N-CN.B.4 / N-CN.B.5 / N-CN.B.6).
   Run:  node audit-complexarithmetic.mjs

   Slices the pure model out of ComplexArithmeticLab.jsx (MODEL:START/END) and
   evaluates it, so the code under test is the code that ships.

   What it proves, exhaustively over the whole lattice the lab exposes:
     MODULUS      |z|² = a² + b², a non-negative integer, zero only at z = 0.
     CONJUGATE    z̄ is an involution, and z·z̄ is REAL (imaginary part exactly 0)
                  and equals |z|² — the fact the division method rests on.
     QUOTIENT     the exact claim: (z/w)·w = z, verified in INTEGER arithmetic
                  as num·w = z·den, for every z and every non-zero w. Fractions
                  are fully reduced with a positive denominator.
     LATTICE      quotientIsLattice is true exactly when |w|² divides both parts
                  of z·w̄ — checked against an independent divisibility test.
     PRODUCT      |zw|² = |z|²·|w|² for every pair (the Brahmagupta–Fibonacci
                  identity) — the exact half of "lengths multiply, angles add".
     POLAR        the argument lands in [0, 360), and where the lab claims an
                  EXACT angle (axes and diagonals) it agrees with atan2 to
                  within floating tolerance — the claim is never wrong.
     DISTANCE     |z − w|² is symmetric, zero only when z = w, and equals
                  |z|² − 2Re(z·w̄) + |w|²; the midpoint is exact in halves.
     CALIBRATION  every generated target satisfies z = q·w exactly, stays on the
                  dials, and the stamp is an exact lattice equality.
     DISTINCTNESS the ×i press mechanic (ComplexPlaneLab's) is grepped OUT.
   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./ComplexArithmeticLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in ComplexArithmeticLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'Z_RANGE', 'W_RANGE', 'gcdI', 'cx', 'addC', 'subC', 'mulC', 'conjC', 'normSq', 'isZero',
  'conjProduct', 'frac', 'fracIsInt', 'fracString', 'quotient', 'quotientIsLattice',
  'productLengthIdentity', 'argDeg', 'exactAngleDeg', 'distSq', 'midpointDoubled',
  'halfString', 'DIALS', 'START', 'CALIB_W', 'CALIB_Q', 'makeTarget', 'isCalibrated',
  'matchPercent', 'STEPS',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

/* a deterministic PRNG so the calibration checks are reproducible */
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  /* every arm the z dials can reach, and every non-zero divisor the w dials can */
  const ZS = [], WS = [];
  for (let a = M.Z_RANGE.min; a <= M.Z_RANGE.max; a++)
    for (let b = M.Z_RANGE.min; b <= M.Z_RANGE.max; b++) ZS.push(M.cx(a, b));
  for (let c = M.W_RANGE.min; c <= M.W_RANGE.max; c++)
    for (let d = M.W_RANGE.min; d <= M.W_RANGE.max; d++) if (c !== 0 || d !== 0) WS.push(M.cx(c, d));

  /* === 1. MODULUS — exact, non-negative, zero only at the origin ========= */
  for (const z of ZS) {
    const n = M.normSq(z);
    ok(n === z.re * z.re + z.im * z.im, `|z|² = a²+b² for ${z.re},${z.im}`);
    ok(Number.isInteger(n) && n >= 0, `|z|² is a non-negative integer (${z.re},${z.im})`);
    ok((n === 0) === M.isZero(z), `|z|² = 0 exactly at the origin (${z.re},${z.im})`);
  }

  /* === 2. CONJUGATE — involution, and z·z̄ is REAL and equals |z|² ======= */
  for (const z of ZS) {
    const c1 = M.conjC(z), c2 = M.conjC(c1);
    ok(c1.re === z.re && c1.im === -z.im, `conjugate flips only the imaginary part (${z.re},${z.im})`);
    ok(c2.re === z.re && c2.im === z.im, `conjugate is an involution (${z.re},${z.im})`);
    const p = M.conjProduct(z);
    ok(p.im === 0, `z·z̄ is REAL — imaginary part exactly 0 (${z.re},${z.im})`);
    ok(p.re === M.normSq(z), `z·z̄ = |z|² (${z.re},${z.im})`);
  }

  /* === 3. QUOTIENT — the exact claim (z/w)·w = z, in integer arithmetic ==
     q is held as num/den. The value q·w equals z iff num·w = z·den. */
  for (const z of ZS) for (const w of WS) {
    const q = M.quotient(z, w);
    ok(q != null, `quotient defined for w ≠ 0 (${w.re},${w.im})`);
    const back = M.mulC(q.num, w);
    ok(back.re === z.re * q.den && back.im === z.im * q.den,
      `(z/w)·w = z exactly for z=${z.re},${z.im} w=${w.re},${w.im}`);
    ok(q.den === M.normSq(w), 'the denominator is |w|², a whole number');
    ok(q.den > 0, 'the denominator is positive');
    // the reduced fraction parts
    for (const f of [q.re, q.im]) {
      ok(f.d > 0, 'fraction denominator is positive');
      ok(M.gcdI(f.n, f.d) === 1 || f.n === 0, `fraction is fully reduced (${f.n}/${f.d})`);
    }
    ok(q.re.n * q.den === q.num.re * q.re.d, 'the reduced real part still names num.re/den');
    ok(q.im.n * q.den === q.num.im * q.im.d, 'the reduced imaginary part still names num.im/den');
    // independent divisibility reference for the lattice test
    const wantLattice = (q.num.re % q.den === 0) && (q.num.im % q.den === 0);
    ok(M.quotientIsLattice(q) === wantLattice,
      `lattice quotient iff |w|² divides both parts (z=${z.re},${z.im} w=${w.re},${w.im})`);
  }
  ok(M.quotient(M.cx(1, 1), M.cx(0, 0)) === null, 'dividing by 0 is refused, not faked');

  /* === 4. PRODUCT — |zw|² = |z|²·|w|², every pair ======================== */
  for (const z of ZS) for (const w of WS) {
    const id = M.productLengthIdentity(z, w);
    ok(id.holds, `|zw|² = |z|²·|w|² for z=${z.re},${z.im} w=${w.re},${w.im}`);
    ok(id.lhs === M.normSq(M.mulC(z, w)) && id.rhs === M.normSq(z) * M.normSq(w),
      'the identity reports the two sides it actually compared');
  }

  /* === 5. POLAR — argument in [0,360), and every EXACT claim is true ===== */
  for (const z of ZS) {
    const a = M.argDeg(z);
    if (M.isZero(z)) { ok(a === null, 'the origin has no argument'); continue; }
    ok(a >= 0 && a < 360, `argument in [0,360) for ${z.re},${z.im} (got ${a})`);
    const ex = M.exactAngleDeg(z);
    if (ex !== null) {
      ok(Math.abs(ex - a) < 1e-9, `an "exact" angle really is the argument (${z.re},${z.im}: ${ex} vs ${a})`);
      ok([0, 45, 90, 135, 180, 225, 270, 315].includes(ex), `exact angles are axes/diagonals (${ex})`);
    } else {
      // the lab must not claim exactness for an arm that is not on an axis/diagonal
      ok(!(z.re === 0 || z.im === 0 || Math.abs(z.re) === Math.abs(z.im)),
        `no exact angle is claimed only for genuinely off-diagonal arms (${z.re},${z.im})`);
    }
  }

  /* === 6. DISTANCE and MIDPOINT ========================================= */
  for (const z of ZS) for (const w of WS) {
    const d1 = M.distSq(z, w), d2 = M.distSq(w, z);
    ok(d1 === d2, 'distance² is symmetric');
    ok(d1 === M.normSq(M.subC(z, w)), 'distance² is |z − w|²');
    ok(d1 === M.normSq(z) - 2 * (z.re * w.re + z.im * w.im) + M.normSq(w),
      'distance² expands as |z|² − 2Re(z·w̄) + |w|²');
    ok((d1 === 0) === (z.re === w.re && z.im === w.im), 'distance² is 0 exactly when the points coincide');
    const md = M.midpointDoubled(z, w);
    ok(md.re === z.re + w.re && md.im === z.im + w.im, 'the doubled midpoint is the coordinate sum');
    ok(M.halfString(md.re) === (md.re % 2 === 0 ? String(md.re / 2) : `${md.re}/2`), 'halves print exactly');
  }

  /* === 7. CALIBRATION — reachable, exact, and never pre-solved ========== */
  {
    const rnd = lcg(20260725);
    let prev = null;
    const seen = new Set();
    for (let i = 0; i < 4000; i++) {
      const t = M.makeTarget(prev, rnd);
      const built = M.mulC(t.q, t.w);
      ok(built.re === t.z.re && built.im === t.z.im, 'the target arm really is q·w');
      ok(!M.isZero(t.w) && !M.isZero(t.q) && !M.isZero(t.z), 'no degenerate zero in a target');
      ok(t.z.re >= M.Z_RANGE.min && t.z.re <= M.Z_RANGE.max, 'target real part is on the z dial');
      ok(t.z.im >= M.Z_RANGE.min && t.z.im <= M.Z_RANGE.max, 'target imaginary part is on the z dial');
      ok(t.w.re >= M.W_RANGE.min && t.w.re <= M.W_RANGE.max, 'divisor real part is on the w dial');
      ok(t.w.im >= M.W_RANGE.min && t.w.im <= M.W_RANGE.max, 'divisor imaginary part is on the w dial');
      // the posted quotient is genuinely what z/w reduces to
      const q = M.quotient(t.z, t.w);
      ok(M.quotientIsLattice(q), 'the target quotient is a lattice point');
      ok(q.re.n === t.q.re && q.re.d === 1 && q.im.n === t.q.im && q.im.d === 1,
        'z ÷ w reduces to exactly the posted target');
      // the stamp
      ok(M.isCalibrated(t.z, t) === true, 'the stamp fires on the exact arm');
      ok(M.isCalibrated(M.cx(t.z.re + 1, t.z.im), t) === false, 'a one-step miss does NOT stamp');
      ok(M.isCalibrated(M.cx(t.z.re, t.z.im + 1), t) === false, 'a one-step miss does NOT stamp');
      // the meter is a percentage and is maximal at the goal
      const p = M.matchPercent(t.z, t);
      ok(p >= 0 && p <= 100, 'meter stays within 0..100');
      ok(M.matchPercent(M.cx(0, 0), t) <= p, 'the meter never reads higher away from the goal');
      seen.add(`${t.z.re},${t.z.im}|${t.w.re},${t.w.im}`);
      prev = t;
    }
    ok(seen.size >= 8, `targets vary (${seen.size} distinct posted)`);
  }

  /* === 8. THE LESSON — shape of the staged steps ======================== */
  {
    ok(M.STEPS.length >= 6, 'the lesson has at least six steps');
    ok(M.STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
    ok(M.STEPS[M.STEPS.length - 1].calib === true, 'the calibration is last');
    for (const s of M.STEPS) {
      ok(typeof s.title === 'string' && s.title.length > 0, 'every step is titled');
      ok(typeof s.body === 'string' && s.body.length > 40, `every step explains itself (${s.title})`);
      ok(Number.isInteger(s.unlock) && s.unlock >= 1 && s.unlock <= M.DIALS.length,
        `unlock count is a real dial count (${s.title})`);
      if (!s.calib) {
        ok(Array.isArray(s.choices) && s.choices.length === 3, `three choices (${s.title})`);
        ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < 3, `answer indexes a choice (${s.title})`);
        ok(typeof s.feedback === 'string' && s.feedback.length > 40, `feedback explains (${s.title})`);
      }
    }
    ok(M.DIALS.length === 4, 'four dials: the two parts of z and the two of w');
    ok(M.DIALS.every((d) => Number.isInteger(d.min) && Number.isInteger(d.max) && d.step === 1),
      'every dial is an integer dial — the lattice is the point');
    ok(M.normSq(M.cx(M.START.a, M.START.b)) === 25, 'the opening arm 3+4i has |z|² = 25, an exact modulus');
  }

  /* === 9. DISTINCTNESS — the ×i press mechanic belongs to ComplexPlaneLab  */
  {
    ok(!/press(es|Count)?\s*[:=]/.test(MODEL_BODY), 'no ×i press counter — that is ComplexPlaneLab');
    ok(!/timesI|mulByI|rotateQuarter/.test(MODEL_BODY), 'no quarter-turn operator — that is ComplexPlaneLab');
    for (const own of ['conjC', 'normSq', 'quotient', 'argDeg', 'midpointDoubled']) {
      ok(MODEL_BODY.includes(own), `the model names its own idea: ${own}`);
    }
  }

  return { checks, failures };
}

const MUTANTS = [
  ['the conjugate forgets to flip the sign (z·z̄ stops being real)',
    'const conjC = (z) => cx(z.re, -z.im);', 'const conjC = (z) => cx(z.re, z.im);'],
  ['the modulus subtracts instead of adding',
    'const normSq = (z) => z.re * z.re + z.im * z.im;', 'const normSq = (z) => z.re * z.re - z.im * z.im;'],
  ['division multiplies by the conjugate of the TOP instead of the bottom',
    'const num = mulC(z, conjC(w));', 'const num = mulC(conjC(z), w);'],
  ['the quotient fraction stops reducing',
    'const g = gcdI(nn, dd) || 1;', 'const g = 1;'],
  ['the lattice test accepts any quotient',
    'const quotientIsLattice = (q) => q != null && fracIsInt(q.re) && fracIsInt(q.im);',
    'const quotientIsLattice = (q) => q != null;'],
  ['the product identity compares |zw|² with |z|² + |w|²',
    'const rhs = normSq(z) * normSq(w);', 'const rhs = normSq(z) + normSq(w);'],
  ['the argument stops wrapping into [0,360)',
    'return d < 0 ? d + 360 : d;', 'return d;'],
  ['an exact 45° is claimed for every arm off the axes',
    'if (Math.abs(re) === Math.abs(im)) {', 'if (Math.abs(re) >= 0) {'],
  ['distance ADDS the two points instead of subtracting',
    'const distSq = (z, w) => normSq(subC(z, w));', 'const distSq = (z, w) => normSq(addC(z, w));'],
  ['the stamp goes fuzzy',
    'const isCalibrated = (z, target) => z.re === target.z.re && z.im === target.z.im;',
    'const isCalibrated = (z, target) => distSq(z, target.z) <= 2;'],
  ['makeTarget posts a target that is not q·w',
    'const z = mulC(q, w); // the arm the student must build',
    'const z = addC(q, w); // the arm the student must build'],
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
console.log('audit-complexarithmetic — ComplexArithmeticLab.jsx  (sliced, not mirrored)');
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
