/* ============================================================================
   audit-distributive.mjs — numeric audit for DistributiveLab.jsx
   Run:  node audit-distributive.mjs

   Every mathematical claim the lab makes on screen is re-derived here from an
   independent definition and checked exhaustively over the full dial space
   (a, b, c ∈ 1..12 → 1,728 states), plus every calibration target.

   Two things this audit is specifically responsible for, because they are the
   places a K-12 lab can lie to a child without anyone noticing:

     1. THE STAMP CANNOT FIRE FALSELY. calibScore reaching 100 must be
        equivalent to a genuinely complete factoring — proven by brute force
        over all 1,728 × 14 (state, target) pairs against an independent
        definition of "complete", not by trusting the scoring code's own logic.

     2. THE LESSON PROSE IS ARITHMETIC, NOT DECORATION. Every number quoted in
        a step's question, choices or feedback — including the wrong answers —
        is recomputed. A distractor that does not actually equal the mistake it
        claims to model is a bug: it teaches the child that their reasoning was
        wrong when in fact their arithmetic was right.
   ========================================================================== */

import { readFileSync } from 'node:fs';

let checks = 0;
let fails = 0;
const failures = [];

function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (failures.length < 25) failures.push(msg);
  }
}
function eq(actual, expected, msg) {
  ok(Object.is(actual, expected), `${msg} — got ${actual}, expected ${expected}`);
}

/* ---------------------------------------------------------------------------
   The lab's model, mirrored. These four lines are the entire mathematical
   content of DistributiveLab.jsx; if they are right and the render reads them,
   the lab is right.
   ------------------------------------------------------------------------- */
function gcd(m, n) {
  m = Math.abs(m);
  n = Math.abs(n);
  while (n) {
    const t = m % n;
    m = n;
    n = t;
  }
  return m;
}
const whole = (a, b, c) => a * (b + c);
const parts = (a, b, c) => a * b + a * c;
const slip = (a, b, c) => a * b + c;
const missed = (a, c) => c * (a - 1);

const AMAX = 12;
const BMAX = 12;
const CMAX = 12;

const TARGETS = [
  [12, 16], [12, 20], [20, 24], [12, 30], [18, 24], [24, 30], [30, 36],
  [16, 24], [24, 40], [40, 48], [18, 27], [27, 36], [20, 30], [30, 40],
  [24, 36], [36, 48], [60, 72],
];

function scoreOrder(a, b, c, p, q) {
  const m1 = a * b === p;
  const m2 = a * c === q;
  const complete = m1 && m2 && gcd(b, c) === 1;
  let v = 0;
  if (m1) v += 40;
  if (m2) v += 40;
  if (complete) v += 20;
  return { v, m1, m2, complete };
}
function calibScore(a, b, c, T1, T2) {
  const s = scoreOrder(a, b, c, T1, T2);
  const w = scoreOrder(a, b, c, T2, T1);
  return w.v > s.v ? { ...w, swapped: true } : { ...s, swapped: false };
}

const GAP = 1.5;
const PAD_L = 74;
const PAD_R = 30;
const PAD_Y = 62;
function computeLayout(W, H, a, b, c, sep) {
  const fitW = Math.max(10, W - PAD_L - PAD_R);
  const fitH = Math.max(10, H - 2 * PAD_Y);
  const cellMax = Math.min(W, H) / 6;
  const cell = Math.min(fitW / (b + c + GAP), fitH / a, cellMax);
  const g = sep * GAP;
  const ox = PAD_L + (fitW - (b + c + g) * cell) / 2;
  const oy = (H - a * cell) / 2;
  return { cell, ox, oy, g };
}
const coef = (n) => (n === 1 ? 'x' : `${n}x`);

/* ===========================================================================
   1. THE LAW ITSELF — a(b+c) = ab + ac, exhaustively, in exact integers.
   ========================================================================= */
