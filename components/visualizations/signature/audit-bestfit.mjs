/* ============================================================================
   audit-bestfit.mjs — numeric + structural proof for BestFitLab.jsx
   (8.SP.A.2–3, S-ID.B.6 · line of best fit; the residuals are the object).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the exact integer score, the engineered on-grid
   least-squares lines (Σr = 0 AND Σx·r = 0 at the intended line), unique
   grid minima, the 9× loose cloud, the stamp — grep-enforce the refusals.

   Run:  node audit-bestfit.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./BestFitLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function BestFitLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, PARAMS, CALIB_STEP, resid2, ssr4, scoreText, sumResid2,
            gridMin, slopeText, predict2, DATA, DOCKET, makeCase, forecastChips, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  PARAMS, CALIB_STEP, resid2, ssr4, scoreText, sumResid2, gridMin, slopeText, predict2, DATA,
  DOCKET, makeCase, forecastChips, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

const m2Dial = PARAMS.find((p) => p.key === 'm2');
const bDial = PARAMS.find((p) => p.key === 'b');

/* ---------------------------------------------------------------------------
   2. THE SCORE — exact, and equal to first principles on every dial state.
   ------------------------------------------------------------------------- */
const allSets = [...Object.entries(DATA).map(([k, v]) => [k, v.pts]), ...DOCKET.map((c) => [c.id, c.pts])];
for (const [name, pts] of allSets) {
  for (const [x, y] of pts) check(Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x <= 12 && y >= 0 && y <= 12, `${name}: integer pairs in window`);
  for (let m2 = m2Dial.min; m2 <= m2Dial.max; m2++) {
    for (let b = bDial.min; b <= bDial.max; b++) {
      let truth = 0;
      let sum = 0;
      for (const [x, y] of pts) {
        const r2 = 2 * y - m2 * x - 2 * b;
        truth += r2 * r2;
        sum += r2;
      }
      check(ssr4(pts, m2, b) === truth, `${name}: SSR4 exact at (${m2},${b})`);
      check(sumResid2(pts, m2, b) === sum, `${name}: residual tally exact at (${m2},${b})`);
    }
  }
}
check(scoreText(16) === '4' && scoreText(17) === '4.25' && scoreText(18) === '4.50', 'the score prints clean quarters');

/* ---------------------------------------------------------------------------
   3. THE ENGINEERING — every dataset's least-squares line sits ON the grid:
   at the intended line, Σr = 0 AND Σx·r = 0 (the normal equations), the
   grid minimum is there and UNIQUE.
   ------------------------------------------------------------------------- */
const INTENDED = { tight: [1, 2], loose: [1, 2], f1: [2, 1], f2: [-1, 10], f3: [1, 4] };
for (const [name, pts] of allSets) {
  const [im2, ib] = INTENDED[name];
  check(sumResid2(pts, im2, ib) === 0, `${name}: Σ residuals = 0 at the intended line`);
  const sxr = pts.reduce((a, [x, y]) => a + x * (2 * y - im2 * x - 2 * ib), 0);
  check(sxr === 0, `${name}: Σ x·residuals = 0 — the true least-squares line IS on the grid`);
  const g = gridMin(pts);
  check(g.arg.m2 === im2 && g.arg.b === ib, `${name}: the grid minimum is the intended line`);
  check(g.unique, `${name}: the grid minimum is unique`);
  check(g.best === ssr4(pts, im2, ib), `${name}: the minimum score matches`);
}
/* the loose cloud: same best line, exactly 9× the score (tripled misses) */
check(gridMin(DATA.loose.pts).best === 9 * gridMin(DATA.tight.pts).best, 'loose = 9× tight, exactly');
for (let i = 0; i < DATA.tight.pts.length; i++) {
  const rT = resid2(DATA.tight.pts[i], 1, 2);
  const rL = resid2(DATA.loose.pts[i], 1, 2);
  check(rL === 3 * rT, `loose point ${i}: its miss is the tight miss, tripled`);
  check(DATA.tight.pts[i][0] === DATA.loose.pts[i][0], `loose point ${i}: same x`);
}
check(gridMin(DATA.tight.pts).best === 16, 'tight best score is 4 (SSR4 = 16)');
check(slopeText(1) === '1/2' && slopeText(-1) === '−1/2' && slopeText(2) === '1' && slopeText(0) === '0', 'the rate prints as halves');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!DATA[s.data], `step ${i} dataset exists`);
  check(s.demo && Number.isInteger(s.demo.m2) && Number.isInteger(s.demo.b), `step ${i} scene pinned`);
  check(s.demo.m2 >= m2Dial.min && s.demo.m2 <= m2Dial.max && s.demo.b >= bDial.min && s.demo.b <= bDial.max, `step ${i} scene in range`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].lockDials === true, 'step 1: dials locked');
