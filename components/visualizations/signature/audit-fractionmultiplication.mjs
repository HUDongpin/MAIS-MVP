/* ============================================================================
   audit-fractionmultiplication.mjs — numeric + structural proof for
   FractionMultiplicationLab.jsx (5.NF.B.4 · fraction × fraction — "of means
   overlap; crossing cuts mint a new piece").

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive integer sweep — the cell mint
       b·d, the overlap count a·c, the containment and order facts, and the
       stamp gate a·c === target.
     • Enforce the lab's REFUSALS (no array, no unit squares, no tiling, no
       pull-apart, no bar/shelf/plates, no simplification) by grepping the
       code below the header.

   Run:  node audit-fractionmultiplication.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./FractionMultiplicationLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function FractionMultiplicationLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd).replace(/prefers-reduced-motion: reduce/g, 'prefers-rm');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, DIALS, CALIB_STEP, clampInt, pieceWord, countWords,
            cells, overlap, productFrac, lessThan, productShrinksAcross,
            makeTarget, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, pieceWord, countWords,
  cells, overlap, productFrac, lessThan, productShrinksAcross,
  makeTarget, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE MINT AND THE COUNT — cells, overlap, and the product pair, exactly.
   ------------------------------------------------------------------------- */
for (let b = 1; b <= 6; b++)
  for (let d = 1; d <= 6; d++) {
    check(cells(b, d) === b * d, `mint at ${b}×${d}`);
    for (let a = 1; a <= b; a++)
      for (let c = 1; c <= d; c++) {
        check(overlap(a, c) === a * c, `overlap count at ${a},${c}`);
        const p = productFrac(a, b, c, d);
        check(p.n === a * c && p.den === b * d, `product pair at ${a}/${b} × ${c}/${d}`);
        /* the overlap sits INSIDE each band (containment, in cell counts) */
        check(a * c <= b * c && a * c <= a * d, `overlap inside both bands at ${a}/${b},${c}/${d}`);
        /* multiplying by a whole band (a = b) leaves the other factor: exact
           cross-product equality (b·c)/(b·d) = c/d */
        if (a === b) check(p.n * d === c * p.den / b * b / 1 || p.n * d === c * (b * d), `×1 identity at b=${b}, ${c}/${d}`);
        if (a === b) check(p.n * d === c * p.den, `×(b/b) keeps the across factor at ${c}/${d}`);
        /* the shrink: product < across factor exactly when a < b */
        check(productShrinksAcross(a, b, c) === (a < b && c > 0), `shrink flag at ${a},${b},${c}`);
        if (a < b) check(lessThan(p.n, p.den, c, d), `product < across factor at ${a}/${b} × ${c}/${d}`);
        if (a === b) check(!lessThan(p.n, p.den, c, d) && !lessThan(c, d, p.n, p.den), `product = across factor at a=b`);
        /* and symmetrically for the down factor */
        if (c < d) check(lessThan(p.n, p.den, a, b), `product < down factor at ${a}/${b} × ${c}/${d}`);
      }
  }
/* the flagship numbers */
check(productFrac(1, 2, 1, 3).n === 1 && productFrac(1, 2, 1, 3).den === 6, '1/2 × 1/3 = 1/6');
check(productFrac(2, 3, 3, 4).n === 6 && productFrac(2, 3, 3, 4).den === 12, '2/3 × 3/4 = 6/12, unsimplified');
check(lessThan(1, 6, 1, 3), '1/6 < 1/3 — a part of a part is smaller');
check(countWords(1, 6) === 'one sixth' && countWords(6, 12) === 'six twelfths', 'the words match the pairs');

/* ---------------------------------------------------------------------------
   3. LESSON STRUCTURE — 7 steps, one calibration (last), demos pin scenes,
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
  check(dm && dm.b >= 1 && dm.b <= 6 && dm.d >= 1 && dm.d <= 6 && dm.a >= 1 && dm.a <= dm.b && dm.c >= 1 && dm.c <= dm.d, `step ${i} demo in range`);
});
check(STEPS[0].demo.b === 1, 'the lab opens with NO down cut (multiplying by a whole band)');
check(/1\/3 of the whole/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 anchors the whole');
check(/part of a part|OF/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 reads "of" as overlap');
check(STEPS[2].lens && STEPS[2].lens.cells === true, 'step 3 shows the mint');
check(overlap(1, 1) === 1 && cells(2, 3) === 6 && /1\/6/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3: 1/2 × 1/3 = 1/6');
check(STEPS[2].choices.some((c) => /5\/6/.test(c)), 'step 3 offers the plus-habit error (1/2 + 1/3)');
check(STEPS[2].choices.some((c) => /2\/5/.test(c)), 'step 3 offers the tops-and-bottoms error');
check(STEPS[3].lens && STEPS[3].lens.sides === true, 'step 4 reads the sides');
check(STEPS[3].demo.a === 2 && STEPS[3].demo.b === 3 && STEPS[3].demo.c === 3 && STEPS[3].demo.d === 4, 'step 4 scene is 2/3 by 3/4');
check(/6\/12/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 answer is 6/12, unsimplified');
check(/Smaller/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 confronts the shrink');
check(STEPS[5].demo.a === 3 && STEPS[5].demo.b === 4 && STEPS[5].demo.c === 2 && STEPS[5].demo.d === 3, 'step 6 is the garden 3/4 × 2/3');
check(overlap(3, 2) === 6 && cells(4, 3) === 12 && /6\/12/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 answer is 6/12 of the garden');

/* dials: four; across pair opens the lab, down pair unlocks second */
check(DIALS.length === 4, 'four dials');
check(DIALS.find((d) => d.key === 'acrossCount').unlock === 0 && DIALS.find((d) => d.key === 'acrossCuts').unlock === 0, 'across pair opens');
check(DIALS.find((d) => d.key === 'downCount').unlock === 1 && DIALS.find((d) => d.key === 'downCuts').unlock === 1, 'down pair unlocks second');
check(DIALS.every((d) => d.min === 1 && d.max === 6), 'all dials run 1–6');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — the stamp is the integer identity a·c === target.t; the
   meter reads 100 nowhere else; every target admits a sweep pair.
   ------------------------------------------------------------------------- */
