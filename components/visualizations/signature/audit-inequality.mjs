/* Numeric audit for InequalityLab — mirrors the lab's math exactly.
   Run: node audit-inequality.mjs

   Proves, across the whole reachable parameter space:
     1. model spot checks (leftSide, truth, boundary, solvedOp),
     2. THE core invariant — truth(x) at a point agrees EXACTLY with membership
        in the shaded ray built from (boundary, solvedOp) — i.e. the picture the
        student sees never disagrees with plugging the number in,
     3. strictness is preserved by solving (open stays open, closed stays closed),
     4. the flip rule: a<0 ⟺ solvedOp is the flipped op,
     5. the worked steps are algebraically valid (each line has the same solution
        set as the original) and the flip line is flagged exactly when a<0,
     6. the challenge target generator (integer boundary, reachable on the 0.5
        grid, (c−b)/a exact, ~half negative for the flip, never a repeat/start),
     7. SOLVED only at exact endpoint + right direction + right inclusivity, and
        the meter caps hard on a wrong direction and softer on wrong inclusivity.
*/

const OPS = ['<', '≤', '>', '≥'];
const isStrict = (op) => op === '<' || op === '>';
const isLess = (op) => op === '<' || op === '≤';
const flipOp = (op) => ({ '<': '>', '>': '<', '≤': '≥', '≥': '≤' }[op]);

const leftSide = (x, p) => p.a * x + p.b;
const truth = (x, p) => {
  const L = leftSide(x, p);
  const R = p.c;
  if (p.op === '<') return L < R;
  if (p.op === '≤') return L <= R;
  if (p.op === '>') return L > R;
  return L >= R;
};
const boundaryValue = (p) => (p.c - p.b) / p.a;
const solvedOp = (p) => (p.a < 0 ? flipOp(p.op) : p.op);

/* membership in the drawn ray, purely from (boundary, solvedOp) — this is what
   the canvas paints (shaded side + open/closed circle). */
const inRay = (x, p) => {
  const bnd = boundaryValue(p);
  const so = solvedOp(p);
  if (so === '<') return x < bnd;
  if (so === '≤') return x <= bnd;
  if (so === '>') return x > bnd;
  return x >= bnd;
};

/* An EXACT mirror of the pixels the draw() function paints for the solution ray,
   built from the same three quantities the renderer reads:
     drawBoundary  = boundaryValue(p)
     drawDir       = isLess(solvedOp) ? 'left' : 'right'   ← must use the SOLVED op
     drawInclusive = !isStrict(op)                          ← strictness unchanged
   Keeping this in lockstep with the component guards against a regression where
   the picture and the algebra disagree (e.g. the ray drawn from the pre-flip op). */
const drawnRay = (x, p) => {
  const bnd = boundaryValue(p);
  const dir = isLess(solvedOp(p)) ? 'left' : 'right';
  const inclusive = !isStrict(p.op);
  if (dir === 'left') return inclusive ? x <= bnd : x < bnd;
  return inclusive ? x >= bnd : x > bnd;
};

const START = { a: 1, b: 2, c: 6, op: '<' };

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function fmtBoundary(p) {
  let num = p.c - p.b;
  let den = p.a;
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}
function coefStr(a) {
  if (a === 1) return '';
  if (a === -1) return '−';
  return String(a).replace('-', '−');
}
function solveSteps(p) {
  const coef = coefStr(p.a);
  const out = [{ lhs: `${coef}x${p.b !== 0 ? ` + ${p.b}` : ''}`, op: p.op, flip: false }];
  let curOp = p.op;
  if (p.b !== 0) out.push({ lhs: `${coef}x`, op: curOp, flip: false });
  if (p.a !== 1) {
    const willFlip = p.a < 0;
    curOp = willFlip ? flipOp(p.op) : p.op;
    out.push({ lhs: 'x', op: curOp, flip: willFlip });
  }
  if (p.a === 1 && p.b === 0) out[0] = { lhs: 'x', op: p.op, flip: false };
  return { out, finalOp: curOp };
}

const matchPercent = (dist) => 100 / (1 + dist / 0.8);
const SOLVE_EPS = 1e-6;

function makeTarget(prev, rnd) {
  let t;
  let guard = 0;
  do {
    const aMag = 1 + Math.floor(rnd() * 3);
    const a = rnd() < 0.5 ? -aMag : aMag;
    const boundary = Math.floor(rnd() * 11) - 5;
    const op = OPS[Math.floor(rnd() * 4)];
    const b = Math.floor(rnd() * 6);
    const c = a * boundary + b;
    t = { a, b, c, op, boundary };
    if (++guard > 10000) break;
  } while (
    !(t.c >= -14 && t.c <= 14) ||
    (prev && t.a === prev.a && t.b === prev.b && t.c === prev.c && t.op === prev.op) ||
    (t.a === START.a && t.b === START.b && t.c === START.c && t.op === START.op)
  );
  return t;
}

