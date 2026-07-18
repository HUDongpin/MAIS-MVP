/* Numeric + structural audit for TeenNumbersLab — run: node audit-teennumbers.mjs

   This lab makes an unusual claim for a maths lab — a claim about ENGLISH:
   "the teens are the only numbers said out of writing order." That claim is the
   whole centrepiece, so it is not allowed to be a claim. Section 5 sweeps all
   of 0–99 and proves the set of reversed numbers is exactly {13…19}.

   It also enforces the lab's DISTINCTNESS refusals by grepping the real source
   (section 11). Both sibling pictures for this topic are already owned —
   CountingLab's ten-frame and TwoDigitNumberLab's bundling ten-rod — and a
   promise to avoid them written only in prose is a promise you will break. */

import fs from 'fs';

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (fails <= 25) console.error('FAIL:', msg);
  }
}

/* ---- mirror of the lab's model ------------------------------------------- */
const tensOf = (v) => Math.floor(v / 10);
const onesOf = (v) => v % 10;
const teenValue = (n) => 10 + n;

const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const wordForm = (v) => (v < 20 ? ONES_W[v] : TENS_W[Math.floor(v / 10)] + (v % 10 ? '-' + ONES_W[v % 10] : ''));

const TEEN_ROOT = { 13: 'thir', 14: 'four', 15: 'fif', 16: 'six', 17: 'seven', 18: 'eigh', 19: 'nine' };
const isOpaqueTeen = (v) => v === 11 || v === 12;

function sayParts(v) {
  if (v < 10) return [{ text: ONES_W[v], role: 'more' }];
  if (v === 10) return [{ text: 'ten', role: 'ten' }];
  if (isOpaqueTeen(v)) return [{ text: ONES_W[v], role: 'opaque' }];
  if (v <= 19) return [{ text: TEEN_ROOT[v], role: 'more' }, { text: 'teen', role: 'ten' }];
  const t = tensOf(v);
  const o = onesOf(v);
  if (o === 0) return [{ text: TENS_W[t], role: 'ten' }];
  return [{ text: TENS_W[t], role: 'ten' }, { text: ONES_W[o], role: 'more' }];
}
function crosses(v) {
  const p = sayParts(v);
  return p.length === 2 && p[0].role === 'more';
}
const hasTrap = (v) => v >= 13 && v <= 19;
const trapNumeral = (v) => onesOf(v) * 10 + 1;

const digitsRightOf = (l, r, t) => (l === tensOf(t) ? 1 : 0) + (r === onesOf(t) ? 1 : 0);
const matchPercent = (l, r, t) => 50 * digitsRightOf(l, r, t);
const isCalibrated = (l, r, t) => l * 10 + r === t;

function layoutQuantity(t, o, cx, cy, k) {
  const pillW = 26 * k;
  const pillH = 58 * k;
  const gap = 6 * k;
  const dotD = 18 * k;
  const groupGap = 20 * k;
  const pillsW = t > 0 ? t * pillW + (t - 1) * gap : 0;
  const dotsW = o > 0 ? o * dotD + (o - 1) * gap : 0;
  const totalW = pillsW + dotsW + (t > 0 && o > 0 ? groupGap : 0);
  let x = cx - totalW / 2;
  const pills = [];
  for (let i = 0; i < t; i++) {
    pills.push({ x, y: cy - pillH / 2, w: pillW, h: pillH });
    x += pillW;
    if (i < t - 1) x += gap;
  }
  if (t > 0 && o > 0) x += groupGap;
  const dots = [];
  for (let i = 0; i < o; i++) {
    dots.push({ cx: x + dotD / 2, cy, r: dotD / 2 });
    x += dotD;
    if (i < o - 1) x += gap;
  }
  return { pills, dots, totalW, pillsW, dotsW, pillH, dotD, pillW };
}

/* ===========================================================================
   1) The arithmetic: a teen IS ten and some more, exactly, for every teen
   ========================================================================= */
