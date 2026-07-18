/* ============================================================================
   audit-symmetry.mjs — numeric + structural proof for SymmetryLab.jsx
   (4.G.A.3 · lines of symmetry; the mirror census).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — above all the CENSUS (every figure's full axis set,
   re-derived by exhaustive brute force, plus the completeness lemma that
   makes the brute force sufficient) — grep-enforce the refusals, prove the
   stamp.

   Run:  node audit-symmetry.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./SymmetryLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function SymmetryLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, DIAL, START_PHI, CALIB_STEP, mod360, isAxis, axesOf,
            FIGS, figById, countOf, makeTarget, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  DIAL, START_PHI, CALIB_STEP, mod360, isAxis, axesOf, FIGS, figById, countOf,
  makeTarget, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE SPOKES — integer, in range, distinct, and every figure pivots on its
   own balance point (the completeness lemma: every mirror line of a bounded
   figure passes through its centroid, so if the centroid is the pivot, the
   pencil of lines through the pivot contains EVERY candidate — and an axis
   of an integer spoke set must have integer doubled-angle, so the integer
   brute force below is exhaustive, not a sample).
   ------------------------------------------------------------------------- */
check(FIGS.length === 7, 'seven figures');
for (const f of FIGS) {
  const seen = new Set();
  for (const [t, r] of f.spokes) {
    check(Number.isInteger(t) && t >= 0 && t < 360, `${f.id}: integer angle ${t}`);
    check(r > 0, `${f.id}: positive radius`);
    check(!seen.has(t), `${f.id}: angles distinct`);
    seen.add(t);
  }
  /* centroid at the pivot (float only here, in the audit's lemma — the lab's
     own mirror test is pure integer arithmetic) */
  let cx = 0;
  let cy = 0;
  for (const [t, r] of f.spokes) {
    cx += r * Math.cos((t * Math.PI) / 180);
    cy += r * Math.sin((t * Math.PI) / 180);
  }
  check(Math.abs(cx) < 1e-9 && Math.abs(cy) < 1e-9, `${f.id}: vertex centroid sits on the pivot (${cx},${cy})`);
}

/* ---------------------------------------------------------------------------
   3. THE CENSUS — brute-force every possible axis and prove the ladder.
   An axis must map spokes to spokes: 2φ ≡ θi + θj (mod 360), so 2φ is an
   integer and checking every integer doubled-angle 0..359 is EXHAUSTIVE.
   ------------------------------------------------------------------------- */
const bruteAxes = (spokes) => {
  const out = [];
  for (let phi2 = 0; phi2 < 360; phi2++) {
    const ok = spokes.every(([t, r]) => spokes.some(([t2, r2]) => t2 === mod360(phi2 - t) && r2 === r));
    if (ok) out.push(phi2);
  }
  return out; // doubled angles; φ = phi2/2 and φ, φ+180 name the same line
};

const EXPECT = { para: 0, kite: 1, rect: 2, eqtri: 3, square: 4, pent: 5, hex: 6 };
const seenCounts = [];
for (const f of FIGS) {
  const brute = bruteAxes(f.spokes);
  /* lines, not directions: keep φ = phi2/2 in [0, 180) — phi2 in 0..359 gives
     each line twice (φ and φ+180 → phi2 and phi2+360 wrap); dedupe mod 360
     is already the line count since phi2 uniquely names 2φ mod 360... prove
     the pairing instead: phi2 and mod360(phi2+360) coincide, so brute IS the
     line list, one entry per line. */
  const lines = brute; // one phi2 per line: 2φ for φ in [0°,180°)
  check(lines.length === EXPECT[f.id], `${f.id}: census = ${EXPECT[f.id]} (got ${lines.length})`);
  seenCounts.push(lines.length);
  /* the shipped axesOf agrees with the exhaustive brute force */
  const shipped = axesOf(f.spokes).map((phi) => 2 * phi).sort((a, b) => a - b);
  check(
    shipped.join(',') === lines.slice().sort((a, b) => a - b).join(','),
    `${f.id}: axesOf finds exactly the true axes`
  );
  /* every true axis is reachable on the 3° dial */
  for (const phi2 of lines) {
    check(phi2 % 2 === 0, `${f.id}: axis at whole-degree φ (2φ=${phi2})`);
    const phi = phi2 / 2;
    check(phi % DIAL.step === 0 && phi >= DIAL.min && phi <= DIAL.max, `${f.id}: axis ${phi}° on the dial grid`);
  }
  /* the mirror test is an involution: reflecting twice restores every spoke */
  for (let phi = 0; phi < 180; phi += 3) {
    for (const [t] of f.spokes) {
      check(mod360(2 * phi - mod360(2 * phi - t)) === t, 'reflection is an involution');
    }
  }
}
/* THE LADDER: the seven counts are exactly {0,1,2,3,4,5,6} */
check(seenCounts.slice().sort().join(',') === '0,1,2,3,4,5,6', 'the census ladder: every count 0–6 exactly once');

