/* ============================================================================
   audit-ellipse.mjs — numeric + structural proof for EllipseLab.jsx
   (G-GPE · (x − h)²/a² + (y − k)²/b² = 1, taught through the two-foci
   constant-sum property PF₁ + PF₂ = 2·(semi-major axis)).

   Pattern (per the sibling audits): slice-and-eval the shipped model, then
   prove the parametric point satisfies the implicit equation exactly, the
   focal geometry (c² = maj² − min², both orientations, the circle case),
   the CONSTANT-SUM property on the shipped foci, every quiz key, and the
   calibration meter. Also pins the hover parameter conversion
   t = atan2(a·sinθ, b·cosθ) — the 2026-07-26 fix — so the marker keeps
   tracking the pointer's true direction.

   Run:  node audit-ellipse.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./EllipseLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function EllipseLab');
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
  return { WORLD, PARAMS, START, STEPS, ellipsePoint, geometry, dist, rmsError,
           matchPercent, MATCH_RMS, makeTarget, trim, parametricForm };`)();
const {
  WORLD, PARAMS, START, STEPS, ellipsePoint, geometry, dist, rmsError,
  matchPercent, MATCH_RMS, makeTarget, trim, parametricForm,
} = S;
const PI = Math.PI;

/* ---- 2. the model: parametric point satisfies the implicit form ---------- */
for (const a of [1, 2.5, 5, 6])
  for (const b of [1, 3, 6])
    for (const h of [-3, 0, 2])
      for (const k of [-1.5, 0, 3])
        for (let t = 0; t < 2 * PI; t += PI / 7) {
          const [x, y] = ellipsePoint(t, { a, b, h, k });
          const lhs = ((x - h) * (x - h)) / (a * a) + ((y - k) * (y - k)) / (b * b);
          check(Math.abs(lhs - 1) < 1e-12, `implicit = 1 at a=${a} b=${b} h=${h} k=${k} t=${t.toFixed(2)}`);
        }
/* vertices and co-vertices are on the curve at the axis extremes */
{
  const p = { a: 5, b: 3, h: 1, k: -0.5 };
  const [vx] = ellipsePoint(0, p);
  check(Math.abs(vx - (p.h + p.a)) < 1e-12, 'vertex at h + a');
  const [, vy] = ellipsePoint(PI / 2, p);
  check(Math.abs(vy - (p.k + p.b)) < 1e-12, 'co-vertex at k + b');
}

/* ---- 3. focal geometry & THE constant-sum property ----------------------- */
for (const [a, b] of [[5, 3], [3, 5], [4, 4], [6, 1], [2, 6]])
  for (const [h, k] of [[0, 0], [2, -1.5]]) {
    const p = { a, b, h, k };
    const g = geometry(p);
    const maj = Math.max(a, b);
    const min = Math.min(a, b);
    check(Math.abs(g.semiMajor - maj) < 1e-12 && Math.abs(g.semiMinor - min) < 1e-12, `semi-axes sorted (${a},${b})`);
    check(Math.abs(g.c * g.c - (maj * maj - min * min)) < 1e-9, `c² = maj² − min² (${a},${b})`);
    check(Math.abs(g.eccentricity - g.c / maj) < 1e-12 && g.eccentricity < 1, `e = c/maj < 1 (${a},${b})`);
    check(Math.abs(g.focalSum - 2 * maj) < 1e-12, `focal sum = 2·semiMajor (${a},${b})`);
    /* foci on the MAJOR axis, symmetric about the center */
    const [f1, f2] = [g.f1, g.f2];
    check(Math.abs(f1[0] + f2[0] - 2 * h) < 1e-9 && Math.abs(f1[1] + f2[1] - 2 * k) < 1e-9, `foci symmetric (${a},${b})`);
    if (a > b) check(Math.abs(f1[1] - k) < 1e-12 && Math.abs(f2[1] - k) < 1e-12, `foci horizontal (${a},${b})`);
    if (b > a) check(Math.abs(f1[0] - h) < 1e-12 && Math.abs(f2[0] - h) < 1e-12, `foci vertical (${a},${b})`);
    if (a === b) check(g.c < 1e-12, `circle: foci merge at the center (${a},${b})`);
    /* the defining property, on the shipped foci, all around the curve */
    for (let t = 0; t < 2 * PI; t += PI / 9) {
      const [x, y] = ellipsePoint(t, p);
      const sum = dist(x, y, f1[0], f1[1]) + dist(x, y, f2[0], f2[1]);
      check(Math.abs(sum - g.focalSum) < 1e-9, `PF₁+PF₂ constant at t=${t.toFixed(2)} (${a},${b})`);
    }
  }

/* ---- 4. the hover fix: t = atan2(a·sinθ, b·cosθ) marks the pointer's
        true direction (regression pin for the 2026-07-26 fix) -------------- */
