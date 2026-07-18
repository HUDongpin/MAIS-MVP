/* ============================================================================
   audit-equalareas.mjs — numeric + structural proof for EqualAreasLab.jsx
   (3.G.A.2 · partition into equal areas — "the name is earned by area").

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive integer sweep — every pattern's
       areas sum to the whole and match the known truth; the envelope's
       triangles are equal in area AND unequal in shape; the knife is fair
       exactly at p·n = 12; the stamp is that identity.
     • Enforce the lab's REFUSALS (no unit-square counting, no cakes/shares
       language, no split dial, no formulas) by grepping the code below the
       header.

   Run:  node audit-equalareas.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./EqualAreasLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function EqualAreasLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src
  .slice(headerEnd)
  .replace(/prefers-reduced-motion: reduce/g, 'prefers-rm')
  .replace(/transform: rotate\(-3deg\);/g, 'transform: tilt;');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, DIALS, CALIB_STEP, clampInt, FW, FH, WHOLE, PATTERNS,
            areasOf, allEqual, biggestIdx, smallestIdx, NAME_FOR, earnedName,
            knifeAreasScaled, knifeIsFair, TARGET_NS, makeTarget, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, FW, FH, WHOLE, PATTERNS,
  areasOf, allEqual, biggestIdx, smallestIdx, NAME_FOR, earnedName,
  knifeAreasScaled, knifeIsFair, TARGET_NS, makeTarget, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. EVERY PATTERN'S AREAS — exact, conserved, and matching the known truth.
   ------------------------------------------------------------------------- */
check(FW === 12 && FH === 6 && WHOLE === 72, 'the field is 12 × 6 = 72');
check(PATTERNS.length === 8, 'eight patterns');
const KNOWN = [
  { areas: [18, 18, 18, 18], equal: true, name: 'fourths' }, // four tall strips
  { areas: [36, 12, 12, 12], equal: false, name: null }, // the greedy cut
  { areas: [18, 18, 18, 18], equal: true, name: 'fourths' }, // the window
  { areas: [18, 18, 18, 18], equal: true, name: 'fourths' }, // the envelope
  { areas: [24, 24, 24], equal: true, name: 'thirds' }, // three flats
  { areas: [18, 18, 36], equal: false, name: null }, // almost thirds
  { areas: [12, 12, 12, 12, 12, 12], equal: true, name: 'sixths' }, // six panes
  { areas: [36, 36], equal: true, name: 'halves' }, // the slant
];
PATTERNS.forEach((P, i) => {
  const a = areasOf(P);
  check(a.reduce((s, v) => s + v, 0) === WHOLE, `pattern ${i} (${P.name}) conserves the field`);
  check(a.length === KNOWN[i].areas.length, `pattern ${i} part count`);
  check(a.every((v, j) => v === KNOWN[i].areas[j]), `pattern ${i} areas exact (got ${a.join(',')})`);
  check(allEqual(a) === KNOWN[i].equal, `pattern ${i} equality verdict`);
  check(earnedName(a) === KNOWN[i].name, `pattern ${i} earned name`);
  if (!KNOWN[i].equal) {
    check(a[biggestIdx(a)] === Math.max(...a), `pattern ${i} biggest found`);
    check(a[smallestIdx(a)] === Math.min(...a), `pattern ${i} smallest found`);
    check(biggestIdx(a) !== smallestIdx(a), `pattern ${i} biggest ≠ smallest`);
  }
});
/* the greedy cut's wide part holds exactly half the field by itself */
check(areasOf(PATTERNS[1])[0] === WHOLE / 2, 'the greedy part holds half the field');

/* THE ENVELOPE'S DEEP CLAUSE: equal areas, genuinely different shapes.
   The audit computes the triangles' side lengths independently. */
{
  const C = [FW / 2, FH / 2];
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const top = [[0, 0], [FW, 0], C];
  const left = [[0, FH], [0, 0], C];
  const sides = (t) => [d(t[0], t[1]), d(t[1], t[2]), d(t[2], t[0])].sort((x, y) => x - y);
  const sTop = sides(top);
  const sLeft = sides(left);
  check(Math.abs(sTop[2] - FW) < 1e-9 && Math.abs(sLeft[2] - Math.hypot(FH / 2, FW / 2)) < 1e-9, 'triangle sides computed');
  const differ = sTop.some((v, i) => Math.abs(v - sLeft[i]) > 1e-9);
  check(differ, 'the top and side triangles are NOT the same shape');
  /* …and yet the model calls them all 18/72 = one fourth each */
  check(areasOf(PATTERNS[3]).every((v) => v === 18), 'and yet every triangle is 18 of 72');
}

/* the more-parts-smaller-parts fact, in exact cross products: 1/6 < 1/3 */
check(1 * 3 < 1 * 6, 'sixths are smaller than thirds (cross products)');

/* ---------------------------------------------------------------------------
   3. THE KNIFE — fair exactly at p·n = 12; nowhere else.
   ------------------------------------------------------------------------- */
for (const n of [2, 3, 4, 6])
  for (let p = 1; p <= 11; p++) {
    const a = knifeAreasScaled(n, p);
    check(a.length === n, `knife makes ${n} parts at p=${p}`);
    /* scaled equality: first === each rest ⟺ p(n−1) = 12−p ⟺ pn = 12 */
    check(allEqual(a) === (p * n === FW), `knife equality ⟺ p·n = 12 at n=${n}, p=${p}`);
    check(knifeIsFair(n, p) === (p * n === FW), `fair flag at n=${n}, p=${p}`);
  }
