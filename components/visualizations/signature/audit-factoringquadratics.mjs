/* ============================================================================
   audit-factoringquadratics.mjs — a numeric audit of FactoringQuadraticsLab.

   Run:  node audit-factoringquadratics.mjs

   THE MODEL IS EXTRACTED STRAIGHT OUT OF THE SHIPPED .jsx (PrimeNumbersLab's
   trick) — we slice the source between the palette and the STEPS array and
   evaluate it. So this audit tests the code that actually ships, not a copy
   that can silently drift away from it.

   The load-bearing checks, in order of how much they would hurt if wrong:
     1. THE THEOREM. factors over ℤ  ⟺  Δ = b² − 4c is a perfect square.
        Checked over every (b, c) the dials can reach. This is the claim the
        lesson's hardest step makes, and the one textbooks get wrong by saying
        "Δ > 0 ⇒ it factors".
     2. COMPLETENESS. factorPairsOf(c) is exactly the set of integer pairs that
        multiply to c — verified against an independent brute-force search. The
        centerpiece's whole argument ("nothing lands ⇒ nothing CAN") is void if
        the ladder can miss a candidate.
     3. UNIQUENESS. No two rungs share a sum, so at most one rung can ever light.
     4. NO FALSE STAMP. Exhaustive + adversarial + random-walk simulation of the
        hunt: `found` is always a subset of the true winners, so reaching the
        total is possible only by genuinely finding them all.
     5. The drawn/stated arithmetic: expansion, zeros, sign rules, formatting.
     6. SOURCE GATES: the facts panel must not print the answer during the hunt,
        and each dial's unlock index must agree with its step's own text.
   ========================================================================== */

import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('./FactoringQuadraticsLab.jsx', import.meta.url), 'utf8');

/* ---- extract the shipped model ------------------------------------------ */
const from = SRC.indexOf('const CURVE = ');
const to = SRC.indexOf('const STEPS');
if (from < 0 || to < 0 || to <= from) {
  console.error('FATAL: could not locate the model section in FactoringQuadraticsLab.jsx');
  process.exit(1);
}
const modelSrc = SRC.slice(from, to);
const M = new Function(
  modelSrc +
    '\nreturn { factorPairsOf, findPair, disc, isqrt, isPerfectSquare, evalQuad, fmt,' +
    ' quadString, factorString, pairLabel, validBs, makeTarget, CALIB_TARGETS,' +
    ' PARAMS, START, B_MIN, B_MAX, C_MIN, C_MAX };'
)();

const {
  factorPairsOf,
  findPair,
  disc,
  isqrt,
  isPerfectSquare,
  evalQuad,
  fmt,
  quadString,
  factorString,
  pairLabel,
  validBs,
  makeTarget,
  CALIB_TARGETS,
  PARAMS,
  START,
  B_MIN,
  B_MAX,
  C_MIN,
  C_MAX,
} = M;