for (let b = 4; b <= 6; b++)
  for (let d = 4; d <= 6; d++) {
    const total = cells(b, d);
    for (let t = 4; t <= (b - 1) * (d - 1); t++) {
      let reachable = false;
      for (let a = 1; a <= b; a++)
        for (let c = 1; c <= d; c++) {
          const p = overlap(a, c);
          check(isCalibrated(p, t) === (p === t), `stamp ⟺ equality at ${a}×${c} vs ${t}`);
          const m = closeness(p, t, total);
          check(m >= 0 && m <= 100, 'meter in range');
          check((m === 100) === (p === t), `meter 100 ⟺ covered at ${a}×${c} vs ${t}`);
          if (p === t) reachable = true;
        }
      /* only targets the generator can emit need to be reachable */
      let emittable = false;
      for (let a0 = 2; a0 <= b - 1; a0++) for (let c0 = 2; c0 <= d - 1; c0++) if (a0 * c0 === t) emittable = true;
      if (emittable) check(reachable, `target ${t} on ${b}×${d} reachable`);
    }
    for (let p = 0; p < total; p++) check(closeness(p + 1, total, total) >= closeness(p, total, total), 'meter monotone toward full');
  }
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(t.b >= 4 && t.b <= 6 && t.d >= 4 && t.d <= 6, 'target grid 4–6 each way');
  check(Number.isInteger(t.t) && t.t >= 4 && t.t <= (t.b - 1) * (t.d - 1), 'target strictly interior');
  let recipes = 0;
  for (let a = 1; a <= t.b; a++) for (let c = 1; c <= t.d; c++) if (a * c === t.t) recipes++;
  check(recipes >= 1, `target ${t.t} on ${t.b}×${t.d} has a recipe`);
}
for (let i = 0; i < 200; i++) {
  const t = makeTarget({ t: 6, b: 4, d: 5 });
  check(!(t.t === 6 && t.b === 4 && t.d === 5), 'a new target is genuinely new');
}

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/unit.?squares?/i, 'no unit squares (MultiplicationLab/AreaLab own that count)'],
  [/\barrays?\b/i, 'no array (MultiplicationLab)'],
  [/\btiles?\b|tiling/i, 'no tiling (AreaLab)'],
  [/pull.?apart/i, 'no pull-apart (DistributiveLab)'],
  [/\bpie\b|sector/i, 'no pie (FractionLab)'],
  [/\bbar\b|\bshelf\b|\bseam\b|\brails?\b|\bjoints?\b/i, 'no bar/shelf/rail (FractionLab, F1, F2 devices)'],
  [/\bplates?\b|\btrays?\b|\bbricks?\b/i, 'no plates (FractionTimesWholeLab devices)'],
  [/number.?line|\bhops?\b|skip.?count/i, 'no number line (MultiplesLab)'],
  [/simplif|\bgcd\b|lowest terms|\breduces?\b/i, 'never simplifies (EquivalentFractionsLab)'],
  [/balance|\bpans?\b/i, 'no balance (EquationLab)'],
  [/cut.?and.?slide/i, 'no cut-and-slide (AreaLab)'],
  [/requestAnimationFrame/, 'nothing animates — the overlap is a still picture'],
  [/speechSynthesis/, 'no speech engine'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: the cuts are pinned (hidden) in the capstone */
check(/calib && \(dl\.key === 'downCuts' \|\| dl\.key === 'acrossCuts'\)/.test(code), 'the cuts are pinned in the capstone');
/* the sweeps can never leave the square */
check(/dl\.key === 'downCount' \? b : dl\.key === 'acrossCount' \? d : dl\.max/.test(code), 'sweep dials capped at their cuts');
/* the picture is drawn from the very functions the audit proved */
check(/overlap\(S\.a, S\.c\)/.test(code), 'the drawn count is overlap()');
check(/cells\(S\.b, S\.d\)/.test(code), 'the drawn mint is cells()');
check(/productFrac\(S\.a, S\.b, S\.c, S\.d\)/.test(code), 'the equation ends on productFrac()');
/* the overlap is literally the intersection rectangle of the two bands */
check(/ctx\.fillRect\(x0, y0, S\.c \* colW, S\.a \* rowH\)/.test(code), 'the product patch is the bands’ intersection');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-fractionmultiplication: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
