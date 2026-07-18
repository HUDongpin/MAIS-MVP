/* Numeric audit for DivisionLab — run: node audit-division.mjs
   Verifies the math the lab teaches is exactly correct across every reachable
   dial state, plus calibration reachability and the taught lesson facts.
   Mirrors the model in DivisionLab.jsx (kept in sync by hand). */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

const AMAX = 24;
const BMAX = 8;
const TARGET_QUOTIENTS = [2, 3, 4, 5, 6];

const quotientOf = (a, b) => Math.floor(a / b);
const remainderOf = (a, b) => a - b * Math.floor(a / b);
const quotientPercent = (a, b, Q) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(a / b - Q) / Q)));
const isCalibrated = (a, b, Q) => remainderOf(a, b) === 0 && quotientOf(a, b) === Q;

/* 1) The division algorithm holds exactly for every reachable (a,b) ---------- */
for (let a = 1; a <= AMAX; a++) {
  for (let b = 1; b <= BMAX; b++) {
    const q = quotientOf(a, b);
    const r = remainderOf(a, b);
    ok(Number.isInteger(q) && Number.isInteger(r), `integers ${a}÷${b}`);
    // the fundamental identity a = b·q + r
    ok(b * q + r === a, `a = b·q + r  (${a} = ${b}·${q} + ${r})`);
    // 0 ≤ r < b  — the remainder is always a valid remainder
    ok(r >= 0 && r < b, `0 ≤ r < b  (${a}÷${b}: r=${r}, b=${b})`);
    // never divide by zero: b ≥ 1 by construction (dial minimum)
    ok(b >= 1, `divisor ≥ 1  (${b})`);
    // quotient never exceeds the dividend, and is 0 exactly when a < b
    ok(q <= a, `q ≤ a  (${a}÷${b})`);
    ok(q === 0 ? a < b : a >= b, `q=0 iff a<b  (${a}÷${b})`);
  }
}

/* 2) Special facts the lesson asserts --------------------------------------- */
for (let a = 1; a <= AMAX; a++) {
  ok(quotientOf(a, 1) === a && remainderOf(a, 1) === 0, `a ÷ 1 = a  (${a})`);
}
for (let a = 1; a <= BMAX; a++) {
  ok(quotientOf(a, a) === 1 && remainderOf(a, a) === 0, `a ÷ a = 1  (${a})`);
}

/* 3) The two meanings of division give the same quotient --------------------
   Sharing:  a into b groups -> each group has q.
   Grouping: a into groups of b -> there are q groups.
   Both are floor(a/b); this is the partitive/quotative equivalence.          */
for (let a = 1; a <= AMAX; a++) {
  for (let b = 1; b <= BMAX; b++) {
    const share = quotientOf(a, b); // size of each of b groups
    const group = quotientOf(a, b); // number of groups of size b
    ok(share === group, `partitive == quotative quotient  (${a}÷${b})`);
    // and the clean rectangle q·b squares reconstruct with the remainder
    ok(b * quotientOf(a, b) + remainderOf(a, b) === a, `rectangle + remainder = a  (${a}÷${b})`);
  }
}

/* 4) Division undoes multiplication: exact divisions are unknown-factor facts */
for (let q = 1; q <= 12; q++) {
  for (let b = 1; b <= BMAX; b++) {
    const a = q * b;
    if (a > AMAX) continue;
    ok(quotientOf(a, b) === q && remainderOf(a, b) === 0, `q×b=a ⇒ a÷b=q  (${a}÷${b}=${q})`);
    ok(quotientOf(a, q) === b && remainderOf(a, q) === 0, `fact family  (${a}÷${q}=${b})`);
  }
}

/* 5) Calibration: every target quotient is reachable exactly; an exact hit
      stamps + reads 100; a near miss (remainder present) does neither -------- */
for (const Q of TARGET_QUOTIENTS) {
  let reachable = false;
  for (let b = 1; b <= BMAX && !reachable; b++) {
    const a = Q * b;
    if (a >= 1 && a <= AMAX) {
      reachable = true;
      ok(isCalibrated(a, b, Q), `exact calibrates  (${a}÷${b}=${Q})`);
      ok(Math.abs(quotientPercent(a, b, Q) - 100) < 1e-9, `exact meter 100  (${a}÷${b}=${Q})`);
    }
  }
  ok(reachable, `target quotient ${Q} reachable`);

  // a one-off dividend (remainder present) must not stamp
  let foundMiss = false;
  for (let b = 2; b <= BMAX && !foundMiss; b++) {
    const a = Q * b + 1; // one more than an exact multiple -> remainder 1
    if (a <= AMAX) {
      foundMiss = true;
      ok(!isCalibrated(a, b, Q), `remainder present -> not calibrated  (${a}÷${b}, Q=${Q})`);
      ok(quotientPercent(a, b, Q) < 100, `remainder present -> meter < 100  (${a}÷${b}, Q=${Q})`);
    }
  }
  ok(foundMiss, `a near miss exists for Q=${Q}`);
}

/* 6) The quotient family (shown on success) is correct and non-empty --------- */
function quotientFamily(Q) {
  const out = [];
  for (let b = 1; b <= BMAX; b++) {
    const a = Q * b;
    if (a >= 1 && a <= AMAX) out.push([a, b]);
  }
  return out;
}
for (const Q of TARGET_QUOTIENTS) {
  const fam = quotientFamily(Q);
  ok(fam.length >= 2, `family for ${Q} has ≥2 members`);
  for (const [a, b] of fam) ok(quotientOf(a, b) === Q && remainderOf(a, b) === 0, `family member ${a}÷${b}=${Q}`);
}

/* 7) The multiple-choice answer keys match the arithmetic they assert -------- */
ok(quotientOf(12, 3) === 4 && remainderOf(12, 3) === 0, 'step0 12÷3=4');
ok(quotientOf(20, 4) === 5, 'step1 dividend example 20÷4=5');
ok(quotientOf(15, 3) === 5 && 3 * 5 === 15, 'step2 share 15÷3=5');
ok(quotientOf(12, 4) === 3 && 4 + 4 + 4 === 12, 'step3 groups 12÷4=3');
ok(quotientOf(14, 4) === 3 && remainderOf(14, 4) === 2, 'step4 14÷4=3 R 2');
ok(remainderOf(14, 4) < 4, 'step4 remainder < divisor');
ok(quotientOf(42, 6) === 7 && 6 * 7 === 42, 'step5 42÷6=7 (6×7=42)');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
