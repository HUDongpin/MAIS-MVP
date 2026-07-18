/* Numeric + structural audit for NumberBondLab — run: node audit-numberbond.mjs

   Two jobs, and the second one is the unusual one.

   1) MATH. Verify the mathematics the lab teaches is exactly correct across
      EVERY reachable dial state, and that the CALIBRATED stamp is provably
      impossible to fire falsely — proved here by exhaustive subset sweep, not
      by spot checks.

   2) DISTINCTNESS. This lab sits in the most crowded corner of the library
      (AddLab, SubtractionLab, CountingLab, CommutativeLab all border it), and
      it earns its place by REFUSING their devices: no number-line hops, no
      ten-frame, no Swap button, and above all no q dial. Those refusals are
      enforced HERE, by stripping this file's comments and grepping the code —
      because a distinctness promise written only in a comment is a promise the
      next edit will quietly break.

   The model functions are EXTRACTED FROM THE SHIPPED .jsx AND EVALUATED, not
   re-typed here. An audit that re-implements the model only proves the copy is
   self-consistent; this one tests the code that actually runs. */

import fs from 'node:fs';

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

const SRC_PATH = new URL('./NumberBondLab.jsx', import.meta.url);
const src = fs.readFileSync(SRC_PATH, 'utf8');

/* ---------------------------------------------------------------------------
   Extraction — pull the real functions out of the real component.
   ------------------------------------------------------------------------- */
function matchBraces(s, from) {
  let depth = 0;
  for (let j = from; j < s.length; j++) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}') {
      depth--;
      if (depth === 0) return j + 1;
    }
  }
  throw new Error('unbalanced braces from ' + from);
}
function extractFn(name) {
  const m = new RegExp(`function\\s+${name}\\s*\\(`).exec(src);
  if (!m) throw new Error('function not found in source: ' + name);
  return src.slice(m.index, matchBraces(src, src.indexOf('{', m.index)));
}
function extractConst(name) {
  const m = new RegExp(`const\\s+${name}\\s*=`).exec(src);
  if (!m) throw new Error('const not found in source: ' + name);
  let depth = 0;
  for (let j = m.index; j < src.length; j++) {
    const c = src[j];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ';' && depth === 0) return src.slice(m.index, j + 1);
  }
  throw new Error('unterminated const: ' + name);
}

const bundle = [
  extractConst('N_MIN'),
  extractConst('N_MAX'),
  extractConst('PARAMS'),
  extractConst('START'),
  extractConst('STEPS'),
  extractFn('otherPart'),
  extractFn('bondsOf'),
  extractFn('bondCount'),
  extractFn('partnerOfTen'),
  extractConst('matchPercent'),
  extractConst('isCalibrated'),
  extractFn('makeTarget'),
].join('\n');

const M = eval(
  `(function(){ ${bundle}
     return { N_MIN, N_MAX, PARAMS, START, STEPS, otherPart, bondsOf, bondCount,
              partnerOfTen, matchPercent, isCalibrated, makeTarget }; })()`
);

/* ===========================================================================
   PART A — DISTINCTNESS. Grep the code (comments stripped) for the devices
   this lab is not allowed to own, because a sibling already owns them.
   =========================================================================== */
function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments (incl. the file header)
    .replace(/^\s*\/\/.*$/gm, ' '); // whole-line comments
}
const code = stripComments(src);

