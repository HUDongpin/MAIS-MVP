/* ============================================================================
   audit-exponentrules.mjs — numeric audit for ExponentRulesLab.jsx
   Run:  node audit-exponentrules.mjs

   This audit does NOT re-implement the lab's model and hope the copy matches.
   It slices the pure-math section straight out of the shipped .jsx and
   evaluates it, so every assertion below is made against the code that
   actually renders for a student. (That is also how the shipped calibration
   targets and lesson constants get checked — the trick that caught a wrong
   shipped answer in VarianceLab.)

   The reference it is checked AGAINST is deliberately independent: instead of
   doing exponent arithmetic, the reference builds the literal LIST of factors
   (how many b's above the bar, how many below), combines the lists the way the
   picture does — concatenate to multiply, flip to divide, replicate to raise —
   cancels them one for one, and multiplies the survivors out in BigInt. So the
   claim "b^m · b^n = b^(m+n)" is not assumed anywhere; it is re-derived from
   counting, 11,907 times, and compared.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, 'ExponentRulesLab.jsx'), 'utf8');

/* ---- load the SHIPPED model out of the .jsx -------------------------------
   Everything from the palette down to the component is React-free pure math
   and plain data, so it evaluates standalone in node. */
const start = SRC.indexOf("const CURVE = '#c81e4f'");
// NB: anchor on the real declaration — "export default function" also appears
// in the drop-in usage comment at the top of the file, above `start`.
const end = SRC.indexOf('export default function ExponentRulesLab(');
if (start < 0 || end <= start) throw new Error('could not locate the model section in ExponentRulesLab.jsx');
const MODEL_SRC = SRC.slice(start, end);

const LAB = new Function(
  MODEL_SRC +
    `; return { ratPowInt, ratPow, mulRat, divRat, makeRat, eqRat, bpow, resultExp, directValue,
                poolOf, cancelCount, survivors, group, fmtRat, digitCount, fmtExp, expSentence,
                expanded, solutionsFor, reachableWithOp, matchPercent, makeTarget, opUnlock,
                B_MIN, B_MAX, E_MIN, E_MAX, PARAMS, START, OPS, RULES, CALIB_TARGETS, CALIB_RESET,
                MATCH_SPAN, STEPS, MINUS, TIMES, CDOT, DIV };`
)();

const {
  ratPowInt, resultExp, directValue, poolOf, cancelCount, survivors,
  group, fmtRat, digitCount, fmtExp, expSentence, expanded,
  solutionsFor, reachableWithOp, matchPercent, makeTarget, opUnlock,
  B_MIN, B_MAX, E_MIN, E_MAX, PARAMS, START, OPS, RULES, CALIB_TARGETS, CALIB_RESET,
  MATCH_SPAN, STEPS, MINUS,
} = LAB;

/* ---- harness -------------------------------------------------------------- */
let checks = 0;
let fails = 0;
const failures = [];
function ok(cond, label) {
  checks++;
  if (!cond) {
    fails++;
    if (failures.length < 25) failures.push(label);
  }
}
function eq(a, b, label) {
  ok(a === b, `${label}  (got ${a}, want ${b})`);
}
const section = (t) => console.log(`\n── ${t}`);

/* ============================================================================
   THE INDEPENDENT REFERENCE — the picture, as arithmetic-free bookkeeping.
   A power is a bag of factors: `up` of them above the bar, `dn` below.
   ========================================================================== */
const listOf = (e) => ({ up: Math.max(e, 0), dn: Math.max(-e, 0) });
const flip = (L) => ({ up: L.dn, dn: L.up });
const concat = (A, B) => ({ up: A.up + B.up, dn: A.dn + B.dn });
const repeat = (L, k) => {
  let r = { up: 0, dn: 0 };
  for (let i = 0; i < k; i++) r = concat(r, L);
  return r;
};
const cancel = (L) => {
  const k = Math.min(L.up, L.dn);
  return { up: L.up - k, dn: L.dn - k, cancelled: k };
};
const net = (L) => L.up - L.dn;