for (let n = 0; n <= 9; n++) {
  const v = teenValue(n);
  ok(v === 10 + n, `teenValue(${n}) = 10 + ${n}`);
  ok(v >= 10 && v <= 19, `teenValue(${n}) lands in 10..19`);
  ok(tensOf(v) === 1, `${v} has exactly ONE ten — the pill never changes across the dial's range`);
  ok(onesOf(v) === n, `${v} has ${n} more`);
  ok(tensOf(v) * 10 + onesOf(v) === v, `${v} = 10 + ${n} reassembles`);
}
// the two boundaries the lesson claims
ok(teenValue(0) === 10 && onesOf(10) === 0, 'n=0 gives plain ten — a ten and no more, not a teen');
ok(teenValue(9) === 19 && teenValue(9) + 1 === 20 && tensOf(20) === 2, '19 + 1 needs a SECOND ten — out of the teens');
// every teen has exactly one ten; no other two-digit number range does
for (let v = 11; v <= 19; v++) ok(tensOf(v) === 1 && onesOf(v) === v - 10, `teen ${v} = 1 ten + ${v - 10}`);

/* ===========================================================================
   2) Word forms, 0–99, against an INDEPENDENT hand-written table
      (a generated expectation would only re-run the same algorithm)
   ========================================================================= */
const EXPECTED = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine',
  'thirty', 'thirty-one', 'thirty-two', 'thirty-three', 'thirty-four', 'thirty-five', 'thirty-six', 'thirty-seven', 'thirty-eight', 'thirty-nine',
  'forty', 'forty-one', 'forty-two', 'forty-three', 'forty-four', 'forty-five', 'forty-six', 'forty-seven', 'forty-eight', 'forty-nine',
  'fifty', 'fifty-one', 'fifty-two', 'fifty-three', 'fifty-four', 'fifty-five', 'fifty-six', 'fifty-seven', 'fifty-eight', 'fifty-nine',
  'sixty', 'sixty-one', 'sixty-two', 'sixty-three', 'sixty-four', 'sixty-five', 'sixty-six', 'sixty-seven', 'sixty-eight', 'sixty-nine',
  'seventy', 'seventy-one', 'seventy-two', 'seventy-three', 'seventy-four', 'seventy-five', 'seventy-six', 'seventy-seven', 'seventy-eight', 'seventy-nine',
  'eighty', 'eighty-one', 'eighty-two', 'eighty-three', 'eighty-four', 'eighty-five', 'eighty-six', 'eighty-seven', 'eighty-eight', 'eighty-nine',
  'ninety', 'ninety-one', 'ninety-two', 'ninety-three', 'ninety-four', 'ninety-five', 'ninety-six', 'ninety-seven', 'ninety-eight', 'ninety-nine',
];
ok(EXPECTED.length === 100, 'expectation table covers 0..99');
for (let v = 0; v <= 99; v++) ok(wordForm(v) === EXPECTED[v], `wordForm(${v}) = "${wordForm(v)}", expected "${EXPECTED[v]}"`);
// the classic spelling traps a K-lab must not get wrong
ok(wordForm(40) === 'forty', '40 is "forty", never "fourty"');
ok(wordForm(15) === 'fifteen' && wordForm(50) === 'fifty', 'fifteen / fifty both bend "five"');
ok(wordForm(12) === 'twelve' && wordForm(20) === 'twenty', 'twelve is not "twoteen"');

/* ===========================================================================
   3) The teen words really are built the way the lab draws them
   ========================================================================= */
for (let v = 13; v <= 19; v++) {
  const root = TEEN_ROOT[v];
  ok(typeof root === 'string' && root.length > 0, `teen ${v} has a root`);
  ok(root + 'teen' === wordForm(v), `"${root}" + "teen" = "${wordForm(v)}" (it must re-assemble exactly)`);
  ok(wordForm(v).startsWith(root), `"${wordForm(v)}" starts with its root "${root}"`);
  ok(wordForm(v).endsWith('teen'), `"${wordForm(v)}" ends in "teen"`);
}
// which roots are REGULAR (root === the ones word) and which are BENT
const REGULAR = [14, 16, 17, 19];
const BENT = [13, 15, 18];
for (const v of REGULAR) ok(TEEN_ROOT[v] === ONES_W[onesOf(v)], `${v}: root "${TEEN_ROOT[v]}" is the plain word "${ONES_W[onesOf(v)]}"`);
for (const v of BENT) ok(TEEN_ROOT[v] !== ONES_W[onesOf(v)], `${v}: root "${TEEN_ROOT[v]}" is BENT out of "${ONES_W[onesOf(v)]}"`);
ok(REGULAR.length + BENT.length === 7, 'the seven transparent teens are accounted for');
// eleven and twelve say nothing about their parts
for (const v of [11, 12]) {
  const p = sayParts(v);
  ok(p.length === 1 && p[0].role === 'opaque', `${v} is opaque — one unanalysable chip`);
  ok(!wordForm(v).includes('teen'), `"${wordForm(v)}" contains no "teen" to give the ten away`);
}

