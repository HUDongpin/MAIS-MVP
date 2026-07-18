/* ============================================================================
   audit-twostep.mjs — the numeric audit for TwoStepLab.jsx.

   Run:  node audit-twostep.mjs

   Slices the pure model out of TwoStepLab.jsx (between MODEL:START and
   MODEL:END) and evaluates it, so the code under test is the code that ships.

   The load-bearing claim is THE BAND THEOREM, which the whole lab rests on:

        |answer − estimate| ≤ 10   for EVERY story this lab can generate

   because rounding each of T and m to the nearest ten moves it by at most 5.
   That makes the band [est−10, est+10] guaranteed to contain the true answer,
   which is what licenses the lab's actual teaching point — the contrapositive:
   an answer OUTSIDE the band is wrong. If the theorem failed for even one
   story, the lab would be teaching a check that can reject a correct answer,
   which is worse than teaching no check at all. So it is proved exhaustively,
   over the entire dial grid, and the tightness (that 10 is not slack) is proved
   too — a bound nobody ever reaches is a bound nobody should trust.

   It also proves the lab is HONEST about the detector's limits: the lesson may
   only claim the halfway number is "caught" when halfwayCaught() actually
   fires, and there really do exist stories where it slips through.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./TwoStepLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'PER_CRATE', 'PARAMS', 'START', 'STEPS', 'BAND',
  'stepOne', 'stepTwo', 'solve', 'equationOf', 'roundTen', 'estimateOf', 'bandOf',
  'inBand', 'halfwayCaught', 'makeTarget', 'isCalibrated', 'isHalfway',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  const NS = []; for (let n = 6; n <= 9; n++) NS.push(n);
  const MS = []; for (let m = 12; m <= 30; m++) MS.push(m);

  /* === 1. the dials, and the ranges that keep the story sensible ======== */
  {
    const p = Object.fromEntries(M.PARAMS.map((x) => [x.key, x]));
    ok(M.PARAMS.length === 2, 'a grade-3 lab gets TWO dials, not more');
    ok(p.n.min === 6 && p.n.max === 9, 'crates run 6…9');
    ok(p.m.min === 12 && p.m.max === 30, 'sold runs 12…30');
    ok(p.n.step === 1 && p.m.step === 1, 'both dials are whole numbers — bottles are not fractional');
    ok(p.n.unlock < p.m.unlock, 'step one unlocks before step two — the chain is taught in order');
    ok(M.PER_CRATE === 6, 'six bottles per crate');
    // THE RANGE GUARANTEE: the shop can never sell more than it has
    ok(p.n.min * M.PER_CRATE > p.m.max,
      'the ranges must make the answer POSITIVE for every story (6·n_min > m_max)');
  }

  /* === 2. the chain: whole numbers, right order, positive answers ======= */
  for (const n of NS) {
    for (const m of MS) {
      const s = M.solve(n, m);
      ok(s.halfway === M.PER_CRATE * n, `halfway = 6·n (n=${n})`);
      ok(s.answer === M.PER_CRATE * n - m, `answer = 6n − m (n=${n}, m=${m})`);
      ok(Number.isInteger(s.halfway) && Number.isInteger(s.answer),
        `whole bottles only (n=${n}, m=${m})`);
      ok(s.answer > 0, `the answer must be positive (n=${n}, m=${m}, got ${s.answer})`);
      ok(s.answer !== s.halfway,
        `the halfway number must never EQUAL the answer, or the trap vanishes (n=${n}, m=${m})`);
      ok(s.answer < s.halfway, 'selling reduces the count');
      ok(M.stepTwo(M.stepOne(n), m) === s.answer, 'solve() is exactly stepOne then stepTwo');
      // the equation the standard asks for names both numbers and a letter
      const eq = M.equationOf(n, m);
      ok(eq.includes('b =') && eq.includes(String(n)) && eq.includes(String(m)),
        `the equation uses a letter for the unknown and both numbers (n=${n}, m=${m}): ${eq}`);
    }
  }

  /* === 3. THE BAND THEOREM — the claim the whole lab rests on ===========
     |answer − estimate| ≤ 10, for every story. Proved exhaustively. */
  let worst = 0;
  for (const n of NS) {
    for (const m of MS) {
      const { answer } = M.solve(n, m);
      const b = M.bandOf(n, m);
      const err = Math.abs(answer - b.est);
      worst = Math.max(worst, err);
      ok(err <= M.BAND,
        `BAND THEOREM: |answer − estimate| ≤ ${M.BAND} (n=${n}, m=${m}: |${answer} − ${b.est}| = ${err})`);
      ok(M.inBand(answer, n, m),
        `the true answer must ALWAYS be inside the band — a check that rejects a correct answer is ` +
        `worse than no check (n=${n}, m=${m})`);
      ok(b.lo === b.est - M.BAND && b.hi === b.est + M.BAND, 'the band is est ± 10');
      ok(b.lo < b.hi, 'the band is non-empty');
      // rounding moves each number by at most 5 — the theorem's two halves
      ok(Math.abs(M.stepOne(n) - M.roundTen(M.stepOne(n))) <= 5, `rounding T moves it ≤ 5 (n=${n})`);
      ok(Math.abs(m - M.roundTen(m)) <= 5, `rounding m moves it ≤ 5 (m=${m})`);
      ok(b.est === M.roundTen(M.stepOne(n)) - M.roundTen(m), 'the estimate is the rounded two-step');
    }
  }
  // TIGHTNESS: a bound nobody reaches is a bound nobody should trust. If the
  // worst case were far below 10, the band would be needlessly wide and the
  // detector needlessly blunt.
  ok(worst >= 8, `the ±${M.BAND} bound must be nearly tight — worst observed error was ${worst}`);
  ok(worst <= M.BAND, `and never exceeded (worst ${worst})`);

  /* === 4. roundTen is really round-to-nearest-ten ======================= */
  for (let v = 0; v <= 120; v++) {
    const r = M.roundTen(v);
    ok(r % 10 === 0, `roundTen(${v}) lands on a ten`);
    ok(Math.abs(v - r) <= 5, `roundTen(${v}) moves by at most 5`);
  }

  /* === 5. HONESTY — the detector's limits are real and reported =========
     The lab claims the estimate catches the halfway number. That is true only
     when step two is big enough. halfwayCaught() must say so exactly, and the
     canvas prints "caught!" / "slips through" from it — so it can never claim
     a catch that did not happen. */
  {
    let caught = 0, slipped = 0;
    for (const n of NS) for (const m of MS) {
      const { halfway } = M.solve(n, m);
      const fires = M.halfwayCaught(n, m);
      ok(fires === !M.inBand(halfway, n, m), `halfwayCaught ⟺ the halfway number is outside the band (n=${n}, m=${m})`);
      if (fires) caught++; else slipped++;
    }
    ok(caught > 0, 'the detector must actually fire on some stories, or the lesson is a lie');
    ok(slipped > 0,
      'and there must exist stories where it SLIPS THROUGH — the lab admits this in step 4, ' +
      'so if it never happened the lab would be over-honest about a limit it does not have');
    // the lesson's own worked case must be one where it fires
    ok(M.halfwayCaught(M.START.n, M.START.m),
      `START (n=${M.START.n}, m=${M.START.m}) must be a story where the detector FIRES — step 4 ` +
      `claims "36 is outside the band", and the default must back that up`);
  }

  /* === 6. the lesson's stated arithmetic is the model's ================= */
  {
    ok(M.STEPS.length === 5, 'five steps');
    const byFocus = Object.fromEntries(M.STEPS.map((s) => [s.focus, s]));
    for (const k of ['meet', 'one', 'two', 'check', 'calib']) ok(!!byFocus[k], `has '${k}' step`);
    for (const s of M.STEPS) {
      if (s.calib) { ok(!s.q, 'the calib step asks no multiple-choice question'); continue; }
      ok(s.choices.length === 3 && s.answer >= 0 && s.answer < 3, `'${s.focus}': a real answer key`);
    }
    // START is the story the lesson talks through: 6 crates, 24 sold
    const s = M.solve(M.START.n, M.START.m);
    ok(s.halfway === 36, "step 2 says 36 arrived — START must really give 36");
    ok(s.answer === 12, "step 3 says 12 are left — START must really give 12");
    ok(byFocus.one.choices[byFocus.one.answer] === '36', "step 2's answer key is 36");
    ok(byFocus.two.choices[byFocus.two.answer].includes('12'), "step 3's answer key names 12");
    const b = M.bandOf(M.START.n, M.START.m);
    ok(b.est === 20, `step 4 says "about 20 left" — the model must agree (got ${b.est})`);
    ok(!M.inBand(36, M.START.n, M.START.m), "step 4 claims 36 is outside the band — it must be");
    ok(M.inBand(12, M.START.n, M.START.m), 'and the true answer 12 is inside it');
  }

  /* === 7. calibration: exact, and the halfway wrong-answer is named ===== */
  {
    const rand = rng(3);
    let prev = null;
    for (let i = 0; i < 3000; i++) {
      const t = M.makeTarget(prev, rand);
      ok(NS.includes(t.n) && MS.includes(t.m), `target (n=${t.n}, m=${t.m}) is on the dials`);
      const s = M.solve(t.n, t.m);
      ok(M.isCalibrated(s.answer, t.n, t.m), 'the true answer stamps');
      ok(!M.isCalibrated(s.halfway, t.n, t.m), 'the HALFWAY number must never stamp');
      ok(M.isHalfway(s.halfway, t.n, t.m), 'and it is recognised as the halfway number, so it can be named');
      ok(!M.isHalfway(s.answer, t.n, t.m), 'the true answer is not the halfway number');
      if (prev) ok(!(t.n === prev.n && t.m === prev.m), 'makeTarget never repeats');
      prev = t;
    }
    // no false stamp anywhere on the grid
    for (const n of NS) for (const m of MS) {
      const s = M.solve(n, m);
      for (let g = 0; g <= 60; g++) {
        ok(M.isCalibrated(g, n, m) === (g === s.answer),
          `stamp ⟺ the exact answer (n=${n}, m=${m}, guess=${g})`);
      }
    }
  }

  /* === 8. DISTINCTNESS — refusals, grepped from the CODE (comments may
     name what they refuse; see audit-comparefunctions for why). ========== */
  {
    const body = SRC.slice(SRC.indexOf('==== MODEL:START'))
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    ok(!/PEMDAS|order of operations/i.test(body), 'no order-of-operations — that is OperationsLab’s');
    ok(!/midpoint|number line/i.test(body),
      'no midpoint number line — RoundingLab owns rounding; this lab only USES it as a detector');
    ok(!/balance|scale/i.test(body), 'nothing balances — EquationLab owns solving for x');
    ok(/halfway/i.test(SRC), 'the lab must name its own object: the halfway number');
  }

  return { checks, failures };
}

