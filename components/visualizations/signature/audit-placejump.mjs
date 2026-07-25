/* ============================================================================
   audit-placejump.mjs — the numeric audit for PlaceJumpLab.jsx (1.NBT.C.5 /
   2.NBT.B.8).  Run:  node audit-placejump.mjs

   Slices the pure model out of PlaceJumpLab.jsx (MODEL:START/END) and evaluates
   it, so the code under test is the code that ships.

   What it proves:
     THE JUMP       ±10 / ±100 is an exact integer add, clamped to 0–999.
     ONE COLUMN     with NO cascade, a +10 changes ONLY the tens digit and a
                    +100 ONLY the hundreds — checked exhaustively over 0–999.
     THE CASCADE    a jump changes more than one column EXACTLY when the aimed
                    column is at its wall (a +10 at a 9-tens, etc.) — the lab's
                    whole point, verified against an independent digit reference.
     THE ONES       no ±10 or ±100 jump ever moves the ones digit.
     EXACTNESS      every value is an integer in 0–999 — no float.
     CALIBRATION    targets share the start's ones digit (reachable by jumps),
                    are a whole number of tens away, and the stamp is exact.
     DISTINCTNESS   the counting-chart / bundling pictures are grepped OUT.
   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./PlaceJumpLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in PlaceJumpLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'LO', 'HI', 'PLACES', 'PLACE_MULT', 'JUMPS', 'digitsOf', 'jump', 'changedColumns',
  'isCascade', 'aimedPlace', 'NUM_DIAL', 'START', 'makeTarget', 'isCalibrated',
  'jumpsAway', 'matchPercent', 'STEPS',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  /* === 0. digits round-trip, and the jump menu is the four we expect ===== */
  for (let n = 0; n <= M.HI; n++) {
    const d = M.digitsOf(n);
    ok(d[0] + d[1] * 10 + d[2] * 100 === n, `digitsOf round-trips ${n}`);
    ok(d.every((x) => x >= 0 && x <= 9), `every digit 0..9 (${n})`);
  }
  ok(M.JUMPS.map((j) => j.delta).sort((a, b) => a - b).join() === '-100,-10,10,100',
    'the four jumps are ±10, ±100');

  /* === 1. THE JUMP is an exact clamped integer add ====================== */
  for (let n = 0; n <= M.HI; n += 7) for (const j of M.JUMPS) {
    const r = M.jump(n, j.delta);
    const want = Math.max(M.LO, Math.min(M.HI, n + j.delta));
    ok(r.to === want, `jump(${n},${j.delta}) = ${want}`);
    ok(Number.isInteger(r.to) && r.to >= 0 && r.to <= 999, 'jump stays an integer in 0..999');
    ok(r.blocked === (n + j.delta !== want), `blocked flag correct (${n},${j.delta})`);
  }

  /* === 2. ONE COLUMN unless a cascade — the heart of the lesson =========
     Independent reference: a +10 with tens<9 (and no clamp) must change ONLY
     the tens; a +100 with hundreds<9 must change ONLY the hundreds. */
  for (let n = 0; n <= M.HI; n++) {
    const [ones, tens, hund] = M.digitsOf(n);
    // +10, no cascade expected when tens<9 and n+10<=999
    if (tens < 9 && n + 10 <= 999) {
      const ch = M.changedColumns(n, M.jump(n, 10).to);
      ok(ch.length === 1 && ch[0] === 1, `+10 ticks ONLY the tens when tens<9 (n=${n})`);
    }
    // +100, no cascade expected when hundreds<9 and n+100<=999
    if (hund < 9 && n + 100 <= 999) {
      const ch = M.changedColumns(n, M.jump(n, 100).to);
      ok(ch.length === 1 && ch[0] === 2, `+100 ticks ONLY the hundreds when hund<9 (n=${n})`);
    }
    // −10, no borrow when tens>0
    if (tens > 0) {
      const ch = M.changedColumns(n, M.jump(n, -10).to);
      ok(ch.length === 1 && ch[0] === 1, `−10 ticks ONLY the tens when tens>0 (n=${n})`);
    }
    void ones;
  }

  /* === 3. THE CASCADE fires exactly at the walls ======================== */
  for (let n = 0; n <= M.HI; n++) {
    const [, tens, hund] = M.digitsOf(n);
    // +10 cascades ⟺ tens === 9 (and it doesn't just clamp)
    if (n + 10 <= 999) {
      ok(M.isCascade(n, 10) === (tens === 9), `+10 cascade ⟺ tens=9 (n=${n})`);
    }
    // −10 borrows ⟺ tens === 0 (and n>=10 so it moves)
    if (n - 10 >= 0) {
      ok(M.isCascade(n, -10) === (tens === 0), `−10 borrow ⟺ tens=0 (n=${n})`);
    }
    // +100 never cascades below 900 (no place above hundreds within 999)
    if (hund < 9) ok(!M.isCascade(n, 100), `+100 never cascades below 900 (n=${n})`);
    // the famous case
  }
  ok(M.jump(290, 10).to === 300, '290 + 10 = 300');
  ok(M.changedColumns(290, 300).length === 2, '290→300 changes TWO columns (the cascade)');
  ok(M.isCascade(290, 10), '290 + 10 is a cascade');
  ok(!M.isCascade(247, 10), '247 + 10 is NOT a cascade (single tick)');

  /* === 4. THE ONES DIGIT never moves under ±10 / ±100 =================== */
  for (let n = 0; n <= M.HI; n++) for (const delta of [10, -10, 100, -100]) {
    const to = M.jump(n, delta).to;
    if (!M.jump(n, delta).blocked) {
      ok(M.digitsOf(n)[0] === M.digitsOf(to)[0], `ones digit unchanged by ${delta} (n=${n})`);
    }
    ok(M.aimedPlace(delta) === (Math.abs(delta) === 100 ? 2 : 1), `aimedPlace(${delta})`);
  }

  /* === 5. CALIBRATION — reachable, ones-preserving, exact stamp ========= */
  {
    const rand = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    let prev = null;
    for (let i = 0; i < 5000; i++) {
      const t = M.makeTarget(prev, rand);
      ok(t.start >= 0 && t.start <= 999 && t.target >= 0 && t.target <= 999, 'target in range');
      ok((t.start % 10) === (t.target % 10),
        `target shares the start's ones digit — reachable by jumps (${t.start}→${t.target})`);
      ok(t.target !== t.start, 'target is a real distance from the start');
      // reachable purely by ±10/±100 jumps: the gap is a whole number of tens
      ok(Math.abs(t.target - t.start) % 10 === 0, 'the gap is a whole number of tens');
      if (prev) ok(!(t.target === prev.target && t.start === prev.start), 'makeTarget avoids exact repeat');
      prev = t;
    }
    // the stamp is exact; only n===target stamps
    const t = { start: 143, target: 373 };
    for (let n = 0; n <= 999; n += 3) {
      ok(M.isCalibrated(n, t) === (n === 373), `stamp ⟺ n===target (n=${n})`);
    }
    // jumpsAway is 0 only at the target, and the meter reads 100 only there
    ok(M.jumpsAway(373, t) === 0, 'jumpsAway is 0 at the target');
    ok(M.matchPercent(373, t) === 100, 'meter is 100 only at the target');
    ok(M.matchPercent(t.start, t) < 100, 'meter starts below 100');
    // jumpsAway(143→373) = 2 hundreds + 3 tens = 5 jumps
    ok(M.jumpsAway(143, t) === 5, '143→373 is 5 jumps away (2 hundreds + 3 tens)');
  }

  /* === 6. the lesson keys match the model =============================== */
  {
    ok(M.STEPS.length === 5, 'five steps');
    const byFocus = Object.fromEntries(M.STEPS.map((s) => [s.focus, s]));
    for (const f of ['meet', 'plus-ten', 'plus-hundred', 'cascade', 'calib']) ok(!!byFocus[f], `has '${f}' step`);
    ok(byFocus.calib.calib === true, 'calib flagged');
    for (const s of M.STEPS) {
      if (s.calib) continue;
      ok(Array.isArray(s.choices) && s.choices.length === 3, `'${s.focus}': three choices`);
      ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < 3, `'${s.focus}': answer indexes a choice`);
    }
    // the stated arithmetic is the model's
    ok(byFocus.meet.choices[byFocus.meet.answer] === '4', "meet: tens digit of 247 is 4");
    ok(byFocus['plus-ten'].choices[byFocus['plus-ten'].answer].startsWith('257'), "+10: 247→257");
    ok(byFocus['plus-hundred'].choices[byFocus['plus-hundred'].answer].startsWith('347'), "+100: 247→347");
    ok(byFocus.cascade.choices[byFocus.cascade.answer].startsWith('300'), "cascade: 290+10→300");
    ok(M.START === 247, 'START is 247');
    // ONE dial only (the number); the jumps are buttons, not dials
    ok(M.NUM_DIAL.min === 0 && M.NUM_DIAL.max === 999, 'the one dial spans 0..999');
  }

  /* === 7. DISTINCTNESS — counting-chart / bundling grepped OUT ========== */
  {
    const body = MODEL_BODY.toLowerCase();
    for (const [word, owner] of [['chart', 'HundredChartLab'], ['count on', 'HundredChartLab'], ['bundle', 'TwoDigitNumberLab'], ['regroup', 'PlaceValueStrategiesLab']]) {
      ok(!body.includes(word), `model must not reach for "${word}" — that is ${owner}`);
    }
    ok(/cascade/i.test(MODEL_BODY), 'the model names its own idea: the cascade');
  }

  return { checks, failures };
}