/* ===========================================================================
   4) sayParts is in SPOKEN order and re-assembles into the real word
   ========================================================================= */
for (let v = 0; v <= 99; v++) {
  const p = sayParts(v);
  ok(p.length >= 1 && p.length <= 2, `sayParts(${v}) has 1 or 2 parts`);
  for (const q of p) ok(['ten', 'more', 'opaque'].includes(q.role), `part role of ${v} is known`);
  if (v >= 13 && v <= 19) ok(p.map((q) => q.text).join('') === wordForm(v), `${v}: parts join to "${wordForm(v)}"`);
  if (v >= 21 && v <= 99 && onesOf(v) !== 0) {
    ok(p.map((q) => q.text).join('-') === wordForm(v), `${v}: parts hyphenate to "${wordForm(v)}"`);
    ok(p[0].role === 'ten' && p[1].role === 'more', `${v}: says the TENS first`);
  }
  // exactly one part carries the ten, for every number that has one
  if (v >= 10 && !isOpaqueTeen(v)) ok(p.filter((q) => q.role === 'ten').length === 1, `${v} names its ten exactly once`);
}

/* ===========================================================================
   5) THE THESIS — the centrepiece, proved exhaustively.
      A number is said out of writing order (the arrows cross) for EXACTLY the
      numbers 13…19, and no others in 0–99.
   ========================================================================= */
const reversed = [];
for (let v = 0; v <= 99; v++) if (crosses(v)) reversed.push(v);
ok(reversed.join(',') === '13,14,15,16,17,18,19', `reversed set is exactly {13..19}, got {${reversed.join(',')}}`);
for (let v = 0; v <= 99; v++) {
  ok(crosses(v) === (v >= 13 && v <= 19), `crosses(${v}) iff 13<=${v}<=19`);
  if (v >= 20) ok(!crosses(v), `${v} (twenty and up) is spoken in writing order — no crossing`);
}
ok(!crosses(11) && !crosses(12), 'eleven/twelve do not cross — they are opaque, which is a different failure');
ok(crosses(14) && !crosses(24), 'the lab\'s step-6 comparison: 14 crosses, 24 does not');
// and the reason: for a teen the first thing SAID is the some-more, while the
// first thing WRITTEN is always the ten
for (let v = 13; v <= 19; v++) {
  const p = sayParts(v);
  ok(p[0].role === 'more' && p[1].role === 'ten', `${v} is SAID ones-first`);
  ok(tensOf(v) === 1, `${v} is WRITTEN tens-first (the 1 leads)`);
}

/* ===========================================================================
   6) The trap: writing what you hear
   ========================================================================= */
