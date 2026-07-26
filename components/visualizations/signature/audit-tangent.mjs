/* ============================================================================
   audit-tangent.mjs — numeric + structural proof for TangentFunctionLab.jsx
   (F-TF · y = a·tan(b(x − h)) + k: period π/b, asymptotes where the inside
   hits an odd multiple of π/2, centre points on the midline).

   Pattern (per the sibling audits): slice-and-eval the shipped model, then
   prove the asymptote/centre lattice, the period, the midline, the clamped
   calibration meter, every quiz key by independent re-derivation, and the
   π-half tick formatter. Structural greps pin the branch-break render guards.

   Run:  node audit-tangent.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./TangentFunctionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function TangentFunctionLab');
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
  return { PI, WORLD, PARAMS, START, STEPS, model, rmsError, matchPercent, MATCH_RMS,
           makeTarget, trim, piHalfLabel, tanEquation, describeAsymptotes };`)();
const {
  PI, WORLD, PARAMS, START, STEPS, model, rmsError, matchPercent, MATCH_RMS,
  makeTarget, trim, piHalfLabel, tanEquation, describeAsymptotes,
} = S;
const MINUS = '−';

/* ---- 2. the model: y = a·tan(b(x − h)) + k ------------------------------- */
for (const a of [-3, -1, 0.25, 2])
  for (const b of [0.5, 1, 2.5])
    for (const h of [-3, 0, 1.5])
      for (const k of [-2, 0, 3])
        for (const x of [-4.9, -1.1, 0, 0.8, 4.2]) {
          const got = model(x, { a, b, h, k });
          const want = a * Math.tan(b * (x - h)) + k;
          check(
            (Number.isNaN(got) && Number.isNaN(want)) || Math.abs(got - want) < 1e-9,
            `model identity a=${a} b=${b} h=${h} k=${k} x=${x}`
          );
        }

/* centre points x = h + nπ/b sit ON the midline, with slope a·b (steepest) */
for (const p of [{ a: 1.5, b: 1, h: 0.5, k: -1 }, { a: -2, b: 2, h: -0.75, k: 2 }]) {
  for (let n = -3; n <= 3; n++) {
    const xc = p.h + (n * PI) / p.b;
    check(Math.abs(model(xc, p) - p.k) < 1e-9, `centre on midline n=${n} ${JSON.stringify(p)}`);
    const eps = 1e-6;
    const slope = (model(xc + eps, p) - model(xc - eps, p)) / (2 * eps);
    check(Math.abs(slope - p.a * p.b) < 1e-3, `centre slope a·b n=${n} ${JSON.stringify(p)}`);
  }
  /* asymptotes x = h + (π/2 + nπ)/b: the inside is an odd multiple of π/2,
     i.e. cos(inside) = 0, and the curve blows up on both sides */
  for (let n = -2; n <= 2; n++) {
    const xa = p.h + (PI / 2 + n * PI) / p.b;
    check(Math.abs(Math.cos(p.b * (xa - p.h))) < 1e-9, `cos = 0 at asymptote n=${n}`);
    const before = model(xa - 1e-4, p);
    const after = model(xa + 1e-4, p);
    check(Math.abs(before) > 1e3 && Math.abs(after) > 1e3 && Math.sign(before) !== Math.sign(after),
      `blow-up with sign flip across asymptote n=${n}`);
  }
  /* period π/b, avoiding the poles */
  const T = PI / p.b;
  for (let x = -2; x <= 2; x += 0.23) {
    if (Math.abs(Math.cos(p.b * (x - p.h))) < 0.05) continue;
    check(Math.abs(model(x + T, p) - model(x, p)) < 1e-6, `period π/b at x=${x.toFixed(2)}`);
  }
}

/* ---- 3. formatting ------------------------------------------------------- */
check(piHalfLabel(0) === '0' && piHalfLabel(1) === 'π/2' && piHalfLabel(2) === 'π', 'piHalfLabel basics');
check(piHalfLabel(3) === '3π/2' && piHalfLabel(4) === '2π' && piHalfLabel(-1) === `${MINUS}π/2`, 'piHalfLabel signs & reduction');
check(tanEquation(1, 1, 0, 0) === 'y = tan(x)', `equation base: "${tanEquation(1, 1, 0, 0)}"`);
check(tanEquation(-1, 2, 0.5, 0) === `y = ${MINUS}tan(2(x ${MINUS} 0.5))`, `equation composed: "${tanEquation(-1, 2, 0.5, 0)}"`);
check(tanEquation(2, 1, -1, -3) === `y = 2 tan(x + 1) ${MINUS} 3`, `equation shifts: "${tanEquation(2, 1, -1, -3)}"`);
{
  /* describeAsymptotes: the two quoted x-values must be genuine asymptotes,
     one on each side of the centre, spaced by the period */
  const b = 2;
  const h = 0.5;
  const half = PI / (2 * b);
  const want = `x = ${trim(h - half)},  ${trim(h + half)}   (repeating every ${(PI / b).toFixed(2)})`;
  check(describeAsymptotes(b, h) === want, `describeAsymptotes: "${describeAsymptotes(b, h)}"`);
  check(Math.abs(Math.cos(b * (h + half - h))) < 1e-12, 'quoted asymptote really has cos = 0');
}

