/* ============================================================================
   audit-secant.mjs — numeric + structural proof for SecantFunctionLab.jsx
   (F-TF · y = a·sec(b(x − c)) + d = a/cos(b(x − c)) + d, taught as the
   reciprocal of the guide cosine drawn behind it).

   Pattern (per the sibling audits): slice-and-eval the shipped model, then
   prove the reciprocal identity, the forbidden band |y − d| ≥ a, the
   turning-point lattice (cos(mπ) = (−1)^m), the asymptote lattice, the
   guide-cosine calibration (measuring the bounded partner is exact for the
   secant), every quiz key, and the period/spacing strings.

   Run:  node audit-secant.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./SecantFunctionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function SecantFunctionLab');
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
  return { PI, WORLD, PARAMS, START, STEPS, model, guide, rmsError, matchPercent, MATCH_RMS,
           makeTarget, trim, innerArg, secantForm, reciprocalForm, periodStr, spacingStr };`)();
const {
  PI, WORLD, PARAMS, START, STEPS, model, guide, rmsError, matchPercent, MATCH_RMS,
  makeTarget, trim, secantForm, reciprocalForm, periodStr, spacingStr,
} = S;
const MINUS = '−';

/* ---- 2. the model: reciprocal identity + forbidden band ------------------ */
for (const a of [0.5, 1, 1.75, 2.5])
  for (const b of [0.5, 1, 2, 2.5])
    for (const c of [-1.5, 0, 0.75])
      for (const d of [-2, 0, 1.5])
        for (const x of [-6, -1.3, 0, 0.9, 5.2]) {
          const p = { a, b, c, d };
          const cos = Math.cos(b * (x - c));
          const want = a / cos + d;
          const got = model(x, p);
          check(Math.abs(got - want) < 1e-9, `model = a/cos identity at ${JSON.stringify(p)} x=${x}`);
          /* secant · cosine = a² above the shared midline: (sec−d)(cos_guide−d) = a² */
          const g = guide(x, p);
          check(Math.abs((got - d) * (g - d) - a * a) < 1e-6, `reciprocal product a² at x=${x}`);
        }

/* forbidden band: every finite point keeps |y − d| ≥ a (with equality only
   at the turning points) */
for (const p of [{ a: 1, b: 1, c: 0, d: 0 }, { a: 2, b: 1.5, c: 0.5, d: -1 }]) {
  let closest = Infinity;
  for (let x = WORLD.xmin; x <= WORLD.xmax; x += 0.002) {
    const y = model(x, p);
    if (!isFinite(y) || Math.abs(y) > 1e6) continue;
    closest = Math.min(closest, Math.abs(y - p.d));
  }
  check(closest >= p.a - 1e-6, `|y − d| ≥ a for ${JSON.stringify(p)} (closest ${closest.toFixed(6)})`);
  check(closest < p.a + 1e-3, `the band boundary is attained (turning points) ${JSON.stringify(p)}`);
}

/* turning points x = c + mπ/b: on the curve at y = d + a·(−1)^m, touching the
   guide cosine there */
for (const p of [{ a: 1.25, b: 1, c: 0.25, d: 0.5 }, { a: 2, b: 2, c: -0.5, d: -1.5 }]) {
  for (let m = -3; m <= 3; m++) {
    const xt = p.c + (m * PI) / p.b;
    const want = p.d + p.a * (m % 2 === 0 ? 1 : -1);
    check(Math.abs(model(xt, p) - want) < 1e-9, `turning point m=${m} at d ± a`);
    check(Math.abs(guide(xt, p) - model(xt, p)) < 1e-9, `secant kisses the guide at m=${m}`);
  }
  /* asymptotes x = c + (n + ½)π/b: cos = 0, curve blows up with a sign flip */
  for (let n = -2; n <= 2; n++) {
    const xa = p.c + ((n + 0.5) * PI) / p.b;
    check(Math.abs(Math.cos(p.b * (xa - p.c))) < 1e-9, `cos = 0 at asymptote n=${n}`);
    const before = model(xa - 1e-5, p);
    const after = model(xa + 1e-5, p);
    check(Math.abs(before) > 1e4 && Math.abs(after) > 1e4 && Math.sign(before) !== Math.sign(after),
      `blow-up with sign flip across asymptote n=${n}`);
  }
}

