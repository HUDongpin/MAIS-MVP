/* ============================================================================
   audit-rationalexponent.mjs — numeric proof for RationalExponentLab.jsx
   (HSN-RN.A.1–2 · the forcing court; b^(p/q) decided by consistency).

   Run:  node audit-rationalexponent.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./RationalExponentLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function RationalExponentLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, rootInt, powInt, ratPow, candidatesOf,
            SCENES, CASES, ROOT_CHIPS, VAL_CHIPS, labelOf, rootTruth, valTruth,
            makeCase, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, rootInt, powInt, ratPow, candidatesOf, SCENES, CASES, ROOT_CHIPS,
  VAL_CHIPS, labelOf, rootTruth, valTruth, makeCase, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE ROOT ENGINE — bounded search against brute force; throws on inexact.
   ------------------------------------------------------------------------- */
for (let r = 1; r <= 12; r++)
  for (let q = 2; q <= 6; q++) {
    let b = 1;
    for (let i = 0; i < q; i++) b *= r;
    check(rootInt(b, q) === r, `rootInt(${b},${q}) = ${r}`);
    check(powInt(r, q) === b, `powInt(${r},${q}) = ${b}`);
  }
/* non-perfect powers must THROW, never approximate */
for (const [b, q] of [[2, 2], [63, 2], [65, 2], [26, 3], [10, 6], [48, 4]]) {
  let threw = false;
  try {
    rootInt(b, q);
  } catch {
    threw = true;
  }
  check(threw, `rootInt(${b},${q}) refuses to float`);
}
check(powInt(5, 0) === 1 && powInt(7, 1) === 7, 'the empty and single climbs');

/* the quoted verdicts */
check(rootInt(64, 2) === 8 && rootInt(64, 3) === 4 && rootInt(64, 6) === 2, 'the 64 verdicts: 8, 4, 2');
check(ratPow(64, 2, 3) === 16, '64^(2/3) = 16');
check(ratPow(64, 5, 6) === 32 && ratPow(16, 3, 4) === 8 && ratPow(27, 2, 3) === 9, 'the posted climbs');
check(ratPow(32, 3, 5) === 8 && ratPow(16, 3, 2) === 64, 'the remaining climbs');

/* ROUTE-INDEPENDENCE: (b^(1/q))^p === (b^p)^(1/q), exactly, for every case */
for (const { b, p, q } of CASES) {
  const rootFirst = powInt(rootInt(b, q), p);
  const powerFirst = rootInt(powInt(b, p), q);
  check(rootFirst === powerFirst, `${b}^(${p}/${q}): both routes agree (${rootFirst})`);
}
/* the worked example in step 4 */
check(powInt(64, 2) === 4096 && rootInt(4096, 3) === 16 && powInt(rootInt(64, 3), 2) === 16, 'the 4096 route');

/* the docket always contains the verdict, and only the verdict survives */
for (const { b, q } of CASES) {
  const cands = candidatesOf(b, q);
  const r = rootInt(b, q);
  check(cands.includes(r), `docket for ${b},${q} seats the verdict`);
  check(cands.every((v) => v >= 1), 'the court seats positives only');
  check(cands.filter((v) => powInt(v, q) === b).length === 1, `exactly one candidate survives ${b},${q}`);
}
/* the near-miss squeeze quoted in step 3 */
check(powInt(3, 3) === 27 && powInt(5, 3) === 125, 'the cube shortfall and overshoot: 27 and 125');

