/* ============================================================================
   audit-geometricmodeling.mjs — the numeric audit for GeometricModelingLab.jsx
   (G-MG.A.1 / G-MG.A.2 / G-MG.A.3).
   Run:  node audit-geometricmodeling.mjs

   Slices the pure model out of GeometricModelingLab.jsx (MODEL:START/END) and
   evaluates it, so the code under test is the code that ships.

   What it proves, exhaustively over every design the dials can reach:
     MEASURES     V = π·r²h and S = 2πr² + 2πrh are held as exact whole-number
                  coefficients of π — never a decimal — and the base area is r².
     ERROR        the model-vs-object gap is reported with the right sign, is
                  zero exactly when the model matches, and the percentage agrees
                  with the exact coefficients.
     DENSITY      mass = ρ·V in coefficients, and the floor load ρ·h is
                  INDEPENDENT OF r — the π cancellation the step turns on,
                  checked across every radius.
     DESIGN       designs(V) returns every whole-number tank of exactly that
                  capacity and no others (checked against an independent scan),
                  sorted cheapest-first, with the surface recomputed from the
                  shipped formula.
     OPTIMUM      bestDesign really is the minimum over the whole legal set —
                  no design in range is cheaper.
     CALIBRATION  every posted requirement has ≥2 legal designs and a STRICT
                  winner, so "minimise" is never vacuous; the stamp needs BOTH
                  the exact capacity and the minimal metal, and a right-sized
                  but wasteful tank does NOT stamp.
     DISTINCTNESS no derivative test (that is OptimizationLab) and no
                  re-derivation of the cylinder formula (that is CylinderLab).
   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./GeometricModelingLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in GeometricModelingLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'R_RANGE', 'H_RANGE', 'RHO_RANGE', 'volCoef', 'surfCoef', 'baseCoef', 'OBJECT',
  'modelError', 'errorPercent', 'massCoef', 'massPerFloor', 'designs', 'bestDesign',
  'isPosable', 'DIALS', 'START', 'makeTarget', 'isCalibrated', 'matchPercent', 'STEPS',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  const RS = [], HS = [];
  for (let r = M.R_RANGE.min; r <= M.R_RANGE.max; r++) RS.push(r);
  for (let h = M.H_RANGE.min; h <= M.H_RANGE.max; h++) HS.push(h);

  /* === 1. MEASURES — exact integer coefficients of π ===================== */
  for (const r of RS) for (const h of HS) {
    const v = M.volCoef(r, h), s = M.surfCoef(r, h);
    ok(v === r * r * h, `V coefficient is r²h (${r},${h})`);
    ok(s === 2 * r * r + 2 * r * h, `S coefficient is 2r² + 2rh (${r},${h})`);
    ok(Number.isInteger(v) && Number.isInteger(s), `coefficients stay integers (${r},${h})`);
    ok(v > 0 && s > 0, `a real tank has positive capacity and surface (${r},${h})`);
    ok(M.baseCoef(r) === r * r, `base area coefficient is r² (${r})`);
    // the cylinder is closed: the surface must exceed the two discs alone
    ok(s > 2 * M.baseCoef(r), `surface counts the wall as well as the two ends (${r},${h})`);
  }

  /* === 2. ERROR — signed, zero only on a match, percentage consistent ==== */
  for (const r of RS) for (const h of HS) {
    const e = M.modelError(r, h, M.OBJECT.trueVolCoef);
    ok(e.model === M.volCoef(r, h), 'the error reports the model it measured');
    ok(e.diff === e.model - M.OBJECT.trueVolCoef, 'the gap is model − true, signed');
    ok(e.absDiff === Math.abs(e.diff), 'the magnitude matches the signed gap');
    ok((e.diff === 0) === (M.volCoef(r, h) === M.OBJECT.trueVolCoef), 'zero gap exactly on a match');
    const p = M.errorPercent(r, h, M.OBJECT.trueVolCoef);
    ok(Math.abs(p - (100 * e.diff) / M.OBJECT.trueVolCoef) < 1e-9, 'the percentage agrees with the exact gap');
    ok(Math.sign(p) === Math.sign(e.diff), 'the percentage carries the same sign as the gap');
  }
  ok(M.errorPercent(1, 1, 0) === null, 'a zero true capacity is refused, not divided by');

  /* === 3. DENSITY — mass in coefficients, and the floor load loses r ===== */
  for (const r of RS) for (const h of HS) for (let rho = M.RHO_RANGE.min; rho <= M.RHO_RANGE.max; rho += 3) {
    ok(M.massCoef(r, h, rho) === rho * M.volCoef(r, h), `mass = ρ·V in coefficients (${r},${h},${rho})`);
    ok(M.massPerFloor(h, rho) === rho * h, `floor load is ρ·h (${h},${rho})`);
    // the cancellation, stated as the lab states it: mass / base = ρ·h, r-free
    ok(M.massCoef(r, h, rho) / M.baseCoef(r) === M.massPerFloor(h, rho),
      `mass ÷ base area = ρ·h, independent of r (r=${r},h=${h},ρ=${rho})`);
  }
  // the r-independence, said once more across every radius at fixed h, ρ
  for (const h of HS) {
    const vals = RS.map((r) => M.massCoef(r, h, 5) / M.baseCoef(r));
    ok(new Set(vals).size === 1, `floor load does not move with r (h=${h})`);
  }

  /* === 4. DESIGN — the legal set is exactly right, and sorted ============ */
  for (let V = 1; V <= 420; V++) {
    const ds = M.designs(V);
    // independent scan of the same space
    const want = [];
    for (const r of RS) for (const h of HS) if (M.volCoef(r, h) === V) want.push({ r, h });
    ok(ds.length === want.length, `designs(${V}) finds every legal tank (${ds.length} vs ${want.length})`);
    for (const d of ds) {
      ok(M.volCoef(d.r, d.h) === V, `every listed design really holds ${V}π`);
      ok(d.surf === M.surfCoef(d.r, d.h), 'the listed metal is the shipped formula');
      ok(d.r >= M.R_RANGE.min && d.r <= M.R_RANGE.max, 'listed radius is on the dial');
      ok(d.h >= M.H_RANGE.min && d.h <= M.H_RANGE.max, 'listed height is on the dial');
    }
    for (let i = 1; i < ds.length; i++) ok(ds[i - 1].surf <= ds[i].surf, `designs(${V}) is cheapest-first`);
    /* === 5. OPTIMUM — nothing legal is cheaper than bestDesign ========== */
    const b = M.bestDesign(V);
    if (ds.length === 0) ok(b === null, `no legal design → bestDesign(${V}) is null`);
    else {
      ok(b !== null, `bestDesign(${V}) exists when designs do`);
      for (const d of want) ok(M.surfCoef(d.r, d.h) >= b.surf, `nothing legal beats the best (${V})`);
      ok(M.volCoef(b.r, b.h) === V, `the best design still meets the requirement (${V})`);
    }
    // posability is exactly "two or more designs with a strict winner"
    const wantPosable = ds.length >= 2 && ds[0].surf < ds[1].surf;
    ok(M.isPosable(V) === wantPosable, `isPosable(${V}) matches its own definition`);
  }

  /* === 6. CALIBRATION — never vacuous, and the stamp wants both halves === */
  {
    const rnd = lcg(20260725);
    let prev = null; const seen = new Set();
    for (let i = 0; i < 2500; i++) {
      const t = M.makeTarget(prev, rnd);
      ok(M.isPosable(t.required), `every posted requirement is posable (${t.required})`);
      ok(t.options >= 2, `a posted requirement has at least two designs (${t.required})`);
      ok(t.best && M.volCoef(t.best.r, t.best.h) === t.required, 'the posted best really holds the requirement');
      ok(t.best.surf === M.bestDesign(t.required).surf, 'the posted best is the cheapest');
      // the stamp
      ok(M.isCalibrated(t.best.r, t.best.h, t) === true, 'the stamp fires on the cheapest legal design');
      const others = M.designs(t.required).filter((d) => d.surf > t.best.surf);
      for (const d of others) {
        ok(M.isCalibrated(d.r, d.h, t) === false,
          `a right-sized but wasteful tank does NOT stamp (${d.r},${d.h} for ${t.required})`);
      }
      // a wrong capacity never stamps
      ok(M.isCalibrated(t.best.r, Math.min(M.H_RANGE.max, t.best.h + 1), t) === false,
        'a wrong capacity does not stamp');
      /* …and the hard version of the same claim: a tank whose METAL happens to
         equal the winner's but whose CAPACITY is wrong must also be refused.
         Without this the stamp could drop the capacity test and still pass. */
      for (const r of RS) for (const h of HS) {
        if (M.surfCoef(r, h) !== t.best.surf) continue;
        if (M.volCoef(r, h) === t.required) continue;
        ok(M.isCalibrated(r, h, t) === false,
          `same metal, wrong capacity does NOT stamp (${r},${h} for ${t.required})`);
      }
      // the meter
      const pBest = M.matchPercent(t.best.r, t.best.h, t);
      ok(pBest >= 99.999, 'the meter is full at the cheapest legal design');
      for (const d of others) {
        ok(M.matchPercent(d.r, d.h, t) < pBest, 'a wasteful design reads lower than the best');
        ok(M.matchPercent(d.r, d.h, t) >= 60, 'a right-sized design still reads at least 60');
      }
      seen.add(t.required);
      prev = t;
    }
    ok(seen.size >= 10, `requirements vary (${seen.size} distinct posted)`);
  }

  /* === 7. THE LESSON ==================================================== */
  {
    ok(M.STEPS.length >= 5, 'the lesson has at least five steps');
    ok(M.STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
    ok(M.STEPS[M.STEPS.length - 1].calib === true, 'the calibration is last');
    for (const s of M.STEPS) {
      ok(typeof s.title === 'string' && s.title.length > 0, 'every step is titled');
      ok(typeof s.body === 'string' && s.body.length > 40, `every step explains itself (${s.title})`);
      ok(Number.isInteger(s.unlock) && s.unlock >= 1 && s.unlock <= M.DIALS.length, `unlock is real (${s.title})`);
      if (!s.calib) {
        ok(Array.isArray(s.choices) && s.choices.length === 3, `three choices (${s.title})`);
        ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < 3, `answer indexes a choice (${s.title})`);
        ok(typeof s.feedback === 'string' && s.feedback.length > 40, `feedback explains (${s.title})`);
      }
    }
    ok(M.DIALS.length === 3, 'three dials: r, h and ρ');
    ok(M.volCoef(M.START.r, M.START.h) !== M.OBJECT.trueVolCoef,
      'the opening model does NOT match the object exactly — the error is the lesson');
    ok(M.OBJECT.trueVolCoef > 0, 'the object has a measured capacity to be wrong about');
  }

  /* === 8. DISTINCTNESS — no calculus, no re-derivation of the cylinder === */
  {
    // word boundaries on purpose: the silo genuinely has "a sloped floor", and
    // describing the OBJECT must not trip a check aimed at the METHOD.
    ok(!/\bderivative\b|\bslope\b|A'\(|dV\/d/.test(MODEL_BODY), 'no derivative test — that is OptimizationLab');
    ok(!/Math\.PI/.test(MODEL_BODY), 'π is never evaluated — every quantity is an exact coefficient');
    for (const own of ['designs', 'massPerFloor', 'modelError', 'bestDesign']) {
      ok(MODEL_BODY.includes(own), `the model names its own idea: ${own}`);
    }
  }

  return { checks, failures };
}

