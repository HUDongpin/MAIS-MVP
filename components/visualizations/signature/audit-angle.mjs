/* ============================================================================
   audit-angle.mjs — numeric + structural proof for AngleLab.jsx
   (4.MD/7.G/F-TF bridge · the angle as two rays from a vertex; degrees,
   the classification ladder, complements/supplements, radians and s = rθ).

   Pattern (per the sibling audits): slice-and-eval the shipped model, then
   prove the classification boundaries, the degree→radian conversion and its
   reduced π-fraction label, arc length s = rθ, the two invariances the bench
   teaches (rotation α and drawing radius r never change the measure), the
   side-by-side match metric (which must tell an angle from its reflex twin),
   every quiz key, and the calibration behaviour.

   Run:  node audit-angle.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./AngleLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function AngleLab');
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
  return { DEG, WORLD, L_RAY, PARAMS, START, STEPS, dirPoint, classify, geometry,
           gcd, radianLabel, angDiff, matchError, matchPercent, MATCH_ERR, makeTarget, trim };`)();
const {
  DEG, WORLD, L_RAY, PARAMS, START, STEPS, dirPoint, classify, geometry,
  radianLabel, angDiff, matchError, matchPercent, MATCH_ERR, makeTarget, trim,
} = S;
const PI = Math.PI;
const MINUS = '−';

/* ---- 2. rays: dirPoint really is (L·cos φ, L·sin φ) ----------------------- */
for (const deg of [0, 30, 45, 90, 135, 210, 300, 345])
  for (const L of [1, 5, 9.4]) {
    const [x, y] = dirPoint(deg, L);
    check(Math.abs(Math.hypot(x, y) - L) < 1e-12, `|ray| = L at ${deg}°`);
    let dir = (Math.atan2(y, x) / DEG + 360) % 360;
    check(Math.abs(dir - deg) < 1e-9 || Math.abs(dir - deg - 360) < 1e-9, `ray direction ${deg}°`);
  }
check(L_RAY < Math.min(WORLD.xmax, WORLD.ymax), 'rays stay inside the window');

/* ---- 3. classification ladder --------------------------------------------- */
const LADDER = [
  [0, 'zero'], [15, 'acute'], [89, 'acute'], [90, 'right'], [91, 'obtuse'],
  [120, 'obtuse'], [179, 'obtuse'], [180, 'straight'], [181, 'reflex'],
  [270, 'reflex'], [359, 'reflex'], [360, 'full'],
];
for (const [deg, want] of LADDER) check(classify(deg) === want, `classify(${deg}) = ${want} (got ${classify(deg)})`);

/* ---- 4. measurements: radians, arc length, partners ------------------------ */
for (const theta of [0, 15, 30, 45, 60, 90, 120, 150, 180, 270, 330, 360])
  for (const r of [1, 4, 8]) {
    const g = geometry({ theta, alpha: 0, r });
    check(Math.abs(g.rad - (theta * PI) / 180) < 1e-12, `rad = θ·π/180 at ${theta}°`);
    check(Math.abs(g.arc - r * g.rad) < 1e-12, `s = rθ at ${theta}°, r=${r}`);
  }
/* complement/supplement: defined exactly on their domains, correct values */
check(geometry({ theta: 35, alpha: 0, r: 5 }).complement === 55, 'complement of 35 is 55');
check(geometry({ theta: 50, alpha: 0, r: 5 }).supplement === 130, 'supplement of 50 is 130');
check(geometry({ theta: 90, alpha: 0, r: 5 }).complement === 0, 'complement closes at 90');
check(geometry({ theta: 120, alpha: 0, r: 5 }).complement === null, 'no complement past 90');
check(geometry({ theta: 180, alpha: 0, r: 5 }).supplement === 0, 'supplement closes at 180');
check(geometry({ theta: 210, alpha: 0, r: 5 }).supplement === null, 'no supplement past 180');
/* the two invariances the bench teaches: α and r never change the measure */
for (const theta of [45, 160, 300])
  for (const alpha of [0, 40, 275])
    for (const r of [1, 6]) {
      const g = geometry({ theta, alpha, r });
      check(Math.abs(g.rad - (theta * PI) / 180) < 1e-12, `measure invariant under α=${alpha}, r=${r}`);
      check(g.type === classify(theta), `type invariant under α=${alpha}, r=${r}`);
    }

/* ---- 5. radianLabel: reduced π-fractions that reconstruct the angle -------- */
const LABELS = [
  [0, '0'], [15, 'π/12'], [30, 'π/6'], [45, 'π/4'], [60, 'π/3'], [90, 'π/2'],
  [120, '2π/3'], [135, '3π/4'], [180, 'π'], [270, '3π/2'], [360, '2π'],
];
for (const [deg, want] of LABELS) check(radianLabel(deg) === want, `radianLabel(${deg}) = ${want} (got ${radianLabel(deg)})`);
/* every 15° step: the label's fraction n/d must be coprime and reconstruct θ */
for (let deg = 15; deg <= 360; deg += 15) {
  const label = radianLabel(deg);
  const m = label.match(/^(\d*)π(?:\/(\d+))?$/);
  check(!!m, `radianLabel(${deg}) is a clean π-fraction: "${label}"`);
  if (m) {
    const n = m[1] === '' ? 1 : parseInt(m[1], 10);
    const d = m[2] ? parseInt(m[2], 10) : 1;
    check(Math.abs((n / d) * 180 - deg) < 1e-9, `radianLabel(${deg}) reconstructs the angle`);
    const g = ((a, b) => { while (b) [a, b] = [b, a % b]; return a; })(n, d);
    check(g === 1, `radianLabel(${deg}) is reduced`);
  }
}

