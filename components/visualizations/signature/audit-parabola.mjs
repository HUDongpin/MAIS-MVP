/* ============================================================================
   audit-parabola.mjs — numeric + structural proof for ParabolaLab.jsx
   (G-GPE · the parabola as a CONIC: (x−h)² = 4p(y−k) and its three
   rotations, defined by focus + directrix and the equidistance property).

   Pattern (per the sibling audits): slice-and-eval the shipped model, then
   prove the curve satisfies the implicit form exactly, the EQUIDISTANCE
   d(P, focus) = d(P, directrix) at every sampled point in all four opening
   directions, the latus rectum (through the focus, length 4p, endpoints on
   the curve), the vertex as the point nearest the directrix, the level-set
   gradient used by the meter, every quiz key, and the calibration
   behaviour (exact ⇒ 0, one dial step or a wrong direction ⇒ never stamps).

   Run:  node audit-parabola.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ParabolaLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ParabolaLab');
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
  return { WORLD, PARAMS, DIR_UNLOCK, LATUS_STEP, PROP_STEP, START, DIRS, OPENS, STEPS,
           geom, curveXY, visRange, curvePoints, implicit, dist, calibError, matchPercent,
           MATCH_RMS, makeTarget, trim, ptStr };`)();
const {
  WORLD, PARAMS, DIR_UNLOCK, LATUS_STEP, PROP_STEP, START, DIRS, OPENS, STEPS,
  geom, curveXY, visRange, curvePoints, implicit, dist, calibError, matchPercent,
  MATCH_RMS, makeTarget, trim,
} = S;
const DIR_KEYS = ['up', 'down', 'left', 'right'];

/* ---- 2. the curve satisfies the implicit form; equidistance holds -------- */
const CASES = [];
for (const dir of DIR_KEYS)
  for (const [p0, h, k] of [[1.5, 0, 0], [0.25, 2, -1.5], [3, -3, 3]])
    CASES.push({ p: p0, h, k, dir });

for (const q of CASES) {
  const g = geom(q);
  for (let u = -4; u <= 4 + 1e-9; u += 0.37) {
    const [x, y] = curveXY(q, u);
    const [G] = implicit(q, x, y);
    check(Math.abs(G) < 1e-9, `G = 0 on the curve (${q.dir}, p=${q.p}, u=${u.toFixed(1)})`);
    /* THE defining property: equal distance to focus and directrix */
    const dFoc = dist(x, y, g.focus[0], g.focus[1]);
    const dDir = g.directrix.axis === 'y' ? Math.abs(y - g.directrix.at) : Math.abs(x - g.directrix.at);
    check(Math.abs(dFoc - dDir) < 1e-9, `equidistance (${q.dir}, p=${q.p}, u=${u.toFixed(1)})`);
  }
  /* vertex: on the curve, p from the focus, p from the directrix, and the
     closest point of the whole curve to the directrix */
  const [vx, vy] = curveXY(q, 0);
  check(Math.abs(vx - q.h) < 1e-12 && Math.abs(vy - q.k) < 1e-12, `vertex at (h, k) (${q.dir})`);
  check(Math.abs(dist(q.h, q.k, g.focus[0], g.focus[1]) - q.p) < 1e-12, `focus p from vertex (${q.dir})`);
  const vDir = g.directrix.axis === 'y' ? Math.abs(q.k - g.directrix.at) : Math.abs(q.h - g.directrix.at);
  check(Math.abs(vDir - q.p) < 1e-12, `directrix p from vertex, other side (${q.dir})`);
  let closest = Infinity;
  for (let u = -5; u <= 5; u += 0.01) {
    const [x, y] = curveXY(q, u);
    const dd = g.directrix.axis === 'y' ? Math.abs(y - g.directrix.at) : Math.abs(x - g.directrix.at);
    closest = Math.min(closest, dd);
  }
  check(Math.abs(closest - q.p) < 1e-4, `vertex is nearest the directrix (${q.dir})`);
  /* latus rectum: both endpoints on the curve, at the focus level, length 4p */
  const [e1, e2] = g.lr;
  check(Math.abs(g.latus - 4 * q.p) < 1e-12, `latus length 4p (${q.dir})`);
  check(Math.abs(dist(e1[0], e1[1], e2[0], e2[1]) - 4 * q.p) < 1e-9, `latus endpoints 4p apart (${q.dir})`);
  for (const [ex, ey] of [e1, e2]) {
    const [G] = implicit(q, ex, ey);
    check(Math.abs(G) < 1e-9, `latus endpoint on the curve (${q.dir})`);
    /* the chord passes through the focus: endpoint distance to focus = 2p */
    check(Math.abs(dist(ex, ey, g.focus[0], g.focus[1]) - 2 * q.p) < 1e-9, `latus endpoint 2p from focus (${q.dir})`);
  }
  /* the focus sits INSIDE the curve: same side of the directrix as the vertex,
     one p beyond it along the axis */
  const s = DIRS[q.dir].s;
  if (DIRS[q.dir].orient === 'v') check(Math.abs(g.focus[1] - (q.k + s * q.p)) < 1e-12, `focus at k + s·p (${q.dir})`);
  else check(Math.abs(g.focus[0] - (q.h + s * q.p)) < 1e-12, `focus at h + s·p (${q.dir})`);
}