// combine two powers the way the PICTURE does — no exponent arithmetic at all
function refList(op, m, n) {
  if (op === 'mul') return concat(listOf(m), listOf(n)); // couple the trains
  if (op === 'div') return concat(listOf(m), flip(listOf(n))); // flip, then couple
  // (b^m)^n — lay down |n| copies of the m-train; a negative n flips the stack
  const stack = repeat(listOf(m), Math.abs(n));
  return n >= 0 ? stack : flip(stack);
}
// multiply the survivors out, exactly, in BigInt
function refValue(b, L) {
  const B = BigInt(b);
  let up = 1n;
  let dn = 1n;
  for (let i = 0; i < L.up; i++) up *= B;
  for (let i = 0; i < L.dn; i++) dn *= B;
  const g = (x, y) => (y ? g(y, x % y) : x);
  const d = g(up, dn) || 1n;
  return { n: up / d, d: dn / d };
}
const sameRat = (A, B) => A.n === B.n && A.d === B.d;

/* ============================================================================
   1. b^e is exactly right, for every base and a range well past the dials
   ========================================================================== */
section('1. ratPowInt(b, e) is exact');
for (let b = B_MIN; b <= B_MAX; b++) {
  for (let e = -20; e <= 20; e++) {
    const got = ratPowInt(b, e);
    const want = refValue(b, listOf(e));
    ok(got.n === want.n, `ratPowInt(${b},${e}).n`);
    ok(got.d === want.d, `ratPowInt(${b},${e}).d`);
  }
}
// the anchors every student is told
eq(fmtRat(ratPowInt(2, 3)), '8', '2^3 = 8');
eq(fmtRat(ratPowInt(2, 5)), '32', '2^5 = 32');
eq(fmtRat(ratPowInt(5, 2)), '25', '5^2 = 25');
eq(fmtRat(ratPowInt(3, 3)), '27', '3^3 = 27');
eq(fmtRat(ratPowInt(2, 0)), '1', '2^0 = 1');
eq(fmtRat(ratPowInt(2, -3)), '1/8', '2^-3 = 1/8');
eq(fmtRat(ratPowInt(10, 16)), '10,000,000,000,000,000', '10^16 exact (and past 2^53)');
eq(ratPowInt(10, 16).n.toString(), '10000000000000000', '10^16 exact digits');
ok(ratPowInt(10, 16).n > BigInt(Number.MAX_SAFE_INTEGER), '10^16 really is past 2^53−1');

/* WHY the values are exact rationals over BigInt rather than doubles. A
   negative exponent is a FRACTION, and most of them have no exact float at
   all — 3^-4 is 1/81 = 0.0123456790123456789…, which a double must round. The
   lab prints "1/81". This check is the reason the model never touches a float. */
eq(fmtRat(ratPowInt(3, -4)), '1/81', '3^-4 prints as the exact fraction 1/81');
// Proof, not folklore: expand 1/81 exactly by BigInt long division and compare
// with what the double actually holds. They agree for 17 places and then part
// company (…6790123 vs …6783270), because 81 is not a power of two and so 1/81
// has no exact double at all. A float-valued lab would print that wrong tail to
// a child; this one prints "1/81".
function exactDecimals(n, d, places) {
  let r = n % d;
  let out = '';
  for (let i = 0; i < places; i++) {
    r *= 10n;
    out += (r / d).toString();
    r %= d;
  }
  return out;
}
const trueTail = exactDecimals(1n, 81n, 22);
const floatTail = (1 / 81).toFixed(22).slice(2);
ok(trueTail !== floatTail, 'the double for 1/81 is not 1/81 — hence exact rationals');
eq(trueTail.slice(0, 9), '012345679', '1/81 truly repeats 012345679');
eq(fmtRat(ratPowInt(10, -3)), '1/1,000', '10^-3 = 1/1000 exactly');
eq(fmtRat(ratPowInt(7, -2)), '1/49', '7^-2 = 1/49 exactly');

/* ============================================================================
   2. THE THEOREM — every rule is true, re-derived from counting factors.
      This is the whole mathematical claim of the lab.
   ========================================================================== */
section('2. the rules are TRUE (vs. an independent factor-count reference)');
let theoremStates = 0;
for (let b = B_MIN; b <= B_MAX; b++) {
  for (const o of OPS) {
    for (let m = -10; m <= 10; m++) {
      for (let n = -10; n <= 10; n++) {
        theoremStates++;
        const L = refList(o.key, m, n);
        const E = resultExp(o.key, m, n);
        // (a) the rule's exponent == the number of tiles left after cancelling
        eq(E, net(L), `exponent ${o.key} m=${m} n=${n}`);
        // (b) b^E == the survivors multiplied out
        ok(sameRat(ratPowInt(b, E), refValue(b, L)), `value-by-rule ${b} ${o.key} ${m} ${n}`);
        // (c) the lab's own slow arithmetic agrees too (this is what the ✓ shows)
        ok(sameRat(directValue(b, o.key, m, n), refValue(b, L)), `direct ${b} ${o.key} ${m} ${n}`);
      }
    }
  }
}
console.log(`   ${theoremStates.toLocaleString()} states swept (b×op×m×n), each 3 ways`);