/* ---- 4. the lesson: seven steps, keys re-derived ------------------------- */
check(STEPS.length === 7, `7 steps (got ${STEPS.length})`);
check(STEPS[6].calib === true && !STEPS[6].q, 'final step is the calibration challenge');
for (let i = 0; i < 6; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(STEPS[0].choices[STEPS[0].answer] === 'Vertical asymptotes', 'step 0 key: vertical asymptotes');
check(/steeply|stretched vertically/.test(STEPS[1].choices[STEPS[1].answer]), 'step 1 key: vertical stretch');
{
  /* step 2: b = 2 ⇒ period π/2 (proved on the model) */
  const p = { a: 1, b: 2, h: 0, k: 0 };
  let same = true;
  for (let x = -1; x <= 1; x += 0.11) {
    if (Math.abs(Math.cos(p.b * x)) < 0.05) continue;
    same = same && Math.abs(model(x + PI / 2, p) - model(x, p)) < 1e-6;
  }
  check(same, 'step 2 fact: b=2 has period π/2');
  check(STEPS[2].choices[STEPS[2].answer] === 'π/2', 'step 2 key: π/2');
}
check(/^Right/.test(STEPS[3].choices[STEPS[3].answer]), 'step 3 key: shifts right');
{
  /* step 4: k = 2 lifts every centre to y = 2, asymptotes unmoved */
  const p = { a: 1, b: 1, h: 0, k: 2 };
  check(Math.abs(model(0, p) - 2) < 1e-12, 'step 4 fact: centre at y = k');
  check(/y = 2/.test(STEPS[4].choices[STEPS[4].answer]), 'step 4 key: midline y = 2');
}
check(/b\(x − h\) = π\/2 \+ nπ/.test(STEPS[5].choices[STEPS[5].answer]), 'step 5 key: odd multiples of π/2');

/* ---- 5. dials ------------------------------------------------------------ */
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.a.min === -3 && byKey.a.max === 3 && byKey.a.step === 0.25 && byKey.a.unlock === 1, 'a dial');
check(byKey.b.min === 0.5 && byKey.b.max === 3 && byKey.b.step === 0.25 && byKey.b.unlock === 2, 'b dial');
check(byKey.h.min === -3 && byKey.h.max === 3 && byKey.h.step === 0.25 && byKey.h.unlock === 3, 'h dial');
check(byKey.k.min === -3 && byKey.k.max === 3 && byKey.k.step === 0.25 && byKey.k.unlock === 4, 'k dial');
check(START.a === 1 && START.b === 1 && START.h === 0 && START.k === 0, 'start is the plain tangent');

/* ---- 6. calibration (clamped RMS) ---------------------------------------- */
const gridOf = (min, max, step) => {
  const g = [];
  for (let v = min; v <= max + 1e-9; v += step) g.push(+v.toFixed(6));
  return g;
};
const dialGrid = gridOf(-3, 3, 0.25);
const dialBGrid = gridOf(0.5, 3, 0.25);
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);

let worstExact = 0;
let minStep = Infinity;
let prev = null;
for (let i = 0; i < 300; i++) {
  const t = makeTarget(prev);
  check(onGrid(t.a, dialGrid) && onGrid(t.b, dialBGrid) && onGrid(t.h, dialGrid) && onGrid(t.k, dialGrid), `target ${i} on dial grid`);
  check(!(t.a === START.a && t.b === START.b && t.h === START.h && t.k === START.k), `target ${i} is not the start`);
  worstExact = Math.max(worstExact, rmsError(t, t));
  for (const q of [
    { ...t, a: t.a + 0.25 }, { ...t, a: t.a - 0.25 },
    { ...t, b: t.b + 0.25 }, { ...t, b: t.b - 0.25 },
    { ...t, h: t.h + 0.25 }, { ...t, h: t.h - 0.25 },
    { ...t, k: t.k + 0.25 }, { ...t, k: t.k - 0.25 },
  ]) {
    if (!onGrid(q.a, dialGrid) || !onGrid(q.b, dialBGrid) || !onGrid(q.h, dialGrid) || !onGrid(q.k, dialGrid)) continue;
    const r = rmsError(q, t);
    if (r < minStep) minStep = r;
  }
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---- 7. render guards ---------------------------------------------------- */
check(src.includes('pen = false'), 'plotter lifts the pen when the value leaves the window');
check(src.includes('H * 0.6'), 'branch-jump guard breaks the path across an asymptote');
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');

/* ---- verdict ------------------------------------------------------------- */
console.log('TangentFunctionLab audit');
console.log('========================');
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
