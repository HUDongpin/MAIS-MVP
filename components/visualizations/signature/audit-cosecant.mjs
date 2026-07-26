/* ============================================================================
   audit-cosecant.mjs — numeric + structural proof for CosecantFunctionLab.jsx
   (F-TF · y = A·csc(B(x − C)) + D = A/sin(B(x − C)) + D, taught as the
   reciprocal of the helper sine drawn underneath).

   Pattern (per the sibling audits): slice-and-eval the shipped model, then
   prove the reciprocal identity, the asymptote lattice (sin = 0), the
   branch-tip lattice (sin = ±1, tips on the helper at D ± A), the range
   |y − D| ≥ |A|, the pole-skipping calibration meter, every quiz key, and
   the π-fraction period/spacing/phase strings.

   Run:  node audit-cosecant.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./CosecantFunctionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function CosecantFunctionLab');
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
  return { PI, WORLD, PARAMS, START, STEPS, model, helper, phase, asymptotes, branchTips,
           rmsError, matchPercent, MATCH_RMS, makeTarget, trim, piStr, cIndex, cStr,
           periodStr, spacingStr, argText, reciprocalForm, describeGraph };`)();
const {
  PI, WORLD, PARAMS, START, STEPS, model, helper, phase, asymptotes, branchTips,
  rmsError, matchPercent, MATCH_RMS, makeTarget, trim, piStr, cIndex,
  periodStr, spacingStr, argText, reciprocalForm, describeGraph,
} = S;
const MINUS = '−';

/* ---- 2. the model: reciprocal identity ----------------------------------- */
for (const A of [-3, -1, 0.5, 2])
  for (const B of [0.5, 1, 2, 3])
    for (const C of [-PI, 0, PI / 3])
      for (const D of [-2.5, 0, 1.5])
        for (const x of [-6, -1.1, 0.4, 2.3, 5.9]) {
          const p = { A, B, C, D };
          const sin = Math.sin(B * (x - C));
          check(Math.abs(model(x, p) - (D + A / sin)) < 1e-9, `model = D + A/sin at ${JSON.stringify(p)} x=${x}`);
          check(Math.abs(helper(x, p) - (D + A * sin)) < 1e-12, `helper = D + A·sin at x=${x}`);
          check(Math.abs(phase(x, p) - sin) < 1e-12, `phase() is the discontinuity detector at x=${x}`);
          /* reciprocal product: (csc − D)(helper − D) = A² */
          check(Math.abs((model(x, p) - D) * (helper(x, p) - D) - A * A) < 1e-6, `reciprocal product A² at x=${x}`);
        }

