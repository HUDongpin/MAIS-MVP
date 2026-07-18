/* ============================================================================
   audit-linesrayssegments.mjs — numeric + structural proof for
   LinesRaysSegmentsLab.jsx (4.G.A.1 · the vocabulary of straightness —
   "the ends tell you everything").

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive sweep — the name-from-ends
       function over all four toggle states, the relation over all 144
       direction pairs, the parallel ⟺ no-intersection equivalence, and the
       exact card-stamp.
     • Enforce the lab's REFUSALS (no coordinates, no slope, no degrees or
       protractor, no ruler, no folding) by grepping the code below the
       header.

   Run:  node audit-linesrayssegments.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./LinesRaysSegmentsLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function LinesRaysSegmentsLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
/* the accessibility media query and the stamp's cosmetic tilt are house
   style, not lab language */
const code = src
  .slice(headerEnd)
  .replace(/prefers-reduced-motion: reduce/g, 'prefers-rm')
  .replace(/transform: rotate\(-3deg\);/g, 'transform: tilt;');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, DIALS, CALIB_STEP, clampInt, DIR_UNIT, nameOf, endsCount,
            hasLength, dirDiff, relationOf, crossingNames, intersectPoint, CARDS,
            cardIsRelation, makeTarget, satisfies, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, DIR_UNIT, nameOf, endsCount,
  hasLength, dirDiff, relationOf, crossingNames, intersectPoint, CARDS,
  cardIsRelation, makeTarget, satisfies, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE NAME IS A FUNCTION OF THE ENDS — all four toggle states.
   ------------------------------------------------------------------------- */
check(nameOf(false, false) === 'segment', 'two dots make a segment');
check(nameOf(true, false) === 'ray' && nameOf(false, true) === 'ray', 'one arrow makes a ray, either side');
check(nameOf(true, true) === 'line', 'two arrows make a line');
check(endsCount(false, false) === 2 && endsCount(true, false) === 1 && endsCount(true, true) === 0, 'ends count');
check(hasLength(false, false) === true, 'the segment has a length');
check(hasLength(true, false) === false && hasLength(false, true) === false, 'a ray has no length');
check(hasLength(true, true) === false, 'a line has no length');

/* ---------------------------------------------------------------------------
   3. RELATIONS ARE INDEX ARITHMETIC — all 144 direction pairs.
   ------------------------------------------------------------------------- */
for (let i1 = 0; i1 < 12; i1++)
  for (let i2 = 0; i2 < 12; i2++) {
    const k = dirDiff(i1, i2);
    check(k >= 0 && k < 12, `diff in range at ${i1},${i2}`);
    check(k === (((i1 - i2) % 12) + 12) % 12, `diff arithmetic at ${i1},${i2}`);
    const r = relationOf(i1, i2);
    check(r === (k === 0 ? 'parallel' : k === 6 ? 'perpendicular' : 'slant'), `relation at ${i1},${i2}`);
    check(relationOf(i2, i1) === r, `relation is symmetric at ${i1},${i2}`);
    const cn = crossingNames(i1, i2);
    if (r === 'parallel') check(cn === null, `no crossing to name at ${i1},${i2}`);
    else if (r === 'perpendicular') check(cn.kind === 'right', `right corners at ${i1},${i2}`);
    else check(cn.kind === 'slant', `sharp-and-wide at ${i1},${i2}`);
    /* the intersection exists exactly when not parallel */
    const P = intersectPoint([0, 0], i1, [40, 92], i2);
    if (r === 'parallel') check(P === null, `parallel pairs never meet at ${i1},${i2}`);
    else {
      check(Array.isArray(P) && Number.isFinite(P[0]) && Number.isFinite(P[1]), `crossing exists at ${i1},${i2}`);
      /* and the point genuinely lies on both straights (within float dust) */
      const on = (A, i, Q) => {
        const dx = Math.cos(i * DIR_UNIT);
        const dy = Math.sin(i * DIR_UNIT);
        const cross = (Q[0] - A[0]) * dy - (Q[1] - A[1]) * dx;
        return Math.abs(cross) < 1e-6;
      };
      check(on([0, 0], i1, P) && on([40, 92], i2, P), `the crossing lies on both at ${i1},${i2}`);
    }
  }