/* the three named rules, stated explicitly */
section('3. the named rules');
for (let b = B_MIN; b <= B_MAX; b++) {
  for (let m = E_MIN; m <= E_MAX; m++) {
    for (let n = E_MIN; n <= E_MAX; n++) {
      eq(resultExp('mul', m, n), m + n, `product rule ${m},${n}`);
      eq(resultExp('div', m, n), m - n, `quotient rule ${m},${n}`);
      eq(resultExp('pow', m, n), m * n, `power rule ${m},${n}`);
      // b^m · b^n = b^(m+n) as VALUES, not just exponents
      ok(
        sameRat(directValue(b, 'mul', m, n), ratPowInt(b, m + n)),
        `b^m·b^n = b^(m+n) at ${b},${m},${n}`
      );
      ok(sameRat(directValue(b, 'div', m, n), ratPowInt(b, m - n)), `b^m÷b^n = b^(m−n) at ${b},${m},${n}`);
      ok(sameRat(directValue(b, 'pow', m, n), ratPowInt(b, m * n)), `(b^m)^n = b^(mn) at ${b},${m},${n}`);
    }
  }
}

/* ============================================================================
   4. b^0 = 1 and b^-n = 1/b^n — FORCED by the quotient rule, not decreed
   ========================================================================== */
section('4. b^0 = 1 and b^-n = 1/b^n are forced');
for (let b = B_MIN; b <= B_MAX; b++) {
  eq(fmtRat(ratPowInt(b, 0)), '1', `${b}^0 = 1`);
  for (let e = 1; e <= E_MAX; e++) {
    // b^e ÷ b^e must be 1 AND must be b^0 — the two readings the lesson uses
    ok(sameRat(directValue(b, 'div', e, e), { n: 1n, d: 1n }), `${b}^${e} ÷ ${b}^${e} = 1`);
    eq(resultExp('div', e, e), 0, `${b}^${e} ÷ ${b}^${e} has exponent 0`);
    // b^-e is the reciprocal of b^e — positive, never negative
    const neg = ratPowInt(b, -e);
    const pos = ratPowInt(b, e);
    ok(neg.n === 1n && neg.d === pos.n, `${b}^-${e} = 1/${b}^${e}`);
    ok(neg.n > 0n, `${b}^-${e} is POSITIVE (not a negative number)`);
    // and it is exactly what cancelling past the end leaves
    ok(sameRat(directValue(b, 'div', 0, e), neg), `${b}^0 ÷ ${b}^${e} = ${b}^-${e}`);
  }
}

/* ============================================================================
   5. THE PICTURE — the tile pool matches the rule, and conserves tiles
   ========================================================================== */
section('5. the tile pool (conservation, cancellation, survivors)');
for (const op of ['mul', 'div']) {
  for (let m = -10; m <= 10; m++) {
    for (let n = -10; n <= 10; n++) {
      const P = poolOf(op, m, n);
      const E = resultExp(op, m, n);
      // the drawn tiles net out to the rule's exponent
      eq(P.above.length - P.below.length, E, `pool net ${op} ${m},${n}`);
      // NO TILE IS CREATED OR DESTROYED — the lesson's central promise
      eq(P.above.length + P.below.length, Math.abs(m) + Math.abs(n), `conservation ${op} ${m},${n}`);
      // cancellation pairs off the shorter row entirely
      eq(cancelCount(P), Math.min(P.above.length, P.below.length), `k ${op} ${m},${n}`);
      // the survivors ARE the result train
      eq(survivors(P).length, Math.abs(E), `survivors ${op} ${m},${n}`);
      // every tile is tagged with the exponent it came from, and the counts add up
      const all = P.above.concat(P.below);
      eq(all.filter((t) => t === 'm').length, Math.abs(m), `m-tiles ${op} ${m},${n}`);
      eq(all.filter((t) => t === 'n').length, Math.abs(n), `n-tiles ${op} ${m},${n}`);
    }
  }
}
// ÷ really is × by the reciprocal — the unification the lab claims
for (let m = -10; m <= 10; m++) {
  for (let n = -10; n <= 10; n++) {
    const A = poolOf('div', m, n);
    const B = poolOf('mul', m, -n);
    eq(A.above.length, B.above.length, `÷b^n === ×b^-n above ${m},${n}`);
    eq(A.below.length, B.below.length, `÷b^n === ×b^-n below ${m},${n}`);
  }
}

