/* ============================================================================
   audit-fractionasdivision.mjs — numeric + structural proof for
   FractionAsDivisionLab.jsx (5.NF.B.3 · a ÷ b = a/b — "share the remainder").

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive integer sweep — the deal's
       conservation, the share-equals-a/b theorem, the flip inequality, the
       neighbour fact, and the stamp gate a·u === t·b.
     • Enforce the lab's REFUSALS (no q-and-r array, no a = b×q + r banner,
       no long-division tableau, no number line, no F1–F5 devices) by
       grepping the code below the header.

   Run:  node audit-fractionasdivision.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./FractionAsDivisionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function FractionAsDivisionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd).replace(/prefers-reduced-motion: reduce/g, 'prefers-rm');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, GOLD, SLATE, DIALS, CALIB_STEP, clampInt, deal, shareParts,
            shareAsFraction, sameValue, lessThan, neighbors, makeTarget, closeness,
            isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, deal, shareParts,
  shareAsFraction, sameValue, lessThan, neighbors, makeTarget, closeness,
  isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE DEAL — conservation, and the share-equals-a/b theorem.
   ------------------------------------------------------------------------- */
for (let a = 1; a <= 20; a++)
  for (let b = 2; b <= 6; b++) {
    const { q, r } = deal(a, b);
    check(q === Math.floor(a / b) && r === a % b, `the deal at ${a} ÷ ${b}`);
    check(b * q + r === a, `nothing lost on the counter at ${a} ÷ ${b}`);
    check(r >= 0 && r < b, `the counter holds fewer than a round at ${a} ÷ ${b}`);
    const sp = shareParts(a, b);
    check(sp.wholes === q && sp.num === r && sp.den === b, `the share's parts at ${a} ÷ ${b}`);
    const f = shareAsFraction(a, b);
    /* THE THEOREM: the share (q + r/b) is exactly the pair (a, b) */
    check(f.n === a && f.den === b, `share IS a/b at ${a} ÷ ${b}`);
    check(sameValue(f.n, f.den, a, b), `share equals a/b by cross products at ${a} ÷ ${b}`);
    /* the neighbours: q and q+1 bracket the share (or it IS a whole) */
    const nb = neighbors(a, b);
    if (r === 0) check(nb.lo === q && nb.hi === q, `even deal is the whole number ${q}`);
    else {
      check(nb.lo === q && nb.hi === q + 1, `neighbours at ${a} ÷ ${b}`);
      check(lessThan(nb.lo, 1, a, b) && lessThan(a, b, nb.hi, 1), `q < a/b < q+1 at ${a} ÷ ${b}`);
    }
    /* the flip: a/b = b/a only when a = b */
    check(sameValue(a, b, b, a) === (a === b), `flip equality only at a=b (${a},${b})`);
  }