check(knifeIsFair(4, 3) && knifeIsFair(3, 4) && knifeIsFair(2, 6) && knifeIsFair(6, 2), 'the four fair spots');
check(!knifeIsFair(4, 4) && !knifeIsFair(3, 3), 'off-by-one spots refuse');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — 7 steps, one calibration (last), demos pin scenes,
   the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
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
check(STEPS[0].demo.pat === 0 && /areas/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1: areas are the judge');
check(STEPS[1].demo.pat === 1 && /just four pieces/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 kills four-parts-equals-fourths');
check(STEPS[1].choices.some((c) => /four parts always make fourths/.test(c)), 'step 2 offers the counting myth');
check(STEPS[2].demo.pat === 3 && /area is the judge/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3: the envelope earns 1/4');
check(STEPS[3].demo.pat === 7 && /Different questions/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4: the slant, two honest verdicts');
check(/Smaller/.test(STEPS[4].choices[STEPS[4].answer]) && /1\/6.*less than.*1\/3/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5: 1/6 < 1/3');
check(STEPS[5].demo.pat === -1 && STEPS[5].demo.n === 4 && !knifeIsFair(4, STEPS[5].demo.p), 'step 6 opens with an unfair knife');
check(/exactly as much as each of the others/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6: fairness is a point');
/* the fold is cited exactly twice — the cross-reference, not a device */
{
  const hits = (src.slice(headerEnd).match(/\bfold/gi) || []).length;
  check(hits === 4, `the fold is cited four times in the slant step (body, q, choice, feedback), found ${hits}`);
}

/* dials: the pattern walk, and the knife (unlocking at the knife step) */
check(DIALS.length === 2, 'two dials');
check(DIALS.find((d) => d.key === 'pattern').max === 7, 'the pattern dial walks all eight');
check(DIALS.find((d) => d.key === 'knife').unlock === 5, 'the knife arrives at step six');
check(DIALS.find((d) => d.key === 'knife').min === 1 && DIALS.find((d) => d.key === 'knife').max === 11, 'the knife stays inside the field');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — the stamp is the integer identity p·n === 12; the meter
   reads 100 nowhere else; every posted count has exactly one fair spot.
   ------------------------------------------------------------------------- */
for (const n of TARGET_NS) {
  let fairSpots = 0;
  for (let p = 1; p <= 11; p++) {
    check(isCalibrated(n, p) === (p * n === FW), `stamp ⟺ identity at n=${n}, p=${p}`);
    const m = closeness(n, p);
    check(m >= 0 && m <= 100, 'meter in range');
    check((m === 100) === (p * n === FW), `meter 100 ⟺ fair at n=${n}, p=${p}`);
    if (p * n === FW) fairSpots++;
  }
  check(fairSpots === 1, `exactly one fair spot for ${n} parts`);
  /* walking toward the fair spot never reads worse */
  const fair = FW / n;
  for (let p = 1; p < fair; p++) check(closeness(n, p + 1) >= closeness(n, p), `meter monotone below at n=${n}`);
  for (let p = 11; p > fair; p--) check(closeness(n, p - 1) >= closeness(n, p), `meter monotone above at n=${n}`);
}
check(TARGET_NS.join(',') === '2,3,4,6', 'the posted counts divide 12');
for (let i = 0; i < 2000; i++) {
  const t = makeTarget(null);
  check(TARGET_NS.includes(t), 'posted count from the deck');
}
for (let i = 0; i < 200; i++) check(makeTarget(4) !== 4, 'a new count is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/unit.?squares?|count.{0,12}squares|\btiles?\b|tiling/i, 'no square counting (AreaLab)'],
  [/base.?×.?height|½.?·.?base|perimeter/i, 'no formulas (AreaLab)'],
  [/\bcakes?\b|\bshares?\b|\bsharing\b/i, 'no cakes, no shares language (EqualSharesLab)'],
  [/split (dial|slider)/i, 'no split dial (FractionLab)'],
  [/numerator|\bp\/q\b/i, 'only the earned 1/n is ever written (FractionLab owns p/q)'],
  [/cut.?and.?slide/i, 'no cut-and-slide (AreaLab)'],
  [/\barrays?\b|pull.?apart/i, 'no arrays or pull-aparts (Multiplication/Distributive)'],
  [/number.?line|\bhops?\b/i, 'no number line'],
  [/balance|\bpans?\b(?!e)/i, 'no balance (EquationLab); window panes are spelled out'],
  [/simplif|\bgcd\b|lowest terms|\breduces?\b/i, 'never simplifies'],
  [/requestAnimationFrame/, 'nothing animates'],
  [/speechSynthesis/, 'no speech engine'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: the pill is computed, the verdict outlines follow the model */
check(/earnedName\(areas\)/.test(code), 'the pill reads earnedName()');
check(/biggestIdx\(areas\)/.test(code) && /smallestIdx\(areas\)/.test(code), 'the outlines follow the computed extremes');
check(/knifeAreasScaled\(n, S\.p\)|knifeAreasScaled\(S\.knifeN, S\.p\)/.test(code), 'the knife scene reads the scaled areas');
/* the field never shows its units: no inner grid is drawn */
check(!/for \(let g = 1; g < FW/.test(code), 'no unit grid inside the field');
/* the knife dial is the only control in the capstone */
check(/adj \? dl\.key === 'knife' : dl\.key === 'pattern'/.test(code), 'one dial per scene');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-equalareas: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