/* ============================================================================
   6. THE TRAP the lesson calls out: (b^m)^n is NOT b^(m^n)
   ========================================================================== */
section('6. a power of a power is not a tower');
eq(fmtRat(ratPowInt(2, resultExp('pow', 3, 2))), '64', '(2^3)^2 = 64');
eq(fmtRat(ratPowInt(2, 3 ** 2)), '512', '2^(3^2) = 512');
ok(64 !== 512, 'the two readings genuinely differ — brackets matter');
// and the OTHER trap: 2^3 · 2^2 is 2^5, never 4^5
eq(fmtRat(directValue(2, 'mul', 3, 2)), '32', '2^3 · 2^2 = 32');
eq(fmtRat(ratPowInt(2, 5)), '32', '= 2^5');
ok(fmtRat(ratPowInt(4, 5)) !== '32', '4^5 is NOT the answer (the base never changes)');
eq(fmtRat(ratPowInt(4, 5)), '1,024', '4^5 = 1024, for the record');
eq(fmtRat(ratPowInt(2, 6)), '64', '2^6 = 64 — the multiply-the-exponents distractor');
// the swap trap
ok(fmtRat(ratPowInt(2, 5)) !== fmtRat(ratPowInt(5, 2)), '2^5 ≠ 5^2 — base and exponent are not swappable');
eq(fmtRat(ratPowInt(2, 4)), '16', '2^4 = 16');
eq(fmtRat(ratPowInt(4, 2)), '16', '4^2 = 16 — the one coincidence the lesson claims');
// ...and it really is the ONLY one among distinct whole numbers in range
let swaps = 0;
for (let x = 2; x <= 10; x++)
  for (let y = 2; y <= 10; y++)
    if (x !== y && ratPowInt(x, y).n === ratPowInt(y, x).n) swaps++;
eq(swaps, 2, 'exactly one unordered swap-equal pair {2,4} exists in 2..10');

/* ============================================================================
   7. Every number the LESSON asserts
   ========================================================================== */
section('7. the lesson’s arithmetic');
const claims = [
  [fmtRat(directValue(3, 'div', 5, 2)), '27', '3^5 ÷ 3^2 = 27'],
  [fmtRat(ratPowInt(3, 5)), '243', '3^5 = 243'],
  [fmtRat(ratPowInt(3, 2)), '9', '3^2 = 9'],
  [fmtRat(ratPowInt(3, 3)), '27', '3^3 = 27 (243 ÷ 9 = 27)'],
  [fmtRat(ratPowInt(7, 0)), '1', '7^0 = 1'],
  [fmtRat(directValue(2, 'div', 2, 5)), '1/8', '2^2 ÷ 2^5 = 1/8'],
  [fmtRat(ratPowInt(2, -3)), '1/8', '2^-3 = 1/8'],
  [fmtRat(directValue(2, 'pow', 3, 2)), '64', '(2^3)^2 = 64'],
  [expanded(2, 3), '2 × 2 × 2', 'expanded 2^3'],
  [expanded(2, -3), '1 / (2 × 2 × 2)', 'expanded 2^-3'],
  [expanded(2, 0), '(empty product)', 'expanded 2^0'],
  [expSentence('mul', 3, 2), '3 + 2 = 5', 'exponent sentence, product'],
  [expSentence('div', 5, 2), `5 ${MINUS} 2 = 3`, 'exponent sentence, quotient'],
  [expSentence('pow', 3, 2), '3 × 2 = 6', 'exponent sentence, power'],
  [expSentence('mul', 3, -2), `3 + (${MINUS}2) = 1`, 'a negative n is bracketed'],
  [fmtExp(-3), `${MINUS}3`, 'a real minus sign, not a hyphen'],
  [group(1000000n), '1,000,000', 'thousands separators'],
];
for (const [got, want, label] of claims) eq(got, want, label);
// the running product the solo view draws: 2,4,8,16,32
let run = 1n;
for (let i = 1; i <= 5; i++) {
  run *= 2n;
  eq(group(run), group(ratPowInt(2, i).n), `running product at tile ${i}`);
}
eq(digitCount(ratPowInt(10, 16)), 17, '10^16 is 17 digits');
eq(digitCount(ratPowInt(2, -3)), 1, 'digit count reads the denominator for a fraction');

