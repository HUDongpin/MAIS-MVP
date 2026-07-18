/* ============================================================================
   audit-quadratic-polynomial.mjs — exhaustive correctness audit for
   QuadraticPolynomialLab (standard form  y = a·x² + b·x + c).

   Re-implements the lab's PURE math (kept byte-for-byte identical to the JSX)
   and brute-forces it against INDEPENDENT exact-integer references, so the two
   must agree on every case. K-12 content: the math must be provably right.

   Run:  node audit-quadratic-polynomial.mjs
   ========================================================================== */

/* ---- the lab's pure math (copied verbatim from QuadraticPolynomialLab.jsx) - */
const WORLD = { xmin: -8, xmax: 8, ymin: -8, ymax: 8 };
const START = { a: 1, b: 0, c: 0 };

function model(x, p) {
  return (p.a * x + p.b) * x + p.c;
}
function ints(p) {
  return { ai: Math.round(p.a * 4), bi: Math.round(p.b * 2), ci: Math.round(p.c * 2) };
}
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function analyze(p) {
  const { ai, bi, ci } = ints(p);
  const linear = ai === 0;
  const dN = bi * bi - 2 * ai * ci; // Δ·4
  const disc = dN / 4;
  const out = { linear, disc, dN, ai, bi, ci };
  if (linear) {
    out.rootsFloat = bi !== 0 ? [-p.c / p.b] : [];
    out.rootCount = bi !== 0 ? 1 : 0;
    return out;
  }
  out.hFloat = -bi / ai;
  out.kFloat = -dN / (4 * ai);
  if (dN > 0) {
    const s = Math.sqrt(dN);
    const sInt = Math.round(s);
    const perfect = sInt * sInt === dN;
    const r1f = (-bi - s) / ai;
    const r2f = (-bi + s) / ai;
    out.rootsFloat = [Math.min(r1f, r2f), Math.max(r1f, r2f)];
    out.rootCount = 2;
    out.rootsExact = perfect;
    if (perfect) out.rootsInt = [[-bi - sInt, ai], [-bi + sInt, ai]]; // numerator/denominator
  } else if (dN === 0) {
    out.rootsFloat = [-bi / ai];
    out.rootCount = 1;
    out.rootsExact = true;
    out.rootsInt = [[-bi, ai]];
  } else {
    out.rootsFloat = [];
    out.rootCount = 0;
  }
  return out;
}
function rmsError(p, t) {
  const N = 160;
  const CAP = 12;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    let d = model(x, p) - model(x, t);
    if (d > CAP) d = CAP;
    else if (d < -CAP) d = -CAP;
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 1.2)));
const MATCH_RMS = 0.06;

function makeTarget(prev, rnd = Math.random) {
  const snap = (v, st) => Math.round(v / st) * st;
  let t;
  let guard = 0;
  do {
    const aMag = snap(0.5 + rnd() * 2.0, 0.25);
    const a = +((rnd() < 0.5 ? -1 : 1) * aMag).toFixed(2);
    const b = +snap(-5 + rnd() * 10, 0.5).toFixed(1);
    const c = +snap(-5 + rnd() * 10, 0.5).toFixed(1);
    t = { a, b, c };
  } while (
    ++guard < 400 &&
    (() => {
      const h = -t.b / (2 * t.a);
      const k = t.c - (t.b * t.b) / (4 * t.a);
      const offscreen = Math.abs(h) > 6 || k < WORLD.ymin + 1 || k > WORLD.ymax - 1;
      const sameAsStart = t.a === START.a && t.b === START.b && t.c === START.c;
      const sameAsPrev = prev && t.a === prev.a && t.b === prev.b && t.c === prev.c;
      return offscreen || sameAsStart || sameAsPrev;
    })()
  );
  return t;
}

/* ------------------------------------------------------------------ helpers */
let checks = 0;
let fails = 0;
const bad = [];
function assert(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (bad.length < 30) bad.push(msg);
  }
}

