/* ============================================================================
   audit-composition.mjs — the numeric audit for CompositionLab.jsx.

   Run:  node audit-composition.mjs

   It SLICES the pure model out of CompositionLab.jsx (between the MODEL:START
   and MODEL:END sentinels) and evaluates it, so the code under test is the code
   that ships — a mirror would drift, a slice cannot.

   What it proves:
     THE THESIS      f(g(x)) ≠ g(f(x)) — the two orders differ exactly when
                     b·(c−1) ≠ 0, checked exhaustively over the dial grid and
                     against an independent brute-force reference.
     THE CHAIN       the middle value on the wire is the first machine's output
                     AND the second machine's input, for both orders.
     THE RULES       each order's composite rule (slope, intercept) matches
                     running the machines, at every x.
     THE GAP         the difference between orders is b·(c−1), INDEPENDENT of x
                     (the composite lines are parallel).
     AGREEMENT       ordersAgree ⟺ b=0 or c=1, and ⟺ the outputs match for ALL x.
     EXACTNESS       every output is an integer — no float can appear.
     CALIBRATION     every target is reachable; the stamp is an integer identity
                     and cannot fire falsely.
     DISTINCTNESS    the siblings' pictures (inverse/undo/mirror/backward) are
                     grepped OUT of the model body.
   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./CompositionLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in CompositionLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'times', 'plus', 'ORDERS', 'runChain', 'ruleOf', 'ordersAgree', 'orderGap',
  'PARAMS', 'START', 'STEPS', 'makeTarget', 'isCalibrated', 'matchPercent',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  // the dial grid, straight from PARAMS so the audit tracks the shipped ranges
  const P = Object.fromEntries(M.PARAMS.map((p) => [p.key, p]));
  const range = (k) => { const r = []; for (let v = P[k].min; v <= P[k].max; v += P[k].step) r.push(v); return r; };
  const CS = range('c'), BS = range('b'), XS = range('x');

  /* === 0. the two machines are the plain operations they claim to be ===== */
  for (const c of [-3, 0, 1, 4, 7]) for (const x of [-5, 0, 3, 9]) {
    ok(M.times(c, x) === c * x, `times(${c},${x}) = ${c * x}`);
    ok(M.plus(c, x) === x + c, `plus(${c},${x}) = ${x + c}`);
  }
  ok(M.ORDERS.length === 2 && M.ORDERS.includes('add-first') && M.ORDERS.includes('times-first'),
    'exactly two orders, named add-first / times-first');

  /* === 1. THE CHAIN — the wire value is output-of-first = input-of-second = */
  for (const order of M.ORDERS) for (const c of CS) for (const b of BS) for (const x of XS) {
    const r = M.runChain(order, b, c, x);
    if (order === 'add-first') {
      ok(r.mid === x + b, `add-first mid = x+b (b=${b},x=${x})`);
      ok(r.out === c * (x + b), `add-first out = c(x+b) (c=${c},b=${b},x=${x})`);
      ok(r.first === 'plus' && r.second === 'times', 'add-first wiring: plus then times');
    } else {
      ok(r.mid === c * x, `times-first mid = c·x (c=${c},x=${x})`);
      ok(r.out === c * x + b, `times-first out = c·x+b (c=${c},b=${b},x=${x})`);
      ok(r.first === 'times' && r.second === 'plus', 'times-first wiring: times then plus');
    }
    ok(Number.isInteger(r.mid) && Number.isInteger(r.out), 'chain values are integers — no float');
  }

  /* === 2. THE RULES — composite (slope,intercept) matches running it ====== */
  for (const order of M.ORDERS) for (const c of CS) for (const b of BS) {
    const rule = M.ruleOf(order, b, c);
    ok(rule.slope === c, `${order}: slope is c (c=${c})`);
    ok(rule.intercept === (order === 'add-first' ? c * b : b),
      `${order}: intercept (c=${c},b=${b})`);
    for (const x of XS) {
      ok(rule.slope * x + rule.intercept === M.runChain(order, b, c, x).out,
        `${order}: rule reproduces the run (c=${c},b=${b},x=${x})`);
    }
  }

  /* === 3. THE GAP is b·(c−1) and is INDEPENDENT of x (parallel lines) ===== */
  for (const c of CS) for (const b of BS) {
    const g = M.orderGap(b, c);
    ok(g === b * (c - 1), `gap = b(c−1) (b=${b},c=${c})`);
    let gapSeen = null;
    for (const x of XS) {
      const diff = M.runChain('add-first', b, c, x).out - M.runChain('times-first', b, c, x).out;
      if (gapSeen === null) gapSeen = diff;
      ok(diff === g, `add−times = gap at every x (b=${b},c=${c},x=${x})`);
      ok(diff === gapSeen, `the gap is the SAME for every x (b=${b},c=${c},x=${x})`);
    }
  }

  /* === 4. AGREEMENT ⟺ b=0 or c=1 ⟺ equal for ALL x ======================= */
  // sweep a WIDER range than the dials so b=0 and c=1 are actually tested
  for (let c = 0; c <= 7; c++) for (let b = 0; b <= 9; b++) {
    const agree = M.ordersAgree(b, c);
    ok(agree === (b === 0 || c === 1), `ordersAgree ⟺ b=0∨c=1 (b=${b},c=${c})`);
    let allEqual = true;
    for (let x = -6; x <= 9; x++) {
      if (M.runChain('add-first', b, c, x).out !== M.runChain('times-first', b, c, x).out) allEqual = false;
    }
    ok(agree === allEqual, `agreement ⟺ equal-for-all-x (b=${b},c=${c})`);
  }
  // THE THESIS, tied to the SHIPPED DIAL RANGE: no (b,c) the dials can reach
  // may make the orders agree — otherwise a student could set up the lab so its
  // whole point ("order matters") silently fails. This is what forces b's min
  // to exclude 0 and c's min to exclude 1.
  for (const c of CS) for (const b of BS) {
    ok(!M.ordersAgree(b, c),
      `THESIS: every reachable dial setting keeps order mattering (b=${b},c=${c})`);
  }

  /* === 5. THE START is the memorable 21 ≠ 17 ============================= */
  {
    ok(M.START.c === 3 && M.START.b === 2 && M.START.x === 5, 'START is ×3, +2, x=5');
    ok(M.runChain('add-first', 2, 3, 5).out === 21, 'add-first START → 21');
    ok(M.runChain('times-first', 2, 3, 5).out === 17, 'times-first START → 17');
    ok(M.orderGap(2, 3) === 4, 'the START gap is 21−17 = 4 = 2·(3−1)');
  }

  /* === 6. CALIBRATION — reachable targets, no false stamp ================= */
  {
    const rand = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    let prev = null;
    for (let i = 0; i < 4000; i++) {
      const t = M.makeTarget(prev, rand);
      // reachable: SOME (order, b, c) on the dial grid produces t.target from t.x
      let reachable = false;
      for (const order of M.ORDERS) for (const c of CS) for (const b of BS) {
        if (M.runChain(order, b, c, t.x).out === t.target) { reachable = true; break; }
      }
      ok(reachable, `target ${t.target} from x=${t.x} is reachable on the dials`);
      ok(Number.isInteger(t.target), 'target is an integer');
      if (prev) ok(!(t.target === prev.target && t.x === prev.x), 'makeTarget avoids exact repeat');
      prev = t;
    }
    // the stamp is an integer identity: fires iff the output equals the target
    const t = { x: 5, target: 21 };
    for (const order of M.ORDERS) for (const c of CS) for (const b of BS) {
      const hit = M.runChain(order, b, c, t.x).out === t.target;
      ok(M.isCalibrated(order, b, c, t.x, t.target) === hit,
        `stamp ⟺ out===target (order=${order},c=${c},b=${b})`);
      if (!hit) ok(M.matchPercent(order, b, c, t.x, t.target) < 100, 'a miss never reads 100%');
    }
  }

  /* === 7. the lesson keys match the model ================================ */
  {
    ok(M.STEPS.length === 6, 'six steps');
    const byFocus = Object.fromEntries(M.STEPS.map((s) => [s.focus, s]));
    for (const f of ['meet', 'chain', 'swap', 'rule', 'agree', 'calib']) ok(!!byFocus[f], `has '${f}' step`);
    ok(byFocus.calib.calib === true, 'the calib step is flagged');
    for (const s of M.STEPS) {
      if (s.calib) continue;
      ok(Array.isArray(s.choices) && s.choices.length === 3, `'${s.focus}': three choices`);
      ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < 3, `'${s.focus}': answer indexes a choice`);
      ok(typeof s.feedback === 'string' && s.feedback.length > 60, `'${s.focus}': reveal in feedback`);
    }
    // the stated arithmetic must be the model's
    ok(byFocus.chain.choices[byFocus.chain.answer] === '17', "chain step's answer is 17 (×3 then +2 on 5)");
    ok(byFocus.swap.choices[byFocus.swap.answer] === '21', "swap step's answer is 21 (+2 then ×3 on 5)");
    ok(byFocus.rule.choices[byFocus.rule.answer] === 'c·x + c·b', "rule step's add-first answer");
    ok(byFocus.agree.choices[byFocus.agree.answer].includes('b = 0'), "agree step's answer is b=0");
    // one dial per step (locked-dial discipline)
    const unlocks = M.PARAMS.map((p) => p.unlock);
    ok(new Set(unlocks).size === unlocks.length, 'dials unlock one per step');
  }

  /* === 8. DISTINCTNESS — the siblings' pictures grepped OUT of the body === */
  {
    const body = MODEL_BODY.toLowerCase();
    for (const [word, owner] of [
      ['inverse', 'UndoLab'], ['undo', 'UndoLab'], ['backward', 'UndoLab'],
      ['mirror', 'LogarithmLab'], ['reflect', 'LogarithmLab'],
    ]) {
      ok(!new RegExp(`\\b${word}`).test(body), `model must not reach for "${word}" — that is ${owner}`);
    }
    ok(/order/i.test(MODEL_BODY), 'the model must name its own idea: order');
  }

  return { checks, failures };
}

