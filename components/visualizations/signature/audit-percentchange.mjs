/* ============================================================================
   audit-percentchange.mjs — numeric + structural proof for
   PercentChangeLab.jsx (7.RP.A.3 · the multiplier chain; up-p-then-down-p
   never comes home; the reciprocal undo).

   Run:  node audit-percentchange.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./PercentChangeLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function PercentChangeLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, TAGS, CALIB_STEP, gcdInt, frac, fMul, fracText, multOf,
            tagText, stopsOf, netOf, CASES, makeCase, chainText, finalOf, finalTruth,
            finalChips, netTruth, netChips, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  TAGS, CALIB_STEP, frac, fMul, fracText, multOf, tagText, stopsOf, netOf, CASES, makeCase,
  chainText, finalOf, finalTruth, finalChips, netTruth, netChips, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE TAG LAWS — over the whole dial and beyond.
   ------------------------------------------------------------------------- */
const myGcd = (x, y) => {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) [x, y] = [y, x % y];
  return x || 1;
};
for (const p of TAGS) {
  const m = multOf(p);
  const g = myGcd(100 + p, 100);
  check(m.n === (100 + p) / g && m.d === 100 / g, `tag ${p}: exact reduced multiplier`);
  /* up p then down p: the asymmetry law ×(10000 − p²)/10000 */
  if (p > 0) {
    const net = fMul(multOf(p), multOf(-p));
    const g2 = myGcd(10000 - p * p, 10000);
    check(net.n === (10000 - p * p) / g2 && net.d === 10000 / g2, `±${p}: net is (10000 − p²)/10000`);
    check(net.n < net.d, `±${p}: never home — always a loss`);
    /* order-free */
    const net2 = fMul(multOf(-p), multOf(p));
    check(net.n === net2.n && net.d === net2.d, `±${p}: order-free`);
    /* the true undo is the reciprocal */
    const undo = fMul(multOf(p), frac(100, 100 + p));
    check(undo.n === 1 && undo.d === 1, `+${p}: the reciprocal undoes exactly`);
  }
}
/* chains multiply: stops agree with cumulative products */
for (const { start, tags } of CASES) {
  const stops = stopsOf(start, tags);
  let acc = frac(start);
  check(stops[0].n === start && stops[0].d === 1, `chain ${tags}: starts at start`);
  for (let k = 0; k < tags.length; k++) {
    acc = fMul(acc, multOf(tags[k]));
    check(stops[k + 1].n === acc.n && stops[k + 1].d === acc.d, `chain ${tags}: stop ${k + 1} exact`);
    check(stops[k + 1].d === 1, `chain ${tags}: stop ${k + 1} is an integer by engineering`);
  }
  const net = netOf(tags);
  const direct = fMul(multOf(tags[0]), multOf(tags[1]));
  check(net.n === direct.n && net.d === direct.d, `chain ${tags}: net = product of tags`);
  check(stops[stops.length - 1].n === (start * net.n) / net.d, `chain ${tags}: landing = start × net`);
}

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(fracText(multOf(20)) === '6/5' && fracText(multOf(-20)) === '4/5', 'the ±20% tags');
check(fracText(multOf(-25)) === '3/4' && fracText(multOf(25)) === '5/4', 'the ±25% tags');
check(fracText(netOf([20, -20])) === '24/25', 'up 20 then down 20 is ×24/25');
check(stopsOf(100, [20, -20]).map((f) => f.n).join(',') === '100,120,96', 'the 100 → 120 → 96 walk');
check(stopsOf(100, [-20, 20]).map((f) => f.n).join(',') === '100,80,96', 'the other order: 100 → 80 → 96');
check(stopsOf(400, [25, -20]).map((f) => f.n).join(',') === '400,500,400', 'the jacket comes home via −20%');
check((500 * 3) / 4 === 375, 'the −25% guess lands at 375');
check(stopsOf(400, [10, 10]).map((f) => f.n).join(',') === '400,440,484', 'compound interest: 484');
check(fracText(netOf([10, 10])) === '121/100', 'two years of 10% is ×121/100');
check(/24\/25/.test(STEPS[1].choices[0]) && /96/.test(STEPS[1].choices[0]), 'step 2 quotes the collapse');
check(/375/.test(STEPS[3].feedback), 'step 4 quotes the wrong-undo landing');
check(/484/.test(STEPS[4].choices[0]) && /121\/100/.test(STEPS[4].choices[0]), 'step 5 quotes the square');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.start) && Array.isArray(s.tags), `step ${i} scene valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!!STEPS[0].dial && !STEPS[1].dial, 'the tag dial belongs to step 1');
check(JSON.stringify(STEPS[1].tags) === JSON.stringify([20, -20]), 'step 2 walks the famous chain');
check(JSON.stringify(STEPS[2].tags) === JSON.stringify([-20, 20]), 'step 3 walks it backwards');
/* answer keys derived from the model */
check(/^Because a 20% rise means 120 per 100/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the tag');
check(/^96 — the fall takes 20% of 120/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: not home');
check(/^Tags multiply, and multiplication is order-free/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: order-free');
check(/^−20% — the reciprocal tag/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the undo');
check(/^484 — the tag squares/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: compounding');
/* the real beliefs are offered and refuted */
check(/up 20 and down 20 cancel/.test(STEPS[1].choices.join('|')), 'the cancel belief is offered');
check(/same number, other direction/.test(STEPS[3].choices.join('|')), 'the symmetric-undo belief is offered');
check(/ten percent twice is twenty percent/.test(STEPS[4].choices.join('|')), 'the additive belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted chains');
check(CASES.some((c) => fracText(netOf(c.tags)) === '1'), 'a comes-exactly-home chain is posted');
for (let i = 0; i < CASES.length; i++) {
  const fChips = finalChips(i);
  const nChips = netChips(i);
  const fT = finalTruth(i);
  const nT = netTruth(i);
  check(fChips.length === 4 && new Set(fChips).size === 4, `case ${i}: four distinct value chips`);
  check(nChips.length === 4 && new Set(nChips).size === 4, `case ${i}: four distinct tag chips`);
  check(fChips.includes(fT), `case ${i}: the value truth is on a chip`);
  check(nChips.includes(nT), `case ${i}: the tag truth is on a chip`);
  /* first principles */
  const { start, tags } = CASES[i];
  const net = netOf(tags);
  check(Number(fT) === (start * net.n) / net.d, `case ${i}: value truth from first principles`);
  check(nT === `× ${fracText(net)}`, `case ${i}: tag truth from first principles`);
  for (const fp of [null, ...fChips, 'bogus']) {
    for (const np of [null, ...nChips]) {
      const should = fp === fT && np === nT;
      check(isCalibrated(i, fp, np) === should, `gate: case ${i} final=${fp} net=${np}`);
      check([0, 50, 100].includes(closeness(i, fp, np)), 'meter quantized');
    }
  }
  const wrongF = fChips.find((x) => x !== fT);
  check(closeness(i, wrongF, nT) === 0, `case ${i}: the tag without the landing earns nothing`);
}
check(calibChecks(null, '96', '× 24/25').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(1) !== 1, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/100-grid|hundred grid|percent bar|double number line/i, 'no percent-of devices (PercentageLab)'],
  [/\bshade|shaded\b|\bcells?\b/i, 'nothing is shaded (PercentageLab)'],
  [/\bcoins?\b/i, 'no coins (FractionDivisionLab)'],
  [/\bsticks?\b|\bribbons?\b/i, 'no sticks or ribbons (UnitFractionDivisionLab)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.sqrt/, 'nothing is square-rooted'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const multOf = \(p\) => frac\(100 \+ p, 100\)/.test(code), 'the tag is the exact fraction');
check(/const netOf = \(tags\) => tags\.reduce/.test(code), 'the net is a product, not a constant');
check(/const stopsOf = \(start, tags\) => \{/.test(code), 'the stops are walked, not typed');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/final|net|answer|truth/i.test(block), 'no chain ships its own landing');
}
/* the drawing reads the model */
check(/stopsOf\(S\.start, S\.tags\)/.test(code), 'the stops read the model');
check(/netOf\(S\.tags\)/.test(code), 'the collapsed tag reads the model');
check(/finalChips\(kase\)/.test(code) && /netChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-percentchange: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