const MUTANTS = [
  ['the capacity formula loses the square (V = rh)',
    'const volCoef = (r, h) => r * r * h;', 'const volCoef = (r, h) => r * h;'],
  ['the surface forgets the two end discs',
    'const surfCoef = (r, h) => 2 * r * r + 2 * r * h;', 'const surfCoef = (r, h) => 2 * r * h;'],
  ['the floor load keeps a radius in it',
    'const massPerFloor = (h, rho) => rho * h;', 'const massPerFloor = (h, rho) => rho * h * 2;'],
  ['mass stops scaling with density',
    'const massCoef = (r, h, rho) => rho * volCoef(r, h);', 'const massCoef = (r, h, rho) => volCoef(r, h);'],
  ['the design search accepts tanks of the wrong capacity',
    'if (requiredVolCoef % rr !== 0) continue;', 'if (false) continue;'],
  ['the design list stops sorting cheapest-first',
    'return out.sort((a, b) => a.surf - b.surf || a.r - b.r);', 'return out;'],
  ['bestDesign returns the most expensive design',
    'return all.length ? all[0] : null;', 'return all.length ? all[all.length - 1] : null;'],
  ['the stamp drops the "least metal" half',
    'return volCoef(r, h) === target.required && surfCoef(r, h) === target.best.surf;',
    'return volCoef(r, h) === target.required;'],
  ['the stamp drops the capacity half',
    'return volCoef(r, h) === target.required && surfCoef(r, h) === target.best.surf;',
    'return surfCoef(r, h) === target.best.surf;'],
  ['posable stops requiring a strict winner (minimise becomes vacuous)',
    'return all.length >= 2 && all[0].surf < all[1].surf;', 'return all.length >= 1;'],
  ['the error gap loses its sign',
    'const diff = model - trueCoef;', 'const diff = Math.abs(model - trueCoef);'],
];

