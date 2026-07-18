/* Numeric audit for AssociativeAdditionLab — run: node audit-associative-addition.mjs

   Verifies that every claim the lab makes is exactly true across every state a
   student can reach, plus the calibration gate and the lesson answer keys.
   Whole numbers only — there is not a float in the model, so nothing here is
   allowed to be approximate.

   NOTE ON THE FILENAME: `audit-associative.mjs` belongs to the sibling
   AssociativeMultiplicationLab, so this one is namespaced to addition. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (fails <= 25) console.error('FAIL:', msg);
  }
}

/* ---- the model, mirrored from the lab ------------------------------------ */
const MIN = 0;
const MAX = 10;
const TEN = 10;

const groupLeft = (a, b, c) => a + b + c; // (a + b) + c
const groupRight = (a, b, c) => a + (b + c); // a + (b + c)
const firstSum = (a, b, c, g) => (g === 'L' ? a + b : b + c);
const total = (a, b, c) => a + b + c;

const FOIL = { a: 10, b: 3, c: 2 };
const foilLeft = (f) => f.a - f.b - f.c;
const foilRight = (f) => f.a - (f.b - f.c);

const hasTen = (a, b, c) => a + b === TEN || b + c === TEN;
const tenClamped = (a, b, c, g) => (g === 'L' ? a + b === TEN : b + c === TEN);
const matchPercent = (a, b, c, g, T) => {
  const totalScore = Math.max(0, 1 - Math.abs(total(a, b, c) - T) / 10);
  return 60 * totalScore + 25 * (hasTen(a, b, c) ? 1 : 0) + 15 * (tenClamped(a, b, c, g) ? 1 : 0);
};
const isCalibrated = (a, b, c, g, T) => total(a, b, c) === T && tenClamped(a, b, c, g);

const TRIOS = [];
for (let a = MIN; a <= MAX; a++)
  for (let b = MIN; b <= MAX; b++) for (let c = MIN; c <= MAX; c++) TRIOS.push([a, b, c]);

/* ==========================================================================
   1) THE THEOREM. (a + b) + c === a + (b + c) for every reachable trio, and
      the shared value is the plain total the picture draws. Exact integers.
   ========================================================================== */
for (const [a, b, c] of TRIOS) {
  const L = groupLeft(a, b, c);
  const R = groupRight(a, b, c);
  ok(L === R, `associativity ${a},${b},${c}: ${L} vs ${R}`);
  ok(L === total(a, b, c), `left grouping == total ${a},${b},${c}`);
  ok(R === total(a, b, c), `right grouping == total ${a},${b},${c}`);
  ok(Number.isInteger(L) && Number.isInteger(R), `integers ${a},${b},${c}`);
  // the evaluation the staircase actually performs, round by round
  ok(a + b + c === L, `two-round left ${a},${b},${c}`);
  ok(a + (b + c) === R, `two-round right ${a},${b},${c}`);
  // the total never shrinks below a part (the rods can only get longer)
  ok(L >= a && L >= b && L >= c, `total >= each addend ${a},${b},${c}`);
  ok(L >= a + b && L >= b + c, `total >= each first sum ${a},${b},${c}`);
  ok(L >= 0 && L <= 30, `total in window ${a},${b},${c}`);
}
ok(TRIOS.length === 1331, 'all 11^3 trios swept');

/* ==========================================================================
   2) THE PICTURE'S OWN CLAIM — "the right edge never moves".
      Each row of a track is drawn as a list of rod lengths laid end to end.
      The theorem the student SEES is that every row of every track has the
      same total length, so the plumb line at nx(total) touches all of them.
   ========================================================================== */
const rowsOf = (a, b, c, g) =>
  g === 'L'
    ? [[a, b, c], [a + b, c], [a + b + c]] // (a+b)+c  →  5 + 6  →  11
    : [[a, b, c], [a, b + c], [a + b + c]]; // a+(b+c)  →  2 + 9  →  11