console.log('1. the distributive law over the whole dial space');
for (let a = 1; a <= AMAX; a++) {
  for (let b = 1; b <= BMAX; b++) {
    for (let c = 1; c <= CMAX; c++) {
      ok(whole(a, b, c) === parts(a, b, c), `law broke at a=${a} b=${b} c=${c}`);
      // and it is genuinely integer arithmetic — no float crept in anywhere
      ok(Number.isInteger(whole(a, b, c)), `non-integer whole at ${a},${b},${c}`);
      // the law is also symmetric in the two inside terms (b+c = c+b)
      ok(whole(a, b, c) === whole(a, c, b), `inside sum not symmetric at ${a},${b},${c}`);
    }
  }
}

/* ===========================================================================
   2. THE DUEL — the missed area is exactly c(a−1), and vanishes only at a = 1.
      This is the lab's headline claim on the duel step, so it is checked
      against the definition (whole − slip) rather than restated.
   ========================================================================= */
console.log('2. the reach duel: whole − slip = c(a − 1)');
for (let a = 1; a <= AMAX; a++) {
  for (let b = 1; b <= BMAX; b++) {
    for (let c = 1; c <= CMAX; c++) {
      eq(whole(a, b, c) - slip(a, b, c), missed(a, c), `missed area at a=${a} b=${b} c=${c}`);
      // the slip never overshoots: with c ≥ 1 and a ≥ 1 it can only lose ground
      ok(slip(a, b, c) <= whole(a, b, c), `slip overshot at ${a},${b},${c}`);
      // the missed area does not depend on b at all — it is c(a−1), full stop
      eq(missed(a, c), whole(a, 1, c) - slip(a, 1, c), `missed depends on b at ${a},${b},${c}`);
      // zero ⟺ a = 1 (the teaching point: the slip hides exactly where
      // multiplying does nothing)
      eq(missed(a, c) === 0, a === 1, `missed-is-zero ⟺ a=1 failed at a=${a} c=${c}`);
    }
  }
}
// the duel's drawn decomposition: one paid row of c + (a−1) missed rows = a·c
for (let a = 1; a <= AMAX; a++) {
  for (let c = 1; c <= CMAX; c++) {
    eq(c + missed(a, c), a * c, `duel tile decomposition at a=${a} c=${c}`);
  }
}

/* ===========================================================================
   3. gcd — checked against a brute-force divisor scan, since the calibration
      gate rests entirely on it.
   ========================================================================= */
console.log('3. gcd against brute force');
function gcdBrute(m, n) {
  let g = 1;
  for (let d = 1; d <= Math.min(m, n); d++) if (m % d === 0 && n % d === 0) g = d;
  return g;
}
for (let m = 1; m <= 100; m++) {
  for (let n = 1; n <= 100; n++) {
    eq(gcd(m, n), gcdBrute(m, n), `gcd(${m},${n})`);
  }
}

/* ===========================================================================
   4. CALIBRATION — the stamp fires exactly on a complete factoring.

      Independent definition of the goal: (a,b,c) is a complete factoring of
      T1 + T2 iff, in one of the two readings, a·b and a·c are the two terms
      AND gcd(b,c) = 1. Swept by brute force over every reachable state.
   ========================================================================= */
