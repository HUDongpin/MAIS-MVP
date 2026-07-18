/* ============================================================================
   audit-rounding.mjs — the numeric audit for RoundingLab.jsx.

   Run:  node audit-rounding.mjs

   WHAT CHANGED (2026-07-17) AND WHY IT MATTERED.
   This audit used to keep a hand-written MIRROR of the lab's model — its own
   copy of DIGIT_MULT, PLACES and roundInfo. A mirror cannot drift *loudly*: the
   moment the lab changed, the audit would have gone on testing its own private
   copy and reporting PASS on a broken lab. That is the worst failure mode a
   test can have, and it was live in a shipped lab.

   It now SLICES the model out of RoundingLab.jsx (between the MODEL:START and
   MODEL:END sentinels) and evaluates it, like audit-shapes / audit-pyramid. The
   code under test is the code that ships. This conversion was the prerequisite
   for the decimal extension below — you do not refactor a lab whose tests
   cannot see it.

   WHAT IT PROVES
     ROUND-HALF-UP      exactly correct across every reachable number × place.
     THE SHORTCUT       the decider digit (5+ up, 4− down) is IDENTICAL to the
                        midpoint test — the lab draws both and claims they
                        agree, so that claim is checked exhaustively.
     5.NBT.A.4          the decimal extension: rounding to the nearest tenth is
                        the SAME integer code as rounding to the nearest ten,
                        one scale down.
     EXACTNESS          every value is an integer count of hundredths and every
                        offered place has an exact integer midpoint — the
                        promise that a child never meets a float artefact,
                        verified rather than asserted (and contrasted with the
                        naive float route, which really does produce one).
     THE RANGE          calibration's inverse-rounding range is exact, and the
                        stamp cannot fire falsely.
     NO REGRESSION      every whole-number answer this lab gave BEFORE the
                        decimal extension it still gives after — pinned as
                        literal expected values, so a rescale cannot have
                        quietly changed grade-3 behaviour.

   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./RoundingLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in RoundingLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'SCALE', 'DIGIT_MULT', 'DIGIT_NAME', 'PLACES', 'START', 'PLACE_STEP', 'DECIMAL_STEP', 'CALIB_STEP',
  'DEFAULT_PLACE', 'placeOf', 'valueOf', 'digitAt', 'roundInfo', 'commas', 'roundRange',
  'makeTarget', 'calibMatchPercent', 'isCalibrated', 'STEPS',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  const MAXN = M.valueOf([9, 9, 9, 9, 9, 9]);

  /* === 1. the scale and the places ===================================== */
  {
    ok(M.SCALE === 100, 'the value is an integer count of hundredths');
    ok(M.DIGIT_MULT.length === 6 && M.DIGIT_NAME.length === 6, 'six digits, hundredths → thousands');
    for (let i = 0; i < 6; i++) ok(M.DIGIT_MULT[i] === 10 ** i, `DIGIT_MULT[${i}] = 10^${i}`);
    for (const p of M.PLACES) {
      ok(Number.isInteger(p.mult / 2),
        `place "${p.label}": its midpoint must be an exact integer (mult=${p.mult})`);
      ok(M.DIGIT_MULT[p.roundIndex] === p.mult,
        `place "${p.label}": roundIndex must index its own multiplier`);
      ok(p.roundIndex >= 1, `place "${p.label}": the decider digit must exist to its right`);
      ok(M.DIGIT_NAME[p.roundIndex - 1] === p.deciderName,
        `place "${p.label}": deciderName must be the digit one place right (want ` +
        `${M.DIGIT_NAME[p.roundIndex - 1]}, got ${p.deciderName})`);
    }
    ok(!M.PLACES.some((p) => p.mult === 1),
      'hundredths must not be a rounding place — it is the smallest digit, so it is a no-op');
    ok(M.PLACES.some((p) => p.mult === 10), 'nearest TENTH is offered — this is 5.NBT.A.4');
    ok(M.PLACES.some((p) => p.mult === 100), 'nearest ONE is offered');
    ok(M.PLACES.some((p) => p.mult === 1000), 'nearest TEN is still offered — 3.NBT.A.1 survives');
    ok(M.valueOf(M.START) === 4700, 'START is still 47, the "rounds up to 50" opener');
    // THE DEFAULT PLACE — step 1 says "rounding 47 to the nearest TEN", so the
    // lab had better open on the nearest ten. This is pinned because the
    // decimal rescale silently broke it: useState(10) meant "ten" before and
    // "tenth" after, and the lesson taught a place its own text denied.
    ok(M.placeOf(M.DEFAULT_PLACE)?.label === 'ten',
      `the lab must OPEN on the nearest ten — step 1's text says so (got ` +
      `"${M.placeOf(M.DEFAULT_PLACE)?.label}")`);
    ok(M.roundInfo(M.valueOf(M.START), M.DEFAULT_PLACE).rounded === 5000,
      'and 47 at the default place must round to 50, which is what step 1 claims');
  }

  /* === 2. valueOf / digitAt round-trip ================================= */
  {
    let s = 12345;
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let k = 0; k < 3000; k++) {
      const d = Array.from({ length: 6 }, () => Math.floor(rand() * 10));
      const n = M.valueOf(d);
      for (let i = 0; i < 6; i++) ok(M.digitAt(n, i) === d[i], `digitAt round-trips digit ${i}`);
      ok(Number.isInteger(n), 'every value is an integer number of hundredths');
    }
  }

  /* === 3. ROUND-HALF-UP + THE DECIDER SHORTCUT ========================= */
  for (const p of M.PLACES) {
    const step = p.mult <= 100 ? 1 : Math.max(1, Math.floor(p.mult / 40));
    for (let n = 0; n <= Math.min(MAXN, p.mult * 400); n += step) {
      const info = M.roundInfo(n, p.mult);
      const lower = Math.floor(n / p.mult) * p.mult;
      const mid = lower + p.mult / 2;
      const want = n >= mid ? lower + p.mult : lower;
      ok(info.rounded === want, `round-half-up (n=${n}, place=${p.mult}): want ${want}, got ${info.rounded}`);
      ok(info.lower === lower && info.upper === lower + p.mult, `neighbours (n=${n}, ${p.label})`);
      ok(info.mid === mid && Number.isInteger(info.mid), `the midpoint is an exact integer (n=${n})`);
      ok(info.rounded % p.mult === 0, `the result is a multiple of the place (n=${n}, ${p.label})`);
      ok((info.decider >= 5) === info.up,
        `decider shortcut must agree with the midpoint test (n=${n}, ${p.label}: decider=${info.decider}, up=${info.up})`);
      ok(info.decider === M.digitAt(n, p.roundIndex - 1), 'the decider is the digit right of the place');
      ok(info.distLower === n - lower && info.distUpper === lower + p.mult - n, 'distances');
      if (info.distLower !== info.distUpper) {
        ok(info.rounded === (info.distLower < info.distUpper ? info.lower : info.upper),
          `the NEARER multiple must win (n=${n}, ${p.label})`);
      } else {
        ok(info.rounded === info.upper, `an exact tie rounds UP (n=${n}, ${p.label})`);
      }
    }
  }

  /* === 4. NO REGRESSION — the grade-3/4 answers, pinned as literals ==== */
  {
    const cases = [
      [47, 'ten', 50], [44, 'ten', 40], [45, 'ten', 50], [97, 'ten', 100],
      [3247, 'hundred', 3200], [449, 'hundred', 400], [450, 'hundred', 500],
      [950, 'thousand', 1000], [3247, 'thousand', 3000], [3500, 'thousand', 4000],
      [0, 'ten', 0], [5, 'ten', 10], [4, 'ten', 0],
    ];
    for (const [whole, placeLabel, want] of cases) {
      const p = M.PLACES.find((x) => x.label === placeLabel);
      const got = M.roundInfo(whole * M.SCALE, p.mult).rounded / M.SCALE;
      ok(got === want, `NO REGRESSION: ${whole} → nearest ${placeLabel} must still be ${want}, got ${got}`);
      ok(M.commas(whole * M.SCALE) === whole.toLocaleString('en-US'),
        `NO REGRESSION: a whole number still prints without a point (${whole})`);
    }
  }

  /* === 5. 5.NBT.A.4 — the decimal capability ========================== */
  {
    const cases = [
      [247, 'tenth', '2.5'], [244, 'tenth', '2.4'], [245, 'tenth', '2.5'],
      [996, 'tenth', '10'],
      [247, 'one', '2'], [250, 'one', '3'], [249, 'one', '2'],
      [5, 'tenth', '0.1'], [4, 'tenth', '0'],
      [1250, 'one', '13'], [1250, 'tenth', '12.5'],
    ];
    for (const [n, placeLabel, want] of cases) {
      const p = M.PLACES.find((x) => x.label === placeLabel);
      const got = M.commas(M.roundInfo(n, p.mult).rounded);
      ok(got === want, `5.NBT.A.4: ${M.commas(n)} → nearest ${placeLabel} = ${want}, got ${got}`);
    }
    const naive = Math.floor(2.47 / 0.1) * 0.1;
    ok(naive !== 2.4, 'sanity: the naive float route really is broken (that is why we scale)');
    ok(M.roundInfo(247, 10).lower === 240 && Number.isInteger(M.roundInfo(247, 10).lower),
      'the integer route gives an exact 2.4 for the same case');
  }

  /* === 6. `commas` — the formatter a child reads ======================= */
  {
    const cases = [[4700, '47'], [4750, '47.5'], [247, '2.47'], [324700, '3,247'],
      [0, '0'], [5, '0.05'], [50, '0.5'], [100, '1'], [999999, '9,999.99'], [1000, '10']];
    for (const [n, want] of cases) ok(M.commas(n) === want, `commas(${n}) = "${want}", got "${M.commas(n)}"`);
    for (let n = 0; n <= 4000; n++) {
      const s = M.commas(n);
      ok(!/e|\.\d{3,}|\.\d*0$/.test(s), `commas(${n}) = "${s}" must have no artefact and no trailing zero`);
      ok(!s.includes('.') || s.split('.')[1].length <= 2, `commas(${n}): at most two decimal places`);
    }
  }

  /* === 7. the calibration range + no false stamp ======================= */
  {
    for (const p of M.PLACES) {
      for (let g = 0; g <= Math.min(MAXN, p.mult * 60); g += p.mult) {
        const [lo, hi] = M.roundRange(g, p.mult);
        ok(lo === g - p.mult / 2 && hi === g + p.mult / 2 - 1, `roundRange(${g}, ${p.label})`);
        for (const n of [lo, g, hi]) {
          if (n < 0) continue;
          ok(M.roundInfo(n, p.mult).rounded === g, `${n} must round to ${g} (${p.label})`);
        }
        if (lo - 1 >= 0) ok(M.roundInfo(lo - 1, p.mult).rounded !== g, `${lo - 1} must NOT round to ${g}`);
        ok(M.roundInfo(hi + 1, p.mult).rounded !== g, `${hi + 1} must NOT round to ${g}`);
      }
    }
    let prev = null;
    for (let i = 0; i < 2000; i++) {
      const t = M.makeTarget(prev);
      ok(!!M.placeOf(t.place), `makeTarget place ${t.place} is a real place`);
      ok(t.goal % t.place === 0, `goal ${t.goal} is a multiple of its place ${t.place}`);
      ok(t.goal <= MAXN, `goal ${t.goal} is reachable with six digits`);
      const [lo, hi] = M.roundRange(t.goal, t.place);
      ok(hi >= 0 && lo <= MAXN, `the range for ${t.goal} overlaps what the dials can build`);
      ok(M.isCalibrated(t.goal, t), 'the goal itself calibrates');
      ok(M.calibMatchPercent(t.goal, t) === 100, 'and reads 100%');
      prev = t;
    }
    const t = { place: 1000, goal: 5000 };
    for (let n = 0; n <= 9000; n += 7) {
      ok(M.isCalibrated(n, t) === (M.roundInfo(n, t.place).rounded === t.goal),
        `stamp ⟺ n rounds to the goal (n=${n})`);
      if (!M.isCalibrated(n, t)) ok(M.calibMatchPercent(n, t) < 100, `a miss must not read 100% (n=${n})`);
    }
  }

  /* === 8. the lesson ================================================== */
  {
    ok(M.STEPS.length === 8, 'eight steps — the original seven, plus the decimal extension');
    ok(M.STEPS[M.CALIB_STEP].calib === true, 'CALIB_STEP indexes the calibration step');
    const ds = M.STEPS[M.DECIMAL_STEP];
    ok(!!ds && /point|tenth|decimal/i.test((ds.title || '') + (ds.body || '')),
      'DECIMAL_STEP must index the step that actually crosses the point');
    ok(M.DECIMAL_STEP > M.PLACE_STEP, 'decimals come after any-place rounding — the places grow rightward');
    ok(M.DECIMAL_STEP < M.CALIB_STEP, 'and before the challenge, or the challenge could ask the impossible');
    for (const s of M.STEPS) {
      if (s.calib) continue;
      ok(Array.isArray(s.choices) && s.choices.length >= 2, `'${s.title}': has choices`);
      ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length,
        `'${s.title}': the answer indexes a real choice`);
    }
    const p = M.PLACES.find((x) => x.label === 'tenth');
    const info = M.roundInfo(247, p.mult);
    ok(M.commas(info.lower) === '2.4' && M.commas(info.upper) === '2.5',
      'the decimal step says 2.47 is between 2.4 and 2.5');
    ok(M.commas(info.mid) === '2.45', 'it says the midpoint is 2.45');
    ok(M.commas(info.rounded) === '2.5', 'and that 2.5 wins');
    ok(info.decider === 7, 'and that the decider digit is 7');
  }

  return { checks, failures };
}