/* ---- 3. the level-set gradient used by the meter is the true gradient ---- */
for (const q of CASES.slice(0, 6))
  for (const [x, y] of [[2, 3], [-4, -1], [0.7, 5.1]]) {
    const [, gx, gy] = implicit(q, x, y);
    const eps = 1e-6;
    const dx = (implicit(q, x + eps, y)[0] - implicit(q, x - eps, y)[0]) / (2 * eps);
    const dy = (implicit(q, x, y + eps)[0] - implicit(q, x, y - eps)[0]) / (2 * eps);
    check(Math.abs(gx - dx) < 1e-5 && Math.abs(gy - dy) < 1e-5, `∇G matches finite differences (${q.dir})`);
  }
/* visRange keeps the plotted arc on screen */
for (const q of CASES) {
  for (const [x, y] of curvePoints(q, 60)) {
    check(x >= WORLD.xmin - 1e-6 && x <= WORLD.xmax + 1e-6, `curvePoints x in window (${q.dir})`);
    check(y >= WORLD.ymin - 0.51 && y <= WORLD.ymax + 0.51, `curvePoints y near window (${q.dir})`);
  }
}

/* ---- 4. the lesson: seven steps, keys re-derived -------------------------- */
check(STEPS.length === 7, `7 steps (got ${STEPS.length})`);
check(STEPS[6].calib === true && !STEPS[6].q, 'final step is the calibration challenge');
for (let i = 0; i < 6; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(/equally far from the focus and the directrix/.test(STEPS[0].choices[STEPS[0].answer]), 'step 0 key: equidistance');
{
  /* step 1: larger p opens the curve wider (smaller |y − k| at the same |u|) */
  const near = curveXY({ p: 0.5, h: 0, k: 0, dir: 'up' }, 2)[1];
  const wide = curveXY({ p: 2.5, h: 0, k: 0, dir: 'up' }, 2)[1];
  check(wide < near, 'step 1 fact: larger p is flatter');
  check(/^Wider and more open$/.test(STEPS[1].choices[STEPS[1].answer]), 'step 1 key: wider');
}
check(/Vertex \(2, −1\), focus \(2, −1 \+ p\)/.test(STEPS[2].choices[STEPS[2].answer]), 'step 2 key: focus above the moved vertex');
{
  /* step 3: opening right ⇒ directrix is the vertical line p to the LEFT */
  const g = geom({ p: 1.5, h: 0, k: 0, dir: 'right' });
  check(g.directrix.axis === 'x' && g.directrix.at < 0, 'step 3 fact: vertical directrix on the left');
  check(/vertical line to the LEFT/.test(STEPS[3].choices[STEPS[3].answer]), 'step 3 key: left directrix');
}
{
  /* step 4: p = 2 ⇒ latus rectum 8 (proved) */
  check(Math.abs(geom({ p: 2, h: 0, k: 0, dir: 'up' }).latus - 8) < 1e-12, 'step 4 fact: 4p = 8');
  check(/^8 units/.test(STEPS[4].choices[STEPS[4].answer]), 'step 4 key: 8 units');
}
check(/stay exactly equal/.test(STEPS[5].choices[STEPS[5].answer]), 'step 5 key: distances stay equal');

/* ---- 5. dials + stages ------------------------------------------------------ */
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.p.min === 0.25 && byKey.p.max === 3 && byKey.p.step === 0.25 && byKey.p.unlock === 1, 'p dial (kept positive)');
check(byKey.h.min === -3 && byKey.h.max === 3 && byKey.h.step === 0.5 && byKey.h.unlock === 2, 'h dial');
check(byKey.k.min === -3 && byKey.k.max === 3 && byKey.k.step === 0.5 && byKey.k.unlock === 2, 'k dial');
check(DIR_UNLOCK === 3 && LATUS_STEP === 4 && PROP_STEP === 5, 'direction, latus and property are staged');
check(START.p === 1.5 && START.h === 0 && START.k === 0 && START.dir === 'up', 'start opens upward from the origin');
check(DIR_KEYS.every((d) => DIRS[d] && OPENS[d]), 'all four directions defined');

