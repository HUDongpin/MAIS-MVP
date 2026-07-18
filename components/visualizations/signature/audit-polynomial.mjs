/* ============================================================================
   audit-polynomial.mjs — numeric verification for PolynomialFunctionLab.

   Mirrors the lab's pure math and checks:
     1. factored form  ≡  expanded standard form  (exact coefficients)
     2. every root is an exact x-intercept: model(rᵢ) = 0
     3. y-intercept = f(0) = constant coefficient
     4. end behaviour formula matches actual large-|x| sign
     5. multiplicity: odd → CROSS (sign flips), even → TOUCH (sign same)
     6. turning-point count ≤ n−1 and matches an independent fine-scan
     7. calibration: exact match → rms 0 → CALIBRATED; smallest genuine
        mismatch is far above the threshold (no false stamp); makeTarget
        always returns a reachable, sensible target.

   Run:  node audit-polynomial.mjs
   ========================================================================== */

const WORLD = { xmin: -7, xmax: 7, ymin: -7, ymax: 7 };
const DEGREES = [2, 3, 4];

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('  ✗ ' + msg);
  }
}

/* ---- lab math (kept in sync with PolynomialFunctionLab.jsx) -------------- */
function model(x, p) {
  let y = p.a;
  for (let i = 0; i < p.n; i++) y *= x - p.roots[i];
  return y;
}
function expand(a, n, roots) {
  let c = [a];
  for (let i = 0; i < n; i++) {
    const r = roots[i];
    const next = new Array(c.length + 1).fill(0);
    for (let j = 0; j < c.length; j++) {
      next[j + 1] += c[j];
      next[j] += -r * c[j];
    }
    c = next;
  }
  return c;
}
function polyval(c, x) {
  let s = 0;
  for (let j = c.length - 1; j >= 0; j--) s = s * x + c[j];
  return s;
}
function derivative(c) {
  if (c.length <= 1) return [0];
  const d = new Array(c.length - 1);
  for (let j = 1; j < c.length; j++) d[j - 1] = c[j] * j;
  return d;
}
function turningPoints(coeffs) {
  const d = derivative(coeffs);
  const scale = d.reduce((m, c) => Math.max(m, Math.abs(c)), 0) || 1;
  const TOL = 1e-6 * scale;
  const STEP = 0.004;
  const pts = [];
  let lastSign = 0;
  let lastX = WORLD.xmin;
  for (let x = WORLD.xmin; x <= WORLD.xmax + 1e-9; x += STEP) {
    const v = polyval(d, x);
    if (Math.abs(v) <= TOL) continue;
    const s = v > 0 ? 1 : -1;
    if (lastSign !== 0 && s !== lastSign) {
      let a = lastX,
        b = x,
        fa = polyval(d, lastX);
      for (let it = 0; it < 60; it++) {
        const m = (a + b) / 2,
          fm = polyval(d, m);
        if (fm === 0) {
          a = b = m;
          break;
        }
        if (fa < 0 === fm < 0) {
          a = m;
          fa = fm;
        } else b = m;
      }
      pts.push({ x: (a + b) / 2, y: polyval(coeffs, (a + b) / 2) });
    }
    lastSign = s;
    lastX = x;
  }
  return pts;
}
// Independent reference: count real roots of ODD multiplicity of f′ = places f′
// changes sign. Uses a finer grid + magnitude-scaled dead-band, computed
// separately from turningPoints() so agreement is a real cross-check.
function signChangesOfDeriv(coeffs) {
  const d = derivative(coeffs);
  const scale = d.reduce((m, c) => Math.max(m, Math.abs(c)), 0) || 1;
  const TOL = 1e-7 * scale;
  const STEP = 0.001;
  let count = 0;
  let last = 0;
  for (let x = WORLD.xmin; x <= WORLD.xmax + 1e-9; x += STEP) {
    const v = polyval(d, x);
    if (Math.abs(v) <= TOL) continue;
    const s = v > 0 ? 1 : -1;
    if (last !== 0 && s !== last) count++;
    last = s;
  }
  return count;
}
function rootInfo(n, roots) {
  const map = new Map();
  for (let i = 0; i < n; i++) map.set(roots[i], (map.get(roots[i]) || 0) + 1);
  return [...map.entries()].map(([value, mult]) => ({ value, mult })).sort((u, v) => u.value - v.value);
}
function endBehavior(a, n) {
  const right = a > 0 ? 1 : a < 0 ? -1 : 0;
  const left = right * (n % 2 === 0 ? 1 : -1);
  return { left, right };
}
const CAP = 10;
function rmsError(p, t) {
  const N = 200;
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

/* ------- 1..6 : structural math over a broad grid ------------------------- */
console.log('Polynomial lab audit\n────────────────────');

const aSet = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
const rootVals = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

// Sample a large but bounded set of (a,n,roots) states.
let structChecks = 0;
for (const n of DEGREES) {
  for (const a of aSet) {
    // iterate roots on a coarser sub-grid to keep the run fast but thorough
    const sub = [-3, -2, -1, 0, 1, 2, 3];
    const combos = [];
    // build all root tuples of length n over `sub`
    const rec = (depth, acc) => {
      if (depth === n) {
        combos.push(acc.slice());
        return;
      }
      for (const r of sub) {
        acc.push(r);
        rec(depth + 1, acc);
        acc.pop();
      }
    };
    rec(0, []);
    for (const rts of combos) {
      const roots = [rts[0], rts[1] ?? 0, rts[2] ?? 0, rts[3] ?? 0];
      const p = { a, n, roots };
      const coeffs = expand(a, n, roots);

      // (1) factored ≡ expanded at several x
      for (const x of [-6.3, -2.1, 0.4, 1.7, 5.9]) {
        const lhs = model(x, p);
        const rhs = polyval(coeffs, x);
        ok(Math.abs(lhs - rhs) <= 1e-7 * (1 + Math.abs(lhs)), `expand≡model a=${a} n=${n} r=${rts} x=${x}`);
        structChecks++;
      }
      // coefficients are exact multiples of ½ (integer roots, half-step a)
      for (const c of coeffs) ok(Number.isInteger(Math.round(2 * c)) && Math.abs(2 * c - Math.round(2 * c)) < 1e-9, `coef half-integer a=${a} n=${n} r=${rts}`);

      // (2) roots are exact intercepts
      for (let i = 0; i < n; i++) ok(model(roots[i], p) === 0, `root exact a=${a} n=${n} r=${rts} i=${i}`);

      // (3) y-intercept
      ok(Math.abs(model(0, p) - coeffs[0]) < 1e-9, `yint a=${a} n=${n} r=${rts}`);

      // (4) end behaviour
      const eb = endBehavior(a, n);
      const far = 1e6;
      ok(Math.sign(model(far, p)) === eb.right, `end +∞ a=${a} n=${n} r=${rts}`);
      ok(Math.sign(model(-far, p)) === eb.left, `end −∞ a=${a} n=${n} r=${rts}`);

      // (5) multiplicity: cross vs touch via sign either side of each root
      const info = rootInfo(n, roots);
      for (const d of info) {
        const eps = 1e-4;
        const sL = Math.sign(model(d.value - eps, p));
        const sR = Math.sign(model(d.value + eps, p));
        if (sL !== 0 && sR !== 0) {
          if (d.mult % 2 === 1) ok(sL !== sR, `odd mult crosses value=${d.value} a=${a} n=${n} r=${rts}`);
          else ok(sL === sR, `even mult touches value=${d.value} a=${a} n=${n} r=${rts}`);
        }
      }

      // (6) turning points: ≤ n−1, no missed points (independent count), and
      //     every reported point is a GENUINE local extremum (f′ flips sign
      //     with definite magnitude on both sides — no spurious inflection).
      const tp = turningPoints(coeffs);
      ok(tp.length <= n - 1, `turns≤n-1 (${tp.length}) a=${a} n=${n} r=${rts}`);
      ok(tp.length === signChangesOfDeriv(coeffs), `turns match indep count (${tp.length} vs ${signChangesOfDeriv(coeffs)}) a=${a} n=${n} r=${rts}`);
      const dd = derivative(coeffs);
      for (const t of tp) {
        const dScale = dd.reduce((m, c) => Math.max(m, Math.abs(c)), 0) || 1;
        const lo = polyval(dd, t.x - 0.05);
        const hi = polyval(dd, t.x + 0.05);
        // a genuine turning point: f′ has definite, OPPOSITE signs either side
        const floor = 1e-9 * dScale;
        ok(
          Math.abs(lo) > floor && Math.abs(hi) > floor && Math.sign(lo) === -Math.sign(hi),
          `genuine extremum at x=${t.x.toFixed(3)} (f'=${lo.toExponential(1)},${hi.toExponential(1)}) a=${a} n=${n} r=${rts}`
        );
      }
    }
  }
}
console.log(`structural checks run: ${structChecks} sample-evals across the grid`);

/* ------- 7 : calibration tuning + safety --------------------------------- */
// Build the full reachable target grid used by the meter: n∈{2,3,4}, a∈aSet,
// roots ∈ integer[-3,3] (matches makeTarget's range).
const tSub = [-3, -2, -1, 0, 1, 2, 3];
function allTargets() {
  const out = [];
  for (const n of DEGREES) {
    const combos = [];
    const rec = (depth, acc) => {
      if (depth === n) {
        combos.push(acc.slice());
        return;
      }
      for (const r of tSub) {
        acc.push(r);
        rec(depth + 1, acc);
        acc.pop();
      }
    };
    rec(0, []);
    for (const a of aSet)
      for (const rts of combos) out.push({ a, n, roots: [rts[0], rts[1] ?? 0, rts[2] ?? 0, rts[3] ?? 0] });
  }
  return out;
}

const targets = allTargets();
console.log(`\ncalibration target space: ${targets.length} reachable curves`);

// exact self-match → rms 0
let maxSelf = 0;
for (const t of targets) maxSelf = Math.max(maxSelf, rmsError(t, t));
ok(maxSelf === 0, `every exact self-match rms is 0 (max seen ${maxSelf})`);
console.log(`max self-match rms: ${maxSelf}`);

// smallest GENUINE mismatch: perturb one root by ±1 or a by ±½ (and a degree
// step), skipping perturbations that land on the same curve (root permutation).
function sameCurve(a, b) {
  if (!a || !b) return false;
  if (a.n !== b.n || a.a !== b.a) return false;
  const ra = a.roots.slice(0, a.n).slice().sort((x, y) => x - y);
  const rb = b.roots.slice(0, b.n).slice().sort((x, y) => x - y);
  return ra.every((v, i) => v === rb[i]);
}
let minMismatch = Infinity;
let minSingleRoot = Infinity;
// sample a subset for speed (every k-th target) — representative of the min
for (let idx = 0; idx < targets.length; idx += 7) {
  const t = targets[idx];
  const neigh = [];
  // a ± ½
  for (const da of [-0.5, 0.5]) {
    const a2 = t.a + da;
    if (a2 !== 0 && aSet.includes(a2)) neigh.push({ a: a2, n: t.n, roots: t.roots.slice() });
  }
  // each active root ± 1
  for (let i = 0; i < t.n; i++)
    for (const dr of [-1, 1]) {
      const r2 = t.roots.slice();
      r2[i] += dr;
      if (r2[i] >= -4 && r2[i] <= 4) neigh.push({ a: t.a, n: t.n, roots: r2 });
    }
  // degree ± 1
  for (const dn of [-1, 1]) {
    const n2 = t.n + dn;
    if (DEGREES.includes(n2)) neigh.push({ a: t.a, n: n2, roots: t.roots.slice() });
  }
  for (const cand of neigh) {
    if (sameCurve(cand, t)) continue;
    const e = rmsError(cand, t);
    minMismatch = Math.min(minMismatch, e);
    // track single-root-off specifically for RMS_SCALE feel
    if (cand.a === t.a && cand.n === t.n) minSingleRoot = Math.min(minSingleRoot, e);
  }
}
console.log(`smallest genuine mismatch rms (any single dial): ${minMismatch.toFixed(4)}`);
console.log(`smallest single-root-off rms: ${minSingleRoot.toFixed(4)}`);

const MATCH_RMS = 1e-6;
const RMS_SCALE = 2.5;
ok(minMismatch > MATCH_RMS * 1000, `no false CALIBRATED: min mismatch ${minMismatch.toFixed(4)} ≫ MATCH_RMS ${MATCH_RMS}`);
const matchPct = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / RMS_SCALE)));
console.log(`RMS_SCALE=${RMS_SCALE} → single-root-off reads ≈ ${matchPct(minSingleRoot).toFixed(0)}% (min) `);
// suggest a scale that makes a typical single-root-off ~50%
console.log(`(suggested RMS_SCALE ≈ smallest single-root-off = ${minSingleRoot.toFixed(2)} for ~50% feel)`);

