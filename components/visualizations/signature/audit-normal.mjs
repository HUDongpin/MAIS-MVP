/* ============================================================================
   audit-normal.mjs — numeric verification for NormalDistributionLab.jsx

   Run:  node audit-normal.mjs
   Zero dependencies. Every formula here is a stand-alone copy of the math the
   lab uses, so this file is an independent check on the component (not a shared
   import). It fails loudly (process.exit(1)) if any invariant breaks.

   What it proves:
     1. The pdf is a real probability density: it integrates to exactly 1.
     2. Peak sits at x = μ with height 1/(σ√(2π)); the curve is symmetric.
     3. The inflection points are exactly at x = μ ± σ  (f'' = 0 there, and the
        sign of f'' flips across them) — this is σ's geometric meaning.
     4. erf / Φ (the CDF) are accurate to <1e-6 against known values.
     5. The 68–95–99.7 empirical rule: area within ±kσ = erf(k/√2) for k=1,2,3,
        and it is INVARIANT — identical for every (μ, σ). This is the centerpiece.
     6. areaBetween(a,b) = Φ((b−μ)/σ) − Φ((a−μ)/σ) matches direct integration.
     7. Calibration is well-posed: exact target ⇒ RMS 0 ⇒ 100% ⇒ CALIBRATED,
        and the closest wrong grid neighbour stays safely below the stamp.
   ========================================================================== */

const SQRT2 = Math.SQRT2;
const SQRT2PI = Math.sqrt(2 * Math.PI);

/* ---- the model (pure math, mirrors EDIT 2 in the component) --------------- */
const pdf = (x, mu, sig) =>
  Math.exp(-((x - mu) ** 2) / (2 * sig * sig)) / (sig * SQRT2PI);
const peakHeight = (sig) => 1 / (sig * SQRT2PI);

/* ---- erf (Abramowitz & Stegun 7.1.26, max err 1.5e-7) + the normal CDF ---- */
function erf(x) {
  const s = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}
const Phi = (z) => 0.5 * (1 + erf(z / SQRT2)); // standard-normal CDF
const areaBetween = (a, b, mu, sig) => Phi((b - mu) / sig) - Phi((a - mu) / sig);
const bandArea = (k) => erf(k / SQRT2); // area within ±kσ — independent of μ,σ

/* ---- calibration (mirrors EDIT 6) ----------------------------------------- */
const WORLD = { xmin: -6, xmax: 6 };
const CALIB_SCALE = 0.042; // tuned below; baked into the component
const MATCH_RMS = 0.002; // stamp threshold; baked into the component
function rmsError(p, t) {
  const N = 200;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const d = pdf(x, p.mu, p.sig) - pdf(x, t.mu, t.sig);
    s += d * d;
  }
  return Math.sqrt(s / (N + 1));
}
const matchPercent = (rms) =>
  Math.max(0, Math.min(100, 100 / (1 + rms / CALIB_SCALE)));

/* ---- dial + target grids (mirror the component) --------------------------- */
const MU_TARGETS = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
const SIG_TARGETS = [0.75, 1, 1.25, 1.5, 1.75];

/* =========================== test harness ================================= */
let failures = 0;
const approx = (a, b, tol, msg) => {
  const ok = Math.abs(a - b) <= tol;
  if (!ok) {
    console.error(`  ✗ ${msg}: got ${a}, expected ${b} (±${tol})`);
    failures++;
  }
  return ok;
};
const ok = (cond, msg) => {
  if (!cond) {
    console.error(`  ✗ ${msg}`);
    failures++;
  }
  return cond;
};

/* ---- 1. total area = 1 (direct fine-grid trapezoidal integration) --------- */
function integrate(mu, sig) {
  const A = mu - 12 * sig,
    B = mu + 12 * sig,
    N = 240000;
  const h = (B - A) / N;
  let s = 0.5 * (pdf(A, mu, sig) + pdf(B, mu, sig));
  for (let i = 1; i < N; i++) s += pdf(A + i * h, mu, sig);
  return s * h;
}
console.log('1) pdf integrates to 1');
for (const mu of [-2, 0, 1.5])
  for (const sig of [0.5, 1, 2])
    approx(integrate(mu, sig), 1, 1e-6, `∫ N(${mu},${sig}) dx`);

