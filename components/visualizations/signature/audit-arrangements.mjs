/* ============================================================================
   audit-arrangements.mjs — numeric proof for ArrangementsLab.jsx
   (S-CP.B.9 · the shrinking slots and the shuffle bill).

   Run:  node audit-arrangements.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ArrangementsLab.jsx', import.meta.url));
const src = readFileSync(PATH, 'utf8');

let pass = 0;
let fail = 0;
const bad = [];
function check(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    if (bad.length < 30) bad.push(msg);
  }
}

/* ---------------------------------------------------------------------------
   1. SLICE AND EVAL the shipped model.
   ------------------------------------------------------------------------- */
const importAt = src.indexOf("import { useCallback");
const compAt = src.indexOf('export default function ArrangementsLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, permOf, factOf, combOf, slotsOf,
            POOL, CASES, PERM_CHIPS, COMB_CHIPS, labelOf, permTruth, combTruth,
            makeCase, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, permOf, factOf, combOf, slotsOf, POOL, CASES, PERM_CHIPS, COMB_CHIPS,
  labelOf, permTruth, combTruth, makeCase, calibChecks, closeness, isCalibrated,
  STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE COUNTS — against brute-force ENUMERATION of actual objects.
   ------------------------------------------------------------------------- */
/* enumerate every ordered arrangement of k from n, literally */
const enumArrangements = (n, k) => {
  let seqs = [[]];
  for (let s = 0; s < k; s++) {
    const next = [];
    for (const seq of seqs) for (let x = 0; x < n; x++) if (!seq.includes(x)) next.push([...seq, x]);
    seqs = next;
  }
  return seqs;
};
for (let n = 1; n <= 6; n++)
  for (let k = 0; k <= n; k++) {
    const seqs = enumArrangements(n, k);
    check(permOf(n, k) === seqs.length, `P(${n},${k}) = the literal census (${seqs.length})`);
    /* handfuls: distinct sorted sets among the arrangements */
    const sets = new Set(seqs.map((s) => [...s].sort().join(',')));
    check(combOf(n, k) === sets.size, `C(${n},${k}) = the handful census (${sets.size})`);
    /* the equal-stacks theorem: every handful appears exactly k! times */
    const stacks = new Map();
    for (const s of seqs) {
      const key = [...s].sort().join(',');
      stacks.set(key, (stacks.get(key) ?? 0) + 1);
    }
    for (const v of stacks.values()) check(v === factOf(k), `every handful stacks to ${k}! in (${n},${k})`);
    /* the symmetry: choosing k is leaving n−k */
    check(combOf(n, k) === combOf(n, n - k), `C(${n},${k}) = C(${n},${n - k})`);
  }
/* the factorials themselves, by hand */
check(factOf(0) === 1 && factOf(1) === 1 && factOf(2) === 2 && factOf(3) === 6 && factOf(4) === 24, 'the shuffle counts');
/* overdrawn pools refuse */
{
  let threw = false;
  try {
    permOf(3, 5);
  } catch {
    threw = true;
  }
  check(threw, 'a pool cannot fill more slots than it has members');
}
/* the slot rows quoted in the lesson */
check(slotsOf(4, 4).join('·') === '4·3·2·1' && 4 * 3 * 2 * 1 === 24, 'the full lineup: 24');
check(slotsOf(4, 2).join('·') === '4·3' && 4 * 3 === 12, 'the podium: 12');
check(combOf(4, 2) === 6 && 12 / 2 === 6, 'the pairs: 12 ÷ 2! = 6');
check(permOf(5, 3) === 60 && combOf(5, 3) === 10 && 60 / 6 === 10, 'the shelf: 60 ÷ 3! = 10');
check([1, 2, 3, 4, 5].map((k) => combOf(5, k)).join(',') === '5,10,10,5,1', 'the dial ladder 5, 10, 10, 5, 1');
check(permOf(5, 2) === 20 && permOf(5, 3) === 60, 'no ordered symmetry: 20 ≠ 60');
check(POOL.length >= 6, 'the pool can dress every posted case');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/4·3·2·1 = 24/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 multiplies the full lineup');
check(/4·3 = 12/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 stops early');
check(/AB, AC, AD, BA, BC, BD, CA, CB, CD, DA, DB, DC/.test(STEPS[1].note.replace(/\s+/g, ' ')), 'step 2 note lists all twelve');
check(/12 ÷ 2! = 6/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 pays the bill');
check(/ABC, ACB, BAC, BCA, CAB, CBA/.test(STEPS[3].feedback), 'step 4 lists the six shuffles');
check(/60 ÷ 3 = 20/.test(STEPS[3].choices.join('|')), 'the divide-by-k slip is offered');
check(/5, 10, 10, 5, 1/.test(STEPS[4].body), 'step 5 posts the ladder');
check(/tree bench/.test(STEPS[0].note), 'the tree bench boundary is drawn');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.n) && Number.isInteger(s.k) && s.k <= s.n, `step ${i} pins a legal (n, k)`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!STEPS[0].showBill && !STEPS[1].showBill && STEPS[2].showBill && !!STEPS[4].dial, 'the bill enters at step 3; the dial at step 5');
/* answer keys */
check(/^4·3·2·1 = 24/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key');
check(/^4·3 = 12/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key');
check(/^12 ÷ 2! = 6/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key');
check(/^60 ÷ 6 = 10/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key');
check(/^Choosing 2 to take IS choosing 3 to leave/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key');
check(/4⁴ = 256/.test(STEPS[0].choices.join('|')), 'the with-reuse belief is offered');
check(/counts never shrink/.test(STEPS[2].choices.join('|')), 'the free-lunch belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted pools');
const permsPosted = new Set(CASES.map((_, i) => permTruth(i)));
const combsPosted = new Set(CASES.map((_, i) => combTruth(i)));
check(PERM_CHIPS.every((p) => permsPosted.has(p)), 'every ordered chip is some case’s truth');
check(COMB_CHIPS.every((c) => combsPosted.has(c)), 'every unordered chip is some case’s truth');
/* the take-leave near-miss: two cases share a handful count with different ordered counts */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && combTruth(i) === combTruth(j) && permTruth(i) !== permTruth(j))),
  'two cases share C but not P — the symmetry made flesh'
);
for (let i = 0; i < CASES.length; i++) {
  const pT = permTruth(i);
  const cT = combTruth(i);
  check(PERM_CHIPS.includes(pT) && COMB_CHIPS.includes(cT), `case ${i}: truths are chips`);
  /* first principles, by literal enumeration */
  const { n, k } = CASES[i];
  check(pT === String(enumArrangements(n, k).length), `case ${i}: ordered truth by census`);
  check(cT === String(new Set(enumArrangements(n, k).map((s) => [...s].sort().join(','))).size), `case ${i}: unordered truth by census`);
  for (const pp of [null, ...PERM_CHIPS, 'bogus']) {
    for (const cp of [null, ...COMB_CHIPS]) {
      const should = pp === pT && cp === cT;
      check(isCalibrated(i, pp, cp) === should, `gate: case ${i} p=${pp} c=${cp}`);
      check([0, 50, 100].includes(closeness(i, pp, cp)), 'meter quantized');
    }
  }
  const wrongP = PERM_CHIPS.find((x) => x !== pT);
  check(closeness(i, wrongP, cT) === 0, `case ${i}: the bill without the ordered count earns nothing`);
  check(labelOf(i).includes(String(n)) && labelOf(i).includes(String(k)), `case ${i}: label posts the pool`);
}
check(calibChecks(null, '12', '6').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\btrees?\b(?! bench)|\bbranch|\bleaves\b|paths multiply/i, 'no branching (TreeDiagramLab; the bench-name citation is sanctioned)'],
  [/\bcrops?\b|\bframes?\b|denominator changes/i, 'no re-framing (ConditionalLab)'],
  [/probability of|favorable over|P\(A\)/i, 'counts only — the chance benches divide'],
  [/mean-cross|sign tally/i, 'no correlation machinery (CorrelationLab)'],
  [/census machinery|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency (the tree bench keeps its coin)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin|acos)/, 'no float math'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const permOf = \(n, k\) => \{/.test(code), 'ordered counts multiply live');
check(/if \(p % f !== 0\) throw/.test(code), 'the exact-division law is asserted');
check(/const CASES = \[\s*\{ n: 4, k: 2 \}/.test(code), 'cases are bare (n, k) — nothing ships counts');
/* the drawing reads the model */
check(/slotsOf\(S\.n, S\.k\)/.test(code), 'the slot row reads the model');
check(/S\.perm/.test(code) && /S\.comb/.test(code), 'the totals read the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-arrangements: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