/* the dial grids */
const aVals = [];
for (let a = -3; a <= 3 + 1e-9; a += 0.25) aVals.push(Math.round(a * 4) / 4);
const bVals = [];
for (let b = -6; b <= 6 + 1e-9; b += 0.5) bVals.push(Math.round(b * 2) / 2);
const cVals = [];
for (let c = -6; c <= 6 + 1e-9; c += 0.5) cVals.push(Math.round(c * 2) / 2);

/* ============================================================================
   TEST 1 — exhaustive sweep of every (a,b,c) on the dials.
   ========================================================================== */
let quadratics = 0;
let lines = 0;
let two = 0;
let one = 0;
let none = 0;
let rationalRoots = 0;
let irrationalRoots = 0;

for (const a of aVals)
  for (const b of bVals)
    for (const c of cVals) {
      const p = { a, b, c };
      const { ai, bi, ci } = ints(p);
      const info = analyze(p);

      // (1) exact discriminant matches the float b²−4ac
      const discNum = bi * bi - 2 * ai * ci;
      assert(info.dN === discNum, `dN mismatch ${a},${b},${c}`);
      assert(Math.abs(info.disc - (b * b - 4 * a * c)) < 1e-9, `disc float ${a},${b},${c}`);

      if (ai === 0) {
        lines++;
        // degenerate line: root at −c/b when b≠0
        if (bi !== 0) assert(Math.abs(model(info.rootsFloat[0], p)) < 1e-9, `line root ${a},${b},${c}`);
        continue;
      }
      quadratics++;

      // (2) discriminant SIGN determines the real-root count, checked
      //     independently by counting sign structure of the parabola vs x-axis.
      // vertex value k tells us directly: a>0 → min k; roots exist iff k≤0.
      const h = -bi / ai;
      const k = c - (b * b) / (4 * a);
      const expectCount = discNum > 0 ? 2 : discNum === 0 ? 1 : 0;
      assert(info.rootCount === expectCount, `rootCount ${a},${b},${c} got ${info.rootCount} exp ${expectCount}`);
      // cross-check with the vertex sign: upward parabola meets axis iff k ≤ 0
      const meets = a > 0 ? k <= 1e-12 : k >= -1e-12;
      assert(meets === discNum >= 0, `vertex-sign vs disc ${a},${b},${c} k=${k}`);

      if (expectCount === 2) two++;
      else if (expectCount === 1) one++;
      else none++;

      // (3) vertex is exact: f(h) == k, symmetry f(h−t)==f(h+t), and it's the extremum
      assert(Math.abs(model(h, p) - k) < 1e-9, `f(h)!=k ${a},${b},${c}`);
      for (const t of [0.5, 1, 2.3]) {
        assert(Math.abs(model(h - t, p) - model(h + t, p)) < 1e-9, `symmetry ${a},${b},${c} t=${t}`);
        if (a > 0) assert(model(h, p) <= model(h + t, p) + 1e-9, `not min ${a},${b},${c}`);
        else assert(model(h, p) >= model(h + t, p) - 1e-9, `not max ${a},${b},${c}`);
      }

      // (4) y-intercept is exactly c
      assert(model(0, p) === c, `y-int ${a},${b},${c}`);

      // (5) vertex-form identity a(x−h)²+k == a x²+b x+c for sampled x
      for (const x of [-3, -0.7, 0, 1.4, 5]) {
        const vf = a * (x - h) * (x - h) + k;
        assert(Math.abs(vf - model(x, p)) < 1e-9, `vertex-form identity ${a},${b},${c} x=${x}`);
      }

      // (6) rational roots (perfect-square Δ·4) satisfy the polynomial EXACTLY
      //     using integer arithmetic: 4·ai·f(root) must be identically 0.
      if (info.rootsExact && info.rootCount >= 1) {
        rationalRoots++;
        for (const [num, den] of info.rootsInt) {
          // f(num/den) with den==ai: 4·ai·f = num² + 2·bi·num + 2·ai·ci  (must be 0)
          const scaled = num * num + 2 * bi * num + 2 * ai * ci;
          assert(scaled === 0, `exact root fails ${a},${b},${c} root ${num}/${den} scaled=${scaled}`);
          assert(den === ai, `root denom !=ai ${a},${b},${c}`);
          // and the float root really is a zero
          assert(Math.abs(model(num / den, p)) < 1e-9, `float root ${a},${b},${c}`);
        }
        // Vieta on rational roots: sum = −b/a, product = c/a (only for 2 roots)
        if (info.rootCount === 2) {
          const r1 = info.rootsInt[0][0] / info.rootsInt[0][1];
          const r2 = info.rootsInt[1][0] / info.rootsInt[1][1];
          assert(Math.abs(r1 + r2 - -b / a) < 1e-9, `Vieta sum ${a},${b},${c}`);
          assert(Math.abs(r1 * r2 - c / a) < 1e-9, `Vieta product ${a},${b},${c}`);
        }
      } else if (info.rootCount === 2) {
        irrationalRoots++;
        // irrational roots: both float values are zeros; Vieta holds numerically
        for (const r of info.rootsFloat) assert(Math.abs(model(r, p)) < 1e-7, `irr root ${a},${b},${c}`);
        const [r1, r2] = info.rootsFloat;
        assert(Math.abs(r1 + r2 - -b / a) < 1e-9, `Vieta sum irr ${a},${b},${c}`);
        assert(Math.abs(r1 * r2 - c / a) < 1e-9, `Vieta prod irr ${a},${b},${c}`);
      }
    }