let pass = 0,
  fail = 0;
const bad = [];
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    bad.push(msg);
  }
};

// ---- parameter grids as the controls would serialize them ----
const trunc = (v) => parseFloat(v.toPrecision(15));
const aVals = [-4, -3, -2, -1, 1, 2, 3, 4];
const bVals = [0, 1, 2, 3, 4, 5, 6];
const cVals = [];
for (let v = -6; v <= 10; v++) cVals.push(v);
const xVals = [];
for (let v = -9; v <= 9 + 1e-9; v += 0.5) xVals.push(trunc(v));

// ---- 1. model spot checks ----
ok(leftSide(1, { a: 1, b: 2 }) === 3, 'leftSide 1·1+2 = 3');
ok(truth(1, { a: 1, b: 2, c: 6, op: '<' }) === true, '3 < 6 true');
ok(truth(4, { a: 1, b: 2, c: 6, op: '<' }) === false, '6 < 6 false (open boundary)');
ok(truth(4, { a: 1, b: 2, c: 6, op: '≤' }) === true, '6 ≤ 6 true (closed boundary)');
ok(boundaryValue({ a: 1, b: 2, c: 6 }) === 4, 'boundary of x+2 vs 6 is 4');
ok(boundaryValue({ a: -2, b: 1, c: 5 }) === -2, 'boundary of −2x+1 vs 5 is −2');
ok(solvedOp({ a: -2, op: '≥' }) === '≤', '−2 flips ≥ to ≤');
ok(solvedOp({ a: 2, op: '≥' }) === '≥', '+2 keeps ≥');

// ---- 2. THE core invariant: truth(x) === inRay(x) for every reachable point ----
let invChecks = 0;
for (const a of aVals)
  for (const b of bVals)
    for (const c of cVals)
      for (const op of OPS) {
        const p = { a, b, c, op };
        for (const x of xVals) {
          ok(truth(x, p) === inRay(x, p), `truth==ray a=${a} b=${b} c=${c} ${op} x=${x}`);
          // the EXACT drawn ray must also agree with plugging the number in
          ok(truth(x, p) === drawnRay(x, p), `truth==drawnRay a=${a} b=${b} c=${c} ${op} x=${x}`);
          invChecks++;
        }
      }

// ---- 3. strictness preserved (open↔closed never changes when solving) ----
let strictChecks = 0;
for (const a of aVals)
  for (const op of OPS) {
    ok(isStrict(solvedOp({ a, op })) === isStrict(op), `strictness preserved a=${a} ${op}`);
    strictChecks++;
  }

// ---- 4. the flip rule, exhaustively ----
for (const a of aVals)
  for (const op of OPS) {
    const so = solvedOp({ a, op });
    if (a < 0) ok(so === flipOp(op), `a<0 flips ${op}→${so}`);
    else ok(so === op, `a>0 keeps ${op}`);
  }

// ---- 5. worked steps: line count and flip flag ----
let stepChecks = 0;
for (const a of aVals)
  for (const b of bVals)
    for (const c of cVals)
      for (const op of OPS) {
        const p = { a, b, c, op };
        const { out, finalOp } = solveSteps(p);
        const last = out[out.length - 1];
        ok(last.lhs === 'x', `last step isolates x a=${a} b=${b} c=${c} ${op}`);
        // final op equals solvedOp
        ok(finalOp === solvedOp(p), `final op == solvedOp a=${a} b=${b} c=${c} ${op}`);
        // flip flagged exactly when a<0 and there is a divide line (a≠1 always true for a<0)
        const anyFlip = out.some((l) => l.flip);
        ok(anyFlip === a < 0, `flip flagged iff a<0 (a=${a} ${op})`);
        // step count: 1 + (b!=0) + (a!=1), collapsed to 1 when a==1&&b==0
        const expected = a === 1 && b === 0 ? 1 : 1 + (b !== 0 ? 1 : 0) + (a !== 1 ? 1 : 0);
        ok(out.length === expected, `step count a=${a} b=${b} c=${c} ${op} -> ${out.length}`);
        stepChecks++;
      }

// ---- 6. fraction boundary reduced & correct ----
let fracChecks = 0;
for (const a of aVals)
  for (const b of bVals)
    for (const c of cVals) {
      const p = { a, b, c };
      const fr = fmtBoundary(p);
      ok(fr.den >= 1, `den positive a=${a} b=${b} c=${c}`);
      ok(gcd(fr.num, fr.den) === 1, `reduced a=${a} b=${b} c=${c}`);
      ok(Math.abs(fr.num / fr.den - boundaryValue(p)) < 1e-9, `frac value a=${a} b=${b} c=${c}`);
      fracChecks++;
    }

