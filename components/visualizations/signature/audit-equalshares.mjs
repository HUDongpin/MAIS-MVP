/* ============================================================================
   audit-equalshares.mjs — numeric + structural proof for EqualSharesLab.jsx
   (1.G.A.3, 2.G.A.3 · halves/thirds/fourths; a share is not a shape).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — above all the GEOMETRY (shoelace areas, exact tiling)
   — grep-enforce the refusals, prove the stamp.

   Run:  node audit-equalshares.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./EqualSharesLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function EqualSharesLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, DIALS, G, CALIB_STEP, clampInt, sizeOf, CUTS, cutById, piecesOf,
            isFair, WORD_COUNT, SHARE_WORD, makeOrder, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, G, CALIB_STEP, clampInt, sizeOf, CUTS, cutById, piecesOf, isFair, WORD_COUNT, SHARE_WORD,
  makeOrder, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE GEOMETRY — every cut tiles the whole exactly, with integer areas.
   ------------------------------------------------------------------------- */
check(G === 12, 'the whole is a 12×12 grid');
check(sizeOf([[0, 0], [12, 0], [12, 12], [0, 12]]) === 144, 'shoelace sanity: the whole is 144 cells');
check(sizeOf([[0, 0], [12, 0], [12, 12]]) === 72, 'shoelace sanity: a half-square triangle is 72');

const FAIR_IDS = ['halvesV', 'halvesDiag', 'thirdsStrips', 'fourthsGrid', 'fourthsStrips', 'fourthsDiag'];
const UNFAIR_IDS = ['offcenter', 'thirdsUneq'];
check(CUTS.length === FAIR_IDS.length + UNFAIR_IDS.length, 'the cut table is exactly the eight cuts');

for (const cut of CUTS) {
  const areas = cut.polys.map(sizeOf);
  /* exact integer areas — even the diagonal cuts */
  areas.forEach((a) => check(Number.isInteger(a) && a > 0, `${cut.id}: integer piece area (got ${a})`));
  /* the cut tiles the whole: areas sum to 144 */
  check(areas.reduce((x, y) => x + y, 0) === G * G, `${cut.id}: pieces tile the whole exactly`);
  /* every vertex on the grid and in bounds */
  cut.polys.forEach((poly) =>
    poly.forEach(([x, y]) =>
      check(Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x <= G && y >= 0 && y <= G, `${cut.id}: vertex on the grid`)
    )
  );
  /* the piece count matches the word it claims */
  check(piecesOf(cut) === WORD_COUNT[cut.word], `${cut.id}: piece count matches its word`);
  /* FAIRNESS IS DERIVED, and it lands exactly where the design says */
  check(isFair(cut) === FAIR_IDS.includes(cut.id), `${cut.id}: fairness derived correctly`);
}
/* every fair cut's shares are exactly equal; every unfair cut genuinely lies */
for (const id of FAIR_IDS) {
  const areas = cutById(id).polys.map(sizeOf);
  check(new Set(areas).size === 1, `${id}: all shares exactly equal (${areas[0]} cells each)`);
}
for (const id of UNFAIR_IDS) {
  const areas = cutById(id).polys.map(sizeOf);
  check(new Set(areas).size > 1, `${id}: the greed is real (${areas.join(',')})`);
}
/* the centrepiece: the three fourths-cuts give the same share from identical
   wholes — a fourth is a share, not a shape */
{
  const shares = ['fourthsGrid', 'fourthsStrips', 'fourthsDiag'].map((id) => sizeOf(cutById(id).polys[0]));
  check(shares.every((s) => s === 36), `three shapes, one share: ${shares.join(' = ')} cells`);
}
/* more shares ⇒ smaller shares, on the same whole */
check(sizeOf(cutById('halvesV').polys[0]) > sizeOf(cutById('fourthsStrips').polys[0]), 'a half beats a fourth');
check(SHARE_WORD.halves === 'a half' && SHARE_WORD.fourths === 'a fourth', 'the share words are the standard’s');

