/* ============================================================================
   audit-twodistributions.mjs — numeric proof for TwoDistributionsLab.jsx
   (7.SP.B.3–4 · two dot piles; the gap measured in spread-rulers).

   Run:  node audit-twodistributions.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./TwoDistributionsLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function TwoDistributionsLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
/* the styled-jsx block is CSS, not prose/logic — strip it for word greps */
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, SHAPES, dotsOf, nOf, sumOf, centerOf,
            rulerOf, spanOf, overlapOf, gapOf, rulersOf, PAIRS, CASES, GAP_CHIPS,
            RULER_CHIPS, labelOf, gapTruth, rulTruth, makeCase, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, SHAPES, dotsOf, nOf, centerOf, rulerOf, spanOf, overlapOf, gapOf,
  rulersOf, PAIRS, CASES, GAP_CHIPS, RULER_CHIPS, labelOf, gapTruth, rulTruth,
  makeCase, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE PILES — centers and rulers from first principles.
   ------------------------------------------------------------------------- */
check(Object.keys(SHAPES).length === 2, 'two pile shapes');
for (const shape of Object.keys(SHAPES)) {
  check(nOf(shape) === 10, `${shape}: ten dots`);
  /* symmetric rows: the multiset of offsets mirrors itself */
  const rows = SHAPES[shape].rows;
  for (const [o, k] of rows) check(rows.some(([o2, k2]) => o2 === -o && k2 === k), `${shape}: symmetric (${o})`);
  for (let c = 0; c <= 14; c++) {
    /* brute-force center: enumerate every dot */
    let s = 0;
    let n = 0;
    for (const [v, k] of dotsOf(c, shape)) {
      s += v * k;
      n += k;
    }
    check(s === n * c, `${shape} at ${c}: center exact by enumeration`);
    check(centerOf(c, shape) === c, `${shape} at ${c}: centerOf agrees`);
  }
  /* brute-force ruler: mean absolute distance, must be integral */
  let t = 0;
  for (const [v, k] of dotsOf(0, shape)) t += Math.abs(v) * k;
  check(t % 10 === 0 && rulerOf(shape) === t / 10, `${shape}: ruler from first principles`);
}
check(rulerOf('tight') === 1, 'the tight ruler is exactly 1');
check(rulerOf('wide') === 2, 'the wide ruler is exactly 2');

/* every dot a student sees is an integer value at integer count */
for (const shape of Object.keys(SHAPES))
  for (let c = 0; c <= 14; c++)
    for (const [v, k] of dotsOf(c, shape)) check(Number.isInteger(v) && Number.isInteger(k) && k > 0, 'integer dots');

/* ---------------------------------------------------------------------------
   3. THE SHARED STRETCH — overlap counts against brute enumeration.
   ------------------------------------------------------------------------- */
const bruteOverlap = (a, b, shape) => {
  const A = [];
  const B = [];
  for (const [v, k] of dotsOf(a, shape)) for (let j = 0; j < k; j++) A.push(v);
  for (const [v, k] of dotsOf(b, shape)) for (let j = 0; j < k; j++) B.push(v);
  const lo = Math.max(Math.min(...A), Math.min(...B));
  const hi = Math.min(Math.max(...A), Math.max(...B));
  return A.filter((v) => v >= lo && v <= hi).length + B.filter((v) => v >= lo && v <= hi).length;
};
for (const shape of ['tight', 'wide'])
  for (let a = 2; a <= 8; a++)
    for (let b = a; b <= 12; b++) {
      const sep = b - a > (spanOf(0, shape)[1] - spanOf(0, shape)[0]) ? 0 : bruteOverlap(a, b, shape);
      check(overlapOf(a, b, shape) === (sep === 0 ? 0 : bruteOverlap(a, b, shape)), `overlap ${shape} ${a},${b}`);
    }
/* the quoted counts */
check(overlapOf(6, 7, 'tight') === 18, 'tight at 6,7: 18 of 20 dots shared');
check(overlapOf(6, 10, 'tight') === 2, 'tight at 6,10: two dots shared');
check(overlapOf(6, 10, 'wide') === 12, 'wide at 6,10: twelve dots shared');
check([7, 8, 9, 10, 11].map((b) => overlapOf(6, b, 'tight')).join(',') === '18,12,8,2,0', 'the dial’s falling count 18, 12, 8, 2, none');

/* the lesson pairs */
check(PAIRS.close.a === 6 && PAIRS.close.b === 7 && PAIRS.close.shape === 'tight', 'the close pair');
check(PAIRS.apart.b === 10 && PAIRS.wide.b === 10 && PAIRS.wide.shape === 'wide', 'the apart and wide pairs');
check(!!PAIRS.slide.dial, 'the slide pair carries the dial');
check(rulersOf('tight', 6, 10) === 4 && rulersOf('wide', 6, 10) === 2, 'same gap: four rulers, then two');
/* every dial position keeps the division exact (tight ruler = 1) */
for (let b = 7; b <= 12; b++) check(Number.isInteger(rulersOf('tight', 6, b)), `dial b=${b}: rulers exact`);