/* the two named traps, proved against the shipped geometry */
check(!isAxis(figById('rect').spokes, 30), 'the rectangle diagonal (30°) genuinely fails');
check(isAxis(figById('square').spokes, 45), 'the square diagonal (45°) genuinely passes');
check(axesOf(figById('rect').spokes).join(',') === '0,90', 'rectangle: exactly 0° and 90°');
/* the parallelogram is a genuine (non-rectangular) parallelogram: spokes come
   in antipodal equal-radius pairs (central balance) with two distinct radii */
{
  const sp = figById('para').spokes;
  for (const [t, r] of sp) {
    check(sp.some(([t2, r2]) => t2 === mod360(t + 180) && r2 === r), 'para: antipodal pair (a true parallelogram)');
  }
  check(new Set(sp.map(([, r]) => r)).size === 2, 'para: two radii — not a rectangle');
  check(countOf(figById('para')) === 0, 'para: balanced about the centre, yet ZERO mirror lines');
}
/* regular n-gons: count equals n */
for (const [id, n] of [['eqtri', 3], ['square', 4], ['pent', 5], ['hex', 6]]) {
  check(figById(id).spokes.length === n && countOf(figById(id)) === n, `${id}: regular ${n}-gon owns exactly ${n}`);
}
/* the kite: exactly one, and it is the upright */
check(axesOf(figById('kite').spokes).join(',') === '90', 'kite: exactly the upright mirror');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned, chips exist, the traps sit where the
   design says.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  if (s.fig) check(!!figById(s.fig), `step ${i} pinned figure exists`);
  if (s.chips) {
    check(s.chips.length > 0, `step ${i} has chips`);
    s.chips.forEach((id) => check(!!figById(id), `step ${i} chip ${id} exists`));
    check(s.chips.includes(s.fig), `step ${i} demo figure is among its chips`);
  }
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
/* the answer KEY is tied to the model, not trusted as data: the correct
   choice must state the count the census actually derives */