console.log('4. calibration: exhaustive sweep, stamp soundness & uniqueness');
for (const [T1, T2] of TARGETS) {
  const g = gcd(T1, T2);
  const solutions = [];

  for (let a = 1; a <= AMAX; a++) {
    for (let b = 1; b <= BMAX; b++) {
      for (let c = 1; c <= CMAX; c++) {
        const s = calibScore(a, b, c, T1, T2);

        // independent truth
        const straight = a * b === T1 && a * c === T2 && gcd(b, c) === 1;
        const swapped = a * b === T2 && a * c === T1 && gcd(b, c) === 1;
        const isComplete = straight || swapped;

        // THE core property: 100% ⟺ complete factoring. No threshold, no float.
        eq(s.v === 100, isComplete, `stamp soundness at a=${a} b=${b} c=${c} for ${T1}+${T2}`);

        // the score is one of exactly five diagnostic values
        ok([0, 40, 80, 100].includes(s.v), `odd score ${s.v} at ${a},${b},${c}`);

        // 80 means "both terms right, but not completely factored" — the
        // partial-credit message the lab shows depends on this being true
        if (s.v === 80) {
          const bothStraight = a * b === T1 && a * c === T2;
          const bothSwapped = a * b === T2 && a * c === T1;
          ok(bothStraight || bothSwapped, `80% without both terms at ${a},${b},${c}`);
          ok(gcd(b, c) > 1, `80% but already coprime at ${a},${b},${c}`);
        }

        if (s.v === 100) solutions.push([a, b, c]);
      }
    }
  }

  // the complete factoring is reachable on the actual dial ranges
  ok(g <= AMAX, `target ${T1}+${T2}: gcf ${g} exceeds the a dial`);
  ok(T1 / g <= BMAX && T2 / g <= CMAX, `target ${T1}+${T2}: inside terms exceed the dials`);
  ok(Number.isInteger(T1 / g) && Number.isInteger(T2 / g), `target ${T1}+${T2}: gcf does not divide`);
  eq(gcd(T1 / g, T2 / g), 1, `target ${T1}+${T2}: reduced terms not coprime`);

  // every winning state uses a = gcf — the algebraic argument in the source
  // header (a | g and gcd(b,c) = g/a = 1 ⟹ a = g) made empirical
  for (const [a] of solutions) eq(a, g, `target ${T1}+${T2}: a solution had a=${a}, not the gcf ${g}`);

  // exactly the two orderings, no more
  eq(solutions.length, 2, `target ${T1}+${T2}: solution count`);

  // the opening state 1×(1+1) is never already solved, and scores zero
  const open = calibScore(1, 1, 1, T1, T2);
  eq(open.v, 0, `target ${T1}+${T2}: the reset state does not score 0`);

  /* The 80% state must be REACHABLE, not merely defined.

     This check earned its keep. The first draft of this audit only asserted
     "if a partial factoring fits the dials, it scores 80" — which passes
     vacuously when none fits, and it did not fit for 10 of the original 14
     targets. The lab shipped a capstone whose central teaching moment ("that
     IS a factoring, but a is not the greatest") was unreachable on 71% of its
     targets, and every check was green. Assert the existence, not just the
     property. */
  const partials = [];
  for (let d = 2; d < g; d++) {
    if (g % d !== 0) continue;
    if (T1 / d > BMAX || T2 / d > CMAX) continue; // a slider cannot go there
    partials.push(d);
    const s = calibScore(d, T1 / d, T2 / d, T1, T2);
    eq(s.v, 80, `target ${T1}+${T2}: partial factoring by ${d} should score 80`);
    ok(!s.complete, `target ${T1}+${T2}: partial by ${d} wrongly counted as complete`);
    ok(gcd(T1 / d, T2 / d) > 1, `target ${T1}+${T2}: partial by ${d} left nothing shareable`);
  }
  ok(
    partials.length >= 1,
    `target ${T1}+${T2}: NO reachable partial factoring — the 80% "not the greatest" state ` +
      `can never be shown, so this target cannot teach the standard it is drawn from`,
  );

  // A prime gcf makes that impossible in principle (the only other factoring is
  // the trivial a = 1), so every target's gcf must be composite.
  let composite = false;
  for (let d = 2; d < g; d++) if (g % d === 0) composite = true;
  ok(composite, `target ${T1}+${T2}: gcf ${g} is prime — no partial factoring exists at all`);
}

/* ===========================================================================
   4b. "New target" must never hand back an already-solved board.

   The button swaps the target but deliberately leaves the dials where they are
   (re-zeroing them mid-challenge would feel like a punishment). That is safe
   only if no solution of one target is also a solution of another. Because the
   scorer accepts either reading, a target that is the REVERSE of another would
   break exactly this — 12 + 16 and 16 + 12 share the solution 4(3 + 4), so a
   student who solved one would find the next already stamped.
   ========================================================================= */