const MUTANTS = [
  ['add-first out drops the scaling of b (the classic error the lab teaches)',
    'return { first: \'plus\', second: \'times\', mid, out: times(c, mid) };',
    'return { first: \'plus\', second: \'times\', mid, out: mid + c };'],
  ['times-first scales b too (erasing the whole asymmetry)',
    'return { first: \'times\', second: \'plus\', mid, out: plus(b, mid) };',
    'return { first: \'times\', second: \'plus\', mid, out: c * plus(b, mid) };'],
  ['ruleOf gives add-first the wrong intercept',
    '? { slope: c, intercept: c * b }',
    '? { slope: c, intercept: b }'],
  ['ordersAgree becomes always-true (order never matters)',
    'return b * (c - 1) === 0;', 'return true;'],
  ['orderGap loses the (c−1) factor',
    'return b * (c - 1);', 'return b;'],
  ['times machine adds instead of multiplies',
    'const times = (c, x) => c * x;', 'const times = (c, x) => c + x;'],
  ['plus machine multiplies instead of adds',
    'const plus = (b, x) => x + b;', 'const plus = (b, x) => x * b;'],
  ['the stamp goes fuzzy',
    'const isCalibrated = (order, b, c, x, target) => runChain(order, b, c, x).out === target;',
    'const isCalibrated = (order, b, c, x, target) => Math.abs(runChain(order, b, c, x).out - target) <= 2;'],
  ['the dial range lets c=1 in, so the thesis "order matters" breaks',
    "{ key: 'c', label: 'c', min: 2, max: 6, step: 1, unlock: 1, role: 'the ×c machine' },",
    "{ key: 'c', label: 'c', min: 1, max: 6, step: 1, unlock: 1, role: 'the ×c machine' },"],
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
console.log('audit-composition — CompositionLab.jsx');
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