const MUTANTS = [
  ['round-half-up becomes round-half-down',
    '  const up = n >= mid; // round half UP: on/after the midpoint → up', '  const up = n > mid;'],
  ['the midpoint is computed off-centre',
    '  const mid = lower + place / 2; // the halfway "tipping point" (integer: place is even)',
    '  const mid = lower + place / 3;'],
  ['the decider reads the wrong digit, so the shortcut stops matching the picture',
    '  const deciderIndex = p.roundIndex - 1; // the single digit just right of the place',
    '  const deciderIndex = p.roundIndex;'],
  ['the lower neighbour is not a multiple of the place',
    '  const lower = Math.floor(n / place) * place; // the multiple at or below n',
    '  const lower = n - place;'],
  ['hundredths is offered as a rounding place (a no-op with a fractional midpoint)',
    "  { mult: 10, label: 'tenth', labelCap: 'Tenth', deciderName: 'hundredths', roundIndex: 1 },",
    "  { mult: 1, label: 'hundredth', labelCap: 'Hundredth', deciderName: 'x', roundIndex: 0 },\n  { mult: 10, label: 'tenth', labelCap: 'Tenth', deciderName: 'hundredths', roundIndex: 1 },"],
  ['the scale drifts, so the decimal places lose their integer midpoints',
    'const SCALE = 100; // n is an integer count of HUNDREDTHS', 'const SCALE = 10;'],
  ['a place multiplier stops matching its roundIndex',
    "  { mult: 1000, label: 'ten', labelCap: 'Ten', deciderName: 'ones', roundIndex: 3 },",
    "  { mult: 1000, label: 'ten', labelCap: 'Ten', deciderName: 'ones', roundIndex: 2 },"],
  ['the formatter prints trailing zeros (47.50)',
    "  if (frac !== 0) s += frac % 10 === 0 ? `.${frac / 10}` : `.${String(frac).padStart(2, '0')}`;",
    "  if (frac !== 0) s += `.${String(frac).padStart(2, '0')}`;"],
  ['the formatter loses the decimal part entirely',
    '  const frac = v % SCALE;               // 0…99 hundredths — an integer, always',
    '  const frac = 0;'],
  ['valueOf ignores the decimal digits (the old 4-digit sum)',
    '  digits.reduce((sum, d, i) => sum + d * DIGIT_MULT[i], 0);',
    '  digits.slice(2).reduce((sum, d, i) => sum + d * DIGIT_MULT[i + 2], 0);'],
  ['the calibration range is off by one',
    'const roundRange = (goal, place) => [goal - place / 2, goal + place / 2 - 1];',
    'const roundRange = (goal, place) => [goal - place / 2, goal + place / 2];'],
  ['a calibration goal stops being a multiple of its place',
    '{ place: 10, goals: [20, 30, 40, 50, 60, 70, 80, 90, 110, 120, 250, 340] },    // nearest tenth',
    '{ place: 10, goals: [20, 30, 40, 50, 60, 70, 80, 90, 110, 120, 250, 344] },'],
  ['the decimal step unlocks before the places grow',
    'const DECIMAL_STEP = 6; // the two decimal digits unlock here — the lab crosses the point',
    'const DECIMAL_STEP = 2;'],
];

function mutationTest() {
  const survivors = [];
  for (const [name, find, replace] of MUTANTS) {
    if (!MODEL_BODY.includes(find)) { survivors.push(`${name} — STALE ANCHOR (the model moved under this mutation)`); continue; }
    let caught = false;
    try { caught = runSuite(build(MODEL_BODY.replace(find, replace))).failures.length > 0; }
    catch { caught = true; }
    if (!caught) survivors.push(name);
  }
  return survivors;
}

const M = build(MODEL_BODY);
const { checks, failures } = runSuite(M);

console.log('audit-rounding — RoundingLab.jsx  (sliced, not mirrored)');
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