/* ---- 2. peak location + height + symmetry --------------------------------- */
console.log('2) peak at μ, height 1/(σ√2π), symmetric');
for (const mu of [-1, 0, 2])
  for (const sig of [0.5, 1, 1.5]) {
    approx(pdf(mu, mu, sig), peakHeight(sig), 1e-12, `peak height @μ (σ=${sig})`);
    // peak is a strict maximum: neighbours are lower
    ok(
      pdf(mu, mu, sig) > pdf(mu + 0.01, mu, sig) &&
        pdf(mu, mu, sig) > pdf(mu - 0.01, mu, sig),
      `peak is the max (μ=${mu},σ=${sig})`
    );
    for (const t of [0.3, 1, 2.2])
      approx(
        pdf(mu + t, mu, sig),
        pdf(mu - t, mu, sig),
        1e-14,
        `symmetry f(μ+${t})=f(μ−${t})`
      );
  }

/* ---- 3. inflection points exactly at μ ± σ -------------------------------- */
// f''(x) = pdf(x)·((x−μ)² − σ²)/σ⁴  ⇒ zero exactly at x = μ ± σ, sign flips.
console.log("3) inflection points at μ ± σ (f''=0, curvature flips)");
const f2 = (x, mu, sig) =>
  (pdf(x, mu, sig) * ((x - mu) ** 2 - sig * sig)) / sig ** 4;
for (const mu of [-1, 0, 1.5])
  for (const sig of [0.5, 1, 1.75]) {
    approx(f2(mu + sig, mu, sig), 0, 1e-12, `f''(μ+σ)=0 (μ=${mu},σ=${sig})`);
    approx(f2(mu - sig, mu, sig), 0, 1e-12, `f''(μ−σ)=0 (μ=${mu},σ=${sig})`);
    // concave down just inside, concave up just outside
    ok(f2(mu, mu, sig) < 0, `concave down at centre (μ=${mu},σ=${sig})`);
    ok(
      f2(mu + sig + 0.05, mu, sig) > 0 && f2(mu + sig - 0.05, mu, sig) < 0,
      `curvature flips at μ+σ (μ=${mu},σ=${sig})`
    );
  }
// numeric second-derivative cross-check of the closed form
console.log("   numeric f'' cross-check");
for (const mu of [0, 1]) {
  const sig = 1,
    hh = 1e-3;
  for (const x of [mu - sig, mu, mu + sig]) {
    const num =
      (pdf(x + hh, mu, sig) - 2 * pdf(x, mu, sig) + pdf(x - hh, mu, sig)) /
      (hh * hh);
    approx(num, f2(x, mu, sig), 1e-4, `numeric f''(${x}) vs closed form`);
  }
}

/* ---- 4. erf / Φ accuracy --------------------------------------------------- */
console.log('4) erf / Φ accuracy');
approx(erf(0), 0, 1e-9, 'erf(0)');
approx(erf(1), 0.842700792949715, 2e-7, 'erf(1)');
approx(erf(2), 0.995322265018953, 2e-7, 'erf(2)');
approx(Phi(0), 0.5, 1e-9, 'Φ(0)');
approx(Phi(1.959963985), 0.975, 1e-6, 'Φ(1.96)=0.975');
approx(Phi(-1.959963985), 0.025, 1e-6, 'Φ(−1.96)=0.025');
approx(Phi(1.644853627), 0.95, 1e-6, 'Φ(1.645)=0.95');

/* ---- 5. THE CENTREPIECE: 68–95–99.7 rule + invariance --------------------- */
console.log('5) empirical rule 68–95–99.7 and its invariance');
approx(bandArea(1), 0.6826894921, 2e-7, 'area within ±1σ = 68.27%');
approx(bandArea(2), 0.9544997361, 2e-7, 'area within ±2σ = 95.45%');
approx(bandArea(3), 0.9973002039, 2e-7, 'area within ±3σ = 99.73%');
// invariance: computed directly on N(μ,σ), for EVERY dial combo, must equal bandArea(k)
let invMaxErr = 0;
for (let mu = -2; mu <= 2 + 1e-9; mu += 0.5)
  for (let sig = 0.5; sig <= 2 + 1e-9; sig += 0.25)
    for (const k of [1, 2, 3]) {
      const a = areaBetween(mu - k * sig, mu + k * sig, mu, sig);
      invMaxErr = Math.max(invMaxErr, Math.abs(a - bandArea(k)));
    }
approx(invMaxErr, 0, 1e-9, 'within ±kσ area is invariant across all (μ,σ)');
// tails: area beyond ±1σ ≈ 31.7%, beyond ±2σ ≈ 4.55%, beyond ±3σ ≈ 0.27%
approx(1 - bandArea(1), 0.3173105079, 2e-7, 'tails beyond ±1σ');
approx(1 - bandArea(2), 0.0455002639, 2e-7, 'tails beyond ±2σ');
// one-sided halves: 34.13% between μ and μ+σ
approx(bandArea(1) / 2, 0.341344746, 2e-7, 'μ..μ+σ = 34.13%');