for (const [a, b, c] of TRIOS) {
  const T = total(a, b, c);
  for (const g of ['L', 'R']) {
    for (const row of rowsOf(a, b, c, g)) {
      ok(row.reduce((s, x) => s + x, 0) === T, `row length == total ${a},${b},${c},${g}`);
      ok(row.every((x) => x >= 0 && Number.isInteger(x)), `row rods whole ${a},${b},${c},${g}`);
    }
  }
  // the two tracks' MIDDLE rows are the rows that may differ — and the fused
  // carmine rod sits exactly where the clamp was (same span, same length)
  const midL = rowsOf(a, b, c, 'L')[1];
  const midR = rowsOf(a, b, c, 'R')[1];
  ok(midL[0] === a + b, `left fused rod == a+b ${a},${b},${c}`);
  ok(midR[1] === b + c, `right fused rod == b+c ${a},${b},${c}`);
  ok(midR[0] === a, `right track leaves a untouched ${a},${b},${c}`);
  ok(midL[1] === c, `left track leaves c untouched ${a},${b},${c}`);
  // and the bottom rows are identical, which is the whole argument
  ok(rowsOf(a, b, c, 'L')[2][0] === rowsOf(a, b, c, 'R')[2][0], `bottom rows agree ${a},${b},${c}`);
}

/* ==========================================================================
   3) STEP 4's CLAIM — the first sums are equal EXACTLY when a === c.
      This is the lab's most load-bearing subtlety: the property does NOT say
      the intermediate steps agree, only that the totals do.
   ========================================================================== */
let differing = 0;
for (const [a, b, c] of TRIOS) {
  const sameFirst = a + b === b + c;
  ok(sameFirst === (a === c), `first sums equal iff a==c: ${a},${b},${c}`);
  // b really is shared by both clamps — it appears in each first sum
  ok(firstSum(a, b, c, 'L') - a === b, `left first sum contains b ${a},${b},${c}`);
  ok(firstSum(a, b, c, 'R') - c === b, `right first sum contains b ${a},${b},${c}`);
  if (!sameFirst) differing++;
}
// so the interesting case (different routes, same destination) is the norm
ok(differing === 1331 - 11 * 11, 'trios with genuinely different first sums');

/* ==========================================================================
   4) ASSOCIATIVE vs COMMUTATIVE — step 3's distractor. Reordering also
      preserves the sum, but it is a DIFFERENT statement: this lab never
      reorders, and the audit records that both facts are true so the feedback
      text ("that's the commutative property") is honest.
   ========================================================================== */