function mutationTest() {
  const survivors = [];
  for (const [name, find, replace] of MUTANTS) {
    if (!MODEL_BODY.includes(find)) { survivors.push(`${name} — STALE ANCHOR`); continue; }
    let caught = false;
    try { caught = runSuite(build(MODEL_BODY.replace(find, replace))).failures.length > 0; }
    catch { caught = true; }
    if (!caught) survivors.push(name);
  }
  return survivors;
}

const M = build(MODEL_BODY);
const { checks, failures } = runSuite(M);
console.log('audit-geometricmodeling — GeometricModelingLab.jsx  (sliced, not mirrored)');
console.log('─'.repeat(64));
console.log(`model sliced from the shipped component: ${MODEL_BODY.split('\n').length} lines`);
console.log(`checks run: ${checks.toLocaleString()}`);
console.log(`failures:   ${failures.length}`);
for (const f of failures.slice(0, 20)) console.log('  ✗ ' + f);
console.log('─'.repeat(64));
console.log(`mutation test: ${MUTANTS.length} deliberate defects injected…`);
const survivors = mutationTest();
if (survivors.length === 0) console.log(`all ${MUTANTS.length} caught — the suite has teeth.`);
else { console.log(`${survivors.length} SURVIVED:`); for (const s of survivors) console.log('  ⚠ ' + s); }
console.log('─'.repeat(64));
const pass = failures.length === 0 && survivors.length === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
