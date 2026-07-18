/* ============================================================================
   audit-revolution.mjs — numeric proof for RevolutionLab.jsx
   (G-GMD.B.4 · the lathe; exact bills in π, Archimedes' 2/3 included).

   Run:  node audit-revolution.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./RevolutionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function RevolutionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, fmtInt, gcdOf, regionText,
            solidOf, coefOf, coefText, volumeText, SCENES, CASES, SOLID_CHIPS,
            COEF_CHIPS, labelOf, solidTruth, coefTruth, makeCase, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, gcdOf, regionText, solidOf, coefOf, coefText, volumeText, SCENES,
  CASES, SOLID_CHIPS, COEF_CHIPS, labelOf, solidTruth, coefTruth, makeCase,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE LATHE'S LAWS — exact identities across the whole dimension range.
   ------------------------------------------------------------------------- */
const eqFrac = ([a, b], [c, d]) => a * d === b * c;
for (let w = 1; w <= 10; w++)
  for (let h = 1; h <= 12; h++) {
    /* the cylinder bill */
    check(eqFrac(coefOf({ kind: 'rect', w, h }), [w * w * h, 1]), `cylinder bill (${w},${h})`);
    /* THE THIRD: cone = 1/3 of its bounding cylinder, as an exact identity */
    const cone = coefOf({ kind: 'tri', w, h });
    const cyl = coefOf({ kind: 'rect', w, h });
    check(eqFrac([cone[0] * 3, cone[1]], cyl), `cone = one third of its cylinder (${w},${h})`);
    /* integer bills whenever 3 | w²h */
    if ((w * w * h) % 3 === 0) check(cone[1] === 1, `cone bill integral when 3 divides (${w},${h})`);
  }
