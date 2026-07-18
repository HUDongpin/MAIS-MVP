/* ============================================================================
   audit-signedaddition.mjs — numeric + structural proof for
   SignedAdditionLab.jsx (7.NS.A.1 · the directed march; p − q = p + (−q)).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the rewrite law over the whole dial grid, the
   inverse law, commutativity of the march, every quoted landing, the
   stamp — and grep-enforce the refusals.

   Run:  node audit-signedaddition.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./SignedAdditionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function SignedAdditionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const codeSansCss = code.replace(/<style jsx>\{`[\s\S]*?`\}<\/style>/, '');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, ARROW_MAX, CALIB_STEP, fmtSigned, fmtSecond, marchOf,
            inverseOf, subRewrite, aimText, CASES, makeCase, fmtPair, rewriteTruth,
            rewriteChips, landTruth, landChips, calibChecks, closeness, isCalibrated,
            STEPS };`
)();
const {
  ARROW_MAX, CALIB_STEP, fmtSigned, fmtSecond, marchOf, inverseOf, subRewrite, aimText,
  CASES, makeCase, fmtPair, rewriteTruth, rewriteChips, landTruth, landChips, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE LAWS — proved over the whole dial grid.
   ------------------------------------------------------------------------- */
check(ARROW_MAX === 9, 'the dials run −9 … 9');
for (let p = -ARROW_MAX; p <= ARROW_MAX; p++) {
  /* the arrow home closes every march */
  check(marchOf(p, inverseOf(p)) === 0, `p=${p}: p + (−p) = 0`);
  check(inverseOf(inverseOf(p)) === p, `p=${p}: home of home is you`);
  for (let q = -ARROW_MAX; q <= ARROW_MAX; q++) {
    /* the march is honest integer addition */
    check(marchOf(p, q) === p + q, `march ${p},${q}`);
    /* commutativity: order never matters */
    check(marchOf(p, q) === marchOf(q, p), `march ${p},${q}: order-free`);
    /* THE rewrite law: p − q = the march of p and −q */
    const rw = subRewrite(p, q);
    check(rw.first === p && rw.second === -q, `rewrite ${p},${q}: (p, −q)`);
    check(marchOf(rw.first, rw.second) === p - q, `rewrite ${p},${q}: lands at p − q`);
  }
}

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS — every landing in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(marchOf(5, -3) === 2, '(+5) + (−3) lands at 2');
check(marchOf(-4, 7) === 3, '(−4) + 7 lands at 3');
check(marchOf(6, -6) === 0, '(+6) and its arrow home close at zero');
check(marchOf(...Object.values(subRewrite(5, 8))) === -3, '5 − 8 lands at −3');
check(marchOf(...Object.values(subRewrite(3, 7))) === -4, '3 − 7 lands at −4');
check(marchOf(...Object.values(subRewrite(5, -2))) === 7, '5 − (−2) lands at 7');
check(/\(−4\) \+ 7/.test(STEPS[1].q), 'step 2 poses (−4) + 7');
check(/5 − 8 and 5 \+ \(−8\)/.test(STEPS[3].body), 'step 4 shows the two readings');
check(/5 − \(−2\)/.test(STEPS[4].body), 'step 5 poses the famous one');
check(aimText(-3) === 'length 3, aimed left', 'the aim readout for −3');
check(aimText(3) === 'length 3, aimed right', 'the aim readout for +3');
check(fmtSigned(-4) === '−4' && fmtSigned(4) === '4', 'the signed format uses the true minus');
check(fmtSecond(-8) === '(−8)' && fmtSecond(2) === '(+2)', 'the second-arrow format is parenthesized');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.a) && Number.isInteger(s.b), `step ${i} arrows valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!!STEPS[0].single && !STEPS[1].single, 'one arrow first, then the march');
check(!!STEPS[2].inverse, 'the arrow home locks the second dial');
check(!!STEPS[3].sub && !!STEPS[4].sub, 'the unmasking owns steps 4 and 5');
check(STEPS[3].b === -STEPS[3].subQ && STEPS[4].b === -STEPS[4].subQ, 'the sub scenes march p and −q');
/* answer keys derived from the model */
check(/^An arrow: length 3, aimed left/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: length and aim');
check(/^3 — four of the seven steps/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: lands at 3');
check(/^−6 — same length, opposite aim/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the arrow home');
check(/^3 \+ \(−7\) — land at −4/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the rewrite');
check(/^7 — the opposite of −2/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: minus a minus');
/* the real beliefs are offered and refuted */
check(/11 — lengths always add/.test(STEPS[1].choices.join('|')), 'the lengths-add belief is offered');
check(/3 — subtraction always shrinks/.test(STEPS[4].choices.join('|')), 'the shrink belief is offered');
check(/smaller than anything/.test(STEPS[0].choices.join('|')), 'the mysticism belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted subtractions');
check(CASES.every((c) => c.p !== 0 && c.q !== 0 && c.p !== c.q), 'no degenerate case');
check(CASES.some((c) => c.q < 0), 'a subtract-a-negative case is posted');
for (let i = 0; i < CASES.length; i++) {
  const { p, q } = CASES[i];
  const rwChips = rewriteChips(i);
  const lChips = landChips(i);
  const rwT = rewriteTruth(i);
  const lT = fmtSigned(landTruth(i));
  check(rwChips.length === 4 && new Set(rwChips).size === 4, `case ${i}: four distinct rewrite chips`);
  check(lChips.length === 4 && new Set(lChips).size === 4, `case ${i}: four distinct landing chips`);
  check(rwChips.includes(rwT), `case ${i}: the rewrite truth is on a chip`);
  check(lChips.includes(lT), `case ${i}: the landing truth is on a chip`);
  /* first principles */
  check(rwT === fmtPair(p, -q), `case ${i}: rewrite truth is p + (−q)`);
  check(landTruth(i) === p - q, `case ${i}: landing truth is p − q`);
  check(marchOf(...Object.values(subRewrite(p, q))) === landTruth(i), `case ${i}: the rewrite marches to the landing`);
  /* the no-flip foil is offered */
  check(rwChips.includes(fmtPair(p, q)), `case ${i}: the no-flip belief is a chip`);
  for (const rp of [null, ...rwChips, 'bogus']) {
    for (const lp of [null, ...lChips]) {
      const should = rp === rwT && lp === lT;
      check(isCalibrated(i, rp, lp) === should, `gate: case ${i} rw=${rp} land=${lp}`);
      check([0, 50, 100].includes(closeness(i, rp, lp)), 'meter quantized');
    }
  }
  const wrongRw = rwChips.find((x) => x !== rwT);
  check(closeness(i, wrongRw, lT) === 0, `case ${i}: the landing without the rewrite earns nothing`);
}
check(calibChecks(null, 'x', 'y').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bhops?\b|count on|counting on/i, 'no count-on hop (AddLab)', code],
  [/mirror/i, 'no mirror at zero (IntegerLab)', code],
  [/\bflips?\b|parity/i, 'no flips, no parity (SignedNumbersLab)', code],
  [/multipl|\btimes\b|×\s*\(/i, 'nothing multiplies (SignedNumbersLab)', code],
  [/\bfold/i, 'no fold (AbsoluteValueLab)', code],
  [/\bdistance\b/i, 'the word distance never appears (AbsoluteValueLab)', code],
  [/number bond|part-part/i, 'no bond diagram (NumberBondLab)', code],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)', code],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)', code],
  [/mason|packing|leftover/i, 'no rearrangement machinery (PythagorasLab)', code],
  [/\b180\b/, 'no 180-degree talk (SignedNumbersLab owns the half-turn)', codeSansCss],
  [/Math\.sqrt/, 'nothing is square-rooted', code],
  [/requestAnimationFrame/, 'nothing animates — the march is a dial', code],
];
for (const [re, why, hay] of forbid) check(!re.test(hay), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const marchOf = \(a, b\) => a \+ b/.test(code), 'the landing is real addition');
check(/const subRewrite = \(p, q\) => \(\{ first: p, second: -q \}\)/.test(code), 'the rewrite is the law, in code');
check(/const inverseOf = \(a\) => -a/.test(code), 'the arrow home is derived');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/land|answer|truth/i.test(block), 'no case ships its own landing');
}
/* the drawing reads the model */
check(/marchOf\(S\.a, S\.b\)/.test(code), 'the landing dot reads the model');
check(/rewriteChips\(kase\)/.test(code) && /landChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-signedaddition: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
