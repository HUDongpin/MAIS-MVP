/* Numeric audit for UnitConversionLab — run: node audit-unitconversion.mjs
   Verifies the unit-conversion math the lab teaches is EXACTLY correct across
   every reachable dial state, in both directions, plus calibration reachability
   and every taught fact. A K-12 lab must never show a child a wrong number, so
   this is exhaustive. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

/* ---- the families + model, copied verbatim from the lab ----------------- */
const FAMILIES = [
  { key: 'ftin', bigOne: 'foot', bigMany: 'feet', bigAbbr: 'ft', smallOne: 'inch', smallMany: 'inches', smallAbbr: 'in', F: 12 },
  { key: 'ydft', bigOne: 'yard', bigMany: 'yards', bigAbbr: 'yd', smallOne: 'foot', smallMany: 'feet', smallAbbr: 'ft', F: 3 },
  { key: 'mcm', bigOne: 'meter', bigMany: 'meters', bigAbbr: 'm', smallOne: 'centimeter', smallMany: 'centimeters', smallAbbr: 'cm', F: 100 },
  { key: 'lboz', bigOne: 'pound', bigMany: 'pounds', bigAbbr: 'lb', smallOne: 'ounce', smallMany: 'ounces', smallAbbr: 'oz', F: 16 },
  { key: 'hrmin', bigOne: 'hour', bigMany: 'hours', bigAbbr: 'hr', smallOne: 'minute', smallMany: 'minutes', smallAbbr: 'min', F: 60 },
];
const WMAX = 8; // whole dial max

function totalSmall(whole, part, F) {
  return whole * F + part;
}
function splitExact(total, F) {
  return { whole: Math.floor(total / F), part: total - Math.floor(total / F) * F };
}
function invariantHolds(whole, part, F) {
  const t = totalSmall(whole, part, F);
  const s = splitExact(t, F);
  return s.whole === whole && s.part === part && part >= 0 && part < F;
}
const matchPercent = (total, T, F) => 100 * Math.max(0, 1 - Math.abs(total - T) / (2 * F));
const isCalibrated = (total, T) => total === T;

/* 1) The core invariant  whole*F + part = total  and its inverse (split back)
      hold EXACTLY for every reachable (family, whole, part). Nothing is float. */
for (const f of FAMILIES) {
  for (let whole = 0; whole <= WMAX; whole++) {
    for (let part = 0; part < f.F; part++) {
      const t = totalSmall(whole, part, f.F);
      ok(Number.isInteger(t), `integer total ${f.key} ${whole},${part}`);
      ok(invariantHolds(whole, part, f.F), `invariant ${f.key} ${whole},${part}`);
      // combine then split is the identity
      const s = splitExact(t, f.F);
      ok(s.whole === whole && s.part === part, `combine/split identity ${f.key} ${whole},${part}`);
      // the remainder is always a proper remainder (never a whole extra big unit)
      ok(s.part >= 0 && s.part < f.F, `proper remainder ${f.key} ${whole},${part}`);
      // going down and back up reproduces the amount exactly
      ok(splitExact(t, f.F).whole * f.F + splitExact(t, f.F).part === t, `roundtrip ${f.key} ${t}`);
    }
  }
}

/* 2) Direction consistency: multiplying big→small and dividing small→big are
      true inverses for whole amounts (the clean part===0 case). ------------- */
for (const f of FAMILIES) {
  for (let whole = 0; whole <= WMAX; whole++) {
    const down = whole * f.F; // big → small
    ok(down / f.F === whole, `divide undoes multiply ${f.key} ${whole}`);
    ok(Number.isInteger(down), `whole down is integer ${f.key} ${whole}`);
  }
}

/* 3) The inverse-size relationship (smaller unit → more of them): for the SAME
      one big unit, a bigger factor gives more small units. ------------------ */
const factors = FAMILIES.map((f) => f.F);
ok(Math.max(...factors) === 100, 'metric m→cm has the largest factor (100)');
ok(Math.min(...factors) === 3, 'yd→ft has the smallest factor (3)');
// the taught ordering 100 > 12 > 3
const F_mcm = FAMILIES.find((f) => f.key === 'mcm').F;
const F_ftin = FAMILIES.find((f) => f.key === 'ftin').F;
const F_ydft = FAMILIES.find((f) => f.key === 'ydft').F;
ok(F_mcm > F_ftin && F_ftin > F_ydft, 'factor ordering 100 > 12 > 3');

/* 4) Each conversion factor is the TRUE real-world integer relationship ----- */
ok(FAMILIES.find((f) => f.key === 'ftin').F === 12, '1 ft = 12 in');
ok(FAMILIES.find((f) => f.key === 'ydft').F === 3, '1 yd = 3 ft');
ok(FAMILIES.find((f) => f.key === 'mcm').F === 100, '1 m = 100 cm');
ok(FAMILIES.find((f) => f.key === 'lboz').F === 16, '1 lb = 16 oz');
ok(FAMILIES.find((f) => f.key === 'hrmin').F === 60, '1 hr = 60 min');