/* ---- 3. the skeleton: asymptotes, branch tips, range --------------------- */
for (const p of [{ A: 1, B: 1, C: 0, D: 0 }, { A: -1.5, B: 2, C: PI / 6, D: 1 }, { A: 2, B: 0.5, C: -PI / 2, D: -1.5 }]) {
  const asy = asymptotes(p);
  check(asy.length > 0, `asymptotes found for ${JSON.stringify(p)}`);
  for (const xa of asy) {
    check(xa >= WORLD.xmin - 1e-9 && xa <= WORLD.xmax + 1e-9, 'asymptote inside the window');
    check(Math.abs(Math.sin(p.B * (xa - p.C))) < 1e-9, `sin = 0 at asymptote x=${xa.toFixed(3)}`);
  }
  /* spacing between consecutive asymptotes is π/B */
  for (let i = 1; i < asy.length; i++)
    check(Math.abs(asy[i] - asy[i - 1] - PI / p.B) < 1e-9, `asymptote spacing π/B (${JSON.stringify(p)})`);

  const tips = branchTips(p);
  check(tips.length > 0, `branch tips found for ${JSON.stringify(p)}`);
  for (const { x, y } of tips) {
    check(Math.abs(Math.abs(Math.sin(p.B * (x - p.C))) - 1) < 1e-9, `sin = ±1 at tip x=${x.toFixed(3)}`);
    check(Math.abs(Math.abs(y - p.D) - Math.abs(p.A)) < 1e-9, `tip at D ± |A|`);
    check(Math.abs(helper(x, p) - y) < 1e-9, 'tip touches the helper sine');
    /* the tip is a local extremum of its branch */
    const d = 0.03;
    const side = Math.sign(y - p.D);
    check(side * (model(x + d, p) - y) >= -1e-9 && side * (model(x - d, p) - y) >= -1e-9, 'tip is the branch extremum');
  }
  /* range: every finite point keeps |y − D| ≥ |A| */
  let closest = Infinity;
  for (let x = WORLD.xmin; x <= WORLD.xmax; x += 0.002) {
    const y = model(x, p);
    if (!isFinite(y) || Math.abs(y) > 1e6) continue;
    closest = Math.min(closest, Math.abs(y - p.D));
  }
  check(closest >= Math.abs(p.A) - 1e-6, `|y − D| ≥ |A| (closest ${closest.toFixed(6)})`);
}
/* degenerate A = 0: no cosecant, so no skeleton */
check(asymptotes({ A: 0, B: 1, C: 0, D: 0 }).length === 0, 'A = 0 has no asymptote markers');
check(branchTips({ A: 0, B: 1, C: 0, D: 0 }).length === 0, 'A = 0 has no branch tips');

/* ---- 4. formatting ------------------------------------------------------- */
check(piStr(1, 1) === 'π' && piStr(-1, 2) === `${MINUS}π/2` && piStr(3, 2) === '3π/2' && piStr(0, 6) === '0', 'piStr basics');
check(piStr(4, 6) === '2π/3', 'piStr reduces');
check(periodStr(1) === '2π' && periodStr(2) === 'π' && periodStr(1.5) === '4π/3', 'periodStr = 2π/B reduced');
check(spacingStr(1) === 'π' && spacingStr(1.5) === '2π/3' && spacingStr(0.5) === '2π', 'spacingStr = π/B reduced');
for (let n = -6; n <= 6; n++) check(cIndex((n * PI) / 6) === n, `cIndex at n=${n}`);
check(argText(1, 0) === 'x' && argText(2, 0) === '2x' && argText(1, 3) === `x ${MINUS} π/2`, 'argText forms');
check(reciprocalForm(1, 1, 0, 0) === 'y = 1 ∕ sin(x)', `reciprocalForm base: "${reciprocalForm(1, 1, 0, 0)}"`);
check(reciprocalForm(-1, 1, 0, 0) === `y = ${MINUS}1 ∕ sin(x)`, `reciprocalForm −1: "${reciprocalForm(-1, 1, 0, 0)}"`);
{
  const d = describeGraph(1.5, 2, 0, -0.5);
  check(/Period π\./.test(d) && /Midline y = −0\.5\./.test(d), `describeGraph facts: "${d}"`);
  check(/y = 1\b/.test(d) && /y = −2\b/.test(d), 'describeGraph tips D ± |A| = 1 and −2');
}
check(trim(-0) === '0' && trim(1.375) === '1.375', 'trim (3-decimal) handling');