/* ---- harness ------------------------------------------------------------ */
let checks = 0;
let fails = 0;
const failMsgs = [];
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (failMsgs.length < 25) failMsgs.push(msg);
  }
}
function eq(a, b, msg) {
  ok(a === b, `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
}
function section(name) {
  process.stdout.write(`\n  ${name}\n`);
}

const CS = []; // every legal c
for (let c = C_MIN; c <= C_MAX; c++) if (c !== 0) CS.push(c);

/* ============================================================================
   1. factorPairsOf — correctness, COMPLETENESS, ordering, uniqueness of sums
   ========================================================================== */
section('factorPairsOf: correctness, completeness, ordering, sum-uniqueness');
for (const c of CS) {
  const rows = factorPairsOf(c);

  // independent brute-force: every ordered divisor p of c, paired with c/p
  const brute = new Set();
  for (let p = -Math.abs(c); p <= Math.abs(c); p++) {
    if (p === 0) continue;
    if (c % p !== 0) continue;
    const q = c / p;
    const lo = Math.min(p, q);
    const hi = Math.max(p, q);
    brute.add(lo + ',' + hi);
  }
  const got = new Set(rows.map(([p, q]) => p + ',' + q));
  eq(got.size, rows.length, `c=${c}: factorPairsOf returned duplicates`);
  eq(
    [...got].sort().join('|'),
    [...brute].sort().join('|'),
    `c=${c}: ladder is not exactly the set of integer pairs multiplying to c`
  );

  for (const [p, q] of rows) {
    ok(Number.isInteger(p) && Number.isInteger(q), `c=${c}: non-integer rung ${p},${q}`);
    eq(p * q, c, `c=${c}: rung ${p}×${q} does not multiply to c`);
    ok(p <= q, `c=${c}: rung ${p},${q} is not in canonical p ≤ q order`);
    ok(p !== 0 && q !== 0, `c=${c}: rung contains a 0 factor (would print "(x + 0)")`);
  }

  // sorted by sum DESCENDING (the ladder's tips must staircase down the page)
  for (let i = 1; i < rows.length; i++) {
    const s0 = rows[i - 1][0] + rows[i - 1][1];
    const s1 = rows[i][0] + rows[i][1];
    ok(s0 > s1, `c=${c}: rungs not strictly sorted by descending sum (${s0} then ${s1})`);
  }

  // UNIQUENESS: p and q are the roots of t² − bt + c, so the multiset is
  // determined by (sum, product) — no two rungs may share a sum, or the
  // picture could light two rungs at once and the lab's claim would be false.
  const sums = rows.map(([p, q]) => p + q);
  eq(new Set(sums).size, sums.length, `c=${c}: two different rungs share a sum`);

  // REACHABILITY: every rung's sum must be attainable on the b dial, or the
  // ladder shows decoys that can never be won.
  for (const s of sums) {
    ok(s >= B_MIN && s <= B_MAX, `c=${c}: rung sum ${s} is outside the b dial's range`);
  }

  // the ladder is never empty for a legal c. (c = ±1 is the floor: c = 1 has
  // the two rungs 1×1 and −1×−1, while c = −1 has exactly one, −1×1, because
  // (−1, 1) and (1, −1) are the same unordered pair. Both are correct.)
  ok(rows.length >= 1, `c=${c}: ladder is empty`);
}
eq(factorPairsOf(1).length, 2, 'c=1 must have exactly 2 rungs (1×1 and −1×−1) — step 5 says so');
eq(factorPairsOf(-1).length, 1, 'c=−1 must have exactly 1 rung (−1×1 → x² − 1)');
// c = 0 is excluded precisely because its ladder would be infinite
eq(factorPairsOf(0).length, 0, 'factorPairsOf(0) must be empty (the ladder would be infinite)');

/* ============================================================================
   2. THE THEOREM — factors over ℤ ⟺ Δ = b² − 4c is a perfect square
   ========================================================================== */