const MUTANTS = [
  ['the band shrinks below what rounding can justify, so it rejects correct answers',
    'const BAND = 10;', 'const BAND = 4;'],
  ['the estimate forgets to round the sold bottles',
    'return roundTen(T) - roundTen(m);', 'return roundTen(T) - m;'],
  ['roundTen truncates instead of rounding to nearest',
    'const roundTen = (v) => Math.round(v / 10) * 10;', 'const roundTen = (v) => Math.floor(v / 10) * 10;'],
  ['step two is skipped — the lab ships the halfway trap it teaches against',
    'const stepTwo = (T, m) => T - m;', 'const stepTwo = (T, m) => T;'],
  ['step one multiplies by the wrong fact',
    'const stepOne = (n) => PER_CRATE * n;', 'const stepOne = (n) => PER_CRATE + n;'],
  ['the stamp accepts the halfway number',
    'const isCalibrated = (guess, n, m) => guess === solve(n, m).answer;',
    'const isCalibrated = (guess, n, m) => guess === solve(n, m).answer || guess === solve(n, m).halfway;'],
  ['the stamp goes fuzzy',
    'const isCalibrated = (guess, n, m) => guess === solve(n, m).answer;',
    'const isCalibrated = (guess, n, m) => Math.abs(guess - solve(n, m).answer) <= 2;'],
  ['the crate range lets the shop sell more than it has (negative bottles)',
    "{ key: 'n', label: 'crates', min: 6, max: 9, step: 1, unlock: 1, role: 'how many crates arrive' },",
    "{ key: 'n', label: 'crates', min: 2, max: 9, step: 1, unlock: 1, role: 'how many crates arrive' },"],
  ['halfwayCaught lies and always claims a catch',
    'const halfwayCaught = (n, m) => !inBand(solve(n, m).halfway, n, m);',
    'const halfwayCaught = (n, m) => true;'],
  ['inBand is off by a sign',
    'return v >= b.lo && v <= b.hi;', 'return v >= b.lo && v >= b.hi;'],
  ['START stops being a story where the detector fires',
    'const START = { n: 6, m: 24 };', 'const START = { n: 6, m: 12 };'],
  ['the equation drops the letter the standard asks for',
    'const equationOf = (n, m) => `b = ${PER_CRATE} × ${n} − ${m}`;',
    'const equationOf = (n, m) => `${PER_CRATE} × ${n} − ${m}`;'],
];

