/* ============================================================================
   audit-closure.mjs — the numeric audit for ClosureLab.jsx (N-RN.B.3).
   Run:  node audit-closure.mjs

   Slices the pure model out of ClosureLab.jsx (MODEL:START/END) and evaluates
   it, so the code under test is the code that ships.

   What it proves, exhaustively over every pair of numbers the dials can build:
     FRACTIONS    every part is reduced with a positive denominator.
     FIELD        ℚ(√2) arithmetic is right: addN and mulN match the algebraic
                  formulas, AND — an independent cross-check — their exact
                  results agree with ordinary floating-point arithmetic on the
                  decimal shadows. Two different routes, same answer.
     CLASSIFY     isRational is exactly "the √2 part is zero" — never a decimal
                  comparison — and no number is both or neither.
     N-RN.3       the three claims of the standard, checked on every pair:
                    rational + rational  → always rational
                    rational + irrational → always IRRATIONAL
                    (nonzero rational) × irrational → always IRRATIONAL
                  plus the fine print the standard depends on:
                    ZERO × irrational → rational (the one escape)
                    irrational + irrational → BOTH outcomes really occur
     ESCAPE       the witness (r + x) − x recovers r exactly, and the sum is
                  never rational — the contradiction the lesson rests on.
     CALIBRATION  every posted x is irrational, every target rational, the
                  required y is on the dials and lands exactly, and the stamp
                  refuses every near miss on either component.
     DISTINCTNESS √2's own irrationality proof (IrrationalLab's) is grepped OUT,
                  and no classification is ever made from a decimal.
   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./ClosureLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in ClosureLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'DIAL_MIN', 'DIAL_MAX', 'ROOT2', 'gcdI', 'frac', 'addF', 'subF', 'mulF', 'isZeroF', 'eqF', 'valF',
  'fracString', 'num', 'fromDial', 'isRational', 'isIrrational', 'addN', 'subN', 'mulN', 'eqN',
  'decimal', 'numString', 'escapeWitness', 'classify', 'DIALS', 'START', 'makeTarget',
  'isCalibrated', 'matchPercent', 'STEPS',
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
  const near = (a, b, tol) => Math.abs(a - b) < (tol == null ? 1e-9 : tol);

  /* every number the dials can build */
  const NUMS = [];
  for (let ka = M.DIAL_MIN; ka <= M.DIAL_MAX; ka++)
    for (let kb = M.DIAL_MIN; kb <= M.DIAL_MAX; kb++) NUMS.push({ ka, kb, z: M.fromDial(ka, kb) });

  /* === 1. FRACTIONS ===================================================== */
  for (const { z } of NUMS) {
    for (const f of [z.a, z.b]) {
      ok(f.d > 0, 'fraction denominator is positive');
      ok(M.gcdI(f.n, f.d) === 1 || f.n === 0, `fraction reduced (${f.n}/${f.d})`);
    }
  }
  ok(M.frac(1, 0) === null, 'a zero denominator is refused');
  ok(M.fracString(M.frac(4, 2)) === '2', 'an integer prints without a denominator');
  ok(M.fracString(M.frac(3, 2)) === '3/2', 'a half prints as a fraction, not a decimal');

  /* === 2. CLASSIFY — the test is the √2 part, exactly =================== */
  for (const { kb, z } of NUMS) {
    ok(M.isRational(z) === (kb === 0), `rational iff the √2 dial is 0 (kb=${kb})`);
    ok(M.isIrrational(z) === !M.isRational(z), 'a number is rational or irrational, never both');
  }

  /* === 3. FIELD — exact arithmetic, cross-checked against floating point = */
  const SAMPLE = NUMS.filter((_, i) => i % 7 === 0);
  for (const { z } of SAMPLE) for (const { z: w } of SAMPLE) {
    const s = M.addN(z, w), p = M.mulN(z, w);
    // the algebraic formulas
    ok(near(M.valF(s.a), M.valF(z.a) + M.valF(w.a)), 'sum: rational parts add');
    ok(near(M.valF(s.b), M.valF(z.b) + M.valF(w.b)), 'sum: √2 parts add');
    ok(near(M.valF(p.a), M.valF(z.a) * M.valF(w.a) + 2 * M.valF(z.b) * M.valF(w.b)),
      'product: rational part is a₁a₂ + 2b₁b₂');
    ok(near(M.valF(p.b), M.valF(z.a) * M.valF(w.b) + M.valF(z.b) * M.valF(w.a)),
      'product: √2 part is a₁b₂ + a₂b₁');
    // the independent route: exact result vs plain floating-point arithmetic
    ok(near(M.decimal(s), M.decimal(z) + M.decimal(w), 1e-9), 'the exact sum agrees with float addition');
    ok(near(M.decimal(p), M.decimal(z) * M.decimal(w), 1e-8), 'the exact product agrees with float multiplication');
    // subtraction undoes addition, exactly
    ok(M.eqN(M.subN(M.addN(z, w), w), z), 'subtraction exactly undoes addition');
  }

  /* === 4. N-RN.3 — the three claims, on EVERY pair ===================== */
  let sawIrrPlusIrrRational = false, sawIrrPlusIrrIrrational = false;
  for (const { z } of NUMS) for (const { z: w } of NUMS) {
    const sum = M.addN(z, w), prod = M.mulN(z, w);
    const zr = M.isRational(z), wr = M.isRational(w);

    if (zr && wr) {
      ok(M.isRational(sum), 'rational + rational is rational');
      ok(M.isRational(prod), 'rational × rational is rational');
    }
    if (zr !== wr) {
      // exactly one is rational — the standard's headline case
      ok(M.isIrrational(sum), `rational + irrational is IRRATIONAL (${M.numString(z)} + ${M.numString(w)})`);
      const rat = zr ? z : w;
      if (!M.isZeroF(rat.a)) {
        ok(M.isIrrational(prod),
          `nonzero rational × irrational is IRRATIONAL (${M.numString(z)} × ${M.numString(w)})`);
      } else {
        // the fine print: zero collapses it into the rational bin
        ok(M.isRational(prod), 'ZERO × irrational is rational — the one escape');
      }
    }
    if (!zr && !wr) {
      if (M.isRational(sum)) sawIrrPlusIrrRational = true; else sawIrrPlusIrrIrrational = true;
    }
  }
  ok(sawIrrPlusIrrRational, 'irrational + irrational CAN be rational (√2 + (−√2) = 0)');
  ok(sawIrrPlusIrrIrrational, 'irrational + irrational CAN be irrational — so there is no theorem there');

  /* === 5. ESCAPE — the contradiction the lesson rests on ================ */
  for (const { z: r } of NUMS) for (const { z: x } of SAMPLE) {
    const wit = M.escapeWitness(r, x);
    if (!M.isRational(r) || !M.isIrrational(x)) { ok(wit === null, 'the witness refuses the wrong shapes'); continue; }
    ok(wit.recoveredIsX, 'the witness recovers x exactly: (r + x) − r = x');
    ok(M.eqN(wit.recovered, x), 'and it is x on the nose, in exact form');
    ok(wit.sumWouldBeRational === false, 'the sum is never rational — that IS the theorem');
    ok(M.isIrrational(wit.sum), 'the sum lands in the irrational bin');
  }

  /* === 6. CALIBRATION =================================================== */
  {
    const rnd = lcg(20260725);
    let prev = null; const seen = new Set();
    for (let i = 0; i < 3000; i++) {
      const t = M.makeTarget(prev, rnd);
      ok(M.isIrrational(t.x), 'the posted x is irrational — otherwise there is nothing to escape');
      ok(M.isRational(t.target), 'the posted target is rational');
      ok(t.kb !== 0, 'the posted x really has a √2 part');
      ok(M.eqN(M.addN(t.x, t.y), t.target), 'the intended y lands exactly on the target');
      ok(M.isIrrational(t.y), 'the only y that works is itself irrational — the lesson');
      // reachable on the dials
      ok(t.y.a.d === 1 || t.y.a.d === 2, 'the required y is a dial value (halves)');
      ok(t.y.b.d === 1 || t.y.b.d === 2, 'the required y √2 part is a dial value (halves)');
      // the stamp
      ok(M.isCalibrated(t.y, t) === true, 'the stamp fires on the exact y');
      ok(M.isCalibrated(M.addN(t.y, M.fromDial(1, 0)), t) === false, 'a rational-part miss does NOT stamp');
      ok(M.isCalibrated(M.addN(t.y, M.fromDial(0, 1)), t) === false, 'a √2-part miss does NOT stamp');
      ok(M.isCalibrated(M.fromDial(0, 0), t) === false, 'doing nothing does not stamp');
      // the meter
      const p = M.matchPercent(t.y, t);
      ok(p >= 99.999, 'the meter is full at the exact y');
      ok(M.matchPercent(M.fromDial(0, 0), t) <= p, 'the meter never reads higher away from the goal');
      seen.add(`${t.ka},${t.kb},${t.kt}`);
      prev = t;
    }
    ok(seen.size >= 20, `targets vary (${seen.size} distinct posted)`);
  }

  /* === 7. THE LESSON ==================================================== */
  {
    ok(M.STEPS.length >= 5, 'the lesson has at least five steps');
    ok(M.STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
    ok(M.STEPS[M.STEPS.length - 1].calib === true, 'the calibration is last');
    for (const s of M.STEPS) {
      ok(typeof s.title === 'string' && s.title.length > 0, 'every step is titled');
      ok(typeof s.body === 'string' && s.body.length > 40, `every step explains itself (${s.title})`);
      ok(Number.isInteger(s.unlock) && s.unlock >= 1 && s.unlock <= M.DIALS.length, `unlock is real (${s.title})`);
      if (!s.calib) {
        ok(Array.isArray(s.choices) && s.choices.length === 3, `three choices (${s.title})`);
        ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < 3, `answer indexes a choice (${s.title})`);
        ok(typeof s.feedback === 'string' && s.feedback.length > 40, `feedback explains (${s.title})`);
      }
    }
    ok(M.DIALS.length === 4, 'four dials: both parts of x and both parts of y');
    // the lesson must cover the zero-factor fine print somewhere
    ok(M.STEPS.some((s) => /nonzero|NONZERO/.test(s.body + (s.feedback || ''))),
      'the lesson says why the rational factor must be nonzero');
    // and the boundary case
    ok(M.STEPS.some((s) => s.focus === 'both'), 'the lesson has the irrational + irrational step');
  }

  /* === 8. DISTINCTNESS ================================================== */
  {
    /* Distinctness is a STRUCTURAL property, not a vocabulary one. Banning
       words like "proof" fails here: the lesson must be free to CITE
       IrrationalLab ("IrrationalLab proved √2 cannot be written p/q") in order
       to take that result as given — citation is how the library's benches
       stay distinct without pretending their siblings do not exist. Three
       earlier benches in this batch tripped exactly this mistake, so the test
       below asks what the code DOES, not what the prose says.
       What must be absent is the machinery of the √2 proof itself: a parity
       argument on a p/q representation. */
    ok(!/%\s*2\b/.test(MODEL_BODY),
      'no parity argument — √2’s own irrationality proof belongs to IrrationalLab');
    ok(!/\bMath\.sqrt\s*\(/.test(MODEL_BODY),
      'the model never takes a square root — irrationality is given, not computed');
    ok(!/decimal\([^)]*\)\s*[<>=]/.test(MODEL_BODY),
      'no classification is ever made by comparing decimals');
    ok(/const isRational = \(z\) => isZeroF\(z\.b\);/.test(MODEL_BODY),
      'rationality is decided by the exact √2 part, and only that');
    for (const own of ['escapeWitness', 'addN', 'mulN', 'isRational']) {
      ok(MODEL_BODY.includes(own), `the model names its own idea: ${own}`);
    }
  }

  return { checks, failures };
}

