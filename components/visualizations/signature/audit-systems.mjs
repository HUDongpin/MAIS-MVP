/* ============================================================================
   audit-systems.mjs — exhaustive correctness audit for SystemsOfEquationsLab.

   Re-implements the lab's PURE math (kept byte-for-byte identical to the JSX)
   and brute-forces it against an INDEPENDENT exact-rational reference, so the
   two must agree on every case. K-12 content: the math must be provably right.

   Run:  node audit-systems.mjs
   ========================================================================== */

/* ---- the lab's pure math (copied verbatim from SystemsOfEquationsLab.jsx) -- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function reduceFrac(n, d) {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return [n / g, d / g];
}
function solveSystem(m1, b1, m2, b2) {
  const M1 = Math.round(m1 * 2);
  const M2 = Math.round(m2 * 2);
  const B1 = Math.round(b1);
  const B2 = Math.round(b2);
  if (M1 === M2) {
    return { type: B1 === B2 ? 'coincident' : 'parallel' };
  }
  let [xN, xD] = reduceFrac(2 * (B2 - B1), M1 - M2);
  let [yN, yD] = reduceFrac(M1 * xN + 2 * B1 * xD, 2 * xD);
  return { type: 'unique', xN, xD, yN, yD, x: xN / xD, y: yN / yD };
}
const matchPercent = (dist) => Math.max(0, Math.min(100, 100 / (1 + dist / 0.7)));

function makeTarget(prev, rnd = Math.random) {
  let t;
  let guard = 0;
  do {
    const xs = Math.floor(rnd() * 9) - 4;
    const ys = Math.floor(rnd() * 9) - 4;
    const m1 = Math.floor(rnd() * 7) - 3;
    let m2 = Math.floor(rnd() * 7) - 3;
    if (m2 === m1) m2 = m1 + (m1 < 3 ? 1 : -1);
    const b1 = ys - m1 * xs;
    const b2 = ys - m2 * xs;
    t = { m1, b1, m2, b2, xs, ys };
  } while (
    ++guard < 500 &&
    (!(t.b1 >= -6 && t.b1 <= 6 && t.b2 >= -6 && t.b2 <= 6) ||
      (prev && t.m1 === prev.m1 && t.b1 === prev.b1 && t.m2 === prev.m2 && t.b2 === prev.b2))
  );
  return t;
}

/* ---- an INDEPENDENT exact-rational reference (BigInt fractions) ----------- */
function bgcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}
function F(n, d = 1n) {
  n = BigInt(n);
  d = BigInt(d);
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = bgcd(n, d);
  return { n: n / g, d: d / g };
}
const fAdd = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
const fMul = (a, b) => F(a.n * b.n, a.d * b.d);
const fEq = (a, b) => a.n === b.n && a.d === b.d;
// line value m*x + b as an exact fraction (m is a multiple of 0.5, b integer)
function refLineY(m, b, xFrac) {
  const mFrac = F(Math.round(m * 2), 2n);
  return fAdd(fMul(mFrac, xFrac), F(b));
}

/* ------------------------------------------------------------------ helpers */
let checks = 0;
let fails = 0;
const bad = [];
function assert(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (bad.length < 25) bad.push(msg);
  }
}

/* ============================================================================
   TEST 1 — exhaustive sweep of every (m1,b1,m2,b2) on the dials.
   m ∈ {−3,−2.5,…,3} (step .5, 13 values), b ∈ {−6,…,6} (step 1, 13 values).
   ========================================================================== */
const mVals = [];
for (let m = -3; m <= 3 + 1e-9; m += 0.5) mVals.push(Math.round(m * 2) / 2);
const bVals = [];
for (let b = -6; b <= 6; b += 1) bVals.push(b);

let uniqueCount = 0;
let parallelCount = 0;
let coincidentCount = 0;
let offscreenUnique = 0;

for (const m1 of mVals)
  for (const b1 of bVals)
    for (const m2 of mVals)
      for (const b2 of bVals) {
        const sys = solveSystem(m1, b1, m2, b2);

        // independent expected classification
        const M1 = Math.round(m1 * 2);
        const M2 = Math.round(m2 * 2);
        let expected;
        if (M1 === M2) expected = b1 === b2 ? 'coincident' : 'parallel';
        else expected = 'unique';
        assert(sys.type === expected, `class ${m1},${b1},${m2},${b2}: got ${sys.type} exp ${expected}`);

        if (sys.type === 'unique') {
          uniqueCount++;
          // the returned point must satisfy BOTH equations EXACTLY (rational)
          const xF = F(sys.xN, sys.xD);
          const yF = F(sys.yN, sys.yD);
          const r1 = refLineY(m1, b1, xF);
          const r2 = refLineY(m2, b2, xF);
          assert(fEq(r1, yF), `eq1 fail ${m1},${b1},${m2},${b2}: line1=${r1.n}/${r1.d} y=${yF.n}/${yF.d}`);
          assert(fEq(r2, yF), `eq2 fail ${m1},${b1},${m2},${b2}: line2=${r2.n}/${r2.d} y=${yF.n}/${yF.d}`);
          // fractions must be fully reduced with positive denominator
          assert(sys.xD > 0 && gcd(sys.xN, sys.xD) === 1, `x not reduced ${m1},${b1},${m2},${b2}`);
          assert(sys.yD > 0 && gcd(sys.yN, sys.yD) === 1, `y not reduced ${m1},${b1},${m2},${b2}`);
          // float mirrors the fraction
          assert(Math.abs(sys.x - sys.xN / sys.xD) < 1e-12, 'x float drift');
          assert(Math.abs(sys.y - sys.yN / sys.yD) < 1e-12, 'y float drift');
          if (!(sys.x >= -8 && sys.x <= 8 && sys.y >= -8 && sys.y <= 8)) offscreenUnique++;
        } else if (sys.type === 'parallel') {
          parallelCount++;
          // parallel ⟺ equal slope, different intercept: confirm the lines never meet
          assert(M1 === M2 && b1 !== b2, `parallel invariant ${m1},${b1},${m2},${b2}`);
        } else {
          coincidentCount++;
          assert(M1 === M2 && b1 === b2, `coincident invariant ${m1},${b1},${m2},${b2}`);
        }
      }

