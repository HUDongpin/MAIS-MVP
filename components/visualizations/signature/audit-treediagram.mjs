/* ============================================================================
   audit-treediagram.mjs — numeric proof for TreeDiagramLab.jsx
   (7.SP.C.8 · compound events; the tree of every way — paths multiply).

   Run:  node audit-treediagram.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./TreeDiagramLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function TreeDiagramLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, COIN, EXPS, leavesOf, totalOf, headsIn,
            EVENTS, favOf, gcdOf, fracOf, CASES, TOTAL_CHIPS, FAV_CHIPS, labelOf,
            totalTruth, favTruth, makeCase, calibChecks, closeness, isCalibrated,
            STEPS };`
)();
const {
  CALIB_STEP, COIN, EXPS, leavesOf, totalOf, headsIn, EVENTS, favOf, gcdOf, fracOf,
  CASES, TOTAL_CHIPS, FAV_CHIPS, labelOf, totalTruth, favTruth, makeCase, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE LAW — stage sizes multiply; the enumeration agrees, always.
   ------------------------------------------------------------------------- */
check(COIN.length === 2 && COIN[0] === 'H' && COIN[1] === 'T', 'the coin has two faces');
for (const exp of Object.keys(EXPS)) {
  const lvs = leavesOf(exp);
  /* the law, verified against brute enumeration */
  let want = 1;
  for (const st of EXPS[exp].stages) want *= st.length;
  check(totalOf(exp) === want && lvs.length === want, `${exp}: stage sizes multiply (${want})`);
  /* every leaf is a complete path word, one char per stage, all distinct */
  check(new Set(lvs).size === lvs.length, `${exp}: leaves distinct`);
  for (const lf of lvs) {
    check(lf.length === EXPS[exp].stages.length, `${exp}: full-length path`);
    [...lf].forEach((ch, s) => check(EXPS[exp].stages[s].includes(ch), `${exp}: char ${s} legal`));
  }
  /* every combination appears — the cartesian product is complete */
  const expected = EXPS[exp].stages.reduce((acc, st) => acc.flatMap((p) => st.map((o) => p + o)), ['']);
  check(expected.every((w) => lvs.includes(w)), `${exp}: no path missing`);
}
check(totalOf('coin1') === 2 && totalOf('coin2') === 4 && totalOf('coin3') === 8 && totalOf('coin4') === 16, 'the doubling cascade 2, 4, 8, 16');
check(totalOf('closet') === 6 && totalOf('closet3') === 12, 'the closet: 6 outfits; with hats, 3 × 2 × 2 = 12');

/* ---------------------------------------------------------------------------
   3. EVENTS — counted from predicates, against independent recomputation.
   ------------------------------------------------------------------------- */
const brute = (exp, f) => leavesOf(exp).filter(f).length;
check(favOf('coin2', 'exactlyOneH') === 2 && brute('coin2', (l) => headsIn(l) === 1) === 2, 'two coins, exactly one H: 2');
check(favOf('coin2', 'allH') === 1, 'two coins, H every time: 1 (HH)');
check(favOf('coin3', 'exactlyTwoH') === 3, 'three coins, exactly two H: 3');
{
  const bag = leavesOf('coin3').filter(EVENTS.exactlyTwoH.pred);
  check(['HHT', 'HTH', 'THH'].every((w) => bag.includes(w)) && bag.length === 3, 'the bag is HHT, HTH, THH');
}
check(favOf('coin3', 'atLeastOneT') === 7, 'three coins, at least one T: 7 of 8');
check(favOf('coin3', 'allMatch') === 2, 'all three match: HHH and TTT');
check(favOf('closet', 'redShirt') === 2 && favOf('closet', 'redJeans') === 1, 'the closet events: 2 and 1');
/* complement sanity: exactlyTwoH + its complement partition the 8 paths */
check(favOf('coin3', 'exactlyTwoH') + brute('coin3', (l) => headsIn(l) !== 2) === 8, 'events partition the tree');
/* fractions reduce by exact gcd */
check(fracOf(3, 8) === '3/8' && fracOf(2, 4) === '1/2' && fracOf(7, 8) === '7/8' && fracOf(2, 6) === '1/3', 'reduced fractions');
check(gcdOf(12, 8) === 4 && gcdOf(7, 8) === 1, 'gcd is exact');

