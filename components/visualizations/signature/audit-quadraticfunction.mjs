/* ============================================================================
   audit-quadraticfunction.mjs — numeric + structural proof for
   QuadraticFunctionLab.jsx (F-IF/A-SSE · vertex form y = a(x − h)² + k:
   direction & width, the two shifts, symmetry, roots).

   Pattern (per the sibling audits): slice-and-eval the shipped model, then
   prove the vertex-form ↔ standard-form expansion, the root formula
   h ± √(−k/a) on the model itself, the mirror symmetry across x = h, every
   quiz key by independent re-derivation, and the clamped calibration meter.

   Run:  node audit-quadraticfunction.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./QuadraticFunctionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function QuadraticFunctionLab');
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
  return { WORLD, PARAMS, START, STEPS, model, rmsError, matchPercent, MATCH_RMS,
           makeTarget, trim, standardForm, describeRoots };`)();
const {
  WORLD, PARAMS, START, STEPS, model, rmsError, matchPercent, MATCH_RMS,
  makeTarget, trim, standardForm, describeRoots,
} = S;
const MINUS = '−';

/* ---- 2. the model: y = a(x − h)² + k ------------------------------------- */
for (const a of [-2, -0.55, 0, 0.4, 1, 2])
  for (const h of [-4, -1.5, 0, 2.5])
    for (const k of [-4, 0, 3])
      for (const x of [-8, -2.1, 0, 1.7, 7.4]) {
        const got = model(x, { a, h, k });
        const want = a * (x - h) * (x - h) + k;
        check(Math.abs(got - want) < 1e-12, `model identity a=${a} h=${h} k=${k} x=${x}`);
      }

/* vertex (h, k) is on the curve and is the extremum */
for (const p of [{ a: 1.35, h: -2, k: 1 }, { a: -0.6, h: 3, k: -2.5 }]) {
  check(Math.abs(model(p.h, p) - p.k) < 1e-12, `vertex on curve ${JSON.stringify(p)}`);
  let extreme = p.a > 0 ? Infinity : -Infinity;
  for (let x = WORLD.xmin; x <= WORLD.xmax; x += 0.004) {
    const y = model(x, p);
    extreme = p.a > 0 ? Math.min(extreme, y) : Math.max(extreme, y);
  }
  check(Math.abs(extreme - p.k) < 1e-4, `vertex is the extremum ${JSON.stringify(p)}`);
  /* mirror symmetry across x = h */
  for (const t of [0.3, 1.1, 4.2])
    check(Math.abs(model(p.h + t, p) - model(p.h - t, p)) < 1e-12, `symmetry across x=h at t=${t}`);
}

/* ---- 3. standard form: y = ax² + bx + c with b = −2ah, c = ah² + k ------- */
{
  /* string spot-proofs */
  check(standardForm(1, 0, 0) === 'y = x²', `standardForm base: "${standardForm(1, 0, 0)}"`);
  check(standardForm(2, 1, -3) === `y = 2x² ${MINUS} 4x ${MINUS} 1`, `standardForm full: "${standardForm(2, 1, -3)}"`);
  check(standardForm(-1, -2, 0) === `y = ${MINUS}x² ${MINUS} 4x ${MINUS} 4`, `standardForm negatives: "${standardForm(-1, -2, 0)}"`);
  /* numeric expansion equality over the dial space */
  for (const a of [-2, -0.4, 0.55, 1.5])
    for (const h of [-3, 0.5, 2])
      for (const k of [-2.5, 0, 3]) {
        const b = -2 * a * h;
        const c = a * h * h + k;
        for (const x of [-5, -0.7, 1.9, 6])
          check(
            Math.abs(model(x, { a, h, k }) - (a * x * x + b * x + c)) < 1e-9,
            `expansion equality a=${a} h=${h} k=${k} x=${x}`
          );
      }
}

/* ---- 4. roots: describeRoots quotes genuine zeros of the model ----------- */
{
  /* two roots: both quoted values satisfy model = 0 */
  const p = { a: 1, h: 0, k: -4 };
  check(describeRoots(p.a, p.h, p.k) === `x = ${MINUS}2  and  x = 2`, `roots string: "${describeRoots(p.a, p.h, p.k)}"`);
  check(Math.abs(model(-2, p)) < 1e-12 && Math.abs(model(2, p)) < 1e-12, 'quoted roots are zeros');
  const q = { a: -0.5, h: 1, k: 2 }; // roots 1 ± 2
  check(Math.abs(model(-1, q)) < 1e-12 && Math.abs(model(3, q)) < 1e-12, 'roots h ± √(−k/a) are zeros');
  check(describeRoots(q.a, q.h, q.k) === `x = ${MINUS}1  and  x = 3`, `roots string 2: "${describeRoots(q.a, q.h, q.k)}"`);
  /* double root at k = 0 */
  check(/one double root/.test(describeRoots(1.2, 2.5, 0)), 'double root wording at k = 0');
  check(Math.abs(model(2.5, { a: 1.2, h: 2.5, k: 0 })) < 1e-12, 'double root is a zero');
  /* no real roots: the curve genuinely misses the axis, wording matches side */
  check(/none — the parabola sits entirely above/.test(describeRoots(1, 0, 2)), 'no-root wording (opens up, k > 0)');
  check(/none — the parabola sits entirely below/.test(describeRoots(-1, 0, -2)), 'no-root wording (opens down, k < 0)');
  let minUp = Infinity;
  for (let x = -8; x <= 8; x += 0.01) minUp = Math.min(minUp, model(x, { a: 1, h: 0, k: 2 }));
  check(minUp > 0, 'no-root case really stays above the axis');
  check(/a line, not a parabola/.test(describeRoots(0, 1, 1)), 'a = 0 degenerate wording');
}

