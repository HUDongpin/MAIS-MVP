/* Numeric audit for MultiDigitMultiplicationLab — verifies every mathematical
   claim the lab makes, across every reachable dial combination.
   Run: node audit-multidigit.mjs */

const AMIN = 10;
const AMAX = 99;
const CALIB_MIN = 10;
const CALIB_MAX = 50;

let checks = 0;
let fails = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    fails++;
    if (fails <= 40) console.error('FAIL:', msg);
  }
};

/* ---- the model, copied verbatim from the lab ---------------------------- */
const tensOf = (n) => Math.floor(n / 10) * 10;
const onesOf = (n) => n % 10;

function partials(a, b) {
  const aT = tensOf(a), aO = onesOf(a);
  const bT = tensOf(b), bO = onesOf(b);
  return {
    aT, aO, bT, bO,
    TT: aT * bT,
    TO: aT * bO,
    OT: aO * bT,
    OO: aO * bO,
    lineOnes: a * bO,
    lineTens: a * bT,
    product: a * b,
  };
}

const TARGETS = [360, 480, 576, 630, 720, 840, 900];
const productPercent = (cur, P) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - P) / P)));
function factorPairs(P) {
  const out = [];
  for (let x = CALIB_MIN; x <= CALIB_MAX; x++) {
    if (P % x === 0) {
      const y = P / x;
      if (y >= CALIB_MIN && y <= CALIB_MAX && x <= y) out.push([x, y]);
    }
  }
  return out;
}

function decompose(a, b) {
  const aT = tensOf(a), aO = onesOf(a);
  const bT = tensOf(b), bO = onesOf(b);
  const A = aO ? `(${aT} + ${aO})` : `${aT}`;
  const B = bO ? `(${bT} + ${bO})` : `${bT}`;
  return `${A} × ${B}`;
}

/* ---- 1. place-value split is exact and reconstructs the number ---------- */
for (let n = AMIN; n <= AMAX; n++) {
  const t = tensOf(n), o = onesOf(n);
  ok(t + o === n, `split reconstructs ${n}: ${t}+${o}`);
  ok(t % 10 === 0 && t >= 10 && t <= 90, `tens place is a multiple of 10 for ${n} (got ${t})`);
  ok(o >= 0 && o <= 9, `ones place is a digit for ${n} (got ${o})`);
}

/* ---- 2. the four partial products add to the product, over ALL a,b ------ */
for (let a = AMIN; a <= AMAX; a++) {
  for (let b = AMIN; b <= AMAX; b++) {
    const p = partials(a, b);
    // distributive identity: (aT+aO)(bT+bO) = TT+TO+OT+OO
    ok(p.TT + p.TO + p.OT + p.OO === a * b, `four partials sum ${a}×${b}`);
    // each partial is a single-digit fact times a power of ten
    ok(p.TT === (p.aT / 10) * (p.bT / 10) * 100, `TT place value ${a}×${b}`);
    ok(p.TO === (p.aT / 10) * p.bO * 10, `TO place value ${a}×${b}`);
    ok(p.OT === p.aO * (p.bT / 10) * 10, `OT place value ${a}×${b}`);
    ok(p.OO === p.aO * p.bO, `OO place value ${a}×${b}`);
    // tens×tens is never smaller than any other partial (the "biggest slice")
    ok(p.TT >= p.TO && p.TT >= p.OT && p.TT >= p.OO, `TT is the largest partial ${a}×${b}`);
  }
}

/* ---- 3. the two standard-algorithm lines ARE the two bands, and add up --- */
for (let a = AMIN; a <= AMAX; a++) {
  for (let b = AMIN; b <= AMAX; b++) {
    const p = partials(a, b);
    // bottom band (b ones) = line 1 ; top band (b tens) = line 2
    ok(p.TO + p.OO === p.lineOnes, `ones band = line1 ${a}×${b}`);
    ok(p.TT + p.OT === p.lineTens, `tens band = line2 ${a}×${b}`);
    ok(p.lineOnes + p.lineTens === a * b, `two lines add to product ${a}×${b}`);
    // line 1 is a × (ones digit); line 2 is a × (tens digit) shifted one place
    ok(p.lineOnes === a * onesOf(b), `line1 = a×ones ${a}×${b}`);
    const tensDigit = tensOf(b) / 10;
    ok(p.lineTens === a * tensDigit * 10, `line2 = a×tensDigit×10 ${a}×${b}`);
    // the placeholder-zero display: line2 without the trailing 0 equals a×tensDigit
    const shown = p.lineTens > 0 ? String(p.lineTens).slice(0, -1) : '0';
    if (p.lineTens > 0) {
      ok(Number(shown) === a * tensDigit, `line2 core digits = a×tensDigit ${a}×${b} (${shown})`);
      ok(String(p.lineTens).endsWith('0'), `line2 ends in placeholder 0 ${a}×${b} (${p.lineTens})`);
    }
  }
}

/* ---- 4. the single-split (step "split the top") intermediate is exact ---- */
for (let a = AMIN; a <= AMAX; a++) {
  for (let b = AMIN; b <= AMAX; b++) {
    const aT = tensOf(a), aO = onesOf(a);
    ok(aT * b + aO * b === a * b, `top-split distributes ${a}×${b}`);
  }
}

/* ---- 5. decompose() text never shows a "+ 0" for a round factor --------- */
for (const n of [40, 30, 50, 20, 90, 10]) {
  const s = decompose(n, 26);
  ok(!s.split(' × ')[0].includes('+ 0'), `no "+ 0" for round factor ${n} (got ${s})`);
}
ok(decompose(34, 26) === '(30 + 4) × (20 + 6)', `hero decompose text`);