/* ---- 5. the lesson: seven steps, keys re-derived ------------------------- */
check(STEPS.length === 7, `7 steps (got ${STEPS.length})`);
check(STEPS[6].calib === true && !STEPS[6].q, 'final step is the calibration challenge');
for (let i = 0; i < 6; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(/sin\(x\) = 0 there/.test(STEPS[0].choices[STEPS[0].answer]), 'step 0 key: division by sin = 0');
check(/flips the branches/.test(STEPS[1].choices[STEPS[1].answer]), 'step 1 key: negative A reflects');
{
  const p = { A: 1, B: 2, C: 0, D: 0 };
  let same = true;
  for (let x = -1.4; x <= 1.4; x += 0.09) {
    if (Math.abs(Math.sin(2 * x)) < 0.05) continue;
    same = same && Math.abs(model(x + PI, p) - model(x, p)) < 1e-6;
  }
  check(same, 'step 2 fact: B=2 has period π');
  check(/period halves to π/.test(STEPS[2].choices[STEPS[2].answer]), 'step 2 key: period π');
}
check(/^Right by π\/2/.test(STEPS[3].choices[STEPS[3].answer]), 'step 3 key: right by π/2');
{
  /* step 4: D = 2, A = 1 ⇒ range y ≤ 1 or y ≥ 3 (tips proved on the model) */
  const tips = branchTips({ A: 1, B: 1, C: 0, D: 2 });
  const ys = new Set(tips.map((t) => +t.y.toFixed(6)));
  check(ys.has(3) && ys.has(1), 'step 4 fact: tips at 3 and 1');
  check(/y ≤ 1 or y ≥ 3/.test(STEPS[4].choices[STEPS[4].answer]), 'step 4 key: lifted band');
}
check(/The range/.test(STEPS[5].choices[STEPS[5].answer]) && /D ± \|A\|/.test(STEPS[5].choices[STEPS[5].answer]), 'step 5 key: A and D fix the range');

/* ---- 6. dials ------------------------------------------------------------ */
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.A.min === -3 && byKey.A.max === 3 && byKey.A.step === 0.5 && byKey.A.unlock === 1, 'A dial');
check(byKey.B.min === 0.5 && byKey.B.max === 3 && byKey.B.step === 0.5 && byKey.B.unlock === 2, 'B dial');
check(Math.abs(byKey.C.min + PI) < 1e-12 && Math.abs(byKey.C.max - PI) < 1e-12 && Math.abs(byKey.C.step - PI / 6) < 1e-12 && byKey.C.unlock === 3, 'C dial');
check(byKey.D.min === -2.5 && byKey.D.max === 2.5 && byKey.D.step === 0.5 && byKey.D.unlock === 4, 'D dial');
check(START.A === 1 && START.B === 1 && START.C === 0 && START.D === 0, 'start is the base cosecant');
/* branch tips stay inside the window: |D| + |A| ≤ ymax */
check(byKey.D.max + byKey.A.max <= WORLD.ymax, 'tips stay inside the window');

/* ---- 7. calibration (pole-skipping RMS) ---------------------------------- */
const gridOf = (min, max, step) => {
  const g = [];
  for (let v = min; v <= max + 1e-9; v += step) g.push(+v.toFixed(6));
  return g;
};
const dialA = gridOf(-3, 3, 0.5);
const dialB = gridOf(0.5, 3, 0.5);
const dialC = [];
for (let n = -6; n <= 6; n++) dialC.push((n * PI) / 6);
const dialD = gridOf(-2.5, 2.5, 0.5);
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
    { ...t, A: t.A + 0.5 }, { ...t, A: t.A - 0.5 },
    { ...t, B: t.B + 0.5 }, { ...t, B: t.B - 0.5 },
    { ...t, C: t.C + PI / 6 }, { ...t, C: t.C - PI / 6 },
    { ...t, D: t.D + 0.5 }, { ...t, D: t.D - 0.5 },
  ]) {
    if (!onGrid(q.A, dialA) || !onGrid(q.B, dialB) || !onGrid(q.C, dialC) || !onGrid(q.D, dialD)) continue;
    if (Math.abs(q.A) < 1e-9) continue; // A = 0 is a flat line, not a cosecant state to compare
    const r = rmsError(q, t);
    if (r < minStep) minStep = r;
  }
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---- 8. render guards ---------------------------------------------------- */
check(src.includes('Math.abs(sp) < 0.16'), 'meter skips samples near either pole');
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');

/* ---- verdict ------------------------------------------------------------- */
console.log('CosecantFunctionLab audit');
console.log('=========================');
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
