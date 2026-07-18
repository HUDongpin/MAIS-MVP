/* ============================================================================
   audit-trigratio.mjs — numeric + structural proof for TrigRatioLab.jsx
   (G-SRT.C.6–8 · the side quotient depends only on the angle; SOH-CAH-TOA).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the five corners are primitive right triangles, the
   quotient's size-invariance over the whole dial space, the steepness
   ladder's strict order, tan = sin/cos, every quoted number, the stamp —
   and grep-enforce the refusals (Math.sin/cos/tan nowhere among them).

   Run:  node audit-trigratio.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./TrigRatioLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function TrigRatioLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, K_MAX, CALIB_STEP, gcdInt, rat, ratText, ratEq, CORNERS,
            cornerIds, sinOf, cosOf, tanOf, sidesAt, K_CASES, makeCase, sinTruth, sinChips,
            oppTruth, oppChips, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  K_MAX, CALIB_STEP, gcdInt, rat, ratText, CORNERS, cornerIds, sinOf, cosOf, tanOf, sidesAt,
  K_CASES, makeCase, sinTruth, sinChips, oppTruth, oppChips, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE CORNERS — primitive right triangles, ranked strictly by sine.
   ------------------------------------------------------------------------- */
check(cornerIds.length === 5, 'five corners');
for (const id of cornerIds) {
  const C = CORNERS[id];
  check(C.opp * C.opp + C.adj * C.adj === C.hyp * C.hyp, `${id}: a right triangle (the mason’s identity holds)`);
  check(gcdInt(C.opp, C.adj) === 1, `${id}: a primitive triple`);
  check(C.opp > 0 && C.adj > 0, `${id}: positive legs`);
}
/* strict steepness ladder, by exact cross-multiplication */
for (let i = 0; i + 1 < cornerIds.length; i++) {
  const s1 = sinOf(CORNERS[cornerIds[i]]);
  const s2 = sinOf(CORNERS[cornerIds[i + 1]]);
  check(s1.n * s2.d < s2.n * s1.d, `ladder: ${cornerIds[i]} < ${cornerIds[i + 1]}`);
}
check(CORNERS.cliff.opp === CORNERS.meadow.adj && CORNERS.cliff.adj === CORNERS.meadow.opp, 'the cliff is the meadow’s corner, swapped');

/* ---------------------------------------------------------------------------
   3. INVARIANCE — the quotient shrugs off every size on (and past) the dial.
   ------------------------------------------------------------------------- */
for (const id of cornerIds) {
  const C = CORNERS[id];
  const s1 = sinOf(C);
  const c1 = cosOf(C);
  const t1 = tanOf(C);
  for (let k = 1; k <= 12; k++) {
    const s = sidesAt(C, k);
    check(s.opp === C.opp * k && s.adj === C.adj * k && s.hyp === C.hyp * k, `${id} k=${k}: exact multiples`);
    check(ratText(rat(s.opp, s.hyp)) === ratText(s1), `${id} k=${k}: sine invariant`);
    check(ratText(rat(s.adj, s.hyp)) === ratText(c1), `${id} k=${k}: cosine invariant`);
    check(ratText(rat(s.opp, s.adj)) === ratText(t1), `${id} k=${k}: tangent invariant`);
    /* the scaled triangle is still right */
    check(s.opp * s.opp + s.adj * s.adj === s.hyp * s.hyp, `${id} k=${k}: still right`);
  }
  /* tan = sin / cos, exactly: cross-multiplied */
  check(t1.n * s1.d * c1.n === s1.n * c1.d * t1.d, `${id}: tan = sin/cos`);
}