section('THE THEOREM: factors over ℤ ⟺ Δ = b² − 4c is a perfect square');
let factorCount = 0;
let noFactorCount = 0;
let posDeltaNonSquare = 0;
for (const c of CS) {
  for (let b = B_MIN; b <= B_MAX; b++) {
    const pair = findPair(b, c);
    const D = disc(b, c);
    const k = isqrt(D);
    const sq = isPerfectSquare(D);

    ok(sq === (pair !== null), `b=${b},c=${c}: Δ=${D} perfect-square=${sq} but findPair=${JSON.stringify(pair)}`);

    if (pair) {
      factorCount++;
      const [p, q] = pair;
      eq(p + q, b, `b=${b},c=${c}: returned pair does not sum to b`);
      eq(p * q, c, `b=${b},c=${c}: returned pair does not multiply to c`);

      // the closed form: p, q = (b ∓ k)/2, and both are exactly integral
      ok(k >= 0, `b=${b},c=${c}: factors but Δ has no integer root`);
      eq((b - k) / 2, p, `b=${b},c=${c}: p ≠ (b − √Δ)/2`);
      eq((b + k) / 2, q, `b=${b},c=${c}: q ≠ (b + √Δ)/2`);
      // parity: k ≡ b (mod 2) always, which is WHY the halves land on integers
      eq(Math.abs(k % 2), Math.abs(b % 2), `b=${b},c=${c}: √Δ and b disagree in parity`);
      // the spread between the factors is exactly √Δ
      eq(q - p, k, `b=${b},c=${c}: q − p ≠ √Δ`);
    } else {
      noFactorCount++;
      // independent brute-force confirmation that NOTHING works — far beyond
      // the ladder's own range, so this does not just re-ask factorPairsOf.
      let found = null;
      for (let p = -260; p <= 260; p++) {
        if (p === 0) continue;
        if (c % p !== 0) continue;
        if (p + c / p === b) {
          found = [p, c / p];
          break;
        }
      }
      ok(found === null, `b=${b},c=${c}: findPair said no, but ${JSON.stringify(found)} works`);
      if (D > 0 && !sq) posDeltaNonSquare++;
    }
  }
}
ok(factorCount > 0 && noFactorCount > 0, 'the (b,c) grid must contain both factoring and non-factoring cases');
// The lesson's step-6 trap must actually exist in the reachable space: Δ > 0
// (real roots) yet NOT a perfect square (irrational roots ⇒ no integer factors).
ok(posDeltaNonSquare > 0, 'no reachable case has Δ > 0 but non-square — the step-6 trap would be vacuous');

/* ============================================================================
   3. Expansion identity, zeros, sign rules
   ========================================================================== */
section('expansion identity, zeros, sign rules');
for (const c of CS) {
  const rows = factorPairsOf(c);
  for (const [p, q] of rows) {
    const b = p + q;
    // (x + p)(x + q) === x² + (p+q)x + pq, as an IDENTITY — checked at many x,
    // including far outside anything the lab ever draws.
    for (const x of [-40, -12, -7, -3, -1, 0, 1, 2, 5, 9, 13, 40]) {
      eq(
        (x + p) * (x + q),
        evalQuad(b, c, x),
        `(x+${p})(x+${q}) ≠ x²+${b}x+${c} at x=${x}`
      );
    }
    // the zeros are −p and −q
    eq(evalQuad(b, c, -p), 0, `x=${-p} should be a zero of x²+${b}x+${c}`);
    eq(evalQuad(b, c, -q), 0, `x=${-q} should be a zero of x²+${b}x+${c}`);

    // SIGN RULES — the claim step 5 makes
    if (c > 0) {
      ok(Math.sign(p) === Math.sign(q), `c=${c}>0: rung ${p},${q} should share a sign`);
      ok(Math.sign(b) === Math.sign(p), `c=${c}>0: b's sign should tell which sign p,q have`);
    } else {
      ok(Math.sign(p) !== Math.sign(q), `c=${c}<0: rung ${p},${q} should have opposite signs`);
    }
  }
}

/* ============================================================================
   4. CALIBRATION — reachability and NO FALSE STAMP
   ========================================================================== */