/* ============================================================================
   TEST 2 — the calibration target generator + match meter.
   ========================================================================== */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(987654);
let prev = null;
let repeatCount = 0;
let onGridA = 0;
for (let i = 0; i < 200000; i++) {
  const t = makeTarget(prev, rnd);
  // a is nonzero, |a|≥0.5, and on the quarter grid
  assert(t.a !== 0 && Math.abs(t.a) >= 0.5 && Math.abs(t.a) <= 3, `target a range ${JSON.stringify(t)}`);
  assert(Math.abs(Math.round(t.a * 4) - t.a * 4) < 1e-9, `target a off grid ${JSON.stringify(t)}`);
  assert(Math.abs(Math.round(t.b * 2) - t.b * 2) < 1e-9, `target b off grid ${JSON.stringify(t)}`);
  assert(Math.abs(Math.round(t.c * 2) - t.c * 2) < 1e-9, `target c off grid ${JSON.stringify(t)}`);
  assert(t.b >= -5 && t.b <= 5 && t.c >= -5 && t.c <= 5, `target b/c range ${JSON.stringify(t)}`);
  // vertex is on-screen (so all clues are visible)
  const h = -t.b / (2 * t.a);
  const k = t.c - (t.b * t.b) / (4 * t.a);
  assert(Math.abs(h) <= 6 && k >= WORLD.ymin + 1 && k <= WORLD.ymax - 1, `target vertex offscreen ${JSON.stringify(t)}`);
  // never the START curve
  assert(!(t.a === START.a && t.b === START.b && t.c === START.c), `target is START ${JSON.stringify(t)}`);
  onGridA++;
  if (prev && t.a === prev.a && t.b === prev.b && t.c === prev.c) repeatCount++;

  // exact match → RMS 0 → 100% → CALIBRATED
  assert(rmsError(t, t) === 0, `self RMS !=0 ${JSON.stringify(t)}`);
  assert(matchPercent(0) === 100, 'meter 100 at 0');

  // NO false stamp: the smallest single-dial-step miss must stay above MATCH_RMS
  const nudges = [
    { ...t, a: t.a + (t.a > 0 ? -0.25 : 0.25) },
    { ...t, b: t.b + 0.5 },
    { ...t, c: t.c + 0.5 },
    { ...t, c: t.c - 0.5 },
  ];
  for (const n of nudges) {
    const e = rmsError(n, t);
    assert(e >= MATCH_RMS, `false-stamp risk: nudge RMS ${e.toFixed(4)} for ${JSON.stringify(t)}→${JSON.stringify(n)}`);
  }
  prev = t;
}