console.log('4b. targets are pairwise non-interchangeable');
for (let i = 0; i < TARGETS.length; i++) {
  for (let j = 0; j < TARGETS.length; j++) {
    if (i === j) continue;
    const [p1, p2] = TARGETS[i];
    const [q1, q2] = TARGETS[j];
    ok(!(p1 === q1 && p2 === q2), `targets ${i} and ${j} are duplicates`);
    ok(!(p1 === q2 && p2 === q1), `target ${p1}+${p2} is the reverse of ${q1}+${q2}`);

    // and directly: solving i must not also solve j
    const g = gcd(p1, p2);
    const s = calibScore(g, p1 / g, p2 / g, q1, q2);
    ok(s.v < 100, `the solution to ${p1}+${p2} also stamps ${q1}+${q2}`);
  }
}
// makeTarget never returns the same target twice in a row, so the button always
// visibly does something
ok(TARGETS.length >= 2, 'need at least two targets for "New target" to differ');

/* ===========================================================================
   5. THE LESSON — every number in every step, including the distractors.
      A wrong answer that is arithmetically wrong about its own mistake
      punishes a child for reasoning correctly.
   ========================================================================= */
console.log('5. lesson prose arithmetic (correct answers AND distractors)');

// step 0 — meet a(b+c). START = 3 × (4 + 2)
eq(whole(3, 4, 2), 18, 'step 0: 3 × (4 + 2)');
eq(4 + 2, 6, 'step 0: the inside');
eq(slip(3, 4, 2), 14, 'step 0 choice B: 3 × 4 then add 2');
eq((3 + 4) * 2, 14, 'step 0 choice C: add 3 + 4 then times 2');

// step 1 — a = 5 with the inside (4 + 2)
eq(whole(5, 4, 2), 30, 'step 1: 5 × (4 + 2)');
eq(slip(5, 4, 2), 22, 'step 1 choice B: 5 × 4 then add 2 — the quoted 22');
eq(5 + 4 + 2, 11, 'step 1 choice C: 5 + 4 + 2');

// step 2 — a = 4, b = 7, c = 3
eq(whole(4, 7, 3), 40, 'step 2: 4 × (7 + 3)');
eq(7 + 3, 10, 'step 2: the inside');
eq(slip(4, 7, 3), 31, 'step 2 choice B: 4 × 7 then add 3 — the quoted 31');
eq(4 + 7 + 3, 14, 'step 2 choice C: 4 + 7 + 3');

// step 3 — the law on 6 × (5 + 3)
eq(whole(6, 5, 3), 48, 'step 3: 6 × (5 + 3) by adding first');
eq(parts(6, 5, 3), 48, 'step 3: 6×5 + 6×3 by multiplying first');
eq(6 * 5, 30, 'step 3: 6 × 5');
eq(6 * 3, 18, 'step 3: 6 × 3');
eq(30 + 18, 48, 'step 3: 30 + 18');
eq(slip(6, 5, 3), 33, 'step 3 choice B: 6×5 + 3 — the quoted 33');
eq(6 + 5 + 3, 14, 'step 3 choice C: 6 + 5 + 3');
// the mental-arithmetic example in the feedback
eq(6 * 48, 288, 'step 3 feedback: 6 × 48');
eq(6 * 40 + 6 * 8, 288, 'step 3 feedback: 6×40 + 6×8');
eq(6 * 40, 240, 'step 3 feedback: 6 × 40');
eq(6 * 8, 48, 'step 3 feedback: 6 × 8');

// step 4 — the duel on 5 × (3 + 2)
eq(whole(5, 3, 2), 25, 'step 4: 5 × (3 + 2) done properly');
eq(slip(5, 3, 2), 17, 'step 4: the slip 5×3 + 2');
eq(25 - 17, 8, 'step 4: the loss');
eq(missed(5, 2), 8, 'step 4: c(a−1) = 2 × 4');
eq(2 * (5 - 1), 8, 'step 4: the quoted 2 × 4');
eq(missed(1, 2), 0, 'step 4 feedback: the loss vanishes at a = 1');

// step 5 — factoring 7×4 + 7×9
eq(7 * 4 + 7 * 9, 91, 'step 5: 7×4 + 7×9');
eq(whole(7, 4, 9), 91, 'step 5: 7 × (4 + 9)');
eq(4 + 9, 13, 'step 5: the inside');
eq(7 * 13, 91, 'step 5: 7 × 13');
eq((7 + 7) * (4 + 9), 182, 'step 5 choice B: (7+7)(4+9) — the quoted 182');
eq(7 * 4 * 9, 252, 'step 5 choice C: 7 × 4 × 9 — the quoted 252');

