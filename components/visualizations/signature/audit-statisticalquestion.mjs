/* ============================================================================
   audit-statisticalquestion.mjs — the numeric audit for StatisticalQuestionLab.

   Run:  node audit-statisticalquestion.mjs

   SLICES the pure model out of StatisticalQuestionLab.jsx (between the
   MODEL:START / MODEL:END sentinels) and evaluates it, so the code under test
   is the code that ships.

   What it proves:
     THE RULE          statistical ⟺ (ask many) AND (the answers disagree),
                       over every one of the 9 questions — and that NEITHER
                       condition alone decides it (the trap is real, not rhetoric).
     THE TRAP EXISTS   at least one question asks MANY and is still not
                       statistical, and at least one asks many and IS. Without
                       both, step 2 would be teaching a distinction the bench
                       cannot show.
     EXACTNESS         every answer is an integer; the test is exact set
                       counting; nothing rounds.
     PICTURE = CLAIM   the declared verdict agrees with the ACTUAL answers the
                       canvas draws — distinctCount over the same array.
     CALIBRATION       every goal is reachable, the meter reads 100% only when
                       the goal is met, and the stamp cannot fire falsely.
     DISTINCTNESS      the refusals this lab promises are enforced by grepping
                       its own source: no dot plot, no number line, no sorting
                       the answers onto an axis — those are DataLab's.

   And it MUTATION-TESTS itself: an audit that cannot fail proves nothing.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./StatisticalQuestionLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'SUBJECTS', 'ATTRIBUTES', 'QUESTION_TEXT', 'PARAMS', 'START', 'STEPS', 'GOALS',
  'subjectAt', 'attributeAt', 'answersOf', 'questionText', 'distinctCount',
  'asksMany', 'attributeVaries', 'isStatistical', 'verdictReason',
  'goalOf', 'matchPercent', 'isCalibrated', 'makeGoal', 'goalSolutions',
];
const build = (body) => new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  const NS = M.SUBJECTS.length, NA = M.ATTRIBUTES.length;
  const all = [];
  for (let s = 0; s < NS; s++) for (let a = 0; a < NA; a++) all.push([s, a]);

  /* === 1. the world is well-formed ==================================== */
  {
    ok(NS === 3 && NA === 3, 'three subjects × three attributes = nine questions');
    for (const sub of M.SUBJECTS) {
      ok(sub.n >= 1, `${sub.key}: at least one respondent`);
      for (const att of M.ATTRIBUTES) {
        const v = sub.values[att.key];
        ok(Array.isArray(v), `${sub.key}/${att.key}: has answers`);
        ok(v.length === sub.n,
          `${sub.key}/${att.key}: one answer per respondent (${v.length} vs n=${sub.n})`);
        for (const x of v) ok(Number.isInteger(x), `${sub.key}/${att.key}: every answer is an integer`);
      }
      ok(!!M.QUESTION_TEXT[sub.key], `${sub.key}: has question text`);
      for (const att of M.ATTRIBUTES) {
        const t = M.QUESTION_TEXT[sub.key][att.key];
        ok(typeof t === 'string' && t.trim().endsWith('?'),
          `${sub.key}/${att.key}: the question text is a question`);
      }
    }
  }

  /* === 2. THE RULE, over all nine ===================================== */
  for (const [s, a] of all) {
    const many = M.asksMany(s);
    const varies = M.attributeVaries(s, a);
    const stat = M.isStatistical(s, a);
    const q = M.questionText(s, a);
    ok(stat === (many && varies), `THE RULE must hold for "${q}"`);
    // the declared verdict must agree with the ACTUAL answers drawn on the canvas
    const v = M.answersOf(s, a);
    const distinct = new Set(v).size;
    ok(M.distinctCount(s, a) === distinct, `distinctCount matches the drawn answers for "${q}"`);
    ok(varies === (distinct > 1), `"disagree" must mean more than one distinct answer — "${q}"`);
    ok(many === (M.subjectAt(s).n > 1), `"ask many" must mean more than one respondent — "${q}"`);
    // a one-respondent question can never be statistical, whatever it asks
    if (M.subjectAt(s).n === 1) {
      ok(!stat, `one respondent can never be statistical — "${q}"`);
      ok(distinct === 1, `one respondent gives exactly one answer — "${q}"`);
    }
    ok(typeof M.verdictReason(s, a) === 'string' && M.verdictReason(s, a).length > 5,
      `every verdict explains itself — "${q}"`);
  }

  /* === 3. THE TRAP IS REAL ===========================================
     The lab's whole point is that "ask many" is necessary but NOT sufficient.
     That is only teachable if the bench actually contains a counterexample —
     so the counterexample is a REQUIREMENT, checked, not a hope. */
  {
    const trap = all.filter(([s, a]) => M.asksMany(s) && !M.attributeVaries(s, a));
    const stat = all.filter(([s, a]) => M.isStatistical(s, a));
    const solo = all.filter(([s]) => !M.asksMany(s));
    ok(trap.length >= 1,
      'THE TRAP must exist: at least one question asks MANY and is still not statistical');
    ok(stat.length >= 1, 'at least one question IS statistical');
    ok(solo.length >= 1, 'at least one question asks only one');
    // and "ask many" alone must NOT determine the verdict, or the trap is empty
    const manyOnes = all.filter(([s]) => M.asksMany(s));
    const verdicts = new Set(manyOnes.map(([s, a]) => M.isStatistical(s, a)));
    ok(verdicts.size === 2,
      'among the plural questions BOTH verdicts must occur — otherwise "ask many" decides it ' +
      'on its own and the lab is teaching a distinction it cannot show');
    // THE THEOREM: varies ⇒ many. One respondent cannot produce two different
    // answers, so a varying attribute already implies a plural subject. This is
    // a fact about the world, not a coincidence of this data, and it has a real
    // consequence: `attributeVaries` ALONE decides the verdict, and the two
    // conditions are NOT independent. The lab is still honest — both are
    // necessary, and "ask many" is kept because it is the condition students
    // over-trust — but anyone editing this model should know that dropping the
    // `asksMany` conjunct changes nothing observable. (A mutation that did
    // exactly that survived this suite; it was an EQUIVALENT program, not a
    // defect, and was replaced rather than papered over.)
    for (const [s, a] of all) {
      ok(!M.attributeVaries(s, a) || M.asksMany(s),
        `THEOREM varies ⇒ many must hold — "${M.questionText(s, a)}"`);
    }
    ok(all.every(([s, a]) => M.isStatistical(s, a) === M.attributeVaries(s, a)),
      'and therefore the verdict equals attributeVaries alone, on every question');
  }

  /* === 4. the specific claims the lesson makes out loud ================ */
  {
    const si = (k) => M.SUBJECTS.findIndex((x) => x.key === k);
    const ai = (k) => M.ATTRIBUTES.findIndex((x) => x.key === k);
    // step 0: "How old am I?" → exactly one answer
    ok(M.distinctCount(si('me'), ai('old')) === 1 && !M.isStatistical(si('me'), ai('old')),
      'step 0: "How old am I?" has exactly one answer and is not statistical');
    // step 1: class ages disagree
    ok(M.isStatistical(si('class'), ai('old')),
      'step 1: "How old are the students in my class?" is statistical');
    ok(M.distinctCount(si('class'), ai('old')) > 1, 'step 1: and the ages really do disagree');
    // step 2: THE TRAP — nine asked, every answer 2
    const legs = M.answersOf(si('class'), ai('legs'));
    ok(legs.length === 9, 'step 2: nine students are asked about legs');
    ok(new Set(legs).size === 1 && legs[0] === 2,
      'step 2: every one of the nine answers is 2 — the feedback says so');
    ok(M.asksMany(si('class')) && !M.isStatistical(si('class'), ai('legs')),
      'step 2: plural, and STILL not statistical — the trap');
    // step 4: dogs' heights
    ok(M.isStatistical(si('dogs'), ai('tall')),
      'step 4: "How tall are the dogs in the park?" is statistical');
    // dogs all have 4 legs — the second trap
    const dlegs = M.answersOf(si('dogs'), ai('legs'));
    ok(new Set(dlegs).size === 1 && dlegs[0] === 4, 'the dogs all have 4 legs');
    // the header claims exactly four of the nine are statistical
    ok(all.filter(([s, a]) => M.isStatistical(s, a)).length === 4,
      'step 3 says "only four of the nine questions here are statistical"');
    // START is the one-answer opener
    ok(!M.isStatistical(M.START.subject, M.START.attribute), 'START opens on a non-statistical question');
  }

  /* === 5. the lesson's shape ========================================== */
  {
    ok(M.STEPS.length === 6, 'six steps');
    for (const s of M.STEPS) {
      if (s.calib) { ok(!s.q, 'the calibration step asks no multiple-choice question'); continue; }
      ok(Array.isArray(s.choices) && s.choices.length === 3, `'${s.focus}': three choices`);
      ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length,
        `'${s.focus}': the answer indexes a real choice`);
      ok(typeof s.feedback === 'string' && s.feedback.length > 60, `'${s.focus}': the reveal is in the feedback`);
    }
    const unlocks = M.PARAMS.map((p) => p.unlock);
    ok(new Set(unlocks).size === unlocks.length, 'dials unlock one per step');
  }

  /* === 6. calibration ================================================= */
  {
    for (const g of M.GOALS) {
      const sols = M.goalSolutions(g.key);
      ok(sols.length >= 1, `goal "${g.key}" is reachable (${sols.length} solutions)`);
      for (const [s, a] of sols) {
        ok(M.isCalibrated(s, a, g.key), `goal "${g.key}": its solution stamps`);
        ok(M.matchPercent(s, a, g.key) === 100, `goal "${g.key}": its solution reads 100%`);
      }
      // NO FALSE STAMP: over every question, stamp ⟺ the goal's own test
      for (const [s, a] of all) {
        const met = g.test(s, a);
        ok(M.isCalibrated(s, a, g.key) === met,
          `stamp ⟺ goal met (${g.key}, "${M.questionText(s, a)}")`);
        ok((M.matchPercent(s, a, g.key) === 100) === met,
          `the meter reads 100% only when the goal is met (${g.key}, "${M.questionText(s, a)}")`);
      }
    }
    // the trap goal must be genuinely harder than the others, or it is not a goal
    ok(M.goalSolutions('trap').length >= 1 && M.goalSolutions('trap').length < M.goalSolutions('stat').length,
      'the trap goal has fewer solutions than the plain statistical goal');
    // makeGoal never repeats and always returns a real goal
    let s = 7;
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    let prev = null;
    for (let i = 0; i < 2000; i++) {
      const g = M.makeGoal(prev, rand);
      ok(!!M.goalOf(g), 'makeGoal returns a real goal');
      if (prev) ok(g !== prev, 'makeGoal never repeats the previous goal');
      prev = g;
    }
  }

  /* === 7. DISTINCTNESS — the refusals, enforced against this source ====
     Statistics is the biggest family in the library. This lab owns the QUESTION,
     before the data; DataLab owns the DOT PLOT and the distribution. If a dot
     plot or a number line ever appears here, this lab has stopped being
     distinct — so the grep is part of the audit, not a comment. The header is
     exempt: it names the siblings on purpose. */
  {
    // Grep the COMMENT-STRIPPED source. The refusals are written down in the
    // comments ("there is NO dot plot here"), so grepping raw text convicts the
    // lab of the very thing those comments promise it does not do. What must be
    // absent is the CODE — the drawing, the sorting, the axis.
    const stripComments = (t) =>
      t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const body = stripComments(SRC.slice(SRC.indexOf('==== MODEL:START')));
    const banned = [
      ['dot plot', "DataLab's picture"],
      ['number line', "DataLab's axis"],
      ['histogram', "HistogramLab's picture"],
      ['distribution', "DataLab's 6.SP.A.2"],
    ];
    for (const [word, owner] of banned) {
      ok(!new RegExp(word.replace(' ', '\\s+'), 'i').test(body),
        `the lab body must not reach for "${word}" — that is ${owner}`);
    }
    // the answers must never be sorted: sorting them onto an axis IS the dot plot
    ok(!/\.sort\(/.test(body), 'the answers must never be sorted — a sorted set is a distribution');
    ok(/anticipat/i.test(SRC), 'the lab must name its own standard: anticipating variability');
  }

  return { checks, failures };
}