/* ============================================================================
   TEST 2 — the solve-challenge target generator. Every generated system must
   have a reachable integer-lattice solution that the x,y dials (step 1) can hit.
   ========================================================================== */
// a tiny deterministic PRNG so the sweep is reproducible
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(12345);
let prev = null;
let repeatCount = 0;
for (let i = 0; i < 400000; i++) {
  const t = makeTarget(prev, rnd);
  // slopes are distinct integers in range
  assert(Number.isInteger(t.m1) && t.m1 >= -3 && t.m1 <= 3, `m1 range ${JSON.stringify(t)}`);
  assert(Number.isInteger(t.m2) && t.m2 >= -3 && t.m2 <= 3, `m2 range ${JSON.stringify(t)}`);
  assert(t.m1 !== t.m2, `slopes equal ${JSON.stringify(t)}`);
  // solution is an integer lattice point in the dial-reachable window
  assert(Number.isInteger(t.xs) && t.xs >= -8 && t.xs <= 8, `xs reachable ${JSON.stringify(t)}`);
  assert(Number.isInteger(t.ys) && t.ys >= -8 && t.ys <= 8, `ys reachable ${JSON.stringify(t)}`);
  // intercepts stay on the (display) dials
  assert(t.b1 >= -6 && t.b1 <= 6 && t.b2 >= -6 && t.b2 <= 6, `b range ${JSON.stringify(t)}`);
  // the stated solution really is THE unique solution of the system
  const sys = solveSystem(t.m1, t.b1, t.m2, t.b2);
  assert(sys.type === 'unique', `target not unique ${JSON.stringify(t)}`);
  assert(sys.x === t.xs && sys.y === t.ys, `target solution mismatch ${JSON.stringify(t)} got (${sys.x},${sys.y})`);
  // the point lies on both lines exactly (the ✓/✓ the UI shows)
  assert(t.ys === t.m1 * t.xs + t.b1, `on line1 ${JSON.stringify(t)}`);
  assert(t.ys === t.m2 * t.xs + t.b2, `on line2 ${JSON.stringify(t)}`);
  if (prev && t.m1 === prev.m1 && t.b1 === prev.b1 && t.m2 === prev.m2 && t.b2 === prev.b2) repeatCount++;
  prev = t;
}

/* ============================================================================
   TEST 3 — the match meter behaves (100% only at the exact solution, monotone).
   ========================================================================== */
assert(matchPercent(0) === 100, 'meter should read 100% at distance 0');
let lastPct = Infinity;
for (let d = 0; d <= 20; d += 0.5) {
  const p = matchPercent(d);
  assert(p <= lastPct + 1e-9, `meter not monotone at d=${d}`);
  assert(p >= 0 && p <= 100, `meter out of range at d=${d}`);
  if (d > 0) assert(p < 100, `meter should be <100 for d=${d}`);
  lastPct = p;
}

/* ============================================================================
   TEST 4 — START system is the clean (1, 2) crossing the lede promises.
   ========================================================================== */
const startSys = solveSystem(1, 1, -1, 3);
assert(startSys.type === 'unique' && startSys.x === 1 && startSys.y === 2, 'START must solve to (1,2)');

/* ------------------------------------------------------------------ report */
console.log('SystemsOfEquationsLab — math audit');
console.log('-----------------------------------------------------------');
console.log(`sweep grid:        ${mVals.length} slopes × ${bVals.length} intercepts, per line`);
console.log(`systems checked:   ${(mVals.length * bVals.length) ** 2}`);
console.log(`  unique:          ${uniqueCount}  (of which ${offscreenUnique} cross off the ±8 window)`);
console.log(`  parallel:        ${parallelCount}`);
console.log(`  coincident:      ${coincidentCount}`);
console.log(`target generator:  400000 draws, ${repeatCount} back-to-back repeats`);
console.log(`START solves to:   (${startSys.x}, ${startSys.y})`);
console.log('-----------------------------------------------------------');
console.log(`total assertions:  ${checks.toLocaleString()}`);
if (fails === 0) {
  console.log('RESULT: ✅ ALL CHECKS PASS');
} else {
  console.log(`RESULT: ❌ ${fails} FAILURES`);
  for (const b of bad) console.log('   · ' + b);
  process.exit(1);
}
