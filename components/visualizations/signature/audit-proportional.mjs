/* ============================================================================
   audit-proportional.mjs — numeric + structural proof for ProportionalLab.jsx
   (7.RP.A.2, 8.EE.B.5 · y = kx; the origin test; the fingerprint column).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the fingerprint law (constant y/x exactly for b = 0,
   drifting otherwise), the doubling test, the zero test, every quoted fare
   and ratio, the stamp — and grep-enforce the refusals.

   Run:  node audit-proportional.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ProportionalLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ProportionalLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, X_MAX, CALIB_STEP, frac, fAdd, fMul, fDiv, fEq, fracText,
            MACHINES, machineIds, yOf, ratioOf, isProp, KVALS, CASES, makeCase,
            VERDICT_CHIPS, K_CHIPS, verdictTruth, kTruth, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  X_MAX, CALIB_STEP, frac, fEq, fracText, MACHINES, machineIds, yOf, ratioOf, isProp,
  KVALS, CASES, makeCase, VERDICT_CHIPS, K_CHIPS, verdictTruth, kTruth, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE FINGERPRINT LAW — constant y/x ⟺ b = 0, proved over the walk.
   ------------------------------------------------------------------------- */
const allMachines = [
  ...Object.values(MACHINES),
  ...KVALS.map((k) => ({ k, b: frac(0) })),
  ...CASES,
];
for (const M of allMachines) {
  if (isProp(M)) {
    for (let x = 1; x <= 12; x++) {
      check(fEq(ratioOf(M, frac(x)), M.k), `prop ${fracText(M.k)}: y/x = k at x=${x}`);
      /* the doubling test passes */
      const y1 = yOf(M, frac(x));
      const y2 = yOf(M, frac(2 * x));
      check(y2.n * y1.d === 2 * y1.n * y2.d, `prop ${fracText(M.k)}: doubling doubles at x=${x}`);
    }
    check(yOf(M, frac(0)).n === 0, `prop ${fracText(M.k)}: zero in, zero out`);
  } else {
    /* the fingerprint drifts: adjacent rows never agree */
    for (let x = 1; x <= 7; x++) {
      check(
        !fEq(ratioOf(M, frac(x)), ratioOf(M, frac(x + 1))),
        `offset ${fracText(M.b)}: the column drifts at x=${x}`
      );
    }
    check(yOf(M, frac(0)).n !== 0, `offset ${fracText(M.b)}: charges before you start`);
    /* the doubling test fails somewhere */
    const y2 = yOf(M, frac(2));
    const y4 = yOf(M, frac(4));
    check(y4.n * y2.d !== 2 * y2.n * y4.d, `offset ${fracText(M.b)}: doubling fails`);
  }
}

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
const L = MACHINES.lemonade;
const T = MACHINES.taxi;
check(fracText(yOf(L, frac(1))) === '3' && fracText(yOf(L, frac(2))) === '6' && fracText(yOf(L, frac(5))) === '15', 'lemonade: 3, 6, 15');
check(fracText(yOf(L, frac(8))) === '24', 'eight cups cost 24');
check(fracText(yOf(L, frac(4))) === '12', 'lemonade doubles: 6 → 12');
check(fracText(yOf(T, frac(2))) === '7' && fracText(yOf(T, frac(4))) === '11', 'taxi: 7 then 11 — not double');
check(fracText(yOf(T, frac(0))) === '3', 'the taxi charges 3 at x = 0');
check(
  [1, 2, 3, 4].map((x) => fracText(ratioOf(T, frac(x)))).join(', ') === '5, 7/2, 3, 11/4',
  'the taxi’s drifting column: 5, 7/2, 3, 11/4'
);
check(fracText(yOf(MACHINES.print, frac(1))) === '1/2', 'the print: half a dollar each');
check(fracText(yOf(MACHINES.mystery, frac(4))) === '6', 'the mystery line passes (4, 6)');
check(fracText(MACHINES.mystery.k) === '3/2', 'the spill: k = 6/4 = 3/2');
check(/5, 7\/2, 3, 11\/4/.test(STEPS[2].body), 'step 3 quotes the drifting column');
check(/3, 6, 15 dollars/.test(STEPS[0].q), 'step 1 quotes the fares');
check(/2 miles → 7, 4 miles/.test(STEPS[1].q), 'step 2 quotes the taxi rows');
check(/\(4, 6\)/.test(STEPS[4].body), 'step 5 posts the spilled point');
check(/line bench/.test(STEPS[3].feedback), 'the line bench is cited for the +b');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!MACHINES[s.machine], `step ${i} machine exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].machine === 'lemonade' && STEPS[1].machine === 'taxi', 'the story opens honest, then meets the taxi');
check(!!STEPS[3].kDial && !STEPS[2].kDial, 'the k knob unlocks at step 4');
check(!!STEPS[4].point && STEPS[4].machine === 'mystery', 'the spilled point belongs to the mystery machine');
/* answer keys derived from the model */
check(/^24 — one number/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: 24');
check(/^11 — NOT double/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the taxi fails');
check(/^Proportionality — one k works/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the fingerprint');
check(/^Zero in, zero out/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the bolted origin');
check(/^3\/2 — k = y ÷ x/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the spill');
/* the real beliefs are offered and refuted */
check(/14 — doubling the miles doubles the fare/.test(STEPS[1].choices.join('|')), 'the doubling-always belief is offered');
check(/2\/3 — x over y/.test(STEPS[4].choices.join('|')), 'the inverted-ratio belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted machines');
check(CASES.some((c) => isProp(c)) && CASES.some((c) => !isProp(c)), 'both verdicts occur');
check(new Set(K_CHIPS).size === K_CHIPS.length && K_CHIPS.includes('no single k'), 'the k chips include the refusal');
for (let i = 0; i < CASES.length; i++) {
  const vT = verdictTruth(i);
  const kT = kTruth(i);
  check(VERDICT_CHIPS.includes(vT), `case ${i}: the verdict truth is a chip`);
  check(K_CHIPS.includes(kT), `case ${i}: the k truth is a chip`);
  check(isProp(CASES[i]) === (vT === VERDICT_CHIPS[0]), `case ${i}: verdict derived from b`);
  check(isProp(CASES[i]) === (kT !== 'no single k'), `case ${i}: k ruling matches the verdict`);
  /* the posted rows are display-friendly exact fractions (halves at worst) */
  for (let x = 1; x <= 4; x++) {
    const y = yOf(CASES[i], frac(x));
    check(y.d === 1 || y.d === 2, `case ${i} x=${x}: halves at worst`);
  }
  for (const vp of [null, ...VERDICT_CHIPS, 'bogus']) {
    for (const kp of [null, ...K_CHIPS]) {
      const should = vp === vT && kp === kT;
      check(isCalibrated(i, vp, kp) === should, `gate: case ${i} v=${vp} k=${kp}`);
      check([0, 50, 100].includes(closeness(i, vp, kp)), 'meter quantized');
    }
  }
  const wrongV = VERDICT_CHIPS.find((v) => v !== vT);
  check(closeness(i, wrongV, kT) === 0, `case ${i}: k without the verdict earns nothing`);
}
check(calibChecks(null, VERDICT_CHIPS[0], 'k = 2').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(3) !== 3, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\btape\b|double number line|\bbatch/i, 'no batch tape, no double number line (RatioLab)'],
  [/slope triangle|rise over run|rise\/run/i, 'no slope triangle, no rise counting (LineFunctionLab)'],
  [/mx \+ b/, 'the general line is not written here (LineFunctionLab; “the line bench” citation is allowed)'],
  [/residual|best fit|\btrend\b/i, 'no statistical clouds (ScatterPlotLab / BestFitLab)'],
  [/two-way/i, 'no categorical tables (TableLab)'],
  [/percent/i, 'no percent-of (PercentageLab)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover/i, 'no rearrangement machinery (PythagorasLab)'],
  [/Math\.sqrt/, 'nothing is square-rooted'],
  [/requestAnimationFrame/, 'nothing animates — the walk is a dial'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);
/* the word "slope" appears exactly twice — both times as k's third NAME
   (the lede and the step-4 reveal), never as a device */
check((code.match(/SLOPE|slope/g) || []).length === 2, 'the word slope appears exactly twice, as a name only');

/* verdicts must be DERIVED, never stored */
check(/const isProp = \(M\) => M\.b\.n === 0/.test(code), 'the verdict is derived from b');
check(/const ratioOf = \(M, x\) => fDiv\(yOf\(M, x\), x\)/.test(code), 'the fingerprint is a real division');
check(/const yOf = \(M, x\) => fAdd\(fMul\(M\.k, x\), M\.b\)/.test(code), 'the ledger rows are computed, not typed');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/verdict|proportional|truth/i.test(block), 'no case ships its own verdict');
}
/* the drawing reads the model */
check(/yOf\(S\.M, xf\)/.test(code), 'the ledger reads the model');
check(/ratioOf\(S\.M, xf\)/.test(code), 'the fingerprint column reads the model');
check(/isProp\(S\.M\)/.test(code), 'the verdict line reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-proportional: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
