/* ============================================================================
   audit-cosine.mjs — numeric + structural proof for CosineFunctionLab.jsx
   (F-TF · y = A·cos(B(x − h)) + k, the graphing form: every dial is one
   geometric feature, and the expanded form φ = −Bh bridges conventions).

   Pattern (per the sibling audits): slice-and-eval the shipped model — the
   audit runs the LAB'S OWN functions — then prove the transform identities
   over the dial space, the graphing↔expanded equivalence, the π-fraction
   formatting, every quiz key by independent re-derivation, and the
   calibration meter (exact ⇒ 0, one dial step ⇒ never stamps).

   Run:  node audit-cosine.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./CosineFunctionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function CosineFunctionLab');
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
    // skip the parameter list first — destructured params carry braces
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
  return { TAU, WORLD, PARAMS, START, STEPS, model, rmsError, matchPercent, MATCH_RMS,
           sameParams, makeTarget, trim, piLabel, expandedForm };`)();
const {
  TAU, WORLD, PARAMS, START, STEPS, model, rmsError, matchPercent, MATCH_RMS,
  makeTarget, trim, piLabel, expandedForm,
} = S;
const PI = Math.PI;
const MINUS = '−';

/* ---- 2. the model: y = A·cos(B(x − h)) + k ------------------------------- */
for (const a of [-3, -1, 0, 0.25, 2.5])
  for (const b of [0.5, 1, 2, 3])
    for (const h of [-PI, 0, PI / 3])
      for (const k of [-1.5, 0, 1.25])
        for (const x of [-5, -0.8, 0, 1.7, 4]) {
          const got = model(x, { a, b, h, k });
          const want = a * Math.cos(b * (x - h)) + k;
          check(Math.abs(got - want) < 1e-12, `model identity a=${a} b=${b} h=${h} k=${k} x=${x}`);
        }

/* the expanded form y = A·cos(Bx + φ) + k with φ = −Bh is the SAME curve */
for (const b of [0.5, 1.25, 2])
  for (const h of [-PI / 2, PI / 12, (3 * PI) / 4]) {
    const p = { a: 1.75, b, h, k: -0.5 };
    const phi = -b * h;
    for (const x of [-2, 0, 0.9, 3])
      check(
        Math.abs(model(x, p) - (p.a * Math.cos(b * x + phi) + p.k)) < 1e-12,
        `expanded form φ=−Bh at b=${b} h=${h} x=${x}`
      );
  }

/* cos(0) = 1 ⇒ the key point (h, k + a) is on the curve, and it is the
   extremum: no sampled point exceeds it (a > 0) or dips below it (a < 0) */
for (const p of [{ a: 2, b: 1.5, h: PI / 4, k: 0.5 }, { a: -1.5, b: 0.5, h: -PI / 2, k: -1 }]) {
  check(Math.abs(model(p.h, p) - (p.k + p.a)) < 1e-12, `key point on curve ${JSON.stringify(p)}`);
  let extreme = p.a > 0 ? -Infinity : Infinity;
  for (let x = WORLD.xmin; x <= WORLD.xmax; x += 0.004) {
    const y = model(x, p);
    extreme = p.a > 0 ? Math.max(extreme, y) : Math.min(extreme, y);
  }
  check(Math.abs(extreme - (p.k + p.a)) < 1e-4, `key point is the extremum ${JSON.stringify(p)}`);
}

/* period TAU/|b| and h as a literal x-shift */
for (const b of [0.5, 1, 1.75, 3]) {
  const p = { a: 1, b, h: PI / 6, k: 0 };
  const T = TAU / Math.abs(b);
  for (let x = -2; x <= 2; x += 0.31)
    check(Math.abs(model(x + T, p) - model(x, p)) < 1e-9, `period 2π/b at b=${b}`);
}
for (const h of [-PI / 2, PI / 4, PI]) {
  const p = { a: 2, b: 1.5, h, k: 1 };
  const p0 = { a: 2, b: 1.5, h: 0, k: 1 };
  for (const x of [-1, 0.4, 2])
    check(Math.abs(model(x, p) - model(x - h, p0)) < 1e-12, `h shifts right by h (h=${h})`);
}

/* ---- 3. formatting ------------------------------------------------------- */
check(piLabel(PI / 2) === 'π/2' && piLabel((2 * PI) / 3) === '2π/3' && piLabel(-PI / 2) === `${MINUS}π/2`, 'piLabel fractions');
check(piLabel(0) === '0' && piLabel(2 * PI) === '2π', 'piLabel edge values');
check(piLabel(0.3) === '0.3', 'piLabel falls back to decimals off the π grid');
{
  const e = expandedForm(1, 2, PI / 4, 0); // φ = −π/2
  check(e === `y = cos(2x ${MINUS} π/2)`, `expandedForm sign handling: "${e}"`);
  check(expandedForm(1, 1, PI / 4, 0) === null, 'expandedForm hidden when b = 1 (identical to graphing form)');
  check(expandedForm(0, 2, 0, 1) === null, 'expandedForm hidden when flat');
}
check(trim(-0) === '0' && trim(-2.5) === `${MINUS}2.5`, 'trim minus handling');