/* ============================================================================
   8. CALIBRATION — reachable, never pre-solved, and no false stamp
   ========================================================================== */
section('8. calibration');
ok(CALIB_TARGETS.length >= 6, 'enough targets for replay');
const resetE = resultExp(CALIB_RESET.op, CALIB_RESET.m, CALIB_RESET.n);
for (const t of CALIB_TARGETS) {
  ok(t.b >= B_MIN && t.b <= B_MAX, `target base ${t.b} is dial-legal`);
  const sols = solutionsFor(t.T);
  ok(sols.length > 0, `target ${t.b}^${t.T} is reachable at all`);
  // the "Show me one way" button must actually solve it
  const one = sols[0];
  eq(resultExp(one.op, one.m, one.n), t.T, `shipped first solution solves ${t.b}^${t.T}`);
  ok(one.m >= E_MIN && one.m <= E_MAX && one.n >= E_MIN && one.n <= E_MAX, `solution in dial range ${t.T}`);
  // NEVER handed to the student already solved
  ok(resetE !== t.T, `reset state (exponent ${resetE}) does not pre-solve ${t.b}^${t.T}`);
  // the target value is exact and finite to print
  ok(fmtRat(ratPowInt(t.b, t.T)).length > 0, `target value prints for ${t.b}^${t.T}`);

  // EXHAUSTIVE: over every reachable state, the stamp fires iff E === T, and
  // 100% fires iff E === T. This is what makes a false CALIBRATED impossible.
  for (const o of OPS) {
    for (let m = E_MIN; m <= E_MAX; m++) {
      for (let n = E_MIN; n <= E_MAX; n++) {
        const E = resultExp(o.key, m, n);
        const isSol = sols.some((s) => s.op === o.key && s.m === m && s.n === n);
        eq(E === t.T, isSol, `solution set membership ${o.key} ${m},${n} vs ${t.T}`);
        const pctv = matchPercent(E, t.T);
        ok(pctv >= 0 && pctv <= 100, `meter in range ${o.key} ${m},${n}`);
        eq(pctv === 100, E === t.T, `100% iff exact ${o.key} ${m},${n} vs ${t.T}`);
      }
    }
  }
}
// the curated pool teaches what the lesson copy PROMISES it teaches
const onlyPow = (T) => !reachableWithOp('mul', T) && !reachableWithOp('div', T) && reachableWithOp('pow', T);
const onlyAddSub = (T) => !reachableWithOp('pow', T) && (reachableWithOp('mul', T) || reachableWithOp('div', T));
ok(onlyPow(12), 'T=12 forces the power rule (adding cannot pass 8)');
ok(onlyPow(16), 'T=16 forces the power rule');
ok(onlyPow(-9), 'T=−9 forces the power rule');
ok(onlyAddSub(7), 'T=7 forces adding/subtracting (7 is prime and > 4)');
ok(CALIB_TARGETS.some((t) => onlyPow(t.T)), 'at least one target needs the power rule');
ok(CALIB_TARGETS.some((t) => onlyAddSub(t.T)), 'at least one target needs add/subtract');
ok(CALIB_TARGETS.some((t) => t.T === 0), 'a b^0 = 1 round exists');
ok(CALIB_TARGETS.some((t) => t.T < 0), 'a negative-exponent round exists');
// reachableWithOp agrees with brute force, everywhere it is asked
for (const o of OPS) {
  for (let T = -20; T <= 20; T++) {
    let brute = false;
    for (let m = E_MIN; m <= E_MAX && !brute; m++)
      for (let n = E_MIN; n <= E_MAX && !brute; n++) if (resultExp(o.key, m, n) === T) brute = true;
    eq(reachableWithOp(o.key, T), brute, `reachableWithOp ${o.key} ${T}`);
  }
}
// meter behaves: monotone in |E−T|, and never negative
for (let T = -16; T <= 16; T++) {
  for (let E = -16; E <= 16; E++) {
    const a = matchPercent(E, T);
    const bb = matchPercent(E + 1, T);
    if (Math.abs(E - T) < Math.abs(E + 1 - T)) ok(a >= bb, `meter monotone at E=${E},T=${T}`);
    ok(a >= 0, `meter non-negative at E=${E},T=${T}`);
  }
}
// makeTarget always returns a legal, non-repeating target
let prev = null;
for (let i = 0; i < 5000; i++) {
  const t = makeTarget(prev);
  ok(CALIB_TARGETS.some((c) => c.b === t.b && c.T === t.T), 'makeTarget draws from the pool');
  if (prev) ok(!(t.b === prev.b && t.T === prev.T), 'makeTarget never repeats back-to-back');
  prev = t;
}