/* a perpendicular pair really is a quarter of the direction circle apart */
check(relationOf(1, 7) === 'perpendicular' && relationOf(0, 6) === 'perpendicular', 'six steps = square');
check(relationOf(2, 2) === 'parallel', 'zero steps = parallel');
check(relationOf(1, 4) === 'slant', 'three steps = slant');

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
  const dm = s.demo;
  check(dm && dm.d1 >= 0 && dm.d1 <= 11 && dm.d2 >= 0 && dm.d2 <= 11, `step ${i} demo in range`);
});
check(/keeps going forever/i.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 reads the arrow as forever');
check(nameOf(STEPS[1].demo.la, STEPS[1].demo.ra) === 'ray' && STEPS[1].choices[STEPS[1].answer] === 'Ray', 'step 2 scene and answer agree: ray');
check(/Only the segment/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3: only the segment has length');
check(relationOf(STEPS[3].demo.d1, STEPS[3].demo.d2) === 'parallel', 'step 4 scene is parallel');
check(/gap between them never changes/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 answer is the constant gap');
check(STEPS[3].choices.some((c) => /paper ends/.test(c)), 'step 4 offers the edge-of-paper trap');
check(relationOf(STEPS[4].demo.d1, STEPS[4].demo.d2) === 'perpendicular', 'step 5 scene is perpendicular');
check(/square corner/i.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 answer is the square-corner test');
check(relationOf(STEPS[5].demo.d1, STEPS[5].demo.d2) === 'slant', 'step 6 scene is a slant');
check(/acute.*obtuse|sharp.*wide/i.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 names the pairs');
check(STEPS[5].choices.some((c) => /protractor/.test(c)), 'step 6 refuses the protractor by name');

/* dials: two directions, the second unlocking with the relations */
check(DIALS.length === 2, 'two dials');
check(DIALS.find((d) => d.key === 'dir1').unlock === 0 && DIALS.find((d) => d.key === 'dir2').unlock === 3, 'second line arrives with parallel');
check(DIALS.every((d) => d.min === 0 && d.max === 11), 'directions are twelfths of a half-turn');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — the stamp is the exact predicate; the meter reads 100
   nowhere else; every card is satisfiable; near-misses read 50.
   ------------------------------------------------------------------------- */
check(Array.isArray(CARDS) && CARDS.length === 5, 'five cards');
for (const card of CARDS) {
  let sat = 0;
  for (const la of [false, true])
    for (const ra of [false, true])
      for (let i1 = 0; i1 < 12; i1++)
        for (let i2 = 0; i2 < 12; i2++) {
          const ok = satisfies(card, la, ra, i1, i2);
          check(isCalibrated(card, la, ra, i1, i2) === ok, `stamp is the predicate for ${card}`);
          const m = closeness(card, la, ra, i1, i2);
          check([0, 50, 100].includes(m), 'meter is the honest three-level readout');
          check((m === 100) === ok, `meter 100 ⟺ satisfied for ${card}`);
          if (ok) sat++;
        }
  check(sat >= 1, `card ${card} is satisfiable`);
}
/* the object cards ignore the directions; the relation cards ignore the ends */
check(satisfies('ray', true, false, 0, 0) && satisfies('ray', true, false, 5, 9), 'ray cares only about ends');
check(satisfies('parallel', false, false, 3, 3) && satisfies('parallel', true, true, 3, 3), 'parallel cares only about directions');
/* near-misses: one end off, or one click off square */
check(closeness('line', true, false, 0, 0) === 50, 'a ray is one end short of a line');
check(closeness('segment', true, true, 0, 0) === 0, 'a line is two ends short of a segment');
check(closeness('perpendicular', true, true, 0, 5) === 50, 'one click off square reads 50');
check(closeness('perpendicular', true, true, 0, 3) === 0, 'three clicks off square reads 0');
for (let i = 0; i < 500; i++) {
  const t = makeTarget(null);
  check(CARDS.includes(t), 'the card is from the deck');
}
for (let i = 0; i < 200; i++) check(makeTarget('ray') !== 'ray', 'a new card is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/coordinates?|ordered pair|\borigin\b|quadrant|x-axis|y-axis/i, 'no coordinate plane (PointLab)'],
  [/\bslope\b|y ?= ?m/i, 'no slope, no equation (LineFunctionLab)'],
  [/\bdegrees?\b|°|radian/i, 'no measuring of turn (the angle labs; the protractor is counted separately)'],
  [/\bruler\b|unit.?rods?|\bcubes?\b/i, 'no measuring of length (MeasurementLab)'],
  [/\bfold\b|mirror|symmetr/i, 'no folding (SymmetryLab)'],
  [/half.?turn|rotat/i, 'no spinning (ParallelogramLab)'],
  [/non.?defining|welded/i, 'no attribute panel (ShapesLab)'],
  [/\bsieve\b/i, 'no sieve'],
  [/balance|\bpans?\b/i, 'no balance (EquationLab)'],
  [/requestAnimationFrame/, 'nothing animates'],
  [/speechSynthesis/, 'no speech engine'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);
/* one narrow exception check: the word "protractor" IS allowed inside the
   step-6 refusal choice — exactly once, and nowhere else */
{
  const hits = (src.slice(headerEnd).match(/protractor/gi) || []).length;
  check(hits === 1, `the protractor appears exactly once (the refused choice), found ${hits}`);
}

/* structural: the plate and relations draw from the audited model */
check(/nameOf\(S\.la, S\.ra\)/.test(code), 'the name plate reads nameOf()');
check(/relationOf\(S\.d1, S\.d2\)/.test(code), 'the relation reads relationOf()');
check(/intersectPoint\(A1, S\.d1, A2, S\.d2\)/.test(code), 'the crossing comes from intersectPoint()');
/* the arrowheads run to the stage edge — the forever promise is drawn */
check(/runToEdge/.test(code), 'arrows run off the paper');
/* in relation scenes both objects are lines — relations are line-talk */
check(/const laEff = twoLines \? true : la/.test(code), 'relation scenes force lines');
/* the direction dial displays a position, never a measure */
check(/value \+ 1 : '🔒'/.test(code), 'the dial shows a position count, not a measure');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-linesrayssegments: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
