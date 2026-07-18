/* Numeric audit for ComparingLab — run: node audit-comparing.mjs
   Verifies the comparison math the lab teaches is exactly correct across the
   whole reachable range (0…999): digit decomposition, the >/</= relation, the
   "compare from the left, first differing place decides" algorithm, the
   more-digits-is-greater fact, the number-to-words readout, that every
   calibration clue names an in-range target its wording truly and UNIQUELY
   describes, and that the multiple-choice answer keys are true. */

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
const VMAX = 999;
const PLACES = [
  { name: 'Hundreds', short: 'hundreds', mult: 100 },
  { name: 'Tens', short: 'tens', mult: 10 },
  { name: 'Ones', short: 'ones', mult: 1 },
];
const NP = PLACES.length;

/* ---- mirror of the lab's model ------------------------------------------- */
const clampN = (n) => Math.max(VMIN, Math.min(VMAX, Math.round(n)));
const digitsOf = (n) => {
  const v = clampN(n);
  return PLACES.map((p) => Math.floor(v / p.mult) % 10);
};
const numDigits = (n) => String(clampN(n)).length;
const relSym = (a, b) => (a < b ? '<' : a > b ? '>' : '=');
const relWord = (a, b) => (a < b ? 'less than' : a > b ? 'greater than' : 'equal to');
const decidingPlace = (a, b) => {
  const da = digitsOf(a);
  const db = digitsOf(b);
  for (let i = 0; i < NP; i++) if (da[i] !== db[i]) return i;
  return -1;
};

const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const under100 = (n) => (n < 20 ? ONES_W[n] : TENS_W[Math.floor(n / 10)] + (n % 10 ? '-' + ONES_W[n % 10] : ''));
const numberWord = (n) => {
  const v = clampN(n);
  if (v < 100) return under100(v);
  const h = Math.floor(v / 100);
  const rest = v % 100;
  return ONES_W[h] + ' hundred' + (rest ? ' ' + under100(rest) : '');
};

/* 1) Digit decomposition is exact and round-trips over the whole range ------ */
for (let n = VMIN; n <= VMAX; n++) {
  const d = digitsOf(n);
  ok(d.length === 3 && d.every((x) => x >= 0 && x <= 9), `digits(${n}) are three 0-9 digits`);
  ok(d[0] * 100 + d[1] * 10 + d[2] === n, `digits(${n}) reconstruct ${n}`);
}
ok(digitsOf(27).join(',') === '0,2,7', 'digits(27) = [0,2,7]');
ok(digitsOf(72).join(',') === '0,7,2', 'digits(72) = [0,7,2]');
ok(digitsOf(0).join(',') === '0,0,0', 'digits(0) = [0,0,0]');
ok(digitsOf(999).join(',') === '9,9,9', 'digits(999) = [9,9,9]');
ok(clampN(-5) === 0 && clampN(1200) === 999, 'clamp holds the world window');

/* 2) numDigits ignores leading zeros; 0 is one digit ----------------------- */
for (let n = VMIN; n <= VMAX; n++) ok(numDigits(n) === String(n).length, `numDigits(${n})`);
ok(numDigits(0) === 1, 'numDigits(0) = 1');
ok(numDigits(7) === 1 && numDigits(89) === 2 && numDigits(100) === 3, 'digit counts');

/* 3) The relation is a correct total order matching numeric size ------------ */
const sample = [0, 1, 7, 9, 10, 27, 72, 88, 89, 90, 99, 100, 101, 199, 200, 458, 461, 500, 998, 999];
for (const a of sample) {
  for (const b of sample) {
    ok(relSym(a, b) === (a < b ? '<' : a > b ? '>' : '='), `relSym(${a},${b})`);
    ok(relWord(a, b) === (a < b ? 'less than' : a > b ? 'greater than' : 'equal to'), `relWord(${a},${b})`);
    // symmetry: a<b  <=>  b>a
    ok((relSym(a, b) === '<') === (relSym(b, a) === '>'), `symmetry ${a},${b}`);
  }
}