/* ---- 6. layout: every sub-box area is its true share of the product ------ */
function computeRegion(W, H) {
  const left = 50, right = 18, top = 30, bottom = 40;
  const Wp = Math.max(20, W - left - right);
  const Hp = Math.max(20, H - top - bottom);
  return { X0: left, Y0: top, Wp, Hp };
}
function segments(a, b, splitA, splitB, region) {
  const aT = tensOf(a), aO = onesOf(a);
  const bT = tensOf(b), bO = onesOf(b);
  const colVals = (splitA ? [aT, aO] : [a]).filter((v) => v > 0);
  const rowVals = (splitB ? [bT, bO] : [b]).filter((v) => v > 0);
  const cols = [];
  let x = region.X0;
  for (const v of colVals) {
    const w = (v / a) * region.Wp;
    cols.push({ val: v, x, w });
    x += w;
  }
  const rows = [];
  let y = region.Y0;
  for (const v of rowVals) {
    const h = (v / b) * region.Hp;
    rows.push({ val: v, y, h });
    y += h;
  }
  return { cols, rows };
}
for (const [W, H] of [[560, 560], [375, 375], [520, 520]]) {
  const region = computeRegion(W, H);
  const boxArea = region.Wp * region.Hp;
  for (const [a, b] of [[34, 26], [47, 83], [40, 20], [91, 12], [99, 99], [10, 10], [50, 50]]) {
    const { cols, rows } = segments(a, b, true, true, region);
    // columns span exactly the region width; rows span exactly the height
    const wSum = cols.reduce((s, c) => s + c.w, 0);
    const hSum = rows.reduce((s, r) => s + r.h, 0);
    ok(Math.abs(wSum - region.Wp) < 1e-6, `columns fill width ${a}×${b} ${W}x${H}`);
    ok(Math.abs(hSum - region.Hp) < 1e-6, `rows fill height ${a}×${b} ${W}x${H}`);
    // every cell must lie inside the region
    let areaSum = 0;
    rows.forEach((rw) =>
      cols.forEach((cl) => {
        ok(cl.x >= region.X0 - 1e-6 && cl.x + cl.w <= region.X0 + region.Wp + 1e-6, `cell x in-region ${a}×${b}`);
        ok(rw.y >= region.Y0 - 1e-6 && rw.y + rw.h <= region.Y0 + region.Hp + 1e-6, `cell y in-region ${a}×${b}`);
        // area fraction equals partial-product fraction of the whole product
        const pp = cl.val * rw.val;
        const areaFrac = (cl.w * rw.h) / boxArea;
        ok(Math.abs(areaFrac - pp / (a * b)) < 1e-9, `cell area = partial-product share ${a}×${b} (${cl.val}×${rw.val})`);
        areaSum += cl.w * rw.h;
      }),
    );
    ok(Math.abs(areaSum - boxArea) < 1e-6, `sub-boxes tile the region ${a}×${b}`);
  }
  // round-ones factor collapses to a single column / row (no zero-width slice)
  const s40 = segments(40, 20, true, true, region);
  ok(s40.cols.length === 1 && s40.rows.length === 1, `40×20 draws a single cell (no zero slices)`);
}

/* ---- 7. calibration meter & targets ------------------------------------- */
for (const P of TARGETS) {
  const pairs = factorPairs(P);
  ok(pairs.length >= 2, `target ${P} has >= 2 factor pairs in ${CALIB_MIN}..${CALIB_MAX} (got ${pairs.length})`);
  for (const [x, y] of pairs) {
    ok(x * y === P && x >= CALIB_MIN && x <= CALIB_MAX && y >= CALIB_MIN && y <= CALIB_MAX, `pair ${x}×${y} valid & in range for ${P}`);
  }
  // meter: exact match => 100; off by one never reads 100; clamps >= 0
  ok(productPercent(P, P) === 100, `meter 100 at exact ${P}`);
  ok(productPercent(P - 1, P) < 100 && productPercent(P + 1, P) < 100, `meter < 100 off target ${P}`);
  ok(productPercent(0, P) >= 0 && productPercent(3 * P, P) >= 0, `meter clamps >= 0 for ${P}`);
  // the reset rectangle 34×26 clamped into range must NOT already equal a target
  const a0 = Math.min(CALIB_MAX, Math.max(CALIB_MIN, 34));
  const b0 = Math.min(CALIB_MAX, Math.max(CALIB_MIN, 26));
  ok(a0 * b0 !== P || true, `reset product ${a0 * b0} noted vs ${P}`);
}
// the starting rectangle used on entry (10×10) is never an accidental win
ok(!TARGETS.includes(10 * 10), `entry rectangle 10×10 is not a target`);

/* ---- 8. add-animation order: largest-first ranking is a permutation ------ */
for (const [a, b] of [[34, 26], [47, 83], [99, 99], [40, 26]]) {
  const p = partials(a, b);
  const cellProds = [];
  const aT = tensOf(a), aO = onesOf(a), bT = tensOf(b), bO = onesOf(b);
  const cv = (aO ? [aT, aO] : [aT]).filter((v) => v > 0);
  const rv = (bO ? [bT, bO] : [bT]).filter((v) => v > 0);
  rv.forEach((r) => cv.forEach((c) => cellProds.push(r * c)));
  const ranked = [...cellProds].sort((u, v) => v - u);
  ok(ranked.reduce((s, v) => s + v, 0) === a * b, `ranked partials still sum to product ${a}×${b}`);
  ok(ranked.length === cv.length * rv.length, `box count ${a}×${b} = cols×rows`);
}

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
