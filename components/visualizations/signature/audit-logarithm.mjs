/* Numeric audit for LogarithmLab — mirrors the lab's math exactly.
   Run: node audit-logarithm.mjs
   Checks: model & famous values, the domain wall (NaN for x ≤ h), the two
   anchor points, the x-intercept, the inverse round-trip (log undoes exp),
   and calibration (exact target -> RMS 0 -> CALIBRATED; smallest single-step
   miss well above threshold; base-chip reachability). */

const WORLD = { xmin: -4, xmax: 10, ymin: -4, ymax: 10 };
const START = { b: 2, h: 0, a: 1, k: 0 };
const MATCH_RMS = 0.05;
const E = Math.E;

/* ---- model (identical to the lab) ---- */
function model(x, q) {
  const t = x - q.h;
  if (!(t > 0)) return NaN;
  return (q.a * Math.log(t)) / Math.log(q.b) + q.k;
}
function inverse(x, q) {
  if (q.a === 0) return NaN;
  return q.h + Math.pow(q.b, (x - q.k) / q.a);
}
function anchors(q) {
  return [
    [q.h + 1, q.k],
    [q.h + q.b, q.a + q.k],
  ];
}
function xIntercept(q) {
  if (q.a === 0) return null;
  return q.h + Math.pow(q.b, -q.k / q.a);
}
function rmsError(u, t) {
  const N = 320;
  const CAP = 4;
  let s = 0;
  let cnt = 0;
  for (let i = 0; i <= N; i++) {
    const x = WORLD.xmin + ((WORLD.xmax - WORLD.xmin) * i) / N;
    const yu = model(x, u);
    const yt = model(x, t);
    const fu = isFinite(yu);
    const ft = isFinite(yt);
    if (!fu && !ft) continue;
    let d;
    if (fu && ft) d = yu - yt;
    else d = CAP;
    if (d > CAP) d = CAP;
    else if (d < -CAP) d = -CAP;
    s += d * d;
    cnt++;
  }
  return cnt ? Math.sqrt(s / cnt) : CAP;
}
const matchPercent = (rms) => Math.max(0, Math.min(100, 100 / (1 + rms / 0.9)));

/* ---- test harness ---- */
let pass = 0;
let fail = 0;
const bad = [];
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    bad.push(msg);
  }
};
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

/* emulate range-input serialization (float truncation) */
const trunc = (v) => parseFloat(v.toPrecision(15));

/* ---------------------------------------------------------------------------
   1. Famous values — a logarithm IS an exponent.
   ------------------------------------------------------------------------- */
ok(near(model(8, { b: 2, h: 0, a: 1, k: 0 }), 3), 'log2(8) = 3');
ok(near(model(1, { b: 2, h: 0, a: 1, k: 0 }), 0), 'log2(1) = 0');
ok(near(model(2, { b: 2, h: 0, a: 1, k: 0 }), 1), 'log2(2) = 1');
ok(near(model(16, { b: 2, h: 0, a: 1, k: 0 }), 4), 'log2(16) = 4');
ok(near(model(100, { b: 10, h: 0, a: 1, k: 0 }), 2), 'log10(100) = 2');
ok(near(model(1000, { b: 10, h: 0, a: 1, k: 0 }), 3), 'log10(1000) = 3');
ok(near(model(E, { b: E, h: 0, a: 1, k: 0 }), 1), 'ln(e) = 1');
ok(near(model(E * E, { b: E, h: 0, a: 1, k: 0 }), 2), 'ln(e^2) = 2');
ok(near(model(1, { b: E, h: 0, a: 1, k: 0 }), 0), 'ln(1) = 0');
// (1,0) is universal across every base
for (const b of [2, 2.5, E, 3, 5, 7.25, 10]) ok(near(model(1, { b, h: 0, a: 1, k: 0 }), 0), `log_${b}(1)=0`);

/* ---------------------------------------------------------------------------
   2. The domain wall — NaN at and left of the asymptote x = h.
   ------------------------------------------------------------------------- */
for (const h of [-3, -1, 0, 2, 4]) {
  const q = { b: 2, h, a: 1, k: 0 };
  ok(Number.isNaN(model(h, q)), `undefined AT asymptote x=h=${h}`);
  ok(Number.isNaN(model(h - 0.5, q)), `undefined left of asymptote h=${h}`);
  ok(isFinite(model(h + 0.5, q)), `defined right of asymptote h=${h}`);
  ok(Number.isNaN(model(h - 1e-9, q)), `undefined a hair left of h=${h}`);
}