check(STEPS[1].demo.m2 === 0 && STEPS[1].demo.b === 6, 'the miss step opens on the flat bad line');
/* the step-2 question's fact, verified: residual of (8,7) under y = 6 is +1 */
check(resid2([8, 7], 0, 6) === 2, 'the quoted residual (+1, doubled to 2) is true');
check(DATA.tight.pts.some(([x, y]) => x === 8 && y === 7), 'the quoted dot exists');
/* answer keys derived from the model */
check(/^A summary/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the model idea');
check(/^\+1 — the dot sits 1 above/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the signed miss');
check(/both count against the model/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: why squares');
check(/^Cancel exactly/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the misses cancel');
check(/judged by closeness/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the score judges fit');
check(/per TWO extra practice hours/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 key: rate in context');
/* the quoted best scores are true */
check(/score 4/.test(STEPS[3].body) && gridMin(DATA.tight.pts).best / 4 === 4, 'the hunted score 4 is the truth');
check(/36, nine times/.test(STEPS[4].body) && gridMin(DATA.loose.pts).best / 4 === 36, 'the quoted 36 is the truth');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — fit to the true grid minimum AND forecast off it.
   ------------------------------------------------------------------------- */
for (const kase of DOCKET) {
  const g = gridMin(kase.pts);
  const chips = forecastChips(kase);
  check(chips.length === 4 && chips.filter((c) => c.ok).length === 1, `${kase.id}: four chips, one truth`);
  check(new Set(chips.map((c) => c.s)).size === chips.length, `${kase.id}: chips pairwise distinct`);
  const truth = chips.find((c) => c.ok).s;
  const t2 = predict2(g.arg.m2, g.arg.b, kase.xStar);
  check(truth === (t2 % 2 === 0 ? String(t2 / 2) : (t2 / 2).toFixed(1)), `${kase.id}: the true chip is the best line's forecast`);
  check(kase.xStar > 12, `${kase.id}: the forecast is a genuine extrapolation`);
  /* the gate, brute-forced over every dial state × every chip */
  for (let m2 = m2Dial.min; m2 <= m2Dial.max; m2++) {
    for (let b = bDial.min; b <= bDial.max; b++) {
      const atMin = ssr4(kase.pts, m2, b) === g.best;
      for (const chip of [...chips.map((c) => c.s), null]) {
        const should = atMin && chip === truth;
        check(isCalibrated(kase, m2, b, chip) === should, `gate: ${kase.id} (${m2},${b}) chip=${chip}`);
      }
      check([0, 50, 100].includes(closeness(kase, m2, b, truth)), 'meter quantized');
    }
  }
  /* right chip on a wrong line: no credit for the forecast */
  check(closeness(kase, g.arg.m2 + 1, g.arg.b, truth) === 0, `${kase.id}: the forecast only counts off the best line`);
}
check(calibChecks(null, 1, 2, '5').every((c) => c === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const drawn = makeCase(null);
  check(DOCKET.some((c) => c.id === drawn.id), 'commissions from the docket');
}
for (let i = 0; i < 100; i++) check(makeCase('f2').id !== 'f2', 'a new commission is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   The line is demoted; the misses wear the accent.
   ------------------------------------------------------------------------- */
const forbid = [
  [/slope triangle|rise over run|\brise\b|\brun\b/i, 'no slope triangle (LineFunctionLab)'],
  [/association|\brugs?\b|\boutliers?\b/i, 'the cloud arrives pre-described (ScatterPlotLab)'],
  [/\bthe mean\b|\bmedian\b|\bMAD\b|deviation/i, 'no univariate statistics (MeanLab/VarianceLab)'],
  [/derivative|\bvertex\b|parabola/i, 'the minimum is hunted, not solved (QuadraticFunctionLab/Calculus)'],
  [/balance|\bscale\b|plank/i, 'no balance device (EquationLab)'],
  [/correlation/i, 'no correlation coefficient (roadmap H24)'],
  [/requestAnimationFrame/, 'nothing animates — the fit is hunted by hand'],
  [/°|\bdegrees?\b|radian/i, 'nothing is measured in angle units'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the score must be DERIVED, integer, and never floated */
check(/const ssr4 = \(pts, m2, b\) =>/.test(code), 'the score is computed from the pairs');
check(/resid2\(p, m2, b\) \*\* 2/.test(code), 'the score is the sum of squared (doubled) misses');
check(!/Math\.pow\(.*0\.5|toFixed\(6\)/.test(code), 'no float scoring');
/* the grid minimum is brute-forced, never stored */
check(!/best:\s*\d/.test(code), 'no dataset ships its own minimum');
check(/function gridMin\(pts\)/.test(code), 'the minimum is hunted by brute force in the model too');
/* the literal squares are drawn from the same residual the model uses */
check(/const r = y - yAt\(x\); \/\/ for pixels only/.test(code), 'the drawing declares its float is pixels-only');
check(/side = Math\.abs\(r\) \* k/.test(code), 'the squares’ sides are the misses');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-bestfit: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