/* makeTarget sanity — replicate its guards */
function distinctRootCount(t) {
  return new Set(t.roots.slice(0, t.n)).size;
}
function fitsReasonably(t) {
  let inBand = 0;
  for (let i = 0; i <= 40; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / 40;
    const y = model(x, t);
    if (y >= WORLD.ymin && y <= WORLD.ymax) inBand++;
  }
  return inBand >= 14;
}
const START = { a: 1, n: 3, roots: [-2, 0, 2, 3] };
function makeTarget(prev) {
  const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  let t,
    guard = 0;
  do {
    const n = DEGREES[Math.floor(Math.random() * DEGREES.length)];
    const a = aSet[Math.floor(Math.random() * aSet.length)];
    const roots = [0, 0, 0, 0].map(() => randInt(-3, 3));
    t = { a, n, roots };
    guard++;
  } while (guard < 200 && (sameCurve(t, prev) || sameCurve(t, START) || distinctRootCount(t) < 2 || !fitsReasonably(t)));
  return t;
}
let prev = null;
let badTargets = 0;
for (let i = 0; i < 4000; i++) {
  const t = makeTarget(prev);
  if (distinctRootCount(t) < 2 || !fitsReasonably(t) || sameCurve(t, START) || t.a === 0) badTargets++;
  // reachable & exact self-match
  if (rmsError(t, t) !== 0) badTargets++;
  prev = t;
}
ok(badTargets === 0, `makeTarget always valid & reachable over 4000 draws (bad=${badTargets})`);

/* ---- summary ------------------------------------------------------------- */
console.log('\n────────────────────');
console.log(`checks: ${checks}   failures: ${fails}`);
console.log(fails === 0 ? '✓ ALL CHECKS PASS' : `✗ ${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