// step 6 — the algebra lens, 3(x + 2)
eq(coef(3), '3x', 'step 6: coefficient formatting');
eq(coef(1), 'x', 'step 6: a coefficient of 1 is written bare');
eq(3 * 2, 6, 'step 6: 3(x + 2) = 3x + 6, the constant');
eq(whole(3, 1, 2), 9, 'step 6 feedback: 3(1 + 2) at x = 1');
eq(slip(3, 1, 2), 5, 'step 6 feedback: 3(1) + 2 at x = 1 — the quoted 5');
ok(whole(3, 1, 2) !== slip(3, 1, 2), 'step 6 feedback: the counterexample must actually differ');

/* ===========================================================================
   6. THE ALGEBRA LENS TABLE — the "equal at every x" claim, over every value
      the table can display for every dial state, including x = 0.
   ========================================================================= */
console.log('6. the algebra table: a(x+c) = ax + ac at every displayed x');
for (let a = 1; a <= AMAX; a++) {
  for (let c = 1; c <= CMAX; c++) {
    for (let b = 1; b <= BMAX; b++) {
      for (let k = -2; k <= 2; k++) {
        const v = b + k;
        if (v < 0) continue;
        eq(a * (v + c), a * v + a * c, `table row a=${a} x=${v} c=${c}`);
      }
    }
  }
}

/* ===========================================================================
   7. LAYOUT — the figure must never overflow the stage nor let the tiles
      overlap, at any dial setting, any separation, and any stage size the
      responsive CSS can produce (the stage is width ≤ 580 at aspect 7/5, and
      collapses to roughly 300 wide on a small phone).
   ========================================================================= */
console.log('7. layout: no overflow, no overlap, tiles keep their proportions');
/* Real measured sizes, not guesses. The stage is `width: min(100%, 580px)` at
   aspect-ratio 7/5, so on a 390px phone it measures 276×197 — smaller than any
   size a desk-check would think to try, and the tightest case for the bracket
   labels. Measured in-browser at 390px wide and pinned here. */
const STAGES = [
  [580, 414], // desktop, the capped maximum
  [520, 371],
  [460, 329],
  [360, 257],
  [276, 197], // measured: 390px phone, single-column
  [240, 171], // headroom below the narrowest real phone
  [700, 500], // a host that gives the lab more room than it asks for
];
for (const [W, H] of STAGES) {
  for (let a = 1; a <= AMAX; a++) {
    for (let b = 1; b <= BMAX; b++) {
      for (let c = 1; c <= CMAX; c++) {
        for (const sep of [0, 0.5, 1]) {
          const { cell, ox, oy, g } = computeLayout(W, H, a, b, c, sep);
          const leftL = ox;
          const leftR = ox + b * cell;
          const rightL = ox + (b + g) * cell;
          const rightR = ox + (b + g + c) * cell;

          ok(cell > 0, `non-positive cell at ${W}x${H} ${a},${b},${c}`);
          ok(leftL >= -0.01, `left tile off the left edge at ${W}x${H} ${a},${b},${c} sep=${sep}`);
          ok(rightR <= W + 0.01, `right tile off the right edge at ${W}x${H} ${a},${b},${c} sep=${sep}`);
          ok(oy >= -0.01 && oy + a * cell <= H + 0.01, `vertical overflow at ${W}x${H} ${a},${b},${c}`);
          ok(leftR <= rightL + 0.01, `tiles overlap at ${W}x${H} ${a},${b},${c} sep=${sep}`);

          // The LABELS must fit too, not just the tiles. This is the bug that
          // actually shipped in the first draft: the figure was centred with
          // symmetric padding, so once the tiles slid apart the "a = N" bracket
          // label ran off the left edge and rendered as "= N" — the lab quietly
          // stopped naming the very quantity the accent colour is reserved for.
          //   left:   the a-bracket sits at ox − 16, its label right-aligned
          //           ending at ox − 23, and mono 12.5px runs ~7.6px per char
          //           ("a = 12" is the widest at 6 chars).
          const aLabelW = 6 * 7.6;
          ok(ox - 16 >= 0, `a-bracket off the left edge at ${W}x${H} ${a},${b},${c} sep=${sep}`);
          ok(ox - 23 - aLabelW >= 0, `"a = N" label clipped at ${W}x${H} ${a},${b},${c} sep=${sep}`);
          //   bottom: the b/c brackets sit at py(0)+16 with labels ~14px below,
          //           and the b+c bracket 22px under those.
          const py0 = oy + a * cell;
          ok(py0 + 16 + 22 + 14 + 9 <= H + 0.01, `bottom brackets clipped at ${W}x${H} ${a},${b},${c}`);
          //   top:    the readout plate occupies y = 10..32 across the top-left
          ok(oy >= 34, `figure collides with the readout plate at ${W}x${H} ${a},${b},${c}`);

          // separation only slides the tiles; it must never resize them, or the
          // pull-apart would quietly undercut its own argument (that cutting
          // conserves area)
          const base = computeLayout(W, H, a, b, c, 0);
          ok(Math.abs(base.cell - cell) < 1e-9, `cell changed with sep at ${W}x${H} ${a},${b},${c}`);

          // the drawn areas are in exact proportion to the products
          const areaL = b * cell * (a * cell);
          const areaR = c * cell * (a * cell);
          const rel = Math.abs(areaL / (areaL + areaR) - (a * b) / (a * b + a * c));
          ok(rel < 1e-9, `tile areas out of proportion at ${a},${b},${c}`);
        }
      }
    }
  }
}