check(/line of symmetry/i.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the vocabulary answer');
check(STEPS[1].choices[STEPS[1].answer] === String(countOf(figById('square'))), 'step 2 key: the square’s true count');
check(/centre/i.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: mirrors cross at the centre');
check(/^No/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the diagonal is refused');
check(
  new RegExp(`only ${countOf(figById('rect'))} `).test(STEPS[3].choices[STEPS[3].answer]),
  'step 4 key: states the rectangle’s true count'
);
check(STEPS[4].choices[STEPS[4].answer] === String(countOf(figById('pent'))), 'step 5 key: the pentagon’s true count');
check(
  STEPS[5].choices[STEPS[5].answer].startsWith(String(countOf(figById('para')))),
  'step 6 key: the parallelogram’s true zero'
);
check(STEPS[0].lockDial === true && STEPS[0].fig === 'square', 'step 1: dial locked on the square');
check(START_PHI === 90 && isAxis(figById('square').spokes, START_PHI), 'the locked opening shows a TRUE mirror line');
check(!STEPS[0].claim && !STEPS[1].claim && !!STEPS[2].claim, 'claiming unlocks at the census step');
check(STEPS[3].fig === 'rect', 'the diagonal trap runs on the rectangle');
check(STEPS[4].chips.join(',') === 'eqtri,pent,hex', 'the family ladder climbs 3, 5, 6');
check(STEPS[5].chips.join(',') === 'kite,para', 'one and none: the kite and the parallelogram');
check(DIAL.min === 0 && DIAL.max === 177 && DIAL.step === 3, 'the dial: 0..177 in 3° steps (φ ≡ φ+180)');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — census complete AND count declared; false claims can
   never pad the census; no partial census stamps.
   ------------------------------------------------------------------------- */
for (const f of FIGS) {
  const axes = axesOf(f.spokes);
  /* simulate the claim gate over every dial position: accepted ⟺ true axis */
  const accepted = [];
  for (let phi = DIAL.min; phi <= DIAL.max; phi += DIAL.step) {
    if (isAxis(f.spokes, phi)) accepted.push(phi);
  }
  check(accepted.join(',') === axes.join(','), `${f.id}: the claim gate admits exactly the true axes`);

  /* full census + right declaration ⇒ stamp; anything less ⇒ no stamp */
  check(isCalibrated(f.id, axes, axes.length), `${f.id}: complete census + true count stamps`);
  for (let d = 0; d <= 6; d++) {
    if (d !== axes.length) check(!isCalibrated(f.id, axes, d), `${f.id}: wrong declaration ${d} never stamps`);
  }
  if (axes.length > 0) {
    const partial = axes.slice(0, axes.length - 1);
    check(!isCalibrated(f.id, partial, axes.length), `${f.id}: partial census never stamps`);
    check(closeness(f.id, partial, axes.length) < 100, `${f.id}: meter below 100 on a partial census`);
  } else {
    check(isCalibrated(f.id, [], 0), `${f.id}: the zero figure stamps on an honest empty census + 0`);
  }
  check(!isCalibrated(f.id, axes, null), `${f.id}: no declaration, no stamp`);
  const p = closeness(f.id, axes, axes.length);
  check(p === 100, `${f.id}: meter reads 100 exactly at the stamp`);
}
for (let i = 0; i < 500; i++) {
  const id = makeTarget(null);
  check(FIGS.some((f) => f.id === id), 'targets come from the figure table');
}
for (let i = 0; i < 100; i++) check(makeTarget('square') !== 'square', 'a new figure is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   Reflection devices are owned four times over in this library; this lab
   must stay in its census corner, on paper (not a plane), with no animation.
   ------------------------------------------------------------------------- */
const forbid = [
  [/y\s*=\s*x\b/, 'no y = x mirror (LogarithmLab)'],
  [/inverse/i, 'no inverse-function story (LogarithmLab)'],
  [/absolute value|\|\s*x\s*\|/i, 'no absolute value (AbsoluteValueLab)'],
  [/crease/i, 'no crease (CommutativeLab / AbsoluteValueLab)'],
  [/half.?turn/i, 'no half-turn device (ParallelogramLab)'],
  [/ctx\.rotate\(/, 'nothing on stage is ever rotated (ParallelogramLab/ShapesLab own turning)'],
  [/requestAnimationFrame/, 'no animation — the ghost is a static reflection, not AbsoluteValueLab’s fold'],
  [/coordinate|ordered pair|origin|x-axis|y-axis/i, 'no coordinates (PointLab) — the quadrille is paper'],
  [/parabola/i, 'no parabola (QuadraticFunctionLab)'],
  [/number.?line/i, 'no number line (IntegerLab’s mirror at 0)'],
  [/how many sides|count the sides/i, 'no name-from-sides question (ShapesLab)'],
  [/\barea\b|perimeter|angle sum/i, 'no measures (the shape labs own their theorems)'],
  [/operation table|\ba ⊙ b\b/i, 'no operation table (CommutativeLab)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* symmetry must be DERIVED, never declared as data */
check(!/axes:\s*\[/.test(code), 'no figure ships its own axis list');
check(!/count:\s*\d/.test(code), 'no figure ships its own count');
check(/function isAxis\(spokes, phi\)/.test(code), 'the mirror test is computed from the shipped spokes');
check(/const claimLine = \(\) => \{\s*if \(isAxis\(fig\.spokes, phi\)\)/.test(code), 'the claim gate IS the mirror test');
/* the wrong answers preserve the misconceptions verbatim */
check(/same size is not the test/i.test(code), 'the "same size" belief is offered and refuted');
check(/looks balanced/i.test(code), 'the "looks balanced" belief is offered and refuted');
/* the ghost is drawn from the same exact reflection the test uses */
check(/mod360\(2 \* S\.phi - t\)/.test(code), 'the ghost uses the exact integer reflection');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-symmetry: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
