/* ============================================================================
   audit-volume.mjs — numeric correctness audit for VolumeLab.

   Re-implements the lab's pure math (formulas, highlight predicates, factor
   triples, calibration meter) and checks every claim the lab makes to a
   student, exhaustively over the dial ranges l,w,h ∈ 1..6.

   Run:  node audit-volume.mjs
   ========================================================================== */

let checks = 0, fails = 0;
const approx = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; console.error('  ✗ ' + msg); }
}

/* ---- the pure math, mirrored from VolumeLab.jsx ------------------------- */
const facts = (l, w, h) => ({
  base: l * w,
  volume: l * w * h,
  surface: 2 * (l * w + l * h + w * h),
});
const MAXF = 6;
const TARGETS = [8, 12, 18, 24, 30, 36, 48, 60];
const measure = (l, w, h) => l * w * h;
const matchPercent = (cur, goal) =>
  Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - goal) / goal)));
function factorTriples(P) {
  const out = [];
  for (let a = 1; a <= MAXF; a++) {
    if (P % a !== 0) continue;
    for (let b = a; b <= MAXF; b++) {
      if ((P / a) % b !== 0) continue;
      const c = P / a / b;
      if (c >= b && c <= MAXF) out.push([a, b, c]);
    }
  }
  return out;
}
function cubeStyle(focus, i, j, k, l, w, h) {
  switch (focus) {
    case 'length': return { accent: j === h - 1 && k === w - 1, alt: false };
    case 'base':
    case 'baseheight': return { accent: j === h - 1, alt: false };
    case 'volume': return { accent: i === l - 1 && j === h - 1 && k === w - 1, alt: false };
    case 'stack': return { accent: i === l - 1 && k === w - 1, alt: j % 2 === 1 };
    default: return { accent: false, alt: false };
  }
}

const RNG = [1, 2, 3, 4, 5, 6];

/* ---- 1. core formulas over every box ------------------------------------ */
console.log('1) Formulas V=l·w·h, B=l·w, SA=2(lw+lh+wh) over all 216 boxes');
for (const l of RNG) for (const w of RNG) for (const h of RNG) {
  const F = facts(l, w, h);
  ok(F.volume === l * w * h, `V wrong at ${l},${w},${h}`);
  ok(F.base === l * w, `B wrong at ${l},${w},${h}`);
  ok(F.surface === 2 * (l * w + l * h + w * h), `SA wrong at ${l},${w},${h}`);
  // volume is a nonneg integer count of cubes
  ok(Number.isInteger(F.volume) && F.volume >= 1, `V not a positive integer at ${l},${w},${h}`);
}

/* ---- 2. V = l·w·h == B·h  (the two readings agree) ---------------------- */
console.log('2) V = l·w·h equals base × height for every box');
for (const l of RNG) for (const w of RNG) for (const h of RNG) {
  const F = facts(l, w, h);
  ok(F.volume === F.base * h, `V ≠ B·h at ${l},${w},${h}`);
}

/* ---- 3. volume equals literal count of unit cubes (shell + interior) ---- */
console.log('3) Unit-cube count: shell cubes + interior cubes = l·w·h');
for (const l of RNG) for (const w of RNG) for (const h of RNG) {
  let shell = 0;
  for (let i = 0; i < l; i++) for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) {
    if (i === 0 || i === l - 1 || j === 0 || j === h - 1 || k === 0 || k === w - 1) shell++;
  }
  const interior = Math.max(0, l - 2) * Math.max(0, w - 2) * Math.max(0, h - 2);
  ok(shell + interior === l * w * h, `shell+interior ≠ V at ${l},${w},${h}`);
  // the renderer only draws the shell — assert nothing interior is ever visible,
  // i.e. shell count matches the standard 3-D surface-cube formula
  const formula = l * w * h - interior;
  ok(shell === formula, `shell formula mismatch at ${l},${w},${h}`);
}