/* ============================================================================
   9. The lab's own wiring: dials, unlocks, steps
   ========================================================================== */
section('9. lesson & dial wiring');
eq(STEPS.length, 9, 'nine steps');
eq(STEPS.filter((s) => s.calib).length, 1, 'exactly one calibration step');
eq(STEPS[STEPS.length - 1].calib, true, 'calibration is last');
STEPS.forEach((s, i) => {
  ok(!!s.title, `step ${i} has a title`);
  ok(!!s.body, `step ${i} has a body`);
  if (!s.calib) {
    ok(!!s.q, `step ${i} poses a question`);
    eq(s.choices.length, 3, `step ${i} has 3 choices`);
    ok(s.answer >= 0 && s.answer < 3, `step ${i} answer index is legal`);
    ok(!!s.feedback && s.feedback.length > 80, `step ${i} feedback carries the reveal`);
  }
});
// every dial and every operator unlocks inside the lesson, one idea at a time
for (const p of PARAMS) {
  ok(p.unlock >= 0 && p.unlock < STEPS.length, `dial ${p.key} unlocks inside the lesson`);
  ok(p.min < p.max, `dial ${p.key} has a real range`);
}
eq(PARAMS.filter((p) => p.star).length, 1, 'exactly one star dial');
for (const o of OPS) ok(o.unlock >= 0 && o.unlock < STEPS.length, `operator ${o.key} unlocks inside the lesson`);
eq(opUnlock('mul'), 3, 'the product rule unlocks with the second exponent');
ok(opUnlock('div') > opUnlock('mul'), 'divide comes after multiply');
ok(opUnlock('pow') > opUnlock('div'), 'the power rule comes last');
// the START state must be legal, and must show something worth seeing
ok(START.b >= B_MIN && START.b <= B_MAX, 'START base legal');
ok(START.m >= E_MIN && START.m <= E_MAX, 'START m legal');
ok(START.n >= E_MIN && START.n <= E_MAX, 'START n legal');
eq(fmtRat(ratPowInt(START.b, START.m)), '8', 'the lab opens on 2^3 = 8');
eq(fmtRat(directValue(START.b, START.op, START.m, START.n)), '32', 'and the product step shows 2^3·2^2 = 32');
eq(resultExp(START.op, START.m, START.n), 5, '…which is 2^5');
// the rule card lights up in step order and covers all five rules
eq(RULES.length, 5, 'five same-base rules on the card');
for (let i = 1; i < RULES.length; i++) ok(RULES[i].unlock >= RULES[i - 1].unlock, 'rule card is in step order');
for (const r of RULES) ok(r.unlock < STEPS.length, `rule ${r.key} unlocks inside the lesson`);
for (const key of ['mul', 'div', 'pow', 'zero', 'neg']) ok(RULES.some((r) => r.key === key), `rule card covers ${key}`);
// 0^0 and 0^-n are undefined — the lab must never be able to reach base 0 or 1
ok(B_MIN >= 2, 'the base dial starts at 2, so 0^0 and 0^-n are unreachable by construction');
// the dial bound the calibration design leans on
eq(E_MAX, 4, 'exponents stop at 4');
ok(E_MAX + E_MAX < 12, 'adding cannot reach 12 — which is what forces the power rule there');

/* ---- report --------------------------------------------------------------- */
console.log('\n' + '─'.repeat(64));
if (fails) {
  console.log(`FAIL — ${fails} of ${checks.toLocaleString()} checks failed\n`);
  failures.forEach((f) => console.log('  ✕ ' + f));
  process.exit(1);
} else {
  console.log(`PASS — ${checks.toLocaleString()} checks, 0 failures`);
  console.log('ExponentRulesLab: the rules are re-derived from counting factors and hold everywhere.');
}