/* the flagship numbers */
check(deal(7, 2).q === 3 && deal(7, 2).r === 1, '7 ÷ 2 deals 3 with 1 waiting');
check(shareAsFraction(7, 2).n === 7 && shareAsFraction(7, 2).den === 2, '7 ÷ 2 = 7/2');
check(deal(3, 4).q === 0 && deal(3, 4).r === 3, '3 ÷ 4 deals no wholes');
check(shareAsFraction(3, 4).n === 3 && shareAsFraction(3, 4).den === 4, '3 ÷ 4 = 3/4');
check(neighbors(7, 2).lo === 3 && neighbors(7, 2).hi === 4, '7/2 lives between 3 and 4');
check(deal(5, 4).q === 1 && deal(5, 4).r === 1, '5 bars for 4 kids: one each and one to cut');
check(lessThan(2, 7, 1, 1) && lessThan(1, 1, 7, 2), '2/7 < 1 < 7/2 — the flip changes worlds');
/* shares are never simplified: 6 ÷ 4 keeps the pair (6, 4) */
check(shareAsFraction(6, 4).n === 6 && shareAsFraction(6, 4).den === 4, '6 ÷ 4 stays 6/4');

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
  check(dm && dm.a >= 1 && dm.a <= 20 && dm.b >= 2 && dm.b <= 6, `step ${i} demo in range`);
});
/* the staged story: pause → cut → rename → a<b → neighbours → word problem */
check(!STEPS[0].lens, 'step 1 shows the pause — no cut yet');
check(STEPS[1].lens && STEPS[1].lens.cut === true, 'step 2 makes the cut');
check(/3 and 1\/2|three and a half/i.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 answer is 3½');
check(STEPS[1].choices.some((c) => /remainder 1/.test(c)), 'step 2 offers the remainder habit');
check(STEPS[2].choices[STEPS[2].answer].trim() === '7/2', 'step 3 renames 7 ÷ 2 as 7/2');
check(STEPS[2].choices.some((c) => c.trim() === '2/7'), 'step 3 offers the flip');
check(STEPS[3].demo.a === 3 && STEPS[3].demo.b === 4 && /3\/4/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4: 3 ÷ 4 = 3/4');
check(STEPS[3].choices.some((c) => /Impossible|cannot divide/i.test(c)), 'step 4 offers the impossibility myth');
check(STEPS[4].lens && STEPS[4].lens.between === true, 'step 5 shows the neighbours');
check(/Between 3 and 4/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 answer brackets 7/2');
check(STEPS[5].demo.a === 5 && STEPS[5].demo.b === 4 && /1 and 1\/4|1 1\/4/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6: 5 ÷ 4 = 1¼');

/* dials: two — what is shared, and among how many */
check(DIALS.length === 2, 'two dials');
check(DIALS.find((d) => d.key === 'loaves').min === 1 && DIALS.find((d) => d.key === 'loaves').max === 20, 'loaves 1–20');
check(DIALS.find((d) => d.key === 'friends').min === 2 && DIALS.find((d) => d.key === 'friends').max === 6, 'friends 2–6');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — the stamp is the cross identity a·u === t·b; the meter
   reads 100 nowhere else; every posted share is reachable, in more than one
   dealing whenever the dials allow it.
   ------------------------------------------------------------------------- */
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(t.u >= 2 && t.u <= 5, 'posted denominator 2–5');
  check(Number.isInteger(t.t) && t.t > t.u && t.t % t.u !== 0, 'posted share genuinely mixed');
  let recipes = 0;
  for (let a = 1; a <= 20; a++) for (let b = 2; b <= 6; b++) if (a * t.u === t.t * b) recipes++;
  check(recipes >= 1, `share ${t.t}/${t.u} reachable`);
  check(deal(t.t, t.u).q >= 1 && deal(t.t, t.u).q <= 3, 'posted wholes 1–3');
}
for (let tU = 2; tU <= 5; tU++)
  for (let q0 = 1; q0 <= 3; q0++)
    for (let r0 = 1; r0 < tU; r0++) {
      const tT = q0 * tU + r0;
      for (let a = 1; a <= 20; a++)
        for (let b = 2; b <= 6; b++) {
          check(isCalibrated(a, b, tT, tU) === (a * tU === tT * b), `stamp ⟺ cross identity at ${a},${b} vs ${tT}/${tU}`);
          const m = closeness(a, b, tT, tU);
          check(m >= 0 && m <= 100, 'meter in range');
          check((m === 100) === (a * tU === tT * b), `meter 100 ⟺ matched at ${a},${b} vs ${tT}/${tU}`);
        }
      /* for fixed friends, adding loaves toward the share never reads worse */
      for (let b = 2; b <= 6; b++)
        for (let a = 1; a < 20; a++)
          if (Math.abs((a + 1) * tU - tT * b) <= Math.abs(a * tU - tT * b))
            check(closeness(a + 1, b, tT, tU) >= closeness(a, b, tT, tU), `meter monotone in loaves at ${tT}/${tU}, b=${b}`);
      /* the doubled dealing lands the same share, when the dials allow */
      if (2 * tU <= 6 && 2 * tT <= 20)
        check(isCalibrated(2 * tT, 2 * tU, tT, tU), `doubled dealing ${2 * tT} among ${2 * tU} lands ${tT}/${tU} too`);
    }
for (let i = 0; i < 200; i++) {
  const t = makeTarget({ t: 7, u: 2 });
  check(!(t.t === 7 && t.u === 2), 'a new share is genuinely new');
}

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/=\s*b\s*×\s*q|b×q\s*\+\s*r/i, 'no a = b×q + r banner (DivisionLab owns the identity)'],
  [/sharing.?grouping|partitive|quotative/i, 'no two-meanings toggle (DivisionLab)'],
  [/\barrays?\b|unit.?squares?/i, 'no array (DivisionLab/MultiplicationLab)'],
  [/long division|tableau|bring down/i, 'no paper algorithm (LongDivisionLab)'],
  [/number.?line|\bhops?\b|skip.?count/i, 'no number line (RationalNumbersLab locates p/q)'],
  [/split (dial|slider)/i, 'no split dial (FractionLab)'],
  [/\bpie\b|sector/i, 'no pie (FractionLab)'],
  [/\bshelf\b|\bseam\b|\brails?\b|\bjoints?\b|\bplates?\b|\btrays?\b|\bbricks?\b/i, 'no F1/F2/F3 furniture'],
  [/\boverlap\b|shading/i, 'no overlap square (FractionMultiplicationLab)'],
  [/\bgauge\b|\bpivot\b/i, 'no factor gauge (ScalingLab)'],
  [/simplif|\bgcd\b|lowest terms|\breduces?\b/i, 'never simplifies (EquivalentFractionsLab)'],
  [/balance|\bpans?\b/i, 'no balance (EquationLab)'],
  [/requestAnimationFrame/, 'nothing animates — the deal is a still picture'],
  [/speechSynthesis/, 'no speech engine'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: the scene draws from the very model the audit proved */
check(/deal\(S\.a, S\.b\)/.test(code), 'the counter deals via deal()');
check(/shareAsFraction\(S\.a, S\.b\)/.test(code), 'the equation ends on shareAsFraction()');
check(/neighbors\(S\.a, S\.b\)/.test(code), 'the neighbour chip reads neighbors()');
/* the cut is a staged capability, not an always-on decoration */
check(/const cut = calib \|\| !!lens\.cut/.test(code), 'the cut arrives with the lesson');
/* the counter never shows a full round: r < b is the model's guarantee,
   and the waiting note names it */
check(/too few for another round/.test(code), 'the pause is named on screen');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-fractionasdivision: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
