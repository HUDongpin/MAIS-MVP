/* ============================================================================
   audit-unlikedenominators.mjs — numeric + structural proof for
   UnlikeDenominatorsLab.jsx (5.NF.A.1–2 · add/subtract unlike denominators —
   "the joint that refuses").

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive integer sweep — the re-cut
       counts, the exact identity n·(b·d) === k·(a·d + c·b), the mediant
       foil's strict in-betweenness, the take gate, and the divisibility
       stamp.
     • Enforce the lab's REFUSALS (no wheels, no number line, no Venn, no
       simplification, no F1/F3 devices) by grepping the code below the
       header.

   Run:  node audit-unlikedenominators.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./UnlikeDenominatorsLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function UnlikeDenominatorsLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd).replace(/prefers-reduced-motion: reduce/g, 'prefers-rm');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, SLATE, DIALS, CALIB_STEP, clampInt, pieceWord, countWords,
            cutWorks, bothCut, recut, smallestCut, joinRead, atLeast, takeRead,
            mediantNum, mediantDen, lessThan, toMixed, makeTarget, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, pieceWord, countWords,
  cutWorks, bothCut, recut, smallestCut, joinRead, atLeast, takeRead,
  mediantNum, mediantDen, lessThan, toMixed, makeTarget, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. DIVISIBILITY IS THE GATE — cuts land or miss, exactly.
   ------------------------------------------------------------------------- */
for (let b = 2; b <= 6; b++)
  for (let k = 0; k <= 36; k++) check(cutWorks(k, b) === (k > 0 && k % b === 0), `cut gate at k=${k}, b=${b}`);
for (let b = 2; b <= 6; b++)
  for (let d = 2; d <= 6; d++) {
    const s = smallestCut(b, d);
    check(s % b === 0 && s % d === 0, `smallest cut serves both at ${b},${d}`);
    for (let k = 1; k < s; k++) check(!bothCut(k, b, d), `nothing below ${s} serves both ${b},${d} (k=${k})`);
    for (let k = 1; k <= 36; k++) check(bothCut(k, b, d) === (k % s === 0), `working cuts are exactly multiples of ${s} at k=${k}`);
    check(s <= b * d, 'the smallest cut never exceeds b·d');
    check(bothCut(b * d, b, d), 'b·d always works');
  }
check(smallestCut(2, 3) === 6 && smallestCut(4, 6) === 12 && smallestCut(5, 6) === 30, 'named smallest cuts');
check(smallestCut(2, 4) === 4, 'when one size divides the other, the bigger IS the cut');

/* ---------------------------------------------------------------------------
   3. THE RE-CUT AND THE JOINT — exact integer renames, and the identity
      n·(b·d) === k·(a·d + c·b)  (the drawn sum IS (ad+cb)/(bd), always).
   ------------------------------------------------------------------------- */
for (let b = 2; b <= 6; b++)
  for (let k = b; k <= 36; k += b)
    for (let a = 1; a <= 5; a++) {
      check(recut(a, b, k) === (a * k) / b && Number.isInteger(recut(a, b, k)), `recut integer at ${a}/${b} → /${k}`);
      /* renaming never changes the amount: a/b === recut/k by cross products */
      check(a * k === recut(a, b, k) * b, `recut keeps the amount at ${a}/${b} → /${k}`);
    }
for (let b = 2; b <= 6; b++)
  for (let d = 2; d <= 6; d++)
    for (let a = 1; a < b; a++)
      for (let c = 1; c < d; c++) {
        /* unread until served */
        if (b !== d) {
          check(joinRead(a, b, c, d, 0) === null, `uncut joint refuses at ${a}/${b}+${c}/${d}`);
          for (let k = 1; k <= 36; k++) {
            const r = joinRead(a, b, c, d, k);
            if (bothCut(k, b, d)) {
              check(r !== null && r.den === k, `served joint reads at k=${k}`);
              check(r.n * (b * d) === k * (a * d + c * b), `exact sum identity at ${a}/${b}+${c}/${d}, k=${k}`);
            } else check(r === null, `half-served joint stays silent at k=${k}`);
          }
        } else {
          const r = joinRead(a, b, c, d, 0);
          check(r !== null && r.n === a + c && r.den === b, 'like pieces read at once');
        }
        /* subtraction: gated by cross products, never negative */
        check(atLeast(a, b, c, d) === (a * d >= c * b), `take gate is the cross product at ${a}/${b},${c}/${d}`);
        const kk = b === d ? 0 : smallestCut(b, d);
        const t = takeRead(a, b, c, d, kk);
        if (atLeast(a, b, c, d)) {
          check(t !== null && t.n >= 0, `take reads non-negative at ${a}/${b}−${c}/${d}`);
          check(t.n * (b * d) === (b === d ? b * d * (a - c) * 1 : kk * (a * d - c * b)) || b === d, 'take identity');
          if (b !== d) check(t.n * (b * d) === kk * (a * d - c * b), `exact difference identity at ${a}/${b}−${c}/${d}`);
        } else check(t === null, `impossible take refuses at ${a}/${b}−${c}/${d}`);
      }