/* ---------------------------------------------------------------------------
   4. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(ratText(rat(15, 25)) === '3/5', '15/25 reduces to 3/5');
check(ratText(sinOf(CORNERS.hill)) === '3/5', 'the hill’s sine is 3/5');
check(ratText(sinOf(CORNERS.cliff)) === '24/25', 'the cliff’s sine is 24/25');
check(ratText(cosOf(CORNERS.hill)) === '4/5', 'the hill’s cosine is 4/5');
check(ratText(tanOf(CORNERS.hill)) === '3/4', 'the hill’s tangent is 3/4');
check((35 * 3) / 5 === 21, 'the ladder problem: 3/5 of 35 is 21');
check((35 * 4) / 5 === 28, 'the offered wrong answer: 4/5 of 35 is 28');
const ladderText = cornerIds.map((id) => ratText(sinOf(CORNERS[id]))).join(' < ');
check(ladderText === '7/25 < 5/13 < 8/17 < 3/5 < 24/25', 'the quoted ladder is the computed ladder');
check(STEPS[2].feedback.includes(ladderText), 'step 3 quotes the ladder verbatim');
check(/15\/25 = 3\/5/.test(STEPS[0].choices[0]), 'step 1 quotes the reduction');
check(/tan = sin\/cos — 3\/5 over 4\/5 is 3\/4/.test(STEPS[3].feedback), 'step 4 quotes the quotient chain');
check(/SOH-CAH-TOA/.test(STEPS[3].body), 'the mnemonic is named');
check(/dilation bench/.test(STEPS[1].body), 'the dilation bench is cited for the why');
check(/circle bench/.test(STEPS[4].feedback), 'the circle bench is cited for the general angle');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!CORNERS[s.corner], `step ${i} corner exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].corner === 'hill' && STEPS[2].corner === 'cliff', 'the story opens on the hill and turns at the cliff');
check(!!STEPS[2].chips && !!STEPS[3].chips && !STEPS[0].chips, 'the corners unlock at step 3');
check(!!STEPS[3].ratios && !!STEPS[4].ratios && !STEPS[2].ratios, 'the three names arrive at step 4');
/* answer keys derived from the model */
check(/^15\/25 = 3\/5/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the reduction');
check(/^Both lengths get ×k/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the k cancels');
check(/^24\/25 — nearly 1/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the cliff’s sine');
check(/^4\/5 — the adjacent/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the cosine');
check(/^21 — three fifths/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the proportion');
/* the real beliefs are offered and refuted */
check(/protractor/.test(STEPS.map((s) => (s.choices || []).join('|')).join('|')), 'the protractor belief is offered');
check(/Bigger — 15\/25 beats 3\/5/.test(STEPS[0].choices.join('|')), 'the bigger-triangle belief is offered');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
const parseR = (t) => t.split('/').map(Number);
for (const cornerId of cornerIds) {
  for (const k of K_CASES) {
    const kase = { cornerId, k };
    const sChips = sinChips(kase);
    const oChips = oppChips(kase);
    const sT = ratText(sinTruth(kase));
    const oT = String(oppTruth(kase));
    check(sChips.length === 4 && new Set(sChips).size === 4, `${cornerId} k=${k}: four distinct sine chips`);
    check(oChips.length === 4 && new Set(oChips).size === 4, `${cornerId} k=${k}: four distinct side chips`);
    check(sChips.includes(sT), `${cornerId} k=${k}: the sine truth is on a chip`);
    check(oChips.includes(oT), `${cornerId} k=${k}: the side truth is on a chip`);
    for (let i = 0; i + 1 < sChips.length; i++) {
      const [n1, d1] = parseR(sChips[i]);
      const [n2, d2] = parseR(sChips[i + 1]);
      check(n1 * d2 < n2 * d1, `${cornerId} k=${k}: sine chips ascend`);
    }
    for (let i = 0; i + 1 < oChips.length; i++)
      check(Number(oChips[i]) < Number(oChips[i + 1]), `${cornerId} k=${k}: side chips ascend`);
    /* the truth chips agree with first principles */
    const C = CORNERS[cornerId];
    check(oT === String(C.opp * k), `${cornerId} k=${k}: opp truth = opp·k`);
    check(sT === ratText(rat(C.opp * k, C.hyp * k)), `${cornerId} k=${k}: sine truth survives the scaling`);
    for (const sp of [null, ...sChips, 'bogus']) {
      for (const op of [null, ...oChips]) {
        const should = sp === sT && op === oT;
        check(isCalibrated(kase, sp, op) === should, `gate: ${cornerId} k=${k} sin=${sp} opp=${op}`);
        check([0, 50, 100].includes(closeness(kase, sp, op)), 'meter quantized');
      }
    }
    const wrongSin = sChips.find((x) => x !== sT);
    check(closeness(kase, wrongSin, oT) === 0, `${cornerId} k=${k}: the side without the sine earns nothing`);
  }
}
check(calibChecks(null, '3/5', '21').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const kk = makeCase(null);
  check(cornerIds.includes(kk.cornerId) && K_CASES.includes(kk.k), 'cases from the space');
}
for (let i = 0; i < 100; i++) {
  const kk = makeCase({ cornerId: 'hill', k: 4 });
  check(!(kk.cornerId === 'hill' && kk.k === 4), 'a new case is genuinely new');
}

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/Math\.sin\(|Math\.cos\(|Math\.tan\(/, 'no trig function is ever computed — quotients are exact fractions'],
  [/\bradians?\b/i, 'no radian (UnitCircleLab)'],
  [/unit circle|wrapping|unwrap/i, 'no wrapping (UnitCircleLab; “the circle bench” citation is allowed)'],
  [/\bslope\b/i, 'the word slope never appears (LineFunctionLab)'],
  [/scale factor/i, 'no scale-factor language (DilationsLab; citing its bench by name is allowed)'],
  [/\bdrag/i, 'nothing is draggable (TriangleLab)'],
  [/angle sum/i, 'no angle-sum tour (TriangleLab)'],
  [/\bwave\b|\bperiod\b|amplitude/i, 'no graphs of circular functions (the six wave labs)'],
  [/packing|mason|leftover/i, 'no rearrangement machinery (PythagorasLab; its identity is spent silently)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/coordinate/i, 'no coordinate plane (DistanceLab)'],
  [/°/, 'no degree readout — the corner is named, not measured'],
  [/requestAnimationFrame/, 'nothing animates — the size is a dial'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
{
  const blockStart = code.indexOf('const CORNERS = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/sin:|cos:|tan:|ratio/i.test(block), 'no corner ships its own quotients');
}
check(/const sinOf = \(C\) => rat\(C\.opp, C\.hyp\)/.test(code), 'sine is derived from the sides');
check(/const cosOf = \(C\) => rat\(C\.adj, C\.hyp\)/.test(code), 'cosine is derived from the sides');
check(/const tanOf = \(C\) => rat\(C\.opp, C\.adj\)/.test(code), 'tangent is derived from the sides');
/* the drawing reads the model */
check(/sidesAt\(S\.C, kk\)/.test(code), 'the fan and ledger read the model');
check(/sinOf\(S\.C\)/.test(code), 'the ledger’s verdict is the model’s sine');
check(/sinChips\(kase\)/.test(code) && /oppChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-trigratio: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