/* ---------------------------------------------------------------------------
   Reachable dial grids.
   ------------------------------------------------------------------------- */
const bGrid = [];
for (let v = 2; v <= 10 + 1e-9; v += 0.25) bGrid.push(trunc(v));
bGrid.push(E); // via the chip
const aGrid = [];
for (let v = -3; v <= 3 + 1e-9; v += 0.5) if (Math.abs(v) > 1e-9) aGrid.push(trunc(v));
const hGrid = [];
for (let v = -4; v <= 4 + 1e-9; v += 0.5) hGrid.push(trunc(v));
const kGrid = [];
for (let v = -4; v <= 4 + 1e-9; v += 0.5) kGrid.push(trunc(v));

/* ---------------------------------------------------------------------------
   3. Anchor points (h+1, k) and (h+b, a+k) — exact, for every dial combo.
   4. x-intercept: model(xIntercept) = 0.
   ------------------------------------------------------------------------- */
let anchorChecks = 0;
let xiChecks = 0;
let xiWorst = 0;
// sample the grids (full product is large; step through a representative slice)
for (const b of [2, 2.5, E, 3, 5, 7.5, 10]) {
  for (const a of aGrid) {
    for (const h of [-4, -2, -0.5, 0, 1.5, 4]) {
      for (const k of [-4, -1.5, 0, 2.5, 4]) {
        const q = { b, h, a, k };
        const [p1, p2] = anchors(q);
        ok(near(model(p1[0], q), p1[1], 1e-9), `anchor (h+1,k) b=${b} a=${a} h=${h} k=${k}`);
        ok(near(model(p2[0], q), p2[1], 1e-9), `anchor (h+b,a+k) b=${b} a=${a} h=${h} k=${k}`);
        anchorChecks += 2;
        const xi = xIntercept(q);
        if (xi != null && isFinite(xi)) {
          const y0 = model(xi, q);
          if (isFinite(y0)) {
            ok(near(y0, 0, 1e-7), `x-intercept model=0 b=${b} a=${a} h=${h} k=${k}`);
            xiWorst = Math.max(xiWorst, Math.abs(y0));
            xiChecks++;
          }
        }
      }
    }
  }
}

/* ---------------------------------------------------------------------------
   5. Inverse round-trip: model(inverse(x)) = x  and  inverse(model(x)) = x.
      This is the mathematical statement that log and exp undo each other.
   ------------------------------------------------------------------------- */
let rtChecks = 0;
let rtWorst = 0;
for (const b of [2, E, 3, 10]) {
  for (const a of [-2, -1, 1, 2]) {
    for (const h of [-2, 0, 1.5]) {
      for (const k of [-1.5, 0, 2]) {
        const q = { b, h, a, k };
        // model(inverse(x)) = x  (keep x modest so b^((x-k)/a) doesn't overflow)
        for (const x of [-2, -0.5, 0, 1, 2.5, 3.5]) {
          const back = model(inverse(x, q), q);
          if (isFinite(back)) {
            ok(near(back, x, 1e-6), `model(inverse(${x})) = ${x} b=${b} a=${a} h=${h} k=${k}`);
            rtWorst = Math.max(rtWorst, Math.abs(back - x));
            rtChecks++;
          }
        }
        // inverse(model(x)) = x for x in the domain (x > h)
        for (const dx of [0.3, 1, 3, 6]) {
          const x = h + dx;
          const fwd = inverse(model(x, q), q);
          if (isFinite(fwd)) {
            ok(near(fwd, x, 1e-6), `inverse(model(${x})) = ${x} b=${b} a=${a} h=${h} k=${k}`);
            rtWorst = Math.max(rtWorst, Math.abs(fwd - x));
            rtChecks++;
          }
        }
      }
    }
  }
}

/* ---------------------------------------------------------------------------
   6. Calibration: exact target -> RMS 0 -> CALIBRATED, over the target grid.
      Targets are exactly the ones makeTarget can produce.
   ------------------------------------------------------------------------- */
