/* ============================================================================
   audit-hyperbola.mjs — numeric + structural proof for HyperbolaLab.jsx
   (G-GPE · (x−h)²/a² − (y−k)²/b² = 1 and its up/down twin, taught through
   the focal-difference property |PF₁ − PF₂| = 2a and the asymptote box).

   Pattern (per the sibling audits): slice-and-eval the shipped model, then
   prove the cosh/sinh parametrization satisfies the implicit form exactly,
   the focal geometry (c² = a² + b², e > 1, both orientations), the
   CONSTANT-DIFFERENCE property on the shipped foci, the asymptote approach,
   the level-set gradient used by the meter, every quiz key, and the
   calibration behaviour (exact ⇒ 0, one dial step or a wrong orientation
   ⇒ never stamps).

   Run:  node audit-hyperbola.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./HyperbolaLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function HyperbolaLab');
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
  return { WORLD, PARAMS, ORIENT_UNLOCK, FOCI_STEP, START, STEPS, geom, branchPoint,
           branchPoints, implicit, calibError, matchPercent, MATCH_RMS, makeTarget,
           trim, pt, asymptoteText, spokenEquation };`)();
const {
  WORLD, PARAMS, ORIENT_UNLOCK, FOCI_STEP, START, STEPS, geom, branchPoint,
  branchPoints, implicit, calibError, matchPercent, MATCH_RMS, makeTarget,
  trim, asymptoteText,
} = S;
const MINUS = '−';

/* ---- 2. the parametrization satisfies the implicit form exactly ---------- */
const CASES = [
  { a: 3, b: 2, h: 0, k: 0, orient: 'h' },
  { a: 1.5, b: 2.75, h: 2, k: -1, orient: 'h' },
  { a: 2, b: 1, h: -1.5, k: 0.5, orient: 'v' },
  { a: 0.5, b: 3.5, h: 3, k: -3, orient: 'v' },
];
for (const p of CASES)
  for (const sign of [1, -1])
    for (let t = -3; t <= 3 + 1e-9; t += 0.4) {
      const [x, y] = branchPoint(p, sign, t);
      const [G] = implicit(p, x, y);
      check(Math.abs(G) < 1e-9, `G = 0 on the curve (${p.orient}, sign ${sign}, t=${t.toFixed(1)})`);
    }
/* vertices are branchPoint(t = 0) and sit a from the center on the transverse axis */
for (const p of CASES) {
  const g = geom(p);
  for (const sign of [1, -1]) {
    const [x, y] = branchPoint(p, sign, 0);
    const listed = g.vertices.some(([vx, vy]) => Math.abs(vx - x) < 1e-12 && Math.abs(vy - y) < 1e-12);
    check(listed, `vertex = branchPoint(t=0) is listed (${p.orient}, sign ${sign})`);
    check(Math.abs(Math.hypot(x - p.h, y - p.k) - p.a) < 1e-12, `vertex a from center (${p.orient})`);
  }
}

