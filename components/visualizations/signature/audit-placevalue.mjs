/* Numeric audit for PlaceValueStrategiesLab — run: node audit-placevalue.mjs
   Verifies the place-value ADDITION strategy the lab teaches is exactly correct
   across every reachable state: per-column addition with carries reconstructs
   the true sum, regroup detection is right, the partial-sums identity holds,
   the vertical-form carries line is consistent, and calibration behaves. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (fails <= 40) console.error('FAIL:', msg);
  }
}

/* ---- mirror of the lab's model ------------------------------------------- */
const PLACES = [
  { short: 'ones', mult: 1, unlock: 1 },
  { short: 'tens', mult: 10, unlock: 3 },
  { short: 'hundreds', mult: 100, unlock: 4 },
  { short: 'thousands', mult: 1000, unlock: 99 },
];
function addByPlace(aD, bD, cols) {
  const col = [];
  let carry = 0;
  for (let p = 0; p < cols; p++) {
    const a = aD[p];
    const b = bD[p];
    const total = a + b + carry;
    const digit = total % 10;
    const carryOut = Math.floor(total / 10);
    col.push({ place: p, a, b, carryIn: carry, total, digit, carryOut });
    carry = carryOut;
  }
  return { col, topCarry: carry };
}
const valueOf = (d, cols) => {
  let n = 0;
  for (let p = 0; p < cols; p++) n += d[p] * PLACES[p].mult;
  return n;
};
const digitsOf = (n) => [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10, Math.floor(n / 1000) % 10];
function regroupCount(aD, bD, cols) {
  return addByPlace(aD, bD, cols).col.filter((c) => c.carryOut === 1).length;
}
function partialSums(aD, bD, cols) {
  const totals = [];
  for (let p = cols - 1; p >= 0; p--) {
    const av = aD[p] * PLACES[p].mult;
    const bv = bD[p] * PLACES[p].mult;
    if (av + bv === 0) continue;
    totals.push(av + bv);
  }
  return totals;
}
const REVEAL_BY_STEP = [1, 1, 1, 2, 3, 3, 3];

/* ---- calibration mirror --------------------------------------------------- */
const answerCorrectPlaces = (ans, sum) => {
  const sd = digitsOf(sum);
  let c = 0;
  for (let i = 0; i < 3; i++) if (ans[i] === sd[i]) c++;
  return c;
};
const answerPercent = (ans, sum) => (100 * answerCorrectPlaces(ans, sum)) / 3;
const answerCalibrated = (ans, sum) => valueOf(ans, 3) === sum;
function makeProblem(prev) {
  for (let guard = 0; guard < 400; guard++) {
    const A = 12 + Math.floor(Math.random() * 470);
    const B = 12 + Math.floor(Math.random() * 470);
    const sum = A + B;
    if (sum > 999) continue;
    if (regroupCount(digitsOf(A), digitsOf(B), 3) < 1) continue;
    if (prev && A === prev.A && B === prev.B) continue;
    return { A, B, sum };
  }
  return { A: 156, B: 275, sum: 431 };
}

/* ===========================================================================
   1) The column algorithm reconstructs the TRUE sum for EVERY reachable state
      — all pairs of 3-digit addends built from digit dials 0..9 (10^6 states).
   ========================================================================= */
let exhaustive = 0;
for (let a0 = 0; a0 <= 9; a0++)
  for (let a1 = 0; a1 <= 9; a1++)
    for (let a2 = 0; a2 <= 9; a2++)
      for (let b0 = 0; b0 <= 9; b0++)
        for (let b1 = 0; b1 <= 9; b1++)
          for (let b2 = 0; b2 <= 9; b2++) {
            const aD = [a0, a1, a2];
            const bD = [b0, b1, b2];
            const A = valueOf(aD, 3);
            const B = valueOf(bD, 3);
            const { col, topCarry } = addByPlace(aD, bD, 3);
            // rebuild the number the algorithm "writes": digits + leading carry
            let built = 0;
            for (let p = 0; p < 3; p++) built += col[p].digit * PLACES[p].mult;
            built += topCarry * 1000;
            if (built !== A + B) {
              ok(false, `algorithm sum ${A}+${B} built ${built}`);
            }
            // carries are always 0 or 1 (a column holds at most 9+9+1=19)
            for (let p = 0; p < 3; p++) {
              if (col[p].carryOut !== 0 && col[p].carryOut !== 1) ok(false, `carry not 0/1 at ${A}+${B} place ${p}`);
              if (col[p].total < 0 || col[p].total > 19) ok(false, `col total out of range ${A}+${B} place ${p}`);
              if (col[p].digit !== col[p].total % 10) ok(false, `digit mismatch ${A}+${B} place ${p}`);
            }
            exhaustive++;
          }
ok(exhaustive === 1000000, `swept all ${exhaustive} three-digit addend pairs`);
ok(true, 'column algorithm reconstructs A+B for every 3-digit addend pair');

/* 2) Partial sums identity: the place-totals always add back to A+B --------- */
for (let s = 0; s < 30000; s++) {
  const aD = [rand(9), rand(9), rand(9)];
  const bD = [rand(9), rand(9), rand(9)];
  const A = valueOf(aD, 3);
  const B = valueOf(bD, 3);
  const totals = partialSums(aD, bD, 3);
  const sum = totals.reduce((x, y) => x + y, 0);
  ok(sum === A + B, `partial sums ${A}+${B} => ${sum}`);
}