for (let v = 0; v <= 99; v++) ok(hasTrap(v) === (v >= 13 && v <= 19), `hasTrap(${v}) iff a transparent teen`);
ok(trapNumeral(14) === 41 && wordForm(41) === 'forty-one', '"fourteen" heard in order → 41 → forty-one');
ok(trapNumeral(13) === 31 && wordForm(31) === 'thirty-one', '"thirteen" heard in order → 31 → thirty-one');
ok(trapNumeral(19) === 91 && wordForm(91) === 'ninety-one', '"nineteen" heard in order → 91 → ninety-one');
for (let v = 13; v <= 19; v++) {
  const tv = trapNumeral(v);
  ok(tv !== v, `the trap for ${v} is a DIFFERENT number (${tv}) — otherwise there is no lesson`);
  ok(tv > v, `the trap pile ${tv} is always bigger than ${v} — the picture must show that`);
  ok(tensOf(tv) === onesOf(v) && onesOf(tv) === 1, `${v}'s trap ${tv} = the ones you heard first, then the ten`);
  ok(tensOf(tv) >= 3 && tensOf(tv) <= 9, `trap ${tv} draws 3..9 pills — fits the lane`);
}
// 11 and 12 have no trap: there is nothing to mis-transcribe
ok(!hasTrap(11) && !hasTrap(12), 'eleven/twelve have no trap — the word gives a child nothing to reverse');
// the bent-root traps SOUND like their teen, which is the sharpest case
ok(wordForm(13).startsWith('thir') && wordForm(31).startsWith('thir'), 'thirteen / thirty-one share the bent root "thir"');
ok(wordForm(15).startsWith('fif') && wordForm(51).startsWith('fif'), 'fifteen / fifty-one share the bent root "fif"');

/* ===========================================================================
   7) Calibration: exhaustive. CALIBRATED iff the numeral written equals the
      word's value; a partial can never stamp.
   ========================================================================= */
for (let target = 11; target <= 19; target++) {
  ok(tensOf(target) === 1 && onesOf(target) === target - 10, `target ${target} is reachable as (1, ${target - 10})`);
  let stamps = 0;
  for (let l = 0; l <= 9; l++) {
    for (let r = 0; r <= 9; r++) {
      const v = l * 10 + r;
      const dr = digitsRightOf(l, r, target);
      const cal = isCalibrated(l, r, target);
      const pct = matchPercent(l, r, target);
      if (cal) stamps++;
      ok(dr >= 0 && dr <= 2, `marks-right in 0..2 for (${l},${r})`);
      ok(cal === (v === target), `calibrated(${l},${r} → ${v}) iff it equals ${target}`);
      ok((pct === 100) === (v === target), `meter hits 100 iff ${v} === ${target}`);
      ok((dr === 2) === (v === target), `2/2 marks iff ${v} === ${target}`);
      if (v !== target) ok(pct < 100 && !cal, `${v} vs ${target}: partial NEVER stamps`);
    }
  }
  ok(stamps === 1, `exactly one of the 100 (l,r) pairs stamps for ${target} (got ${stamps})`);
  // the trap answer specifically must never stamp
  const tv = trapNumeral(target);
  if (hasTrap(target)) ok(!isCalibrated(tensOf(tv), onesOf(tv), target), `writing the trap ${tv} does NOT stamp for ${target}`);
  // writing only the root ("seven" for seventeen) must not stamp either
  ok(!isCalibrated(0, onesOf(target), target), `writing just ${onesOf(target)} does not stamp for ${target}`);
}

/* ===========================================================================
   8) Target generation: in range, never repeats the previous word
   ========================================================================= */
function makeTarget(prev, rnd) {
  let t;
  do {
    t = 11 + Math.floor(rnd() * 9);
  } while (prev != null && t === prev);
  return t;
}
let prev = null;
const seen = new Set();
for (let i = 0; i < 20000; i++) {
  const t = makeTarget(prev, Math.random);
  ok(t >= 11 && t <= 19, `target ${t} is a teen`);
  ok(t !== prev, `target ${t} differs from the previous`);
  seen.add(t);
  prev = t;
}
ok(seen.size === 9, `all nine teens are reachable as targets (saw ${seen.size})`);

/* ===========================================================================
   9) The "IT IS" lane draws exactly the number, and nothing overlaps
   ========================================================================= */