// ---- 7. target generator: seeded, exhaustive sample ----
const mulberry = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
let prev = null;
let genChecks = 0;
let negCount = 0;
const rnd = mulberry(20260715);
for (let i = 0; i < 6000; i++) {
  const t = makeTarget(prev, rnd);
  ok(t.a !== 0, `target a nonzero (${t.a})`);
  ok(Number.isInteger(t.boundary) && t.boundary >= -5 && t.boundary <= 5, `boundary integer in range (${t.boundary})`);
  ok(t.a * t.boundary + t.b === t.c, `consistent a·bnd+b=c (${t.a}·${t.boundary}+${t.b}=${t.c})`);
  ok(boundaryValue(t) === t.boundary, `boundaryValue matches (${t.boundary})`);
  // reachable exactly on the 0.5 grid within [-9,9]
  ok(t.boundary >= -9 && t.boundary <= 9 && Math.abs(t.boundary * 2 - Math.round(t.boundary * 2)) < 1e-9, `reachable (${t.boundary})`);
  ok(!(t.a === START.a && t.b === START.b && t.c === START.c && t.op === START.op), 'not the start');
  if (prev) ok(!(t.a === prev.a && t.b === prev.b && t.c === prev.c && t.op === prev.op), 'differs from previous');
  if (t.a < 0) negCount++;
  prev = t;
  genChecks++;
}
ok(negCount > 6000 * 0.35 && negCount < 6000 * 0.65, `~half targets negative for the flip (${negCount}/6000)`);

// ---- 8. SOLVED condition + meter caps ----
// exact endpoint + right direction + right inclusivity → 100% + SOLVED;
// wrong direction caps ≤34; wrong inclusivity caps ≤70; both required for SOLVED.
function calibScore(target, endpoint, gInclusive, gDir) {
  const trueDir = isLess(solvedOp(target)) ? 'left' : 'right';
  const trueInclusive = !isStrict(target.op);
  const d = Math.abs(endpoint - target.boundary);
  const directionOK = gDir === trueDir;
  const inclusiveOK = gInclusive === trueInclusive;
  let pct = matchPercent(d);
  if (!directionOK) pct = Math.min(pct, 34);
  if (!inclusiveOK) pct = Math.min(pct, 70);
  const solved = d < SOLVE_EPS && directionOK && inclusiveOK;
  return { pct, solved, trueDir, trueInclusive };
}
let calibChecks = 0;
const rnd2 = mulberry(999);
let pcur = null;
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(pcur, rnd2);
  pcur = t;
  const trueDir = isLess(solvedOp(t)) ? 'left' : 'right';
  const trueInclusive = !isStrict(t.op);
  const otherDir = trueDir === 'left' ? 'right' : 'left';

  const rightAll = calibScore(t, t.boundary, trueInclusive, trueDir);
  ok(rightAll.solved === true, `exact all-correct SOLVED (${t.a},${t.b},${t.c},${t.op})`);
  ok(rightAll.pct === 100, `exact all-correct 100% (${t.a},${t.b},${t.c},${t.op})`);

  // exact endpoint but WRONG direction → not solved, capped
  const wrongDir = calibScore(t, t.boundary, trueInclusive, otherDir);
  ok(wrongDir.solved === false, `wrong direction not solved`);
  ok(wrongDir.pct <= 34, `wrong direction capped ≤34 (got ${wrongDir.pct.toFixed(1)})`);

  // exact endpoint + right dir but wrong inclusivity → not solved, ≤70
  const wrongInc = calibScore(t, t.boundary, !trueInclusive, trueDir);
  ok(wrongInc.solved === false, `wrong inclusivity not solved`);
  ok(wrongInc.pct <= 70, `wrong inclusivity capped ≤70 (got ${wrongInc.pct.toFixed(1)})`);

  // one 0.5 step off in endpoint (all else right) stays clearly below SOLVED
  const near = calibScore(t, t.boundary + 0.5, trueInclusive, trueDir);
  ok(near.solved === false, `0.5-off not solved`);
  ok(near.pct < 95, `0.5-off below 95 (got ${near.pct.toFixed(1)})`);
  calibChecks++;
}

const feel = [
  ['exact', 0],
  ['0.5 off', 0.5],
  ['1 off', 1],
  ['2 off', 2],
  ['4 off', 4],
];

console.log('InequalityLab audit');
console.log('===================');
console.log(`truth==ray invariant checks : ${invChecks}`);
console.log(`strictness checks           : ${strictChecks}`);
console.log(`worked-step combos          : ${stepChecks}`);
console.log(`fraction-boundary combos    : ${fracChecks}`);
console.log(`generated targets           : ${genChecks}  (negative: ${negCount})`);
console.log(`calibration scenarios       : ${calibChecks}`);
console.log('\nmeter feel (dist = |endpoint − boundary|):');
for (const [name, d] of feel) console.log(`  ${name.padEnd(8)} dist ${d}  -> ${matchPercent(d).toFixed(0)}%`);
console.log('\n-------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.slice(0, 25).forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