const MUTANTS = [
  ['+10 changes the ones instead of the tens',
    'const raw = n + delta;', 'const raw = n + (delta === 10 ? 1 : delta);'],
  ['the jump forgets to clamp (lets 4-digit / negative numbers through)',
    'const clamped = Math.max(LO, Math.min(HI, raw));', 'const clamped = raw;'],
  ['changedColumns misses a difference (only checks ones)',
    'for (let i = 0; i < 3; i++) if (a[i] !== b[i]) out.push(i);',
    'for (let i = 0; i < 1; i++) if (a[i] !== b[i]) out.push(i);'],
  ['isCascade always says false (the 9s look like single ticks)',
    'return changedColumns(before, after).length > 1;', 'return false;'],
  ['aimedPlace maps +10 to the hundreds',
    'const aimedPlace = (delta) => (Math.abs(delta) === 100 ? 2 : 1);',
    'const aimedPlace = (delta) => (Math.abs(delta) === 100 ? 1 : 2);'],
  ['digitsOf swaps tens and hundreds',
    'const digitsOf = (n) => [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10];',
    'const digitsOf = (n) => [n % 10, Math.floor(n / 100) % 10, Math.floor(n / 10) % 10];'],
  ['the stamp goes fuzzy',
    'const isCalibrated = (n, target) => n === target.target;',
    'const isCalibrated = (n, target) => Math.abs(n - target.target) <= 10;'],
  ['makeTarget lets the ones digit differ (unreachable by jumps)',
    'if ((target % 10) === (start % 10) && target !== start) t = { start, target };',
    'if (target !== start) t = { start, target };'],
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
console.log('audit-placejump — PlaceJumpLab.jsx');
console.log('─'.repeat(64));
console.log(`model sliced from the shipped component: ${MODEL_BODY.split('\n').length} lines`);
console.log(`checks run: ${checks.toLocaleString()}`);
console.log(`failures:   ${failures.length}`);
for (const f of failures.slice(0, 20)) console.log('  ✗ ' + f);
console.log('─'.repeat(64));
console.log(`mutation test: ${MUTANTS.length} deliberate defects injected…`);
const survivors = mutationTest();
if (survivors.length === 0) console.log(`all ${MUTANTS.length} caught — the suite has teeth.`);
else { console.log(`${survivors.length} SURVIVED:`); for (const s of survivors) console.log('  ⚠ ' + s); }
console.log('─'.repeat(64));
const pass = failures.length === 0 && survivors.length === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
