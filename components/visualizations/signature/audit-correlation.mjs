/* ============================================================================
   audit-correlation.mjs — numeric proof for CorrelationLab.jsx
   (S-ID.C.8 · the sign tally and the share; r speaks only of lines).

   Run:  node audit-correlation.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./CorrelationLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function CorrelationLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, gcdOf, X, SETS, meanOf, devsOf,
            tallyOf, sums, signOf, r2Of, fracText, CASES, SIGN_CHIPS, R2_CHIPS,
            labelOf, signTruth, r2Truth, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, X, SETS, meanOf, devsOf, tallyOf, sums, signOf, r2Of, fracText,
  CASES, SIGN_CHIPS, R2_CHIPS, labelOf, signTruth, r2Truth, makeCase, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE TALLY AND THE SHARE — against float Pearson (float in the AUDIT only).
   ------------------------------------------------------------------------- */
check(X.join(',') === '1,2,3,4,5' && meanOf(X) === 3, 'x rides 1..5, mean exactly 3');
for (const key of Object.keys(SETS)) {
  const ys = SETS[key].y;
  check(ys.length === 5 && ys.reduce((t, v) => t + v, 0) % 5 === 0, `${key}: integer mean engineered`);
  const { sxy, sxx, syy } = sums(key);
  /* brute recomputation */
  const mx = 3;
  const my = meanOf(ys);
  let bxy = 0;
  let bxx = 0;
  let byy = 0;
  for (let i = 0; i < 5; i++) {
    bxy += (X[i] - mx) * (ys[i] - my);
    bxx += (X[i] - mx) * (X[i] - mx);
    byy += (ys[i] - my) * (ys[i] - my);
  }
  check(sxy === bxy && sxx === bxx && syy === byy, `${key}: sums match brute recomputation`);
  check(sxx === 10, `${key}: Σdx² is always 10 on this x`);
  /* r² against float Pearson */
  const rFloat = bxy / Math.sqrt(bxx * byy);
  const [n, d] = r2Of(key);
  check(Math.abs(n / d - rFloat * rFloat) < 1e-12, `${key}: exact r² matches float Pearson²`);
  check(0 <= n / d && n / d <= 1, `${key}: r² in [0, 1] — Cauchy–Schwarz holds`);
  /* the sign law: sign(Σdxdy) is the direction */
  const s = signOf(key);
  check(s === (bxy > 0 ? 'positive' : bxy < 0 ? 'negative' : 'zero'), `${key}: sign from the sum`);
  /* the tally's votes really are the quadrant memberships */
  const t = tallyOf(key);
  check(t.plus + t.minus + t.abstain === 5, `${key}: five votes cast`);
}
/* the showpieces */
check(fracText(r2Of('line')) === '1' && fracText(r2Of('down')) === '1', 'both perfect sets score exactly 1');
check(signOf('line') === 'positive' && signOf('down') === 'negative', 'and only the sign tells them apart');
check(fracText(r2Of('tight')) === '121/125', 'the tight cloud: 484/500 = 121/125');
check(22 * 22 === 484 && 10 * 50 === 500, 'and the raw numbers behind it');
check(fracText(r2Of('loose')) === '4/15' && 8 * 8 === 64 && 10 * 24 === 240, 'the loose cloud: 64/240 = 4/15');
check(fracText(r2Of('scatter')) === '0' && fracText(r2Of('curve')) === '0', 'two zeros: hash and the flawless parabola');
check(SETS.curve.y.join(',') === '4,1,0,1,4', 'the parabola is (x − 3)² exactly');
check(-4 + 1 + 0 - 1 + 4 === 0, 'the parabola’s cancellation, by hand');
check(tallyOf('tight').plus === 4 && tallyOf('tight').minus === 0 && tallyOf('tight').abstain === 1, 'the quoted tally 4/0/1');
/* a flat set must refuse */
{
  let threw = false;
  try {
    r2Of.call(null, 'flat');
  } catch {
    threw = true;
  }
  check(threw, 'a missing/flat set refuses');
}

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/4 positive, 0 negative, 1/.test(STEPS[0].feedback.replace(/\s+/g, ' ')), 'step 1 posts the tally');
check(/22²\/500 = 484\/500 = 121\/125/.test(STEPS[1].q.replace(/\s+/g, ' ')), 'step 2 runs the share');
check(/20²\/\(10·40\) = 400\/400 = 1/.test(STEPS[2].body), 'step 3 runs the perfect share');
check(20 * 20 === 400 && 10 * 40 === 400, 'and it is true');
check(/−4 \+ 1 \+ 0 − 1 \+ 4 = 0/.test(STEPS[3].feedback), 'step 4 shows the cancellation');
check(/lurking-variable\s+bench/.test(STEPS[4].note.replace(/\s+/g, ' ')), 'the causation boundary is ceded');
check(/y = 2x and y = x/.test(STEPS[2].note), 'the steepness foil is posted');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!SETS[s.set], `step ${i} set exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[2].set === 'line' && STEPS[3].set === 'curve' && !!STEPS[4].dial, 'the set ladder; the dial walks the clouds');
/* answer keys */
check(/^Above-average x AND above-average y together/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the rooms');
check(/^How close the cloud is to a straight line/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the share');
check(/^Only the sign/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: sign separates');
check(/^Exactly 0 — the agreement S/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the zero');
check(/^The no-story cloud and the perfect parabola/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: two zeros');
check(/The slope of the data/.test(STEPS[1].choices.join('|')), 'the slope confusion is offered');
check(/Exactly 1 — the pattern is perfect/.test(STEPS[3].choices.join('|')), 'the perfect-pattern belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted sets');
const signsPosted = new Set(CASES.map((_, i) => signTruth(i)));
const r2sPosted = new Set(CASES.map((_, i) => r2Truth(i)));
check(SIGN_CHIPS.every((s) => signsPosted.has(s)), 'all three signs are posted');
check(R2_CHIPS.every((r) => r2sPosted.has(r)), 'every share chip is some case’s truth');
/* the engineered near-miss: r² = 1 with opposite signs */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && r2Truth(i) === r2Truth(j) && signTruth(i) !== signTruth(j))),
  'two cases share a strength but not a sign'
);
for (let i = 0; i < CASES.length; i++) {
  const sT = signTruth(i);
  const rT = r2Truth(i);
  check(SIGN_CHIPS.includes(sT) && R2_CHIPS.includes(rT), `case ${i}: truths are chips`);
  for (const sp of [null, ...SIGN_CHIPS, 'bogus']) {
    for (const rp of [null, ...R2_CHIPS]) {
      const should = sp === sT && rp === rT;
      check(isCalibrated(i, sp, rp) === should, `gate: case ${i} s=${sp} r=${rp}`);
      check([0, 50, 100].includes(closeness(i, sp, rp)), 'meter quantized');
    }
  }
  const wrongS = SIGN_CHIPS.find((x) => x !== sT);
  check(closeness(i, wrongS, rT) === 0, `case ${i}: the share without the sign earns nothing`);
  check(labelOf(i) === SETS[CASES[i]].label, `case ${i}: label posts the set`);
}
check(calibChecks(null, 'positive', '1').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bconfound|is caused by|therefore causes|\bdrives\b/i, 'no causation verdicts (LurkingVariableLab; the boundary citation itself is required copy)'],
  [/spread-ruler|\bMAD\b|\bpiles?\b/i, 'no group comparison (TwoDistributionsLab)'],
  [/least squares|best fit|fitted line|regression/i, 'no line is fitted — r judges without producing'],
  [/\bslope triangle\b|rise over run/i, 'no line anatomy (LineFunctionLab)'],
  [/quadrant tally of chips|forcing court/i, 'no sibling devices'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin|acos)/, 'no float math in the lab'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
/* no decimal a student sees */
{
  const prose = codeSansCss.replace(/rgba\([^)]*\)/g, '').replace(/\+ 0\.5\b/g, '').replace(/0\.2\)/g, '');
  check(!/\b0\.\d/.test(prose.replace(/[0-9]+\.[0-9]+px/g, '')), 'REFUSAL violated: no decimal shares — fractions only');
}

/* verdicts must be DERIVED, never stored */
check(/const r2Of = \(key\) => \{/.test(code), 'the share is computed live');
check(/const tallyOf = \(key\) => \{/.test(code), 'the votes are counted live');
{
  const blockStart = code.indexOf('const SETS = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/r2|sign:|truth|tally/i.test(block), 'no set ships its own verdicts');
}
/* the drawing reads the model */
check(/devsOf\(X\)/.test(code) && /devsOf\(ys\)/.test(code), 'the votes are drawn from deviations');
check(/fracText\(S\.r2\)/.test(code), 'the share line reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-correlation: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