ok(!/\/\*/.test(code) && !/\*\//.test(code), 'comment stripper consumed every block comment');

/* A1 — the load-bearing one: q is NOT a dial. The bond cannot be broken
        because there is no control that could break it. */
ok(
  Array.isArray(M.PARAMS) && M.PARAMS.length === 2,
  'exactly two dials'
);
ok(
  M.PARAMS.map((d) => d.key).join(',') === 'N,p',
  `dials are exactly N and p (got: ${M.PARAMS.map((d) => d.key).join(',')})`
);
ok(!M.PARAMS.some((d) => d.key === 'q'), 'there is no q dial');
ok(!/setQ\s*\(/.test(code), 'q is never assigned — it is computed');
ok(!/const\s*\[\s*q\s*,/.test(code), 'q is not React state');
ok(/const\s+q\s*=\s*otherPart\s*\(/.test(code), 'q is derived via otherPart(N, p)');

/* A2 — no Swap button. AddLab, CommutativeLab and MultiplicationLab own the
        turn-around as a button; here it is re-aimed onto the fan's mirror. */
ok(!/↔/.test(code), 'no ↔ glyph (the sibling Swap-button signature)');
ok(!/(const|function)\s+swap\b/.test(code), 'no swap handler');
ok(!/>\s*Swap\b/.test(code), 'no Swap button label');

/* A3 — no number line. AddLab and SubtractionLab own the 0..20 line, its
        ticks, its adaptive labels and its hops. */
ok(!/drawHop\b/.test(code), "no drawHop (AddLab's count-on hop renderer)");
ok(!/labelStride|labelStep/.test(code), 'no adaptive number-line label density');
ok(!/nearMajor\b/.test(code), 'no number-line landmark logic');

/* A4 — no ten-frame. CountingLab and TwoDigitNumberLab own it. */
ok(!/ten[-_]?frame/i.test(code), 'no ten-frame in the code');
ok(!/tenFrame/.test(code), 'no tenFrame renderer');

/* A5 — the equation is WHOLE-FIRST (N = p + q), the form CCSS K.OA.A.3 uses
        and the inverse of AddLab's `a + b = sum`. */
const eqBlock = /function BondEquation[\s\S]*?\n}/.exec(code);
ok(!!eqBlock, 'BondEquation exists');
if (eqBlock) {
  const e = eqBlock[0];
  const iWhole = e.indexOf('t-whole');
  const iP = e.indexOf('t-p');
  const iQ = e.indexOf('t-q');
  ok(iWhole > -1 && iP > -1 && iQ > -1, 'equation renders whole, p and q');
  ok(iWhole < iP && iP < iQ, 'equation is whole-first: N = p + q (not p + q = N)');
}

/* A6 — RESTRAINT. The audience is five years old, and the first draft of this
        lab put the number q on screen four times over. These greps keep the
        clutter from creeping back one well-meaning readout at a time. */
ok(!/className="facts"/.test(code), 'no facts grid — the picture already says all four');
ok(!/equation-sub/.test(code), 'no mirrored second equation — the fan shows the mirror');
ok(!/ghost-dial|qbar/.test(code), 'no q readout in a dial slot — q is absent, not displayed');
ok(!/sweep/i.test(code), 'no sweep animation — this lab is a fan, not a walk');
ok(!/requestAnimationFrame/.test(code), 'no rAF loop at all — the fan is complete on arrival');
{
  // q must be PRINTED in exactly one place: the equation. `q={q}` is passing
  // the prop into BondEquation, not a second copy on screen, so it does not
  // count — hence the lookbehind.
  const qRenders = (code.match(/(?<!q=)\{q\}/g) || []).length;
  ok(qRenders === 1, `q is printed exactly once, in the equation (found ${qRenders})`);
}
{
  // The toolbar is two buttons: the fan lens, and Reset.
  const toolbar = /<div className="toolbar">[\s\S]*?<\/div>/.exec(code);
  ok(!!toolbar, 'toolbar exists');
  if (toolbar) {
    const n = (toolbar[0].match(/<button/g) || []).length;
    ok(n === 2, `toolbar holds exactly 2 buttons for a K audience (found ${n})`);
  }
}

/* ===========================================================================
   PART B — THE MODEL. Exhaustive over every reachable (N, p).
   =========================================================================== */
for (let N = M.N_MIN; N <= M.N_MAX; N++) {
  const bonds = M.bondsOf(N);

  ok(bonds.length === N + 1, `N=${N} has exactly N+1 = ${N + 1} bonds`);
  ok(M.bondCount(N) === N + 1, `bondCount(${N}) === ${N + 1}`);
  ok(M.bondCount(N) === bonds.length, `bondCount agrees with bondsOf for N=${N}`);

  for (let p = 0; p <= N; p++) {
    const q = M.otherPart(N, p);

    /* the invariant the entire lab rests on */
    ok(p + q === N, `conservation: ${p} + ${q} === ${N}`);
    ok(Number.isInteger(q), `q integer for N=${N}, p=${p}`);
    ok(q >= 0 && q <= N, `q in [0,N] for N=${N}, p=${p}`);
    ok(p >= 0 && p <= N, `p in [0,N] for N=${N}, p=${p}`);

    /* the seesaw the step-2 question tests: cut right by one hands exactly one
       counter across, and the whole does not notice */
    if (p < N) {
      const qNext = M.otherPart(N, p + 1);
      ok(qNext === q - 1, `seesaw: p ${p}→${p + 1} sends q ${q}→${q - 1} (N=${N})`);
      ok(p + 1 + qNext === N, `seesaw conserves the whole (N=${N}, p=${p})`);
    }

    /* the fan row must agree with the tray */
    ok(bonds[p][0] === p && bonds[p][1] === q, `fan row ${p} matches the cut (N=${N})`);
  }

  /* every fan row is the same whole — this is the picture's whole claim */
  for (const [a, b] of bonds) ok(a + b === N, `fan row ${a}+${b} makes ${N}`);

  /* the cut positions are 0..N, each exactly once, in order — "you can see
     none is missing" is only true if this holds */
  const cuts = bonds.map(([a]) => a);
  ok(new Set(cuts).size === cuts.length, `N=${N} fan rows are distinct`);
  ok(cuts.every((v, i) => v === i), `N=${N} fan cuts ascend 0..N with no gaps`);

  /* the mirror — the fan is symmetric, which is where this lab puts the
     turn-around rule instead of a Swap button */
  for (let i = 0; i <= N; i++) {
    const [a, b] = bonds[i];
    const [c, d] = bonds[N - i];
    ok(a === d && b === c, `mirror: row ${i} (${a}+${b}) flips row ${N - i} (${c}+${d}), N=${N}`);
  }

  /* zero is a legal part at both ends — the most-forgotten bonds */
  ok(bonds[0][0] === 0 && bonds[0][1] === N, `N=${N} includes 0 + ${N}`);
  ok(bonds[N][0] === N && bonds[N][1] === 0, `N=${N} includes ${N} + 0`);
}

/* the partners of ten (K.OA.A.4) */
for (let p = 0; p <= 10; p++) {
  ok(M.partnerOfTen(p) + p === 10, `partner of ${p} makes ten`);
  ok(M.partnerOfTen(M.partnerOfTen(p)) === p, `partnering is its own inverse at ${p}`);
}
ok(M.partnerOfTen(5) === 5, 'five partners itself — the fan’s mirror line');
ok(M.bondCount(10) === 11, 'ten has 11 bonds');

/* ===========================================================================
   PART C — CALIBRATION. The stamp must be impossible to fire falsely, and
   this is proved EXHAUSTIVELY: every subset of every target's bond family.
   =========================================================================== */
for (let N = 4; N <= 10; N++) {
  const rows = N + 1;
  const full = rows;
  let seen = 0;
  for (let mask = 0; mask < 1 << rows; mask++) {
    const recorded = [];
    for (let j = 0; j < rows; j++) if (mask & (1 << j)) recorded.push(j);
    seen++;

    const complete = recorded.length === full;
    const stamped = M.isCalibrated(recorded, N);
    ok(stamped === complete, `N=${N} mask ${mask}: stamp iff complete`);

    const pct = M.matchPercent(recorded, N);
    ok(
      Math.abs(pct - (100 * recorded.length) / rows) < 1e-9,
      `N=${N} mask ${mask}: meter is found/total`
    );
    ok(pct <= 100 + 1e-9, `N=${N} mask ${mask}: meter never exceeds 100`);
    ok((pct === 100) === complete, `N=${N} mask ${mask}: 100% iff complete`);
    if (!complete) ok(!stamped, `N=${N} mask ${mask}: incomplete never stamps`);
  }
  ok(seen === 1 << rows, `N=${N}: swept all ${1 << rows} subsets`);

  /* miss exactly one — the near-miss that must never stamp */
  for (let drop = 0; drop <= N; drop++) {
    const nearly = [];
    for (let j = 0; j <= N; j++) if (j !== drop) nearly.push(j);
    ok(!M.isCalibrated(nearly, N), `N=${N}: missing only ${drop} does not stamp`);
    ok(M.matchPercent(nearly, N) < 100, `N=${N}: missing only ${drop} reads < 100%`);
  }

  /* duplicates must not inflate the meter into a false stamp */
  const dupes = new Array(N + 1).fill(0); // recorded "0" N+1 times
  ok(!M.isCalibrated(dupes, N), `N=${N}: N+1 duplicates do not stamp`);

  /* out-of-range entries must not stamp even at the right length */
  const bad = [];
  for (let j = 0; j < N; j++) bad.push(j);
  bad.push(N + 5); // impossible cut
  ok(!M.isCalibrated(bad, N), `N=${N}: an out-of-range cut does not stamp`);

  /* the honest completion does stamp */
  const all = [];
  for (let j = 0; j <= N; j++) all.push(j);
  ok(M.isCalibrated(all, N), `N=${N}: the full family stamps`);
  ok(M.matchPercent(all, N) === 100, `N=${N}: the full family reads 100%`);
}

/* makeTarget stays in range and never repeats the previous target */
{
  let prev = null;
  for (let i = 0; i < 6000; i++) {
    const t = M.makeTarget(prev);
    ok(Number.isInteger(t) && t >= 4 && t <= 10, `makeTarget in [4,10] (got ${t})`);
    if (prev != null) ok(t !== prev, 'makeTarget never repeats the previous target');
    prev = t;
  }
  // every target is a whole the N dial can actually hold
  for (let t = 4; t <= 10; t++) ok(t >= M.N_MIN && t <= M.N_MAX, `target ${t} is dialable`);
}

/* ===========================================================================
   PART D — THE LESSON. Every claim the tutor makes must be arithmetically true,
   and every step must be well-formed.
   =========================================================================== */
ok(M.STEPS.length === 7, 'seven steps');
ok(M.START.N === 5 && M.START.p === 2, 'opens on 5 = 2 + 3, the CCSS K.OA.A.3 example');
ok(M.otherPart(M.START.N, M.START.p) === 3, 'the opening bond really is 5 = 2 + 3');

M.STEPS.forEach((s, i) => {
  ok(typeof s.title === 'string' && s.title.length > 0, `step ${i} has a title`);
  ok(typeof s.body === 'string' && s.body.length > 0, `step ${i} has a body`);
  if (s.calib) {
    ok(i === M.STEPS.length - 1, 'the calibration step is last');
    ok(!s.q, 'the calibration step has no quiz');
  } else {
    ok(typeof s.q === 'string' && s.q.length > 0, `step ${i} poses a question`);
    ok(Array.isArray(s.choices) && s.choices.length >= 3, `step ${i} has 3+ choices`);
    ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length,
      `step ${i} answer key indexes a real choice`);
    ok(typeof s.feedback === 'string' && s.feedback.length > 0, `step ${i} has feedback`);
    ok(s.answer === 0, `step ${i} keeps the house convention (correct choice first)`);
    ok(new Set(s.choices).size === s.choices.length, `step ${i} choices are distinct`);
  }
});
ok(M.STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');

/* the arithmetic asserted inside each step's copy */
ok(2 + 3 === 5, 'step 0: 5 = 2 + 3');
ok(M.bondsOf(8).length === 9 && M.otherPart(8, 8) === 0, 'step 1: a whole of 8 holds 8 counters');
ok(M.otherPart(6, 2) === 4, 'step 2: 6 = 2 + 4 before the slide');
ok(M.otherPart(6, 3) === 3, 'step 2 key: sliding the cut to 3 gives 6 = 3 + 3');
ok(3 + 4 !== 6, 'step 2 distractor "6 = 3 + 4" is genuinely false');
ok(3 + 5 !== 6, 'step 2 distractor "6 = 3 + 5" is genuinely false');
ok(M.otherPart(7, 0) === 7, 'step 3 key: 7 = 0 + 7 is a true bond');
ok(3 + 5 !== 7, 'step 3 distractor "7 = 3 + 5" is false (it makes 8)');
ok(7 + 7 !== 7, 'step 3 distractor "7 = 7 + 7" is false (it makes 14)');
ok(M.bondCount(5) === 6, 'step 4 key: a whole of 5 can be cut 6 ways');
ok(M.bondCount(5) !== 5 && M.bondCount(5) !== 3, 'step 4 distractors (5, 3) are wrong');
ok(M.partnerOfTen(7) === 3, 'step 5 key: 7’s partner to ten is 3');
ok(M.partnerOfTen(7) !== 17 && M.partnerOfTen(7) !== 4, 'step 5 distractors (17, 4) are wrong');

/* the make-a-ten claim in step 5's feedback: 8 + 5 via 8's partner */
ok(M.partnerOfTen(8) === 2 && 8 + 2 === 10 && 5 - 2 === 3 && 10 + 3 === 13,
  'step 5 feedback: 8 + 5 = 13 via the partner of 8');

/* the ten-partner list the feedback reads off the gold fan */
[[0, 10], [1, 9], [2, 8], [3, 7], [4, 6], [5, 5]].forEach(([a, b]) =>
  ok(a + b === 10, `ten-partner pair ${a} & ${b}`)
);

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