/* 4) THE CENTREPIECE: compare-from-the-left is EXACTLY numeric comparison ---
   For a broad grid, the sign implied by the first differing place (scanning
   left→right) equals the true numeric comparison, and -1 iff the numbers are
   equal. */
for (let a = 0; a <= 999; a += 1) {
  // pair each a with a handful of partners to keep it O(n) but thorough
  for (const b of [a, a + 1, a + 3, a + 10, a + 11, 999 - a, (a * 7) % 1000]) {
    if (b < 0 || b > 999) continue;
    const dp = decidingPlace(a, b);
    if (a === b) {
      ok(dp === -1, `equal numbers have no deciding place (${a})`);
    } else {
      ok(dp >= 0 && dp < NP, `deciding place in range for ${a},${b}`);
      const da = digitsOf(a)[dp];
      const db = digitsOf(b)[dp];
      // the deciding digit's order matches the numbers' order
      ok((da < db) === (a < b) && (da > db) === (a > b), `deciding digit decides ${a} vs ${b}`);
      // and every place to the LEFT of it is equal (that is why it is first)
      for (let i = 0; i < dp; i++) ok(digitsOf(a)[i] === digitsOf(b)[i], `left places equal ${a},${b} @${i}`);
    }
  }
}
// the two lesson traps, explicitly
ok(decidingPlace(458, 461) === 1, '458 vs 461: the TENS decide (index 1)');
ok(digitsOf(458)[2] > digitsOf(461)[2] && 458 < 461, '458 has bigger ONES yet is smaller');
ok(decidingPlace(27, 72) === 1, '27 vs 72: the TENS decide (same digits, different place)');
ok(decidingPlace(89, 100) === 0, '89 vs 100: the HUNDREDS decide (0 vs 1)');

/* 5) More digits ⇒ greater, for whole numbers (place value, restated) ------ */
for (let a = 0; a <= 99; a++) {
  for (const b of [100, 250, 999]) ok(a < b, `${a} (≤2 digits) < ${b} (3 digits)`);
}
for (let a = 0; a <= 9; a++) {
  for (const b of [10, 42, 99]) ok(a < b, `${a} (1 digit) < ${b} (2 digits)`);
}
// restated as leading-zero place value: the shorter number has a 0 up top
ok(digitsOf(89)[0] === 0 && digitsOf(100)[0] === 1, '89 has 0 hundreds, 100 has 1');

/* 6) number-to-words spot checks + no forbidden "and" ---------------------- */
ok(numberWord(0) === 'zero', 'word 0');
ok(numberWord(7) === 'seven', 'word 7');
ok(numberWord(15) === 'fifteen', 'word 15');
ok(numberWord(27) === 'twenty-seven', 'word 27');
ok(numberWord(72) === 'seventy-two', 'word 72');
ok(numberWord(100) === 'one hundred', 'word 100');
ok(numberWord(105) === 'one hundred five', 'word 105 (no "and")');
ok(numberWord(458) === 'four hundred fifty-eight', 'word 458');
ok(numberWord(999) === 'nine hundred ninety-nine', 'word 999');
for (let n = 0; n <= 999; n++) ok(!/\band\b/.test(numberWord(n)), `no "and" in words for ${n}`);

/* ---- mirror of calibration ----------------------------------------------- */
function makeClue(prev, rng) {
  const R = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const build = () => {
    const kind = R(0, 4);
    const b = R(6, 990);
    switch (kind) {
      case 0: return { b, t: b, clue: `a number EQUAL to ${b}`, kind };
      case 1: return { b, t: b - 1, clue: `the GREATEST whole number that is still LESS than ${b}`, kind };
      case 2: return { b, t: b + 1, clue: `the LEAST whole number that is GREATER than ${b}`, kind };
      case 3: return { b, t: b + 1, clue: `the only whole number GREATER than ${b} and LESS than ${b + 2}`, kind };
      default: return { b, t: b - 1, clue: `the only whole number LESS than ${b} and GREATER than ${b - 2}`, kind };
    }
  };
  let r;
  do { r = build(); } while (prev != null && r.t === prev.t);
  return r;
}
const matchPercent = (a, t) => Math.max(0, Math.min(100, 100 - Math.abs(a - t)));
const isCalibrated = (a, t) => a === t;