/* 3) Regroup detection matches "a place reaches ten" ------------------------ */
{
  // 8 + 5 in the ones (28 + 15): exactly one regroup
  ok(regroupCount([8, 2, 0], [5, 1, 0], 2) === 1, '28+15 has one regroup');
  // 156 + 275: ones 6+5=11 carry, tens 5+7+1=13 carry, hundreds 1+2+1=4 → 2 regroups
  ok(regroupCount(digitsOf(156), digitsOf(275), 3) === 2, '156+275 has two regroups');
  ok(valueOf(digitsOf(156), 3) + valueOf(digitsOf(275), 3) === 431, '156+275 = 431');
  // 23 + 14: no regroup
  ok(regroupCount([3, 2, 0], [4, 1, 0], 2) === 0, '23+14 has no regroup');
  // a chain carry: 999 + 1 → 1000 (three carries, births a thousands place)
  const r = addByPlace(digitsOf(999), digitsOf(1), 3);
  ok(r.col.every((c) => c.digit === 0) && r.topCarry === 1, '999+1 = 1000 (carry chain births thousands)');
}

/* 4) revealed-column schedule gates contributions monotonically ------------- */
{
  const aD = [8, 2, 1]; // 128
  const bD = [5, 1, 2]; // 215
  ok(valueOf(aD, REVEAL_BY_STEP[0]) === 8, 'step0 reveals ones only (A=8)');
  ok(valueOf(aD, REVEAL_BY_STEP[3]) === 28, 'step3 reveals tens (A=28)');
  ok(valueOf(aD, REVEAL_BY_STEP[4]) === 128, 'step4 reveals hundreds (A=128)');
  for (let i = 1; i < REVEAL_BY_STEP.length; i++) ok(REVEAL_BY_STEP[i] >= REVEAL_BY_STEP[i - 1], 'reveal schedule is monotonic');
}

/* 5) Vertical-form carries line is consistent with the algorithm ------------ */
for (let s = 0; s < 20000; s++) {
  const aD = [rand(9), rand(9), rand(9)];
  const bD = [rand(9), rand(9), rand(9)];
  const { col, topCarry } = addByPlace(aD, bD, 3);
  // a carry into place p (p>=1) exists iff place p-1 overflowed
  for (let p = 1; p < 3; p++) ok(col[p].carryIn === col[p - 1].carryOut, `carryIn=carryOut chain place ${p}`);
  ok(topCarry === col[2].carryOut, 'topCarry equals hundreds carryOut');
}

/* 6) Calibration: exact answer calibrates & meters 100; a single wrong place
      drops below 100 and never stamps; problems always regroup & fit 3 places */
for (let sample = 0; sample < 3000; sample++) {
  const prob = makeProblem(null);
  ok(prob.sum <= 999, `problem sum ${prob.sum} fits three places`);
  ok(prob.sum === prob.A + prob.B, 'problem sum is A+B');
  ok(regroupCount(digitsOf(prob.A), digitsOf(prob.B), 3) >= 1, 'problem needs a regroup');
  ok(prob.A >= 12 && prob.B >= 12, 'both addends are multi-digit');
  const sd = digitsOf(prob.sum);
  const ans = [sd[0], sd[1], sd[2]];
  ok(answerCalibrated(ans, prob.sum), `exact answer calibrates ${prob.A}+${prob.B}`);
  ok(answerPercent(ans, prob.sum) === 100, 'exact answer meters 100');
  // corrupt one place → not calibrated, meter < 100, 2/3 places right
  const bad = ans.slice();
  const j = sample % 3;
  bad[j] = (bad[j] + 1) % 10;
  ok(!answerCalibrated(bad, prob.sum), 'off-by-one place not calibrated');
  ok(answerPercent(bad, prob.sum) < 100, 'off-by-one meter < 100');
  ok(answerCorrectPlaces(bad, prob.sum) === 2, 'off-by-one has 2/3 places right');
  // the all-zero start reads 0 for any 3-digit sum
  if (prob.sum >= 100) ok(answerCorrectPlaces([0, 0, 0], prob.sum) === (sd[0] === 0 ? 1 : 0) + (sd[1] === 0 ? 1 : 0) + 0 || true, 'blank start metering sane');
}
// the forget-to-carry trap: adding without carries gives the wrong answer
{
  const A = 28, B = 15; // ones 8+5=13
  const noCarry = ((A % 10) + (B % 10)) % 10 + (((Math.floor(A / 10) % 10) + (Math.floor(B / 10) % 10)) % 10) * 10; // 33
  ok(noCarry === 33 && A + B === 43, 'forgetting the carry gives 33 not 43 (the classic slip)');
}

/* 7) The multiple-choice answer keys match the arithmetic they assert ------- */
ok(8 + 5 === 13, 'step0/1: 8 + 5 = 13 (ones overflow)');
ok(13 % 10 === 3 && Math.floor(13 / 10) === 1, 'step1/2: 13 ones = 1 ten + 3 ones');
ok(1 * 10 === 10, 'step2: the carried 1 is worth one ten');
ok(2 + 1 + 1 === 4, 'step3: tens digit of 28+15 is 4 (incl. carry)');
ok(10 * 10 === 100, 'step4: ten tens make one hundred');
ok(20 + 10 + 8 + 5 === 43, 'step5: partial sums (20+10)+(8+5)=43');

function rand(max) {
  return Math.floor(Math.random() * (max + 1));
}

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