/* ---- 3. focal geometry & THE constant-difference property ---------------- */
for (const p of CASES) {
  const g = geom(p);
  check(Math.abs(g.c * g.c - (p.a * p.a + p.b * p.b)) < 1e-9, `c² = a² + b² (${JSON.stringify(p)})`);
  check(g.e > 1 && Math.abs(g.e - g.c / p.a) < 1e-12, 'e = c/a > 1');
  const [f1, f2] = g.foci;
  check(Math.abs(f1[0] + f2[0] - 2 * p.h) < 1e-9 && Math.abs(f1[1] + f2[1] - 2 * p.k) < 1e-9, 'foci symmetric about the center');
  for (const sign of [1, -1])
    for (let t = -2.5; t <= 2.5 + 1e-9; t += 0.31) {
      const [x, y] = branchPoint(p, sign, t);
      const d1 = Math.hypot(x - f1[0], y - f1[1]);
      const d2 = Math.hypot(x - f2[0], y - f2[1]);
      check(Math.abs(Math.abs(d1 - d2) - 2 * p.a) < 1e-8, `|PF₁ − PF₂| = 2a (${p.orient}, sign ${sign}, t=${t.toFixed(2)})`);
    }
  /* asymptote approach: far out, the point hugs a line of slope ±g.slope
     through the center (vertical distance to the nearer diagonal → 0) */
  const slope = g.slope;
  for (const sign of [1, -1]) {
    const [x, y] = branchPoint(p, sign, 6);
    const rel = p.orient === 'h' ? [x - p.h, y - p.k] : [y - p.k, x - p.h];
    /* in transverse-first coordinates the asymptotes are v = ±(b/a)·u for 'h',
       u measured along the opening axis; distance to the nearer one shrinks */
    const m = p.orient === 'h' ? p.b / p.a : p.a / p.b;
    const dNear = Math.min(Math.abs((y - p.k) - m * (x - p.h)), Math.abs((y - p.k) + m * (x - p.h)));
    const dNearer = p.orient === 'h' ? dNear : Math.min(Math.abs((x - p.h) - (p.b / p.a) * (y - p.k)), Math.abs((x - p.h) + (p.b / p.a) * (y - p.k)));
    const dist6 = p.orient === 'h' ? dNear : dNearer;
    const [x2, y2] = branchPoint(p, sign, 8);
    const dist8 = p.orient === 'h'
      ? Math.min(Math.abs((y2 - p.k) - m * (x2 - p.h)), Math.abs((y2 - p.k) + m * (x2 - p.h)))
      : Math.min(Math.abs((x2 - p.h) - (p.b / p.a) * (y2 - p.k)), Math.abs((x2 - p.h) + (p.b / p.a) * (y2 - p.k)));
    check(dist8 < dist6 && dist8 < 1e-2, `branch hugs the asymptote (${p.orient}, sign ${sign})`);
    void rel;
    void slope;
  }
  /* the characteristic box matches the semi-axes */
  if (p.orient === 'h') {
    check(Math.abs(g.boxX[1] - g.boxX[0] - 2 * p.a) < 1e-12 && Math.abs(g.boxY[1] - g.boxY[0] - 2 * p.b) < 1e-12, 'box is 2a × 2b');
    check(Math.abs(g.slope - p.b / p.a) < 1e-12, 'asymptote slope b/a (horizontal)');
  } else {
    check(Math.abs(g.boxX[1] - g.boxX[0] - 2 * p.b) < 1e-12 && Math.abs(g.boxY[1] - g.boxY[0] - 2 * p.a) < 1e-12, 'box is 2b × 2a');
    check(Math.abs(g.slope - p.a / p.b) < 1e-12, 'asymptote slope a/b (vertical)');
  }
}

/* ---- 4. the level-set gradient used by the meter is the true gradient ---- */
for (const p of CASES)
  for (const [x, y] of [[4, 1], [-2, 3], [1.2, -4.4]]) {
    const [, gx, gy] = implicit(p, x, y);
    const eps = 1e-6;
    const dx = (implicit(p, x + eps, y)[0] - implicit(p, x - eps, y)[0]) / (2 * eps);
    const dy = (implicit(p, x, y + eps)[0] - implicit(p, x, y - eps)[0]) / (2 * eps);
    check(Math.abs(gx - dx) < 1e-5 && Math.abs(gy - dy) < 1e-5, `∇G matches finite differences at (${x},${y})`);
  }
/* branchPoints sampling really covers both directions of each branch */
{
  const pts = branchPoints(START, 1, 20, 2);
  check(pts.length === 21, 'branchPoints returns N+1 samples');
  check(pts[0][1] < START.k && pts[20][1] > START.k, 'sweep runs from below to above the center line');
}

/* ---- 5. formatting -------------------------------------------------------- */
check(asymptoteText({ a: 3, b: 2, h: 0, k: 0, orient: 'h' }) === `y = ± 0.67·x`, `asymptoteText origin: "${asymptoteText({ a: 3, b: 2, h: 0, k: 0, orient: 'h' })}"`);
check(
  asymptoteText({ a: 1, b: 1, h: 2, k: -1, orient: 'h' }) === `y + 1 = ± (x ${MINUS} 2)`,
  `asymptoteText shifted: "${asymptoteText({ a: 1, b: 1, h: 2, k: -1, orient: 'h' })}"`
);
check(trim(-0) === '0' && trim(0.6666666) === '0.67', 'trim rounds to 2 dp');

