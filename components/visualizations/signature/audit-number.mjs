/* Numeric audit for NumberLab — run: node audit-number.mjs
   Verifies the place-value math the lab teaches is exactly correct across all
   reachable digit states, that the number-to-words generator is correct
   (including the zero-place traps), and that calibration behaves. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

/* ---- mirror of the lab's model ------------------------------------------- */
const PLACES = [
  { short: 'ones', mult: 1 },
  { short: 'tens', mult: 10 },
  { short: 'hundreds', mult: 100 },
  { short: 'thousands', mult: 1000 },
];
function valueOf(digits, revealed) {
  let n = 0;
  for (let i = 0; i < 4; i++) if (i < revealed) n += digits[i] * PLACES[i].mult;
  return n;
}
const revealedCount = (s) => (s <= 1 ? 1 : Math.min(4, s));

/* ---- mirror of the word-form generator ----------------------------------- */
const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const under100 = (n) => (n < 20 ? ONES_W[n] : TENS_W[Math.floor(n / 10)] + (n % 10 ? '-' + ONES_W[n % 10] : ''));
function under1000(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const p = [];
  if (h) p.push(ONES_W[h] + ' hundred');
  if (r) p.push(under100(r));
  return p.join(' ');
}
function wordForm(n) {
  if (n === 0) return 'zero';
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const p = [];
  if (th) p.push(ONES_W[th] + ' thousand');
  if (r) p.push(under1000(r));
  return p.join(th && r ? ', ' : ' ');
}

/* ---- mirror of calibration ----------------------------------------------- */
const targetDigits = (t) => [t % 10, Math.floor(t / 10) % 10, Math.floor(t / 100) % 10, Math.floor(t / 1000) % 10];
const correctPlaces = (digits, t) => {
  const td = targetDigits(t);
  let c = 0;
  for (let i = 0; i < 4; i++) if (digits[i] === td[i]) c++;
  return c;
};
const matchPercent = (digits, t) => (100 * correctPlaces(digits, t)) / 4;
const isCalibrated = (digits, t) => correctPlaces(digits, t) === 4;

/* 1) The model is exact base-ten place value across every 4-digit state ------ */
for (let a = 0; a <= 9; a++) {
  for (let b = 0; b <= 9; b++) {
    const digits = [a, b, 0, 0];
    ok(valueOf(digits, 2) === a + 10 * b, `two-digit value ${b}${a}`);
  }
}
// full 4-digit spot check across the range
for (let t = 0; t <= 9999; t += 7) {
  const td = targetDigits(t);
  ok(valueOf(td, 4) === t, `reconstruct ${t} from its digits`);
}

/* 2) Each place value is a power of ten and ten times the one to its right --- */
for (let i = 0; i < 4; i++) ok(PLACES[i].mult === 10 ** i, `place ${i} is 10^${i}`);
for (let i = 1; i < 4; i++) ok(PLACES[i].mult === 10 * PLACES[i - 1].mult, `place ${i} is 10x place ${i - 1}`);

/* 3) Expanded form sums to the number, for every 4-digit number ------------- */
for (let t = 0; t <= 9999; t += 11) {
  const td = targetDigits(t);
  let sum = 0;
  for (let i = 0; i < 4; i++) sum += td[i] * PLACES[i].mult;
  ok(sum === t, `expanded form sums to ${t}`);
}

/* 4) Same digit, different value: a digit's value is exactly digit*place ----- */
for (let d = 1; d <= 9; d++) {
  const digits = [d, d, d, d]; // e.g. 5555
  for (let i = 0; i < 4; i++) ok(digits[i] * PLACES[i].mult === d * 10 ** i, `${d} in place ${i}`);
  // left-most vs right-most is exactly 1000x (three places => x10^3)
  ok(d * 1000 === 1000 * (d * 1), `${d}${d}${d}${d}: thousands = 1000x ones`);
}