/* ============================================================================
   TEST 3 — meter is monotone decreasing and bounded, only 100% at rms 0.
   ========================================================================== */
let lastPct = Infinity;
for (let d = 0; d <= 30; d += 0.25) {
  const p = matchPercent(d);
  assert(p <= lastPct + 1e-9, `meter not monotone at rms=${d}`);
  assert(p >= 0 && p <= 100, `meter out of range at rms=${d}`);
  if (d > 0) assert(p < 100, `meter should be <100 at rms=${d}`);
  lastPct = p;
}
assert(matchPercent(MATCH_RMS) < 100 && matchPercent(MATCH_RMS) > 90, 'meter near-100 at threshold');

/* ============================================================================
   TEST 4 — START curve y = x²: Δ=0, one double root at 0, vertex (0,0).
   ========================================================================== */
const s = analyze(START);
assert(s.dN === 0 && s.disc === 0, 'START Δ should be 0');
assert(s.rootCount === 1 && s.rootsFloat[0] === 0, 'START one root at 0');
assert(s.hFloat === 0 && s.kFloat === 0, 'START vertex (0,0)');

/* a few landmark hand-checked cases */
const cases = [
  { p: { a: 1, b: -4, c: 3 }, disc: 4, roots: [1, 3], vertex: [2, -1] }, // (x−1)(x−3)
  { p: { a: 1, b: 0, c: 1 }, disc: -4, roots: [], vertex: [0, 1] }, // no real roots
  { p: { a: -1, b: 0, c: 4 }, disc: 16, roots: [-2, 2], vertex: [0, 4] },
  { p: { a: 1, b: -2, c: 1 }, disc: 0, roots: [1], vertex: [1, 0] }, // (x−1)²
  { p: { a: 0.5, b: 0, c: -2 }, disc: 4, roots: [-2, 2], vertex: [0, -2] },
];
for (const cse of cases) {
  const info = analyze(cse.p);
  assert(info.disc === cse.disc, `landmark disc ${JSON.stringify(cse.p)} got ${info.disc}`);
  assert(info.rootCount === cse.roots.length, `landmark rootCount ${JSON.stringify(cse.p)}`);
  for (let i = 0; i < cse.roots.length; i++)
    assert(Math.abs(info.rootsFloat[i] - cse.roots[i]) < 1e-9, `landmark root ${JSON.stringify(cse.p)}`);
  assert(info.hFloat === cse.vertex[0] && info.kFloat === cse.vertex[1], `landmark vertex ${JSON.stringify(cse.p)}`);
}

/* ------------------------------------------------------------------ report */
console.log('QuadraticPolynomialLab — math audit');
console.log('-----------------------------------------------------------');
console.log(`dial grid:         a ${aVals.length} × b ${bVals.length} × c ${cVals.length}`);
console.log(`triples swept:     ${(aVals.length * bVals.length * cVals.length).toLocaleString()}`);
console.log(`  quadratics:      ${quadratics.toLocaleString()}   lines (a=0): ${lines.toLocaleString()}`);
console.log(`  two real roots:  ${two.toLocaleString()}`);
console.log(`  one double root: ${one.toLocaleString()}`);
console.log(`  no real roots:   ${none.toLocaleString()}`);
console.log(`  rational roots:  ${rationalRoots.toLocaleString()}   irrational: ${irrationalRoots.toLocaleString()}`);
console.log(`target generator:  200,000 draws, ${repeatCount} back-to-back repeats, all on-grid & on-screen`);
console.log(`START analyze:     Δ=${s.disc}, roots=${JSON.stringify(s.rootsFloat)}, vertex=(${s.hFloat},${s.kFloat})`);
console.log('-----------------------------------------------------------');
console.log(`total assertions:  ${checks.toLocaleString()}`);
if (fails === 0) {
  console.log('RESULT: ✅ ALL CHECKS PASS');
} else {
  console.log(`RESULT: ❌ ${fails} FAILURES`);
  for (const m of bad) console.log('   · ' + m);
  process.exit(1);
}