/* independent re-derivation of the UNIQUE number each clue describes -------- */
function trueAnswer(kind, b) {
  switch (kind) {
    case 0: // equal to b
      return b;
    case 1: { // greatest whole number < b
      let ans = null;
      for (let x = VMIN; x <= VMAX; x++) if (x < b) ans = x; // last (greatest) one
      return ans;
    }
    case 2: { // least whole number > b
      for (let x = VMIN; x <= VMAX; x++) if (x > b) return x; // first (least) one
      return null;
    }
    case 3: { // only whole number with b < x < b+2
      const found = [];
      for (let x = VMIN; x <= VMAX; x++) if (x > b && x < b + 2) found.push(x);
      return found.length === 1 ? found[0] : null; // null flags non-uniqueness
    }
    default: { // only whole number with b-2 < x < b
      const found = [];
      for (let x = VMIN; x <= VMAX; x++) if (x < b && x > b - 2) found.push(x);
      return found.length === 1 ? found[0] : null;
    }
  }
}

/* 7) Every clue: in range; wording's UNIQUE answer equals the target; exact
      answer meters 100 & calibrates; off-by-one drops below 100 and never
      stamps; consecutive targets differ; all kinds appear ------------------- */
let seed = 12345;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
let prev = null;
const kindsSeen = new Set();
for (let i = 0; i < 8000; i++) {
  const r = makeClue(prev, rng);
  kindsSeen.add(r.kind);
  ok(Number.isInteger(r.t) && r.t >= VMIN && r.t <= VMAX, `clue target ${r.t} in range`);
  ok(Number.isInteger(r.b) && r.b >= VMIN && r.b <= VMAX, `clue reference ${r.b} in range`);
  const truth = trueAnswer(r.kind, r.b);
  ok(truth !== null, `clue kind ${r.kind} names a UNIQUE number (b=${r.b})`);
  ok(truth === r.t, `clue wording solves to the target: "${r.clue}" -> ${truth} vs ${r.t}`);
  ok(isCalibrated(r.t, r.t) && matchPercent(r.t, r.t) === 100, `exact answer calibrates & meters 100: ${r.clue}`);
  ok(!isCalibrated(r.t + 1, r.t) && matchPercent(r.t + 1, r.t) === 99, `off-by-one: not calibrated, meters 99: ${r.clue}`);
  ok(matchPercent(r.t + 200, r.t) === 0, `far away meters 0: ${r.clue}`);
  if (prev != null) ok(r.t !== prev.t, 'consecutive clue targets differ');
  prev = r;
}
ok(kindsSeen.size === 5, `all 5 clue kinds appear (saw ${kindsSeen.size})`);

/* 8) Multiple-choice answer keys match the arithmetic they assert ----------- */
// step 0: comparing is about size order (conceptual — assert the framing math)
ok(relSym(27, 72) === '<' && 27 !== 72, 'step0: 27 and 72 are unequal, 27 < 72');
// step 1: 8 __ 3 is >
ok(relSym(8, 3) === '>', 'step1: 8 > 3');
// step 2: 5 < 9 is the same fact as 9 > 5
ok(relSym(5, 9) === '<' && relSym(9, 5) === '>', 'step2: 5<9 same as 9>5');
ok(!(relSym(9, 5) === '<') && !(relSym(5, 9) === '>'), 'step2: the two distractors are false');
// step 3: 458 vs 461 -> 461, decided by the tens
ok(relSym(458, 461) === '<' && decidingPlace(458, 461) === 1, 'step3: 461 > 458 by the tens');
// step 4: 89 vs 100 -> 100, decided by the hundreds
ok(relSym(89, 100) === '<' && decidingPlace(89, 100) === 0, 'step4: 100 > 89 by the hundreds');

/* 9) The start values embody the lesson hook ------------------------------- */
ok(new Set([...String(27), ...String(72)]).size === 2, '27 and 72 share the SAME two digits');
ok(27 < 72 && decidingPlace(27, 72) === 1, 'yet 27 < 72, decided by the tens place');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