/* ---- 3. the guide-cosine calibration is exact for the secant ------------- */
/* identical guides ⇒ identical secants: with a > 0 the guide's midline is d,
   its amplitude is a, so guide equality pins (a, d) and the phase lattice —
   proved here numerically: whenever the guide-RMS is 0 the secant curves
   agree at every sampled non-pole point (the c ↦ c + 2π/b alias included). */
{
  const t = { a: 1.5, b: 1, c: 0.5, d: -0.5 };
  const alias = { a: 1.5, b: 1, c: 0.5 + 2 * PI, d: -0.5 };
  check(rmsError(alias, t) < 1e-9, 'period alias has guide-RMS 0');
  let agree = true;
  for (let x = -6; x <= 6; x += 0.037) {
    const cos = Math.cos(t.b * (x - t.c));
    if (Math.abs(cos) < 0.05) continue;
    agree = agree && Math.abs(model(x, alias) - model(x, t)) < 1e-6;
  }
  check(agree, 'guide-identical parameters draw the same secant');
}

/* ---- 4. formatting ------------------------------------------------------- */
check(secantForm(1, 1, 0, 0) === 'y = sec(x)', `secantForm base: "${secantForm(1, 1, 0, 0)}"`);
check(secantForm(2, 1.5, 0.5, -1) === `y = 2 sec(1.5(x ${MINUS} 0.5)) ${MINUS} 1`, `secantForm full: "${secantForm(2, 1.5, 0.5, -1)}"`);
check(reciprocalForm(1, 1, 0, 0) === 'y = 1 / cos(x)', `reciprocalForm base: "${reciprocalForm(1, 1, 0, 0)}"`);
check(reciprocalForm(2, 1, -0.75, 0.5) === 'y = 2 / cos(x + 0.75) + 0.5', `reciprocalForm shifted: "${reciprocalForm(2, 1, -0.75, 0.5)}"`);
check(periodStr(1) === `2π ≈ ${(2 * PI).toFixed(2)}`, `periodStr(1): "${periodStr(1)}"`);
check(periodStr(2) === `2π / 2 ≈ ${PI.toFixed(2)}`, `periodStr(2): "${periodStr(2)}"`);
check(spacingStr(1) === `π ≈ ${PI.toFixed(2)}`, `spacingStr(1): "${spacingStr(1)}"`);
check(spacingStr(0.5) === `π / 0.5 ≈ ${(2 * PI).toFixed(2)}`, `spacingStr(0.5): "${spacingStr(0.5)}"`);