/* ---------------------------------------------------------------------------
   4. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/18 of the 20 dots/.test(STEPS[0].choices[0]) && /18 of the 20 dots/.test(STEPS[0].feedback), 'step 1 quotes the 18-of-20 count');
check(/18, then 12, then 8, then\s+2/.test(STEPS[1].note.replace(/\s+/g, ' ')), 'step 2 quotes the falling counts');
check(/^Four — the gap holds four full rulers/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: four rulers');
check(/12\s+dots now stand in the shared stretch, up from 2/.test(STEPS[3].feedback.replace(/\s+/g, ' ')), 'step 4 quotes 12 up from 2');
check(/spread bench/.test(STEPS[2].body) && /spread bench/.test(STEPS[3].body), 'the ruler is credited to the spread bench');
check(3 / 1 > 4 / 2, 'the rule step’s verdict: three rulers beats two');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!PAIRS[s.pair], `step ${i} pair exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].pair === 'close' && STEPS[1].pair === 'slide' && STEPS[3].pair === 'wide', 'the pair ladder');
check(!STEPS[0].showRuler && !STEPS[1].showRuler && STEPS[2].showRuler && STEPS[3].showRuler, 'the ruler waits for step 3');
/* answer keys */
check(/^Barely — 18 of the 20/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: overlap murks the verdict');
check(/^Two — one dot from each pile/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: two dots');
check(/^Two — the ruler grew/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: half as many spreads');
check(/^Gap 3 with ruler 1/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: rulers beat units');
check(/bigger gaps always win|a gap is a gap/.test(STEPS[4].choices.join('|')), 'the bare-gap belief is offered');

/* ---------------------------------------------------------------------------
   6. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted pairs');
const gapsPosted = new Set(CASES.map((_, i) => gapTruth(i)));
const rulsPosted = new Set(CASES.map((_, i) => rulTruth(i)));
check(GAP_CHIPS.every((g) => gapsPosted.has(g)), 'every gap chip is some case’s truth');
check(RULER_CHIPS.every((r) => rulsPosted.has(r)), 'every ruler chip is some case’s truth');
/* near-miss structure: same gap, different ruler counts, must exist */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && gapTruth(i) === gapTruth(j) && rulTruth(i) !== rulTruth(j))),
  'two cases share a gap but not a ruler count'
);
for (let i = 0; i < CASES.length; i++) {
  const gT = gapTruth(i);
  const rT = rulTruth(i);
  check(GAP_CHIPS.includes(gT) && RULER_CHIPS.includes(rT), `case ${i}: truths are chips`);
  check(gT === String(centerOf(CASES[i].b, CASES[i].shape) - centerOf(CASES[i].a, CASES[i].shape)), `case ${i}: gap from first principles`);
  check(rT === String(Number(gT) / rulerOf(CASES[i].shape)), `case ${i}: rulers from first principles`);
  for (const gp of [null, ...GAP_CHIPS, 'bogus']) {
    for (const rp of [null, ...RULER_CHIPS]) {
      const should = gp === gT && rp === rT;
      check(isCalibrated(i, gp, rp) === should, `gate: case ${i} g=${gp} r=${rp}`);
      check([0, 50, 100].includes(closeness(i, gp, rp)), 'meter quantized');
    }
  }
  const wrongG = GAP_CHIPS.find((x) => x !== gT);
  check(closeness(i, wrongG, rT) === 0, `case ${i}: the rulers without the gap earn nothing`);
  check(labelOf(i).includes(String(CASES[i].a)) && labelOf(i).includes(String(CASES[i].b)), `case ${i}: label posts both centers`);
}
check(calibChecks(null, '2', '1').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/quartile|\bboxes?\b|whisker|five-number/i, 'no box machinery (BoxPlotLab)'],
  [/\bmedian\b|\bmode\b/i, 'no other centers (DataLab, MedianLab)'],
  [/variance|deviation/i, 'the ruler is borrowed, never derived (VarianceLab)'],
  [/\bmeans?\b|balance/i, 'centers are flags, not fulcrums (MeanLab)'],
  [/\bdrag/i, 'nothing is draggable (VarianceLab owns the drag)'],
  [/\bpond\b|\bdip\b|who got measured/i, 'no sampling story (SamplingLab)'],
  [/histogram|\bbins?\b/i, 'dots, not bars'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.sqrt/, 'all arithmetic is exact — nothing square-roots'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const overlapOf = \(a, b, shape\) => \{/.test(code), 'overlap is counted, not stored');
check(/const rulerOf = \(shape\) => \{/.test(code), 'the ruler is computed from the shape');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/gap:|ruler:|truth|answer/i.test(block), 'no case ships its own verdicts');
}
/* the drawing reads the model */
check(/overlapOf\(a, b, shape\)/.test(code), 'the shared-stretch readout reads the model');
check(/dotsOf\(c, S\.shape\)/.test(code), 'the piles are drawn from the model');
check(/rulerOf\(shape\)/.test(code), 'the drawn ruler reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-twodistributions: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