/* the ladder of sixths: 64^(k/6) = 2^k, all integers */
check(SCENES.ladder.b === 64 && !!SCENES.ladder.dial, 'the ladder rides base 64 with the dial');
for (let k = 0; k <= 6; k++) check(powInt(rootInt(64, 6), k) === powInt(2, k), `rung ${k}/6 = 2^${k}`);
check([0, 1, 2, 3, 4, 5, 6].map((k) => powInt(2, k)).join(',') === '1,2,4,8,16,32,64', 'the stations 1..64');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/8 · 8/.test(STEPS[1].choices[STEPS[1].answer]) && 8 * 8 === 64, 'step 2 quotes 8·8 = 64');
check(/4 · 4 · 4/.test(STEPS[2].choices[STEPS[2].answer]) && 4 * 4 * 4 === 64, 'step 3 quotes the cube');
check(/3 · 3 · 3 = 27/.test(STEPS[2].note) && /5 · 5 · 5 =\s*125/.test(STEPS[2].note.replace(/\s+/g, ' ')), 'step 3 note quotes the squeeze');
check(/4096/.test(STEPS[3].body) && /4² = 16/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 quotes both routes');
check(/1, 2, 4, 8, 16, 32, 64/.test(STEPS[4].feedback), 'step 5 quotes the stations');
check(/roots bench/.test(STEPS[2].feedback), 'the extraction craft is ceded to the roots bench');
check(/integer bench/.test(STEPS[0].body) && /exponential\s+bench/.test(STEPS[4].note.replace(/\s+/g, ' ')), 'siblings cited by bench name');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!SCENES[s.scene], `step ${i} scene exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].scene === 'half' && STEPS[2].scene === 'third' && STEPS[3].scene === 'twothirds' && STEPS[4].scene === 'ladder', 'the scene ladder');
/* answer keys */
check(/^Whatever keeps the laws true/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: consistency');
check(/^8 — only 8 · 8 lands on 64/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the verdict');
check(/^4 — because 4 · 4 · 4 = 64/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the cube');
check(/^Yes — \(64\^\(1\/3\)\)² = 4² = 16/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: routes agree');
check(/^The RATIO/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: equal steps multiply equally');
/* the real misconceptions are offered */
check(/Half of 64/.test(STEPS[0].choices.join('|')), 'the half-of-b belief is offered');
check(/Both 8 and −8/.test(STEPS[1].choices.join('|')), 'the ± belief is offered');
check(/The DIFFERENCE/.test(STEPS[4].choices.join('|')), 'the additive belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted powers');
const rootsPosted = new Set(CASES.map((_, i) => rootTruth(i)));
const valsPosted = new Set(CASES.map((_, i) => valTruth(i)));
check(ROOT_CHIPS.every((r) => rootsPosted.has(r)), 'every root chip is some case’s truth');
check(VAL_CHIPS.every((v) => valsPosted.has(v)), 'every value chip is some case’s truth');
/* near-miss structure both ways */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && rootTruth(i) === rootTruth(j) && valTruth(i) !== valTruth(j))),
  'two cases share a root but not a value'
);
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && valTruth(i) === valTruth(j) && rootTruth(i) !== rootTruth(j))),
  'two cases share a value but not a root'
);
for (let i = 0; i < CASES.length; i++) {
  const rT = rootTruth(i);
  const vT = valTruth(i);
  check(ROOT_CHIPS.includes(rT) && VAL_CHIPS.includes(vT), `case ${i}: truths are chips`);
  /* first principles: the root really q-folds to b, the value really p-folds the root */
  let acc = 1;
  for (let j = 0; j < CASES[i].q; j++) acc *= Number(rT);
  check(acc === CASES[i].b, `case ${i}: root truth q-folds to b`);
  let climb = 1;
  for (let j = 0; j < CASES[i].p; j++) climb *= Number(rT);
  check(String(climb) === vT, `case ${i}: value truth climbs the root`);
  for (const rp of [null, ...ROOT_CHIPS, 'bogus']) {
    for (const vp of [null, ...VAL_CHIPS]) {
      const should = rp === rT && vp === vT;
      check(isCalibrated(i, rp, vp) === should, `gate: case ${i} r=${rp} v=${vp}`);
      check([0, 50, 100].includes(closeness(i, rp, vp)), 'meter quantized');
    }
  }
  const wrongR = ROOT_CHIPS.find((x) => x !== rT);
  check(closeness(i, wrongR, vT) === 0, `case ${i}: the climb without the root earns nothing`);
  check(labelOf(i) === `${CASES[i].b}^(${CASES[i].p}/${CASES[i].q})`, `case ${i}: label posts the power`);
}
check(calibChecks(null, '4', '16').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(3) !== 3, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/factor train|\btiles?\b|\btrains?\b/i, 'no counting device (ExponentRulesLab)'],
  [/area-to-side|\bbracket/i, 'no extraction machinery (RootsLab)'],
  [/staircase|\bcurves?\b|smooth growth/i, 'no function graphs (ExponentialFunctionLab)'],
  [/\blogs?\b|logarithm/i, 'no logarithms (LogarithmLab)'],
  [/magnitude line|mantissa/i, 'no magnitude machinery (ScientificNotationLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp)/, 'roots by bounded integer search only'],
  [/\*\*/, 'no exponent operator — powers are repeated multiplication'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const rootInt = \(b, q\) => \{/.test(code), 'the root is searched, not stored');
check(/const ratPow = \(b, p, q\) => powInt\(rootInt\(b, q\), p\)/.test(code), 'the climb rides the root');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/root:|val|truth|answer/i.test(block), 'no case ships its own verdicts');
}
/* the drawing reads the model */
check(/candidatesOf\(S\.b, S\.q\)/.test(code), 'the docket is drawn from the model');
check(/powInt\(v, S\.q\)/.test(code), 'each candidate’s trial is computed live');
check(/rootInt\(S\.b, S\.q\)|S\.root/.test(code), 'the verdict reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-rationalexponent: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
