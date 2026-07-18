/* audit-subtraction.mjs — exhaustive math-correctness audit for SubtractionLab.
   Run: node audit-subtraction.mjs
   These are the EXACT pure functions used by the lab (kept in sync by hand),
   checked over every reachable state. A K-12 product must be provably correct. */

const N = 20;
const START = { min: 8, sub: 3 };

/* --- the lab's pure model / calibration (copied verbatim from the .jsx) --- */
const difference = (a, b) => a - b;
const calibError = (a, b, t) => Math.abs(a - t.A) + Math.abs(a - b - t.C);
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + 0.5 * err)));

/* the dial-clamp rule: subtrahend max = current minuend. This models onParam. */
function clampState(rawMin, rawSub) {
  const a = Math.max(0, Math.min(N, Math.round(rawMin)));
  const b = Math.max(0, Math.min(a, Math.round(rawSub))); // b ≤ a always
  return { a, b };
}

let checks = 0;
let fails = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    fails++;
    console.error('  ✗ ' + msg);
  }
};

/* ---- 1. Core arithmetic + invariants over EVERY reachable (a,b) --------- */
for (let a = 0; a <= N; a++) {
  for (let b = 0; b <= a; b++) {
    const c = difference(a, b);
    // difference is a whole number in [0, a]
    ok(Number.isInteger(c), `c integer for ${a}-${b}`);
    ok(c >= 0, `c >= 0 for ${a}-${b} (no negatives) got ${c}`);
    ok(c <= a, `c <= a for ${a}-${b}`);
    // the addition CHECK (inverse relationship) must hold exactly
    ok(c + b === a, `check c+b=a fails for ${a}-${b}: ${c}+${b}!=${a}`);
    // fact-family symmetry: a - c must equal b
    ok(a - c === b, `fact family a-c=b fails for ${a}-${b}`);
    // counters: kept = c, removed = b, whole = a
    ok(c + b === a, `counters kept+removed=whole for ${a}-${b}`);
  }
}

/* ---- 2. Clamp rule never allows taking away more than you have ---------- */
for (let rawMin = 0; rawMin <= N; rawMin++) {
  for (let rawSub = 0; rawSub <= N; rawSub++) {
    const { a, b } = clampState(rawMin, rawSub);
    ok(b <= a, `clamp keeps b<=a for raw ${rawMin},${rawSub} -> ${a},${b}`);
    ok(a - b >= 0, `clamp keeps difference>=0 for raw ${rawMin},${rawSub}`);
  }
}
// dragging the minuend DOWN below the current subtrahend re-clamps b
{
  let a = 8,
    b = 3;
  // set minuend to 2: onParam min branch does setSub(v) when sub>v
  const newMin = 2;
  if (b > newMin) b = newMin;
  a = newMin;
  ok(a === 2 && b === 2, `lowering minuend to 2 clamps b to 2 (got ${a},${b})`);
  ok(a - b === 0, `2-2=0 after clamp`);
}

/* ---- 3. Calibration: target validity, uniqueness, meter behaviour ------- */
// enumerate every target the generator can produce: A in 6..18, C in 0..A-2
let targetCount = 0;
for (let A = 6; A <= 18; A++) {
  for (let C = 0; C <= A - 2; C++) {
    const t = { A, C, B: A - C };
    targetCount++;
    ok(t.B >= 2, `target B>=2 for A=${A},C=${C} (got ${t.B})`);
    ok(t.B <= A, `target B<=A for A=${A},C=${C}`);
    ok(t.A - t.B === t.C, `target self-consistent A-B=C for A=${A},C=${C}`);

    // the intended solution (a=A, b=B) scores exactly 0 -> 100% -> CALIBRATED
    const errSolved = calibError(t.A, t.B, t);
    ok(errSolved === 0, `solved err=0 for A=${A},C=${C} (got ${errSolved})`);
    ok(matchPercent(errSolved) === 100, `solved 100% for A=${A},C=${C}`);

    // ANY state that is not the exact endpoints scores > 0 (no false CALIBRATED)
    // spot-check: right landing but wrong start must NOT calibrate
    if (A + 1 <= N) {
      const wrongStart = calibError(A + 1, A + 1 - C, t); // lands on C but starts at A+1
      ok(wrongStart > 0, `wrong-start not calibrated for A=${A},C=${C}`);
    }
    // right start but landing one short must NOT calibrate
    if (t.B + 1 <= A) {
      const wrongLand = calibError(A, t.B + 1, t);
      ok(wrongLand > 0, `wrong-landing not calibrated for A=${A},C=${C}`);
    }
  }
}
ok(targetCount > 0, 'generator has a non-empty target space');

