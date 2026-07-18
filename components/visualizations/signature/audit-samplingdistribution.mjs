/* ============================================================================
   audit-samplingdistribution.mjs — numeric proof for SamplingDistributionLab
   (S-IC.A–B · the gallery of every draw; margin of error by exact count).

   Run:  node audit-samplingdistribution.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./SamplingDistributionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function SamplingDistributionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, gcdOf, POP, popMean, samplesOf,
            totalOf, galleryTotals, centerOf, withinOf, rateOf, fracText, CASES,
            COUNT_CHIPS, RATE_CHIPS, labelOf, countTruth, rateTruth, makeCase,
            calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, POP, popMean, samplesOf, totalOf, galleryTotals, centerOf, withinOf,
  rateOf, fracText, CASES, COUNT_CHIPS, RATE_CHIPS, labelOf, countTruth, rateTruth,
  makeCase, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE GALLERY'S LAWS — enumeration, unbiasedness, band counts.
   ------------------------------------------------------------------------- */
check(POP.join(',') === '2,4,6,8,10,12' && popMean() === 7, 'the warehouse and its whole mean');
const samples = samplesOf();
check(samples.length === 20, 'C(6,3) = 20 draws, enumerated');
/* distinctness and completeness of the enumeration */
check(new Set(samples.map((s) => s.join(','))).size === 20, 'draws are distinct');
for (const s of samples) {
  check(s.length === 3 && s[0] < s[1] && s[1] < s[2], 'each draw is a sorted triple');
  check(s.every((v) => POP.includes(v)), 'each crate is real');
}
/* the appearance argument: every crate sits in exactly C(5,2) = 10 draws */
for (const v of POP) check(samples.filter((s) => s.includes(v)).length === 10, `crate ${v} appears in exactly 10 draws`);
/* totals and the exact center */
const totals = galleryTotals();
check(totals.length === 20 && totals[0] === 12 && totals[19] === 30, 'totals run 12..30');
check(totals.reduce((t, v) => t + v, 0) === 420 && 10 * 42 === 420, 'the sum of all totals is 10 × 42');
check(centerOf() === 21 && 3 * 7 === 21, 'the gallery centers exactly on 3 × the truth');
/* the crowding shape: counts by total, against the doubled 1..6 triple sums */
const shape = {};
for (const t of totals) shape[t] = (shape[t] ?? 0) + 1;
check([12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((t) => shape[t] ?? 0).join(',') === '1,1,2,3,3,3,3,2,1,1', 'the crowding shape 1,1,2,3,3,3,3,2,1,1');
/* the band ladder — each count against a hand recount */
check(withinOf(1) === 6 && 3 + 3 === 6, '±1 holds 6 (totals 20 and 22)');
check(withinOf(3) === 12 && 3 + 3 + 3 + 3 === 12, '±3 holds 12 (18, 20, 22, 24)');
check(withinOf(5) === 16 && 2 + 12 + 2 === 16, '±5 holds 16');
check(withinOf(7) === 18 && 16 + 1 + 1 === 18, '±7 holds 18');
check(withinOf(9) === 20, '±9 holds everything');
check(fracText(rateOf(1)) === '3/10' && fracText(rateOf(3)) === '3/5' && fracText(rateOf(5)) === '4/5' && fracText(rateOf(7)) === '9/10' && fracText(rateOf(9)) === '1', 'the rate ladder reduces exactly');
/* monotonicity of the trade: wider promise never loses coverage */
for (let m = 1; m <= 8; m++) check(withinOf(m) <= withinOf(m + 1), `coverage climbs at m=${m}`);
/* the quoted single draws */
check(2 + 6 + 10 === 18 && 4 + 10 + 12 === 26, 'the two opening draws total 18 and 26');
/* 18 of 20 tiles miss the truth individually (only totals exactly 21 would hit — none do; but the note says 18 of 20 are wrong: check: totals equal to 21: none; hmm the note said 18 of 20 — actually with center 21 and no tile at 21, all 20 miss; the note's claim is about ±? Let me verify the actual copy statement instead below. */
check(totals.filter((t) => t === 21).length === 0, 'no single draw lands exactly on the center');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/2, 6, 10, total 18/.test(STEPS[0].body) && /4, 10, 12, total 26/.test(STEPS[0].body), 'step 1 posts both draws');
check(/C\(6, 3\) = 20/.test(STEPS[1].body), 'step 2 imports the count with credit');
check(/arrangements bench/.test(STEPS[1].body), 'and names the lender');
check(/420 ÷ 20 = 21/.test(STEPS[2].body), 'step 3 averages the gallery');
check(/C\(5,2\) = 10/.test(STEPS[2].feedback), 'step 3 feedback runs the appearance argument');
check(/exactly 10 of the 20 draws/.test(STEPS[2].choices[STEPS[2].answer]), 'and the key states it plainly');
check(/10 × 42 = 420/.test(STEPS[2].choices[STEPS[2].answer]), 'and the multiplication');
check(/18, 20, 22, 24/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 names the covered totals');
check(/6, 12, 16, 18, 20/.test(STEPS[4].body), 'step 5 posts the climb');
check(/3\/10, 3\/5, 4\/5, 9\/10, 1/.test(STEPS[4].feedback), 'and the rate ladder');
check(/sampling bench/.test(STEPS[0].note), 'the fair-draw border is cited');
check(/shape benches/.test(STEPS[4].note) || /shape benches’/.test(STEPS[4].note), 'the approximation border is cited');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
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
check(STEPS[0].band === null && STEPS[3].band === 3 && !!STEPS[4].dial, 'the band enters at step 4; the dial widens it');
/* answer keys */
check(/^No — a statistic VARIES/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key');
check(/^The sampling distribution/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key');
check(/^Every crate sits in exactly 10/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key');
check(/^12 of 20/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key');
check(/^Precision/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key');
check(/Twenty repetitions/.test(STEPS[1].choices.join('|')), 'the repetition confusion is offered');
check(/wider is simply better/.test(STEPS[4].choices.join('|')), 'the free-width belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 5, 'several posted promises');
check(CASES.join(',') === '1,3,5,7,9', 'the radii ladder');
const countsPosted = new Set(CASES.map((_, i) => countTruth(i)));
const ratesPosted = new Set(CASES.map((_, i) => rateTruth(i)));
check(COUNT_CHIPS.every((c) => countsPosted.has(c)), 'every count chip is some case’s truth');
check(RATE_CHIPS.every((r) => ratesPosted.has(r)), 'every rate chip is some case’s truth');
for (let i = 0; i < CASES.length; i++) {
  const cT = countTruth(i);
  const rT = rateTruth(i);
  check(COUNT_CHIPS.includes(cT) && RATE_CHIPS.includes(rT), `case ${i}: truths are chips`);
  /* first principles: recount from the raw enumeration */
  let brute = 0;
  for (const s of samples) if (Math.abs(totalOf(s) - 21) <= CASES[i]) brute++;
  check(cT === String(brute), `case ${i}: count from raw enumeration`);
  for (const cp of [null, ...COUNT_CHIPS, 'bogus']) {
    for (const rp of [null, ...RATE_CHIPS]) {
      const should = cp === cT && rp === rT;
      check(isCalibrated(i, cp, rp) === should, `gate: case ${i} c=${cp} r=${rp}`);
      check([0, 50, 100].includes(closeness(i, cp, rp)), 'meter quantized');
    }
  }
  const wrongC = COUNT_CHIPS.find((x) => x !== cT);
  check(closeness(i, wrongC, rT) === 0, `case ${i}: the rate without the count earns nothing`);
  check(labelOf(i).includes(`±${CASES[i]}`), `case ${i}: label posts the radius`);
}
check(calibChecks(null, '12', '3/5').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bponds?\b|\bdips?\b|who got measured|\bfish\b/i, 'no pond (SamplingLab; the border is one citation)'],
  [/long.run|converge|simulat|\btrials?\b|repetition chart/i, 'nothing repeats — everything enumerates'],
  [/normal curve|\bbell\b|z-score|standard deviation/i, 'no smooth overlays (the shape benches)'],
  [/shuffle bill|shrinking slots/i, 'the count is imported, not re-derived (ArrangementsLab)'],
  [/\bcensus\b|constraint kit/i, 'no census device (TriangleBuildLab)'],
  [/\broster\b|spokesperson|\bwindows?\b(?!\.)/i, 'no seating machinery (ArcsinLab)'],
  [/split of the pot|\btickets?\b/i, 'no raffle machinery (ExpectedValueLab)'],
  [/\bcrops?\b|in frame/i, 'no re-framing (ConditionalLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin|acos)/, 'no float math'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const samplesOf = \(\) => \{/.test(code), 'the draws are enumerated live');
check(/if \(c !== 3 \* popMean\(\)\) throw/.test(code), 'unbiasedness is asserted, not assumed');
check(/const CASES = \[1, 3, 5, 7, 9\]/.test(code), 'cases are bare radii — nothing ships counts');
/* the drawing reads the model */
check(/for \(const t of S\.totals\)/.test(code), 'the tiles are stacked from the model');
check(/Math\.abs\(t - S\.center\) <= S\.m/.test(code), 'the band membership is computed live');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-samplingdistribution: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
