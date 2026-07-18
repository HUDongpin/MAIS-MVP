/* ============================================================================
   audit-position.mjs — the numeric audit for PositionLab.jsx.

   Run:  node audit-position.mjs

   Like audit-pyramid / audit-shapes, this SLICES the pure model out of
   PositionLab.jsx (between the MODEL:START / MODEL:END sentinels) and evaluates
   that text, so the code under test is the code that ships.

   What it proves:

     THE RELATION      positionWord is a genuine RELATION on pairs: total (every
                       pair gets a word), converse-consistent (swap the pair and
                       the word flips: above↔below, behind↔in front of, and
                       beside↔beside), and irreflexive-ish (a thing compared to
                       its own spot is 'on', never a direction).
     BLINDNESS         positionWord reads TWO POSITIONS AND NOTHING ELSE. Proved
                       by grepping the function's own body for any mention of
                       colour, size, label or key — invariance by scope, the
                       ShapesLab pattern. A lab that promises this only in prose
                       will break the promise.
     THE BIG IDEA      the sandwich really exists: with the ball in the middle
                       spot it is 'above' the box and 'below' the shelf at the
                       same time, from the same function.
     THE STAMP         calibration is a string equality on the computed word, so
                       it cannot fire on a near-miss; every goal is reachable.
     K-TIER RESTRAINT  the standing project rule for young-child labs — ONE
                       dial, say each thing ONCE, no facts grid — enforced by
                       grepping the comment-stripped source, because density
                       creeps back in silently.

   AND IT MUTATION-TESTS ITSELF. An audit that cannot fail proves nothing.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./PositionLab.jsx', import.meta.url), 'utf8');

function sliceModel(src) {
  const m = src.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
  if (!m) throw new Error('MODEL sentinels not found in PositionLab.jsx');
  return m[1];
}
const MODEL_BODY = sliceModel(SRC);

const EXPORTS = [
  'BOX', 'SHELF', 'SPOTS', 'START', 'STEPS', 'GOALS', 'OPPOSITE',
  'ballAt', 'positionWord', 'sentence', 'makeTarget', 'isCalibrated', 'spotsFor',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const DIRECTIONS = ['above', 'below', 'behind', 'in front of', 'beside'];

function runSuite(M) {
  let checks = 0;
  const failures = [];
  const ok = (cond, msg) => { checks++; if (!cond) failures.push(msg); };

  /* a dense cube of integer positions to quantify over */
  const GRID = [];
  for (let x = -3; x <= 3; x++)
    for (let y = -3; y <= 3; y++)
      for (let z = -3; z <= 3; z++) GRID.push({ x, y, z, label: 'thing', key: 'g' });

  /* === 1. the word is TOTAL and always a real word ======================= */
  const VALID = new Set([...DIRECTIONS, 'on']);
  for (const a of GRID) {
    for (const b of GRID) {
      const w = M.positionWord(a, b);
      ok(VALID.has(w), `positionWord must return a real word (got ${w})`);
    }
  }

  /* === 2. THE CONVERSE — swap the pair and the word flips ===============
     This is the lab's claim in step 4's feedback ("if the ball is above the
     box, then the box is below the ball"). It is a theorem about the model, so
     it gets checked over every ordered pair — not asserted in prose. */
  for (const a of GRID) {
    for (const b of GRID) {
      const w = M.positionWord(a, b);
      const back = M.positionWord(b, a);
      ok(back === M.OPPOSITE[w],
        `converse: word(a,b)=${w} ⇒ word(b,a) must be ${M.OPPOSITE[w]}, got ${back}`);
      ok(M.OPPOSITE[M.OPPOSITE[w]] === w, `OPPOSITE must be an involution (${w})`);
    }
  }

  /* === 3. same spot ⇒ 'on', never a direction =========================== */
  for (const a of GRID) {
    ok(M.positionWord(a, { ...a }) === 'on',
      'a thing at the same spot as another is "on" it, not above/below/beside');
    for (const b of GRID) {
      const same = a.x === b.x && a.y === b.y && a.z === b.z;
      const w = M.positionWord(a, b);
      ok(same === (w === 'on'), '"on" happens exactly when the spots coincide');
    }
  }

  /* === 4. BLINDNESS — positionWord reads only the two positions ==========
     The heart of the lab: the word belongs to the PAIR, and the function is
     scoped so it literally cannot consult anything else. Grep its own body. */
  {
    const m = MODEL_BODY.match(/function positionWord\(a, b\) \{([\s\S]*?)\n\}/);
    ok(!!m, 'positionWord must be findable in the model');
    if (m) {
      const body = m[1];
      for (const forbidden of ['label', 'key', 'color', 'colour', 'size', 'radius', 'BOX', 'SHELF', 'ball']) {
        ok(!new RegExp(`\\b${forbidden}\\b`, 'i').test(body),
          `positionWord must not read "${forbidden}" — the word is about POSITIONS, ` +
          `not about what the objects are`);
      }
      // it may only touch the coordinate fields
      const fields = [...body.matchAll(/\.([a-zA-Z_]\w*)/g)].map((r) => r[1]);
      for (const f of fields) {
        ok(['x', 'y', 'z'].includes(f),
          `positionWord may only read .x/.y/.z — it reads .${f}`);
      }
      // and the same function, given the same coordinates, must ignore all the
      // rest: dress the objects up differently and the word cannot move
      for (const a of GRID.slice(0, 60)) {
        for (const b of GRID.slice(0, 60)) {
          const plain = M.positionWord({ x: a.x, y: a.y, z: a.z }, { x: b.x, y: b.y, z: b.z });
          const dressed = M.positionWord(
            { ...a, label: 'a huge red ball', key: 'ball', size: 99, color: 'red' },
            { ...b, label: 'a tiny blue crate', key: 'box', size: 1, color: 'blue' },
          );
          ok(plain === dressed, 'dressing the objects up must not change the word');
        }
      }
    }
  }

  /* === 5. the six spots are unambiguous by construction ==================
     Each spot differs from the box on EXACTLY ONE axis, which is why no
     priority rule is ever needed for the positions a child can actually make. */
  {
    ok(M.SPOTS.length === 6, 'six spots');
    const words = new Set();
    for (let i = 0; i < M.SPOTS.length; i++) {
      const s = M.ballAt(i);
      const diffs = [s.x - M.BOX.x, s.y - M.BOX.y, s.z - M.BOX.z].filter((d) => d !== 0);
      ok(diffs.length === 1,
        `spot ${s.key}: must differ from the box on exactly ONE axis (differs on ${diffs.length})`);
      ok(Number.isInteger(s.x) && Number.isInteger(s.y) && Number.isInteger(s.z),
        `spot ${s.key}: integer coordinates — no floats to round`);
      const w = M.positionWord(s, M.BOX);
      ok(DIRECTIONS.includes(w), `spot ${s.key}: names a direction, not "on"`);
      words.add(w);
    }
    // every position word the standard names must be reachable
    for (const w of DIRECTIONS) {
      ok(words.has(w), `the ball must be able to be "${w}" the box — K.G.A.1 names it`);
    }
    ok(M.ballAt(-5).key === M.SPOTS[0].key && M.ballAt(99).key === M.SPOTS[5].key,
      'ballAt clamps out-of-range dial values instead of returning undefined');
  }

  /* === 6. THE BIG IDEA — the sandwich is real ===========================
     Step 4 claims the ball is above the box AND below the shelf at once. Both
     sentences come from the same function; if the geometry ever drifts, this
     fails. */
  {
    ok(M.SHELF.y > M.BOX.y, 'the shelf must sit above the box, or the sandwich cannot exist');
    ok(M.SHELF.x === M.BOX.x && M.SHELF.z === M.BOX.z,
      'the shelf sits straight above the box, so the comparison stays on one axis');
    const middle = M.ballAt(0); // the step parks the ball here
    ok(M.positionWord(middle, M.BOX) === 'above', 'the middle spot is ABOVE the box');
    ok(M.positionWord(middle, M.SHELF) === 'below', 'the middle spot is BELOW the shelf');
    ok(M.positionWord(middle, M.BOX) !== M.positionWord(middle, M.SHELF),
      'the SAME ball must earn two DIFFERENT words — that is the whole lab');
    // and the ball genuinely sits between them
    ok(middle.y > M.BOX.y && middle.y < M.SHELF.y, 'the ball is sandwiched');
    // the sentence a child reads must actually contain the word and the target
    const s = M.sentence('the ball', middle, M.BOX);
    ok(s.includes('above') && s.includes(M.BOX.label) && s.startsWith('the ball'),
      `the sentence must read naturally (got "${s}")`);
  }

  /* === 7. calibration: exact, reachable, no false stamp ================== */
  {
    for (const g of M.GOALS) {
      ok(DIRECTIONS.includes(g), `goal "${g}" is a real position word`);
      const spots = M.spotsFor(g);
      ok(spots.length >= 1, `goal "${g}" must be reachable on the dial`);
      for (const i of spots) {
        ok(M.isCalibrated(i, g), `spot ${i} really satisfies "${g}"`);
        ok(M.positionWord(M.ballAt(i), M.BOX) === g, 'and the word agrees');
      }
      // THE NO-FALSE-STAMP PROOF: over every dial position, the stamp fires
      // exactly when the computed word is the goal.
      for (let i = 0; i < M.SPOTS.length; i++) {
        ok(M.isCalibrated(i, g) === (M.positionWord(M.ballAt(i), M.BOX) === g),
          `stamp ⟺ the word matches (spot ${i}, goal ${g})`);
      }
    }
    // 'beside' honestly has two answers (either side) — the model must say so
    ok(M.spotsFor('beside').length === 2,
      '"beside" is satisfied on either side of the box — two spots, both correct');
    ok(M.spotsFor('above').length === 1, '"above" has exactly one spot');

    const rand = rng(7);
    let prev = null;
    for (let i = 0; i < 2000; i++) {
      const t = M.makeTarget(prev, rand);
      ok(M.GOALS.includes(t), 'makeTarget returns a real goal');
      if (prev) ok(t !== prev, 'makeTarget never repeats the previous word');
      prev = t;
    }
  }

  /* === 8. the lesson's answer keys must match the model ================== */
  {
    ok(M.STEPS.length === 5, 'five steps — a K lab is short');
    const byFocus = Object.fromEntries(M.STEPS.map((s) => [s.focus, s]));
    for (const f of ['meet', 'move', 'depth', 'two', 'calib']) {
      ok(!!byFocus[f], `the lesson has a '${f}' step`);
    }
    for (const s of M.STEPS) {
      if (s.calib) { ok(!s.q, 'the build step asks no multiple-choice question'); continue; }
      ok(s.choices.length === 3, `'${s.focus}': three choices`);
      ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < 3,
        `'${s.focus}': the answer indexes a real choice`);
    }
    // step 0 says the ball starts above the box — so it had better start there
    ok(M.positionWord(M.ballAt(M.START.where), M.BOX) === 'above',
      'START must put the ball ABOVE the box, which is what step 1 says it does');
    ok(byFocus.meet.choices[byFocus.meet.answer] === 'Above the box',
      "the 'meet' step's answer is Above the box");
    // step 1 asks for the BOTTOM spot and answers 'below' — the bottom spot
    // must really be the lowest one on the dial
    const ys = M.SPOTS.map((s) => s.y);
    const lowest = ys.indexOf(Math.min(...ys));
    ok(M.positionWord(M.ballAt(lowest), M.BOX) === 'below',
      "the 'move' step's bottom spot must really be BELOW the box");
    ok(byFocus.move.choices[byFocus.move.answer] === 'Below the box',
      "the 'move' step's answer is Below the box");
    ok(byFocus.depth.choices[byFocus.depth.answer] === 'Behind the box',
      "the 'depth' step's answer is Behind the box");
    ok(byFocus.two.choices[byFocus.two.answer].startsWith('Yes'),
      "the 'two' step's answer is that both are true at once");
  }

  /* === 9. K-TIER RESTRAINT — the standing project rule, enforced =========
     Young-child labs must be SIMPLE: one dial, each thing said once. This is
     the rule the project has had to re-learn three times, so it is a check and
     not a comment. Strip comments and strings-in-prose first, then count. */
  {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const noComments = strip(SRC);
    // The styled-jsx block styles `input[type='range']`, which is not a dial —
    // it is three CSS selectors. Count MARKUP, not stylesheet.
    const markup = noComments.replace(/<style jsx>\{`[\s\S]*?`\}<\/style>/, '');

    // ONE dial: exactly one range input in the whole component
    const ranges = [...markup.matchAll(/<input[^>]*type=['"]range['"]/g)].length;
    ok(ranges === 1, `a K lab gets ONE dial — found ${ranges} range inputs`);

    // no facts grid (the density that had to be cut from three sibling K labs)
    ok(!/className=['"]facts['"]/.test(noComments), 'no facts grid in a K lab');
    ok(!/fact-k|fact-v/.test(noComments), 'no facts-row markup in a K lab');

    // no locked ghost dials: if you are designing a locked dial, you want none
    ok(!/PARAMS\s*=/.test(MODEL_BODY),
      'a K lab has no multi-dial PARAMS table — one dial needs no table');

    // the sentence is said ONCE: exactly one place computes the main sentence
    const says = [...markup.matchAll(/sentence\('the ball'/g)].length;
    ok(says === 2, `the sentence is built in exactly the two places shown to the ` +
      `child (box + shelf) — found ${says}`);

    // no toggle buttons / lens controls
    ok(!/aria-pressed/.test(markup), 'no toggle buttons in a K lab');

    // no numbers on the stage: this lab is about words, not measurement, and a
    // number line here would be PointLab's and NumberLab's territory. Grep the
    // CODE — the prose above is allowed to name what it refuses.
    ok(!/number line|axis|coordinate/i.test(strip(MODEL_BODY)),
      'no number line / axes — K.G.A.1 is words, and the coordinates are PointLab’s');
  }

  /* === 10. DISTINCTNESS — the refusals, enforced against this source =====
     The swap DEVICE belongs to CommutativeLab / AddLab / MultiplicationLab
     (where swapping changes nothing). Here swapping flips the word, so the
     converse is a fact the lab STATES, never a button it ships. */
  {
    const marker = '==== MODEL:START';
    const body = SRC.slice(SRC.indexOf(marker));
    ok(!/onClick=\{[^}]*swap/i.test(body), 'no swap button — that device is CommutativeLab’s');
    ok(!/>\s*Swap|Swap\s*</i.test(body), 'no Swap control in the UI');
    ok(!/sort|bin|attribute/i.test(body),
      'no sorting/bins — that is SortLab’s picture (properties of ONE object)');
  }

  return { checks, failures };
}

/* ---- mutation testing --------------------------------------------------- */
const MUTANTS = [
  ['the converse breaks: above no longer flips to below',
    "  above: 'below',\n  below: 'above',", "  above: 'above',\n  below: 'above',"],
  ['positionWord reports below for a thing that is above',
    "if (dy > 0) return 'above';", "if (dy > 0) return 'below';"],
  ['positionWord confuses behind with in front of',
    "if (dz > 0) return 'behind';", "if (dz > 0) return 'in front of';"],
  ['positionWord peeks at the objects instead of their positions',
    '  const dy = a.y - b.y;', '  if (a.key === \'ball\') return \'above\';\n  const dy = a.y - b.y;'],
  ['a thing on the same spot is called "above"',
    "  return 'on';\n}", "  return 'above';\n}"],
  ['the shelf sinks below the box, destroying the sandwich',
    "const SHELF = { key: 'shelf', label: 'the shelf', x: 0, y: 2, z: 0 };",
    "const SHELF = { key: 'shelf', label: 'the shelf', x: 0, y: -2, z: 0 };"],
  ['the ball no longer starts above the box',
    'const START = { where: 0 };', 'const START = { where: 5 };'],
  ['a spot drifts off its axis and becomes ambiguous',
    "{ key: 'above',  x: 0,  y: 1,  z: 0 },", "{ key: 'above',  x: 1,  y: 1,  z: 0 },"],
  ['the stamp stops checking the word',
    "  return positionWord(ballAt(where), BOX) === goal;", '  return true;'],
  ['a goal becomes unreachable on the dial',
    "const GOALS = ['behind', 'below', 'beside', 'in front of', 'above'];",
    "const GOALS = ['behind', 'below', 'beside', 'in front of', 'above', 'on'];"],
  ['ballAt stops clamping and can return undefined',
    'const ballAt = (where) => SPOTS[Math.max(0, Math.min(SPOTS.length - 1, where))];',
    'const ballAt = (where) => SPOTS[where];'],
  ['the sentence stops naming what the ball is compared to',
    'return `${subject} is ${positionWord(a, b)} ${b.label}`;',
    'return `${subject} is ${positionWord(a, b)}`;'],
];

function mutationTest() {
  const survivors = [];
  for (const [name, find, replace] of MUTANTS) {
    if (!MODEL_BODY.includes(find)) {
      survivors.push(`${name} — MUTATION IS STALE: its anchor text is gone from the model`);
      continue;
    }
    let caught = false;
    try {
      const { failures } = runSuite(build(MODEL_BODY.replace(find, replace)));
      caught = failures.length > 0;
    } catch { caught = true; }
    if (!caught) survivors.push(name);
  }
  return survivors;
}

/* ---- main --------------------------------------------------------------- */
const M = build(MODEL_BODY);
const { checks, failures } = runSuite(M);

console.log('audit-position — PositionLab.jsx');
console.log('─'.repeat(64));
console.log(`model sliced from the shipped component: ${MODEL_BODY.split('\n').length} lines`);
console.log(`checks run: ${checks.toLocaleString()}`);
console.log(`failures:   ${failures.length}`);
for (const f of failures.slice(0, 25)) console.log('  ✗ ' + f);
if (failures.length > 25) console.log(`  … and ${failures.length - 25} more`);

console.log('─'.repeat(64));
console.log(`mutation test: ${MUTANTS.length} deliberate defects injected into the model…`);
const survivors = mutationTest();
if (survivors.length === 0) console.log(`all ${MUTANTS.length} caught — the suite has teeth.`);
else {
  console.log(`${survivors.length} SURVIVED — holes in the AUDIT, not the lab:`);
  for (const s of survivors) console.log('  ⚠ ' + s);
}

console.log('─'.repeat(64));
const pass = failures.length === 0 && survivors.length === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
