/* ============================================================================
   audit-storyproblem.mjs — the numeric audit for StoryProblemLab.jsx (K.OA.A.2).

   Run:  node audit-storyproblem.mjs

   It SLICES the pure model out of StoryProblemLab.jsx (between MODEL:START and
   MODEL:END) and evaluates it — the code under test is the code that ships.

   What it proves:
     THE OPERATION   join ⟺ + and separate ⟺ −, and the result is exactly
                     start+change or start−change.
     WITHIN 10       every generated story stays in [0,10] and never goes
                     negative — the K.OA.A.2 range, checked exhaustively.
     THE STAMP       CALIBRATED needs BOTH the operation AND the number right;
                     a right number with the wrong sign must NOT stamp (the
                     operation is half the answer — the whole point).
     REACHABLE       makeStory only ever produces valid, in-range stories, and
                     never repeats the previous one.
     THE KEYS        every lesson answer matches the model's arithmetic.
     DISTINCTNESS    the number-line / hops picture is grepped OUT of the body.
   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./StoryProblemLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in StoryProblemLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'ACTIONS', 'opOf', 'resultOf', 'sentenceOf', 'storyValid', 'DEMO',
  'RESULT_DIAL', 'makeStory', 'isCalibrated', 'STEPS',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  /* === 0. the two actions and their signs =============================== */
  ok(M.ACTIONS.length === 2 && M.ACTIONS.includes('join') && M.ACTIONS.includes('separate'),
    'exactly two actions: join, separate');
  ok(M.opOf('join') === '+' && M.opOf('separate') === '−', 'join→+, separate→−');

  /* === 1. THE OPERATION — result is exactly + or − over the whole range == */
  for (let start = 0; start <= 10; start++) {
    for (let change = 0; change <= 10; change++) {
      ok(M.resultOf('join', start, change) === start + change, `join = start+change (${start},${change})`);
      ok(M.resultOf('separate', start, change) === start - change, `separate = start−change (${start},${change})`);
      const sj = M.sentenceOf('join', start, change);
      ok(sj.op === '+' && sj.start === start && sj.change === change && sj.result === start + change,
        `sentence(join) parts (${start},${change})`);
      const ss = M.sentenceOf('separate', start, change);
      ok(ss.op === '−' && ss.result === start - change, `sentence(separate) parts (${start},${change})`);
      // every value is an exact integer — no float can appear
      ok(Number.isInteger(sj.result) && Number.isInteger(ss.result), 'results are integers');
    }
  }

  /* === 2. WITHIN 10, never negative — the validity gate ================== */
  for (let start = -1; start <= 11; start++) for (let change = -1; change <= 11; change++) {
    const jv = M.storyValid('join', start, change);
    const sv = M.storyValid('separate', start, change);
    ok(jv === (start >= 0 && change >= 0 && start <= 10 && change <= 10 && start + change <= 10),
      `join validity (${start},${change})`);
    ok(sv === (start >= 0 && change >= 0 && start <= 10 && change <= 10 && start - change >= 0),
      `separate validity (${start},${change})`);
  }

  /* === 3. THE STAMP — both the sign AND the number must be right ========= */
  {
    const story = { action: 'join', start: 4, change: 3, result: 7 };
    // right number, WRONG sign: must NOT stamp
    ok(!M.isCalibrated(story, 'separate', 7), 'right number + wrong sign must NOT calibrate');
    // right sign, WRONG number: must NOT stamp
    ok(!M.isCalibrated(story, 'join', 6), 'right sign + wrong number must NOT calibrate');
    // both right: stamps
    ok(M.isCalibrated(story, 'join', 7), 'both right → CALIBRATED');
    // exhaustive: over every action×result, stamp ⟺ (action right AND result right)
    for (const action of M.ACTIONS) for (let r = 0; r <= 10; r++) {
      const want = action === story.action && r === story.result;
      ok(M.isCalibrated(story, action, r) === want, `stamp ⟺ both right (${action},${r})`);
    }
  }

  /* === 4. makeStory — always valid, in range, and never a repeat ======== */
  {
    const rand = (() => { let s = 5; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    let prev = null;
    for (let i = 0; i < 5000; i++) {
      const s = M.makeStory(prev, rand);
      ok(M.storyValid(s.action, s.start, s.change), `makeStory is valid (${s.action},${s.start},${s.change})`);
      ok(s.result === M.resultOf(s.action, s.start, s.change), 'makeStory result matches');
      ok(s.result >= 0 && s.result <= 10, `makeStory result within 10 (=${s.result})`);
      ok(s.start >= 2 && s.start <= 8, 'makeStory start is a sensible 2..8');
      ok(s.change >= 1, 'makeStory change is at least 1 (something happens)');
      if (prev) ok(!(s.action === prev.action && s.start === prev.start && s.change === prev.change),
        'makeStory never repeats the previous story');
      prev = s;
    }
  }

  /* === 5. the demo stories are the ones the copy names =================== */
  {
    ok(M.DEMO.join.action === 'join' && M.resultOf('join', M.DEMO.join.start, M.DEMO.join.change) === 5,
      'DEMO.join is 3 + 2 = 5');
    ok(M.DEMO.separate.action === 'separate' && M.resultOf('separate', M.DEMO.separate.start, M.DEMO.separate.change) === 3,
      'DEMO.separate is 5 − 2 = 3');
    ok(M.DEMO.predict.action === 'join' && M.resultOf('join', M.DEMO.predict.start, M.DEMO.predict.change) === 7,
      'DEMO.predict is 4 + 3 = 7');
    for (const d of Object.values(M.DEMO)) ok(M.storyValid(d.action, d.start, d.change), 'every demo is valid');
  }

  /* === 6. the lesson keys match the model =============================== */
  {
    ok(M.STEPS.length === 6, 'six steps');
    const byFocus = Object.fromEntries(M.STEPS.map((s) => [s.focus, s]));
    for (const f of ['join', 'join-op', 'separate', 'decide', 'sentence', 'calib']) ok(!!byFocus[f], `has '${f}' step`);
    ok(byFocus.calib.calib === true, 'calib step flagged');
    for (const s of M.STEPS) {
      if (s.calib) continue;
      ok(Array.isArray(s.choices) && s.choices.length === 3, `'${s.focus}': three choices`);
      ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < 3, `'${s.focus}': answer indexes a choice`);
      ok(typeof s.feedback === 'string' && s.feedback.length > 40, `'${s.focus}': reveal in feedback`);
    }
    // the stated answers are the model's arithmetic
    ok(byFocus.join.choices[byFocus.join.answer] === '5', "join step answer is 5 (3+2)");
    ok(byFocus.separate.choices[byFocus.separate.answer] === '3', "separate step answer is 3 (5−2)");
    ok(byFocus.sentence.choices[byFocus.sentence.answer] === '4 + 3 = 7', "sentence step answer is 4+3=7");
    ok(byFocus['join-op'].choices[byFocus['join-op'].answer].includes('+'), "join-op answer is +");
    ok(byFocus.decide.choices[byFocus.decide.answer].toLowerCase().includes('add'), "decide answer is add");
    // K-TIER RESTRAINT: exactly one dial, and only in the challenge
    ok(M.RESULT_DIAL.min === 0 && M.RESULT_DIAL.max === 10, 'the one dial spans 0..10');
    ok(!M.STEPS.some((s) => s.dial && !s.calib), 'no teaching step carries a dial (K-tier restraint)');
  }

  /* === 7. DISTINCTNESS — the number-line/hops picture is grepped OUT ===== */
  {
    const body = MODEL_BODY.toLowerCase();
    for (const [word, owner] of [['number line', 'AddLab'], ['hop', 'AddLab'], ['fact family', 'SubtractionLab'], ['part-part-whole', 'NumberBondLab']]) {
      ok(!body.includes(word), `model must not reach for "${word}" — that is ${owner}`);
    }
    ok(/join|separate|story/i.test(MODEL_BODY), 'the model names its own idea: the story');
  }

  return { checks, failures };
}