/* ---------------------------------------------------------------------------
   3. LESSON STRUCTURE — chips unlock with the steps; scenes pinned; the trio
   lens shows exactly the three fair fourths.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Array.isArray(s.chips) && s.chips.length > 0, `step ${i} declares its chips`);
  s.chips.forEach((id) => check(!!cutById(id), `step ${i} chip ${id} exists`));
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
  check(s.demo && !!cutById(s.demo.cut), `step ${i} scene pinned`);
  check(s.chips.includes(s.demo.cut), `step ${i} demo cut is among its chips`);
});
check(DIALS.length === 0, 'no dials — chips are the control (shape-lab precedent)');
check(STEPS[1].chips.length === 1 && STEPS[1].chips[0] === 'offcenter' && STEPS[1].lens === 'overlay', 'step 2 is the fair-test trap');
check(!isFair(cutById(STEPS[1].demo.cut)), 'the trap cut genuinely is unfair');
check(
  STEPS[4].lens === 'trio' && STEPS[4].chips.join(',') === 'fourthsGrid,fourthsStrips,fourthsDiag',
  'the centrepiece trio is the three fair fourths'
);
check(STEPS[5].chips.length === CUTS.length, 'the bakery counter holds every cut');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — count AND fairness; same-count greedy decoys never stamp.
   ------------------------------------------------------------------------- */
for (const order of ['halves', 'thirds', 'fourths']) {
  for (const cut of CUTS) {
    const stamped = isCalibrated(cut.id, order);
    const should = piecesOf(cut) === WORD_COUNT[order] && isFair(cut);
    check(stamped === should, `stamp gate: ${cut.id} against an order of ${order}`);
    const p = closeness(cut.id, order);
    check((p === 100) === stamped, `meter 100 ⟺ stamp at ${cut.id}/${order}`);
    check([0, 50, 100].includes(p), 'meter quantized');
  }
  check(!isCalibrated(null, order), 'no pick, no stamp');
  /* every order is fillable, and its decoy pressure is real */
  const fills = CUTS.filter((c) => isCalibrated(c.id, order));
  check(fills.length >= 1, `an order of ${order} can be filled`);
}
/* the two greedy cuts specifically: right count, no stamp */
check(!isCalibrated('offcenter', 'halves'), 'the off-centre cut can never fill a halves order');
check(!isCalibrated('thirdsUneq', 'thirds'), 'the greedy thirds can never fill a thirds order');
for (let i = 0; i < 1000; i++) {
  const w = makeOrder(null);
  check(['halves', 'thirds', 'fourths'].includes(w), 'orders come in the three words');
}
for (let i = 0; i < 100; i++) check(makeOrder('thirds') !== 'thirds', 'a new order is genuinely new');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).  This
   is a PRE-FRACTION lab: no notation, no counting of units, no pie.
   ------------------------------------------------------------------------- */
const forbid = [
  [/numerator|denominator|fraction/i, 'no fraction vocabulary (FractionLab)'],
  // (CSS aspect-ratio lines are layout, not notation — strip them first)

  [/number.?line/i, 'no number line (FractionLab/RationalNumbersLab)'],
  [/\bpies?\b|sector|wedge/i, 'no pie (FractionLab owns it)'],
  [/unit square|count the (cells|squares)|\barea\b/i, 'no unit counting (AreaLab)'],
  [/\bjoin|seam|compose/i, 'no joining (ComposingShapesLab)'],
  [/hundred.?grid|10\s*×\s*10/i, 'no hundred-grid (DecimalLab/PercentageLab)'],
  [/ten.?frame/i, 'no ten-frame (CountingLab)'],
  [/requestAnimationFrame/, 'no rAF (K-tier: nothing animates)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);
{
  const noCss = code.split('\n').filter((l) => !l.includes('aspect-ratio')).join('\n');
  check(!/\d\s*\/\s*\d/.test(noCss), 'REFUSAL violated: no p/q notation anywhere (FractionLab)');
}

/* fairness must be DERIVED from geometry, never declared as data */
check(!/fair:\s*(true|false)/.test(code), 'no cut declares its own fairness');
check(/const isFair = \(cut\) => \{/.test(code), 'fairness is computed from the shipped polygons');
/* the whole is always a square/rectangle world — no arcs anywhere on stage */
{
  const drawSlice = code.slice(code.indexOf('const draw = useCallback'));
  check(!/\.arc\(/.test(drawSlice), 'nothing round is ever drawn — rectangles only, the pie stays refused');
}
/* the wrong answers preserve the misconceptions verbatim */
check(/one big half and one small half/i.test(code), 'the "bigger half" belief is offered and refuted');
check(/four beats two/i.test(code), 'the "more is bigger" belief is offered and refuted');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-equalshares: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