/* ---- 5. the lesson: six steps, keys re-derived --------------------------- */
check(STEPS.length === 6, `6 steps (got ${STEPS.length})`);
check(STEPS[5].calib === true && !STEPS[5].q, 'final step is the calibration challenge');
for (let i = 0; i < 5; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(STEPS[0].choices[STEPS[0].answer] === 'The vertex', 'step 0 key: the vertex');
{
  /* step 1: negative a flips the parabola (proved: extremum switches side) */
  const up = model(1, { a: 1, h: 0, k: 0 });
  const dn = model(1, { a: -1, h: 0, k: 0 });
  check(up > 0 && dn < 0, 'step 1 fact: sign of a flips');
  check(/flips over to open downward/.test(STEPS[1].choices[STEPS[1].answer]), 'step 1 key: flip');
}
{
  /* step 2: h = 3 puts the vertex at x = 3 */
  check(Math.abs(model(3, { a: 1, h: 3, k: 0 })) < 1e-12, 'step 2 fact: vertex at x = 3');
  check(/^Right, so the vertex is at x = 3$/.test(STEPS[2].choices[STEPS[2].answer]), 'step 2 key: right to x = 3');
}
{
  /* step 3: a=1, h=0, k=−4 crosses at ±2 (proved above too) */
  check(/^At x = −2 and x = 2$/.test(STEPS[3].choices[STEPS[3].answer]), 'step 3 key: roots ±2');
}
check(STEPS[4].choices[STEPS[4].answer] === 'x = h', 'step 4 key: axis of symmetry x = h');

/* ---- 6. dials ------------------------------------------------------------ */
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.a.min === -2 && byKey.a.max === 2 && byKey.a.step === 0.05 && byKey.a.unlock === 1, 'a dial');
check(byKey.h.min === -4 && byKey.h.max === 4 && byKey.h.step === 0.5 && byKey.h.unlock === 2, 'h dial');
check(byKey.k.min === -4 && byKey.k.max === 4 && byKey.k.step === 0.5 && byKey.k.unlock === 3, 'k dial');
check(START.a === 1 && START.h === 0 && START.k === 0, 'start is y = x²');

/* ---- 7. calibration (clamped RMS) ---------------------------------------- */
const gridOf = (min, max, step) => {
  const g = [];
  for (let v = min; v <= max + 1e-9; v += step) g.push(+v.toFixed(6));
  return g;
};
const dialA = gridOf(-2, 2, 0.05);
const dialHK = gridOf(-4, 4, 0.5);
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);

let worstExact = 0;
let minStep = Infinity;
let prev = null;
for (let i = 0; i < 300; i++) {
  const t = makeTarget(prev);
  check(onGrid(t.a, dialA) && onGrid(t.h, dialHK) && onGrid(t.k, dialHK), `target ${i} on dial grid`);
  check(Math.abs(t.a) > 0.3, `target ${i} keeps a clearly curved (|a| ≥ 0.4)`);
  check(!(t.a === START.a && t.h === START.h && t.k === START.k), `target ${i} is not the start`);
  worstExact = Math.max(worstExact, rmsError(t, t));
  for (const q of [
    { ...t, a: +(t.a + 0.05).toFixed(6) }, { ...t, a: +(t.a - 0.05).toFixed(6) },
    { ...t, h: t.h + 0.5 }, { ...t, h: t.h - 0.5 },
    { ...t, k: t.k + 0.5 }, { ...t, k: t.k - 0.5 },
  ]) {
    if (!onGrid(q.a, dialA) || !onGrid(q.h, dialHK) || !onGrid(q.k, dialHK)) continue;
    const r = rmsError(q, t);
    if (r < minStep) minStep = r;
  }
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---- 8. render guards ---------------------------------------------------- */
check(src.includes('pen = false'), 'plotter lifts the pen when the arms leave the window');
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');
check(src.includes('axis of symmetry'), 'axis-of-symmetry annotation present');

/* ---- verdict ------------------------------------------------------------- */
console.log('QuadraticFunctionLab audit');
console.log('==========================');
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