check(src.includes('Math.atan2(p.a * (hv.y - p.k), p.b * (hv.x - p.h))'), 'hover uses the parametric-angle conversion');
for (const [a, b] of [[6, 2], [2, 6], [5, 3]])
  for (let thetaDeg = 0; thetaDeg < 360; thetaDeg += 22.5) {
    const th = (thetaDeg * PI) / 180;
    const p = { a, b, h: 1, k: -0.5 };
    /* a pointer somewhere along direction θ from the center */
    const hv = { x: p.h + 10 * Math.cos(th), y: p.k + 10 * Math.sin(th) };
    const t = Math.atan2(p.a * (hv.y - p.k), p.b * (hv.x - p.h));
    const [px, py] = ellipsePoint(t, p);
    const dir = Math.atan2(py - p.k, px - p.h);
    let err = Math.abs(dir - th);
    if (err > PI) err = 2 * PI - err;
    check(err < 1e-9, `hover marker sits in the pointer's direction θ=${thetaDeg}° (${a},${b})`);
  }

/* ---- 5. formatting -------------------------------------------------------- */
check(parametricForm(5, 3, 0, 0).includes('cos') && parametricForm(5, 3, 0, 0).includes('sin'), 'parametric readout present');
check(trim(-0) === '0' && trim(-2.5) === '−2.5', 'trim minus handling');

/* ---- 6. the lesson: seven steps, keys re-derived --------------------------- */
check(STEPS.length === 7, `7 steps (got ${STEPS.length})`);
check(STEPS[6].calib === true && !STEPS[6].q, 'final step is the calibration challenge');
for (let i = 0; i < 6; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(STEPS[0].choices[STEPS[0].answer] === 'The major axis', 'step 0 key: major axis');
check(/reaching x = h ± a/.test(STEPS[1].choices[STEPS[1].answer]), 'step 1 key: x = h ± a');
{
  /* step 2: a = b really is a circle (equal distance in every direction) */
  const p = { a: 4, b: 4, h: 0, k: 0 };
  let round = true;
  for (let t = 0; t < 2 * PI; t += 0.4) {
    const [x, y] = ellipsePoint(t, p);
    round = round && Math.abs(Math.hypot(x, y) - 4) < 1e-12;
  }
  check(round, 'step 2 fact: a=b is a circle');
  check(STEPS[2].choices[STEPS[2].answer] === 'A perfect circle', 'step 2 key: circle');
}
check(STEPS[3].choices[STEPS[3].answer] === 'At x = 3', 'step 3 key: center x = 3');
check(/vertex form/.test(STEPS[4].choices[STEPS[4].answer]), 'step 4 key: the (h, k) family');
check(/stays constant/.test(STEPS[5].choices[STEPS[5].answer]), 'step 5 key: constant sum');

/* ---- 7. dials --------------------------------------------------------------- */
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.a.min === 1 && byKey.a.max === 6 && byKey.a.step === 0.5 && byKey.a.unlock === 1, 'a dial');
check(byKey.b.min === 1 && byKey.b.max === 6 && byKey.b.step === 0.5 && byKey.b.unlock === 2, 'b dial');
check(byKey.h.min === -3 && byKey.h.max === 3 && byKey.h.step === 0.5 && byKey.h.unlock === 3, 'h dial');
check(byKey.k.min === -3 && byKey.k.max === 3 && byKey.k.step === 0.5 && byKey.k.unlock === 4, 'k dial');
check(START.a === 5 && START.b === 3 && START.h === 0 && START.k === 0, 'start is the 5×3 ellipse');
check(3 + 6 <= Math.min(WORLD.xmax, WORLD.ymax), 'max |center| + max semi-axis fits the window');

/* ---- 8. calibration ---------------------------------------------------------- */
const gridOf = (min, max, step) => {
  const g = [];
  for (let v = min; v <= max + 1e-9; v += step) g.push(+v.toFixed(6));
  return g;
};
const dialAB = gridOf(1, 6, 0.5);
const dialHK = gridOf(-3, 3, 0.5);
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);

let worstExact = 0;
let minStep = Infinity;
let prev = null;
for (let i = 0; i < 300; i++) {
  const t = makeTarget(prev);
  check(onGrid(t.a, dialAB) && onGrid(t.b, dialAB) && onGrid(t.h, dialHK) && onGrid(t.k, dialHK), `target ${i} on dial grid`);
  check(Math.abs(t.a - t.b) >= 1 - 1e-9, `target ${i} is a clear ellipse (|a−b| ≥ 1)`);
  check(!(t.a === START.a && t.b === START.b && t.h === START.h && t.k === START.k), `target ${i} is not the start`);
  worstExact = Math.max(worstExact, rmsError(t, t));
  for (const q of [
    { ...t, a: t.a + 0.5 }, { ...t, a: t.a - 0.5 },
    { ...t, b: t.b + 0.5 }, { ...t, b: t.b - 0.5 },
    { ...t, h: t.h + 0.5 }, { ...t, h: t.h - 0.5 },
    { ...t, k: t.k + 0.5 }, { ...t, k: t.k - 0.5 },
  ]) {
    if (!onGrid(q.a, dialAB) || !onGrid(q.b, dialAB) || !onGrid(q.h, dialHK) || !onGrid(q.k, dialHK)) continue;
    const r = rmsError(q, t);
    if (r < minStep) minStep = r;
  }
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---- 9. render guards ---------------------------------------------------------- */
check(src.includes('ctx.closePath()'), 'ellipse drawn as one closed parametric path');
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');
check(src.includes('PF₁ + PF₂'), 'the running focal-sum readout is present');

/* ---- verdict --------------------------------------------------------------------- */
console.log('EllipseLab audit');
console.log('================');
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
