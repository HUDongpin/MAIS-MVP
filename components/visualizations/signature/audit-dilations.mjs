/* ============================================================================
   audit-dilations.mjs — numeric + structural proof for DilationsLab.jsx
   (8.G.A.4, G-SRT.A.1–2 · dilations; similarity; the slope payoff).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — exact integrality, the two ledgers (lengths ×k,
   angles unmoved) at every dial stop, the staircase riding its line, the
   docket's centers (true fits, false fail), the stamp — grep-enforce the
   refusals.

   Run:  node audit-dilations.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./DilationsLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function DilationsLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, K_DIAL, STAIR_DIAL, CALIB_STEP, FIG, STAIR, kOf, dilate,
            edgesSq, lengthsScaleExactly, angleSignature, anglesSurvive, onLine2yx, DOCKET,
            CASE_FIG, casePre, caseImg, centerFits, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  K_DIAL, STAIR_DIAL, CALIB_STEP, FIG, STAIR, kOf, dilate, edgesSq, lengthsScaleExactly,
  angleSignature, anglesSurvive, onLine2yx, DOCKET, CASE_FIG, casePre, caseImg, centerFits,
  makeCase, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. EXACTNESS — integrality of every image at every legal dial stop.
   ------------------------------------------------------------------------- */
check(FIG.every(([x, y]) => x % 2 === 0 && y % 2 === 0), 'FIG vertices are even — half-k stays integer');
check(CASE_FIG.every(([x, y]) => x % 2 === 0 && y % 2 === 0), 'CASE_FIG vertices are even');
for (let k2 = K_DIAL.min; k2 <= K_DIAL.max; k2 += K_DIAL.step) {
  const img = dilate(FIG, k2);
  check(img.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)), `FIG image integer at k2=${k2}`);
  check(img.every(([x, y]) => Math.abs(x) <= 13 && Math.abs(y) <= 13), `FIG image inside the window at k2=${k2}`);
  /* THE TWO LEDGERS */
  check(lengthsScaleExactly(FIG, img, k2), `lengths ×k exact at k2=${k2}`);
  check(anglesSurvive(FIG, img), `angles unmoved at k2=${k2}`);
  /* first principles twin: every edgeSq scales by k2²/4 */
  const e0 = edgesSq(FIG);
  const e1 = edgesSq(img);
  e0.forEach((e, i) => check(4 * e1[i] === k2 * k2 * e, `edge ${i} scales by k² at k2=${k2}`));
}
/* k = 1 is home */
check(JSON.stringify(dilate(FIG, 2)) === JSON.stringify(FIG), 'k = 1 leaves the figure exactly home');
/* the angle ledger against first principles: exact cross/dot ratios */
{
  const sig = (pts) =>
    pts.map((p, i) => {
      const a = pts[(i + 2) % pts.length];
      const b = pts[(i + 1) % pts.length];
      const u = [a[0] - p[0], a[1] - p[1]];
      const v = [b[0] - p[0], b[1] - p[1]];
      return [u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]];
    });
  for (let k2 = K_DIAL.min; k2 <= K_DIAL.max; k2++) {
    const img = dilate(FIG, k2);
    const sa = sig(FIG);
    const sb = sig(img);
    const truth = sa.every(
      (s, i) => s[0] * sb[i][1] === sb[i][0] * s[1] && Math.sign(s[0]) === Math.sign(sb[i][0])
    );
    check(anglesSurvive(FIG, img) === truth, `angle ledger agrees with first principles at k2=${k2}`);
  }
  /* NEGATIVE CONTROL: a sheared copy must be REJECTED by the ledger */
  const sheared = FIG.map(([x, y]) => [x + y, y]);
  check(anglesSurvive(FIG, sheared) === false, 'the angle ledger rejects a sheared impostor');
  const stretchedX = FIG.map(([x, y]) => [2 * x, y]);
  check(anglesSurvive(FIG, stretchedX) === false, 'the angle ledger rejects a one-direction stretch');
  check(lengthsScaleExactly(FIG, sheared, 2) === false, 'the length ledger rejects the shear too');
}
/* the staircase: whole-k dial keeps odd coordinates integer, and the image
   rides the same line */
check(STAIR_DIAL.step === 2 && STAIR_DIAL.min % 2 === 0, 'the staircase dial holds whole k only');
for (let k2 = STAIR_DIAL.min; k2 <= STAIR_DIAL.max; k2 += STAIR_DIAL.step) {
  const img = dilate(STAIR, k2);
  check(img.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)), `STAIR image integer at k2=${k2}`);
  check(img.every(([x, y]) => Math.abs(x) <= 13 && Math.abs(y) <= 13), `STAIR image inside the window at k2=${k2}`);
  /* the hypotenuse endpoints (vertices 0 and 2) ride the line 2y = x */
  check(onLine2yx(STAIR[0]) && onLine2yx(STAIR[2]), 'the staircase slanted side rides 2y = x');
  check(onLine2yx(img[0]) && onLine2yx(img[2]), `the dilated staircase still rides 2y = x at k2=${k2}`);
  /* rise and run scale together: run = x1−x0 …, both ×k */
  const run0 = STAIR[1][0] - STAIR[0][0];
  const rise0 = STAIR[2][1] - STAIR[1][1];
  const run1 = img[1][0] - img[0][0];
  const rise1 = img[2][1] - img[1][1];
  check(2 * run1 === k2 * run0 && 2 * rise1 === k2 * rise0, `rise and run scale together at k2=${k2}`);
  check(rise1 * run0 === rise0 * run1, `the ratio is untouched at k2=${k2}`);
}

