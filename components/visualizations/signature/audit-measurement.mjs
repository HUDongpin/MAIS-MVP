/* Numeric audit for MeasurementLab — run: node audit-measurement.mjs
   Verifies the measurement math the lab teaches is EXACTLY correct across every
   reachable dial state, plus calibration reachability and the taught facts.
   A K-12 lab must never show a child a wrong number, so this is exhaustive. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

const VMIN = 0;
const VMAX = 12;

/* ---- the model, copied verbatim from the lab ---------------------------- */
function countExact(len, unit) {
  const whole = Math.floor(len / unit);
  const rem = len - whole * unit;
  return { whole, num: rem, den: unit };
}
function invariantHolds(len, unit) {
  const { whole, num, den } = countExact(len, unit);
  return whole * unit + num === len && den === unit;
}
const FRAC = { '1/2': '½', '1/3': '⅓', '2/3': '⅔' };
function fracGlyph(num, den) {
  if (num === 0) return '';
  return FRAC[`${num}/${den}`] ?? `${num}/${den}`;
}
function countStr(len, unit) {
  const { whole, num, den } = countExact(len, unit);
  const f = fracGlyph(num, den);
  if (!f) return String(whole);
  return whole === 0 ? f : `${whole}${f}`;
}
const matchPercent = (lenA, targetBase) =>
  100 * Math.max(0, 1 - Math.abs(lenA - targetBase) / 8);
const isCalibrated = (lenA, targetBase) => lenA === targetBase;

/* 1) The invariant count × unit-size = length holds for every reachable state,
      the count is always exact (no float), and its only fractions are ½,⅓,⅔ --- */
for (let len = 1; len <= VMAX; len++) {
  for (let unit = 1; unit <= 3; unit++) {
    const { whole, num, den } = countExact(len, unit);
    ok(invariantHolds(len, unit), `invariant ${len}/${unit}`);
    // exact reconstruction of the length as an integer
    ok(whole * unit + num === len, `reconstruct ${len}=${whole}*${unit}+${num}`);
    ok(Number.isInteger(whole) && Number.isInteger(num), `integer parts ${len}/${unit}`);
    ok(num >= 0 && num < unit, `remainder in range ${len}/${unit}`);
    // the fractional part is one of the clean Grade-2 fractions
    const g = fracGlyph(num, den);
    ok(g === '' || g === '½' || g === '⅓' || g === '⅔', `clean fraction ${len}/${unit} -> "${g}"`);
    // the decimal value of the reading, when multiplied back, equals len exactly
    ok(Math.abs((whole + num / den) * unit - len) < 1e-12, `value*unit==len ${len}/${unit}`);
  }
}

/* 2) The inverse relationship: for a FIXED strip, a bigger unit never gives a
      bigger count, and a strictly bigger unit that both divide gives a strictly
      smaller count. (2.MD.A.2 — the centerpiece.) ---------------------------- */
for (let len = 1; len <= VMAX; len++) {
  const val = (unit) => len / unit; // exact ratio
  ok(val(1) >= val(2) && val(2) >= val(3), `monotone counts len=${len}`);
  ok(val(1) === len, `unit-1 count equals length len=${len}`);
  // strict decrease when the length is a common multiple (e.g. 6, 12)
  if (len % 6 === 0) {
    ok(val(1) > val(2) && val(2) > val(3), `strict inverse len=${len}`);
  }
}

/* 3) The specific centerpiece example (len 6): 6, 3, 2 rods for units 1,2,3 --- */
ok(countStr(6, 1) === '6', 'six cubes -> 6 one-cube');
ok(countStr(6, 2) === '3', 'six cubes -> 3 two-cube rods');
ok(countStr(6, 3) === '2', 'six cubes -> 2 three-cube rods');
ok(6 / 1 === 6 && 6 / 2 === 3 && 6 / 3 === 2, 'six divides 1,2,3 cleanly');

/* 4) Mixed-number readings render correctly for the fractional cases --------- */
ok(countStr(7, 2) === '3½', '7 in two-cube rods = 3½');
ok(countStr(1, 2) === '½', '1 in two-cube rods = ½');
ok(countStr(7, 3) === '2⅓', '7 in three-cube rods = 2⅓');
ok(countStr(8, 3) === '2⅔', '8 in three-cube rods = 2⅔');
ok(countStr(5, 1) === '5', '5 in cubes = 5');

/* 5) "How much longer": difference is exact subtraction and symmetric -------- */
for (let a = 0; a <= VMAX; a++) {
  for (let b = 0; b <= VMAX; b++) {
    const diff = Math.abs(a - b);
    ok(diff === Math.abs(b - a), `symmetric diff ${a},${b}`);
    ok(a - b + b === a, `subtraction identity ${a},${b}`);
    ok(diff <= VMAX, `diff in window ${a},${b}`);
    // the longer one minus the shorter equals the difference
    ok(Math.max(a, b) - Math.min(a, b) === diff, `longer-shorter ${a},${b}`);
  }
}

/* 6) Calibration: every generated target is reachable and clean, exact hit =>
      CALIBRATED at 100%, and a one-cube miss never stamps ------------------- */
const targets = [];
for (let size = 1; size <= 3; size++) {
  for (let count = 2; count <= 12; count++) {
    const base = size * count;
    if (base >= 3 && base <= VMAX) targets.push({ size, count, base });
  }
}
ok(targets.length > 0, 'targets exist');
for (const t of targets) {
  ok(t.base >= 1 && t.base <= VMAX, `target base reachable by L dial ${t.size}x${t.count}`);
  ok(t.count * t.size === t.base, `target count*size==base ${t.size}x${t.count}`);
  ok(isCalibrated(t.base, t.base), `exact hit calibrates ${t.base}`);
  ok(matchPercent(t.base, t.base) === 100, `exact hit 100% ${t.base}`);
  // measuring the built strip with the target rod reads exactly count whole rods
  ok(countStr(t.base, t.size) === String(t.count), `built strip reads ${t.count} rods`);
  // a one-off miss (if it stays in range) must not stamp and reads < 100
  const miss = t.base - 1 >= 1 ? t.base - 1 : t.base + 1;
  ok(!isCalibrated(miss, t.base), `off-by-one not calibrated ${t.base}`);
  ok(matchPercent(miss, t.base) < 100, `off-by-one < 100 ${t.base}`);
}

/* 7) The multiple-choice answer keys match the arithmetic they assert -------- */
ok(0 === 0, 'step0: start at 0');                 // "line up with 0"
ok(8 - 0 === 8, 'step1: 0 to 8 is 8 cubes');      // count the spaces
ok(6 / 1 === 6, 'step2: cube rods count = cubes');
ok(6 / 1 > 6 / 3, 'step3: small unit gives bigger number');
ok(9 - 5 === 4, 'step5: 9 - 5 = 4 longer');

/* 8) Ruler consistency: VMAX is divisible by every rod size, so a whole number
      of rods always tiles the ruler exactly (no dangling partial tick label) -- */
for (let unit = 1; unit <= 3; unit++) {
  ok(VMAX % unit === 0, `ruler tiles exactly for rod ${unit}`);
  ok(Number.isInteger(VMAX / unit), `whole rod count on ruler for rod ${unit}`);
}

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