/* ---------------------------------------------------------------------------
   4. THE MEDIANT FOIL — (a+c)/(b+d) sits strictly BETWEEN the addends
      whenever they differ, so it can never be their sum.
   ------------------------------------------------------------------------- */
check(mediantNum(1, 1) === 2 && mediantDen(2, 3) === 5, 'the classic foil is 2/5');
check(lessThan(2, 5, 1, 2) === true, '2/5 < 1/2, exactly');
check(lessThan(1, 2, 2, 5) === false, 'lessThan is an order, not a coin flip');
for (let b = 2; b <= 6; b++)
  for (let d = 2; d <= 6; d++)
    for (let a = 1; a < b; a++)
      for (let c = 1; c < d; c++) {
        const mn = mediantNum(a, c);
        const md = mediantDen(b, d);
        const abLess = lessThan(a, b, c, d);
        const abMore = lessThan(c, d, a, b);
        if (abLess) {
          check(lessThan(a, b, mn, md) && lessThan(mn, md, c, d), `mediant strictly between at ${a}/${b},${c}/${d}`);
        } else if (abMore) {
          check(lessThan(c, d, mn, md) && lessThan(mn, md, a, b), `mediant strictly between at ${a}/${b},${c}/${d}`);
        } else {
          check(mn * b === a * md || mn * d === c * md, `equal addends: mediant equals both at ${a}/${b}`);
        }
        /* and it is always strictly less than the true sum */
        check(lessThan(mn, md, a * d + c * b, b * d), `mediant < true sum at ${a}/${b}+${c}/${d}`);
      }

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — 7 steps, one calibration (last), demos pin scenes,
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
  check(dm && dm.b >= 2 && dm.b <= 6 && dm.d >= 2 && dm.d <= 6 && dm.a >= 1 && dm.a < dm.b && dm.c >= 1 && dm.c < dm.d, `step ${i} demo in range`);
});
/* the staged story: refuse → foil → serve → miss → b·d → take */
check(STEPS[0].demo.k === 0 && STEPS[0].demo.b !== STEPS[0].demo.d, 'step 1 opens on the refusal');
check(joinRead(1, 2, 1, 3, 0) === null, 'and the model indeed refuses 1/2 + 1/3 uncut');
check(STEPS[1].lens && STEPS[1].lens.foil === true, 'step 2 shows the mediant foil');
check(lessThan(mediantNum(1, 1), mediantDen(2, 3), 1, 2), 'and 2/5 is indeed shorter than 1/2');
check(STEPS[2].demo.k === 6 && bothCut(6, 2, 3), 'step 3 cuts into sixths');
check(recut(1, 2, 6) === 3 && recut(1, 3, 6) === 2, 'and 1/2 → 3/6, 1/3 → 2/6');
check(/3\/6/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 answer is 3/6');
check(joinRead(1, 2, 1, 3, 6).n === 5 && joinRead(1, 2, 1, 3, 6).den === 6, 'the joint reads 5/6');
check(STEPS[3].demo.k === 4 && cutWorks(4, 2) && !cutWorks(4, 3), 'step 4 shows a cut that misses');
check(/6, 12, 18/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 answer names the common cuts');
check(STEPS[4].demo.b === 4 && STEPS[4].demo.d === 6 && STEPS[4].demo.k === 24, 'step 5 scene is 1/4 + 1/6 at b·d');
check(bothCut(24, 4, 6) && smallestCut(4, 6) === 12, 'b·d works but 12 is smaller');
check(/12 already/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 answer is 12');
check(joinRead(1, 4, 1, 6, 12).n === 5, 'and at 12 the joint reads 5/12');
check(STEPS[5].mode === 'take' && STEPS[5].demo.a === 3 && STEPS[5].demo.b === 4 && STEPS[5].demo.d === 2, 'step 6 is 3/4 − 1/2');
check(takeRead(3, 4, 1, 2, 4).n === 1 && takeRead(3, 4, 1, 2, 4).den === 4, 'and it reads 1/4');
check(/1\/4/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 answer is 1/4');
check(STEPS[5].choices.some((c) => /2\/2/.test(c)), 'step 6 offers the subtract-both error');
/* results are NEVER simplified: 5/6, 10/12, 5/12 appear as computed */
check(/10\/12/.test(STEPS[3].feedback), 'the 12-cut reading stays 10/12, unsimplified');

/* dials: five, cut unlocks at step 2 (index), counts stay proper */
check(DIALS.length === 5, 'five dials');
check(DIALS.find((d) => d.key === 'cut').unlock === 2, 'the cut unlocks at the cut step');
check(DIALS.find((d) => d.key === 'cut').max === 36, 'the cut reaches 36 ≥ every smallest cut (30)');
check(DIALS.find((d) => d.key === 'b').min === 2 && DIALS.find((d) => d.key === 'b').max === 6, 'sizes run 2–6');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — the stamp is the divisibility pair; the meter reads 100
   nowhere else; every problem is solvable within the dial.
   ------------------------------------------------------------------------- */
for (let b = 2; b <= 6; b++)
  for (let d = 2; d <= 6; d++) {
    if (b === d) continue;
    for (let k = 0; k <= 36; k++) {
      check(isCalibrated(k, b, d) === bothCut(k, b, d), `stamp ⟺ both served at k=${k}, ${b},${d}`);
      const p = closeness(k, b, d);
      check([0, 50, 100].includes(p), 'meter is the honest three-level readout');
      check((p === 100) === bothCut(k, b, d), `meter 100 ⟺ stamp at k=${k}, ${b},${d}`);
      check((p >= 50) === (cutWorks(k, b) || cutWorks(k, d)), `meter 50 ⟺ one run served at k=${k}`);
    }
    check(smallestCut(b, d) <= 36, `problem ${b},${d} solvable inside the dial`);
  }
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(t.b >= 2 && t.b <= 6 && t.d >= 2 && t.d <= 6, 'target sizes in range');
  check(t.b !== t.d, 'target sizes genuinely unlike');
  check(t.a >= 1 && t.a < t.b && t.c >= 1 && t.c < t.d, 'target counts proper');
}
for (let i = 0; i < 200; i++) {
  const t = makeTarget({ a: 1, b: 2, c: 1, d: 3 });
  check(!(t.a === 1 && t.b === 2 && t.c === 1 && t.d === 3), 'a new problem is genuinely new');
}

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bwheels?\b|\bnotch|re-?sync/i, 'no wheels (LCMLab owns the re-sync period)'],
  [/skip.?count|number.?line|\bhops?\b/i, 'no skip-count line (MultiplesLab)'],
  [/\bvenn\b|prime.?brick|factor tree/i, 'no factor diagrams (GCF/PrimeFactorization labs)'],
  [/\blcm\b|least common multiple/i, 'the initialism stays untaught (grade 6 territory)'],
  [/simplif|lowest terms|\breduces?\b|\bgcd\b/i, 'never simplifies (EquivalentFractionsLab)'],
  [/\blattice\b/i, 'no name lattice (EquivalentFractionsLab)'],
  [/\bseam\b|\bshelf\b/i, 'no shelf, no seam (FractionAdditionLab devices)'],
  [/\bplates?\b|\btrays?\b|\bbricks?\b/i, 'no plates or tray (FractionTimesWholeLab devices)'],
  [/\bpie\b|sector/i, 'no pie (FractionLab)'],
  [/\barrays?\b|unit.?squares?/i, 'no array (MultiplicationLab)'],
  [/balance|\bpans?\b/i, 'no balance scale (EquationLab)'],
  [/requestAnimationFrame/, 'nothing animates — the rail is a still picture'],
  [/speechSynthesis/, 'no speech engine'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: only THE CUT survives into the capstone */
check(/calib \? dl\.key === 'cut' : true/.test(code), 'the problem is pinned in the capstone — only the cut moves');
/* the readout is self-gating: the band draws ⍰ from the same joinRead/takeRead */
check(/mode === 'take' \? takeRead\(a, b, c, d, k\) : joinRead\(a, b, c, d, k\)/.test(code), 'the band reads through the gate');
check(/s: '\?', color: INK_SOFT/.test(code), 'the refusing readout exists');
/* counts stay proper by construction */
check(/clampInt\(raw, 1, b - 1/.test(code), 'first count capped below one whole');
check(/clampInt\(raw, 1, d - 1/.test(code), 'second count capped below one whole');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-unlikedenominators: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