/* ---- 5. the lesson: seven steps, keys re-derived ------------------------- */
check(STEPS.length === 7, `7 steps (got ${STEPS.length})`);
check(STEPS[6].calib === true && !STEPS[6].q, 'final step is the calibration challenge');
for (let i = 0; i < 6; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(Math.abs(model(0, { a: 1, b: 1, c: 0, d: 0 }) - 1) < 1e-12 && STEPS[0].choices[STEPS[0].answer] === '1', 'step 0 key: sec(0) = 1');
{
  const p = { a: 2, b: 1, c: 0, d: 0 };
  check(Math.abs(model(0, p) - 2) < 1e-12 && Math.abs(model(PI, p) + 2) < 1e-9, 'step 1 fact: turning at ±2');
  check(/y = 2 and y = −2/.test(STEPS[1].choices[STEPS[1].answer]), 'step 1 key: ±2');
}
{
  const p = { a: 1, b: 2, c: 0, d: 0 };
  let same = true;
  for (let x = -1.4; x <= 1.4; x += 0.09) {
    if (Math.abs(Math.cos(2 * x)) < 0.05) continue;
    same = same && Math.abs(model(x + PI, p) - model(x, p)) < 1e-6;
  }
  check(same, 'step 2 fact: b=2 has period π');
  check(STEPS[2].choices[STEPS[2].answer] === 'π', 'step 2 key: π');
}
check(STEPS[3].choices[STEPS[3].answer] === 'Right', 'step 3 key: right');
{
  const p = { a: 1, b: 1, c: 0, d: 2 };
  check(Math.abs(model(0, p) - 3) < 1e-12 && Math.abs(model(PI, p) - 1) < 1e-9, 'step 4 fact: turning at 3 and 1');
  check(/y = 3 and y = 1/.test(STEPS[4].choices[STEPS[4].answer]), 'step 4 key: 3 and 1');
}
check(/at least \|a\|/.test(STEPS[5].choices[STEPS[5].answer]), 'step 5 key: |y − d| ≥ |a|');
/* the base secant is even, as the step-5 reveal claims */
for (const x of [0.3, 1.1, 2.7])
  check(Math.abs(model(x, START) - model(-x, START)) < 1e-12, `sec(−x) = sec(x) at x=${x}`);

/* ---- 6. dials ------------------------------------------------------------ */
const byKey = Object.fromEntries(PARAMS.map((dl) => [dl.key, dl]));
check(byKey.a.min === 0.5 && byKey.a.max === 2.5 && byKey.a.step === 0.25 && byKey.a.unlock === 1, 'a dial (kept positive)');
check(byKey.b.min === 0.5 && byKey.b.max === 2.5 && byKey.b.step === 0.25 && byKey.b.unlock === 2, 'b dial');
check(byKey.c.min === -1.5 && byKey.c.max === 1.5 && byKey.c.step === 0.25 && byKey.c.unlock === 3, 'c dial');
check(byKey.d.min === -2 && byKey.d.max === 2 && byKey.d.step === 0.5 && byKey.d.unlock === 4, 'd dial');
check(START.a === 1 && START.b === 1 && START.c === 0 && START.d === 0, 'start is the plain secant');

/* ---- 7. calibration ------------------------------------------------------ */
const gridOf = (min, max, step) => {
  const g = [];
  for (let v = min; v <= max + 1e-9; v += step) g.push(+v.toFixed(6));
  return g;
};
const dialA = gridOf(0.5, 2.5, 0.25);
const dialB = gridOf(0.5, 2.5, 0.25);
const dialC = gridOf(-1.5, 1.5, 0.25);
const dialD = gridOf(-2, 2, 0.5);
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);

let worstExact = 0;
let minStep = Infinity;
let prev = null;
for (let i = 0; i < 300; i++) {
  const t = makeTarget(prev);
  check(onGrid(t.a, dialA) && onGrid(t.b, dialB) && onGrid(t.c, dialC) && onGrid(t.d, dialD), `target ${i} on dial grid`);
  check(!(t.a === START.a && t.b === START.b && t.c === START.c && t.d === START.d), `target ${i} is not the start`);
  worstExact = Math.max(worstExact, rmsError(t, t));
  for (const q of [
    { ...t, a: t.a + 0.25 }, { ...t, a: t.a - 0.25 },
    { ...t, b: t.b + 0.25 }, { ...t, b: t.b - 0.25 },
    { ...t, c: t.c + 0.25 }, { ...t, c: t.c - 0.25 },
    { ...t, d: t.d + 0.5 }, { ...t, d: t.d - 0.5 },
  ]) {
    if (!onGrid(q.a, dialA) || !onGrid(q.b, dialB) || !onGrid(q.c, dialC) || !onGrid(q.d, dialD)) continue;
    const r = rmsError(q, t);
    if (r < minStep) minStep = r;
  }
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---- 8. render guards ---------------------------------------------------- */
check(src.includes('Math.sign(cth) !== Math.sign(prevCos)'), 'secant plotter breaks the path when cos changes sign');
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');
check(src.includes('aria-live'), 'screen-reader calibration cue present');

/* ---- verdict ------------------------------------------------------------- */
console.log('SecantFunctionLab audit');
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