/* ---- 6. areaBetween == direct integration --------------------------------- */
console.log('6) areaBetween matches direct integration');
function integrateAB(a, b, mu, sig) {
  const N = 60000,
    h = (b - a) / N;
  let s = 0.5 * (pdf(a, mu, sig) + pdf(b, mu, sig));
  for (let i = 1; i < N; i++) s += pdf(a + i * h, mu, sig);
  return s * h;
}
for (const [a, b, mu, sig] of [
  [-1, 1, 0, 1],
  [0, 2, 0.5, 1.25],
  [-3, -0.5, -1, 1.5],
  [1, 4, 1, 0.75],
])
  approx(
    areaBetween(a, b, mu, sig),
    integrateAB(a, b, mu, sig),
    1e-6,
    `P(${a}≤X≤${b}) N(${mu},${sig})`
  );

/* ---- 7. calibration well-posedness ---------------------------------------- */
console.log('7) calibration: exact→100%/CALIBRATED, neighbours below stamp');
approx(rmsError({ mu: 0, sig: 1 }, { mu: 0, sig: 1 }), 0, 1e-15, 'exact RMS=0');
approx(matchPercent(0), 100, 1e-9, 'exact match = 100%');
ok(0 < MATCH_RMS, 'MATCH_RMS positive');

// Sweep every target; for each, confirm the exact dial setting stamps and the
// closest single-step neighbour does NOT. This guarantees no false CALIBRATED.
let worstExactRms = 0;
let closestNeighbourPct = 0;
let closestNeighbourRms = Infinity;
let neighbourStamped = 0;
const DIAL_MU = [];
for (let v = -2; v <= 2 + 1e-9; v += 0.5) DIAL_MU.push(+v.toFixed(2));
const DIAL_SIG = [];
for (let v = 0.5; v <= 2 + 1e-9; v += 0.25) DIAL_SIG.push(+v.toFixed(2));

for (const mu of MU_TARGETS)
  for (const sig of SIG_TARGETS) {
    const t = { mu, sig };
    const exactRms = rmsError({ mu, sig }, t);
    worstExactRms = Math.max(worstExactRms, exactRms);
    if (!(matchPercent(exactRms) > 99.9)) {
      console.error(`  ✗ exact ${mu},${sig} only ${matchPercent(exactRms).toFixed(1)}%`);
      failures++;
    }
    if (!(exactRms < MATCH_RMS)) {
      console.error(`  ✗ exact ${mu},${sig} not below MATCH_RMS`);
      failures++;
    }
    // examine the 8 grid neighbours (±1 step in μ and/or σ)
    for (const dmu of [-0.5, 0, 0.5])
      for (const dsig of [-0.25, 0, 0.25]) {
        if (dmu === 0 && dsig === 0) continue;
        const nmu = +(mu + dmu).toFixed(2),
          nsig = +(sig + dsig).toFixed(2);
        if (!DIAL_MU.includes(nmu) || !DIAL_SIG.includes(nsig)) continue;
        const r = rmsError({ mu: nmu, sig: nsig }, t);
        if (r < closestNeighbourRms) {
          closestNeighbourRms = r;
          closestNeighbourPct = matchPercent(r);
        }
        if (r < MATCH_RMS) neighbourStamped++;
      }
  }
console.log(`   worst exact RMS         = ${worstExactRms.toExponential(2)}`);
console.log(`   closest neighbour RMS   = ${closestNeighbourRms.toFixed(5)}`);
console.log(`   closest neighbour match = ${closestNeighbourPct.toFixed(1)}%`);
console.log(`   neighbours that stamped = ${neighbourStamped}`);
ok(neighbourStamped === 0, 'no wrong neighbour ever stamps CALIBRATED');
ok(worstExactRms < MATCH_RMS, 'every exact target stamps');
ok(closestNeighbourRms > MATCH_RMS * 3, 'clear RMS gap between exact and nearest');

/* meter feel: report where each single-step neighbour lands */
console.log('   (meter feel — one dial step off, from the μ=0,σ=1 answer:)');
for (const [dm, ds, lbl] of [
  [0.5, 0, 'μ off by +0.5'],
  [0, 0.25, 'σ off by +0.25'],
  [0, -0.25, 'σ off by −0.25'],
  [0.5, 0.25, 'both off'],
]) {
  const r = rmsError({ mu: dm, sig: 1 + ds }, { mu: 0, sig: 1 });
  console.log(`     ${lbl}: ${matchPercent(r).toFixed(1)}%`);
}

/* =========================== summary ====================================== */
console.log(
  '\n' +
    (failures === 0
      ? '✅ ALL CHECKS PASSED — normal-distribution math + calibration verified.'
      : `❌ ${failures} CHECK(S) FAILED.`)
);
process.exit(failures === 0 ? 1 && 0 : 1);
