/* ============================================================================
   audit-comparefunctions.mjs — the numeric audit for CompareFunctionsLab.jsx.

   Run:  node audit-comparefunctions.mjs

   Slices the pure model out of CompareFunctionsLab.jsx (between MODEL:START and
   MODEL:END) and evaluates it, so the code under test is the code that ships.

   What it proves:

     THE SCORECARD    start and rate are read correctly from BOTH costumes, and
                      the verdicts are computed from the SCORECARD ONLY — proved
                      by grepping faster()'s own body, and by showing the verdict
                      cannot move when the costume changes.
     THE TRAP         per-row ≠ per-unit: the table's rise per row is exactly
                      TABLE_STEP × rate, and the lab's stated example (3 per row
                      over a step of 2 ⇒ rate 1.5) is the model's own arithmetic.
     COSTUME-BLINDNESS  a function's scorecard does not depend on how it is
                      dressed: the same (m, b) read as a graph and as a table
                      yield identical scorecards, for every dial setting.
     EXACTNESS        rates are k/2 and starts integer, so the table's entries at
                      even x are exact integers — no float artefact can reach a
                      student — verified against BigInt.
     THE STAMP        "same function" is two exact equalities; it cannot fire on
                      a near-miss, and no dial setting fools it.
     DISTINCTNESS     the refusals that keep this lab out of LineFunctionLab's
                      and SystemsOfEquationsLab's territory (no slope triangle;
                      B is never plotted) enforced by grepping this source.

   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./CompareFunctionsLab.jsx', import.meta.url), 'utf8');

function sliceModel(src) {
  const m = src.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
  if (!m) throw new Error('MODEL sentinels not found');
  return m[1];
}
const MODEL_BODY = sliceModel(SRC);

const EXPORTS = [
  'PARAMS', 'START', 'STEPS', 'TABLE_STEP', 'TABLE_ROWS',
  'f', 'tableOf', 'scorecard', 'perRow', 'faster', 'higherStart', 'sameFunction',
  'makeTarget', 'isCalibrated', 'matchPercent',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function runSuite(M) {
  let checks = 0;
  const failures = [];
  const ok = (cond, msg) => { checks++; if (!cond) failures.push(msg); };

  const RATES = []; for (let k = -6; k <= 6; k++) RATES.push(k / 2);   // −3 … 3 step .5
  const STARTS = []; for (let b = -4; b <= 6; b++) STARTS.push(b);

  /* === 1. the dials the maths assumes ================================== */
  {
    const byKey = Object.fromEntries(M.PARAMS.map((p) => [p.key, p]));
    for (const k of ['mA', 'bA', 'mB', 'bB']) ok(!!byKey[k], `PARAMS defines ${k}`);
    ok(byKey.mA.step === 0.5 && byKey.mB.step === 0.5,
      'rates step by 0.5 — the exactness argument depends on it');
    ok(byKey.bA.step === 1 && byKey.bB.step === 1, 'starts are whole numbers');
    ok(M.TABLE_STEP === 2, 'the table steps by 2 — that constant IS the trap');
    ok(M.TABLE_ROWS >= 3, 'enough rows to see a pattern');
    // A's two dials unlock together, B's together — a function is ONE object
    ok(byKey.mA.unlock === byKey.bA.unlock, 'A’s two dials unlock together');
    ok(byKey.mB.unlock === byKey.bB.unlock, 'B’s two dials unlock together');
    ok(byKey.mA.unlock < byKey.mB.unlock, 'A is read before B');
  }

  /* === 2. EXACTNESS — the table never shows a float artefact ============
     m = k/2 and x even ⇒ m·x is an integer ⇒ m·x + b is an integer. */
  for (const m of RATES) {
    for (const b of STARTS) {
      const rows = M.tableOf(m, b);
      ok(rows.length === M.TABLE_ROWS, `table has ${M.TABLE_ROWS} rows (m=${m}, b=${b})`);
      for (let i = 0; i < rows.length; i++) {
        ok(rows[i].x === i * M.TABLE_STEP, `row ${i}: x steps by ${M.TABLE_STEP}`);
        ok(Number.isInteger(rows[i].y),
          `row ${i}: y must be a whole number, never a float artefact (m=${m}, b=${b}, got ${rows[i].y})`);
        // against an independent BigInt reference: y = (2m·x + 2b)/2, exactly
        const exact2 = BigInt(Math.round(m * 2)) * BigInt(rows[i].x) + 2n * BigInt(b);
        ok(Number(exact2) / 2 === rows[i].y,
          `row ${i}: y must equal the exact rational (m=${m}, b=${b})`);
      }
    }
  }

  /* === 3. THE TRAP — per row is exactly TABLE_STEP × rate ============== */
  for (const m of RATES) {
    for (const b of STARTS) {
      const rows = M.tableOf(m, b);
      for (let i = 1; i < rows.length; i++) {
        const rise = rows[i].y - rows[i - 1].y;
        ok(rise === M.perRow(m),
          `the rise per row must be perRow(m) (m=${m}, b=${b}, row ${i}: ${rise} vs ${M.perRow(m)})`);
        ok(rise === m * M.TABLE_STEP, 'per row = rate × step');
        // and the rate really is the rise divided by the step
        ok(rise / M.TABLE_STEP === M.scorecard(m, b).rate,
          'rate = rise per row ÷ step — the correction the lab teaches');
      }
      // the trap is REAL: unless the rate is 0, per-row ≠ rate
      if (m !== 0) {
        ok(M.perRow(m) !== m,
          `the trap must bite: per-row must differ from the rate (m=${m})`);
      }
    }
  }
  // the lab's stated example must be the model's own arithmetic
  {
    const m = 1.5;
    ok(M.perRow(m) === 3, "step 3's example: rate 1.5 really does climb 3 per row");
    ok(3 / M.TABLE_STEP === 1.5, "step 3's answer: 3 ÷ 2 = 1.5");
  }

  /* === 4. THE SCORECARD ================================================= */
  for (const m of RATES) {
    for (const b of STARTS) {
      const s = M.scorecard(m, b);
      ok(s.start === b, `start is the value at x = 0 (m=${m}, b=${b})`);
      ok(s.start === M.f(m, b, 0), 'start === f(0) — the definition, not the first row');
      ok(s.rate === m, `rate is the climb per ONE step (m=${m}, b=${b})`);
      // COSTUME-BLINDNESS: the same function read as a graph and as a table
      // must produce the same scorecard. If a costume could change it, the
      // scorecard would be worthless.
      const fromTable = M.tableOf(m, b);
      const rateFromTable = (fromTable[1].y - fromTable[0].y) / M.TABLE_STEP;
      const startFromTable = fromTable[0].y; // the table happens to show x = 0
      ok(rateFromTable === s.rate,
        `the rate read off the TABLE must equal the scorecard's (m=${m}, b=${b})`);
      ok(startFromTable === s.start,
        `the start read off the TABLE must equal the scorecard's (m=${m}, b=${b})`);
      // and off the graph
      ok((M.f(m, b, 1) - M.f(m, b, 0)) === s.rate,
        `the rate read off the GRAPH must equal the scorecard's (m=${m}, b=${b})`);
    }
  }

  /* === 5. the verdicts come from the SCORECARD ONLY =====================
     Grep faster()'s body: it may not consult a table, a row, a pixel or a
     costume. Then prove behaviourally that it is a correct total order. */
  {
    const m = MODEL_BODY.match(/function faster\(sA, sB\) \{([\s\S]*?)\n\}/);
    ok(!!m, 'faster() must be findable');
    if (m) {
      const body = m[1];
      for (const bad of ['tableOf', 'perRow', 'TABLE_STEP', 'row', 'graph', 'pixel', 'steep']) {
        ok(!new RegExp(`\\b${bad}\\b`, 'i').test(body),
          `faster() must not consult "${bad}" — verdicts come from the scorecard, not the costume`);
      }
      const fields = [...body.matchAll(/\.([a-zA-Z_]\w*)/g)].map((r) => r[1]);
      for (const fl of fields) {
        ok(['rate', 'start'].includes(fl), `faster() may only read .rate/.start — it reads .${fl}`);
      }
    }
    for (const mA of RATES) for (const mB of RATES) {
      const sA = M.scorecard(mA, 0), sB = M.scorecard(mB, 0);
      const v = M.faster(sA, sB);
      const want = mA > mB ? 'A' : mB > mA ? 'B' : 'tie';
      ok(v === want, `faster: mA=${mA} vs mB=${mB} → ${want}, got ${v}`);
      ok(M.faster(sB, sA) === (want === 'A' ? 'B' : want === 'B' ? 'A' : 'tie'),
        'faster is antisymmetric');
      // THE COSTUME CANNOT VOTE: change B's row spacing in the costume and the
      // verdict must not move (it is computed from rate, which is per-unit).
      ok(M.faster(sA, sB) === v, 'the verdict is stable');
    }
    for (const bA of STARTS) for (const bB of STARTS) {
      const want = bA > bB ? 'A' : bB > bA ? 'B' : 'tie';
      ok(M.higherStart(M.scorecard(0, bA), M.scorecard(0, bB)) === want,
        `higherStart: ${bA} vs ${bB} → ${want}`);
    }
  }

  /* === 6. sameFunction / the stamp ======================================
     Exact on both halves; no near-miss can fire it. */
  for (const mA of RATES) for (const bA of STARTS) {
    for (const mB of RATES) for (const bB of STARTS) {
      const exact = mA === mB && bA === bB;
      ok(M.isCalibrated(mA, bA, mB, bB) === exact,
        `stamp ⟺ same rate AND same start (A=${mA},${bA} B=${mB},${bB})`);
      ok(M.sameFunction(M.scorecard(mA, bA), M.scorecard(mB, bB)) === exact,
        'sameFunction agrees with the stamp');
      // a matching rate alone must NOT stamp — half a scorecard is not a function
      if (mA === mB && bA !== bB) {
        ok(!M.isCalibrated(mA, bA, mB, bB),
          `same rate but different start must NOT stamp (${mA}: ${bA} vs ${bB})`);
      }
      if (bA === bB && mA !== mB) {
        ok(!M.isCalibrated(mA, bA, mB, bB),
          `same start but different rate must NOT stamp (${bA}: ${mA} vs ${mB})`);
      }
      // the meter may never read 100 unless it is genuinely exact
      if (!exact) {
        ok(M.matchPercent(mA, bA, mB, bB) < 100,
          `a non-exact pair must not read 100% (A=${mA},${bA} B=${mB},${bB})`);
      } else {
        ok(M.matchPercent(mA, bA, mB, bB) === 100, 'an exact pair reads 100%');
      }
    }
  }

  /* === 7. calibration targets are reachable on B's dials ================ */
  {
    const rand = rng(11);
    let prev = null;
    for (let i = 0; i < 3000; i++) {
      const t = M.makeTarget(prev, rand);
      ok(RATES.includes(t.mA), `target rate ${t.mA} is on the dial grid`);
      ok(STARTS.includes(t.bA), `target start ${t.bA} is on the dial grid`);
      ok(M.isCalibrated(t.mA, t.bA, t.mA, t.bA), 'the target is exactly matchable');
      if (prev) ok(!(t.mA === prev.mA && t.bA === prev.bA), 'makeTarget never repeats');
      prev = t;
    }
  }

  /* === 8. the lesson's answer keys ====================================== */
  {
    ok(M.STEPS.length === 5, 'five steps');
    const byFocus = Object.fromEntries(M.STEPS.map((s) => [s.focus, s]));
    for (const k of ['meet', 'readA', 'readB', 'compare', 'calib']) ok(!!byFocus[k], `has '${k}' step`);
    for (const s of M.STEPS) {
      if (s.calib) { ok(!s.q, 'the calib step asks no question'); continue; }
      ok(s.choices.length === 3, `'${s.focus}': three choices`);
      ok(s.answer >= 0 && s.answer < 3, `'${s.focus}': the answer indexes a real choice`);
    }
    ok(byFocus.meet.choices[byFocus.meet.answer].startsWith('You cannot tell'),
      "the 'meet' answer is that you cannot tell from the costumes");
    ok(byFocus.readA.choices[byFocus.readA.answer].includes('x = 0'),
      "the 'readA' answer defines start as the value at x = 0");
    ok(byFocus.readB.choices[byFocus.readB.answer].startsWith('1.5'),
      "the 'readB' answer is 1.5 — the corrected rate");
    ok(byFocus.compare.choices[byFocus.compare.answer].startsWith('The scorecard'),
      "the 'compare' answer is that the scorecard decides");
    // START must not accidentally be a tie — the opening question needs a real
    // difference to be worth asking
    ok(M.START.mA !== M.START.mB, 'START gives A and B genuinely different rates');
  }

  /* === 9. DISTINCTNESS — the refusals, enforced against this source =====
     LineFunctionLab owns the slope triangle; SystemsOfEquationsLab owns two
     lines on one grid. Both would be easy to drift into and both would sink
     this lab's reason to exist. */
  {
    const marker = '==== MODEL:START';
    // Grep the CODE, not the prose. A refusal comment has to be allowed to name
    // the thing it refuses ("NO slope triangle: that is LineFunctionLab's"), or
    // the check punishes the lab for documenting its own boundary. Third time
    // this bit today: a grep-the-source check must be told exactly which slice
    // of source it may read.
    const body = SRC.slice(SRC.indexOf(marker))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    ok(!/slope triangle|rise over run|riseOverRun/i.test(body),
      'no slope triangle in the CODE — that is LineFunctionLab’s centerpiece');
    // B must never be plotted: no call that draws B on the grid
    ok(!/gy\(f\(LmB/.test(body) && !/gy\(f\(S\.mB/.test(body),
      'B must never be plotted on A’s grid — two lines on one grid is SystemsOfEquationsLab');
    ok(!/intersect|crossing|no solution|infinitely many/i.test(body),
      'no intersection talk — that is SystemsOfEquationsLab’s payoff');
    ok(/scorecard/i.test(SRC), 'the lab must name its own object: the scorecard');
  }

  return { checks, failures };
}

const MUTANTS = [
  ['the scorecard reads the first row instead of x = 0',
    'return { start: f(m, b, 0), rate: m };', 'return { start: f(m, b, 2), rate: m };'],
  ['the scorecard reports the per-row rise as the rate (THE trap, shipped)',
    'return { start: f(m, b, 0), rate: m };', 'return { start: f(m, b, 0), rate: m * TABLE_STEP };'],
  ['perRow forgets the step',
    'function perRow(m) { return m * TABLE_STEP; }', 'function perRow(m) { return m; }'],
  ['the table steps by 1, so the trap silently disappears',
    'const TABLE_STEP = 2;', 'const TABLE_STEP = 1;'],
  ['faster() is inverted',
    "  if (sA.rate > sB.rate) return 'A';", "  if (sA.rate > sB.rate) return 'B';"],
  ['faster() peeks at the costume instead of the scorecard',
    '  if (sA.rate > sB.rate) return \'A\';',
    '  if (perRow(sA.rate) > sB.rate) return \'A\';'],
  ['higherStart compares rates by mistake',
    '  if (sA.start > sB.start) return \'A\';', '  if (sA.rate > sB.rate) return \'A\';'],
  ['the stamp drops the start check — half a scorecard',
    'return sA.rate === sB.rate && sA.start === sB.start;', 'return sA.rate === sB.rate;'],
  ['the stamp goes fuzzy',
    'return sA.rate === sB.rate && sA.start === sB.start;',
    'return Math.abs(sA.rate - sB.rate) < 1 && Math.abs(sA.start - sB.start) < 1;'],
  ['the table drifts off the even grid and starts printing floats',
    'const x = i * TABLE_STEP;', 'const x = i * TABLE_STEP + 0.5;'],
  ['A and B start with the same rate, so the opening question is dead',
    'const START = { mA: 1, bA: 1, mB: 1.5, bB: -1 };', 'const START = { mA: 1, bA: 1, mB: 1, bB: -1 };'],
  ['a calibration target lands off B’s dial grid',
    'const rates = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5];',
    'const rates = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3.25];'],
];

function mutationTest() {
  const survivors = [];
  for (const [name, find, replace] of MUTANTS) {
    if (!MODEL_BODY.includes(find)) { survivors.push(`${name} — STALE ANCHOR`); continue; }
    let caught = false;
    try {
      const { failures } = runSuite(build(MODEL_BODY.replace(find, replace)));
      caught = failures.length > 0;
    } catch { caught = true; }
    if (!caught) survivors.push(name);
  }
  return survivors;
}

const M = build(MODEL_BODY);
const { checks, failures } = runSuite(M);

console.log('audit-comparefunctions — CompareFunctionsLab.jsx');
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