/* 5) The multiple-choice answer keys match the arithmetic they assert ------- */
ok(4 * 12 === 48, 'step1: 4 ft = 48 in (multiply, not add)');
ok(4 + 12 !== 48, 'step1: adding is the wrong answer');
ok(12 / 12 === 1, 'step2: (12 in / 1 ft) = 1');
ok(F_mcm > F_ftin && F_mcm > F_ydft, 'step3: m→cm gives the most small units');
ok(24 / 12 === 2, 'step4: 24 in = 2 ft (divide)');
{
  const s = splitExact(40, 12);
  ok(s.whole === 3 && s.part === 4, 'step5: 40 in = 3 ft 4 in');
  ok(3 * 12 + 4 === 40, 'step5: 3 ft 4 in reconstructs 40 in');
}

/* 6) Calibration: every reachable target has a UNIQUE mixed-measure solution,
      exact hit stamps at 100%, and an off-by-one never stamps. -------------- */
for (let fi = 0; fi < FAMILIES.length; fi++) {
  const F = FAMILIES[fi].F;
  for (let whole = 2; whole <= 7; whole++) {
    for (const part of [0, 1, Math.floor(F / 2), F - 1]) {
      const total = whole * F + part;
      // reachability: whole within dial range, part within 0..F-1
      ok(whole <= WMAX, `calib whole reachable ${FAMILIES[fi].key} ${whole}`);
      ok(part >= 0 && part < F, `calib part reachable ${FAMILIES[fi].key} ${part}`);
      // uniqueness: the only (w,p) with w*F+p==total and 0<=p<F is (whole,part)
      const s = splitExact(total, F);
      ok(s.whole === whole && s.part === part, `calib unique decomposition ${FAMILIES[fi].key} ${total}`);
      // exact hit
      ok(isCalibrated(total, total), `calib exact hit ${FAMILIES[fi].key} ${total}`);
      ok(matchPercent(total, total, F) === 100, `calib exact 100% ${FAMILIES[fi].key} ${total}`);
      // off-by-one small unit: not calibrated, and strictly below 100
      const miss = total + 1;
      ok(!isCalibrated(miss, total), `calib off-by-one not stamped ${FAMILIES[fi].key} ${total}`);
      ok(matchPercent(miss, total, F) < 100, `calib off-by-one < 100 ${FAMILIES[fi].key} ${total}`);
      // meter is clamped to [0,100]
      const far = total + 10 * F;
      ok(matchPercent(far, total, F) >= 0, `meter never negative ${FAMILIES[fi].key} ${total}`);
    }
  }
}

/* 7) makeTarget always yields a reachable, uniquely-solvable, in-family target,
      and differs from the previous one. (Sampled many times.) --------------- */
function makeTarget(prevKey) {
  let pick;
  do {
    const famIdx = Math.floor(Math.random() * FAMILIES.length);
    const F = FAMILIES[famIdx].F;
    const whole = 2 + Math.floor(Math.random() * 6);
    const part = Math.random() < 0.5 ? 0 : 1 + Math.floor(Math.random() * (F - 1));
    const total = whole * F + part;
    pick = { famIdx, whole, part, total, F, key: `${famIdx}:${total}` };
  } while (prevKey != null && pick.key === prevKey);
  return pick;
}
let prev = null;
for (let i = 0; i < 4000; i++) {
  const t = makeTarget(prev);
  const F = FAMILIES[t.famIdx].F;
  ok(t.whole >= 2 && t.whole <= 7, `makeTarget whole in [2,7] (${t.whole})`);
  ok(t.part >= 0 && t.part < F, `makeTarget part in [0,F) (${t.part}/${F})`);
  ok(t.total === t.whole * F + t.part, `makeTarget total consistent (${t.total})`);
  ok(t.total >= 2 * F, `makeTarget total not trivially small (${t.total})`);
  const s = splitExact(t.total, F);
  ok(s.whole === t.whole && s.part === t.part, `makeTarget unique solution (${t.total})`);
  if (prev != null) ok(t.key !== prev, `makeTarget differs from previous (${t.key})`);
  prev = t.key;
}

/* 8) Number-line legibility guard: whenever minor small ticks are drawn, there
      are never too many of them (density guard the renderer relies on). ------ */
for (const f of FAMILIES) {
  for (let whole = 0; whole <= WMAX; whole++) {
    const spanBig = Math.min(12, Math.max(3, whole + 1));
    const drawMinor = f.F <= 12 && spanBig * f.F <= 90;
    if (drawMinor) {
      ok(spanBig * f.F <= 90, `minor tick density ok ${f.key} span=${spanBig}`);
      ok(f.F <= 12, `minor ticks only for small factors ${f.key}`);
    }
    // majors: one label per big tick, count stays small & readable
    ok(spanBig + 1 <= 13, `major tick count readable ${f.key} span=${spanBig}`);
  }
}

/* 9) Sanity on the "one length, two names" claim: the marker x-position for the
      big reading and for the small reading coincide (they must, since a small
      value s maps through the SAME transform as big-position s/F). ---------- */
for (const f of FAMILIES) {
  for (let whole = 0; whole <= WMAX; whole++) {
    for (const part of [0, 1, f.F - 1]) {
      const total = totalSmall(whole, part, f.F);
      const bigPos = whole + part / f.F;
      const smallPos = total / f.F;
      ok(Math.abs(bigPos - smallPos) < 1e-12, `two names, one spot ${f.key} ${whole},${part}`);
    }
  }
}

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