const MUTANTS = [
  ['separate goes negative (below zero ducks)',
    'return action === \'join\' ? start + change : start - change;',
    'return action === \'join\' ? start + change : Math.abs(start - change) + 1;'],
  ['join subtracts instead of adds',
    'return action === \'join\' ? start + change : start - change;',
    'return action === \'join\' ? start - change : start - change;'],
  ['the sign map is swapped (join→−)',
    "const opOf = (action) => (action === 'join' ? '+' : '−');",
    "const opOf = (action) => (action === 'join' ? '−' : '+');"],
  ['the stamp ignores the OPERATION (only checks the number)',
    'chosenAction === story.action && chosenResult === story.result;',
    'chosenResult === story.result;'],
  ['the stamp ignores the NUMBER (only checks the operation)',
    'chosenAction === story.action && chosenResult === story.result;',
    'chosenAction === story.action;'],
  ['validity forgets the ≤10 ceiling',
    'if (start < 0 || change < 0 || start > 10 || change > 10) return false;',
    'if (start < 0 || change < 0) return false;'],
  ['makeStory lets separates go negative',
    'const change = action === \'join\' ? pick(1, 10 - start) : pick(1, start);',
    'const change = action === \'join\' ? pick(1, 10 - start) : pick(1, start + 4);'],
  ['makeStory lets joins exceed 10',
    'const change = action === \'join\' ? pick(1, 10 - start) : pick(1, start);',
    'const change = action === \'join\' ? pick(1, 10) : pick(1, start);'],
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
console.log('audit-storyproblem — StoryProblemLab.jsx');
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
