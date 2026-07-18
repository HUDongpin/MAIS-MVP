/* ============================================================================
   audit-crosssection.mjs — numeric + geometric proof for CrossSectionLab.jsx
   (7.G.A.3 · slicing a cube; the surprise hexagon).

   Run:  node audit-crosssection.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./CrossSectionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function CrossSectionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, SIDE, CORNERS, EDGES, planeAt, sectionOf,
            dist2, orderSection, sidesOf, shapeOf, equalSided, SLICES, SHAPE_CHIPS,
            EQUAL_CHIPS, CASES, makeCase, planeOfCase, shapeTruth, equalTruth,
            calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, SIDE, CORNERS, EDGES, sectionOf, dist2, orderSection, sidesOf, shapeOf,
  equalSided, SLICES, SHAPE_CHIPS, EQUAL_CHIPS, CASES, makeCase, planeOfCase, shapeTruth,
  equalTruth, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE CUBE AND THE SECTIONS — exact vertex sets.
   ------------------------------------------------------------------------- */
check(CORNERS.length === 8 && EDGES.length === 12, 'eight corners, twelve edges');
check(SIDE === 2, 'the side-2 cube, for integer sections');

const sameSet = (got, want) => {
  if (got.length !== want.length) return false;
  return want.every((w) => got.some((g) => g[0] === w[0] && g[1] === w[1] && g[2] === w[2]));
};
/* the deck at each dial height */
for (const h of [0, 1, 2]) {
  const vs = sectionOf(SLICES.deck.pl(h));
  check(vs.length === 4, `deck h=${h}: four corners`);
  check(vs.every((v) => v[2] === h), `deck h=${h}: all at height h`);
  check(shapeOf(SLICES.deck.pl(h)) === 'square', `deck h=${h}: a square`);
  check(new Set(sidesOf(SLICES.deck.pl(h))).size === 1 && sidesOf(SLICES.deck.pl(h))[0] === 4, `deck h=${h}: side² = 4`);
}
/* the upright cut */
check(shapeOf(SLICES.upright.pl()) === 'square', 'x = 1: a square');
/* the tilt y = z: a rectangle with side² 4, 8 alternating */
{
  const pl = SLICES.tilt.pl();
  check(sameSet(sectionOf(pl), [[0, 0, 0], [2, 0, 0], [2, 2, 2], [0, 2, 2]]), 'y = z: the exact rectangle corners');
  check(shapeOf(pl) === 'rectangle', 'y = z: a rectangle, not a square');
  const s2 = sidesOf(pl).slice().sort((a, b) => a - b);
  check(s2.join(',') === '4,4,8,8', 'y = z: side² reads 4, 4, 8, 8');
}
/* the diagonal wall x + y = 2 */
check(shapeOf(SLICES.wall.pl()) === 'rectangle', 'x + y = 2: a rectangle');
/* the corner cut: the equilateral triangle */
{
  const pl = SLICES.corner.pl();
  check(sameSet(sectionOf(pl), [[2, 0, 0], [0, 2, 0], [0, 0, 2]]), 'the corner cut’s exact vertices');
  check(shapeOf(pl) === 'triangle' && equalSided(pl), 'an equilateral triangle');
  check(sidesOf(pl).every((s) => s === 8), 'triangle side² = 8');
}
/* the deep cut: the regular hexagon with integer corners */
{
  const pl = SLICES.deep.pl();
  const want = [[2, 1, 0], [1, 2, 0], [0, 2, 1], [0, 1, 2], [1, 0, 2], [2, 0, 1]];
  check(sameSet(sectionOf(pl), want), 'the hexagon’s exact integer corners');
  check(shapeOf(pl) === 'hexagon' && equalSided(pl), 'a regular hexagon');
  check(sidesOf(pl).every((s) => s === 2), 'hexagon side² = 2, all six');
}
/* every posted section lands on integers */
for (const id of Object.keys(SLICES)) {
  const pl = SLICES[id].pl(1);
  for (const v of sectionOf(pl)) check(v.every(Number.isInteger), `${id}: integer vertices`);
}
/* the side-count rule: sides = faces crossed (spot check via vertex counts) */
check(sectionOf(SLICES.corner.pl()).length === 3 && sectionOf(SLICES.deep.pl()).length === 6, 'three faces → 3 sides; six faces → 6');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/\(2,1,0\)/.test(STEPS[3].choices[0].replace(/\s/g, '')) || /\(2,1,0\)/.test(STEPS[3].choices[0]), 'step 4 quotes an integer corner');
check(/4, 8, 4, 8/.test(STEPS[1].feedback), 'step 2 quotes the rectangle’s side² pattern');
check(/side² reads 8|side² is exactly 2|each side² reads 8/.test(STEPS[2].feedback + STEPS[3].feedback), 'the exact side² facts are quoted');
check(/sphere bench/.test(STEPS[0].feedback), 'the round counterpart is cited');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!SLICES[s.slice], `step ${i} slice exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].slice === 'deck' && STEPS[3].slice === 'deep', 'the slice ladder');
/* answer keys */
check(/^The same 2 × 2 square/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: congruent decks');
check(/^A rectangle, not a square/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the stretch');
check(/^An equilateral triangle/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: three faces');
check(/^All six — and the section is a regular hexagon/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the hexagon');
check(/^No — seven sides would need seven faces/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: six is the ceiling');
check(/cubes give squares|Squares that shrink/.test(STEPS.map((s) => (s.choices || []).join('|')).join('|')), 'the squares-only belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted slices');
const shapesPosted = new Set(CASES.map((_, i) => shapeTruth(i)));
check(['triangle', 'square', 'rectangle', 'hexagon'].every((s) => shapesPosted.has(s)), 'all four shapes are posted');
check(CASES.some((_, i) => equalTruth(i) === EQUAL_CHIPS[0]) && CASES.some((_, i) => equalTruth(i) === EQUAL_CHIPS[1]), 'both side verdicts are posted');
for (let i = 0; i < CASES.length; i++) {
  const sT = shapeTruth(i);
  const eT = equalTruth(i);
  check(SHAPE_CHIPS.includes(sT) && EQUAL_CHIPS.includes(eT), `case ${i}: truths are chips`);
  check(sT === shapeOf(planeOfCase(i)), `case ${i}: shape truth from first principles`);
  check((eT === EQUAL_CHIPS[0]) === equalSided(planeOfCase(i)), `case ${i}: sides truth from first principles`);
  for (const sp of [null, ...SHAPE_CHIPS, 'bogus']) {
    for (const ep of [null, ...EQUAL_CHIPS]) {
      const should = sp === sT && ep === eT;
      check(isCalibrated(i, sp, ep) === should, `gate: case ${i} s=${sp} e=${ep}`);
      check([0, 50, 100].includes(closeness(i, sp, ep)), 'meter quantized');
    }
  }
  const wrongS = SHAPE_CHIPS.find((x) => x !== sT);
  check(closeness(i, wrongS, eT) === 0, `case ${i}: the sides without the shape earn nothing`);
}
check(calibChecks(null, 'square', 'all sides equal').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT.
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bcircles?\b/i, 'no round sections (SphereLab owns them; the bench is cited)'],
  [/\bvolume\b|surface area/i, 'no measurement of the solid (CubeLab / RectangularPrismLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.sqrt/, 'classification is exact side² arithmetic'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const sectionOf = \(pl\) => \{/.test(code), 'the section is intersected, not stored');
check(/const shapeOf = \(pl\) => \{/.test(code), 'the shape is classified from the vertices');
{
  const blockStart = code.indexOf('const SLICES = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/shape:|vert|hexagon|triangle/i.test(block), 'no slice ships its own section');
}
/* the drawing reads the model */
check(/orderSection\(sectionOf\(S\.plane\)\)/.test(code), 'the stage draws the computed section');
check(/sidesOf\(S\.plane\)/.test(code), 'the side² readout reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-crosssection: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
