/* ============================================================================
   audit-sine.mjs — numeric + structural proof for SineFunctionLab.jsx
   (F-TF · y = A·sin(Bx + C) + D: amplitude, period, phase, midline).

   Pattern (per the sibling audits): slice-and-eval the shipped model — the
   audit runs the LAB'S OWN functions, not a re-implementation — then prove
   every stated fact: the transform identities over the whole dial space, the
   π-fraction formatting (period, phase, equation), every quiz answer key by
   independent re-derivation, and the calibration meter (exact target -> 0,
   one dial step -> never stamps). Structural greps pin the render guards.

   Run:  node audit-sine.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./SineFunctionLab.jsx', import.meta.url));
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
   1. SLICE AND EVAL the shipped model (everything above the component). Any
   top-level `function Name(...) {...}` whose body contains JSX is dropped —
   Function() cannot parse JSX, and the audit proves math, not markup. Brace
   depth balances through template placeholders, so the scan is exact here.
   ------------------------------------------------------------------------- */
const importAt = src.indexOf('import { useCallback');
const compAt = src.indexOf('export default function SineFunctionLab');
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
  return { PI, WORLD, PARAMS, START, STEPS, model, rmsError, matchPercent, MATCH_RMS,
           makeTarget, trim, gcd, piRatio, nCof, sineEquation, periodStr, phaseStr };`)();
const {
  PI, WORLD, PARAMS, START, STEPS, model, rmsError, matchPercent, MATCH_RMS,
  makeTarget, trim, piRatio, nCof, sineEquation, periodStr, phaseStr,
} = S;

/* ---------------------------------------------------------------------------
   2. THE MODEL — y = A·sin(Bx + C) + D, proved against Math directly.
   ------------------------------------------------------------------------- */
const dialA = [];
for (let v = -3; v <= 3 + 1e-9; v += 0.25) dialA.push(+v.toFixed(2));
const dialB = [];
for (let v = 0.5; v <= 3 + 1e-9; v += 0.25) dialB.push(+v.toFixed(2));
const dialC = [];
for (let n = -12; n <= 12; n++) dialC.push((n * PI) / 12);
const dialD = dialA;

for (const A of [-3, -1, 0, 0.25, 2])
  for (const B of [0.5, 1, 2.5])
    for (const C of [-PI, 0, PI / 3])
      for (const D of [-2, 0, 1.5])
        for (const x of [-5, -1.2, 0, 0.7, 4]) {
          const got = model(x, { A, B, C, D });
          const want = A * Math.sin(B * x + C) + D;
          check(Math.abs(got - want) < 1e-12, `model identity at A=${A} B=${B} C=${C} D=${D} x=${x}`);
        }

/* periodicity: T = 2π/B is a period, and T/2 is NOT (fundamental, A≠0) */
for (const B of dialB) {
  const p = { A: 1.5, B, C: PI / 6, D: -0.5 };
  const T = (2 * PI) / B;
  let maxHalf = 0;
  for (let x = -3; x <= 3; x += 0.37) {
    check(Math.abs(model(x + T, p) - model(x, p)) < 1e-9, `period 2π/B at B=${B} x=${x.toFixed(2)}`);
    maxHalf = Math.max(maxHalf, Math.abs(model(x + T / 2, p) - model(x, p)));
  }
  check(maxHalf > 1, `half period is not a period at B=${B}`);
}

/* phase: the curve equals the C=0 curve shifted by s = −C/B */
for (const B of [0.5, 1, 1.75, 3])
  for (const C of [-PI, -PI / 2, PI / 12, (5 * PI) / 6]) {
    const p = { A: 2, B, C, D: 1 };
    const p0 = { A: 2, B, C: 0, D: 1 };
    const s = -C / B;
    for (const x of [-2, 0, 1.3])
      check(Math.abs(model(x, p) - model(x - s, p0)) < 1e-9, `phase shift −C/B at B=${B} C=${C}`);
  }

/* range: max = D+|A|, min = D−|A| over a dense sweep */
for (const p of [{ A: 2.5, B: 1, C: 0, D: 1 }, { A: -1.75, B: 2, C: PI / 4, D: -2 }]) {
  let mx = -Infinity;
  let mn = Infinity;
  for (let x = WORLD.xmin; x <= WORLD.xmax; x += 0.003) {
    const y = model(x, p);
    if (y > mx) mx = y;
    if (y < mn) mn = y;
  }
  check(Math.abs(mx - (p.D + Math.abs(p.A))) < 1e-4, `max = D+|A| for ${JSON.stringify(p)}`);
  check(Math.abs(mn - (p.D - Math.abs(p.A))) < 1e-4, `min = D−|A| for ${JSON.stringify(p)}`);
}

/* ---------------------------------------------------------------------------
   3. FORMATTING — the π-fraction strings, checked by independent reduction.
   ------------------------------------------------------------------------- */
const MINUS = '−';
function reduced(num, den) {
  const g = (function gg(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  })(num, den);
  return [num / g, den / g];
}
function piFrac(num, den) {
  if (num === 0) return '0';
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const [n0, d] = reduced(num, den);
  const sign = n0 < 0 ? MINUS : '';
  const n = Math.abs(n0);
  const core = d === 1 ? (n === 1 ? 'π' : `${n}π`) : n === 1 ? `π/${d}` : `${n}π/${d}`;
  return sign + core;
}
/* periodStr(B) must be the reduced form of 2π/B (B on the 0.25 grid ⇒ 4B ∈ ℤ) */
for (const B of dialB) check(periodStr(B) === piFrac(8, Math.round(4 * B)), `periodStr(${B})`);
check(periodStr(1) === '2π', 'periodStr(1) = 2π');
check(periodStr(2) === 'π', 'periodStr(2) = π');
/* phaseStr: magnitude |C/B| as a π-fraction; +C reads left, −C reads right */
for (const B of [0.5, 1, 2])
  for (const n of [-12, -3, 0, 1, 6, 12]) {
    const C = (n * PI) / 12;
    const got = phaseStr(B, C);
    if (n === 0) check(got === 'none', `phaseStr none at C=0 B=${B}`);
    else {
      const mag = piFrac(Math.abs(n), Math.round(12 * B));
      const dir = n > 0 ? '← left' : '→ right'; // thin space after the arrow
      check(got === `${mag} ${dir}`, `phaseStr(${B}, ${n}π/12): "${got}"`);
    }
  }
/* nCof inverts the dial's π/12 grid exactly */
for (let n = -12; n <= 12; n++) check(nCof((n * PI) / 12) === n, `nCof at n=${n}`);
/* the equation readout, spot-proved on exact strings */
check(sineEquation(1, 1, 0, 0) === 'y = sin(x)', `equation base: "${sineEquation(1, 1, 0, 0)}"`);
check(sineEquation(2, 1, PI / 4, -1) === `y = 2 sin(x + π/4) ${MINUS} 1`, `equation full: "${sineEquation(2, 1, PI / 4, -1)}"`);
check(sineEquation(-1, 2, -PI / 2, 0) === `y = ${MINUS}sin(2x ${MINUS} π/2)`, `equation neg: "${sineEquation(-1, 2, -PI / 2, 0)}"`);
check(sineEquation(0, 1, 0, 1.5) === 'y = 1.5', `equation flat: "${sineEquation(0, 1, 0, 1.5)}"`);
check(trim(-0) === '0' && trim(2.5) === '2.5' && trim(-1.25) === `${MINUS}1.25`, 'trim minus handling');

/* ---------------------------------------------------------------------------
   4. THE LESSON — six steps; every quiz key re-derived independently.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, `6 steps (got ${STEPS.length})`);
check(STEPS[5].calib === true && !STEPS[5].q, 'final step is the calibration challenge');
for (let i = 0; i < 5; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
/* step 0: the length of one repeat is the period */
check(STEPS[0].choices[STEPS[0].answer] === 'The period', 'step 0 key: period');
/* step 1: A = 2 ⇒ peak sits |A| = 2 above the midline (proved on the model) */
{
  let mx = -Infinity;
  for (let x = -4; x <= 4; x += 0.001) mx = Math.max(mx, model(x, { A: 2, B: 1, C: 0, D: 0 }));
  check(Math.abs(mx - 2) < 1e-4, 'step 1 fact: A=2 peaks at 2');
  check(/^2 units/.test(STEPS[1].choices[STEPS[1].answer]), 'step 1 key: 2 units');
}
/* step 2: B = 2 ⇒ period π (proved), key names the squeeze */
{
  const p = { A: 1, B: 2, C: 0, D: 0 };
  let same = true;
  for (let x = -2; x <= 2; x += 0.17) same = same && Math.abs(model(x + PI, p) - model(x, p)) < 1e-9;
  check(same, 'step 2 fact: B=2 has period π');
  check(/period π/.test(STEPS[2].choices[STEPS[2].answer]), 'step 2 key: period π');
}
/* step 3: C = π/2, B = 1 ⇒ slide LEFT by π/2 (proved via the shift identity) */
{
  const p = { A: 1, B: 1, C: PI / 2, D: 0 };
  const p0 = { A: 1, B: 1, C: 0, D: 0 };
  let ok3 = true;
  for (const x of [-1, 0, 0.6]) ok3 = ok3 && Math.abs(model(x, p) - model(x + PI / 2, p0)) < 1e-12;
  check(ok3, 'step 3 fact: +π/2 phase = left shift');
  check(/^Left by π\/2$/.test(STEPS[3].choices[STEPS[3].answer]), 'step 3 key: left by π/2');
}
/* step 4: D = 1, A = 2 ⇒ maximum 3 (proved) */
{
  let mx = -Infinity;
  for (let x = -4; x <= 4; x += 0.001) mx = Math.max(mx, model(x, { A: 2, B: 1, C: 0, D: 1 }));
  check(Math.abs(mx - 3) < 1e-4, 'step 4 fact: max D+|A| = 3');
  check(STEPS[4].choices[STEPS[4].answer] === '3', 'step 4 key: 3');
}

/* ---------------------------------------------------------------------------
   5. DIALS — ranges, steps and unlock order exactly as the lesson stages them.
   ------------------------------------------------------------------------- */
check(PARAMS.length === 4, '4 dials');
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.A.min === -3 && byKey.A.max === 3 && byKey.A.step === 0.25 && byKey.A.unlock === 1, 'A dial');
check(byKey.B.min === 0.5 && byKey.B.max === 3 && byKey.B.step === 0.25 && byKey.B.unlock === 2, 'B dial');
check(Math.abs(byKey.C.min + PI) < 1e-12 && Math.abs(byKey.C.max - PI) < 1e-12 && Math.abs(byKey.C.step - PI / 12) < 1e-12 && byKey.C.unlock === 3, 'C dial');
check(byKey.D.min === -3 && byKey.D.max === 3 && byKey.D.step === 0.25 && byKey.D.unlock === 4, 'D dial');
check(START.A === 1 && START.B === 1 && START.C === 0 && START.D === 0, 'start is the parent wave');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — targets on the dial grid; exact ⇒ 0; one step ⇒ no stamp.
   ------------------------------------------------------------------------- */
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);
let worstExact = 0;
let minStep = Infinity;
let prev = null;
for (let i = 0; i < 300; i++) {
  const t = makeTarget(prev);
  check(onGrid(t.A, dialA) && onGrid(t.B, dialB) && onGrid(t.C, dialC) && onGrid(t.D, dialD), `target ${i} on dial grid`);
  check(!(t.A === START.A && t.B === START.B && t.C === START.C && t.D === START.D), `target ${i} is not the start`);
  if (prev) check(!(t.A === prev.A && t.B === prev.B && t.C === prev.C && t.D === prev.D), `target ${i} differs from prev`);
  worstExact = Math.max(worstExact, rmsError(t, t));
  for (const q of [
    { ...t, A: t.A + 0.25 }, { ...t, A: t.A - 0.25 },
    { ...t, B: t.B + 0.25 }, { ...t, B: t.B - 0.25 },
    { ...t, C: t.C + PI / 12 }, { ...t, C: t.C - PI / 12 },
    { ...t, D: t.D + 0.25 }, { ...t, D: t.D - 0.25 },
  ]) {
    // only dial-reachable neighbours count — a step off the end of a slider
    // is not a state the student can be in
    if (!onGrid(q.A, dialA) || !onGrid(q.B, dialB) || !onGrid(q.C, dialC) || !onGrid(q.D, dialD)) continue;
    const r = rmsError(q, t);
    if (r < minStep) minStep = r;
  }
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---------------------------------------------------------------------------
   7. RENDER GUARDS — grep-pinned (the audit can't run the canvas).
   ------------------------------------------------------------------------- */
check(src.includes('pen = false'), 'plotter lifts the pen when the curve leaves the window');
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');
check(src.includes("xp -= Math.round(xp / T) * T"), 'amplitude bracket snaps to the peak nearest the axis');

/* ---------------------------------------------------------------------------
   Verdict
   ------------------------------------------------------------------------- */
console.log('SineFunctionLab audit');
console.log('=====================');
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