section('calibration: reachability, exhaustive + adversarial + random no-false-stamp');
for (const t of CALIB_TARGETS) {
  ok(t >= C_MIN && t <= C_MAX && t !== 0, `target ${t} is outside the c dial's range`);
  const V = validBs(t);
  ok(V.length >= 3, `target ${t} has only ${V.length} winning b — too thin a hunt`);
  eq(new Set(V).size, V.length, `target ${t}: validBs contains duplicates`);
  for (let i = 1; i < V.length; i++) ok(V[i - 1] < V[i], `target ${t}: validBs not ascending`);

  // validBs is EXACTLY the set of b in range that factor — both directions
  for (let b = B_MIN; b <= B_MAX; b++) {
    const inV = V.includes(b);
    const f = findPair(b, t) !== null;
    ok(inV === f, `target ${t}, b=${b}: validBs says ${inV} but findPair says ${f}`);
  }

  // ADVERSARIAL: try to catch EVERY b in the whole range (the brute-force
  // sweeper). The catch gate must admit exactly the winners and nothing else.
  const found = [];
  for (let b = B_MIN; b <= B_MAX; b++) {
    if (findPair(b, t) && !found.includes(b)) found.push(b);
  }
  eq(
    found.slice().sort((m, n) => m - n).join(','),
    V.join(','),
    `target ${t}: an exhaustive sweep did not reproduce exactly validBs`
  );
  eq(found.length, V.length, `target ${t}: exhaustive sweep count ≠ total`);

  // RANDOM WALKS: found ⊆ validBs at every moment, and the stamp (found.length
  // === total) is reachable ONLY when found === validBs as a set.
  for (let trial = 0; trial < 400; trial++) {
    const f = [];
    for (let k = 0; k < 60; k++) {
      const b = B_MIN + Math.floor(Math.random() * (B_MAX - B_MIN + 1));
      if (findPair(b, t) && !f.includes(b)) f.push(b);
      // the invariant that makes the stamp sound
      ok(f.every((v) => V.includes(v)), `target ${t}: found escaped validBs`);
      eq(new Set(f).size, f.length, `target ${t}: found took a duplicate`);
      if (f.length === V.length) {
        eq(
          f.slice().sort((m, n) => m - n).join(','),
          V.join(','),
          `target ${t}: FALSE STAMP — reached the total without the right set`
        );
      }
      ok(f.length <= V.length, `target ${t}: found grew past the total`);
    }
  }
}
// makeTarget: always in the pool, never repeats the previous one
{
  let prev = null;
  for (let i = 0; i < 5000; i++) {
    const t = makeTarget(prev);
    ok(CALIB_TARGETS.includes(t), `makeTarget produced ${t}, which is not in the pool`);
    ok(t !== prev, `makeTarget repeated ${t}`);
    prev = t;
  }
}

/* ============================================================================
   5. Formatting — a lab must never print a malformed expression
   ========================================================================== */
section('formatting: quadString / factorString / pairLabel / fmt');
const MINUS = '−';
for (const c of CS) {
  for (let b = B_MIN; b <= B_MAX; b++) {
    const s = quadString(b, c);
    ok(!s.includes('+ -') && !s.includes('- -'), `quadString(${b},${c}) = "${s}" uses an ASCII hyphen`);
    ok(!s.includes(`+ ${MINUS}`) && !s.includes(`${MINUS} ${MINUS}`), `quadString(${b},${c}) = "${s}" prints a doubled sign`);
    ok(!/\b1x\b/.test(s), `quadString(${b},${c}) = "${s}" prints "1x" instead of "x"`);
    ok(!/[+−] 0\b/.test(s), `quadString(${b},${c}) = "${s}" prints a zero term`);
    ok(s.startsWith('x²'), `quadString(${b},${c}) = "${s}" does not start with x²`);
    // b = 0 ⇒ no x term at all; b ≠ 0 ⇒ exactly one
    eq(/x(?!²)/.test(s), b !== 0, `quadString(${b},${c}) = "${s}" mishandles b = ${b}`);

    const pair = findPair(b, c);
    if (pair) {
      const fs = factorString(pair[0], pair[1]);
      // NB: test for a zero FACTOR, i.e. "(x + 0)" — not for the substring
      // "0)", which legitimately ends every factor of 10, 20, …
      ok(!/[+−] 0\)/.test(fs), `factorString${JSON.stringify(pair)} = "${fs}" contains a zero factor`);
      ok(!fs.includes('--') && !fs.includes(`${MINUS}${MINUS}`), `factorString${JSON.stringify(pair)} = "${fs}" doubles a sign`);
      // a repeated factor must render as a square, not "(x+3)(x+3)"
      eq(
        fs.includes('²'),
        pair[0] === pair[1],
        `factorString${JSON.stringify(pair)} = "${fs}" mishandles the repeated-factor case`
      );
      const opens = (fs.match(/\(/g) || []).length;
      eq(opens, pair[0] === pair[1] ? 1 : 2, `factorString${JSON.stringify(pair)} = "${fs}" has the wrong bracket count`);
    }
  }
}
eq(fmt(-5), `${MINUS}5`, 'fmt must use the typographic minus');
eq(fmt(-0), '0', 'fmt must normalise negative zero');
eq(pairLabel(-4, -3), `${MINUS}4 × ${MINUS}3`, 'pairLabel formatting');
eq(quadString(1, 1), 'x² + x + 1', 'quadString drops the 1 coefficient');
eq(quadString(-1, -6), `x² ${MINUS} x ${MINUS} 6`, 'quadString handles b = −1');
eq(quadString(0, -9), `x² ${MINUS} 9`, 'quadString drops the x term when b = 0');
eq(factorString(3, 3), '(x + 3)²', 'factorString squares a repeated factor');
eq(factorString(-3, 2), `(x ${MINUS} 3)(x + 2)`, 'factorString signs');