for (const [a, b, c] of TRIOS) {
  const t = total(a, b, c);
  const perms = [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
  for (const [x, y, z] of perms) ok(x + y + z === t, `permutation sum ${x},${y},${z}`);
}

/* ==========================================================================
   5) THE COUNTEREXAMPLE — subtraction is not associative.
      For every trio the two subtraction groupings differ by EXACTLY 2c, so
      they agree if and only if c === 0. The lab ships the fixed witness
      (10 − 3) − 2 = 5 vs 10 − (3 − 2) = 9.
   ========================================================================== */
for (const [a, b, c] of TRIOS) {
  const L = a - b - c;
  const R = a - (b - c);
  ok(L === a - b - c, `sub left expands ${a},${b},${c}`);
  ok(R === a - b + c, `sub right expands ${a},${b},${c}`);
  ok(R - L === 2 * c, `sub groupings differ by exactly 2c ${a},${b},${c}`);
  ok((L === R) === (c === 0), `sub associative iff c==0 ${a},${b},${c}`);
}
ok(foilLeft(FOIL) === 5, 'foil: (10 − 3) − 2 = 5');
ok(foilRight(FOIL) === 9, 'foil: 10 − (3 − 2) = 9');
ok(foilLeft(FOIL) !== foilRight(FOIL), 'foil: the two really disagree');
ok(FOIL.a - FOIL.b === 7 && FOIL.b - FOIL.c === 1, 'foil intermediate values as drawn');
// the witness never produces a negative number (out of scope for grade 1–3)
ok(
  foilLeft(FOIL) >= 0 && foilRight(FOIL) >= 0 && FOIL.a - FOIL.b >= 0 && FOIL.b - FOIL.c >= 0,
  'foil stays in the whole numbers'
);

/* ==========================================================================
   6) MAKE A TEN — the payoff. If a clamp holds ten, the second round is
      literally "ten plus the leftover".
   ========================================================================== */
for (const [a, b, c] of TRIOS) {
  if (a + b === TEN) {
    ok(groupLeft(a, b, c) === TEN + c, `left ten shortcut ${a},${b},${c}`);
    ok(hasTen(a, b, c) && tenClamped(a, b, c, 'L'), `left ten detected ${a},${b},${c}`);
  }
  if (b + c === TEN) {
    ok(groupRight(a, b, c) === a + TEN, `right ten shortcut ${a},${b},${c}`);
    ok(hasTen(a, b, c) && tenClamped(a, b, c, 'R'), `right ten detected ${a},${b},${c}`);
  }
  ok(
    hasTen(a, b, c) === (tenClamped(a, b, c, 'L') || tenClamped(a, b, c, 'R')),
    `hasTen == some clamp holds ten ${a},${b},${c}`
  );
}

/* ==========================================================================
   7) THE START STATE and the step-5 instruction.
      START must pre-solve nothing, and with only the a dial live and b = 3 the
      instruction "make a ten" must have exactly ONE answer.
   ========================================================================== */
const START = { a: 2, b: 3, c: 6 };
ok(total(START.a, START.b, START.c) === 11, 'START total is 11');
ok(START.a + START.b === 5, 'START left first sum is 5');
ok(START.b + START.c === 9, 'START right first sum is 9');
ok(START.a + START.b !== START.b + START.c, 'START first sums differ (a != c)');
ok(!hasTen(START.a, START.b, START.c), 'START pre-solves no ten');
ok(
  groupLeft(START.a, START.b, START.c) === groupRight(START.a, START.b, START.c),
  'START: both groupings agree'
);
let tenSolutions = 0;
for (let a = MIN; a <= MAX; a++) if (a + START.b === TEN) tenSolutions++;
ok(tenSolutions === 1, 'step 5: with b=3, exactly one a makes a ten');
ok(7 + START.b === TEN, 'step 5: that a is 7');
ok(groupLeft(7, 3, 6) === 16 && 10 + 6 === 16, 'step 5: (7+3)+6 = 10+6 = 16');
ok(groupRight(7, 3, 6) === 16 && 7 + 9 === 16, 'step 5: 7+(3+6) = 7+9 = 16');
ok(groupLeft(7, 3, 6) === groupRight(7, 3, 6), 'step 5: both routes reach 16');

/* ==========================================================================
   8) CALIBRATION. Swept over every trio × both groupings × every target.

      The stamp must be exactly the meter's 100: pct === 100 ⟺ isCalibrated.
      That equivalence is what makes a false stamp impossible (and also makes a
      correct build that reads 99% impossible).
   ========================================================================== */
const TARGETS = [12, 13, 14, 15, 16, 17, 18, 19, 20];
for (const T of TARGETS) {
  let reachable = 0;
  for (const [a, b, c] of TRIOS) {
    for (const g of ['L', 'R']) {
      const p = matchPercent(a, b, c, g, T);
      const cal = isCalibrated(a, b, c, g, T);
      ok(p >= 0 && p <= 100, `meter in range ${a},${b},${c},${g},${T} = ${p}`);
      ok((p === 100) === cal, `meter 100 iff calibrated ${a},${b},${c},${g},${T} (p=${p})`);
      if (cal) {
        reachable++;
        ok(total(a, b, c) === T, `calibrated implies exact total ${a},${b},${c},${g},${T}`);
        ok(firstSum(a, b, c, g) === TEN, `calibrated implies the clamp holds ten ${a},${b},${c},${g}`);
        ok(hasTen(a, b, c), `calibrated implies a ten exists ${a},${b},${c},${g}`);
      }
    }
  }
  ok(reachable > 0, `target ${T} is reachable`);
  // the canonical solution the lesson describes: a ten, then the leftover
  const leftover = T - TEN;
  ok(leftover >= 0 && leftover <= MAX, `target ${T} leftover in dial range`);
  ok(isCalibrated(7, 3, leftover, 'L', T), `target ${T} solved by (7+3)+${leftover}`);
  ok(isCalibrated(leftover, 3, 7, 'R', T), `target ${T} solved by ${leftover}+(3+7)`);
  ok(matchPercent(7, 3, leftover, 'L', T) === 100, `target ${T} canonical reads 100`);

  // the reset state the step enters on must never be pre-stamped
  ok(!isCalibrated(0, 0, 0, 'L', T), `reset not calibrated ${T}`);
  ok(matchPercent(0, 0, 0, 'L', T) === 0, `reset reads 0% ${T}`);

  // right total but no ten: real progress, but no stamp
  const noTen = [T - 4, 2, 2];
  if (noTen[0] >= 0 && noTen[0] <= MAX) {
    ok(total(noTen[0], noTen[1], noTen[2]) === T, `no-ten build totals ${T}`);
    if (!hasTen(noTen[0], noTen[1], noTen[2])) {
      ok(!isCalibrated(noTen[0], noTen[1], noTen[2], 'L', T), `right total but no ten: no stamp ${T}`);
      ok(
        matchPercent(noTen[0], noTen[1], noTen[2], 'L', T) === 60,
        `right total but no ten reads 60% ${T}`
      );
    }
  }
  // a ten made but clamped on the WRONG joint: 85%, still no stamp
  if (leftover >= 0 && leftover <= MAX && 3 + leftover !== TEN) {
    ok(!isCalibrated(7, 3, leftover, 'R', T), `ten clamped on wrong joint: no stamp ${T}`);
    ok(matchPercent(7, 3, leftover, 'R', T) === 85, `wrong joint reads 85% ${T}`);
  }
}

/* The meter is monotone in how far the total is from the target (with the ten
   parts held fixed), so it can only ever guide a student toward the answer. */
for (const T of TARGETS) {
  let prev = Infinity;
  for (let d = 0; d <= 10; d++) {
    const score = 60 * Math.max(0, 1 - d / 10);
    ok(score <= prev, `meter non-increasing in |sum − T| at d=${d}, T=${T}`);
    prev = score;
  }
  ok(60 * Math.max(0, 1 - 0 / 10) === 60, `exact total pays the full 60 (T=${T})`);
}

/* ==========================================================================
   9) THE LESSON ANSWER KEYS — every number asserted in the copy.
   ========================================================================== */
ok(2 + 3 === 5, 'step 1 key: 2 + 3 = 5');
ok(5 + 6 === 11, 'step 1 key: 5 + 6 = 11');
ok(3 + 6 === 9, 'step 2 key: 3 + 6 = 9');
ok(2 + 9 === 11, 'step 2 key: 2 + 9 = 11');
ok(groupLeft(2, 3, 6) === 11 && groupRight(2, 3, 6) === 11, 'step 2 key: total stays 11');
ok(2 + 3 !== 3 + 6, 'step 3: the middle rows genuinely differ');
ok(6 + 3 + 2 === 2 + 3 + 6, 'step 3 feedback: reordering also preserves the sum (commutative)');
ok(7 + 3 + 6 === 16 && 7 + (3 + 6) === 16, 'step 5 key: both groupings make 16');
ok(10 + 6 === 16 && 7 + 9 === 16, 'step 5 key: the two second rounds');
ok(foilLeft(FOIL) === 5 && foilRight(FOIL) === 9, 'step 6 feedback: 5 and 9');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