function mutationTest() {
  const survivors = [];
  for (const [name, find, replace] of MUTANTS) {
    if (!MODEL_BODY.includes(find)) { survivors.push(`${name} — STALE ANCHOR`); continue; }
    let caught = false;
    try { caught = runSuite(build(MODEL_BODY.replace(find, replace))).failures.length > 0; }
    catch { caught = true; }
    if (!caught) survivors.push(name);
  }
  return survivors;
}

const M = build(MODEL_BODY);
const { checks, failures } = runSuite(M);

console.log('audit-twostep — TwoStepLab.jsx');
console.log('─'.repeat(64));
console.log(`model sliced from the shipped component: ${MODEL_BODY.split('\n').length} lines`);
console.log(`checks run: ${checks.toLocaleString()}`);
console.log(`failures:   ${failures.length}`);
for (const f of failures.slice(0, 20)) console.log('  ✗ ' + f);
if (failures.length > 20) console.log(`  … and ${failures.length - 20} more`);

console.log('─'.repeat(64));
console.log(`mutation test: ${MUTANTS.length} deliberate defects injected…`);
const survivors = mutationTest();
if (survivors.length === 0) console.log(`all ${MUTANTS.length} caught — the suite has teeth.`);
else { console.log(`${survivors.length} SURVIVED — holes in the AUDIT:`); for (const s of survivors) console.log('  ⚠ ' + s); }

console.log('─'.repeat(64));
const pass = failures.length === 0 && survivors.length === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