/* ---- 6. the match metric: zero iff both sides coincide --------------------- */
check(angDiff(10, 350) === 20 && angDiff(350, 10) === 20, 'angDiff wraps and is symmetric');
check(angDiff(90, 90) === 0 && angDiff(0, 180) === 180, 'angDiff endpoints');
for (const t of [{ theta: 60, alpha: 0 }, { theta: 210, alpha: 105 }]) {
  check(matchError({ ...t, r: 5 }, t) === 0, 'exact match reads 0');
  /* the reflex twin shares BOTH side directions but sweeps the other way —
     the metric must reject it */
  const twin = { theta: 360 - t.theta, alpha: (t.alpha + t.theta) % 360 };
  check(matchError({ ...twin, r: 5 }, t) > MATCH_ERR, `reflex twin rejected (θ=${t.theta})`);
  /* one 15° dial step on either dial stays above the stamp */
  check(matchError({ theta: t.theta + 15, alpha: t.alpha, r: 5 }, t) > MATCH_ERR, 'θ one step off rejected');
  check(matchError({ theta: t.theta, alpha: (t.alpha + 15) % 360, r: 5 }, t) > MATCH_ERR, 'α one step off rejected');
  /* r is pure drawing size: it must NOT affect the match */
  check(matchError({ ...t, r: 2 }, t) === 0, 'r never affects the match');
}
check(matchPercent(0) === 100 && matchPercent(30) < matchPercent(5), 'meter is 100 at 0 and monotone');

/* ---- 7. the lesson: seven steps, keys re-derived ---------------------------- */
check(STEPS.length === 7, `7 steps (got ${STEPS.length})`);
check(STEPS[6].calib === true && !STEPS[6].q, 'final step is the calibration challenge');
for (let i = 0; i < 6; i++) {
  const st = STEPS[i];
  check(typeof st.q === 'string' && st.choices.length === 3, `step ${i} has a 3-choice question`);
  check(st.answer >= 0 && st.answer < st.choices.length, `step ${i} answer in range`);
  check(typeof st.feedback === 'string' && st.feedback.length > 40, `step ${i} has a real reveal`);
}
check(/Two rays that share one endpoint/.test(STEPS[0].choices[STEPS[0].answer]), 'step 0 key: two rays, one vertex');
check(STEPS[1].choices[STEPS[1].answer] === '360°', 'step 1 key: full turn 360°');
check(classify(120) === 'obtuse' && STEPS[2].choices[STEPS[2].answer] === 'Obtuse', 'step 2 key: 120° is obtuse');
check(/^Stays the same/.test(STEPS[3].choices[STEPS[3].answer]), 'step 3 key: rotation invariance');
check(180 - 50 === 130 && STEPS[4].choices[STEPS[4].answer] === '130°', 'step 4 key: supplement of 50° is 130°');
check(/^Does not change/.test(STEPS[5].choices[STEPS[5].answer]), 'step 5 key: radius invariance (s = rθ)');
check(STEPS[1].showTool === 'protractor', 'the protractor appears with the degree step');

/* ---- 8. dials + calibration -------------------------------------------------- */
const byKey = Object.fromEntries(PARAMS.map((d) => [d.key, d]));
check(byKey.theta.min === 0 && byKey.theta.max === 360 && byKey.theta.step === 15 && byKey.theta.unlock === 1, 'θ dial');
check(byKey.alpha.min === 0 && byKey.alpha.max === 345 && byKey.alpha.step === 15 && byKey.alpha.unlock === 3, 'α dial');
check(byKey.r.min === 1 && byKey.r.max === 8 && byKey.r.step === 0.5 && byKey.r.unlock === 5, 'r dial');
check(START.theta === 60 && START.alpha === 0 && START.r === 5, 'start is a 60° angle in standard position');

let prev = null;
for (let i = 0; i < 300; i++) {
  const t = makeTarget(prev);
  check(t.theta >= 30 && t.theta <= 330 && t.theta % 15 === 0, `target ${i} θ on the 15° grid, non-degenerate`);
  check(t.alpha >= 0 && t.alpha <= 345 && t.alpha % 15 === 0, `target ${i} α on the 15° grid`);
  check(!(t.theta === START.theta && t.alpha === START.alpha), `target ${i} is not the start`);
  if (prev) check(!(t.theta === prev.theta && t.alpha === prev.alpha), `target ${i} differs from prev`);
  check(matchError({ ...t, r: 5 }, t) < MATCH_ERR, `target ${i} exactly matchable`);
  prev = t;
}

/* ---- 9. render guards ---------------------------------------------------------- */
check(src.includes('prefers-reduced-motion') || src.includes('matchMedia'), 'sweep respects motion preferences');
check(src.includes('ResizeObserver'), 'canvas redraws on resize');
check(src.includes('protractor'), 'protractor overlay present');

/* ---- verdict --------------------------------------------------------------------- */
console.log('AngleLab audit');
console.log('==============');
console.log(`MATCH_ERR ${MATCH_ERR}° · one 15° dial step reads ${matchError({ theta: 75, alpha: 0, r: 5 }, { theta: 60, alpha: 0 }).toFixed(1)}°`);
console.log('-------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
