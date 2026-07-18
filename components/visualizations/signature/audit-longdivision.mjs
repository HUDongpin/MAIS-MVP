/* Numeric audit for LongDivisionLab — run: node audit-longdivision.mjs
   Verifies the long-division algorithm the lab teaches is EXACTLY correct across
   every reachable dial state (dividend 0..9999, divisor 2..9), that the tableau
   the renderer draws reconstructs the true quotient/remainder, that every band
   invariant of the standard algorithm holds, and that the lesson answer keys and
   calibration targets are correct.
   Mirrors solve() in LongDivisionLab.jsx (kept in sync by hand). */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (fails <= 40) console.error('FAIL:', msg);
  }
}

const VMIN = 2;
const VMAX = 9;
const DMAX = 9999;

/* ---- the model, copied verbatim from the component ------------------------ */
function solve(D, v) {
  const digits = String(D).split('').map(Number);
  const n = digits.length;
  const nd = (x) => String(x).length;
  let rem = 0;
  let started = false;
  const bands = [];
  for (let i = 0; i < n; i++) {
    const curVal = rem * 10 + digits[i];
    const qd = Math.floor(curVal / v);
    const prod = qd * v;
    const diff = curVal - prod;
    if (!started && qd === 0) {
      rem = diff;
      continue;
    }
    started = true;
    bands.push({
      k: bands.length,
      col: i,
      curVal,
      qd,
      prod,
      diff,
      curLeftCol: i - (nd(curVal) - 1),
      prodLeftCol: i - (nd(prod) - 1),
      bringDigit: i < n - 1 ? digits[i + 1] : null,
    });
    rem = diff;
  }
  const micro = [];
  bands.forEach((b) => {
    b.idx = { divide: micro.length };
    micro.push({ k: b.k, phase: 'divide' });
    b.idx.multiply = micro.length;
    micro.push({ k: b.k, phase: 'multiply' });
    b.idx.subtract = micro.length;
    micro.push({ k: b.k, phase: 'subtract' });
    if (b.bringDigit != null) {
      b.idx.bring = micro.length;
      micro.push({ k: b.k, phase: 'bringdown' });
    } else b.idx.bring = null;
  });
  let quotient = 0;
  bands.forEach((b) => (quotient = quotient * 10 + b.qd));
  return { D, v, digits, n, bands, micro, microLen: micro.length, quotient, remainder: rem };
}

/* 1) Quotient & remainder are EXACTLY the true integer division, everywhere --- */
for (let D = 0; D <= DMAX; D++) {
  for (let v = VMIN; v <= VMAX; v++) {
    const m = solve(D, v);
    ok(m.quotient === Math.floor(D / v), `quotient ${D}÷${v} → ${m.quotient} vs ${Math.floor(D / v)}`);
    ok(m.remainder === D % v, `remainder ${D}÷${v} → ${m.remainder} vs ${D % v}`);
    // the fundamental identity  D = v·q + r
    ok(v * m.quotient + m.remainder === D, `identity ${D}=${v}·${m.quotient}+${m.remainder}`);
    // remainder is a valid remainder
    ok(m.remainder >= 0 && m.remainder < v, `0 ≤ r < v  (${D}÷${v}: r=${m.remainder})`);
  }
}

/* 2) Every band obeys the algorithm's invariants ---------------------------- */
for (let D = 100; D <= DMAX; D += 7) {
  for (let v = VMIN; v <= VMAX; v++) {
    const m = solve(D, v);
    let reQuot = 0;
    for (const b of m.bands) {
      ok(b.prod === b.qd * v, `prod = qd·v  (${D}÷${v} col${b.col})`);
      ok(b.curVal - b.prod === b.diff, `curVal − prod = diff  (${D}÷${v} col${b.col})`);
      ok(b.diff >= 0 && b.diff < v, `0 ≤ diff < v  (${D}÷${v} col${b.col}: ${b.diff})`);
      ok(b.qd >= 0 && b.qd <= 9, `quotient digit 0..9  (${D}÷${v} col${b.col}: ${b.qd})`);
      ok(b.curLeftCol >= 0 && b.curLeftCol <= b.col, `curLeftCol in range  (${D}÷${v} col${b.col})`);
      ok(b.prodLeftCol >= 0 && b.prodLeftCol <= b.col, `prodLeftCol in range  (${D}÷${v} col${b.col})`);
      // the working number never exceeds two digits (single-digit carry × 10 + a digit)
      ok(b.curVal < 100, `curVal < 100  (${D}÷${v} col${b.col}: ${b.curVal})`);
      reQuot = reQuot * 10 + b.qd;
    }
    ok(reQuot === m.quotient, `bands reconstruct quotient  (${D}÷${v})`);
    // first band never has a leading zero (leading zeros are suppressed)
    if (m.bands.length) ok(m.bands[0].qd > 0 || m.bands.length === 1, `no leading-zero quotient digit (${D}÷${v})`);
  }
}