/* ---------------------------------------------------------------------------
   3. THE DOCKET — every case exact; the true center fits, the impostors
   fail; k is recoverable.
   ------------------------------------------------------------------------- */
check(DOCKET.length === 4, 'four orders');
for (const kase of DOCKET) {
  const pre = casePre(kase);
  const img = caseImg(kase);
  check(pre.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)), `${kase.id}: pre integer`);
  check(img.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)), `${kase.id}: image integer`);
  check([...pre, ...img].every(([x, y]) => Math.abs(x) <= 13 && Math.abs(y) <= 13), `${kase.id}: in window`);
  check(kase.centers.length === 3, `${kase.id}: three candidates`);
  check(
    kase.centers.filter((C) => C[0] === kase.O[0] && C[1] === kase.O[1]).length === 1,
    `${kase.id}: exactly one candidate IS the true center`
  );
  /* geometry backs the gate: the true center fits, every false one fails */
  kase.centers.forEach((C, i) => {
    const isTrue = C[0] === kase.O[0] && C[1] === kase.O[1];
    check(centerFits(kase, C) === isTrue, `${kase.id}: candidate ${i} ${isTrue ? 'fits' : 'fails'} as geometry says`);
  });
  /* k is genuinely recoverable: image edges = k · pre edges */
  check(lengthsScaleExactly(pre, img, kase.k2), `${kase.id}: the posted deed used k2=${kase.k2}`);
  check(kase.k2 >= K_DIAL.min && kase.k2 <= K_DIAL.max, `${kase.id}: k on the dial`);
}
/* the four ks are not all alike (variety) */
check(new Set(DOCKET.map((c) => c.k2)).size >= 3, 'the docket varies its factors');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(['fig', 'stair', 'case'].includes(s.scene), `step ${i} scene valid`);
  const dial = s.scene === 'stair' ? STAIR_DIAL : K_DIAL;
  check(Number.isInteger(s.demo) && s.demo >= dial.min && s.demo <= dial.max, `step ${i} demo on its dial`);
  if (s.scene === 'stair') check(s.demo % 2 === 0, `step ${i} stair demo is whole-k`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[4].scene === 'stair', 'the slope payoff runs on the staircase');
/* answer keys derived from the model */
check(/^Twice as far as its own vertex/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: along its own ray');
check(/^Exactly 6 — every length multiplies by k/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: ×k');
check(4 * 3 === 12 && (3 / 2) * 4 === 6, 'the quoted 4 × 3/2 = 6 is true');
check(/ratios cancel/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: angles are ratios');
check(/^No — similar allows a dilation/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: similarity ⊃ congruence');
check(/rise and run scale together/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the slope payoff');
/* the run-4-rise-2 in the copy matches the shipped staircase */
check(STAIR[1][0] - STAIR[0][0] === 4 && STAIR[2][1] - STAIR[1][1] === 2, 'the staircase really is run 4, rise 2');
/* the k²-area trap is planted, not taught */
check(/k²/.test(STEPS[1].feedback), 'the area-scales-by-k² caution is planted');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — the factor AND the center, brute-forced.
   ------------------------------------------------------------------------- */
for (const kase of DOCKET) {
  for (let k2 = K_DIAL.min; k2 <= K_DIAL.max; k2++) {
    for (const cIdx of [null, 0, 1, 2]) {
      const kOK = k2 === kase.k2;
      const cOK =
        cIdx != null && kase.centers[cIdx][0] === kase.O[0] && kase.centers[cIdx][1] === kase.O[1];
      check(isCalibrated(kase, k2, cIdx) === (kOK && cOK), `gate: ${kase.id} k2=${k2} c=${cIdx}`);
      check([0, 50, 100].includes(closeness(kase, k2, cIdx)), 'meter quantized');
    }
  }
}
check(calibChecks(null, 4, 0).every((x) => x === false), 'no order, no credit');
for (let i = 0; i < 200; i++) {
  const drawn = makeCase(null);
  check(DOCKET.some((c) => c.id === drawn.id), 'orders from the docket');
}
for (let i = 0; i < 100; i++) check(makeCase('e1').id !== 'e1', 'a new order is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/move chain|press a chain|\bchain of\b/i, 'no move chain (TransformationsLab/CongruenceLab)'],
  [/\balibi\b|not congruent/i, 'no alibi machinery (CongruenceLab)'],
  [/y\s*=\s*m·?x|\bintercept\b/i, 'no line equation (LineFunctionLab)'],
  [/number line\b/i, 'no bare number line (ScalingLab)'],
  [/\bratio table\b|unit rate/i, 'no ratio table (RatioLab)'],
  [/°|\bdegrees?\b|radian/i, 'angles survive without ever being measured'],
  [/area (is|=)|πr²|count.*squares/i, 'area is a planted trap, never computed'],
  [/requestAnimationFrame/, 'nothing animates — the dial does the moving'],
  [/SOH|CAH|TOA|hypotenuse/i, 'no right-triangle trig (roadmap H16)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the ledgers must be DERIVED */
check(/const lengthsScaleExactly = \(pre, img, k2\) =>/.test(code), 'the length ledger is computed');
check(/const anglesSurvive = \(pre, img\) =>/.test(code), 'the angle ledger is computed');
check(/const centerFits = \(kase, C\) =>/.test(code), 'center fitting is exact collinearity');
check(!/fits:\s*(true|false)/.test(code), 'no candidate ships its own verdict');
/* the word "slope" appears only in the payoff step and the footer */
{
  const hits = (code.match(/slope/gi) || []).length;
  check(hits >= 2 && hits <= 8, `"slope" stays confined to its payoff (${hits} uses)`);
}

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-dilations: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