/* ---- 6. calibration ---------------------------------------------------------- */
const gridOf = (min, max, step) => {
  const g = [];
  for (let v = min; v <= max + 1e-9; v += step) g.push(+v.toFixed(6));
  return g;
};
const dialP = gridOf(0.25, 3, 0.25);
const dialHK = gridOf(-3, 3, 0.5);
const onGrid = (v, g) => g.some((gv) => Math.abs(gv - v) < 1e-9);

let worstExact = 0;
let minStep = Infinity;
let minWrongDir = Infinity;
let prev = null;
for (let i = 0; i < 200; i++) {
  const t = makeTarget(prev);
  check(onGrid(t.p, dialP) && onGrid(t.h, dialHK) && onGrid(t.k, dialHK), `target ${i} on dial grid`);
  check(DIR_KEYS.includes(t.dir), `target ${i} direction valid`);
  worstExact = Math.max(worstExact, calibError(t, t));
  for (const q of [
    { ...t, p: +(t.p + 0.25).toFixed(6) }, { ...t, p: +(t.p - 0.25).toFixed(6) },
    { ...t, h: t.h + 0.5 }, { ...t, h: t.h - 0.5 },
    { ...t, k: t.k + 0.5 }, { ...t, k: t.k - 0.5 },
  ]) {
    if (!onGrid(q.p, dialP) || !onGrid(q.h, dialHK) || !onGrid(q.k, dialHK)) continue;
    const r = calibError(q, t);
    if (r < minStep) minStep = r;
  }
  for (const d of DIR_KEYS) {
    if (d === t.dir) continue;
    const r = calibError({ ...t, dir: d }, t);
    if (r < minWrongDir) minWrongDir = r;
  }
  prev = t;
}
check(worstExact < MATCH_RMS, `exact target always CALIBRATED (worst ${worstExact.toExponential(2)})`);
check(minStep > MATCH_RMS, `one dial step never stamps (min ${minStep.toFixed(4)} vs ${MATCH_RMS})`);
check(minWrongDir > MATCH_RMS, `a wrong opening direction never stamps (min ${minWrongDir.toFixed(3)})`);
check(matchPercent(0) === 100 && matchPercent(1) < matchPercent(0.1), 'meter is 100 at 0 and monotone');

/* ---- 7. render guards ---------------------------------------------------------- */
check(src.includes('prefers-reduced-motion'), 'tracer respects reduced motion');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');
check(src.includes('d(P, focus)'), 'the running equidistance readout is present');
check(src.includes('latus'), 'the latus rectum feature is present');

/* ---- verdict --------------------------------------------------------------------- */
console.log('ParabolaLab audit');
console.log('=================');
console.log(`worst exact-target RMS   : ${worstExact.toExponential(2)}  (MATCH_RMS ${MATCH_RMS})`);
console.log(`nearest one-step RMS     : ${minStep.toFixed(4)}  -> ${matchPercent(minStep).toFixed(0)}%`);
console.log(`wrong-direction RMS      : ${minWrongDir.toFixed(3)}`);
console.log('-------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