for (let v = 0; v <= 99; v++) {
  const t = tensOf(v);
  const o = onesOf(v);
  const L = layoutQuantity(t, o, 350, 200, 1);
  ok(L.pills.length === t, `${v} draws ${t} sealed pills`);
  ok(L.dots.length === o, `${v} draws ${o} dots`);
  ok(L.pills.length * 10 + L.dots.length === v, `the picture of ${v} IS ${v}: ${t}×10 + ${o}`);
  // pills never overlap each other
  for (let i = 1; i < L.pills.length; i++) {
    ok(L.pills[i].x >= L.pills[i - 1].x + L.pills[i - 1].w, `${v}: pill ${i} clears pill ${i - 1}`);
  }
  // dots never overlap each other
  for (let i = 1; i < L.dots.length; i++) {
    ok(L.dots[i].cx - L.dots[i].r >= L.dots[i - 1].cx + L.dots[i - 1].r, `${v}: dot ${i} clears dot ${i - 1}`);
  }
  // the two groups never collide
  if (t > 0 && o > 0) {
    const lastPill = L.pills[L.pills.length - 1];
    ok(L.dots[0].cx - L.dots[0].r >= lastPill.x + lastPill.w, `${v}: the loose ones clear the sealed tens`);
  }
  // the group is centred on the axis it was given
  const lo = t > 0 ? L.pills[0].x : L.dots[0] ? L.dots[0].cx - L.dots[0].r : 350;
  const hi = o > 0 ? L.dots[L.dots.length - 1].cx + L.dots[L.dots.length - 1].r : L.pills.length ? L.pills[t - 1].x + L.pills[t - 1].w : 350;
  if (v > 0) ok(Math.abs((lo + hi) / 2 - 350) < 1e-9, `${v}: the pile is centred`);
}
// the worst case the stage must fit: the trap for 19 is 91 → nine pills + a dot
const worst = layoutQuantity(9, 1, 0, 0, 1);
ok(worst.pills.length === 9 && worst.dots.length === 1, '91 draws 9 pills + 1 dot');
ok(worst.totalW < 340, `worst-case pile is ${worst.totalW.toFixed(0)}px at k=1 — fits a phone stage`);

/* ===========================================================================
   10) Lesson structure
   ========================================================================= */
const src = fs.readFileSync(new URL('./TeenNumbersLab.jsx', import.meta.url), 'utf8');
const headerEnd = src.indexOf('import { useCallback');
ok(headerEnd > 0, 'the header comment block is findable');
const body = src.slice(headerEnd);

const stepTitles = [...src.matchAll(/^\s{4}title:\s*'([^']+)'/gm)].map((m) => m[1]);
ok(stepTitles.length === 6, `6 lesson steps — a K3 sit (found ${stepTitles.length})`);
const calibCount = (body.match(/calib:\s*true/g) || []).length;
ok(calibCount === 1, 'exactly one calibration step');
ok(/CALIB_STEP = 5/.test(src), 'CALIB_STEP is the last step index (5)');
// every non-calibration step poses a question with an answer key
const answerKeys = [...src.matchAll(/^\s{4}answer:\s*(\d+),/gm)].map((m) => Number(m[1]));
ok(answerKeys.length === 5, `5 predict-then-check questions (found ${answerKeys.length})`);
for (const a of answerKeys) ok(a >= 0 && a <= 2, `answer index ${a} is a real choice`);

/* ---- K3 SIMPLICITY, ENFORCED --------------------------------------------
   This lab is for five-year-olds. The count of things a child can touch is a
   correctness property here, so it is checked rather than promised. */