const bs = [2, E, 10];
const as = [-2, -1, 1, 2];
const hs = [-2, -1, 0, 1, 2];
const ks = [-2, -1, 0, 1, 2];
let worstExactRms = 0;
let exactCount = 0;
for (const b of bs)
  for (const a of as)
    for (const h of hs)
      for (const k of ks) {
        const t = { b, a, h, k };
        const r = rmsError(t, t);
        if (r > worstExactRms) worstExactRms = r;
        ok(r < MATCH_RMS, `exact target CALIBRATED b=${b} a=${a} h=${h} k=${k} (rms ${r})`);
        exactCount++;
      }

/* ---------------------------------------------------------------------------
   7. Smallest single-step miss stays well above the CALIBRATED threshold —
      so you cannot fluke a calibration by being one notch off on any dial.
   ------------------------------------------------------------------------- */
let minMissRms = Infinity;
let minMissWhat = null;
for (const b of bs)
  for (const a of as)
    for (const h of hs)
      for (const k of ks) {
        const t = { b, a, h, k };
        const candidates = [
          { ...t, a: trunc(a + 0.5) },
          { ...t, a: trunc(a - 0.5) },
          { ...t, h: trunc(h + 0.5) },
          { ...t, h: trunc(h - 0.5) },
          { ...t, k: trunc(k + 0.5) },
          { ...t, k: trunc(k - 0.5) },
        ];
        for (const c of candidates) {
          if (Math.abs(c.a) < 1e-9) continue; // a=0 isn't a logarithm
          const r = rmsError(c, t);
          if (r < minMissRms) {
            minMissRms = r;
            minMissWhat = { t, c };
          }
        }
      }
ok(minMissRms > MATCH_RMS * 3, `smallest single-step miss (${minMissRms.toFixed(3)}) safely above threshold`);

/* wrong base is never a near-miss (base must be dialed exactly, via a chip for e) */
let minBaseMiss = Infinity;
for (const a of as)
  for (const h of hs)
    for (const k of ks) {
      const t = { b: 2, a, h, k };
      for (const b2 of [E, 10]) {
        const r = rmsError({ ...t, b: b2 }, t);
        minBaseMiss = Math.min(minBaseMiss, r);
      }
    }
ok(minBaseMiss > MATCH_RMS * 3, `wrong base never a near-miss (min ${minBaseMiss.toFixed(3)})`);

/* ---------------------------------------------------------------------------
   8. Meter feel — a few representative misses, for the two-measurement tuning.
   ------------------------------------------------------------------------- */
const base = { b: 2, a: 1, h: 0, k: 0 };
const feel = [
  ['exact', rmsError(base, base)],
  ['Δk=0.5', rmsError({ ...base, k: 0.5 }, base)],
  ['Δk=1', rmsError({ ...base, k: 1 }, base)],
  ['Δh=0.5', rmsError({ ...base, h: 0.5 }, base)],
  ['Δa=0.5', rmsError({ ...base, a: 1.5 }, base)],
  ['a-flip', rmsError({ ...base, a: -1 }, base)],
  ['base 2→10', rmsError({ ...base, b: 10 }, base)],
];

console.log('LogarithmLab audit');
console.log('==================');
console.log(`anchor-point checks     : ${anchorChecks}`);
console.log(`x-intercept checks      : ${xiChecks}   (worst |model| ${xiWorst.toExponential(2)})`);
console.log(`inverse round-trips     : ${rtChecks}   (worst |err| ${rtWorst.toExponential(2)})`);
console.log(`exact-target grid       : ${exactCount}   (worst RMS ${worstExactRms.toExponential(2)}, MATCH_RMS ${MATCH_RMS})`);
console.log(`smallest single-step miss RMS : ${minMissRms.toFixed(3)}  -> match ${matchPercent(minMissRms).toFixed(0)}%`);
console.log(`  (${JSON.stringify(minMissWhat.t)} vs ${JSON.stringify(minMissWhat.c)})`);
console.log(`wrong-base min RMS      : ${minBaseMiss.toFixed(3)}  -> match ${matchPercent(minBaseMiss).toFixed(0)}%`);
console.log('\nmeter feel:');
for (const [name, r] of feel) console.log(`  ${name.padEnd(11)} rms ${r.toFixed(3)}  -> ${matchPercent(r).toFixed(0)}%`);
console.log('\n------------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.slice(0, 25).forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