/* ---- 4. the lesson: six steps, keys re-derived --------------------------- */
check(STEPS.length === 6, `6 steps (got ${STEPS.length})`);
check(STEPS[5].calib === true && !STEPS[5].q, 'final step is the calibration challenge');
for (let i = 0; i < 5; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(Math.abs(model(0, { a: 1, b: 1, h: 0, k: 0 }) - 1) < 1e-12 && STEPS[0].choices[STEPS[0].answer] === '1', 'step 0 key: cos(0) = 1');
{
  let mx = -Infinity;
  for (let x = -4; x <= 4; x += 0.001) mx = Math.max(mx, model(x, { a: 3, b: 1, h: 0, k: 0 }));
  check(Math.abs(mx - 3) < 1e-4 && /^3 units/.test(STEPS[1].choices[STEPS[1].answer]), 'step 1 key: |A| = 3');
}
{
  const p = { a: 1, b: 2, h: 0, k: 0 };
  let same = true;
  for (let x = -2; x <= 2; x += 0.17) same = same && Math.abs(model(x + PI, p) - model(x, p)) < 1e-9;
  check(same && STEPS[2].choices[STEPS[2].answer] === 'π', 'step 2 key: period π at B=2');
}
{
  const p = { a: 1, b: 1, h: PI / 2, k: 0 };
  check(Math.abs(model(PI / 2, p) - 1) < 1e-12, 'step 3 fact: peak moved to x = h');
  check(/^Right by π\/2$/.test(STEPS[3].choices[STEPS[3].answer]), 'step 3 key: right by π/2');
}
{
  let mx = -Infinity;
  for (let x = -4; x <= 4; x += 0.001) mx = Math.max(mx, model(x, { a: 1, b: 1, h: 0, k: 1 }));
  check(Math.abs(mx - 2) < 1e-4, 'step 4 fact: k=1 ⇒ max 2');
  check(/^Midline y = 1, maximum 2$/.test(STEPS[4].choices[STEPS[4].answer]), 'step 4 key: midline 1, max 2');
}

/* ---- 5. dials ------------------------------------------------------------ */
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.a.min === -3 && byKey.a.max === 3 && byKey.a.step === 0.25 && byKey.a.unlock === 1, 'a dial');
check(byKey.b.min === 0.5 && byKey.b.max === 3 && byKey.b.step === 0.25 && byKey.b.unlock === 2, 'b dial');
check(Math.abs(byKey.h.min + PI) < 1e-12 && Math.abs(byKey.h.max - PI) < 1e-12 && Math.abs(byKey.h.step - PI / 12) < 1e-12 && byKey.h.unlock === 3, 'h dial');
check(byKey.k.min === -1.5 && byKey.k.max === 1.5 && byKey.k.step === 0.25 && byKey.k.unlock === 4, 'k dial');
check(START.a === 1 && START.b === 1 && START.h === 0 && START.k === 0, 'start is the parent wave');
/* the window really holds the extremes: |k| + |a| ≤ ymax */
check(byKey.k.max + byKey.a.max <= WORLD.ymax, 'peaks stay inside the window');

/* ---- 6. calibration ------------------------------------------------------ */
const gridOf = (min, max, step) => {
  const g = [];
  for (let v = min; v <= max + 1e-9; v += step) g.push(v);
  return g;
};
const dialA = gridOf(-3, 3, 0.25);
const dialB = gridOf(0.5, 3, 0.25);
const dialH = gridOf(-PI, PI, PI / 12);
const dialK = gridOf(-1.5, 1.5, 0.25);
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);

let worstExact = 0;
let minStep = Infinity;
let prev = null;
for (let i = 0; i < 300; i++) {
  const t = makeTarget(prev);
  check(onGrid(t.a, dialA) && onGrid(t.b, dialB) && onGrid(t.h, dialH) && onGrid(t.k, dialK), `target ${i} on dial grid`);
  check(!(t.a === START.a && t.b === START.b && t.h === START.h && t.k === START.k), `target ${i} is not the start`);
  worstExact = Math.max(worstExact, rmsError(t, t));
  for (const q of [
    { ...t, a: t.a + 0.25 }, { ...t, a: t.a - 0.25 },
    { ...t, b: t.b + 0.25 }, { ...t, b: t.b - 0.25 },
    { ...t, h: t.h + PI / 12 }, { ...t, h: t.h - PI / 12 },
    { ...t, k: t.k + 0.25 }, { ...t, k: t.k - 0.25 },
  ]) {
    if (!onGrid(q.a, dialA) || !onGrid(q.b, dialB) || !onGrid(q.h, dialH) || !onGrid(q.k, dialK)) continue;
    const r = rmsError(q, t);
    if (r < minStep) minStep = r;
  }
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---- 7. render guards ---------------------------------------------------- */
check(src.includes('pen = false'), 'plotter lifts the pen when the curve leaves the window');
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');

/* ---- verdict ------------------------------------------------------------- */
console.log('CosineFunctionLab audit');
console.log('=======================');
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
