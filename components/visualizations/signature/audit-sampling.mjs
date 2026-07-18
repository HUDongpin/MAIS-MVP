/* ============================================================================
   audit-sampling.mjs — numeric + structural proof for SamplingLab.jsx
   (7.SP.A.1–2 · the hidden pond; variation vs bias; pooling a logbook).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the pond's exact composition, the dipper driven by a
   deterministic injected rng (n distinct fish, right region, true spotted
   count), the pooled fractions, the provably-unique closest pond for every
   posted logbook, the stamp — and grep-enforce the refusals.

   Run:  node audit-sampling.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./SamplingLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function SamplingLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, NET_SIZES, CALIB_STEP, POND_TOTAL, POND_SPOTTED,
            DOCK_TOTAL, DOCK_SPOTTED, buildPond, POND, drawDip, gcdInt, fracText, PONDS,
            POND_CHIPS, CASES, makeCase, pooledOf, pooledTruth, pooledChips, pondTruthIdx,
            pondTruth, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  NET_SIZES, CALIB_STEP, POND_TOTAL, POND_SPOTTED, DOCK_TOTAL, DOCK_SPOTTED, buildPond,
  POND, drawDip, fracText, PONDS, POND_CHIPS, CASES, makeCase, pooledOf, pooledTruth,
  pooledChips, pondTruthIdx, pondTruth, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE POND — exact composition, recounted.
   ------------------------------------------------------------------------- */
check(POND.length === POND_TOTAL && POND_TOTAL === 200, 'two hundred fish');
check(POND.filter((f) => f.spotted).length === POND_SPOTTED && POND_SPOTTED === 60, 'sixty spotted');
check(POND.filter((f) => f.dock).length === DOCK_TOTAL && DOCK_TOTAL === 50, 'fifty at the dock');
check(POND.filter((f) => f.dock && f.spotted).length === DOCK_SPOTTED && DOCK_SPOTTED === 30, 'thirty spotted at the dock');
check(POND.filter((f) => !f.dock && f.spotted).length === 30, 'thirty spotted in open water');
POND.forEach((f, i) => check(f.dock === i < DOCK_TOTAL, `fish ${i}: dock region is the first fifty`));
check(DOCK_SPOTTED * 5 === 3 * DOCK_TOTAL, 'the dock reads 3 in 5 — the quoted slant');
check(buildPond().length === 200, 'the pond rebuilds identically');
check(JSON.stringify(buildPond()) === JSON.stringify(POND), 'the pond is deterministic');

/* ---------------------------------------------------------------------------
   3. THE DIPPER — driven by a deterministic injected rng.
   ------------------------------------------------------------------------- */
const fakeRng = (seq) => {
  let i = 0;
  return () => seq[i++ % seq.length];
};
const SEQS = [
  [0.13, 0.57, 0.91, 0.33, 0.72, 0.05, 0.48, 0.86],
  [0.99, 0.01, 0.5, 0.25, 0.75, 0.6, 0.4, 0.2],
  [0.0, 0.999, 0.31, 0.62, 0.93, 0.11, 0.44, 0.77],
];
for (const n of NET_SIZES) {
  for (const mode of ['fair', 'dock']) {
    for (const seq of SEQS) {
      const d = drawDip(n, mode, fakeRng(seq));
      check(d.n === n && d.picked.length === n, `dip n=${n} ${mode}: nets exactly n fish`);
      check(new Set(d.picked).size === n, `dip n=${n} ${mode}: all distinct`);
      check(d.picked.every((i) => i >= 0 && i < POND_TOTAL), `dip n=${n} ${mode}: fish from the pond`);
      if (mode === 'dock') check(d.picked.every((i) => POND[i].dock), `dip n=${n} dock: only dock fish`);
      check(d.k === d.picked.filter((i) => POND[i].spotted).length, `dip n=${n} ${mode}: k is the true spotted count`);
      check(d.k >= 0 && d.k <= n, `dip n=${n} ${mode}: k within range`);
    }
  }
}