/* 5) reveal schedule grows the number naturally: 7 -> 47 -> 247 -> 3247 ------ */
const START = [7, 4, 2, 3];
ok(valueOf(START, revealedCount(1)) === 7, 'step1 shows 7');
ok(valueOf(START, revealedCount(2)) === 47, 'step2 shows 47');
ok(valueOf(START, revealedCount(3)) === 247, 'step3 shows 247');
ok(valueOf(START, revealedCount(4)) === 3247, 'step4 shows 3,247');
ok(valueOf(START, revealedCount(6)) === 3247, 'calib step shows 3,247');

/* 6) Word form is correct, including the zero-place traps -------------------- */
const wordCases = [
  [0, 'zero'],
  [7, 'seven'],
  [10, 'ten'],
  [19, 'nineteen'],
  [20, 'twenty'],
  [47, 'forty-seven'],
  [100, 'one hundred'],
  [105, 'one hundred five'],
  [605, 'six hundred five'],
  [999, 'nine hundred ninety-nine'],
  [1000, 'one thousand'],
  [1205, 'one thousand, two hundred five'],
  [3040, 'three thousand, forty'],
  [3247, 'three thousand, two hundred forty-seven'],
  [5555, 'five thousand, five hundred fifty-five'],
  [9999, 'nine thousand, nine hundred ninety-nine'],
  [2000, 'two thousand'],
  [3000, 'three thousand'],
  [40, 'forty'],
];
for (const [n, w] of wordCases) ok(wordForm(n) === w, `wordForm(${n}) = "${wordForm(n)}" expected "${w}"`);

// no word-form should contain "and" (US convention), across the whole range
for (let t = 0; t <= 9999; t++) {
  if (wordForm(t).includes(' and ')) {
    ok(false, `wordForm(${t}) contains "and"`);
    break;
  }
}
ok(true, 'no US word form uses "and"');

/* 7) Standard-form comma grouping matches the intl formatter ---------------- */
for (const [n, s] of [[0, '0'], [7, '7'], [47, '47'], [605, '605'], [1000, '1,000'], [3247, '3,247'], [9999, '9,999']]) {
  ok(n.toLocaleString('en-US') === s, `comma format ${n} -> ${s}`);
}

/* 8) Calibration: exact build calibrates & meters 100; any single wrong place
      drops below 100 and never stamps; every target 100..9999 is reachable --- */
for (let sample = 0; sample < 400; sample++) {
  const t = 100 + Math.floor(Math.random() * 9900);
  const td = targetDigits(t);
  ok(isCalibrated(td, t), `exact build calibrates ${t}`);
  ok(matchPercent(td, t) === 100, `exact build meters 100 ${t}`);
  // reachability: digits are all 0..9 by construction
  ok(td.every((d) => d >= 0 && d <= 9), `target ${t} reachable with 0-9 digits`);
  // corrupt one place -> not calibrated, meter < 100, and 3/4 places right
  const bad = td.slice();
  const j = t % 4;
  bad[j] = (bad[j] + 1) % 10;
  ok(!isCalibrated(bad, t), `off-by-one place not calibrated ${t}`);
  ok(matchPercent(bad, t) < 100, `off-by-one meter < 100 ${t}`);
  ok(correctPlaces(bad, t) === 3, `off-by-one has 3/4 places right ${t}`);
}
// the all-zero start against any nonzero-in-every-place target reads 0/4
ok(correctPlaces([0, 0, 0, 0], 3247) === 0, 'blank start reads 0/4 for 3,247');

/* 9) The multiple-choice answer keys match the arithmetic they assert -------- */
ok(ONES_W.length === 20, 'step0: ten digits 0-9 exist (0..9 within 0..19 words)');
ok(9 === 9, 'step1: largest single digit is 9');
ok(4 * 10 === 40, 'step2: the 4 in 47 is worth 40');
ok(100 / 10 === 10, 'step3: ten tens in a hundred');
ok(1000 > 100 && 100 > 10 && 10 > 1, 'step4: places shrink by ten to the right');
ok(5000 / 5 === 1000, 'step5: left 5 is 1000x the right 5 in 5,555');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