/* ARCHIMEDES: sphere = 2/3 of its snug cylinder (r, height 2r), every radius */
for (let r = 1; r <= 12; r++) {
  const sph = coefOf({ kind: 'half', r });
  const snug = coefOf({ kind: 'rect', w: r, h: 2 * r });
  check(eqFrac([sph[0] * 3, sph[1] * 2], snug), `sphere = two thirds of the snug cylinder (r=${r})`);
  check(eqFrac(sph, [4 * r * r * r, 3]), `sphere bill 4r³/3 (r=${r})`);
  if (r % 3 === 0) check(sph[1] === 1, `sphere bill integral at r=${r}`);
}
/* the worked bills */
check(coefText(coefOf(SCENES.cyl)) === '36' && 9 * 4 === 36, 'the 3×4 rectangle bills 36π');
check(coefText(coefOf(SCENES.cone)) === '18' && (9 * 6) / 3 === 18, 'the 3×6 triangle bills 18π');
check(coefText(coefOf(SCENES.sph)) === '36' && (4 * 27) / 3 === 36, 'the half-disc of 3 bills 36π');
check(coefText(coefOf({ kind: 'rect', w: 3, h: 6 })) === '54', 'the bounding cylinder bills 54π');
check(36 * 3 === 54 * 2, 'Archimedes: 36/54 = 2/3 exactly');
check(gcdOf(36, 54) === 18, 'and the reduction is honest');
/* the solids law */
check(solidOf({ kind: 'rect', w: 1, h: 1 }) === 'cylinder' && solidOf({ kind: 'tri', w: 1, h: 1 }) === 'cone' && solidOf({ kind: 'half', r: 1 }) === 'sphere', 'the three births');
/* the dial ladder: 4w² for h = 4 */
check([1, 2, 3, 4, 5].map((w) => coefText(coefOf({ kind: 'rect', w, h: 4 }))).join(',') === '4,16,36,64,100', 'the dial bills 4π..100π');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/π·3²·4 = 36π/.test(STEPS[0].feedback), 'step 1 runs the cylinder bill');
check(/54π/.test(STEPS[1].q) && /18π/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 posts both bills');
check(/4\/3·π·27 = 36π|4\/3·π·r³/.test(STEPS[2].feedback), 'step 3 runs the sphere bill');
check(/36π against 54π/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 compares the tombstone pair');
check(/4π, 16π, 36π, 64π, 100π/.test(STEPS[4].body + STEPS[4].feedback), 'step 5 posts the ladder');
check(/cylinder bench/.test(STEPS[0].feedback) && /cone bench/.test(STEPS[1].feedback) && /sphere bench/.test(STEPS[2].feedback), 'all three destination benches are credited');
check(/Archimedes/.test(STEPS[3].choices[STEPS[3].answer] + STEPS[3].feedback), 'Archimedes is credited by name');

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
check(STEPS[0].scene === 'cyl' && STEPS[1].scene === 'cone' && STEPS[2].scene === 'sph' && !!STEPS[4].dial, 'the scene ladder; the dial widens the rectangle');
/* answer keys */
check(/^The rim of the solid is swept/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: reach becomes radius');
check(/^18π — exactly one third/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the third');
check(/^One half-turn of sweep already reaches everywhere/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the half-disc');
check(/^2\/3 exactly/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the tombstone');
check(/^The rim sweeps a disc of area π·w²/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: reach counts twice');
check(/spinning fills the whole cylinder/.test(STEPS[1].choices.join('|')), 'the fills-anyway belief is offered');
check(/About 0\.67, never exact/.test(STEPS[3].choices.join('|')), 'the never-exact belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted regions');
const solidsPosted = new Set(CASES.map((_, i) => solidTruth(i)));
const coefsPosted = new Set(CASES.map((_, i) => coefTruth(i)));
check(SOLID_CHIPS.every((s) => solidsPosted.has(s)), 'all three solids are posted');
check(COEF_CHIPS.every((c) => coefsPosted.has(c)), 'every coefficient chip is some case’s truth');
/* the engineered near-miss: 36π from BOTH a cylinder and a sphere */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && coefTruth(i) === coefTruth(j) && solidTruth(i) !== solidTruth(j))),
  'two cases share a bill but not a solid'
);
for (let i = 0; i < CASES.length; i++) {
  const sT = solidTruth(i);
  const cT = coefTruth(i);
  check(SOLID_CHIPS.includes(sT) && COEF_CHIPS.includes(cT), `case ${i}: truths are chips`);
  /* first principles, restated independently */
  const rg = CASES[i];
  const want =
    rg.kind === 'rect' ? rg.w * rg.w * rg.h : rg.kind === 'tri' ? (rg.w * rg.w * rg.h) / 3 : (4 * rg.r * rg.r * rg.r) / 3;
  check(Number.isInteger(want) && cT === String(want), `case ${i}: integer bill from first principles`);
  for (const sp of [null, ...SOLID_CHIPS, 'bogus']) {
    for (const cp of [null, ...COEF_CHIPS]) {
      const should = sp === sT && cp === cT;
      check(isCalibrated(i, sp, cp) === should, `gate: case ${i} s=${sp} c=${cp}`);
      check([0, 50, 100].includes(closeness(i, sp, cp)), 'meter quantized');
    }
  }
  const wrongS = SOLID_CHIPS.find((x) => x !== sT);
  check(closeness(i, wrongS, cT) === 0, `case ${i}: the bill without the solid earns nothing`);
  check(labelOf(i) === regionText(rg), `case ${i}: label posts the region`);
}
check(calibChecks(null, 'cylinder', '36').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bslices?\b|(?<![</])\bsections?\b|\bdecks?\b/i, 'flat-to-solid only (CrossSectionLab owns the other direction; <section> is HTML)'],
  [/degree-slot|\bledgers?\b|deposit/i, 'no slot machinery (PolynomialArithmeticLab)'],
  [/surface area|\bnets?\b/i, 'volume manifests only — the solid benches own their surfaces'],
  [/equidistance|birth certificate|twin circles/i, 'no compass machinery (CompassLab)'],
  [/handshake|quarter turn/i, 'no slope machinery (PerpSlopeLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/3\.14/, 'π is a symbol, never a decimal'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin\(|acos)/, 'no float math'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'the spin is implied, never animated'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
/* Math.PI may appear only in the renderer (ctx.arc / ellipse angles) */
check(!/Math\.PI/.test(modelSrc), 'π never enters the model as a number');

/* verdicts must be DERIVED, never stored */
check(/const solidOf = \(rg\) =>/.test(code), 'the birth is read from the kind');
check(/const coefOf = \(rg\) => \{/.test(code), 'the bill is computed live');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/solid|coef|truth|answer|bill/i.test(block), 'no case ships its own manifest');
}
/* the drawing reads the model */
check(/coefText\(S\.coef\)/.test(code), 'the manifest reads the model');
check(/S\.solid === 'cylinder'/.test(code), 'the outline reads the born solid');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-revolution: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