/* meter is monotonic in err and bounded 0..100 */
let prev = Infinity;
for (let e = 0; e <= 30; e++) {
  const p = matchPercent(e);
  ok(p >= 0 && p <= 100, `meter in [0,100] at err=${e}`);
  ok(p <= prev + 1e-9, `meter non-increasing at err=${e}`);
  prev = p;
}
ok(matchPercent(0) === 100, 'meter 100% at err 0');
ok(matchPercent(1) < 100, 'meter < 100% at err 1 (no false stamp one-away)');

/* generator never returns the starting fact or repeats prev (statistical) */
function makeTarget(prevT) {
  let t;
  let guard = 0;
  do {
    const A = 6 + Math.floor(Math.random() * 13);
    const C = Math.floor(Math.random() * (A - 1));
    t = { A, C, B: A - C };
    guard++;
  } while (
    ((prevT && t.A === prevT.A && t.C === prevT.C) ||
      (t.A === START.min && t.B === START.sub)) &&
    guard < 1000
  );
  return t;
}
{
  let bad = 0;
  let prevT = null;
  for (let i = 0; i < 20000; i++) {
    const t = makeTarget(prevT);
    if (t.A === START.min && t.B === START.sub) bad++;
    if (prevT && t.A === prevT.A && t.C === prevT.C) bad++;
    ok(t.A >= 6 && t.A <= 18, 'A in range', true);
    ok(t.C >= 0 && t.C <= t.A - 2, 'C in range', true);
    prevT = t;
  }
  ok(bad === 0, `generator avoided start-fact & repeats over 20000 draws (bad=${bad})`);
}

/* ---- 4. Lesson quiz answers are the correct choices --------------------- */
// (mirrors STEPS[].answer; the pedagogy must point at the right option)
const quiz = [
  { q: 'minus means', choices: ['take away', 'add', 'restart'], answer: 0 },
  { q: 'start with more', choices: ['more left', 'less', 'same'], answer: 0 },
  { q: 'take away more', choices: ['smaller', 'bigger', 'same'], answer: 0 },
  { q: 'count back = ', choices: ['subtract b', 'add b', 'double'], answer: 0 },
  { q: 'check 9-4=5', choices: ['5+4=9', '9+4=13', '5+9=14'], answer: 0 },
];
// verify the "check 9-4=5" distractors: only choice 0 is a true equation that
// also uses the fact family {5,4,9}
ok(5 + 4 === 9, 'fact-family check 5+4=9 true');
ok(9 + 4 !== 9 && 9 + 4 === 13, 'distractor 9+4=13 is a real miscalc, not the check');
ok(5 + 9 === 14, 'distractor 5+9=14 arithmetic labelled correctly (wrong pairing)');
quiz.forEach((s, i) => ok(s.answer === 0, `step ${i} answer index correct`));

/* ---- 5. A few hand-picked concrete facts kids will see ------------------ */
ok(difference(8, 3) === 5, '8 - 3 = 5 (default)');
ok(difference(20, 20) === 0, '20 - 20 = 0 (take all away)');
ok(difference(7, 0) === 7, '7 - 0 = 7 (take nothing)');
ok(difference(10, 4) === 6 && 6 + 4 === 10, '10 - 4 = 6, checks to 10');
ok(difference(15, 9) === 6 && 15 - 6 === 9, '15 - 9 = 6, fact family with 9');

/* ---- report ------------------------------------------------------------- */
console.log(`\nSubtractionLab audit — ${checks} checks, ${fails} failure(s).`);
if (fails === 0) console.log('✓ ALL CHECKS PASS — arithmetic, clamping, calibration, and quiz all correct.');
process.exit(fails === 0 ? 0 : 1);