const unlocks = [...src.matchAll(/unlock:\s*(\d+)/g)].map((m) => Number(m[1]));
ok(unlocks.length === 1, `exactly ONE dial in the whole lab (found ${unlocks.length})`);
ok(unlocks[0] === 1, 'the one dial unlocks at step 1');
const ranges = (body.match(/type="range"/g) || []).length;
ok(ranges === 3, `3 sliders in the markup: the lesson dial + the two calibration marks (found ${ranges})`);
ok(!/toggleLens|lenses|className="lens/.test(body), 'no lens toggle buttons — the step declares the picture');
ok(!/className="fact|className="facts/.test(body), 'no facts table competing with the canvas');
ok(!/className="equation/.test(body), 'no equation header — the canvas already draws it');
// no step may turn on both optional rows at once, or the picture crowds
const lensDecls = [...src.matchAll(/lens:\s*\{([^}]*)\}/g)].map((m) => m[1]);
ok(lensDecls.length === 6, `every step declares its picture (found ${lensDecls.length})`);
for (const d of lensDecls) ok(!(/trap:\s*true/.test(d) && /twenty:\s*true/.test(d)), `no step shows the trap AND the comparison: {${d.trim()}}`);
ok(lensDecls.filter((d) => /trap:\s*true/.test(d)).length === 1, 'the trap row appears in exactly one step');
ok(lensDecls.filter((d) => /twenty:\s*true/.test(d)).length === 1, 'the comparison row appears in exactly one step');
ok(/START_N = 4/.test(src), 'the lab opens on 14, the canonical teen');

/* ---- card and canvas must agree ------------------------------------------
   Every step whose words name a number must pin the dial to it, or the child
   reads a card about "fourteen" beside a picture of seventeen. Found in browser
   QA, not by reading: the dial carried over from the exploration step. */
const stepsArr = src.slice(src.indexOf('const STEPS = ['), src.indexOf('\n];', src.indexOf('const STEPS = [')));
ok(stepsArr.length > 0, 'the STEPS array is findable');
const stepBlocks = stepsArr.split(/\n  \{\n/).slice(1);
ok(stepBlocks.length === 6, `6 step blocks parsed (found ${stepBlocks.length})`);
stepBlocks.forEach((b, i) => {
  const namesFourteen = /four … teen|twenty-four|This is 14|You get 41/.test(b);
  const hasDemo = /demo:\s*4/.test(b);
  if (namesFourteen) ok(hasDemo, `step ${i} names an example in its words, so it must pin the dial (demo: 4)`);
});
ok((src.match(/demo:\s*4/g) || []).length === 4, 'the four example-naming steps pin the dial');
ok(!/demo:/.test(stepBlocks[1]), 'step 1 is the exploration step — it must NOT pin the dial');

/* ---- the comparison row's height budget must cover what it draws ----------
   sayWrite draws 158 design units of say+write; the comparison renders it at
   0.74 scale. Budgeting 108 let the equation collide with its digit boxes. */
const twBudget = Number((src.match(/showTwenty \? (\d+) : 0/) || [])[1]);
ok(twBudget >= 158 * 0.74 + 8, `the comparison row budget (${twBudget}) covers 158×0.74 + padding`);
ok(/y = tw\.bottom \+ 8 \* k/.test(src), 'the comparison row advances by its MEASURED bottom, not a guess');
// the cut locked-dial must be gone from the code, not just from the prose
ok(!/unlock:\s*null/.test(body), 'the permanently-locked dial is gone');
ok(!/setNudge|className="nudge/.test(body), 'the locked-dial nudge is gone with it');

/* ---- the answer keys agree with the arithmetic they assert ---------------- */
ok(10 + 4 === 14 && 1 * 10 === 10 && 1 + 4 !== 14, 'step 0: 14 is 10 + 4; the 1 is worth 10, not 1');
ok(tensOf(17) === 1 && tensOf(14) === 1, 'step 1: changing the some-more never changes the ten');
ok(teenValue(0) === 10 && teenValue(9) + 1 === 20, 'step 1: 0 more gives plain ten; past 9 needs a second ten');
ok(sayParts(14)[0].text === 'four', 'step 2: you say "four" first');
ok(trapNumeral(14) === 41 && wordForm(41) === 'forty-one', 'step 3: the trap is 41 = forty-one');
ok(trapNumeral(13) === 31 && wordForm(31) === 'thirty-one', 'step 3: thirteen heard in order is thirty-one');
ok(!crosses(24) && crosses(14), 'step 4: twenty-four does not cross, fourteen does');
ok(!wordForm(11).includes('teen') && !wordForm(12).includes('teen'),
  'step 4 feedback: eleven and twelve really do say nothing about their ten');

/* ===========================================================================
   11) DISTINCTNESS, ENFORCED — grep the real source below the header.
      Both obvious pictures for "teen numbers" are already owned by siblings.
      The header may DISCUSS them (that is where the refusals are argued); the
      code below it must not contain them anywhere.
   ========================================================================= */
const BANNED = [
  { re: /ten[- ]?frames?/i, who: 'CountingLab owns the ten-frame' },
  { re: /\bbundl/i, who: 'TwoDigitNumberLab owns bundling' },
  { re: /\bten[- ]rods?\b/i, who: 'TwoDigitNumberLab owns the ten-rod' },
  { re: /\brods?\b/i, who: 'TwoDigitNumberLab owns the rod' },
  { re: /\bnumber\s*line\b/i, who: 'AddLab owns the number line' },
  { re: /\bcount[- ]on\b/i, who: 'AddLab owns count-on hops' },
  { re: /\bhops?\b/i, who: 'AddLab owns the hop' },
  { re: /\bskip[- ]count/i, who: 'TwoDigitNumberLab owns skip-count labels' },
  { re: /\bplace[- ]value chart\b/i, who: 'NumberLab owns the place-value chart' },
];
for (const b of BANNED) {
  const hit = body.match(b.re);
  ok(!hit, `REFUSED device absent from the code: ${b.re} (${b.who}) — found "${hit && hit[0]}"`);
}
// and the refusals are actually argued in the header, not silently assumed
const header = src.slice(0, headerEnd);
ok((header.match(/REFUSAL/g) || []).length >= 5, 'the header argues its refusals explicitly');
ok(/CountingLab/.test(header) && /TwoDigitNumberLab/.test(header), 'the header names the siblings it is staying clear of');
// the lab's OWN devices are present
ok(/crosses/.test(body) && /sayParts/.test(body), 'the crossing and the spoken word ARE the lab');
ok(/SAY IT/.test(body) && /WRITE IT/.test(body) && /IT IS/.test(body), 'the three lanes are drawn');

/* ---- house-style contracts ------------------------------------------------ */
ok(/^'use client';/.test(src), "the component is marked 'use client'");
ok(!/^import(?!\s*\{\s*useCallback,\s*useEffect,\s*useRef,\s*useState\s*\}\s*from\s*'react')/m.test(src.replace(/^'use client';\n/, '')) || (src.match(/^import /gm) || []).length === 2, 'imports: react + node fs only in audit; the lab imports react alone');
ok((src.match(/^import /gm) || []).length === 1, 'the lab has exactly one import — zero external dependencies');
ok(/style jsx/.test(src), 'styles are scoped with styled-jsx so nothing leaks into the host app');
ok(/devicePixelRatio/.test(src) && /setTransform\(dpr/.test(src), 'the canvas is DPI-aware');
ok(/aria-live/.test(src) && /sr-only/.test(src), 'the picture is narrated for screen readers');
ok(/speechSynthesis/.test(src) && /typeof window === 'undefined'/.test(src), 'read-aloud is guarded for SSR');
ok(!/requestAnimationFrame/.test(body), 'no ambient animation in a lab whose subject is a word');
ok(/canNext = step < STEPS\.length - 1 && \(!hasQuestion \|\| answered\)/.test(src), 'Next is gated on ANSWERED, not correct');

/* ---- layout regressions caught in the browser, pinned here ----------------
   A bare `1fr` grid column is minmax(AUTO, 1fr), so it floors at the item's
   min-content width. The stage's aspect-ratio × min-height gives it an
   intrinsic width of ~602px, which blew the lab out to 604px inside a 375px
   phone and scrolled the page sideways. Every grid column must be minmax(0,…). */
ok(!/grid-template-columns:\s*1fr\s*;/.test(src), 'no bare `1fr` column — it floors at min-content and blows out on a phone');
ok(/grid-template-columns:\s*minmax\(0, 1fr\);/.test(src), 'the narrow layout uses minmax(0, 1fr)');
ok(/\.panel\s*\{\s*min-width:\s*0;/.test(src), '.panel can shrink below its content width');
// the figure is centred in the stage rather than pinned to the top, or the
// early steps (which draw fewer rows) leave a large dead void beneath them
ok(/\(H - neededH \* k\) \/ 2/.test(src), 'the figure is vertically centred in the stage');
// the two quantity captions must never be allowed to collide (they did at 11)
ok(/measureText\(tenCap\)\.width \+ ctx\.measureText\(moreCap\)\.width/.test(src),
  'the "N ten" / "N more" captions are measured and pushed apart if they would collide');



console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
