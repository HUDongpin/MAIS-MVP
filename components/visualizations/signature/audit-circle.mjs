/* ============================================================================
   audit-circle.mjs — numeric + structural proof for CircleLab.jsx
   (G-GPE/7.G · (x − h)² + (y − k)² = r², the circle as constant distance,
   the radius triangle as the Pythagorean theorem, C = 2πr and A = πr²).

   Pattern (per the sibling audits): slice-and-eval the shipped model, then
   prove the parametric point lies on the circle exactly, the measurement
   formulas, the r-doubling area law quoted in the lesson, every quiz key,
   and the calibration meter (exact ⇒ 0, one dial step ⇒ never stamps).

   Run:  node audit-circle.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./CircleLab.jsx', import.meta.url));
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

/* ---- 1. slice-and-eval the shipped model (JSX helpers stripped) ---------- */
const importAt = src.indexOf('import { useCallback');
const compAt = src.indexOf('export default function CircleLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');
const headerEnd = src.indexOf('\n', importAt);

function stripJsxFunctions(code) {
  const out = [];
  let i = 0;
  for (;;) {
    const at = code.indexOf('\nfunction ', i);
    if (at < 0) {
      out.push(code.slice(i));
      break;
    }
    const paren = code.indexOf('(', at);
    let pd = 0;
    let pj = paren;
    for (; pj < code.length; pj++) {
      if (code[pj] === '(') pd++;
      else if (code[pj] === ')') {
        pd--;
        if (pd === 0) break;
      }
    }
    const open = code.indexOf('{', pj);
    let depth = 0;
    let j = open;
    for (; j < code.length; j++) {
      if (code[j] === '{') depth++;
      else if (code[j] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = code.slice(at, j + 1);
    out.push(code.slice(i, at));
    if (!/<\/|<>|<[A-Za-z][A-Za-z0-9]*[\s>/]/.test(body)) out.push(body);
    i = j + 1;
  }
  return out.join('');
}

const modelSrc = stripJsxFunctions(src.slice(headerEnd, compAt));
const S = new Function(`${modelSrc}
  return { WORLD, PARAMS, START, STEPS, circlePoint, geometry, rmsError, matchPercent,
           MATCH_RMS, makeTarget, trim, parametricForm };`)();
const {
  WORLD, PARAMS, START, STEPS, circlePoint, geometry, rmsError, matchPercent,
  MATCH_RMS, makeTarget, trim, parametricForm,
} = S;
const PI = Math.PI;

/* ---- 2. the model: every parametric point is exactly one radius out ------ */
for (const r of [1, 2.5, 4, 6])
  for (const h of [-3, 0, 1.5])
    for (const k of [-3, 0.5, 3])
      for (let t = 0; t < 2 * PI; t += PI / 7) {
        const [x, y] = circlePoint(t, { r, h, k });
        const d2 = (x - h) * (x - h) + (y - k) * (y - k);
        check(Math.abs(d2 - r * r) < 1e-12, `(x−h)²+(y−k)² = r² at r=${r} h=${h} k=${k} t=${t.toFixed(2)}`);
      }
/* the whole circle stays inside the window at the dial extremes */
check(3 + 6 <= Math.min(WORLD.xmax, WORLD.ymax), 'max |center| + max radius fits the window');

/* ---- 3. measurements ------------------------------------------------------ */
for (const r of [1, 2, 3.5, 6]) {
  const g = geometry({ r, h: 0, k: 0 });
  check(Math.abs(g.diameter - 2 * r) < 1e-12, `d = 2r at r=${r}`);
  check(Math.abs(g.circumference - 2 * PI * r) < 1e-12, `C = 2πr at r=${r}`);
  check(Math.abs(g.area - PI * r * r) < 1e-12, `A = πr² at r=${r}`);
  check(Math.abs(g.r2 - r * r) < 1e-12, `equation constant r² at r=${r}`);
}
/* the lesson's area law: doubling r makes the area 4×, and C only 2× */
for (const r of [1.5, 3]) {
  const g1 = geometry({ r, h: 0, k: 0 });
  const g2 = geometry({ r: 2 * r, h: 0, k: 0 });
  check(Math.abs(g2.area / g1.area - 4) < 1e-12, `area quadruples when r doubles (r=${r})`);
  check(Math.abs(g2.circumference / g1.circumference - 2) < 1e-12, `circumference doubles when r doubles (r=${r})`);
}

/* ---- 4. formatting -------------------------------------------------------- */
check(parametricForm(4, 0, 0).includes('4') && parametricForm(4, 0, 0).includes('cos') && parametricForm(4, 0, 0).includes('sin'), 'parametric readout names r·cos t and r·sin t');
check(parametricForm(3, 2, -1).includes('2') && parametricForm(3, 2, -1).includes('sin'), 'parametric readout carries the center');
check(trim(-0) === '0' && trim(2.5) === '2.5', 'trim minus handling');

/* ---- 5. the lesson: seven steps, keys re-derived -------------------------- */
check(STEPS.length === 7, `7 steps (got ${STEPS.length})`);
check(STEPS[6].calib === true && !STEPS[6].q, 'final step is the calibration challenge');
for (let i = 0; i < 6; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(/same distance from the center/.test(STEPS[0].choices[STEPS[0].answer]), 'step 0 key: constant distance');
{
  /* step 1: r 4 → 5 moves every point to distance 5 (proved on the model) */
  const [x, y] = circlePoint(1.1, { r: 5, h: 0, k: 0 });
  check(Math.abs(Math.hypot(x, y) - 5) < 1e-12, 'step 1 fact: distance 5');
  check(/distance 5 from the center/.test(STEPS[1].choices[STEPS[1].answer]), 'step 1 key: grows to distance 5');
}
check(STEPS[2].choices[STEPS[2].answer] === 'At x = 3', 'step 2 key: center x = 3');
check(/vertex form/.test(STEPS[3].choices[STEPS[3].answer]), 'step 3 key: the shifted-form family');
check(/^r², always/.test(STEPS[4].choices[STEPS[4].answer]), 'step 4 key: Pythagorean r²');
check(/4 times as large/.test(STEPS[5].choices[STEPS[5].answer]), 'step 5 key: area quadruples');

/* ---- 6. dials -------------------------------------------------------------- */
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.r.min === 1 && byKey.r.max === 6 && byKey.r.step === 0.5 && byKey.r.unlock === 1, 'r dial');
check(byKey.h.min === -3 && byKey.h.max === 3 && byKey.h.step === 0.5 && byKey.h.unlock === 2, 'h dial');
check(byKey.k.min === -3 && byKey.k.max === 3 && byKey.k.step === 0.5 && byKey.k.unlock === 3, 'k dial');
check(START.r === 4 && START.h === 0 && START.k === 0, 'start is r = 4 at the origin');

/* ---- 7. calibration -------------------------------------------------------- */
const gridOf = (min, max, step) => {
  const g = [];
  for (let v = min; v <= max + 1e-9; v += step) g.push(+v.toFixed(6));
  return g;
};
const dialR = gridOf(1, 6, 0.5);
const dialHK = gridOf(-3, 3, 0.5);
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);

let worstExact = 0;
let minStep = Infinity;
let prev = null;
for (let i = 0; i < 300; i++) {
  const t = makeTarget(prev);
  check(onGrid(t.r, dialR) && onGrid(t.h, dialHK) && onGrid(t.k, dialHK), `target ${i} on dial grid`);
  check(!(t.r === START.r && t.h === START.h && t.k === START.k), `target ${i} is not the start`);
  worstExact = Math.max(worstExact, rmsError(t, t));
  for (const q of [
    { ...t, r: t.r + 0.5 }, { ...t, r: t.r - 0.5 },
    { ...t, h: t.h + 0.5 }, { ...t, h: t.h - 0.5 },
    { ...t, k: t.k + 0.5 }, { ...t, k: t.k - 0.5 },
  ]) {
    if (!onGrid(q.r, dialR) || !onGrid(q.h, dialHK) || !onGrid(q.k, dialHK)) continue;
    const r2 = rmsError(q, t);
    if (r2 < minStep) minStep = r2;
  }
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---- 8. render guards ------------------------------------------------------ */
check(src.includes('ctx.closePath()'), 'circle drawn as one closed parametric path');
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');
check(src.includes('= r²'), 'the running Pythagorean readout names r²');

/* ---- verdict --------------------------------------------------------------- */
console.log('CircleLab audit');
console.log('===============');
console.log(`worst exact-target RMS   : ${worstExact.toExponential(2)}  (MATCH_RMS ${MATCH_RMS})`);
console.log(`nearest one-step RMS     : ${minStep.toFixed(4)}  -> ${matchPercent(minStep).toFixed(0)}%`);
console.log('-------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