/* ---------------------------------------------------------------------------
   4. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/2, 4, 8, 16/.test(STEPS[0].note), 'step 1 quotes the doubling cascade');
check(/2 × 2 = 4/.test(STEPS[1].feedback), 'step 2 quotes the multiplication');
check(/3 × 2 × 2/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key multiplies the stages');
check(/HHT, HTH, THH/.test(STEPS[3].choices[STEPS[3].answer]) && /HHT, HTH, THH/.test(STEPS[3].feedback), 'step 4 names the bag');
check(/3 of 8|3\/8/.test(STEPS[3].feedback) && /3\/8/.test(STEPS[4].feedback), 'the exact fraction is quoted');
check(/Three paths\s+say yes and five say no/.test(STEPS[4].feedback.replace(/\s+/g, ' ')), 'step 5 counts both sides: 3 + 5 = 8');
check(3 + 5 === totalOf('coin3'), 'and the sides really partition the tree');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!EXPS[s.exp], `step ${i} experiment exists`);
  if (s.ev) check(!!EVENTS[s.ev], `step ${i} event exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].exp === 'coin1' && STEPS[2].exp === 'closet' && STEPS[3].exp === 'coin3', 'the experiment ladder');
check(!!STEPS[0].dial && !!STEPS[1].dial && !STEPS[2].dial, 'the coin dial belongs to steps 1–2');
check(STEPS[3].ev === 'exactlyTwoH' && STEPS[4].ev === 'exactlyTwoH', 'the event enters at step 4');
/* answer keys */
check(/^A list of every way things can happen/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the inventory');
check(/^HT and TH are different walks/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: order lives in the path');
check(/^12 — multiply 3 × 2 × 2/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the law without the drawing');
check(/^3 — HHT, HTH, THH/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the count of the bag');
check(/^No — the equally likely things are the 8 paths/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: paths, not answers');
check(/50-50|1-in-2/.test(STEPS[4].q + STEPS[4].choices.join('|')), 'the 50-50 belief is offered and refuted');
check(/HT and TH are the same/.test(STEPS[1].choices.join('|')), 'the merge-the-orders belief is offered');

/* ---------------------------------------------------------------------------
   6. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted cases');
const totalsPosted = new Set(CASES.map((_, i) => totalTruth(i)));
const favsPosted = new Set(CASES.map((_, i) => favTruth(i)));
check(TOTAL_CHIPS.every((t) => totalsPosted.has(t)), 'every total chip is some case’s truth');
check(FAV_CHIPS.every((f) => favsPosted.has(f)), 'every favorable chip is some case’s truth');
/* near-miss structure: same total, different favorable — and vice versa */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && totalTruth(i) === totalTruth(j) && favTruth(i) !== favTruth(j))),
  'two cases share a total but not a favorable count'
);
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && favTruth(i) === favTruth(j) && totalTruth(i) !== totalTruth(j))),
  'two cases share a favorable count but not a total'
);
for (let i = 0; i < CASES.length; i++) {
  const tT = totalTruth(i);
  const fT = favTruth(i);
  check(TOTAL_CHIPS.includes(tT) && FAV_CHIPS.includes(fT), `case ${i}: truths are chips`);
  check(tT === String(leavesOf(CASES[i].exp).length), `case ${i}: total from enumeration`);
  check(fT === String(leavesOf(CASES[i].exp).filter(EVENTS[CASES[i].ev].pred).length), `case ${i}: favorable from first principles`);
  check(Number(fT) < Number(tT), `case ${i}: the event is a proper part of the tree`);
  for (const tp of [null, ...TOTAL_CHIPS, 'bogus']) {
    for (const fp of [null, ...FAV_CHIPS]) {
      const should = tp === tT && fp === fT;
      check(isCalibrated(i, tp, fp) === should, `gate: case ${i} t=${tp} f=${fp}`);
      check([0, 50, 100].includes(closeness(i, tp, fp)), 'meter quantized');
    }
  }
  const wrongT = TOTAL_CHIPS.find((x) => x !== tT);
  check(closeness(i, wrongT, fT) === 0, `case ${i}: the event without the total earns nothing`);
  check(labelOf(i).includes(EVENTS[CASES[i].ev].label), `case ${i}: label posts the event`);
}
check(calibChecks(null, '8', '3').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(4) !== 4, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/spinner|long.run|in the long|relative frequency|\btally\b/i, 'no long-run chance (ProbabilityLab)'],
  [/Math\.random\(\)\s*<|simulat/i, 'nothing is ever actually flipped'],
  [/common coin|currency|\btags?\b/i, 'the coin is flipped, never spent (FractionDivisionLab)'],
  [/expression tree|translat|operator/i, 'no expression tree (TranslateLab)'],
  [/factorial|permutation|arrangement/i, 'no arranging machinery'],
  [/\bpond\b|\bdip\b|who got measured/i, 'no sampling story (SamplingLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.sqrt/, 'all arithmetic is exact'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
/* no decimal a student sees: after stripping canvas color strings and the
   half-pixel/centering idioms, no 0.<digit> literal may remain anywhere */
{
  const prose = codeSansCss.replace(/rgba\([^)]*\)/g, '').replace(/\+ 0\.5\b/g, '');
  check(!/\b0\.\d/.test(prose), 'REFUSAL violated: no decimal probabilities — fractions only');
}
/* Math.random appears exactly once — picking the next calibration case */
check((codeSansCss.match(/Math\.random/g) || []).length === 2 && /makeCase/.test(modelSrc), 'randomness only picks cases');

/* verdicts must be DERIVED, never stored */
check(/const leavesOf = \(exp\) =>/.test(code), 'leaves come from the cartesian product');
check(/const favOf = \(exp, ev\) => leavesOf\(exp\)\.filter\(EVENTS\[ev\]\.pred\)\.length/.test(code), 'favorable counts are filtered, not stored');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/total|fav:|truth|answer|count/i.test(block), 'no case ships its own counts');
}
/* the drawing reads the model */
check(/leavesOf\(S\.exp\)/.test(code), 'the tree is drawn from the model');
check(/EVENTS\[S\.ev\]\.pred/.test(code), 'the carmine leaves are the predicate’s choices');
check(/fracOf\(S\.fav, S\.total\)/.test(code), 'the posted fraction reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-treediagram: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