const MUTANTS = [
  ['the √2 parts stop adding (sums silently become rational)',
    'const addN = (z, w) => num(addF(z.a, w.a), addF(z.b, w.b));',
    'const addN = (z, w) => num(addF(z.a, w.a), frac(0, 1));'],
  ['the product drops the 2 in a₁a₂ + 2b₁b₂ (√2·√2 = 1)',
    'addF(mulF(z.a, w.a), mulF(frac(2, 1), mulF(z.b, w.b))),',
    'addF(mulF(z.a, w.a), mulF(frac(1, 1), mulF(z.b, w.b))),'],
  ['the product’s √2 part loses a cross term',
    'addF(mulF(z.a, w.b), mulF(z.b, w.a))',
    'mulF(z.a, w.b)'],
  ['rationality is decided by the rational part instead of the √2 part',
    'const isRational = (z) => isZeroF(z.b);', 'const isRational = (z) => isZeroF(z.a);'],
  ['fractions stop reducing',
    'const g = gcdI(nn, dd) || 1;', 'const g = 1;'],
  ['subtraction adds instead',
    'const subF = (p, q) => frac(p.n * q.d - q.n * p.d, p.d * q.d);',
    'const subF = (p, q) => frac(p.n * q.d + q.n * p.d, p.d * q.d);'],
  ['the escape witness reports the sum as rational (the theorem inverts)',
    'sumWouldBeRational: isRational(s), // must be false — that is the theorem',
    'sumWouldBeRational: true, //'],
  ['the escape witness stops recovering x',
    'const back = subN(s, r);          // = x, always', 'const back = subN(s, s);          //'],
  ['the stamp goes fuzzy (compares decimals)',
    'return eqN(addN(target.x, y), target.target);',
    'return Math.abs(decimal(addN(target.x, y)) - decimal(target.target)) < 0.4;'],
  ['makeTarget posts a RATIONAL x (nothing to escape)',
    'if (kb === 0) continue;                       // x must be irrational', 'if (false) continue;'],
  ['makeTarget posts a y that does not cancel the √2',
    'const kcNeeded = kt - ka, kdNeeded = -kb;', 'const kcNeeded = kt - ka, kdNeeded = kb;'],
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
console.log('audit-closure — ClosureLab.jsx  (sliced, not mirrored)');
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