/* ---------------------------------------------------------------------------
   4. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(fracText(60, 200) === '3/10', 'the pond’s truth reduces to 3/10');
check(CASES[0].draws.join(', ') === '12, 14, 11, 13, 15', 'the step-5 logbook is case A');
check(CASES[0].draws.reduce((a, b) => a + b, 0) === 65, 'the pool: 65 spotted');
check(pooledOf(0).den === 200, 'the pool: of 200 netted');
check(pooledTruth(0) === '13/40', '65 of 200 reduces to 13/40');
check(/12, 14, 11, 13, 15/.test(STEPS[4].body), 'step 5 quotes the logbook');
check(/65 spotted of 200/.test(STEPS[4].choices[0]), 'step 5 quotes the pool');
check(/60 of 200/.test(STEPS[4].feedback) || /60 of 200/.test(STEPS[4].body), 'the reveal posts the truth');
check(/3 in 5/.test(STEPS[3].feedback), 'the dock’s slant is quoted');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!!STEPS[1].dip && !STEPS[0].dip, 'the net unlocks at step 2');
check(!!STEPS[2].sizeDial && !STEPS[1].sizeDial, 'the size dial unlocks at step 3');
check(!!STEPS[3].modeChips, 'the dock mode arrives at step 4');
check(!!STEPS[4].reveal, 'the truth is revealed at step 5');
/* answer keys derived from the model */
check(/^The whole pond is out of reach/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: why sample');
check(/^No — estimates VARY/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: variation is normal');
check(/^The 40-net — bigger fair samples huddle/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: size steadies');
check(/^No — consistently WRONG/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: bias never shrinks');
check(/^Pool them — 65 spotted of 200/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the pool');
/* the real beliefs are offered and refuted */
check(/a working method gives one answer/.test(STEPS[1].choices.join('|')), 'the one-answer belief is offered');
check(/consistency is what accuracy means/.test(STEPS[3].choices.join('|')), 'the consistency belief is offered');
check(/biggest dip/.test(STEPS[4].choices.join('|')), 'the biggest-dip belief is offered');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 5, 'several posted logbooks');
check(POND_CHIPS.length === PONDS.length && new Set(POND_CHIPS).size === POND_CHIPS.length, 'distinct pond chips');
for (let i = 0; i < CASES.length; i++) {
  const { draws, n } = CASES[i];
  check(draws.length === 5 && n === 40, `case ${i}: five dips of 40`);
  check(draws.every((k) => Number.isInteger(k) && k >= 0 && k <= n), `case ${i}: counts in range`);
  const p = pooledOf(i);
  check(p.den === 200 && p.num === draws.reduce((a, b) => a + b, 0), `case ${i}: pool is total over total`);
  const chips = pooledChips(i);
  const poolT = pooledTruth(i);
  const pondT = pondTruth(i);
  check(chips.length === 4 && new Set(chips).size === 4, `case ${i}: four distinct pool chips`);
  check(chips.includes(poolT), `case ${i}: the pool truth is on a chip`);
  const val = (t) => t.split('/').map(Number);
  for (let j = 0; j + 1 < chips.length; j++) {
    const [a, b] = val(chips[j]);
    const [c, d] = val(chips[j + 1]);
    check(a * d < c * b, `case ${i}: pool chips ascend`);
  }
  /* the pond is the UNIQUE closest candidate */
  const best = pondTruthIdx(i);
  for (let j = 0; j < PONDS.length; j++) {
    if (j === best) continue;
    check(Math.abs(PONDS[best] - p.num) < Math.abs(PONDS[j] - p.num), `case ${i}: pond ${PONDS[best]} strictly closest (vs ${PONDS[j]})`);
  }
  check(pondT === POND_CHIPS[best], `case ${i}: the pond truth is the closest chip`);
  for (const pp of [null, ...chips, 'bogus']) {
    for (const qq of [null, ...POND_CHIPS]) {
      const should = pp === poolT && qq === pondT;
      check(isCalibrated(i, pp, qq) === should, `gate: case ${i} pool=${pp} pond=${qq}`);
      check([0, 50, 100].includes(closeness(i, pp, qq)), 'meter quantized');
    }
  }
  const wrongPool = chips.find((x) => x !== poolT);
  check(closeness(i, wrongPool, pondT) === 0, `case ${i}: the pond without the pool earns nothing`);
}
check(calibChecks(null, '13/40', '60 of 200').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/spinner|long.run/i, 'no spinner, no long-run chart (ProbabilityLab)'],
  [/\bbins?\b|histogram/i, 'no bins (HistogramLab)'],
  [/\bmean\b|\baverage\b/i, 'no mean, no average — the logbook is POOLED (MeanLab)'],
  [/\bMAD\b|quartile|whisker/i, 'spread is seen, never measured (VarianceLab / BoxPlotLab)'],
  [/percent/i, 'fractions stay fractions (PercentageLab)'],
  [/dot plot/i, 'the strip holds estimates, not data (DataLab)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover/i, 'no rearrangement machinery (PythagorasLab)'],
  [/\bmarch/i, 'no arrow marches (SignedAdditionLab)'],
  [/requestAnimationFrame/, 'nothing animates — the dip is a button'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const pondTruthIdx = \(i\) => \{/.test(code), 'the pond is found, not stored');
check(/const pooledOf = \(i\) => \{/.test(code), 'the pool is summed, not typed');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/pond|truth|answer/i.test(block), 'no logbook ships its own pond');
}
/* the dipper takes an injectable random source */
check(/const drawDip = \(n, mode, rng = Math\.random\)/.test(code), 'the dipper’s randomness is injectable');
/* the drawing reads the model */
check(/drawDip\(NET_SIZES\[sizeIdx\], mode\)/.test(code), 'the dip button uses the model');
check(/pooledChips\(kase\)/.test(code), 'the stamp chips come from the model');
check(/CASES\[S\.kase\]\.draws/.test(code), 'the posted logbook reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-sampling: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