/* ---- 6. the lesson: seven steps, keys re-derived --------------------------- */
check(STEPS.length === 7, `7 steps (got ${STEPS.length})`);
check(STEPS[6].calib === true && !STEPS[6].q, 'final step is the calibration challenge');
for (let i = 0; i < 6; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(/^Two/.test(STEPS[0].choices[STEPS[0].answer]), 'step 0 key: two branches');
check(STEPS[1].choices[STEPS[1].answer] === 'At (−a, 0) and (a, 0)', 'step 1 key: vertices (±a, 0)');
check(STEPS[2].choices[STEPS[2].answer] === '±b/a', 'step 2 key: asymptote slope ±b/a');
check(/Center \(2, −1\), vertex \(2 \+ a, −1\)/.test(STEPS[3].choices[STEPS[3].answer]), 'step 3 key: translated vertex');
check(STEPS[4].choices[STEPS[4].answer] === 'Up and down', 'step 4 key: positive y-term opens up/down');
check(STEPS[5].choices[STEPS[5].answer] === 'Always equal to 2a', 'step 5 key: |PF₁ − PF₂| = 2a');
/* the step-3 claim proved on the model: orient 'h', center (2, −1) has a
   vertex at (2 + a, −1) */
{
  const p = { a: 2.5, b: 1, h: 2, k: -1, orient: 'h' };
  const g = geom(p);
  check(g.vertices.some(([x, y]) => Math.abs(x - (p.h + p.a)) < 1e-12 && Math.abs(y - p.k) < 1e-12), 'step 3 fact: vertex (h + a, k)');
}

/* ---- 7. dials + stages ------------------------------------------------------ */
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.a.min === 0.5 && byKey.a.max === 3.5 && byKey.a.step === 0.25 && byKey.a.unlock === 1, 'a dial');
check(byKey.b.min === 0.5 && byKey.b.max === 3.5 && byKey.b.step === 0.25 && byKey.b.unlock === 2, 'b dial');
check(byKey.h.min === -3 && byKey.h.max === 3 && byKey.h.step === 0.5 && byKey.h.unlock === 3, 'h dial');
check(byKey.k.min === -3 && byKey.k.max === 3 && byKey.k.step === 0.5 && byKey.k.unlock === 3, 'k dial');
check(ORIENT_UNLOCK === 4 && FOCI_STEP === 5, 'orientation toggle and foci reveal are staged');
check(START.a === 3 && START.b === 2 && START.h === 0 && START.k === 0 && START.orient === 'h', 'start is the 3×2 left-right hyperbola');

/* ---- 8. calibration ---------------------------------------------------------- */
const gridOf = (min, max, step) => {
  const g = [];
  for (let v = min; v <= max + 1e-9; v += step) g.push(+v.toFixed(6));
  return g;
};
const dialAB = gridOf(0.5, 3.5, 0.25);
const dialHK = gridOf(-3, 3, 0.5);
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);

let worstExact = 0;
let minStep = Infinity;
let minFlip = Infinity;
let prev = null;
for (let i = 0; i < 200; i++) {
  const t = makeTarget(prev);
  check(onGrid(t.a, dialAB) && onGrid(t.b, dialAB) && onGrid(t.h, dialHK) && onGrid(t.k, dialHK), `target ${i} on dial grid`);
  check(t.orient === 'h' || t.orient === 'v', `target ${i} orientation valid`);
  worstExact = Math.max(worstExact, calibError(t, t));
  for (const q of [
    { ...t, a: +(t.a + 0.25).toFixed(6) }, { ...t, a: +(t.a - 0.25).toFixed(6) },
    { ...t, b: +(t.b + 0.25).toFixed(6) }, { ...t, b: +(t.b - 0.25).toFixed(6) },
    { ...t, h: t.h + 0.5 }, { ...t, h: t.h - 0.5 },
    { ...t, k: t.k + 0.5 }, { ...t, k: t.k - 0.5 },
  ]) {
    if (!onGrid(q.a, dialAB) || !onGrid(q.b, dialAB) || !onGrid(q.h, dialHK) || !onGrid(q.k, dialHK)) continue;
    const r = calibError(q, t);
    if (r < minStep) minStep = r;
  }
  const flipped = { ...t, orient: t.orient === 'h' ? 'v' : 'h' };
  const rf = calibError(flipped, t);
  if (rf < minFlip) minFlip = rf;
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(minFlip > MATCH_RMS, `a wrong orientation never stamps (min ${minFlip.toFixed(3)})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---- 9. render guards ---------------------------------------------------------- */
check(src.includes('cosh'), 'branches drawn from the exact cosh/sinh parametrization');
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');
check(src.includes('2a ='), 'the running focal-difference readout quotes 2a');

/* ---- verdict --------------------------------------------------------------------- */
console.log('HyperbolaLab audit');
console.log('==================');
console.log(`worst exact-target RMS   : ${worstExact.toExponential(2)}  (MATCH_RMS ${MATCH_RMS})`);
console.log(`nearest one-step RMS     : ${minStep.toFixed(4)}  -> ${matchPercent(minStep).toFixed(0)}%`);
console.log(`orientation-flip RMS     : ${minFlip.toFixed(3)}`);
console.log('-------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
