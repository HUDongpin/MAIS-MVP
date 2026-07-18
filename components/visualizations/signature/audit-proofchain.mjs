/* ============================================================================
   audit-proofchain.mjs — numeric proof for ProofChainLab.jsx
   (G-CO.C.9 · the chain of because; the dial cannot break it).

   Run:  node audit-proofchain.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ProofChainLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ProofChainLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, fmtDeg, anglesOf, LAWS, CIRCULAR,
            CHAIN, linkHolds, CASES, REASON_CHIPS, VALUE_CHIPS, labelOf,
            reasonTruth, valueTruth, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, fmtDeg, anglesOf, LAWS, CIRCULAR, CHAIN, linkHolds, CASES,
  REASON_CHIPS, VALUE_CHIPS, labelOf, reasonTruth, valueTruth, makeCase,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE CHAIN'S LAWS — every link holds at every dial position.
   ------------------------------------------------------------------------- */
for (let theta = 1; theta <= 179; theta++) {
  const [a1, a2, a3, a4] = anglesOf(theta);
  /* the stations */
  check(a1 === theta && a3 === theta && a2 === 180 - theta && a4 === 180 - theta, `stations at θ=${theta}`);
  check(a1 + a2 + a3 + a4 === 360, `full turn at θ=${theta}`);
  /* every link's claim holds — the dial cannot break the chain */
  for (let l = 0; l < 3; l++) check(linkHolds(l, theta), `link ${l + 1} holds at θ=${theta}`);
  /* the conclusion, by the splice: both equal 180 − a2 */
  check(a1 === 180 - a2 && a3 === 180 - a2, `the splice's shared expression at θ=${theta}`);
}
/* degenerate crossings refuse */
for (const t of [0, 180, -10]) {
  let threw = false;
  try {
    anglesOf(t);
  } catch {
    threw = true;
  }
  check(threw, `θ=${t} refuses — no genuine crossing`);
}
/* the chain is well-formed and never circular */
check(CHAIN.length === 3, 'three links');
check(CHAIN[0].law === 'linePair' && CHAIN[1].law === 'linePair' && CHAIN[2].law === 'sameThing', 'two laws fasten three links');
for (const link of CHAIN) {
  check(!!LAWS[link.law], 'every link cites a law from the table');
  check(LAWS[link.law] !== CIRCULAR, 'no link cites the theorem itself — no circularity');
}
check(!Object.values(LAWS).includes(CIRCULAR), 'the theorem is not on the law table');
/* the boring-but-covered right angle */
check(anglesOf(90).every((a) => a === 90), 'θ = 90: all four stations agree — covered, not special');
/* the worked instance */
check(50 + 130 === 180 && anglesOf(50).join(',') === '50,130,50,130', 'the θ = 50 instance');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/∠1 = 50°, ∠3 = 50°/.test(STEPS[0].body), 'step 1 posts the reading');
check(/50 \+ 130 = 180/.test(STEPS[1].body), 'step 2 posts the instance check');
check(/180° − ∠2/.test(STEPS[2].body) || /180° − ∠2/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 dangles the shared expression');
check(/90°/.test(STEPS[3].feedback) || /90°/.test(STEPS[3].note), 'the right-angle crossing is visited');
check(/law table for every later chain|tomorrow’s reason/.test(STEPS[4].feedback + STEPS[4].note), 'compounding is stated');
check(/transversal bench/.test(src.slice(0, importAt)), 'the transversal border is drawn in the header');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.theta) && s.theta > 0 && s.theta < 180, `step ${i} pins a legal θ`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!STEPS[0].showChain && STEPS[1].upTo === 1 && STEPS[2].upTo === 2 && !!STEPS[3].dial, 'the chain grows link by link; the dial tests it');
/* answer keys */
check(/^No — it certifies one dial position/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key');
check(/^A law already on the table/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key');
check(/^Both equal the same thing/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key');
check(/^Nothing — the claims and reasons are written in letters/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key');
check(/^That is the theorem under construction/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key');
check(/seeing is proving/.test(STEPS[0].choices.join('|')), 'the seeing-is-proving belief is offered');
check(/to save time/.test(STEPS[4].choices.join('|')), 'the shortcut temptation is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted chains');
const reasonsPosted = new Set(CASES.map((_, i) => reasonTruth(i)));
const valuesPosted = new Set(CASES.map((_, i) => valueTruth(i)));
check(reasonsPosted.has(LAWS.linePair) && reasonsPosted.has(LAWS.sameThing), 'both honest reasons are posted');
check(!reasonsPosted.has(CIRCULAR), 'the poison chip is NEVER a truth');
check(REASON_CHIPS.includes(CIRCULAR), 'and yet it stays on the chips as the standing trap');
check(VALUE_CHIPS.every((v) => valuesPosted.has(v)), 'every measure chip is some case’s truth');
/* the near-miss: same θ posted with different veiled links */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && CASES[i].theta === CASES[j].theta && reasonTruth(i) !== reasonTruth(j))),
  'one θ appears with both reasons — the link, not the angle, decides'
);
for (let i = 0; i < CASES.length; i++) {
  const rT = reasonTruth(i);
  const vT = valueTruth(i);
  check(REASON_CHIPS.includes(rT) && VALUE_CHIPS.includes(vT), `case ${i}: truths are chips`);
  check(vT === `${CASES[i].theta}°`, `case ${i}: the conclusion instance is θ itself`);
  check(linkHolds(CASES[i].link, CASES[i].theta), `case ${i}: the veiled link genuinely holds`);
  for (const rp of [null, ...REASON_CHIPS, 'bogus']) {
    for (const vp of [null, ...VALUE_CHIPS]) {
      const should = rp === rT && vp === vT;
      check(isCalibrated(i, rp, vp) === should, `gate: case ${i} r=${rp} v=${vp}`);
      check([0, 50, 100].includes(closeness(i, rp, vp)), 'meter quantized');
    }
  }
  check(closeness(i, CIRCULAR, vT) === 0, `case ${i}: the poison chip earns nothing, even with the right measure`);
  check(labelOf(i).includes(String(CASES[i].theta)), `case ${i}: label posts the dial`);
}
check(calibChecks(null, LAWS.linePair, '40°').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/transversal|\bparallel\b|corresponding angles|alternate interior/i, 'no transversal scene (TransversalLab)'],
  [/angle sum|interior angles|\btriangles?\b/i, 'no triangle tour (TriangleLab)'],
  [/inscribed|\barcs?\b(?!\()|central angle/i, 'no circle machinery (CircleTheoremsLab)'],
  [/undo machine|conveyor|pipeline/i, 'no machine (UndoLab)'],
  [/two columns|area bill/i, 'no matrix machinery (MatrixLab)'],
  [/census|constraint kit/i, 'no kit machinery'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b(?! —)/i, 'no slats or traps (IntegralLab; "standing trap" phrasing avoided)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|acos|asin)/, 'no float math in the model'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
check(!/Math\.(cos|sin)/.test(modelSrc), 'no trig in the model (the crossing is drawn in the renderer)');

/* verdicts must be DERIVED, never stored */
check(/const anglesOf = \(theta\) => \{/.test(code), 'the stations are computed live');
check(/const reasonTruth = \(i\) => LAWS\[CHAIN\[CASES\[i\]\.link\]\.law\]/.test(code), 'the reason truth reads the chain data');
check(/const CASES = \[\s*\{ link: 0, theta: 40 \}/.test(code), 'cases are bare (link, θ) — nothing ships reasons');
/* the drawing reads the model */
check(/S\.veiled === i \? 'because {2}\?'/.test(code) || /S\.veiled === i/.test(code), 'the veiled plaque reads the model');
check(/LAWS\[CHAIN\[i\]\.law\]/.test(code), 'the plaques print from the law table');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-proofchain: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