/* ============================================================================
   6. SOURCE GATES — the two failure modes that only a source check can catch
   ========================================================================== */
section('source gates: the hunt must not print its own answer; unlocks match the step text');

// (a) Every fact that names the factorization must be gated on !calib. This is
//     PrimeNumbersLab's bug #3 — its facts panel printed the primes during the
//     prime hunt. Here the facts block and the equation head's factored span
//     are the two places that would give the answer away.
ok(/\{!calib && \(\s*<div className="facts">/.test(SRC), 'the FACTS panel is not gated on !calib — it would print the answer during the hunt');
ok(/\{!calib && factorable && \(/.test(SRC), 'the equation head\'s factored form is not gated on !calib');
ok(/const spoken = calib/.test(SRC), 'the spoken aria description is not gated on calib — a screen reader would hear the answer');
// the probe readout also expands a rung, so it must be gated too
ok(/\{!calib && \(\s*<div className=\{'probe'/.test(SRC), 'the probe readout is not gated on !calib');

// (a2) REGRESSION GUARD. Browser QA caught the "Check by expanding" fact
//      printing "x² − 1x − 6": it hand-rolled the coefficient formatting inline
//      in JSX instead of calling quadString, so it drifted from the formatter
//      this audit actually tests. Every rendered quadratic must go through
//      quadString, or the audit's formatting section is testing dead code.
{
  const factsBlock = SRC.slice(SRC.indexOf('<div className="facts">'), SRC.indexOf('</section>'));
  const start = factsBlock.indexOf('Check by expanding');
  ok(start >= 0, 'could not find the "Check by expanding" fact in the source');
  // bound the window to THIS fact — up to where the next one begins — rather
  // than a magic character count that a comment can silently push past
  const rest = factsBlock.slice(start);
  const end = rest.indexOf('fact-k', 10);
  const checkFact = end > 0 ? rest.slice(0, end) : rest;
  ok(
    /quadString\(/.test(checkFact),
    'the "Check by expanding" fact does not call quadString — it is hand-rolling the formatting again'
  );
  // no JSX may build "…}x " out of a raw coefficient expression
  ok(
    !/\{Math\.abs\([^)]*\)\}x/.test(SRC),
    'some JSX interpolates a raw coefficient directly before "x" — that is the "1x" bug'
  );
}

// (b) FactorLab's lesson: a dial's unlock index must agree with its step's own
//     text, or a step tells the student to use a dial that is still disabled.
const bParam = PARAMS.find((p) => p.key === 'b');
const cParam = PARAMS.find((p) => p.key === 'c');
eq(bParam.unlock, 2, 'the b dial should unlock at step index 2 ("The sum clue: b")');
eq(cParam.unlock, 3, 'the c dial should unlock at step index 3 ("Change c, rebuild the ladder")');
const stepsSrc = SRC.slice(SRC.indexOf('const STEPS'), SRC.indexOf('COMPONENT'));
const stepBodies = [...stepsSrc.matchAll(/title:\s*'([^']*)'[\s\S]*?body:\s*((?:\s*'[^']*'\s*\+?)+)/g)].map((m) => ({
  title: m[1],
  body: m[2].replace(/'\s*\+\s*'/g, '').replace(/'/g, ''),
}));
ok(stepBodies.length >= 7, 'could not parse the step bodies out of the source');
ok(/The b dial is live/.test(stepBodies[2].body), 'step index 2 must announce that the b dial is live');
ok(/the c dial unlocks/.test(stepBodies[3].body), 'step index 3 must announce that the c dial unlocks');
// c must never be dialable to 0 (the infinite-ladder case)
ok(/if \(v === 0\) v = c < 0 \? 1 : -1;/.test(SRC), 'the c dial does not skip 0 — the ladder would be infinite');
// START must be a genuinely factoring, factor-rich opening
ok(findPair(START.b, START.c) !== null, 'START does not factor');
eq(factorPairsOf(START.c).length, 6, 'START.c should give the full 6-rung ladder');

/* ============================================================================
   7. GOLDEN HAND-CHECKS — every concrete number the lesson says out loud
   ========================================================================== */
section('golden hand-checks: every number the lesson claims');
const g = (b, c) => {
  const p = findPair(b, c);
  return p ? factorString(p[0], p[1]) : null;
};
eq(g(7, 12), '(x + 3)(x + 4)', 'step 0/1: x² + 7x + 12 = (x + 3)(x + 4)');
eq(3 + 4, 7, 'step 0: 3 + 4 = 7');
eq(3 * 4, 12, 'step 0: 3 × 4 = 12');
eq(5 * 7, 35, 'step 1: 5 × 7 = 35 ≠ 12, so it is not a candidate');
ok(!factorPairsOf(12).some(([p, q]) => (p === 5 && q === 7) || (p === 7 && q === 5)), 'step 1: 5×7 must not be on c=12\'s ladder');
ok(factorPairsOf(12).some(([p, q]) => p === 3 && q === 4), 'step 1: 3×4 must be on c=12\'s ladder');
ok(factorPairsOf(12).some(([p, q]) => p === 2 && q === 6), 'step 1: 2×6 must be on c=12\'s ladder');
eq(5 + 7, 12, 'step 1: the distractor is real — 5 + 7 really does equal 12');
eq(g(8, 12), '(x + 2)(x + 6)', 'step 2: b=8, c=12 → (x + 2)(x + 6)');
eq(3 + 4, 7, 'step 2: the 3×4 rung now sums to 7, not 8');
eq(1 + 12, 13, 'step 2: the 1×12 rung sums to 13');
eq(factorPairsOf(5).length, 2, 'step 3: a prime c has a 2-rung ladder');
eq(validBs(5).join(','), '-6,6', 'step 3: c=5 factors only at b = ±6');
eq(g(-1, -6), `(x ${MINUS} 3)(x + 2)`, 'step 4: x² − x − 6 = (x − 3)(x + 2)');
eq(-3 * 2, -6, 'step 4: −3 × 2 = −6');
eq(-3 + 2, -1, 'step 4: −3 + 2 = −1');
eq(-3 * -2, 6, 'step 4: the distractor — two negatives multiply to +6, not −6');
eq(factorPairsOf(1).map(([p, q]) => p + q).join(','), '2,-2', 'step 5: c=1 has rungs summing to 2 and −2');
eq(g(1, 1), null, 'step 5: x² + x + 1 does not factor');
eq(disc(1, 1), -3, 'step 5: Δ = 1 − 4 = −3');
eq(disc(1, -1), 5, 'step 5: x² + x − 1 has Δ = 5');
ok(!isPerfectSquare(5), 'step 5: 5 is not a perfect square');
eq(g(1, -1), null, 'step 5: x² + x − 1 does not factor even though Δ = 5 > 0');
eq(disc(1, -6), 25, 'step 5: x² + x − 6 has Δ = 25');
ok(isPerfectSquare(25) && isqrt(25) === 5, 'step 5: 25 = 5²');
eq(g(1, -6), `(x ${MINUS} 2)(x + 3)`, 'step 5: x² + x − 6 factors');
eq(g(-5, 6), `(x ${MINUS} 3)(x ${MINUS} 2)`, 'step 6: x² − 5x + 6 = (x − 3)(x − 2)');
eq(-2 + -3, -5, 'step 6: −2 + −3 = −5');
eq(-2 * -3, 6, 'step 6: −2 × −3 = 6');
eq(2 + 3, 5, 'step 6: the distractor — 2 and 3 would factor x² + 5x + 6');
eq(g(5, 6), '(x + 2)(x + 3)', 'step 6: x² + 5x + 6 = (x + 2)(x + 3)');
// difference of squares and the perfect-square trinomial both fall out
eq(g(0, -9), `(x ${MINUS} 3)(x + 3)`, 'x² − 9 = (x − 3)(x + 3)');
eq(g(6, 9), '(x + 3)²', 'x² + 6x + 9 = (x + 3)²');
eq(disc(6, 9), 0, 'a perfect-square trinomial has Δ = 0');
eq(g(13, 12), '(x + 1)(x + 12)', 'b=13, c=12 → the extreme rung');
eq(g(-13, 12), `(x ${MINUS} 12)(x ${MINUS} 1)`, 'b=−13, c=12 → the extreme negative rung');
// the calibration's own headline claim
eq(validBs(12).join(','), '-13,-8,-7,7,8,13', 'c=12 factors at exactly 6 values of b');
eq(validBs(-12).join(','), '-11,-4,-1,1,4,11', 'c=−12 factors at exactly 6 values of b');
eq(validBs(-9).join(','), '-8,0,8', 'c=−9 factors at exactly 3 values of b (incl. b = 0)');
ok(validBs(12).length < B_MAX - B_MIN + 1, 'the scarcity claim: most b do not factor');

/* ---- report ------------------------------------------------------------- */
const pad = (n) => n.toLocaleString('en-US');
console.log('\n' + '='.repeat(74));
console.log(`  FactoringQuadraticsLab audit — ${pad(checks)} checks, ${pad(fails)} failures`);
console.log('='.repeat(74));
if (fails) {
  console.log('\n  FAILURES:');
  for (const m of failMsgs) console.log('   ✕ ' + m);
  if (fails > failMsgs.length) console.log(`   … and ${pad(fails - failMsgs.length)} more`);
  process.exit(1);
} else {
  console.log(`
  ✓ the ladder is exactly the set of integer pairs multiplying to c (brute-forced)
  ✓ no two rungs share a sum — at most one rung can ever light
  ✓ every rung's sum is reachable on the b dial — no decoys
  ✓ THE THEOREM: factors over ℤ ⟺ Δ = b² − 4c is a perfect square, over all
    ${pad(CS.length * (B_MAX - B_MIN + 1))} reachable (b, c) — including ${pad(posDeltaNonSquare)} cases with Δ > 0 yet NO
    integer factorization (the trap step 6 exists to teach)
  ✓ ${pad(factorCount)} factoring cases verified against the closed form (b ± √Δ)/2, and all
    ${pad(noFactorCount)} non-factoring cases confirmed by an independent brute-force search
  ✓ (x+p)(x+q) ≡ x² + (p+q)x + pq as an identity; zeros at −p, −q; sign rules hold
  ✓ the hunt cannot false-stamp: found ⊆ validBs under exhaustive, adversarial
    and ${pad(CALIB_TARGETS.length * 400)} random walks
  ✓ no malformed output: no "1x", no "+ 0", no "(x + 0)", no doubled signs
  ✓ the facts panel, equation head, probe and aria label are all gated on !calib
  ✓ each dial's unlock index agrees with its own step's text
`);
}