/* ===========================================================================
   8. SOURCE CONTRACTS — the drop-in guarantees the MAIS project depends on,
      read from the actual file rather than assumed.
   ========================================================================= */
console.log('8. source contracts (zero deps, client component, scoped styles)');
const src = readFileSync(new URL('./DistributiveLab.jsx', import.meta.url), 'utf8');
ok(src.startsWith("'use client';"), "the file must open with 'use client'");
const imports = [...src.matchAll(/^import\s.*?from\s+'([^']+)';/gm)].map((m) => m[1]);
eq(imports.length, 1, 'exactly one import');
eq(imports[0], 'react', 'the only import is react — zero external dependencies');
ok(/<style jsx>/.test(src), 'styles are scoped with styled-jsx');
ok(!/document\.querySelector|window\.\w+\s*=/.test(src), 'no global DOM reach-out');
ok(/export default function DistributiveLab/.test(src), 'default-exports DistributiveLab');
// the distractor numbers really are in the shipped file, not just in this audit
ok(/22 — 5 × 4, then add the 2/.test(src), 'step 1 distractor value present in source');
ok(/31 — 4 × 7, then add the 3/.test(src), 'step 2 distractor value present in source');
ok(/25 and 17/.test(src), 'step 4 duel values present in source');
// every target listed in the source is one this audit swept
const srcTargets = [...src.matchAll(/^\s*\[(\d+), (\d+)\],\s*\/\//gm)].map((m) => [+m[1], +m[2]]);
eq(srcTargets.length, TARGETS.length, 'audit and source agree on the target count');
for (let i = 0; i < srcTargets.length; i++) {
  ok(
    srcTargets[i][0] === TARGETS[i][0] && srcTargets[i][1] === TARGETS[i][1],
    `target ${i} differs between source and audit`,
  );
}
// and each source comment states the factoring the audit derived
for (const [T1, T2] of srcTargets) {
  const g = gcd(T1, T2);
  const re = new RegExp(`\\[${T1}, ${T2}\\],\\s*//\\s*${g}\\(${T1 / g} \\+ ${T2 / g}\\)`);
  ok(re.test(src), `source comment for ${T1}+${T2} should read ${g}(${T1 / g} + ${T2 / g})`);
}

/* ========================================================================= */
console.log('\n' + '='.repeat(58));
if (fails === 0) {
  console.log(`ALL PASS — ${checks.toLocaleString()} checks, 0 failures`);
} else {
  console.log(`${fails} FAILURE(S) out of ${checks.toLocaleString()} checks:\n`);
  for (const f of failures) console.log('  ✗ ' + f);
  process.exitCode = 1;
}