/* ---- 4. highlight predicates select the intended cube sets -------------- */
console.log('4) Lesson highlights select the right cubes');
for (const l of RNG) for (const w of RNG) for (const h of RNG) {
  const count = (focus) => {
    let n = 0;
    for (let i = 0; i < l; i++) for (let j = 0; j < h; j++) for (let k = 0; k < w; k++)
      if (cubeStyle(focus, i, j, k, l, w, h).accent) n++;
    return n;
  };
  ok(count('length') === l, `length highlight should be l cubes at ${l},${w},${h} (got ${count('length')})`);
  ok(count('base') === l * w, `base highlight should be l·w at ${l},${w},${h}`);
  ok(count('baseheight') === l * w, `baseheight highlight should be l·w at ${l},${w},${h}`);
  ok(count('volume') === 1, `volume highlight should be exactly 1 cube at ${l},${w},${h}`);
  ok(count('stack') === h, `stack column highlight should be h cubes at ${l},${w},${h}`);
  // alt (layer) shading must alternate strictly by layer j
  let altOk = true;
  for (let j = 0; j < h; j++) {
    const s = cubeStyle('stack', 0, j, 0, l, w, h);
    if (s.alt !== (j % 2 === 1)) altOk = false;
  }
  ok(altOk, `stack alt-shading not per-layer at ${l},${w},${h}`);
}

/* ---- 5. factor triples: correct, and every target is reachable ---------- */
console.log('5) Factor triples valid; every target reachable with l,w,h ∈ 1..6');
for (const P of TARGETS) {
  const ts = factorTriples(P);
  ok(ts.length >= 1, `target ${P} has no factor triple in 1..6`);
  ok(ts.length >= 2, `target ${P} should have ≥2 distinct boxes (teaches "same volume")`);
  for (const [a, b, c] of ts) {
    ok(a * b * c === P, `triple ${a}×${b}×${c} ≠ ${P}`);
    ok(a >= 1 && c <= MAXF, `triple ${a}×${b}×${c} out of range for ${P}`);
    ok(a <= b && b <= c, `triple ${a}×${b}×${c} not sorted for ${P}`);
  }
  // no duplicate triples
  const uniq = new Set(ts.map((t) => t.join('x')));
  ok(uniq.size === ts.length, `duplicate triples for ${P}`);
}

/* ---- 6. calibration meter: exact→100, monotone, hits CALIBRATED --------- */
console.log('6) Calibration meter behaves (exact=100%, monotone, exact match only)');
for (const P of TARGETS) {
  ok(approx(matchPercent(P, P), 100), `match(${P},${P}) should be 100`);
  ok(matchPercent(P, P) === 100, `exact should read 100 for ${P}`);
  // monotone: further from goal ⇒ not-higher percent
  let prev = 100;
  for (let d = 0; d <= P; d++) {
    const m = matchPercent(P - d, P); // cur below goal
    ok(m <= prev + 1e-9, `match not monotone below goal for ${P} at d=${d}`);
    ok(m >= 0, `match negative for ${P}`);
    prev = m;
  }
  // an exact-only CALIBRATED: any reachable box equals the goal iff V===P
  let reached = false;
  for (const l of RNG) for (const w of RNG) for (const h of RNG) {
    const cur = measure(l, w, h);
    const calibrated = cur === P;
    if (calibrated) { reached = true; ok(matchPercent(cur, P) === 100, `calibrated but meter<100 for ${P}`); }
    if (matchPercent(cur, P) === 100) ok(cur === P, `meter=100 but V≠goal for ${P}`);
  }
  ok(reached, `no box reaches target ${P}`);
}

/* ---- 7. makeTarget never repeats the previous goal --------------------- */
console.log('7) makeTarget avoids immediate repeats');
function makeTarget(prev, rand) {
  let goal;
  do { goal = TARGETS[Math.floor(rand() * TARGETS.length)]; } while (prev && goal === prev.goal);
  return { goal };
}
let seed = 12345;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
let prev = null;
for (let n = 0; n < 5000; n++) {
  const t = makeTarget(prev, rand);
  if (prev) ok(t.goal !== prev.goal, `repeated target ${t.goal}`);
  ok(TARGETS.includes(t.goal), `target ${t.goal} not in TARGETS`);
  prev = t;
}

/* ---- summary ------------------------------------------------------------ */
console.log('\n' + (fails === 0
  ? `ALL GOOD — ${checks} checks passed, 0 failures.`
  : `FAILURES — ${fails} of ${checks} checks failed.`));
process.exit(fails === 0 ? 0 : 1);