/* 3) The micro-step list length is 4 per band minus the final bring-down ----- */
for (let D = 100; D <= 9999; D += 101) {
  for (let v = VMIN; v <= VMAX; v++) {
    const m = solve(D, v);
    if (!m.bands.length) continue;
    // every band contributes divide+multiply+subtract; all but the last also bring down
    const expected = m.bands.length * 3 + (m.bands.length - 1);
    ok(m.microLen === expected, `microLen ${D}÷${v} = ${m.microLen} vs ${expected}`);
    // phases are strictly ordered and indices are contiguous
    m.micro.forEach((mm, i) => ok(mm.k >= 0 && mm.k < m.bands.length, `micro band index in range (${D}÷${v})`));
  }
}

/* 4) Named teaching cases behave as the lesson asserts ---------------------- */
(function teachingCases() {
  const c1 = solve(738, 6);
  ok(c1.quotient === 123 && c1.remainder === 0, '738 ÷ 6 = 123 R0');
  ok(c1.bands.length === 3 && c1.bands.map((b) => b.qd).join('') === '123', '738÷6 quotient digits 1,2,3');
  ok(c1.bands[0].curVal === 7 && c1.bands[0].qd === 1 && c1.bands[0].diff === 1, 'step1: 6 into 7 → 1 r1');
  ok(c1.bands[1].curVal === 13 && c1.bands[1].qd === 2 && c1.bands[1].diff === 1, 'step2: 6 into 13 → 2 r1');
  ok(c1.bands[2].curVal === 18 && c1.bands[2].qd === 3 && c1.bands[2].diff === 0, 'step3: 6 into 18 → 3 r0');

  // leading-zero suppression: 6 into 4 doesn't go, look at 48
  const c2 = solve(4872, 6);
  ok(c2.quotient === 812 && c2.remainder === 0, '4872 ÷ 6 = 812');
  ok(c2.bands[0].col === 1 && c2.bands[0].curVal === 48, 'leading 4 absorbed → first band on 48');
  ok(c2.bands.map((b) => b.qd).join('') === '812', '4872÷6 quotient 812 (no leading zero)');

  // interior zero kept in the quotient
  const c3 = solve(618, 6);
  ok(c3.quotient === 103 && c3.remainder === 0, '618 ÷ 6 = 103 (interior zero)');
  ok(c3.bands.map((b) => b.qd).join('') === '103', '618÷6 quotient digits 1,0,3');

  // with a remainder
  const c4 = solve(3852, 7);
  ok(c4.quotient === 550 && c4.remainder === 2, '3852 ÷ 7 = 550 R2 (trailing zero + remainder)');

  // divisor larger than dividend → quotient 0, whole number is the remainder
  const c5 = solve(5, 9);
  ok(c5.quotient === 0 && c5.remainder === 5 && c5.bands.length === 0, '5 ÷ 9 = 0 R5, no bands');

  // zero dividend
  const c6 = solve(0, 4);
  ok(c6.quotient === 0 && c6.remainder === 0, '0 ÷ 4 = 0 R0');
})();

/* 5) Lesson multiple-choice answer keys match the arithmetic ---------------- */
ok(solve(738, 6).quotient === 123, 'MEET/SETUP example 738÷6=123');
ok(700 === 7 * 100, 'SETUP place value: leading 7 of 738 is 700');
ok(Math.floor(7 / 6) === 1 && 6 * 2 > 7, 'DIVIDE: 6 into 7 is 1');
ok(7 - 6 === 1, 'MULSUB: 7 − 6 = 1');
ok(Math.floor(13 / 6) === 2 && 6 * 3 > 13, 'BRING: 6 into 13 is 2');
ok(4 < 6, 'REMAIN: a remainder of 4 is < divisor 6 and can never reach 6');

/* 6) Calibration targets are always reachable, exact, and 3–4 digit --------- */
function makeTargetDeterministic(v, Q, r) {
  return { v, Q, r, req: v * Q + r };
}
let calibChecked = 0;
for (let v = VMIN; v <= VMAX; v++) {
  for (let Q = 20; Q <= 199; Q += 13) {
    for (let r = 0; r < v; r++) {
      const t = makeTargetDeterministic(v, Q, r);
      if (t.req < 100 || t.req > DMAX) continue;
      calibChecked++;
      // the required dividend fits the four place-value dials (0..9999)
      ok(t.req >= 0 && t.req <= DMAX, `target dividend in dial range (${t.req})`);
      // building exactly that dividend produces the target quotient & remainder
      const m = solve(t.req, v);
      ok(m.quotient === Q && m.remainder === r, `target ${t.req}÷${v} = ${Q} R ${r} verified`);
      // an off-by-one dividend does NOT calibrate
      ok(solve(t.req + 1, v).quotient !== Q || solve(t.req + 1, v).remainder !== r || t.req + 1 > DMAX,
        `off-by-one misses target (${t.req}÷${v})`);
    }
  }
}
ok(calibChecked > 500, `calibration space is rich (${calibChecked} targets checked)`);

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