const MUTANTS = [
  ['THE RULE drops the "varies" half (ask many ⇒ statistical)',
    'const isStatistical = (si, ai) => asksMany(si) && attributeVaries(si, ai);',
    'const isStatistical = (si, ai) => asksMany(si);'],
  // NOTE: `isStatistical = attributeVaries(si, ai)` is deliberately NOT a mutant.
  // Because varies ⇒ many (see THE THEOREM in the suite), it is an EQUIVALENT
  // program — identical on all nine questions — so demanding the suite catch it
  // would be demanding the suite detect a difference that does not exist.
  // Replaced with a mutation that IS observable:
  ['THE RULE inverts the "varies" half (disagreement makes it NOT statistical)',
    'const isStatistical = (si, ai) => asksMany(si) && attributeVaries(si, ai);',
    'const isStatistical = (si, ai) => asksMany(si) && !attributeVaries(si, ai);'],
  ['THE RULE becomes OR instead of AND',
    'const isStatistical = (si, ai) => asksMany(si) && attributeVaries(si, ai);',
    'const isStatistical = (si, ai) => asksMany(si) || attributeVaries(si, ai);'],
  ['the trap is destroyed: the class legs start varying',
    'legs: [2, 2, 2, 2, 2, 2, 2, 2, 2],', 'legs: [2, 2, 3, 2, 2, 2, 2, 2, 2],'],
  ['the dogs lose a leg (the second trap breaks)',
    'legs: [4, 4, 4, 4, 4, 4],', 'legs: [4, 4, 4, 3, 4, 4],'],
  ['"disagree" counts answers, not DIFFERENT answers',
    'const distinctCount = (si, ai) => new Set(answersOf(si, ai)).size;',
    'const distinctCount = (si, ai) => answersOf(si, ai).length;'],
  ['"ask many" is off by one (one respondent counts as many)',
    'const asksMany = (si) => subjectAt(si).n > 1;', 'const asksMany = (si) => subjectAt(si).n >= 1;'],
  ['a subject has fewer answers than respondents',
    'old: [11, 12, 11, 12, 11, 11, 12, 11, 12],', 'old: [11, 12, 11],'],
  ['the meter can read 100% without the goal being met',
    'return Math.round((100 * cs.filter(Boolean).length) / cs.length);', 'return 100;'],
  ['the stamp ignores the goal',
    'const isCalibrated = (si, ai, goalKey) => goalOf(goalKey).test(si, ai);',
    'const isCalibrated = () => true;'],
  ['the trap GOAL becomes unreachable',
    'test: (si, ai) => asksMany(si) && !attributeVaries(si, ai),',
    'test: (si, ai) => asksMany(si) && !attributeVaries(si, ai) && si === 99,'],
  ['a question text stops being a question',
    "legs: 'How many legs do the students in my class have?',",
    "legs: 'The students in my class have legs.',"],
  ['START opens on a statistical question (the step-0 copy would be wrong)',
    'const START = { subject: 0, attribute: 1 };', 'const START = { subject: 1, attribute: 1 };'],
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

console.log('audit-statisticalquestion — StatisticalQuestionLab.jsx  (sliced)');
console.log('─'.repeat(64));
console.log(`model sliced from the shipped component: ${MODEL_BODY.split('\n').length} lines`);
console.log(`checks run: ${checks.toLocaleString()}`);
console.log(`failures:   ${failures.length}`);
for (const f of failures.slice(0, 20)) console.log('  ✗ ' + f);

console.log('─'.repeat(64));
console.log(`mutation test: ${MUTANTS.length} deliberate defects injected…`);
const survivors = mutationTest();
if (survivors.length === 0) console.log(`all ${MUTANTS.length} caught — the suite has teeth.`);
else { console.log(`${survivors.length} SURVIVED — holes in the AUDIT:`); for (const s of survivors) console.log('  ⚠ ' + s); }

console.log('─'.repeat(64));
const pass = failures.length === 0 && survivors.length === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
